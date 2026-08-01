import crypto from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { providerHumanVerificationAttempts } from "../drizzle/schema";
import { getDb } from "./db";
import { signupRiskEvents } from "./signupRiskSchema";

const HUMAN_PROOF_TTL_MS = 15 * 60 * 1000;
const PROVIDER_HUMAN_ATTEMPT_TTL_MS = 10 * 60 * 1000;
const MAX_SIGNED_HUMAN_PROOF_LENGTH = 4096;
const MAX_REVIEW_ROWS = 100;

export type SignupProvider = "email" | "google" | "apple";
export type ProviderOAuthName = Exclude<SignupProvider, "email">;
export type SignupRiskOutcome =
  | "allowed"
  | "restricted"
  | "blocked"
  | "verified";
type SignedHumanProofPayload = {
  v: 1;
  subjectHash: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function riskSecret(): string {
  const value = process.env.SIGNUP_RISK_HMAC_SECRET;
  if (!value || value.length < 32)
    throw new Error(
      "SIGNUP_RISK_HMAC_SECRET must contain at least 32 characters"
    );
  return value;
}

function normalizeSubject(value: string) {
  return value.trim().toLowerCase();
}
function hmac(value: string) {
  return crypto.createHmac("sha256", riskSecret()).update(value).digest("hex");
}
function signature(encoded: string) {
  return crypto
    .createHmac("sha256", riskSecret())
    .update(`getphame:human-proof:v1\0${encoded}`)
    .digest("base64url");
}
function same(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createSignupAccountFingerprint(subject: string) {
  return hmac(`account:${normalizeSubject(subject)}`);
}
export function createSignedHumanProof(subject: string, now = Date.now()) {
  const payload: SignedHumanProofPayload = {
    v: 1,
    subjectHash: hmac(`proof-subject:${normalizeSubject(subject)}`),
    issuedAt: now,
    expiresAt: now + HUMAN_PROOF_TTL_MS,
    nonce: crypto.randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySignedHumanProof(
  proof: unknown,
  subject: string,
  now = Date.now()
) {
  if (typeof proof !== "string" || proof.length > MAX_SIGNED_HUMAN_PROOF_LENGTH)
    return false;
  const [encoded, signed, extra] = proof.split(".");
  if (!encoded || !signed || extra || !same(signed, signature(encoded)))
    return false;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SignedHumanProofPayload>;
    return (
      payload.v === 1 &&
      typeof payload.subjectHash === "string" &&
      same(
        payload.subjectHash,
        hmac(`proof-subject:${normalizeSubject(subject)}`)
      ) &&
      typeof payload.issuedAt === "number" &&
      typeof payload.expiresAt === "number" &&
      payload.issuedAt <= now + 60_000 &&
      payload.expiresAt >= now &&
      payload.expiresAt - payload.issuedAt <= HUMAN_PROOF_TTL_MS
    );
  } catch {
    return false;
  }
}

export async function createProviderHumanVerificationAttempt(
  provider: ProviderOAuthName,
  now = Date.now()
) {
  const database = await getDb();
  if (!database) throw new Error("Database unavailable");
  await database
    .delete(providerHumanVerificationAttempts)
    .where(
      lt(providerHumanVerificationAttempts.expiresAt, now - 24 * 60 * 60 * 1000)
    );
  const id = crypto.randomUUID();
  await database.insert(providerHumanVerificationAttempts).values({
    id,
    provider,
    expiresAt: now + PROVIDER_HUMAN_ATTEMPT_TTL_MS,
    consumedAt: null,
    createdAt: now,
  });
  return id;
}

export async function consumeProviderHumanVerificationAttempt(
  attemptId: unknown,
  provider: ProviderOAuthName,
  now = Date.now()
) {
  if (typeof attemptId !== "string" || !/^[0-9a-f-]{36}$/i.test(attemptId))
    return false;
  const database = await getDb();
  if (!database) return false;
  const result = await database
    .update(providerHumanVerificationAttempts)
    .set({ consumedAt: now })
    .where(
      and(
        eq(providerHumanVerificationAttempts.id, attemptId),
        eq(providerHumanVerificationAttempts.provider, provider),
        isNull(providerHumanVerificationAttempts.consumedAt),
        gt(providerHumanVerificationAttempts.expiresAt, now)
      )
    );
  const affectedRows = Number(
    (result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0
  );
  return affectedRows === 1;
}

export async function verifyTurnstileHuman(token: unknown, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (typeof token !== "string" || token.length < 20 || token.length > 4096)
    return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp.length <= 64) body.set("remoteip", remoteIp);
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(5_000),
      }
    );
    return (
      response.ok &&
      ((await response.json()) as { success?: boolean }).success === true
    );
  } catch {
    return false;
  }
}

export async function recordSignupRiskEvent(input: {
  userId: number;
  subject: string;
  provider: SignupProvider;
  outcome: SignupRiskOutcome;
  reasonCode: string;
  humanVerified: boolean;
  now?: number;
}) {
  const database = await getDb();
  if (!database) return;
  const subject = normalizeSubject(input.subject);
  const at = subject.lastIndexOf("@");
  await database.insert(signupRiskEvents).values({
    userId: input.userId,
    provider: input.provider,
    outcome: input.outcome,
    emailFingerprint: createSignupAccountFingerprint(subject),
    emailDomain: at >= 0 ? subject.slice(at + 1, at + 255) : "unknown",
    riskScore: input.humanVerified ? 0 : 100,
    riskReasonsJson: JSON.stringify([input.reasonCode.slice(0, 48)]),
    occurredAt: input.now ?? Date.now(),
  });
}

/** Restricts only explicit risk outcomes; review mail never obtains a platform fallback. */
export async function assertReviewOutreachAllowed(userId: number) {
  const database = await getDb();
  if (!database) return;
  const [latest] = await database
    .select({ outcome: signupRiskEvents.outcome })
    .from(signupRiskEvents)
    .where(eq(signupRiskEvents.userId, userId))
    .orderBy(desc(signupRiskEvents.occurredAt))
    .limit(1);
  if (latest?.outcome === "blocked" || latest?.outcome === "restricted")
    throw new Error(
      "Review outreach is temporarily unavailable for this account."
    );
}

export async function getSignupRiskReview(input: {
  outcome?: SignupRiskOutcome;
  limit?: number;
}) {
  const database = await getDb();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_REVIEW_ROWS);
  const summary = {
    total: 0,
    allowed: 0,
    verified: 0,
    restricted: 0,
    blocked: 0,
  };
  if (!database) return { events: [], summary };
  const rows = await database
    .select({
      id: signupRiskEvents.id,
      provider: signupRiskEvents.provider,
      outcome: signupRiskEvents.outcome,
      occurredAt: signupRiskEvents.occurredAt,
    })
    .from(signupRiskEvents)
    .where(
      input.outcome ? eq(signupRiskEvents.outcome, input.outcome) : undefined
    )
    .orderBy(desc(signupRiskEvents.occurredAt))
    .limit(limit);
  for (const row of rows) {
    summary.total += 1;
    if (row.outcome in summary)
      summary[row.outcome as keyof typeof summary] += 1;
  }
  return {
    events: rows.map(row => ({
      ...row,
      provider: row.provider as SignupProvider,
      outcome: row.outcome as SignupRiskOutcome,
    })),
    summary,
  };
}
