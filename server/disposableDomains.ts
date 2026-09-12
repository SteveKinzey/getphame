import { resolveMx } from "node:dns/promises";
import { domainToASCII } from "node:url";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  disposableDomainAccountReviews,
  disposableDomainSchedulers,
  disposableEmailDomains,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export const DISPOSABLE_DOMAIN_BLOCK_THRESHOLD = 90;
export const DISPOSABLE_DOMAIN_STALE_MS = 90 * 24 * 60 * 60 * 1000;
export const DISPOSABLE_DOMAIN_DNS_RECHECK_MS = 30 * 24 * 60 * 60 * 1000;
export const DISPOSABLE_DOMAIN_DNS_BATCH_SIZE = 60;
export const DISPOSABLE_DOMAIN_CRON = "0 0 9,10 * * *";
export const DISPOSABLE_DOMAIN_SCHEDULE_KEY = "global";
export const DISPOSABLE_DOMAIN_TIME_ZONE = "America/Los_Angeles";
export const DISPOSABLE_DOMAIN_MANUAL_COOLDOWN_MS = 5 * 60 * 1000;

export const DISPOSABLE_DOMAIN_SOURCES = [
  {
    key: "disposable_email_domains" as const,
    url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf",
    confidence: 80,
  },
  {
    key: "disposable_normal_mode" as const,
    url: "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt",
    confidence: 90,
  },
] as const;

export type DisposableDomainSourceKey =
  (typeof DISPOSABLE_DOMAIN_SOURCES)[number]["key"];

export type DisposableDomainFeed = {
  source: DisposableDomainSourceKey;
  body: string;
};

export type DisposableDomainRecord = {
  domain: string;
  confidenceScore: number;
  sourceEvidenceJson: string;
};

type DomainFetcher = (
  source: (typeof DISPOSABLE_DOMAIN_SOURCES)[number]
) => Promise<string>;

const DOMAIN_LINE_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const SOURCE_FETCH_TIMEOUT_MS = 20_000;
const DNS_TIMEOUT_MS = 3_000;
const UPSERT_BATCH_SIZE = 1_000;

function nowMs() {
  return Date.now();
}

export function normalizeDisposableDomain(value: string | null | undefined) {
  if (!value) return null;
  const withoutComment = value.trim().split(/\s+#/, 1)[0] ?? "";
  const trimmed = withoutComment
    .trim()
    .replace(/^@/, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (!trimmed || trimmed.length > 253 || trimmed.includes("@")) return null;
  const ascii = domainToASCII(trimmed);
  if (!ascii || ascii.length > 253 || !DOMAIN_LINE_PATTERN.test(ascii))
    return null;
  return ascii;
}

export function getEmailDomain(email: string | null | undefined) {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  return at <= 0 ? null : normalizeDisposableDomain(email.slice(at + 1));
}

export function aggregateDisposableDomainFeeds(
  feeds: DisposableDomainFeed[]
): DisposableDomainRecord[] {
  const sourcesByDomain = new Map<string, Set<DisposableDomainSourceKey>>();
  for (const feed of feeds) {
    for (const line of feed.body.split(/\r?\n/)) {
      const candidate = line.trim();
      if (!candidate || candidate.startsWith("#")) continue;
      const domain = normalizeDisposableDomain(candidate);
      if (!domain) continue;
      const sources =
        sourcesByDomain.get(domain) ?? new Set<DisposableDomainSourceKey>();
      sources.add(feed.source);
      sourcesByDomain.set(domain, sources);
    }
  }

  return Array.from(sourcesByDomain.entries())
    .map(([domain, sourceSet]) => {
      const sources = Array.from(
        sourceSet
      ).sort() as DisposableDomainSourceKey[];
      const individualConfidence = sources.map(
        source =>
          DISPOSABLE_DOMAIN_SOURCES.find(candidate => candidate.key === source)
            ?.confidence ?? 0
      );
      const confidenceScore =
        sources.length > 1 ? 100 : Math.max(...individualConfidence, 0);
      return {
        domain,
        confidenceScore,
        sourceEvidenceJson: JSON.stringify({ version: 1, sources }),
      };
    })
    .sort((left, right) => left.domain.localeCompare(right.domain));
}

async function fetchPublicFeed(
  source: (typeof DISPOSABLE_DOMAIN_SOURCES)[number]
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source.url, {
      headers: { accept: "text/plain, text/*;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error(`feed_${source.key}_http_${response.status}`);
    const body = await response.text();
    if (!body.trim() || body.length > 5_000_000)
      throw new Error(`feed_${source.key}_invalid_body`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchApprovedDisposableDomainFeeds(
  fetcher: DomainFetcher = fetchPublicFeed
) {
  // The job changes catalog activity only after every approved feed succeeds.
  // That avoids a transient source outage silently unblocking known domains.
  const bodies = await Promise.all(
    DISPOSABLE_DOMAIN_SOURCES.map(async source => ({
      source: source.key,
      body: await fetcher(source),
    }))
  );
  return bodies;
}

async function checkMx(domain: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("DNS_TIMEOUT")),
          DNS_TIMEOUT_MS
        );
      }),
    ]);
    return {
      mxExists: records.length > 0,
      dnsErrorCode: null as string | null,
    };
  } catch (error) {
    const code =
      error instanceof Error ? error.message.slice(0, 64) : "DNS_LOOKUP_FAILED";
    // MX is enrichment only. No DNS result changes block eligibility.
    return { mxExists: null as boolean | null, dnsErrorCode: code };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function runBoundedMxEnrichment(now: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const dueBefore = now - DISPOSABLE_DOMAIN_DNS_RECHECK_MS;
  const candidates = await db
    .select({
      id: disposableEmailDomains.id,
      domain: disposableEmailDomains.domain,
    })
    .from(disposableEmailDomains)
    .where(
      and(
        eq(disposableEmailDomains.active, true),
        or(
          isNull(disposableEmailDomains.lastDnsCheckedAt),
          lte(disposableEmailDomains.lastDnsCheckedAt, dueBefore)
        )
      )
    )
    .orderBy(disposableEmailDomains.lastDnsCheckedAt)
    .limit(DISPOSABLE_DOMAIN_DNS_BATCH_SIZE);

  const workerCount = Math.min(8, candidates.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < candidates.length) {
      const candidate = candidates[nextIndex++];
      const result = await checkMx(candidate.domain);
      await db
        .update(disposableEmailDomains)
        .set({
          lastDnsCheckedAt: now,
          mxExists: result.mxExists,
          dnsErrorCode: result.dnsErrorCode,
          updatedAt: now,
        })
        .where(eq(disposableEmailDomains.id, candidate.id));
    }
  };
  await Promise.all(Array.from({ length: workerCount }, worker));
  return candidates.length;
}

export async function syncDisposableEmailDomains(options?: {
  now?: number;
  fetcher?: DomainFetcher;
}) {
  const now = options?.now ?? nowMs();
  const feeds = await fetchApprovedDisposableDomainFeeds(options?.fetcher);
  const records = aggregateDisposableDomainFeeds(feeds);
  if (records.length === 0)
    throw new Error("No valid disposable domains received");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  for (let index = 0; index < records.length; index += UPSERT_BATCH_SIZE) {
    const batch = records
      .slice(index, index + UPSERT_BATCH_SIZE)
      .map(record => ({
        ...record,
        active: true,
        firstSeenAt: now,
        lastSeenAt: now,
        lastDnsCheckedAt: null,
        mxExists: null,
        dnsErrorCode: null,
        createdAt: now,
        updatedAt: now,
      }));
    await db
      .insert(disposableEmailDomains)
      .values(batch)
      .onDuplicateKeyUpdate({
        set: {
          sourceEvidenceJson: sql`VALUES(${disposableEmailDomains.sourceEvidenceJson})`,
          confidenceScore: sql`VALUES(${disposableEmailDomains.confidenceScore})`,
          active: true,
          lastSeenAt: now,
          updatedAt: now,
        },
      });
  }

  const staleBefore = now - DISPOSABLE_DOMAIN_STALE_MS;
  await db
    .update(disposableEmailDomains)
    .set({
      active: false,
      updatedAt: now,
    })
    .where(
      and(
        eq(disposableEmailDomains.active, true),
        lte(disposableEmailDomains.lastSeenAt, staleBefore)
      )
    );

  const mxChecked = await runBoundedMxEnrichment(now);
  const accountReviews = await reconcileDisposableDomainAccountReviews(now);
  return {
    feedCount: feeds.length,
    normalizedDomains: records.length,
    mxChecked,
    accountReviews,
  };
}

/**
 * Adds or refreshes review records for existing accounts whose current domain
 * becomes a high-confidence catalog match. It does not alter sign-in, paid
 * access, outreach, or customer data.
 */
export async function reconcileDisposableDomainAccountReviews(now = nowMs()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const scheduler = await getDisposableDomainScheduler();
  const reviewCursorUserId = scheduler?.reviewCursorUserId ?? 0;
  const candidates = await db
    .select({
      userId: users.id,
      domain: disposableEmailDomains.domain,
      confidenceScore: disposableEmailDomains.confidenceScore,
    })
    .from(users)
    .innerJoin(
      disposableEmailDomains,
      eq(
        sql<string>`LOWER(SUBSTRING_INDEX(${users.email}, '@', -1))`,
        disposableEmailDomains.domain
      )
    )
    .where(
      and(
        isNotNull(users.email),
        gte(users.id, reviewCursorUserId + 1),
        eq(disposableEmailDomains.active, true),
        gte(
          disposableEmailDomains.confidenceScore,
          DISPOSABLE_DOMAIN_BLOCK_THRESHOLD
        )
      )
    )
    .orderBy(asc(users.id))
    .limit(1_000);

  for (const candidate of candidates) {
    await db
      .insert(disposableDomainAccountReviews)
      .values({
        userId: candidate.userId,
        domain: candidate.domain,
        confidenceScore: candidate.confidenceScore,
        status: "pending",
        detectedAt: now,
        lastDetectedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          domain: candidate.domain,
          confidenceScore: candidate.confidenceScore,
          lastDetectedAt: now,
          updatedAt: now,
        },
      });
  }
  if (scheduler?.scheduleCronTaskUid) {
    const nextCursor = candidates.at(-1)?.userId ?? 0;
    await db
      .update(disposableDomainSchedulers)
      .set({
        reviewCursorUserId: nextCursor,
        updatedAt: now,
      })
      .where(
        eq(
          disposableDomainSchedulers.scheduleCronTaskUid,
          scheduler.scheduleCronTaskUid
        )
      );
  }
  return candidates.length;
}

export async function getDisposableDomainReviewQueue(input?: {
  status?: "pending" | "dismissed" | "resolved";
  limit?: number;
}) {
  const db = await getDb();
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100);
  const emptySummary = { total: 0, pending: 0, dismissed: 0, resolved: 0 };
  if (!db) return { reviews: [], summary: emptySummary };
  const reviews = await db
    .select({
      id: disposableDomainAccountReviews.id,
      userId: disposableDomainAccountReviews.userId,
      domain: disposableDomainAccountReviews.domain,
      confidenceScore: disposableDomainAccountReviews.confidenceScore,
      status: disposableDomainAccountReviews.status,
      detectedAt: disposableDomainAccountReviews.detectedAt,
      lastDetectedAt: disposableDomainAccountReviews.lastDetectedAt,
      resolvedAt: disposableDomainAccountReviews.resolvedAt,
      adminNote: disposableDomainAccountReviews.adminNote,
    })
    .from(disposableDomainAccountReviews)
    .where(
      input?.status
        ? eq(disposableDomainAccountReviews.status, input.status)
        : undefined
    )
    .orderBy(desc(disposableDomainAccountReviews.lastDetectedAt))
    .limit(limit);
  const summaryRows = await db
    .select({
      status: disposableDomainAccountReviews.status,
      total: count(),
    })
    .from(disposableDomainAccountReviews)
    .groupBy(disposableDomainAccountReviews.status);
  const summary = { ...emptySummary };
  for (const row of summaryRows) {
    const status = row.status as "pending" | "dismissed" | "resolved";
    summary[status] = Number(row.total);
    summary.total += Number(row.total);
  }
  return { reviews, summary };
}

export async function resolveDisposableDomainReview(input: {
  reviewId: number;
  status: "dismissed" | "resolved";
  adminNote?: string | null;
  adminUserId: number;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? nowMs();
  await db
    .update(disposableDomainAccountReviews)
    .set({
      status: input.status,
      adminNote: input.adminNote?.trim().slice(0, 500) || null,
      resolvedAt: now,
      resolvedByUserId: input.adminUserId,
      updatedAt: now,
    })
    .where(eq(disposableDomainAccountReviews.id, input.reviewId));
}

export async function isHighConfidenceDisposableEmail(
  email: string | null | undefined
) {
  const domain = getEmailDomain(email);
  if (!domain) return false;
  const db = await getDb();
  if (!db) return false;
  const [match] = await db
    .select({ id: disposableEmailDomains.id })
    .from(disposableEmailDomains)
    .where(
      and(
        eq(disposableEmailDomains.domain, domain),
        eq(disposableEmailDomains.active, true),
        gte(
          disposableEmailDomains.confidenceScore,
          DISPOSABLE_DOMAIN_BLOCK_THRESHOLD
        )
      )
    )
    .limit(1);
  return Boolean(match);
}

export function getPacificScheduleDecision(now = nowMs()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPOSABLE_DOMAIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? "";
  const dateKey = `${value("year")}-${value("month")}-${value("day")}`;
  const hour = Number(value("hour"));

  // The spring DST change skips local 02:00. At local 03:00, the instant one
  // real hour earlier is still local 01:00, which identifies the one allowed
  // makeup execution without drifting ordinary days to 03:00.
  const oneHourEarlier = new Intl.DateTimeFormat("en-US", {
    timeZone: DISPOSABLE_DOMAIN_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(now - 60 * 60 * 1000));
  const earlierHour = Number(
    oneHourEarlier.find(part => part.type === "hour")?.value ?? "-1"
  );
  const isSpringForwardMakeup = hour === 3 && earlierHour === 1;
  return {
    dateKey,
    localHour: hour,
    isSpringForwardMakeup,
    shouldRun: hour === 2 || isSpringForwardMakeup,
  };
}

export async function getDisposableDomainScheduler() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(disposableDomainSchedulers)
    .where(
      eq(disposableDomainSchedulers.scheduleKey, DISPOSABLE_DOMAIN_SCHEDULE_KEY)
    )
    .limit(1);
  return row ?? null;
}

export async function getDisposableDomainSchedulerByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(disposableDomainSchedulers)
    .where(eq(disposableDomainSchedulers.scheduleCronTaskUid, taskUid))
    .limit(1);
  return row ?? null;
}

export async function saveDisposableDomainSchedulerTaskUid(
  taskUid: string,
  now = nowMs()
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(disposableDomainSchedulers)
    .values({
      scheduleKey: DISPOSABLE_DOMAIN_SCHEDULE_KEY,
      scheduleCronTaskUid: taskUid,
      cronExpression: DISPOSABLE_DOMAIN_CRON,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: taskUid,
        cronExpression: DISPOSABLE_DOMAIN_CRON,
        updatedAt: now,
      },
    });
}

export async function claimDisposableDomainSchedulerRun(
  taskUid: string,
  now = nowMs()
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(disposableDomainSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: "running",
      lastRunErrorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(disposableDomainSchedulers.scheduleCronTaskUid, taskUid),
        or(
          isNull(disposableDomainSchedulers.lastRunAt),
          lte(disposableDomainSchedulers.lastRunAt, now - 120_000)
        )
      )
    );
  return (
    Number(
      (result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0
    ) === 1
  );
}

export async function recordDisposableDomainSchedulerRun(params: {
  taskUid: string;
  status: "ok" | "failed";
  dateKey?: string;
  summary?: Record<string, unknown>;
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = params.now ?? nowMs();
  await db
    .update(disposableDomainSchedulers)
    .set({
      lastRunDateKey: params.dateKey ?? null,
      lastRunAt: now,
      lastRunStatus: params.status,
      lastRunErrorCode: params.errorCode ?? null,
      lastRunSummaryJson: params.summary
        ? JSON.stringify(params.summary)
        : null,
      updatedAt: now,
    })
    .where(eq(disposableDomainSchedulers.scheduleCronTaskUid, params.taskUid));
}

/**
 * Allows a trusted administrator to establish the catalog before the first
 * scheduled run. The same durable scheduler state provides a small cooldown
 * so repeated UI clicks cannot create parallel public-feed imports.
 */
export async function runDisposableDomainManualSync(now = nowMs()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const scheduler = await getDisposableDomainScheduler();
  if (!scheduler?.scheduleCronTaskUid) {
    return { status: "unavailable" as const };
  }

  const claim = await db
    .update(disposableDomainSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: "running",
      lastRunErrorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(
          disposableDomainSchedulers.scheduleKey,
          DISPOSABLE_DOMAIN_SCHEDULE_KEY
        ),
        eq(
          disposableDomainSchedulers.scheduleCronTaskUid,
          scheduler.scheduleCronTaskUid
        ),
        or(
          isNull(disposableDomainSchedulers.lastRunAt),
          lte(
            disposableDomainSchedulers.lastRunAt,
            now - DISPOSABLE_DOMAIN_MANUAL_COOLDOWN_MS
          )
        )
      )
    );
  const claimed =
    Number(
      (claim as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0
    ) === 1;
  if (!claimed)
    return {
      status: "cooldown" as const,
      retryAfterMs: DISPOSABLE_DOMAIN_MANUAL_COOLDOWN_MS,
    };

  try {
    const summary = await syncDisposableEmailDomains({ now });
    await recordDisposableDomainSchedulerRun({
      taskUid: scheduler.scheduleCronTaskUid,
      status: "ok",
      dateKey: getPacificScheduleDecision(now).dateKey,
      summary,
      now,
    });
    return { status: "ok" as const, summary };
  } catch (error) {
    await recordDisposableDomainSchedulerRun({
      taskUid: scheduler.scheduleCronTaskUid,
      status: "failed",
      errorCode: "DISPOSABLE_DOMAIN_MANUAL_SYNC_FAILED",
      now,
    }).catch(() => undefined);
    throw error;
  }
}
