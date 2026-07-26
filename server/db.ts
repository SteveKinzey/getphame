import { and, desc, eq, isNull, sql, or, inArray, gte, lte, isNotNull } from "drizzle-orm";
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

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL!);
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
  // passwordHash — only set on initial insert (registration), never overwritten on conflict
  if (user.passwordHash !== undefined) {
    values.passwordHash = user.passwordHash;
    // intentionally NOT added to updateSet
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
  // PostgreSQL: use onConflictDoUpdate targeting the unique openId column
  updateSet.updatedAt = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user by email: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLastSignedIn(openId: string, timestamp: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: timestamp, updatedAt: new Date() }).where(eq(users.openId, openId));
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
    .onDuplicateKeyUpdate({ set: { ...rest, updatedAt: new Date() } })
}

// ─── Customer request helpers ─────────────────────────────────────────────────

export async function createCustomerRequest(req: InsertCustomerRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customerRequests).values(req);
  return (result as any).insertId;
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
        sql`EXTRACT(YEAR FROM "sentAt") = ${Number(year)} AND EXTRACT(MONTH FROM "sentAt") = ${Number(month)}`
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
        sql`"sentAt"::date = CURRENT_DATE`
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
  const result = await db.insert(apiKeys).values({ userId, keyHash, label });
  return { raw, id: (result as any).insertId };
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
  // Update lastUsedAt asynchronously — don't block the request
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
    created: params.created ? 1 : 0,
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
  const result = await db.insert(webhookConfigs).values({
    userId: params.userId,
    url: params.url,
    label: params.label,
    secret: params.secret ?? null,
    events: params.events ?? "contact.created",
    active: 1,
    createdAt: Date.now(),
  });
  return (result as any).insertId;
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

// ── Webhook delivery logs ─────────────────────────────────────────────────────
import { webhookDeliveryLogs, notificationPrefs, type InsertWebhookDeliveryLog } from "../drizzle/schema";

/** Log a webhook delivery attempt. */
export async function logWebhookDelivery(entry: InsertWebhookDeliveryLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookDeliveryLogs).values(entry);
  // Prune: keep only the last 50 logs per webhook to avoid unbounded growth
  const rows = await db
    .select({ id: webhookDeliveryLogs.id })
    .from(webhookDeliveryLogs)
    .where(eq(webhookDeliveryLogs.webhookId, entry.webhookId))
    .orderBy(desc(webhookDeliveryLogs.createdAt));
  if (rows.length > 50) {
    const idsToDelete = rows.slice(50).map((r) => r.id);
    for (const id of idsToDelete) {
      await db.delete(webhookDeliveryLogs).where(eq(webhookDeliveryLogs.id, id));
    }
  }
}

/** Get the last N delivery logs for a webhook. */
export async function getWebhookDeliveryLogs(webhookId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookDeliveryLogs)
    .where(eq(webhookDeliveryLogs.webhookId, webhookId))
    .orderBy(desc(webhookDeliveryLogs.createdAt))
    .limit(limit);
}

// ── Notification preferences ─────────────────────────────────────────────────
/** Get or create notification prefs for a user. */
export async function getNotificationPrefs(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [existing] = await db
    .select()
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId))
    .limit(1);
  if (existing) return existing;
  await db.insert(notificationPrefs).values({ userId });
  const [created] = await db
    .select()
    .from(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId))
    .limit(1);
  return created ?? null;
}

/** Update notification prefs for a user. */
export async function updateNotificationPrefs(userId: number, prefs: { wooAutoImportNotify?: boolean; notifyOnEmailOpen?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(notificationPrefs)
    .values({ userId, wooAutoImportNotify: prefs.wooAutoImportNotify ? 1 : 0, notifyOnEmailOpen: prefs.notifyOnEmailOpen ? 1 : 0, updatedAt: Date.now() })
    .onDuplicateKeyUpdate({ set: { wooAutoImportNotify: prefs.wooAutoImportNotify ? 1 : 0, notifyOnEmailOpen: prefs.notifyOnEmailOpen ? 1 : 0, updatedAt: Date.now() } })
}

// ── Apple Sign In account deletion ───────────────────────────────────────────
/**
 * Anonymise a user's personal data when Apple sends an account-delete or
 * consent-revoked server-to-server notification. Keeps the row for audit
 * purposes but removes name, email, and login method.
 */
export async function anonymiseUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      name: "[deleted]",
      email: null,
      loginMethod: "deleted",
    })
    .where(eq(users.openId, openId));
}

// ── Free-tier rolling quota ───────────────────────────────────────────────────

/** Free-tier limits */
export const QUOTA_ONBOARDING = 10;   // first N sends ever — no window, no expiry
export const QUOTA_WINDOW_SENDS = 5;  // sends per 30-day window after onboarding
export const QUOTA_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export type QuotaStatus =
  | { allowed: true }
  | { allowed: false; reason: "onboarding_exhausted" | "window_exhausted"; nextWindowAt: number | null };

/**
 * Check whether a free-tier user can send `count` more requests.
 * Returns { allowed: true } or { allowed: false, reason, nextWindowAt }.
 * Does NOT consume quota — call consumeQuota() after a successful send.
 * Pro/annual/lifetime users always get { allowed: true }.
 */
export async function checkQuota(userId: number, count = 1): Promise<QuotaStatus> {
  const profile = await getBusinessProfile(userId);
  if (!profile) return { allowed: false, reason: "onboarding_exhausted", nextWindowAt: null };

  if (profile.tier !== "free") return { allowed: true };

  const lifetime = profile.lifetimeSendCount ?? 0;

  // Phase 1: onboarding (first 10 sends ever)
  if (lifetime < QUOTA_ONBOARDING) {
    const remaining = QUOTA_ONBOARDING - lifetime;
    if (count > remaining) {
      return { allowed: false, reason: "onboarding_exhausted", nextWindowAt: null };
    }
    return { allowed: true };
  }

  // Phase 2: rolling 30-day window
  const now = Date.now();
  let windowStart = profile.quotaWindowStart ?? null;
  let windowCount = profile.windowSendCount ?? 0;

  if (windowStart !== null) {
    while (windowStart + QUOTA_WINDOW_MS <= now) {
      windowStart += QUOTA_WINDOW_MS;
      windowCount = 0;
    }
  }

  const windowRemaining = QUOTA_WINDOW_SENDS - windowCount;
  if (windowRemaining <= 0 || count > windowRemaining) {
    const nextWindowAt = windowStart !== null ? windowStart + QUOTA_WINDOW_MS : null;
    return { allowed: false, reason: "window_exhausted", nextWindowAt };
  }

  return { allowed: true };
}

/**
 * Consume `count` quota slots after a successful send.
 * Stamps quotaWindowStart on the send that crosses the onboarding threshold.
 */
export async function consumeQuota(userId: number, count = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const profile = await getBusinessProfile(userId);
  if (!profile) return;

  const now = Date.now();
  const prevLifetime = profile.lifetimeSendCount ?? 0;
  const newLifetime = prevLifetime + count;
  let windowStart = profile.quotaWindowStart ?? null;
  let windowCount = profile.windowSendCount ?? 0;

  // Advance any expired windows
  if (windowStart !== null) {
    while (windowStart + QUOTA_WINDOW_MS <= now) {
      windowStart += QUOTA_WINDOW_MS;
      windowCount = 0;
    }
  }

  // Stamp window start on the send that crosses the onboarding threshold
  const wasInOnboarding = prevLifetime < QUOTA_ONBOARDING;
  const nowCrossesThreshold = newLifetime >= QUOTA_ONBOARDING;
  if (wasInOnboarding && nowCrossesThreshold) {
    windowStart = now;
    windowCount = 0;
  }

  // Only increment windowSendCount after onboarding is exhausted
  const newWindowCount = (wasInOnboarding && !nowCrossesThreshold)
    ? windowCount
    : windowCount + count;

  await db
    .update(businessProfiles)
    .set({
      lifetimeSendCount: newLifetime,
      quotaWindowStart: windowStart,
      windowSendCount: newWindowCount,
      updatedAt: new Date(),
    })
    .where(eq(businessProfiles.userId, userId));
}

/**
 * Return a quota summary for the current user — used by the client to render
 * the quota bar and block the Send button.
 */
export async function getQuotaSummary(userId: number) {
  const profile = await getBusinessProfile(userId);
  if (!profile) return null;

  const isPaid = profile.tier !== "free";
  const lifetime = profile.lifetimeSendCount ?? 0;
  const now = Date.now();

  if (isPaid) {
    return { isPaid: true, phase: "paid" as const, lifetime, remaining: null as number | null, nextWindowAt: null as number | null };
  }

  if (lifetime < QUOTA_ONBOARDING) {
    return {
      isPaid: false,
      phase: "onboarding" as const,
      lifetime,
      remaining: QUOTA_ONBOARDING - lifetime,
      nextWindowAt: null as number | null,
    };
  }

  let windowStart = profile.quotaWindowStart ?? null;
  let windowCount = profile.windowSendCount ?? 0;
  if (windowStart !== null) {
    while (windowStart + QUOTA_WINDOW_MS <= now) {
      windowStart += QUOTA_WINDOW_MS;
      windowCount = 0;
    }
  }
  const remaining = Math.max(0, QUOTA_WINDOW_SENDS - windowCount);
  const nextWindowAt = windowStart !== null ? windowStart + QUOTA_WINDOW_MS : null;

  return {
    isPaid: false,
    phase: "rolling" as const,
    lifetime,
    remaining,
    windowSendCount: windowCount,
    nextWindowAt,
  };
}
