import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { createHash, randomBytes } from "crypto";
import {
  InsertUser,
  apiKeys,
  apiImportEvents,
  businessProfiles,
  customerRequests,
  users,
  webhookConfigs,
  type InsertBusinessProfile,
  type InsertCustomerRequest,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Business profile helpers ─────────────────────────────────────────────────

export async function getBusinessProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertBusinessProfile(profile: InsertBusinessProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { userId, ...rest } = profile;
  await db
    .insert(businessProfiles)
    .values(profile)
    .onDuplicateKeyUpdate({ set: rest });
}

// ─── Customer request helpers ─────────────────────────────────────────────────

export async function createCustomerRequest(req: InsertCustomerRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(customerRequests).values(req);
  return (result as unknown as { insertId: number }).insertId;
}

export async function getCustomerRequests(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(customerRequests)
    .where(eq(customerRequests.userId, userId))
    .orderBy(desc(customerRequests.sentAt))
    .limit(limit);
}

export async function getMonthlyRequestCount(userId: number, yearMonth: string) {
  const db = await getDb();
  if (!db) return 0;
  const [year, month] = yearMonth.split("-");
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerRequests)
    .where(
      and(
        eq(customerRequests.userId, userId),
        sql`YEAR(sentAt) = ${year} AND MONTH(sentAt) = ${month}`
      )
    );
  return Number(rows[0]?.count ?? 0);
}

/** Count emails sent today by a user (UTC date) — used to enforce daily send limit */
export async function getTodaySentCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerRequests)
    .where(
      and(
        eq(customerRequests.userId, userId),
        sql`DATE(sentAt) = CURDATE()`
      )
    );
  return Number(rows[0]?.count ?? 0);
}

/** Count total review requests ever sent by a user (used for free-tier limit) */
export async function getTotalRequestCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerRequests)
    .where(eq(customerRequests.userId, userId));
  return Number(rows[0]?.count ?? 0);
}

// ─── API Key helpers ─────────────────────────────────────────────────────────────────────────────────

/** Generate a new raw API key, store its SHA-256 hash, return the raw key (shown once). */
export async function generateApiKey(userId: number, label: string): Promise<{ raw: string; id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const raw = "rl_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const [result] = await db.insert(apiKeys).values({ userId, keyHash, label });
  return { raw, id: Number((result as any).insertId) };
}

/** List active (non-revoked) API keys for a user — never returns the raw key. */
export async function listApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(apiKeys.createdAt);
}

/** Revoke an API key by id (soft-delete). */
export async function revokeApiKey(userId: number, keyId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(apiKeys)
    .set({ revokedAt: Date.now() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)));
}

/** Look up a user by their raw API key. Returns null if not found or revoked. Updates lastUsedAt. */
export async function getUserByApiKey(rawKey: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row) return null;
  // Update lastUsedAt asynchronously — don’t block the request
  db.update(apiKeys).set({ lastUsedAt: Date.now() }).where(eq(apiKeys.id, row.id)).catch(() => {});
  return row.userId;
}

// ── API Import Events ──────────────────────────────────────────────────────────

/** Log a contact import via the public API. */
export async function logApiImport(params: {
  userId: number;
  apiKeyId: number | null;
  keyLabel: string;
  contactId: number | null;
  email: string;
  created: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(apiImportEvents).values({
    userId: params.userId,
    apiKeyId: params.apiKeyId,
    keyLabel: params.keyLabel,
    contactId: params.contactId,
    email: params.email,
    created: params.created,
    createdAt: Date.now(),
  });
}

/** Get the last N import events for a user. */
export async function getRecentApiImports(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(apiImportEvents)
    .where(eq(apiImportEvents.userId, userId))
    .orderBy(desc(apiImportEvents.createdAt))
    .limit(limit);
}

// ── Webhook Configs ────────────────────────────────────────────────────────────

/** Get all webhook configs for a user. */
export async function getWebhookConfigs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.userId, userId))
    .orderBy(webhookConfigs.createdAt);
}

/** Create a new webhook config. */
export async function createWebhookConfig(params: {
  userId: number;
  url: string;
  label: string;
  secret?: string;
  events?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.insert(webhookConfigs).values({
    userId: params.userId,
    url: params.url,
    label: params.label,
    secret: params.secret ?? null,
    events: params.events ?? "contact.created",
    active: true,
    createdAt: Date.now(),
  });
  return (result as any).insertId ?? 0;
}

/** Delete a webhook config by id. */
export async function deleteWebhookConfig(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(webhookConfigs)
    .where(and(eq(webhookConfigs.id, id), eq(webhookConfigs.userId, userId)));
}

/** Update lastFiredAt and lastStatus on a webhook config. */
export async function updateWebhookStatus(id: number, status: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(webhookConfigs)
    .set({ lastFiredAt: Date.now(), lastStatus: status })
    .where(eq(webhookConfigs.id, id));
}
