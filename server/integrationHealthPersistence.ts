import { and, asc, desc, gte, inArray, lte } from "drizzle-orm";
import {
  integrationHealthSamples,
  type IntegrationHealthSample,
} from "../drizzle/schema";
import type { IntegrationHealthSnapshot } from "./integrationHealth";
import { getDb } from "./db";

export const INTEGRATION_HEALTH_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const INTEGRATION_HEALTH_SAMPLE_RETENTION_MS =
  INTEGRATION_HEALTH_HISTORY_WINDOW_MS;
export const MAX_INTEGRATION_HEALTH_HISTORY_SAMPLES = 288;

export type IntegrationHealthHistoryComponent =
  | "database"
  | "heartbeat"
  | "stripe"
  | "emailRelay"
  | "sources";

export type IntegrationHealthHistoryPoint = {
  checkedAt: number;
  status: string;
  latencyMs: number | null;
};

export type IntegrationHealthHistory = Record<
  IntegrationHealthHistoryComponent,
  IntegrationHealthHistoryPoint[]
>;

function emptyHistory(): IntegrationHealthHistory {
  return {
    database: [],
    heartbeat: [],
    stripe: [],
    emailRelay: [],
    sources: [],
  };
}

function asSampleValues(snapshot: IntegrationHealthSnapshot) {
  return {
    checkedAt: snapshot.checkedAt,
    durationMs: snapshot.durationMs,
    overallStatus: snapshot.overallStatus,
    databaseStatus: snapshot.database.status,
    databaseLatencyMs: snapshot.database.latencyMs,
    heartbeatStatus: snapshot.heartbeat.status,
    heartbeatLatencyMs: snapshot.heartbeat.latencyMs,
    stripeStatus: snapshot.stripe.status,
    stripeLatencyMs: snapshot.stripe.latencyMs,
    emailRelayStatus: snapshot.emailRelay.status,
    emailRelayLatencyMs: snapshot.emailRelay.latencyMs,
    sourcesStatus: snapshot.sources.status,
    sourcesLatencyMs: snapshot.sources.latencyMs,
  };
}

/**
 * Persist one sanitized scheduled observation. A failed write must not turn a
 * health check into an outage or block a retry-safe schedule callback.
 */
export async function recordIntegrationHealthSample(
  snapshot: IntegrationHealthSnapshot,
  now = Date.now()
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(integrationHealthSamples).values(asSampleValues(snapshot));
    await db
      .delete(integrationHealthSamples)
      .where(
        lte(
          integrationHealthSamples.checkedAt,
          now - INTEGRATION_HEALTH_SAMPLE_RETENTION_MS
        )
      );
    return true;
  } catch (error) {
    console.warn(
      "[IntegrationHealth] Could not retain sanitized health sample:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return false;
  }
}

function toHistory(rows: IntegrationHealthSample[]): IntegrationHealthHistory {
  const result = emptyHistory();
  for (const row of rows) {
    result.database.push({
      checkedAt: row.checkedAt,
      status: row.databaseStatus,
      latencyMs: row.databaseLatencyMs,
    });
    result.heartbeat.push({
      checkedAt: row.checkedAt,
      status: row.heartbeatStatus,
      latencyMs: row.heartbeatLatencyMs,
    });
    result.stripe.push({
      checkedAt: row.checkedAt,
      status: row.stripeStatus,
      latencyMs: row.stripeLatencyMs,
    });
    result.emailRelay.push({
      checkedAt: row.checkedAt,
      status: row.emailRelayStatus,
      latencyMs: row.emailRelayLatencyMs,
    });
    result.sources.push({
      checkedAt: row.checkedAt,
      status: row.sourcesStatus,
      latencyMs: row.sourcesLatencyMs,
    });
  }
  return result;
}

/** Returns at most one day's aggregate status/latency observations. */
export async function listIntegrationHealthHistory(
  now = Date.now(),
  windowMs = INTEGRATION_HEALTH_HISTORY_WINDOW_MS
): Promise<IntegrationHealthHistory> {
  const db = await getDb();
  if (!db) return emptyHistory();
  const since = now - Math.min(windowMs, INTEGRATION_HEALTH_HISTORY_WINDOW_MS);
  try {
    const rows = (
      await db
        .select()
        .from(integrationHealthSamples)
        .where(
          and(
            gte(integrationHealthSamples.checkedAt, since),
            lte(integrationHealthSamples.checkedAt, now)
          )
        )
        .orderBy(desc(integrationHealthSamples.checkedAt))
        .limit(MAX_INTEGRATION_HEALTH_HISTORY_SAMPLES)
    ).reverse();
    return toHistory(rows);
  } catch (error) {
    console.warn(
      "[IntegrationHealth] Could not read sanitized health history:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return emptyHistory();
  }
}

/** Test-only pruning helper that retains no more than the stated sample count. */
export async function pruneIntegrationHealthSampleCount(
  maxSamples: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const safeMax = Math.max(
    1,
    Math.min(maxSamples, MAX_INTEGRATION_HEALTH_HISTORY_SAMPLES)
  );
  const stale = await db
    .select({ id: integrationHealthSamples.id })
    .from(integrationHealthSamples)
    .orderBy(desc(integrationHealthSamples.checkedAt))
    .offset(safeMax)
    .limit(MAX_INTEGRATION_HEALTH_HISTORY_SAMPLES);
  if (stale.length > 0) {
    await db.delete(integrationHealthSamples).where(
      inArray(
        integrationHealthSamples.id,
        stale.map(row => row.id)
      )
    );
  }
}
