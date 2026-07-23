import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { authSessions, users, type User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import type { SecuritySessionContext } from "../_core/context";

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function hashSecurityValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isPasskeySessionToken(value: string | undefined): value is string {
  return typeof value === "string" && /^pk\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{40,}$/.test(value);
}

function requestFingerprint(req: Request) {
  return {
    ipHash: req.ip ? hashSecurityValue(req.ip) : null,
    userAgentHash: req.get("user-agent") ? hashSecurityValue(req.get("user-agent")!) : null,
  };
}

export async function issuePasskeySession(userId: number, req: Request, res: Response) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  const id = randomUUID();
  const token = `pk.${id}.${randomBytes(32).toString("base64url")}`;
  const fingerprint = requestFingerprint(req);
  await db.insert(authSessions).values({
    id, userId, tokenHash: hashSecurityValue(token), authMethod: "passkey", assurance: "a2",
    authenticatedAt: now, lastStepUpAt: now, expiresAt: now + SESSION_LIFETIME_MS,
    lastSeenAt: now, revokedAt: null, revocationReason: null,
    ipHash: fingerprint.ipHash, userAgentHash: fingerprint.userAgentHash, createdAt: now,
  });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: SESSION_LIFETIME_MS });
}

export async function authenticatePasskeySession(req: Request): Promise<{ user: User; securitySession: SecuritySessionContext } | null> {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!isPasskeySessionToken(token)) return null;
  const [, id] = token.split(".");
  const now = Date.now();
  const db = await getDb();
  if (!db) return null;
  const [session] = await db.select().from(authSessions).where(and(
    eq(authSessions.id, id), eq(authSessions.tokenHash, hashSecurityValue(token)),
    eq(authSessions.authMethod, "passkey"), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now),
  )).limit(1);
  if (!session || now - session.lastSeenAt > SESSION_IDLE_MS) {
    if (session && session.revokedAt === null) {
      await db.update(authSessions).set({ revokedAt: now, revocationReason: "idle_timeout" }).where(eq(authSessions.id, session.id));
    }
    return null;
  }
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return null;
  if (now - session.lastSeenAt >= TOUCH_INTERVAL_MS) {
    await db.update(authSessions).set({ lastSeenAt: now }).where(eq(authSessions.id, session.id));
  }
  return { user, securitySession: { id: session.id, method: "passkey", assurance: "a2", recentAuthenticationAt: session.lastStepUpAt ?? session.authenticatedAt } };
}

export async function revokePasskeySessionFromRequest(req: Request, reason = "user_logout") {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!isPasskeySessionToken(token)) return false;
  const [, id] = token.split(".");
  const db = await getDb();
  if (!db) return false;
  await db.update(authSessions).set({ revokedAt: Date.now(), revocationReason: reason }).where(and(
    eq(authSessions.id, id), eq(authSessions.tokenHash, hashSecurityValue(token)), isNull(authSessions.revokedAt),
  ));
  return true;
}
