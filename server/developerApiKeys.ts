import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { apiKeys } from "../drizzle/schema";
import { getDb } from "./db";

export const DEVELOPER_API_SCOPES = ["contacts:write", "review_requests:send"] as const;
export type DeveloperApiScope = (typeof DEVELOPER_API_SCOPES)[number];

export type DeveloperApiPrincipal = {
  apiKeyId: number;
  userId: number;
  label: string;
  scopes: DeveloperApiScope[];
  expiresAt: number | null;
  inactivityExpiresAt: number;
};

const MAX_ACTIVE_KEYS = 10;
export const DEVELOPER_API_KEY_INACTIVITY_MS = 365 * 24 * 60 * 60 * 1000;
export const DEVELOPER_API_KEY_WARNING_MS = 30 * 24 * 60 * 60 * 1000;
export const DEVELOPER_API_KEY_URGENT_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

export function hashDeveloperApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function buildDeveloperApiKeyHint(rawKey: string): string {
  return `${rawKey.slice(0, 8)}…${rawKey.slice(-4)}`;
}

export function parseDeveloperApiScopes(value: string | null | undefined): DeveloperApiScope[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return DEVELOPER_API_SCOPES.filter((scope) => parsed.includes(scope));
  } catch {
    return [];
  }
}

function normalizeScopes(scopes: readonly DeveloperApiScope[]): DeveloperApiScope[] {
  return DEVELOPER_API_SCOPES.filter((scope) => scopes.includes(scope));
}

function toTimestamp(value: Date | number | string): number {
  return value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
}

export function getDeveloperApiKeyInactivityExpiresAt(params: {
  createdAt: Date | number | string;
  lastUsedAt: number | null;
}) {
  return (params.lastUsedAt ?? toTimestamp(params.createdAt)) + DEVELOPER_API_KEY_INACTIVITY_MS;
}

export function describeDeveloperApiKeyLifecycle(params: {
  createdAt: Date | number | string;
  lastUsedAt: number | null;
  revokedAt: number | null;
  expiresAt: number | null;
  suspendedAt?: number | null;
  suspensionExpiresAt?: number | null;
  suspensionReason?: string | null;
}, now = Date.now()) {
  const inactivityExpiresAt = getDeveloperApiKeyInactivityExpiresAt(params);
  const inactivityRemainingMs = Math.max(0, inactivityExpiresAt - now);
  const suspensionActive = Boolean(params.suspendedAt && (!params.suspensionExpiresAt || params.suspensionExpiresAt > now));

  if (params.revokedAt) {
    return { status: "revoked" as const, statusReason: "revoked" as const, inactivityExpiresAt, warningLevel: null };
  }
  if (params.expiresAt && params.expiresAt <= now) {
    return { status: "expired" as const, statusReason: "manual_expiry" as const, inactivityExpiresAt, warningLevel: null };
  }
  if (inactivityExpiresAt <= now) {
    return { status: "expired" as const, statusReason: "inactivity" as const, inactivityExpiresAt, warningLevel: null };
  }
  if (suspensionActive) {
    return {
      status: "suspended" as const,
      statusReason: params.suspensionReason || "abuse_protection",
      inactivityExpiresAt,
      warningLevel: null,
    };
  }

  return {
    status: "active" as const,
    statusReason: "active" as const,
    inactivityExpiresAt,
    warningLevel: inactivityRemainingMs <= DEVELOPER_API_KEY_URGENT_WARNING_MS
      ? "urgent" as const
      : inactivityRemainingMs <= DEVELOPER_API_KEY_WARNING_MS
        ? "warning" as const
        : null,
  };
}

export async function listDeveloperApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      keyHint: apiKeys.keyHint,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      rotatedFromId: apiKeys.rotatedFromId,
      usageCount: apiKeys.usageCount,
      lastUsedAt: apiKeys.lastUsedAt,
      suspendedAt: apiKeys.suspendedAt,
      suspensionExpiresAt: apiKeys.suspensionExpiresAt,
      suspensionReason: apiKeys.suspensionReason,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt))
    .limit(50);

  return rows.map((row) => ({
    ...row,
    scopes: parseDeveloperApiScopes(row.scopes),
    ...describeDeveloperApiKeyLifecycle(row),
  }));
}

export async function createDeveloperApiKey(params: {
  userId: number;
  label: string;
  scopes: readonly DeveloperApiScope[];
  expiresAt?: number | null;
  rotatedFromId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const scopes = normalizeScopes(params.scopes);
  if (scopes.length === 0) throw new Error("At least one API scope is required.");

  if (!params.rotatedFromId) {
    const activeRows = await db
      .select({
        id: apiKeys.id,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        suspendedAt: apiKeys.suspendedAt,
        suspensionExpiresAt: apiKeys.suspensionExpiresAt,
        suspensionReason: apiKeys.suspensionReason,
      })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, params.userId), isNull(apiKeys.revokedAt)));
    const activeCount = activeRows.filter((row) => describeDeveloperApiKeyLifecycle(row).status !== "expired").length;
    if (activeCount >= MAX_ACTIVE_KEYS) {
      throw new Error(`Maximum ${MAX_ACTIVE_KEYS} active API keys allowed.`);
    }
  }

  const rawKey = `gp_live_${randomBytes(32).toString("base64url")}`;
  const keyHash = hashDeveloperApiKey(rawKey);
  const keyHint = buildDeveloperApiKeyHint(rawKey);
  const [result] = await db.insert(apiKeys).values({
    userId: params.userId,
    keyHash,
    keyHint,
    label: params.label.trim(),
    scopes: JSON.stringify(scopes),
    expiresAt: params.expiresAt ?? null,
    rotatedFromId: params.rotatedFromId ?? null,
  });
  const id = Number((result as unknown as { insertId: number }).insertId);

  return {
    id,
    rawKey,
    keyHint,
    label: params.label.trim(),
    scopes,
    expiresAt: params.expiresAt ?? null,
  };
}

export async function revokeDeveloperApiKey(userId: number, keyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db
    .select({ id: apiKeys.id, revokedAt: apiKeys.revokedAt })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .limit(1);
  if (!row || row.revokedAt) return false;
  await db.update(apiKeys).set({ revokedAt: Date.now() }).where(eq(apiKeys.id, row.id));
  return true;
}

export async function rotateDeveloperApiKey(params: {
  userId: number;
  keyId: number;
  label?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [current] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, params.keyId), eq(apiKeys.userId, params.userId), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!current) throw new Error("Active API key not found.");
  if (current.expiresAt && current.expiresAt <= Date.now()) throw new Error("Expired API keys cannot be rotated.");
  const lifecycle = describeDeveloperApiKeyLifecycle(current);
  if (lifecycle.status === "suspended") {
    throw new Error("Suspended API keys cannot be rotated until the protection window ends.");
  }

  const replacement = await createDeveloperApiKey({
    userId: params.userId,
    label: params.label?.trim() || current.label,
    scopes: parseDeveloperApiScopes(current.scopes),
    expiresAt: current.expiresAt,
    rotatedFromId: current.id,
  });
  await db.update(apiKeys).set({ revokedAt: Date.now() }).where(eq(apiKeys.id, current.id));
  return replacement;
}

export type DeveloperApiAuthentication =
  | { kind: "ok"; principal: DeveloperApiPrincipal }
  | { kind: "invalid" | "expired" | "inactive" | "suspended"; retryAfterSeconds?: number };

export async function authenticateDeveloperApiKeyWithStatus(rawKey: string): Promise<DeveloperApiAuthentication> {
  if (!rawKey || rawKey.length < 20 || rawKey.length > 256) return { kind: "invalid" };
  const db = await getDb();
  if (!db) return { kind: "invalid" };
  const keyHash = hashDeveloperApiKey(rawKey);
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);
  if (!row || row.revokedAt) return { kind: "invalid" };

  const now = Date.now();
  const lifecycle = describeDeveloperApiKeyLifecycle(row, now);
  if (lifecycle.status === "expired") {
    return { kind: lifecycle.statusReason === "inactivity" ? "inactive" : "expired" };
  }
  if (lifecycle.status === "suspended") {
    return {
      kind: "suspended",
      retryAfterSeconds: row.suspensionExpiresAt
        ? Math.max(1, Math.ceil((row.suspensionExpiresAt - now) / 1000))
        : 24 * 60 * 60,
    };
  }

  return { kind: "ok", principal: {
    apiKeyId: row.id,
    userId: row.userId,
    label: row.label,
    scopes: parseDeveloperApiScopes(row.scopes),
    expiresAt: row.expiresAt,
    inactivityExpiresAt: lifecycle.inactivityExpiresAt,
  } };
}

export async function authenticateDeveloperApiKey(rawKey: string): Promise<DeveloperApiPrincipal | null> {
  const result = await authenticateDeveloperApiKeyWithStatus(rawKey);
  return result.kind === "ok" ? result.principal : null;
}

export async function recordDeveloperApiKeySuccessfulUse(principal: DeveloperApiPrincipal, now = Date.now()) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({
      lastUsedAt: now,
      usageCount: sql`${apiKeys.usageCount} + 1`,
      suspendedAt: null,
      suspensionExpiresAt: null,
      suspensionReason: null,
    })
    .where(eq(apiKeys.id, principal.apiKeyId));
}

export async function suspendDeveloperApiKey(params: {
  principal: DeveloperApiPrincipal;
  reason: string;
  durationMs: number;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = params.now ?? Date.now();
  await db
    .update(apiKeys)
    .set({
      suspendedAt: now,
      suspensionExpiresAt: now + params.durationMs,
      suspensionReason: params.reason.slice(0, 64),
    })
    .where(and(eq(apiKeys.id, params.principal.apiKeyId), isNull(apiKeys.revokedAt)));
}

export function developerApiKeyHasScope(principal: DeveloperApiPrincipal, scope: DeveloperApiScope): boolean {
  return principal.scopes.includes(scope);
}
