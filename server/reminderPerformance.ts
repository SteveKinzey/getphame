import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { customerRequests, followUpReminders } from "../drizzle/schema";
import { getDb } from "./db";

export type ReminderTimingPerformanceRow = {
  stage: number;
  firstDelayDays: number;
  secondDelayDays: number;
  firstStageEnabled: boolean;
  secondStageEnabled: boolean;
  sentCount: number;
  successCount: number;
  successRate: number | null;
  isLowSample: boolean;
};

export type ReminderTimingPerformanceAggregateRow = {
  stage: number | null;
  firstDelayDays: number | null;
  secondDelayDays: number | null;
  firstStageEnabled: number | null;
  secondStageEnabled: number | null;
  sentCount: number | string | null;
  successCount: number | string | null;
};

export function shapeReminderTimingPerformanceRows(
  rows: ReminderTimingPerformanceAggregateRow[]
): ReminderTimingPerformanceRow[] {
  return rows.map(row => {
    const sentCount = Number(row.sentCount ?? 0);
    const successCount = Number(row.successCount ?? 0);
    return {
      stage: Number(row.stage ?? 1),
      firstDelayDays: Number(row.firstDelayDays ?? 0),
      secondDelayDays: Number(row.secondDelayDays ?? 0),
      firstStageEnabled: Number(row.firstStageEnabled ?? 0) === 1,
      secondStageEnabled: Number(row.secondStageEnabled ?? 0) === 1,
      sentCount,
      successCount,
      successRate:
        sentCount > 0
          ? Math.round((successCount / sentCount) * 1000) / 10
          : null,
      isLowSample: sentCount < 5,
    };
  });
}

/**
 * Last-touch reminder attribution: a sent reminder is successful when the linked
 * request was marked responded at or after that reminder was sent. Legacy rows
 * without immutable timing snapshots are excluded rather than guessed.
 */
export async function getReminderTimingPerformance(
  userId?: number
): Promise<ReminderTimingPerformanceRow[]> {
  const db = await getDb();
  if (!db) return [];

  const sentCountExpr = sql<number>`SUM(CASE WHEN ${followUpReminders.sentAt} IS NOT NULL THEN 1 ELSE 0 END)`;
  const successCountExpr = sql<number>`SUM(CASE WHEN ${customerRequests.respondedAt} IS NOT NULL AND ${customerRequests.respondedAt} >= ${followUpReminders.sentAt} THEN 1 ELSE 0 END)`;

  const rows = await db
    .select({
      stage: followUpReminders.sequenceStep,
      firstDelayDays: followUpReminders.firstDelayDaysSnapshot,
      secondDelayDays: followUpReminders.secondDelayDaysSnapshot,
      firstStageEnabled: followUpReminders.firstStageEnabledSnapshot,
      secondStageEnabled: followUpReminders.secondStageEnabledSnapshot,
      sentCount: sentCountExpr,
      successCount: successCountExpr,
    })
    .from(followUpReminders)
    .innerJoin(
      customerRequests,
      and(
        eq(customerRequests.id, followUpReminders.customerRequestId),
        eq(customerRequests.userId, followUpReminders.userId)
      )
    )
    .where(
      and(
        userId == null ? undefined : eq(followUpReminders.userId, userId),
        isNotNull(followUpReminders.sentAt),
        isNotNull(followUpReminders.firstDelayDaysSnapshot),
        isNotNull(followUpReminders.secondDelayDaysSnapshot),
        isNotNull(followUpReminders.firstStageEnabledSnapshot),
        isNotNull(followUpReminders.secondStageEnabledSnapshot)
      )
    )
    .groupBy(
      followUpReminders.sequenceStep,
      followUpReminders.firstDelayDaysSnapshot,
      followUpReminders.secondDelayDaysSnapshot,
      followUpReminders.firstStageEnabledSnapshot,
      followUpReminders.secondStageEnabledSnapshot
    )
    .orderBy(desc(sentCountExpr))
    .limit(12);

  return shapeReminderTimingPerformanceRows(rows);
}
