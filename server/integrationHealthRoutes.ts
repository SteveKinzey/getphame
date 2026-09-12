import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { dispatchIntegrationHealthAlerts } from "./integrationHealthAlerts";
import { getIntegrationHealthSnapshot } from "./integrationHealth";
import { recordIntegrationHealthSample } from "./integrationHealthPersistence";
import {
  claimIntegrationHealthSchedulerRun,
  getIntegrationHealthSchedulerByTaskUid,
  recordIntegrationHealthSchedulerRun,
} from "./integrationHealthSchedule";

const RETRY_DEDUP_WINDOW_MS = 4 * 60 * 1000;

/**
 * Project-owned scheduled probe. It is cron-authenticated, deduplicated, and
 * returns sanitized aggregate outcomes only; it never returns any destination,
 * credential, raw error, or customer data.
 */
export async function integrationHealthHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid)
      return res.status(403).json({ error: "cron-only" });

    taskUid = user.taskUid;
    const scheduler = await getIntegrationHealthSchedulerByTaskUid(taskUid);
    if (!scheduler) return res.json({ ok: true, skipped: "orphan" });

    const claimed = await claimIntegrationHealthSchedulerRun(
      taskUid,
      RETRY_DEDUP_WINDOW_MS
    );
    if (!claimed) {
      return res.json({
        ok: true,
        skipped: "recent-run-exists",
        checkedAt: scheduler.lastRunAt,
      });
    }

    const snapshot = await getIntegrationHealthSnapshot();
    const [sampleStored, alerts] = await Promise.all([
      recordIntegrationHealthSample(snapshot, snapshot.checkedAt),
      dispatchIntegrationHealthAlerts(snapshot, snapshot.checkedAt),
    ]);
    await recordIntegrationHealthSchedulerRun({ taskUid, status: "ok" });

    return res.json({
      ok: true,
      checkedAt: snapshot.checkedAt,
      overallStatus: snapshot.overallStatus,
      sampleStored,
      alertsDelivered: alerts.delivered,
    });
  } catch (error) {
    if (taskUid) {
      await recordIntegrationHealthSchedulerRun({
        taskUid,
        status: "failed",
        errorCode: "INTEGRATION_HEALTH_RUN_FAILED",
      }).catch(() => undefined);
    }
    console.error(
      "[IntegrationHealth] Scheduled health callback failed:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return res.status(500).json({
      error: "INTEGRATION_HEALTH_RUN_FAILED",
      timestamp: new Date().toISOString(),
    });
  }
}
