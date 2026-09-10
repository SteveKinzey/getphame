import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runSmtpHealthChecks } from "./smtp";
import {
  createSmtpHealthSnapshot,
  getRecentSmtpSnapshotForTask,
} from "./systemHealth";

const RETRY_DEDUP_WINDOW_MS = 5 * 60 * 1000;

export async function smtpHealthHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;

    const duplicate = await getRecentSmtpSnapshotForTask(
      taskUid,
      Date.now() - RETRY_DEDUP_WINDOW_MS
    );
    if (duplicate) {
      return res.json({
        ok: duplicate.failedAccounts === 0,
        skipped: "recent-check-exists",
        checkedAt: duplicate.checkedAt,
        totalAccounts: duplicate.totalAccounts,
        healthyAccounts: duplicate.healthyAccounts,
        failedAccounts: duplicate.failedAccounts,
      });
    }

    const summary = await runSmtpHealthChecks();
    await createSmtpHealthSnapshot({
      triggerSource: "scheduled",
      scheduleCronTaskUid: taskUid,
      ...summary,
    });
    return res.json({ ok: summary.failedAccounts === 0, ...summary });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error("[SmtpHealth] Scheduled callback failed", {
      errorType,
      taskUid: taskUid ?? null,
    });
    return res.status(500).json({
      error: "SMTP health check failed",
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
