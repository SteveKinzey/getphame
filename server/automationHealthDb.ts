import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import {
  automationAlertAcknowledgements,
  automationEvents,
  type InsertAutomationEvent,
} from "../drizzle/schema";
import { AUTOMATION_EVENT_RETENTION_MS } from "./automationHealth";
import { getDb } from "./db";

export class AutomationReplayError extends Error {
  constructor() {
    super("The GitHub OIDC token has already been used.");
    this.name = "AutomationReplayError";
  }
}

export async function ingestAutomationEvent(
  input: InsertAutomationEvent
): Promise<{
  eventId: number;
  duplicate: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  return db.transaction(async tx => {
    const [replayed] = await tx
      .select({ id: automationEvents.id })
      .from(automationEvents)
      .where(eq(automationEvents.oidcJtiHash, input.oidcJtiHash))
      .limit(1);
    if (replayed) throw new AutomationReplayError();

    const [existing] = await tx
      .select({ id: automationEvents.id })
      .from(automationEvents)
      .where(eq(automationEvents.eventKey, input.eventKey))
      .limit(1);
    if (existing) return { eventId: existing.id, duplicate: true };

    let insertId: number;
    try {
      const result = await tx.insert(automationEvents).values(input);
      insertId = Number(result[0].insertId);
    } catch (error) {
      const [sameEvent] = await tx
        .select({ id: automationEvents.id })
        .from(automationEvents)
        .where(eq(automationEvents.eventKey, input.eventKey))
        .limit(1);
      if (sameEvent) return { eventId: sameEvent.id, duplicate: true };
      const [sameToken] = await tx
        .select({ id: automationEvents.id })
        .from(automationEvents)
        .where(eq(automationEvents.oidcJtiHash, input.oidcJtiHash))
        .limit(1);
      if (sameToken) throw new AutomationReplayError();
      throw error;
    }

    const expiredRows = await tx
      .select({ id: automationEvents.id })
      .from(automationEvents)
      .where(
        lt(
          automationEvents.eventAt,
          input.receivedAt - AUTOMATION_EVENT_RETENTION_MS
        )
      )
      .limit(500);
    if (expiredRows.length > 0) {
      const expiredIds = expiredRows.map(row => row.id);
      await tx
        .delete(automationAlertAcknowledgements)
        .where(inArray(automationAlertAcknowledgements.eventId, expiredIds));
      await tx
        .delete(automationEvents)
        .where(inArray(automationEvents.id, expiredIds));
    }

    return { eventId: insertId, duplicate: false };
  });
}

export type AutomationDashboardFilters = {
  fromMs: number;
  toMs: number;
  kind?: "drift_audit" | "dependabot_merge";
  result?: "success" | "failure";
  limit: number;
};

function utcDateKey(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function buildDateKeys(fromMs: number, toMs: number): string[] {
  const cursor = new Date(fromMs);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(toMs);
  end.setUTCHours(0, 0, 0, 0);
  const keys: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

type AutomationEventRow = typeof automationEvents.$inferSelect;

function matchesAutomationFilters(
  event: AutomationEventRow,
  filters: AutomationDashboardFilters
): boolean {
  return (
    (!filters.kind || event.kind === filters.kind) &&
    (!filters.result || event.result === filters.result)
  );
}

export function summarizeAutomationEvents(input: {
  filters: AutomationDashboardFilters;
  history: AutomationEventRow[];
  allRangeEvents: AutomationEventRow[];
  latestDrift: AutomationEventRow | null;
}) {
  const { filters, history, allRangeEvents, latestDrift } = input;
  const filteredRangeEvents = allRangeEvents.filter(event =>
    matchesAutomationFilters(event, filters)
  );
  const dependabotMerges = filteredRangeEvents.filter(
    event => event.kind === "dependabot_merge" && event.result === "success"
  );
  const mergeDurations = dependabotMerges
    .map(event => {
      if (
        event.pullRequestCreatedAt === null ||
        event.pullRequestMergedAt === null
      ) {
        return null;
      }
      return event.pullRequestMergedAt - event.pullRequestCreatedAt;
    })
    .filter(
      (duration): duration is number => duration !== null && duration >= 0
    )
    .sort((left, right) => left - right);
  const averageMergeDurationMs =
    mergeDurations.length > 0
      ? Math.round(
          mergeDurations.reduce((sum, duration) => sum + duration, 0) /
            mergeDurations.length
        )
      : null;
  const medianMergeDurationMs =
    mergeDurations.length > 0
      ? mergeDurations.length % 2 === 1
        ? mergeDurations[Math.floor(mergeDurations.length / 2)]
        : Math.round(
            (mergeDurations[mergeDurations.length / 2 - 1] +
              mergeDurations[mergeDurations.length / 2]) /
              2
          )
      : null;

  const driftEvents = filteredRangeEvents.filter(
    event => event.kind === "drift_audit"
  );
  const driftSuccesses = driftEvents.filter(
    event => event.result === "success"
  ).length;
  const driftFailures = driftEvents.filter(
    event => event.result === "failure"
  ).length;

  const daily = new Map(
    buildDateKeys(filters.fromMs, filters.toMs).map(date => [
      date,
      { date, dependabotMerges: 0, driftSuccesses: 0, driftFailures: 0 },
    ])
  );
  for (const event of filteredRangeEvents) {
    const point = daily.get(utcDateKey(event.eventAt));
    if (!point) continue;
    if (event.kind === "dependabot_merge" && event.result === "success") {
      point.dependabotMerges += 1;
    }
    if (event.kind === "drift_audit" && event.result === "success") {
      point.driftSuccesses += 1;
    }
    if (event.kind === "drift_audit" && event.result === "failure") {
      point.driftFailures += 1;
    }
  }

  return {
    range: { fromMs: filters.fromMs, toMs: filters.toMs },
    dependabot: {
      mergedCount: dependabotMerges.length,
      averageMergeDurationMs,
      medianMergeDurationMs,
    },
    drift: {
      auditCount: driftEvents.length,
      successCount: driftSuccesses,
      failureCount: driftFailures,
      successRate:
        driftEvents.length > 0 ? driftSuccesses / driftEvents.length : null,
      latest: latestDrift,
    },
    daily: Array.from(daily.values()),
    history,
  };
}

export async function getAutomationDashboard(
  filters: AutomationDashboardFilters
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const conditions = [
    gte(automationEvents.eventAt, filters.fromMs),
    lte(automationEvents.eventAt, filters.toMs),
  ];
  if (filters.kind) conditions.push(eq(automationEvents.kind, filters.kind));
  if (filters.result)
    conditions.push(eq(automationEvents.result, filters.result));
  const rangeCondition = and(...conditions);

  const [events, latestDriftRows] = await Promise.all([
    db
      .select()
      .from(automationEvents)
      .where(rangeCondition)
      .orderBy(desc(automationEvents.eventAt), desc(automationEvents.id))
      .limit(filters.limit),
    db
      .select()
      .from(automationEvents)
      .where(eq(automationEvents.kind, "drift_audit"))
      .orderBy(desc(automationEvents.eventAt), desc(automationEvents.id))
      .limit(1),
  ]);

  const allRangeEvents = await db
    .select()
    .from(automationEvents)
    .where(rangeCondition)
    .orderBy(asc(automationEvents.eventAt), asc(automationEvents.id));

  return summarizeAutomationEvents({
    filters,
    history: events,
    allRangeEvents,
    latestDrift: latestDriftRows[0] ?? null,
  });
}

export async function getAutomationAlert(adminUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [latest] = await db
    .select()
    .from(automationEvents)
    .where(eq(automationEvents.kind, "drift_audit"))
    .orderBy(desc(automationEvents.eventAt), desc(automationEvents.id))
    .limit(1);
  if (!latest || latest.result !== "failure") {
    return { active: false as const, event: null, acknowledged: false };
  }
  const [acknowledgement] = await db
    .select({ id: automationAlertAcknowledgements.id })
    .from(automationAlertAcknowledgements)
    .where(
      and(
        eq(automationAlertAcknowledgements.eventId, latest.id),
        eq(automationAlertAcknowledgements.adminUserId, adminUserId)
      )
    )
    .limit(1);
  return {
    active: true as const,
    event: latest,
    acknowledged: Boolean(acknowledgement),
  };
}

export async function acknowledgeAutomationAlert(input: {
  eventId: number;
  adminUserId: number;
  acknowledgedAt: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [latest] = await db
    .select({ id: automationEvents.id, result: automationEvents.result })
    .from(automationEvents)
    .where(eq(automationEvents.kind, "drift_audit"))
    .orderBy(desc(automationEvents.eventAt), desc(automationEvents.id))
    .limit(1);
  if (!latest || latest.id !== input.eventId || latest.result !== "failure")
    return { acknowledged: false };
  await db
    .insert(automationAlertAcknowledgements)
    .values(input)
    .onDuplicateKeyUpdate({ set: { acknowledgedAt: input.acknowledgedAt } });
  return { acknowledged: true };
}
