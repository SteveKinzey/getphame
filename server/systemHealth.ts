import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  authHealthChecks,
  smtpHealthSnapshots,
  type InsertSmtpHealthSnapshot,
} from "../drizzle/schema";
import { getDb } from "./db";
import type { ReminderTimingPerformanceRow } from "./reminderPerformance";

export const HEALTH_TREND_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SMTP_HEALTH_MIN_PERCENT = 95;
export const REMINDER_PERFORMANCE_MIN_PERCENT = 20;
export const REMINDER_PERFORMANCE_MIN_SAMPLE = 5;

export async function createSmtpHealthSnapshot(
  input: InsertSmtpHealthSnapshot
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(smtpHealthSnapshots).values(input);
  return input;
}

export async function getRecentSmtpSnapshotForTask(
  taskUid: string,
  sinceMs: number
) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(smtpHealthSnapshots)
    .where(
      and(
        eq(smtpHealthSnapshots.scheduleCronTaskUid, taskUid),
        gte(smtpHealthSnapshots.checkedAt, sinceMs)
      )
    )
    .orderBy(desc(smtpHealthSnapshots.checkedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSystemHealthTrend(hours = 24) {
  const db = await getDb();
  if (!db)
    return {
      windowHours: hours,
      since: Date.now() - hours * 60 * 60 * 1000,
      smtp: [],
      authentication: [],
    };
  const since = Date.now() - hours * 60 * 60 * 1000;
  const [smtpRows, authRows] = await Promise.all([
    db
      .select()
      .from(smtpHealthSnapshots)
      .where(gte(smtpHealthSnapshots.checkedAt, since))
      .orderBy(asc(smtpHealthSnapshots.checkedAt)),
    db
      .select({
        checkedAt: authHealthChecks.checkedAt,
        overallStatus: authHealthChecks.overallStatus,
        durationMs: authHealthChecks.durationMs,
        failureCode: authHealthChecks.failureCode,
      })
      .from(authHealthChecks)
      .where(gte(authHealthChecks.checkedAt, since))
      .orderBy(asc(authHealthChecks.checkedAt)),
  ]);

  return {
    windowHours: hours,
    since,
    smtp: smtpRows.map(row => ({
      checkedAt: row.checkedAt,
      successRate:
        row.totalAccounts > 0
          ? Math.round((row.healthyAccounts / row.totalAccounts) * 1000) / 10
          : null,
      totalAccounts: row.totalAccounts,
      healthyAccounts: row.healthyAccounts,
      failedAccounts: row.failedAccounts,
      durationMs: row.durationMs,
    })),
    authentication: authRows.map(row => ({
      checkedAt: row.checkedAt,
      successRate: row.overallStatus === "ok" ? 100 : 0,
      status: row.overallStatus,
      durationMs: row.durationMs,
      failureCode: row.failureCode,
    })),
  };
}

type SmtpAlertObservation = {
  checkedAt: number;
  totalAccounts: number;
  healthyAccounts: number;
};

export function evaluateOperationsAlertState(
  latestSmtp: SmtpAlertObservation | null,
  reminderRows: ReminderTimingPerformanceRow[]
) {
  const smtpSuccessRate =
    latestSmtp && latestSmtp.totalAccounts > 0
      ? Math.round(
          (latestSmtp.healthyAccounts / latestSmtp.totalAccounts) * 1000
        ) / 10
      : null;

  const reminderSent = reminderRows.reduce(
    (total, row) => total + row.sentCount,
    0
  );
  const reminderSuccesses = reminderRows.reduce(
    (total, row) => total + row.successCount,
    0
  );
  const reminderSuccessRate =
    reminderSent > 0
      ? Math.round((reminderSuccesses / reminderSent) * 1000) / 10
      : null;

  return {
    smtp: {
      status:
        smtpSuccessRate !== null && smtpSuccessRate < SMTP_HEALTH_MIN_PERCENT
          ? "alert"
          : "ok",
      value: smtpSuccessRate,
      threshold: SMTP_HEALTH_MIN_PERCENT,
      checkedAt: latestSmtp?.checkedAt ?? null,
      hasData: smtpSuccessRate !== null,
    },
    reminders: {
      status:
        reminderSent >= REMINDER_PERFORMANCE_MIN_SAMPLE &&
        reminderSuccessRate !== null &&
        reminderSuccessRate < REMINDER_PERFORMANCE_MIN_PERCENT
          ? "alert"
          : "ok",
      value: reminderSuccessRate,
      threshold: REMINDER_PERFORMANCE_MIN_PERCENT,
      sampleSize: reminderSent,
      minimumSample: REMINDER_PERFORMANCE_MIN_SAMPLE,
      hasData: reminderSent > 0,
    },
  } as const;
}

export async function getOperationsAlertState(
  reminderRows: ReminderTimingPerformanceRow[]
) {
  const db = await getDb();
  const latestSmtpRows = db
    ? await db
        .select()
        .from(smtpHealthSnapshots)
        .orderBy(desc(smtpHealthSnapshots.checkedAt))
        .limit(1)
    : [];
  const latestSmtp = latestSmtpRows[0] ?? null;
  return evaluateOperationsAlertState(latestSmtp, reminderRows);
}
