import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  claimDisposableDomainSchedulerRun,
  getDisposableDomainSchedulerByTaskUid,
  getPacificScheduleDecision,
  recordDisposableDomainSchedulerRun,
  syncDisposableEmailDomains,
} from "./disposableDomains";

export async function disposableDomainHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const scheduler = await getDisposableDomainSchedulerByTaskUid(taskUid);
    if (!scheduler) return res.json({ ok: true, skipped: "orphan" });

    const schedule = getPacificScheduleDecision();
    if (!schedule.shouldRun) {
      return res.json({ ok: true, skipped: "outside-pacific-2am-window", localHour: schedule.localHour });
    }
    const claimed = await claimDisposableDomainSchedulerRun(taskUid);
    if (!claimed) return res.json({ ok: true, skipped: "recent-run-exists" });

    const result = await syncDisposableEmailDomains();
    await recordDisposableDomainSchedulerRun({
      taskUid,
      status: "ok",
      dateKey: schedule.dateKey,
      summary: result,
    });
    return res.json({ ok: true, dateKey: schedule.dateKey, ...result });
  } catch (error) {
    if (taskUid) {
      await recordDisposableDomainSchedulerRun({
        taskUid,
        status: "failed",
        errorCode: "DISPOSABLE_DOMAIN_SYNC_FAILED",
      }).catch(() => undefined);
    }
    console.error("[DisposableDomains] Scheduled callback failed:", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({
      error: "DISPOSABLE_DOMAIN_SYNC_FAILED",
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
