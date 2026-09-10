import type { Request, Response } from "express";
import type { SourceConnection } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import {
  SOURCE_HEALTH_BATCH_SIZE,
  claimSourceHealthSchedulerRun,
  getDueSourceConnections,
  getSourceEventWindow,
  getSourceHealthSchedulerByTaskUid,
  listPendingSourceHealthAlerts,
  markSourceHealthAlertDelivered,
  persistSourceHealthEvaluation,
  pruneExpiredSourceHealthHistory,
  recordSourceHealthSchedulerRun,
  type SourceHealthStatus,
} from "./sourceConnections";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const RETRY_DEDUP_WINDOW_MS = 5 * MINUTE_MS;
const FAILURE_ALERT_THRESHOLD = 2;

export type SourceEventWindow = {
  attempts: number;
  failures: number;
  lastEventAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastErrorCode: string | null;
};

export function evaluateSourceHealthState(
  connection: SourceConnection,
  window: SourceEventWindow,
  checkedAt = Date.now()
) {
  const expectedMs =
    Math.max(15, connection.expectedIntervalMinutes) * MINUTE_MS;
  const graceMs = Math.max(15 * MINUTE_MS, Math.round(expectedMs * 0.5));
  let status: SourceHealthStatus;
  let reasonCode: string;

  if (!window.lastEventAt) {
    const setupWindowMs = Math.max(30 * MINUTE_MS, expectedMs + graceMs);
    if (checkedAt - connection.createdAt <= setupWindowMs) {
      status = "setup";
      reasonCode = "awaiting_first_import";
    } else {
      status = "delayed";
      reasonCode = "no_imports_observed";
    }
  } else if (checkedAt - window.lastEventAt > expectedMs + graceMs) {
    status = "delayed";
    reasonCode = "expected_import_overdue";
  } else if (
    window.failures > 0 &&
    window.lastFailureAt !== null &&
    (window.lastSuccessAt === null ||
      window.lastFailureAt > window.lastSuccessAt)
  ) {
    status = "failing";
    reasonCode = window.lastErrorCode
      ? `error_${window.lastErrorCode.toLowerCase()}`
      : "recent_import_error";
  } else {
    status = "healthy";
    reasonCode =
      window.failures > 0 ? "recovered_after_error" : "imports_flowing";
  }

  const unhealthy = status === "delayed" || status === "failing";
  const consecutiveFailures = unhealthy
    ? connection.consecutiveFailures + 1
    : 0;
  const shouldOpenIncident =
    unhealthy && consecutiveFailures >= FAILURE_ALERT_THRESHOLD;
  const openedFailureIncident =
    !connection.failureAlertOpen && shouldOpenIncident;
  const recoveredIncident = connection.failureAlertOpen && status === "healthy";
  const failureAlertOpen = recoveredIncident
    ? false
    : connection.failureAlertOpen || shouldOpenIncident;

  return {
    status,
    reasonCode: reasonCode.slice(0, 48),
    consecutiveFailures,
    failureAlertOpen,
    openedFailureIncident,
    recoveredIncident,
    nextEvaluationAt: checkedAt + 15 * MINUTE_MS,
  };
}

function alertReviewPath(source: SourceConnection) {
  return `/settings?section=developer&source=${encodeURIComponent(source.publicId)}`;
}

async function deliverSourceHealthAlert(
  source: SourceConnection,
  transition: "failure" | "recovery"
) {
  const detectedAt = new Date(
    source.lastEvaluatedAt ?? Date.now()
  ).toISOString();
  const delivered = await notifyOwner({
    title:
      transition === "failure"
        ? "Get Phame source connection needs attention"
        : "Get Phame source connection recovered",
    content:
      transition === "failure"
        ? [
            `Source: ${source.label}`,
            `Provider: ${source.provider}`,
            `Status: ${source.status}`,
            `Detected: ${detectedAt}`,
            `Reason: ${source.lastErrorCode ?? "expected import overdue"}`,
            `Review: ${alertReviewPath(source)}`,
          ].join("\n")
        : [
            `Source: ${source.label}`,
            `Provider: ${source.provider}`,
            `Recovered: ${detectedAt}`,
            "Imports are flowing again.",
            `Review: ${alertReviewPath(source)}`,
          ].join("\n"),
  });
  if (!delivered) throw new Error("SOURCE_HEALTH_ALERT_DELIVERY_FAILED");
  await markSourceHealthAlertDelivered(source.id, transition);
}

export async function deliverPendingSourceHealthAlerts() {
  const pending = await listPendingSourceHealthAlerts();
  for (const source of pending) {
    await deliverSourceHealthAlert(
      source,
      source.failureAlertOpen ? "failure" : "recovery"
    );
  }
  return pending.length;
}

export async function evaluateSourceConnection(
  connection: SourceConnection,
  checkedAt = Date.now()
) {
  const expectedMs =
    Math.max(15, connection.expectedIntervalMinutes) * MINUTE_MS;
  const lookbackMs = Math.min(7 * DAY_MS, Math.max(DAY_MS, expectedMs * 2));
  const window = await getSourceEventWindow(
    connection.id,
    checkedAt - lookbackMs
  );
  const evaluation = evaluateSourceHealthState(connection, window, checkedAt);
  await persistSourceHealthEvaluation({
    connection,
    status: evaluation.status,
    reasonCode: evaluation.reasonCode,
    attemptsInWindow: window.attempts,
    failuresInWindow: window.failures,
    lastEventAt: window.lastEventAt,
    lastSuccessAt: window.lastSuccessAt,
    lastFailureAt: window.lastFailureAt,
    lastErrorCode: window.lastErrorCode,
    failureAlertOpen: evaluation.failureAlertOpen,
    openedFailureIncident: evaluation.openedFailureIncident,
    consecutiveFailures: evaluation.consecutiveFailures,
    checkedAt,
    nextEvaluationAt: evaluation.nextEvaluationAt,
  });
  return { ...evaluation, ...window };
}

export async function runSourceHealthEvaluationBatch(now = Date.now()) {
  await deliverPendingSourceHealthAlerts();
  const due = await getDueSourceConnections(now, SOURCE_HEALTH_BATCH_SIZE);
  const counts = { checked: 0, healthy: 0, setup: 0, delayed: 0, failing: 0 };
  for (const connection of due) {
    const result = await evaluateSourceConnection(connection, now);
    counts.checked += 1;
    counts[result.status] += 1;
  }
  const alertsDelivered = await deliverPendingSourceHealthAlerts();
  await pruneExpiredSourceHealthHistory(now);
  return {
    ...counts,
    alertsDelivered,
    hasMore: due.length === SOURCE_HEALTH_BATCH_SIZE,
  };
}

export async function sourceHealthHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid)
      return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const scheduler = await getSourceHealthSchedulerByTaskUid(taskUid);
    if (!scheduler) return res.json({ ok: true, skipped: "orphan" });
    const claimed = await claimSourceHealthSchedulerRun(
      taskUid,
      RETRY_DEDUP_WINDOW_MS
    );
    if (!claimed)
      return res.json({
        ok: true,
        skipped: "recent-run-exists",
        checkedAt: scheduler.lastRunAt,
      });

    const result = await runSourceHealthEvaluationBatch();
    await recordSourceHealthSchedulerRun({ taskUid, status: "ok" });
    return res.json({ ok: true, ...result });
  } catch (error) {
    if (taskUid) {
      await recordSourceHealthSchedulerRun({
        taskUid,
        status: "failed",
        errorCode: "SOURCE_HEALTH_RUN_FAILED",
      }).catch(() => undefined);
    }
    console.error(
      "[SourceHealth] Scheduled callback failed:",
      error instanceof Error ? error.name : "unknown"
    );
    return res.status(500).json({
      error: "SOURCE_HEALTH_RUN_FAILED",
      timestamp: new Date().toISOString(),
    });
  }
}
