import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import {
  apiImportEvents,
  apiKeys,
  sourceConnections,
  sourceHealthHistory,
  sourceHealthSchedulers,
  type SourceConnection,
} from "../drizzle/schema";
import { getDb } from "./db";

export const SOURCE_PROVIDERS = ["zapier", "make", "custom", "woocommerce"] as const;
export type SourceProvider = (typeof SOURCE_PROVIDERS)[number];

export const SOURCE_HEALTH_STATUSES = ["setup", "healthy", "delayed", "failing", "paused"] as const;
export type SourceHealthStatus = (typeof SOURCE_HEALTH_STATUSES)[number];

export const SOURCE_HEALTH_HISTORY_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const SOURCE_HEALTH_BATCH_SIZE = 100;
export const SOURCE_HEALTH_CRON = "0 */15 * * * *";
export const SOURCE_HEALTH_SCHEDULE_KEY = "global";

const SUCCESS_OUTCOMES = ["created", "updated", "deduplicated"] as const;
const FAILURE_OUTCOMES = ["rejected", "rate_limited", "abuse_blocked", "error"] as const;

function publicSourceId() {
  return `src_${randomBytes(12).toString("hex")}`;
}

function parseScopes(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((scope): scope is string => typeof scope === "string") : [];
  } catch {
    return value.split(/[\s,]+/).map(scope => scope.trim()).filter(Boolean);
  }
}

function sourceKeyIsUsable(key: typeof apiKeys.$inferSelect, now = Date.now()) {
  const inactive = key.revokedAt !== null
    || (key.expiresAt !== null && key.expiresAt <= now)
    || (key.suspensionExpiresAt !== null && key.suspensionExpiresAt > now);
  return !inactive && parseScopes(key.scopes).includes("contacts:write");
}

export async function listUsableSourceApiKeys(userId: number, now = Date.now()) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
  return rows.filter(row => sourceKeyIsUsable(row, now));
}

export async function createSourceConnection(params: {
  userId: number;
  apiKeyId: number;
  provider: SourceProvider;
  label: string;
  expectedIntervalMinutes: number;
  monitoringEnabled: boolean;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = params.now ?? Date.now();
  const [key] = await db.select().from(apiKeys).where(and(
    eq(apiKeys.id, params.apiKeyId),
    eq(apiKeys.userId, params.userId),
  )).limit(1);
  if (!key || !sourceKeyIsUsable(key, now)) return null;

  const [inserted] = await db.insert(sourceConnections).values({
    publicId: publicSourceId(),
    userId: params.userId,
    apiKeyId: params.apiKeyId,
    provider: params.provider,
    label: params.label.slice(0, 100),
    expectedIntervalMinutes: params.expectedIntervalMinutes,
    monitoringEnabled: params.monitoringEnabled,
    status: params.monitoringEnabled ? "setup" : "paused",
    nextEvaluationAt: params.monitoringEnabled ? now : null,
    createdAt: now,
    updatedAt: now,
  }).$returningId();

  return getSourceConnectionForUser(params.userId, inserted.id);
}

export async function listSourceConnectionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceConnections).where(and(
    eq(sourceConnections.userId, userId),
    isNull(sourceConnections.archivedAt),
  )).orderBy(desc(sourceConnections.createdAt));
}

export async function getSourceConnectionForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(sourceConnections).where(and(
    eq(sourceConnections.id, id),
    eq(sourceConnections.userId, userId),
    isNull(sourceConnections.archivedAt),
  )).limit(1);
  return row ?? null;
}

export async function updateSourceConnection(params: {
  userId: number;
  id: number;
  label?: string;
  expectedIntervalMinutes?: number;
  monitoringEnabled?: boolean;
  now?: number;
}) {
  const existing = await getSourceConnectionForUser(params.userId, params.id);
  if (!existing) return null;
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = params.now ?? Date.now();
  const set: Partial<typeof sourceConnections.$inferInsert> = { updatedAt: now };
  if (params.label !== undefined) set.label = params.label.slice(0, 100);
  if (params.expectedIntervalMinutes !== undefined) set.expectedIntervalMinutes = params.expectedIntervalMinutes;
  if (params.monitoringEnabled !== undefined) {
    set.monitoringEnabled = params.monitoringEnabled;
    set.status = params.monitoringEnabled
      ? (existing.status === "paused" ? "setup" : existing.status)
      : "paused";
    set.nextEvaluationAt = params.monitoringEnabled ? now : null;
    if (!params.monitoringEnabled) {
      set.failureAlertOpen = false;
      set.consecutiveFailures = 0;
    }
  }
  await db.update(sourceConnections).set(set).where(and(
    eq(sourceConnections.id, params.id),
    eq(sourceConnections.userId, params.userId),
    isNull(sourceConnections.archivedAt),
  ));
  return getSourceConnectionForUser(params.userId, params.id);
}

export async function archiveSourceConnection(userId: number, id: number, now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(sourceConnections).set({
    archivedAt: now,
    updatedAt: now,
    monitoringEnabled: false,
    status: "paused",
    nextEvaluationAt: null,
    failureAlertOpen: false,
  }).where(and(
    eq(sourceConnections.id, id),
    eq(sourceConnections.userId, userId),
    isNull(sourceConnections.archivedAt),
  ));
}

export async function resolveSourceConnectionForPrincipal(params: {
  publicId: string;
  userId: number;
  apiKeyId: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(sourceConnections).where(and(
    eq(sourceConnections.publicId, params.publicId),
    eq(sourceConnections.userId, params.userId),
    eq(sourceConnections.apiKeyId, params.apiKeyId),
    isNull(sourceConnections.archivedAt),
  )).limit(1);
  return row ?? null;
}

export async function recordSourceConnectionActivity(params: {
  sourceConnectionId: number;
  outcome: string;
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = params.now ?? Date.now();
  const success = SUCCESS_OUTCOMES.includes(params.outcome as (typeof SUCCESS_OUTCOMES)[number]);
  await db.update(sourceConnections).set({
    lastEventAt: now,
    ...(success
      ? { lastSuccessAt: now }
      : { lastFailureAt: now, lastErrorCode: params.errorCode?.slice(0, 64) ?? params.outcome.slice(0, 64) }),
    updatedAt: now,
  }).where(eq(sourceConnections.id, params.sourceConnectionId));
}

export async function getSourceAnalytics(userId: number, days: 7 | 30 | 90) {
  const db = await getDb();
  if (!db) return [];
  const sources = await listSourceConnectionsForUser(userId);
  if (sources.length === 0) return [];
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const sourceIds = sources.map(source => source.id);
  const rows = await db.select({
    sourceConnectionId: apiImportEvents.sourceConnectionId,
    attempts: sql<number>`count(*)`,
    successfulImports: sql<number>`sum(case when ${apiImportEvents.outcome} in ('created','updated','deduplicated') then 1 else 0 end)`,
    contactsCreated: sql<number>`sum(case when ${apiImportEvents.outcome} = 'created' then 1 else 0 end)`,
    contactsDeduplicated: sql<number>`sum(case when ${apiImportEvents.outcome} in ('updated','deduplicated') then 1 else 0 end)`,
    failures: sql<number>`sum(case when ${apiImportEvents.outcome} in ('rejected','rate_limited','abuse_blocked','error') or ${apiImportEvents.errorCode} is not null then 1 else 0 end)`,
    latestActivityAt: sql<number | null>`max(${apiImportEvents.createdAt})`,
  }).from(apiImportEvents).where(and(
    eq(apiImportEvents.userId, userId),
    inArray(apiImportEvents.sourceConnectionId, sourceIds),
    gt(apiImportEvents.createdAt, sinceMs),
  )).groupBy(apiImportEvents.sourceConnectionId);

  const byId = new Map(rows.map(row => [Number(row.sourceConnectionId), row]));
  return sources.map(source => {
    const row = byId.get(source.id);
    const attempts = Number(row?.attempts ?? 0);
    const successfulImports = Number(row?.successfulImports ?? 0);
    return {
      sourceId: source.id,
      publicId: source.publicId,
      provider: source.provider,
      label: source.label,
      days,
      attempts,
      successfulImports,
      contactsCreated: Number(row?.contactsCreated ?? 0),
      contactsDeduplicated: Number(row?.contactsDeduplicated ?? 0),
      failures: Number(row?.failures ?? 0),
      successRate: attempts === 0 ? null : Math.round((successfulImports / attempts) * 10_000) / 100,
      latestActivityAt: row?.latestActivityAt === null || row?.latestActivityAt === undefined
        ? null
        : Number(row.latestActivityAt),
    };
  });
}

export async function listSourceHealthHistoryForUser(userId: number, sourceConnectionId?: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const where = sourceConnectionId === undefined
    ? eq(sourceHealthHistory.userId, userId)
    : and(eq(sourceHealthHistory.userId, userId), eq(sourceHealthHistory.sourceConnectionId, sourceConnectionId));
  return db.select().from(sourceHealthHistory).where(where).orderBy(desc(sourceHealthHistory.checkedAt)).limit(limit);
}

export async function getDueSourceConnections(now = Date.now(), limit = SOURCE_HEALTH_BATCH_SIZE) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceConnections).where(and(
    eq(sourceConnections.monitoringEnabled, true),
    isNull(sourceConnections.archivedAt),
    or(isNull(sourceConnections.nextEvaluationAt), lte(sourceConnections.nextEvaluationAt, now)),
  )).orderBy(sourceConnections.nextEvaluationAt).limit(limit);
}

export async function getSourceEventWindow(sourceConnectionId: number, sinceMs: number) {
  const db = await getDb();
  if (!db) return { attempts: 0, failures: 0, lastEventAt: null, lastSuccessAt: null, lastFailureAt: null, lastErrorCode: null };
  const [row] = await db.select({
    attempts: sql<number>`count(*)`,
    failures: sql<number>`sum(case when ${apiImportEvents.outcome} in ('rejected','rate_limited','abuse_blocked','error') or ${apiImportEvents.errorCode} is not null then 1 else 0 end)`,
    lastEventAt: sql<number | null>`max(${apiImportEvents.createdAt})`,
    lastSuccessAt: sql<number | null>`max(case when ${apiImportEvents.outcome} in ('created','updated','deduplicated') then ${apiImportEvents.createdAt} else null end)`,
    lastFailureAt: sql<number | null>`max(case when ${apiImportEvents.outcome} in ('rejected','rate_limited','abuse_blocked','error') or ${apiImportEvents.errorCode} is not null then ${apiImportEvents.createdAt} else null end)`,
  }).from(apiImportEvents).where(and(
    eq(apiImportEvents.sourceConnectionId, sourceConnectionId),
    gt(apiImportEvents.createdAt, sinceMs),
  ));

  const [lastFailure] = await db.select({ errorCode: apiImportEvents.errorCode })
    .from(apiImportEvents)
    .where(and(
      eq(apiImportEvents.sourceConnectionId, sourceConnectionId),
      gt(apiImportEvents.createdAt, sinceMs),
      or(inArray(apiImportEvents.outcome, [...FAILURE_OUTCOMES]), sql`${apiImportEvents.errorCode} is not null`),
    ))
    .orderBy(desc(apiImportEvents.createdAt))
    .limit(1);

  return {
    attempts: Number(row?.attempts ?? 0),
    failures: Number(row?.failures ?? 0),
    lastEventAt: row?.lastEventAt === null || row?.lastEventAt === undefined ? null : Number(row.lastEventAt),
    lastSuccessAt: row?.lastSuccessAt === null || row?.lastSuccessAt === undefined ? null : Number(row.lastSuccessAt),
    lastFailureAt: row?.lastFailureAt === null || row?.lastFailureAt === undefined ? null : Number(row.lastFailureAt),
    lastErrorCode: lastFailure?.errorCode ?? null,
  };
}

export async function persistSourceHealthEvaluation(params: {
  connection: SourceConnection;
  status: SourceHealthStatus;
  reasonCode: string;
  attemptsInWindow: number;
  failuresInWindow: number;
  lastEventAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastErrorCode: string | null;
  failureAlertOpen: boolean;
  openedFailureIncident?: boolean;
  consecutiveFailures: number;
  checkedAt: number;
  nextEvaluationAt: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    await tx.update(sourceConnections).set({
      status: params.status,
      lastEvaluatedAt: params.checkedAt,
      nextEvaluationAt: params.nextEvaluationAt,
      lastEventAt: params.lastEventAt,
      lastSuccessAt: params.lastSuccessAt,
      lastFailureAt: params.lastFailureAt,
      lastErrorCode: params.lastErrorCode,
      consecutiveFailures: params.consecutiveFailures,
      failureAlertOpen: params.failureAlertOpen,
      ...(params.openedFailureIncident ? { lastFailureAlertAt: null } : {}),
      updatedAt: params.checkedAt,
    }).where(eq(sourceConnections.id, params.connection.id));
    await tx.insert(sourceHealthHistory).values({
      sourceConnectionId: params.connection.id,
      userId: params.connection.userId,
      status: params.status,
      reasonCode: params.reasonCode.slice(0, 48),
      attemptsInWindow: params.attemptsInWindow,
      failuresInWindow: params.failuresInWindow,
      lastEventAt: params.lastEventAt,
      lastSuccessAt: params.lastSuccessAt,
      checkedAt: params.checkedAt,
      expiresAt: params.checkedAt + SOURCE_HEALTH_HISTORY_TTL_MS,
    });
  });
}

export async function markSourceHealthAlertDelivered(sourceConnectionId: number, transition: "failure" | "recovery", deliveredAt = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(sourceConnections).set({
    ...(transition === "failure" ? { lastFailureAlertAt: deliveredAt } : { lastRecoveryAlertAt: deliveredAt }),
    updatedAt: deliveredAt,
  }).where(eq(sourceConnections.id, sourceConnectionId));
}

export async function listPendingSourceHealthAlerts(limit = SOURCE_HEALTH_BATCH_SIZE) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sourceConnections).where(and(
    isNull(sourceConnections.archivedAt),
    or(
      and(eq(sourceConnections.failureAlertOpen, true), isNull(sourceConnections.lastFailureAlertAt)),
      and(
        eq(sourceConnections.failureAlertOpen, false),
        sql`${sourceConnections.lastFailureAlertAt} is not null`,
        or(
          isNull(sourceConnections.lastRecoveryAlertAt),
          sql`${sourceConnections.lastRecoveryAlertAt} < ${sourceConnections.lastFailureAlertAt}`,
        ),
      ),
    ),
  )).orderBy(sourceConnections.lastEvaluatedAt).limit(limit);
}

export async function pruneExpiredSourceHealthHistory(now = Date.now()) {
  const db = await getDb();
  if (!db) return;
  await db.delete(sourceHealthHistory).where(lte(sourceHealthHistory.expiresAt, now));
}

export async function getSourceHealthScheduler() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(sourceHealthSchedulers)
    .where(eq(sourceHealthSchedulers.scheduleKey, SOURCE_HEALTH_SCHEDULE_KEY))
    .limit(1);
  return row ?? null;
}

export async function getSourceHealthSchedulerByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(sourceHealthSchedulers)
    .where(eq(sourceHealthSchedulers.scheduleCronTaskUid, taskUid))
    .limit(1);
  return row ?? null;
}

export async function claimSourceHealthSchedulerRun(
  taskUid: string,
  dedupWindowMs: number,
  now = Date.now(),
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(sourceHealthSchedulers).set({
    lastRunAt: now,
    lastRunStatus: "running",
    lastRunErrorCode: null,
    updatedAt: now,
  }).where(and(
    eq(sourceHealthSchedulers.scheduleCronTaskUid, taskUid),
    or(
      isNull(sourceHealthSchedulers.lastRunAt),
      lte(sourceHealthSchedulers.lastRunAt, now - dedupWindowMs),
    ),
  ));
  const affectedRows = Number((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  return affectedRows === 1;
}

export async function saveSourceHealthSchedulerTaskUid(taskUid: string, now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(sourceHealthSchedulers).values({
    scheduleKey: SOURCE_HEALTH_SCHEDULE_KEY,
    scheduleCronTaskUid: taskUid,
    cronExpression: SOURCE_HEALTH_CRON,
    createdAt: now,
    updatedAt: now,
  }).onDuplicateKeyUpdate({ set: {
    scheduleCronTaskUid: taskUid,
    cronExpression: SOURCE_HEALTH_CRON,
    updatedAt: now,
  } });
}

export async function recordSourceHealthSchedulerRun(params: {
  taskUid: string;
  status: "ok" | "failed";
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = params.now ?? Date.now();
  await db.update(sourceHealthSchedulers).set({
    lastRunAt: now,
    lastRunStatus: params.status,
    lastRunErrorCode: params.errorCode?.slice(0, 64) ?? null,
    updatedAt: now,
  }).where(eq(sourceHealthSchedulers.scheduleCronTaskUid, params.taskUid));
}
