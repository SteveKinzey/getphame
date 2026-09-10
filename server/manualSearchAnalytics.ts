import { createHash } from "node:crypto";
import { and, desc, gte, lt, sql } from "drizzle-orm";
import { manualSearchEvents } from "../drizzle/schema";
import type { getDb } from "./db";

export const MANUAL_SEARCH_LOCALES = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;
export const MANUAL_SEARCH_ROLES = ["user", "admin"] as const;
export const MANUAL_SEARCH_RETENTION_DAYS = 365;
export const MANUAL_SEARCH_MIN_LENGTH = 2;
export const MANUAL_SEARCH_MAX_LENGTH = 100;
export const MANUAL_SEARCH_REPORTING_PERIODS = [30, 90, 365] as const;

export type ManualSearchLocale = (typeof MANUAL_SEARCH_LOCALES)[number];
export type ManualSearchRole = (typeof MANUAL_SEARCH_ROLES)[number];
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const DAY_MS = 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;

export function normalizeManualSearchQuery(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function validateManualSearchQuery(value: string) {
  const normalized = normalizeManualSearchQuery(value);
  if (
    normalized.length < MANUAL_SEARCH_MIN_LENGTH ||
    normalized.length > MANUAL_SEARCH_MAX_LENGTH
  ) {
    throw new Error(
      `Manual search terms must contain ${MANUAL_SEARCH_MIN_LENGTH}–${MANUAL_SEARCH_MAX_LENGTH} characters.`
    );
  }
  return normalized;
}

export function getManualSearchFingerprint(query: string) {
  return createHash("sha256")
    .update(normalizeManualSearchQuery(query), "utf8")
    .digest("hex");
}

export function getManualSearchDedupeKey(input: {
  userId: number;
  query: string;
  manualRole: ManualSearchRole;
  locale: ManualSearchLocale;
  now?: Date;
}) {
  const day = (input.now ?? new Date()).toISOString().slice(0, 10);
  return createHash("sha256")
    .update(
      `${input.userId}:${input.manualRole}:${input.locale}:${getManualSearchFingerprint(input.query)}:${day}`,
      "utf8"
    )
    .digest("hex");
}

async function cleanExpiredManualSearchEvents(db: Database, now: Date) {
  const nowMs = now.getTime();
  if (nowMs - lastCleanupAt < DAY_MS) return;
  lastCleanupAt = nowMs;
  await db
    .delete(manualSearchEvents)
    .where(
      lt(
        manualSearchEvents.createdAt,
        new Date(nowMs - MANUAL_SEARCH_RETENTION_DAYS * DAY_MS)
      )
    );
}

export async function recordManualZeroResultSearch(input: {
  db: Database;
  userId: number;
  query: string;
  manualRole: ManualSearchRole;
  locale: ManualSearchLocale;
  manualVersion: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const query = validateManualSearchQuery(input.query);
  const dedupeKey = getManualSearchDedupeKey({
    userId: input.userId,
    query,
    manualRole: input.manualRole,
    locale: input.locale,
    now,
  });

  await input.db
    .insert(manualSearchEvents)
    .values({
      userId: input.userId,
      query,
      queryFingerprint: getManualSearchFingerprint(query),
      manualRole: input.manualRole,
      locale: input.locale,
      manualVersion: input.manualVersion,
      dedupeKey,
      createdAt: now,
    })
    .onDuplicateKeyUpdate({ set: { dedupeKey } });

  await cleanExpiredManualSearchEvents(input.db, now);
  return { ok: true as const };
}

export async function getManualSearchInsights(input: {
  db: Database;
  periodDays: (typeof MANUAL_SEARCH_REPORTING_PERIODS)[number];
  limit: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const periodStart = new Date(now.getTime() - input.periodDays * DAY_MS);
  const where = and(gte(manualSearchEvents.createdAt, periodStart));

  const [summaryRows, roleRows, itemRows] = await Promise.all([
    input.db
      .select({
        totalSearches: sql<number>`count(*)`,
        uniqueTerms: sql<number>`count(distinct concat(${manualSearchEvents.queryFingerprint}, ':', ${manualSearchEvents.manualRole}, ':', ${manualSearchEvents.locale}))`,
        latestAt: sql<Date | null>`max(${manualSearchEvents.createdAt})`,
      })
      .from(manualSearchEvents)
      .where(where),
    input.db
      .select({
        manualRole: manualSearchEvents.manualRole,
        count: sql<number>`count(*)`,
      })
      .from(manualSearchEvents)
      .where(where)
      .groupBy(manualSearchEvents.manualRole),
    input.db
      .select({
        query: manualSearchEvents.query,
        manualRole: manualSearchEvents.manualRole,
        locale: manualSearchEvents.locale,
        count: sql<number>`count(*)`,
        lastSearchedAt: sql<Date>`max(${manualSearchEvents.createdAt})`,
      })
      .from(manualSearchEvents)
      .where(where)
      .groupBy(
        manualSearchEvents.query,
        manualSearchEvents.manualRole,
        manualSearchEvents.locale
      )
      .orderBy(
        desc(sql`count(*)`),
        desc(sql`max(${manualSearchEvents.createdAt})`)
      )
      .limit(input.limit),
  ]);

  const summary = summaryRows[0];
  const roleCounts = { user: 0, admin: 0 };
  for (const row of roleRows)
    roleCounts[row.manualRole as ManualSearchRole] = Number(row.count);

  return {
    generatedAt: now.toISOString(),
    periodDays: input.periodDays,
    retentionDays: MANUAL_SEARCH_RETENTION_DAYS,
    deduplication: "account_query_role_locale_utc_day" as const,
    summary: {
      totalSearches: Number(summary?.totalSearches ?? 0),
      uniqueTerms: Number(summary?.uniqueTerms ?? 0),
      latestAt: summary?.latestAt
        ? new Date(summary.latestAt).toISOString()
        : null,
      roleCounts,
    },
    items: itemRows.map(row => ({
      query: row.query,
      manualRole: row.manualRole,
      locale: row.locale,
      count: Number(row.count),
      lastSearchedAt: new Date(row.lastSearchedAt).toISOString(),
    })),
  };
}
