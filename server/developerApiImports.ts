import { createHash } from "node:crypto";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { apiIdempotencyRecords, apiImportEvents, apiRateLimitWindows } from "../drizzle/schema";
import { fingerprintAuthValue, maskDiagnosticEmail, normalizeDiagnosticEmail } from "./authOperations";
import { getDb } from "./db";
import type { DeveloperApiPrincipal } from "./developerApiKeys";
import { recordSourceConnectionActivity } from "./sourceConnections";

export const DEVELOPER_API_RATE_LIMIT = 60;
export const DEVELOPER_API_RATE_WINDOW_MS = 60_000;
export const DEVELOPER_API_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export type DeveloperApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_API_KEY"
  | "API_KEY_INACTIVE"
  | "API_KEY_SUSPENDED"
  | "INSUFFICIENT_SCOPE"
  | "SOURCE_CONNECTION_FORBIDDEN"
  | "IDEMPOTENCY_CONFLICT"
  | "CONSENT_REQUIRED"
  | "AUTOMATION_DISABLED"
  | "AUTOMATION_PAUSED"
  | "TEMPLATE_NOT_READY"
  | "RATE_LIMITED"
  | "ABUSE_PROTECTION"
  | "INTERNAL_ERROR";

export function hashDeveloperApiRequest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function checkDeveloperApiRateLimit(principal: DeveloperApiPrincipal, now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const windowStartedAt = Math.floor(now / DEVELOPER_API_RATE_WINDOW_MS) * DEVELOPER_API_RATE_WINDOW_MS;
  await db.delete(apiRateLimitWindows).where(and(
    eq(apiRateLimitWindows.apiKeyId, principal.apiKeyId),
    lt(apiRateLimitWindows.expiresAt, now + 1),
  ));
  const [existing] = await db
    .select()
    .from(apiRateLimitWindows)
    .where(and(
      eq(apiRateLimitWindows.apiKeyId, principal.apiKeyId),
      gt(apiRateLimitWindows.expiresAt, now),
    ))
    .orderBy(desc(apiRateLimitWindows.windowStartedAt))
    .limit(1);

  if (!existing) {
    try {
      await db.insert(apiRateLimitWindows).values({
        apiKeyId: principal.apiKeyId,
        windowStartedAt,
        requestCount: 1,
        expiresAt: windowStartedAt + DEVELOPER_API_RATE_WINDOW_MS,
      });
    } catch {
      return checkDeveloperApiRateLimit(principal, now);
    }
    return { allowed: true, remaining: DEVELOPER_API_RATE_LIMIT - 1, retryAfterSeconds: 0 };
  }

  await db
    .update(apiRateLimitWindows)
    .set({ requestCount: sql`${apiRateLimitWindows.requestCount} + 1` })
    .where(eq(apiRateLimitWindows.id, existing.id));
  const [updated] = await db
    .select({ requestCount: apiRateLimitWindows.requestCount, expiresAt: apiRateLimitWindows.expiresAt })
    .from(apiRateLimitWindows)
    .where(eq(apiRateLimitWindows.id, existing.id))
    .limit(1);
  const requestCount = updated?.requestCount ?? existing.requestCount + 1;
  const allowed = requestCount <= DEVELOPER_API_RATE_LIMIT;
  return {
    allowed,
    remaining: Math.max(0, DEVELOPER_API_RATE_LIMIT - requestCount),
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil(((updated?.expiresAt ?? existing.expiresAt) - now) / 1000)),
  };
}

export async function getDeveloperApiIdempotency(params: {
  principal: DeveloperApiPrincipal;
  idempotencyKey: string;
  requestHash: string;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = params.now ?? Date.now();
  const keyHash = fingerprintAuthValue(`developer-api-idempotency:${params.principal.apiKeyId}:${params.idempotencyKey}`);
  const [row] = await db
    .select()
    .from(apiIdempotencyRecords)
    .where(and(
      eq(apiIdempotencyRecords.userId, params.principal.userId),
      eq(apiIdempotencyRecords.apiKeyId, params.principal.apiKeyId),
      eq(apiIdempotencyRecords.idempotencyHash, keyHash),
    ))
    .limit(1);
  if (!row) return { kind: "missing" as const, keyHash };
  if (row.expiresAt <= now) {
    await db.delete(apiIdempotencyRecords).where(eq(apiIdempotencyRecords.id, row.id));
    return { kind: "missing" as const, keyHash };
  }
  if (row.payloadHash !== params.requestHash) return { kind: "conflict" as const, keyHash };
  try {
    return {
      kind: "replay" as const,
      keyHash,
      statusCode: 200,
      response: JSON.parse(row.responseJson) as Record<string, unknown>,
    };
  } catch {
    await db.delete(apiIdempotencyRecords).where(eq(apiIdempotencyRecords.id, row.id));
    return { kind: "missing" as const, keyHash };
  }
}

export async function saveDeveloperApiIdempotency(params: {
  principal: DeveloperApiPrincipal;
  keyHash: string;
  requestHash: string;
  statusCode: number;
  response: Record<string, unknown>;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = params.now ?? Date.now();
  await db.delete(apiIdempotencyRecords).where(and(
    eq(apiIdempotencyRecords.userId, params.principal.userId),
    eq(apiIdempotencyRecords.apiKeyId, params.principal.apiKeyId),
    lt(apiIdempotencyRecords.expiresAt, now),
  ));
  try {
    await db.insert(apiIdempotencyRecords).values({
      userId: params.principal.userId,
      apiKeyId: params.principal.apiKeyId,
      idempotencyHash: params.keyHash,
      payloadHash: params.requestHash,
      contactId: typeof params.response.contactId === "number" ? params.response.contactId : null,
      created: params.response.created === true,
      responseJson: JSON.stringify(params.response),
      expiresAt: now + DEVELOPER_API_IDEMPOTENCY_TTL_MS,
      createdAt: now,
    });
  } catch {
    const [existing] = await db
      .select({ payloadHash: apiIdempotencyRecords.payloadHash })
      .from(apiIdempotencyRecords)
      .where(and(
        eq(apiIdempotencyRecords.userId, params.principal.userId),
        eq(apiIdempotencyRecords.apiKeyId, params.principal.apiKeyId),
        eq(apiIdempotencyRecords.idempotencyHash, params.keyHash),
      ))
      .limit(1);
    if (!existing || existing.payloadHash !== params.requestHash) throw new Error("IDEMPOTENCY_CONFLICT");
  }
}

export async function logDeveloperApiImport(params: {
  principal: DeveloperApiPrincipal;
  sourceConnectionId?: number | null;
  eventType?: "contact_import" | "review_request_send";
  status: "success" | "deduplicated" | "rejected" | "rate_limited" | "abuse_blocked" | "error";
  requestId: string;
  sourceApp?: string | null;
  consentBasis?: string | null;
  contactId?: number | null;
  email?: string | null;
  created?: boolean;
  errorCode?: DeveloperApiErrorCode | null;
}) {
  const db = await getDb();
  if (!db) return;
  const email = params.email ? normalizeDiagnosticEmail(params.email) : null;
  const emailMasked = email ? maskDiagnosticEmail(email) : "Not provided";
  const outcome = params.status === "success"
    ? (params.created ? "created" : "updated")
    : params.status;
  await db.insert(apiImportEvents).values({
    userId: params.principal.userId,
    apiKeyId: params.principal.apiKeyId,
    sourceConnectionId: params.sourceConnectionId ?? null,
    keyLabel: params.principal.label.slice(0, 100),
    eventType: params.eventType ?? "contact_import",
    contactId: params.contactId ?? null,
    email: emailMasked,
    emailFingerprint: email ? fingerprintAuthValue(`email:${email}`) : null,
    emailMasked,
    sourceApp: params.sourceApp?.slice(0, 64) ?? null,
    consentBasis: params.consentBasis?.slice(0, 32) ?? null,
    outcome,
    errorCode: params.errorCode ?? null,
    idempotencyHash: hashDeveloperApiRequest(params.requestId),
    created: params.created ?? false,
    createdAt: Date.now(),
  });
  if (params.sourceConnectionId) {
    await recordSourceConnectionActivity({
      sourceConnectionId: params.sourceConnectionId,
      outcome,
      errorCode: params.errorCode ?? null,
    });
  }
}
