import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getRecentAuthHealthCheckByTaskUid } from "./db";
import { redactAuthDiagnosticDetail, runAuthHealthCheck } from "./authOperations";

const RETRY_DEDUP_WINDOW_MS = 5 * 60 * 1000;

export async function authHealthHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;

    const duplicate = await getRecentAuthHealthCheckByTaskUid(
      taskUid,
      Date.now() - RETRY_DEDUP_WINDOW_MS,
    );
    if (duplicate) {
      return res.json({
        ok: true,
        skipped: "recent-check-exists",
        status: duplicate.overallStatus,
        checkedAt: duplicate.checkedAt,
      });
    }

    const result = await runAuthHealthCheck({
      triggerSource: "scheduled",
      scheduleCronTaskUid: taskUid,
    });
    return res.json({
      ok: result.overallStatus === "ok",
      status: result.overallStatus,
      checkedAt: result.checkedAt,
      durationMs: result.durationMs,
      failureCode: result.failureCode,
    });
  } catch (error) {
    const detail = redactAuthDiagnosticDetail(error);
    console.error("[AuthHealth] Scheduled callback failed:", detail);
    return res.status(500).json({
      error: detail,
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
