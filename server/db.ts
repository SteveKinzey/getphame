import { and, asc, desc, eq, gt, gte, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";
import { createHash, randomBytes } from "crypto";
import {
  InsertUser,
  apiKeys,
  apiImportEvents,
  authDiagnosticEvents,
  authHealthChecks,
  businessProfiles,
  customerRequests,
  userIdentityAliases,
  users,
  webhookConfigs,
  type InsertAuthDiagnosticEvent,
  type InsertAuthHealthCheck,
  type InsertBusinessProfile,
  type InsertCustomerRequest,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { FREE_INITIAL_REQUESTS, FREE_ROLLING_WINDOW_DAYS } from "@shared/const";
import { buildFreeQuotaSummary } from "@shared/quota";

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

  const [identityAlias] = await db
    .select({ userId: userIdentityAliases.userId })
    .from(userIdentityAliases)
    .where(eq(userIdentityAliases.openId, user.openId))
    .limit(1);
  if (identityAlias) {
    const aliasUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (user.name !== undefined) aliasUpdates.name = user.name ?? null;
    if (user.email !== undefined) aliasUpdates.email = user.email?.trim().toLowerCase() ?? null;
    if (user.loginMethod !== undefined) aliasUpdates.loginMethod = user.loginMethod ?? null;
    if (user.lastSignedIn !== undefined) aliasUpdates.lastSignedIn = user.lastSignedIn;
    await db.update(users).set(aliasUpdates).where(eq(users.id, identityAlias.userId));
    return;
  }

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
  updateSet.updatedAt = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (result.length > 0) return result[0];
  const aliased = await db
    .select({ user: users })
    .from(userIdentityAliases)
    .innerJoin(users, eq(users.id, userIdentityAliases.userId))
    .where(eq(userIdentityAliases.openId, openId))
    .limit(1);
  return aliased.length > 0 ? aliased[0].user : undefined;
}

/**
 * Attach an additional OAuth identity to an existing user without replacing the
 * account's primary login identity or business ownership. Used when a customer
 * signs in with Apple using the same verified email as an established account.
 */
export async function linkUserIdentity(input: {
  userId: number;
  openId: string;
  loginMethod: string;
  lastSignedIn?: Date;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.transaction(async (tx) => {
    const [directIdentity] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, input.openId))
      .limit(1);
    if (directIdentity && directIdentity.id !== input.userId) {
      throw new Error("OAuth identity already belongs to another account");
    }

    const [existingAlias] = await tx
      .select({ userId: userIdentityAliases.userId })
      .from(userIdentityAliases)
      .where(eq(userIdentityAliases.openId, input.openId))
      .limit(1);
    if (existingAlias && existingAlias.userId !== input.userId) {
      throw new Error("OAuth identity alias already belongs to another account");
    }

    if (!directIdentity && !existingAlias) {
      await tx.insert(userIdentityAliases).values({
        userId: input.userId,
        openId: input.openId,
        loginMethod: input.loginMethod,
      });
    }

    await tx
      .update(users)
      .set({
        lastSignedIn: input.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId));
  });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user by email: database not available"); return undefined; }
  const normalizedEmail = email.trim().toLowerCase();
  const candidates = await db
    .select({
      user: users,
      tier: businessProfiles.tier,
      onboardingDismissed: businessProfiles.onboardingDismissed,
      monthlyCount: businessProfiles.monthlyCount,
    })
    .from(users)
    .leftJoin(businessProfiles, eq(users.id, businessProfiles.userId))
    .where(eq(users.email, normalizedEmail));

  if (candidates.length === 0) return undefined;

  // Older releases could create more than one account for the same email when a
  // user switched sign-in methods. Prefer the account that already owns access
  // and onboarding data; use the oldest account only as a deterministic tie-break.
  const tierWeight = { free: 0, pro: 200, annual: 300, lifetime: 400 } as const;
  const normalizedTier = (tier: string | null): keyof typeof tierWeight =>
    tier && tier in tierWeight ? tier as keyof typeof tierWeight : "free";
  candidates.sort((a, b) => {
    const score = (candidate: typeof a) =>
      (candidate.user.role === "admin" ? 1_000 : 0) +
      (candidate.onboardingDismissed === 1 ? 500 : 0) +
      tierWeight[normalizedTier(candidate.tier)] +
      (candidate.monthlyCount && candidate.monthlyCount > 0 ? 50 : 0) +
      (candidate.tier ? 10 : 0);
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.user.createdAt.getTime() - b.user.createdAt.getTime();
  });

  return candidates[0].user;
}

export async function updateUserLastSignedIn(openId: string, timestamp: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: timestamp, updatedAt: new Date() }).where(eq(users.openId, openId));
}

export async function getAccountProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [profile] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarKey: users.avatarKey,
      avatarMimeType: users.avatarMimeType,
      avatarUpdatedAt: users.avatarUpdatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return profile ?? null;
}

export async function updateAccountProfile(
  userId: number,
  updates: {
    name?: string;
    avatarKey?: string | null;
    avatarMimeType?: string | null;
    avatarUpdatedAt?: Date | null;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Authentication diagnostics ───────────────────────────────────────────────

export async function createAuthDiagnosticEvent(event: InsertAuthDiagnosticEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(authDiagnosticEvents).values(event);
  return Number((result as unknown as { insertId: number }).insertId);
}

export async function getLatestAuthDiagnosticByTokenFingerprint(tokenFingerprint: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(authDiagnosticEvents)
    .where(eq(authDiagnosticEvents.tokenFingerprint, tokenFingerprint))
    .orderBy(desc(authDiagnosticEvents.occurredAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAuthDiagnosticEvents(input?: {
  emailFingerprint?: string;
  outcome?: "ok" | "fail";
  requestId?: string;
  sinceMs?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const filters: SQL[] = [];
  if (input?.emailFingerprint) filters.push(eq(authDiagnosticEvents.emailFingerprint, input.emailFingerprint));
  if (input?.outcome) filters.push(eq(authDiagnosticEvents.outcome, input.outcome));
  if (input?.requestId) filters.push(eq(authDiagnosticEvents.requestId, input.requestId));
  if (input?.sinceMs) filters.push(gte(authDiagnosticEvents.occurredAt, input.sinceMs));
  return db
    .select()
    .from(authDiagnosticEvents)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(authDiagnosticEvents.occurredAt))
    .limit(Math.min(Math.max(input?.limit ?? 100, 1), 200));
}

export async function getAuthDiagnosticSummary(sinceMs: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      eventType: authDiagnosticEvents.eventType,
      outcome: authDiagnosticEvents.outcome,
      total: sql<number>`count(*)`,
    })
    .from(authDiagnosticEvents)
    .where(gte(authDiagnosticEvents.occurredAt, sinceMs))
    .groupBy(authDiagnosticEvents.eventType, authDiagnosticEvents.outcome);
}

export async function createAuthHealthCheck(check: InsertAuthHealthCheck) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(authHealthChecks).values(check);
  return Number((result as unknown as { insertId: number }).insertId);
}

export async function listAuthHealthChecks(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(authHealthChecks)
    .orderBy(desc(authHealthChecks.checkedAt), desc(authHealthChecks.id))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export type AuthHealthHistoryFilters = {
  status?: "ok" | "fail";
  triggerSource?: "scheduled" | "manual";
  fromMs?: number;
  toMs?: number;
};

export function normalizeAuthHealthHistoryQuery(input: AuthHealthHistoryFilters & {
  page?: number;
  pageSize?: number;
  limit?: number;
}) {
  return {
    status: input.status,
    triggerSource: input.triggerSource,
    fromMs: Number.isFinite(input.fromMs) ? Math.max(0, Math.trunc(input.fromMs!)) : undefined,
    toMs: Number.isFinite(input.toMs) ? Math.max(0, Math.trunc(input.toMs!)) : undefined,
    page: Math.max(1, Math.trunc(input.page ?? 1)),
    pageSize: Math.min(50, Math.max(10, Math.trunc(input.pageSize ?? 20))),
    limit: Math.min(10_000, Math.max(1, Math.trunc(input.limit ?? 10_000))),
  };
}

function buildAuthHealthHistoryWhere(filters: AuthHealthHistoryFilters) {
  const normalized = normalizeAuthHealthHistoryQuery(filters);
  const conditions: SQL[] = [];
  if (normalized.status) conditions.push(eq(authHealthChecks.overallStatus, normalized.status));
  if (normalized.triggerSource) conditions.push(eq(authHealthChecks.triggerSource, normalized.triggerSource));
  if (normalized.fromMs !== undefined) conditions.push(gte(authHealthChecks.checkedAt, normalized.fromMs));
  if (normalized.toMs !== undefined) conditions.push(lte(authHealthChecks.checkedAt, normalized.toMs));
  return conditions.length ? and(...conditions) : undefined;
}

export async function listAuthHealthChecksPage(input: AuthHealthHistoryFilters & {
  page?: number;
  pageSize?: number;
}, database?: Awaited<ReturnType<typeof getDb>>) {
  const normalized = normalizeAuthHealthHistoryQuery(input);
  const safePage = normalized.page;
  const safePageSize = normalized.pageSize;
  const db = database ?? await getDb();
  if (!db) return { rows: [], page: safePage, pageSize: safePageSize, total: 0, pageCount: 1 };

  const where = buildAuthHealthHistoryWhere(input);
  const [totalRow] = await db
    .select({ value: sql<number>`count(*)` })
    .from(authHealthChecks)
    .where(where);
  const total = Number(totalRow?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const boundedPage = Math.min(safePage, pageCount);
  const rows = await db
    .select()
    .from(authHealthChecks)
    .where(where)
    .orderBy(desc(authHealthChecks.checkedAt), desc(authHealthChecks.id))
    .limit(safePageSize)
    .offset((boundedPage - 1) * safePageSize);

  return { rows, page: boundedPage, pageSize: safePageSize, total, pageCount };
}

export async function listAuthHealthChecksForExport(input: AuthHealthHistoryFilters & { limit?: number }) {
  return listAuthHealthChecksForExportWithDb(input);
}

export async function listAuthHealthChecksForExportWithDb(
  input: AuthHealthHistoryFilters & { limit?: number },
  database?: Awaited<ReturnType<typeof getDb>>,
) {
  const safeLimit = normalizeAuthHealthHistoryQuery(input).limit;
  const db = database ?? await getDb();
  if (!db) return { rows: [], total: 0, truncated: false };

  const where = buildAuthHealthHistoryWhere(input);
  const [totalRow] = await db
    .select({ value: sql<number>`count(*)` })
    .from(authHealthChecks)
    .where(where);
  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select()
    .from(authHealthChecks)
    .where(where)
    .orderBy(desc(authHealthChecks.checkedAt), desc(authHealthChecks.id))
    .limit(safeLimit);

  return { rows, total, truncated: total > rows.length };
}

export async function getRecentAuthHealthCheckByTaskUid(taskUid: string, sinceMs: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(authHealthChecks)
    .where(and(
      eq(authHealthChecks.scheduleCronTaskUid, taskUid),
      gte(authHealthChecks.checkedAt, sinceMs),
    ))
    .orderBy(desc(authHealthChecks.checkedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function listAuthHealthChecksByTaskUid(taskUid: string, limit = 2) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(authHealthChecks)
    .where(eq(authHealthChecks.scheduleCronTaskUid, taskUid))
    .orderBy(desc(authHealthChecks.checkedAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

const AUTH_HEALTH_WINDOW_MS = 24 * 60 * 60 * 1000;
const AUTH_HEALTH_INTERVAL_MS = 15 * 60 * 1000;

export type AuthHealthUptimeRow = {
  overallStatus: string;
  configStatus: string;
  databaseStatus: string;
  userSchemaStatus: string;
  magicLinkSchemaStatus: string;
  sessionStatus: string;
  emailProviderStatus: string;
  durationMs: number;
  checkedAt: number;
};

export function calculateAuthHealthUptimeSummary(inputRows: AuthHealthUptimeRow[]) {
  const expectedRuns = Math.floor(AUTH_HEALTH_WINDOW_MS / AUTH_HEALTH_INTERVAL_MS);
  const emptySummary = {
    windowHours: 24,
    expectedRuns,
    runCount: 0,
    successfulRuns: 0,
    failedRuns: 0,
    uptimePercent: null as number | null,
    coveragePercent: 0,
    remainingRuns: expectedRuns,
    observationComplete: false,
    incidentCount: 0,
    currentIncidentOpen: false,
    averageDurationMs: null as number | null,
    latestStatus: null as "ok" | "fail" | null,
    latestCheckedAt: null as number | null,
    firstObservedAt: null as number | null,
    nextExpectedAt: null as number | null,
    components: [] as Array<{
      key: string;
      label: string;
      latestStatus: "ok" | "fail" | null;
      successfulRuns: number;
      failedRuns: number;
      uptimePercent: number | null;
    }>,
  };
  const rows = [...inputRows].sort((a, b) => b.checkedAt - a.checkedAt);
  if (!rows.length) return emptySummary;

  const successfulRuns = rows.filter((row) => row.overallStatus === "ok").length;
  const failedRuns = rows.length - successfulRuns;
  const chronological = [...rows].reverse();
  let incidentCount = 0;
  let previousStatus: "ok" | "fail" | null = null;
  for (const row of chronological) {
    const currentStatus = row.overallStatus === "ok" ? "ok" : "fail";
    if (currentStatus === "fail" && previousStatus !== "fail") incidentCount += 1;
    previousStatus = currentStatus;
  }

  const componentFields = [
    ["configStatus", "Configuration"],
    ["databaseStatus", "Database"],
    ["userSchemaStatus", "User schema"],
    ["magicLinkSchemaStatus", "Magic-link schema"],
    ["sessionStatus", "Session signing"],
    ["emailProviderStatus", "Email provider"],
  ] as const;
  const components = componentFields.map(([key, label]) => {
    const componentSuccesses = rows.filter((row) => row[key] === "ok").length;
    return {
      key,
      label,
      latestStatus: rows[0][key] === "ok" ? "ok" as const : "fail" as const,
      successfulRuns: componentSuccesses,
      failedRuns: rows.length - componentSuccesses,
      uptimePercent: Math.round((componentSuccesses / rows.length) * 10_000) / 100,
    };
  });

  return {
    ...emptySummary,
    runCount: rows.length,
    successfulRuns,
    failedRuns,
    uptimePercent: Math.round((successfulRuns / rows.length) * 10_000) / 100,
    coveragePercent: Math.min(100, Math.round((rows.length / expectedRuns) * 10_000) / 100),
    remainingRuns: Math.max(0, expectedRuns - rows.length),
    observationComplete: rows.length >= expectedRuns,
    incidentCount,
    currentIncidentOpen: rows[0].overallStatus === "fail",
    averageDurationMs: Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length),
    latestStatus: rows[0].overallStatus === "ok" ? "ok" as const : "fail" as const,
    latestCheckedAt: rows[0].checkedAt,
    firstObservedAt: rows[rows.length - 1].checkedAt,
    nextExpectedAt: rows[0].checkedAt + AUTH_HEALTH_INTERVAL_MS,
    components,
  };
}

export async function getAuthHealthUptimeSummary(nowMs = Date.now()) {
  const db = await getDb();
  if (!db) return calculateAuthHealthUptimeSummary([]);

  const rows = await db
    .select()
    .from(authHealthChecks)
    .where(and(
      eq(authHealthChecks.triggerSource, "scheduled"),
      gte(authHealthChecks.checkedAt, nowMs - AUTH_HEALTH_WINDOW_MS),
    ))
    .orderBy(desc(authHealthChecks.checkedAt));
  return calculateAuthHealthUptimeSummary(rows);
}

export async function pruneAuthOperationsData(nowMs = Date.now()) {
  const db = await getDb();
  if (!db) return { diagnosticEventsDeleted: 0, healthChecksDeleted: 0 };
  const diagnosticsCutoff = nowMs - 30 * 24 * 60 * 60 * 1000;
  const healthCutoff = nowMs - 90 * 24 * 60 * 60 * 1000;
  const [diagnosticsResult] = await db
    .delete(authDiagnosticEvents)
    .where(lt(authDiagnosticEvents.occurredAt, diagnosticsCutoff));
  const [healthResult] = await db
    .delete(authHealthChecks)
    .where(lt(authHealthChecks.checkedAt, healthCutoff));
  return {
    diagnosticEventsDeleted: Number((diagnosticsResult as unknown as { affectedRows?: number }).affectedRows ?? 0),
    healthChecksDeleted: Number((healthResult as unknown as { affectedRows?: number }).affectedRows ?? 0),
  };
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
    .onDuplicateKeyUpdate({ set: { ...rest, updatedAt: new Date() } });
}

// ─── Customer request helpers ─────────────────────────────────────────────────

export async function createCustomerRequest(req: InsertCustomerRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(customerRequests).values(req);
  return Number((result as unknown as { insertId: number }).insertId);
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

/**
 * Free accounts receive 10 onboarding sends once, followed by 5 sends in each
 * rolling 30-day window. The first 10 rows are permanently excluded from the
 * rolling phase so they never consume the recurring allowance.
 */
export async function getFreeQuotaSummary(userId: number) {
  const db = await getDb();
  if (!db) return buildFreeQuotaSummary({ totalSent: 0, rollingUsed: 0 });

  return getFreeQuotaSummaryFromDb(userId, db);
}

/**
 * Execute the production Free-plan quota query against an explicit database.
 * Production passes the application database; integration tests pass a temporary,
 * isolated schema so the real persisted-row path is covered without customer data.
 */
export async function getFreeQuotaSummaryFromDb(
  userId: number,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  nowMs = Date.now(),
) {
  const countRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerRequests)
    .where(eq(customerRequests.userId, userId));
  const totalSent = Number(countRows[0]?.count ?? 0);

  if (totalSent < FREE_INITIAL_REQUESTS) {
    return buildFreeQuotaSummary({ totalSent, rollingUsed: 0 });
  }

  const [tenthRequest] = await db
    .select({ id: customerRequests.id, sentAt: customerRequests.sentAt })
    .from(customerRequests)
    .where(eq(customerRequests.userId, userId))
    .orderBy(asc(customerRequests.sentAt), asc(customerRequests.id))
    .limit(1)
    .offset(FREE_INITIAL_REQUESTS - 1);

  if (!tenthRequest) {
    return buildFreeQuotaSummary({ totalSent, rollingUsed: 0 });
  }

  const cutoff = new Date(nowMs - FREE_ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const postInitial = or(
    gt(customerRequests.sentAt, tenthRequest.sentAt),
    and(eq(customerRequests.sentAt, tenthRequest.sentAt), gt(customerRequests.id, tenthRequest.id)),
  );
  const rollingRows = await db
    .select({ sentAt: customerRequests.sentAt })
    .from(customerRequests)
    .where(and(eq(customerRequests.userId, userId), gte(customerRequests.sentAt, cutoff), postInitial))
    .orderBy(asc(customerRequests.sentAt), asc(customerRequests.id));

  return buildFreeQuotaSummary({
    totalSent,
    rollingUsed: rollingRows.length,
    oldestRollingSentAt: rollingRows[0]?.sentAt ?? null,
  });
}

// ─── API Key helpers ─────────────────────────────────────────────────────────────────────────────────

/** Generate a new raw API key, store its SHA-256 hash, return the raw key (shown once). */
export async function generateApiKey(userId: number, label: string): Promise<{ raw: string; id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const raw = "rl_" + randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const keyHint = `${raw.slice(0, 6)}…${raw.slice(-4)}`;
  const [result] = await db.insert(apiKeys).values({
    userId,
    keyHash,
    keyHint,
    label,
    scopes: JSON.stringify(["contacts:write", "review_requests:send"]),
  });
  return { raw, id: Number((result as unknown as { insertId: number }).insertId) };
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
    created: params.created,
    createdAt: Date.now(),
  });
}

/** Get the last N import events for a user. */
export async function getRecentApiImports(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: apiImportEvents.id,
      apiKeyId: apiImportEvents.apiKeyId,
      keyLabel: apiImportEvents.keyLabel,
      contactId: apiImportEvents.contactId,
      emailMasked: apiImportEvents.emailMasked,
      sourceApp: apiImportEvents.sourceApp,
      consentBasis: apiImportEvents.consentBasis,
      outcome: apiImportEvents.outcome,
      errorCode: apiImportEvents.errorCode,
      created: apiImportEvents.created,
      createdAt: apiImportEvents.createdAt,
    })
    .from(apiImportEvents)
    .where(eq(apiImportEvents.userId, userId))
    .orderBy(desc(apiImportEvents.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    email: row.emailMasked ?? "Not available",
  }));
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
  return Number((result as unknown as { insertId: number }).insertId);
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
export async function updateNotificationPrefs(userId: number, prefs: {
  wooAutoImportNotify?: boolean;
  notifyOnEmailOpen?: boolean;
  onboardingTipsEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(notificationPrefs)
    .values({ userId, ...prefs, updatedAt: Date.now() })
    .onDuplicateKeyUpdate({ set: { ...prefs, updatedAt: Date.now() } });
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
