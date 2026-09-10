import { createHash, randomBytes, randomUUID } from "crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { authSessions, users, type User } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { getDb } from "../db";
import type { SecuritySessionContext } from "../_core/context";

export const SECURITY_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const SECURITY_SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

type SecuritySessionAuthMethod = "oauth" | "magic_link" | "passkey";
type SecuritySessionAssurance = "a0" | "a1" | "a2";

const TOKEN_PREFIX_BY_METHOD: Record<SecuritySessionAuthMethod, string> = {
  oauth: "oa",
  magic_link: "ml",
  passkey: "pk",
};

function isSecuritySessionAuthMethod(
  value: string
): value is SecuritySessionAuthMethod {
  return value === "oauth" || value === "magic_link" || value === "passkey";
}

function isSecuritySessionAssurance(
  value: string
): value is SecuritySessionAssurance {
  return value === "a0" || value === "a1" || value === "a2";
}

export function hashSecurityValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function isSecuritySessionToken(
  value: string | undefined
): value is string {
  return (
    typeof value === "string" &&
    /^(?:oa|ml|pk)\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{40,}$/.test(value)
  );
}

export function isPasskeySessionToken(
  value: string | undefined
): value is string {
  return (
    typeof value === "string" &&
    /^pk\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{40,}$/.test(value)
  );
}

function requestFingerprint(req: Request) {
  return {
    ipHash: req.ip ? hashSecurityValue(req.ip) : null,
    userAgentHash: req.get("user-agent")
      ? hashSecurityValue(req.get("user-agent")!)
      : null,
  };
}

function getRequestSessionToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (isSecuritySessionToken(cookieToken)) return cookieToken;

  const authorization =
    typeof req.get === "function"
      ? req.get("authorization")
      : typeof req.headers?.authorization === "string"
        ? req.headers.authorization
        : undefined;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  return isSecuritySessionToken(bearerToken) ? bearerToken : undefined;
}

export function setSecuritySessionCookie(
  req: Request,
  res: Response,
  token: string,
  maxAge = SECURITY_SESSION_LIFETIME_MS
) {
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge });
}

export async function issueSecuritySession({
  userId,
  authMethod,
  assurance,
  req,
  res,
}: {
  userId: number;
  authMethod: SecuritySessionAuthMethod;
  assurance: SecuritySessionAssurance;
  req: Request;
  res?: Response;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const now = Date.now();
  const id = randomUUID();
  const token = `${TOKEN_PREFIX_BY_METHOD[authMethod]}.${id}.${randomBytes(32).toString("base64url")}`;
  const fingerprint = requestFingerprint(req);

  await db.insert(authSessions).values({
    id,
    userId,
    tokenHash: hashSecurityValue(token),
    authMethod,
    assurance,
    authenticatedAt: now,
    lastStepUpAt: assurance === "a2" ? now : null,
    expiresAt: now + SECURITY_SESSION_LIFETIME_MS,
    lastSeenAt: now,
    revokedAt: null,
    revocationReason: null,
    ipHash: fingerprint.ipHash,
    userAgentHash: fingerprint.userAgentHash,
    createdAt: now,
  });

  if (res) setSecuritySessionCookie(req, res, token);
  return {
    id,
    token,
    maxAge: SECURITY_SESSION_LIFETIME_MS,
    expiresAt: now + SECURITY_SESSION_LIFETIME_MS,
  };
}

export async function issuePasskeySession(
  userId: number,
  req: Request,
  res: Response
) {
  return issueSecuritySession({
    userId,
    authMethod: "passkey",
    assurance: "a2",
    req,
    res,
  });
}

export async function authenticateSecuritySession(
  req: Request
): Promise<{ user: User; securitySession: SecuritySessionContext } | null> {
  const token = getRequestSessionToken(req);
  if (!token) return null;

  const [prefix, id] = token.split(".");
  const now = Date.now();
  const db = await getDb();
  if (!db) return null;

  const [session] = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.id, id),
        eq(authSessions.tokenHash, hashSecurityValue(token)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, now)
      )
    )
    .limit(1);

  if (
    !session ||
    !isSecuritySessionAuthMethod(session.authMethod) ||
    !isSecuritySessionAssurance(session.assurance) ||
    TOKEN_PREFIX_BY_METHOD[session.authMethod] !== prefix
  )
    return null;
  if (now - session.lastSeenAt > SECURITY_SESSION_IDLE_MS) {
    await db
      .update(authSessions)
      .set({ revokedAt: now, revocationReason: "idle_timeout" })
      .where(
        and(eq(authSessions.id, session.id), isNull(authSessions.revokedAt))
      );
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user) {
    await db
      .update(authSessions)
      .set({ revokedAt: now, revocationReason: "user_not_found" })
      .where(
        and(eq(authSessions.id, session.id), isNull(authSessions.revokedAt))
      );
    return null;
  }

  if (now - session.lastSeenAt >= TOUCH_INTERVAL_MS) {
    await db
      .update(authSessions)
      .set({ lastSeenAt: now })
      .where(eq(authSessions.id, session.id));
  }

  return {
    user,
    securitySession: {
      id: session.id,
      method: session.authMethod,
      assurance: session.assurance,
      recentAuthenticationAt: session.lastStepUpAt ?? session.authenticatedAt,
    },
  };
}

export async function authenticatePasskeySession(req: Request) {
  const result = await authenticateSecuritySession(req);
  return result?.securitySession.method === "passkey" ? result : null;
}

export async function revokeSecuritySessionFromRequest(
  req: Request,
  reason = "user_logout"
) {
  const token = getRequestSessionToken(req);
  if (!token) return false;

  const [, id] = token.split(".");
  const db = await getDb();
  if (!db) return false;

  await db
    .update(authSessions)
    .set({ revokedAt: Date.now(), revocationReason: reason })
    .where(
      and(
        eq(authSessions.id, id),
        eq(authSessions.tokenHash, hashSecurityValue(token)),
        isNull(authSessions.revokedAt)
      )
    );
  return true;
}

export async function revokeSecuritySessionsForUser(
  userId: number,
  reason = "admin_suspension"
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  await db
    .update(authSessions)
    .set({ revokedAt: now, revocationReason: reason })
    .where(
      and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt))
    );
  return now;
}

export const revokePasskeySessionFromRequest = revokeSecuritySessionFromRequest;
