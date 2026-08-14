import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runReleaseHistoryExportSchedule } from "./releaseHistoryExportSchedule";

export async function releaseHistoryExportScheduleHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    taskUid = user.taskUid;
    const result = await runReleaseHistoryExportSchedule(taskUid);
    return res.json(result);
  } catch (error) {
    console.error("[ReleaseHistoryExport] Scheduled callback failed:", error instanceof Error ? error.name : "unknown");
    return res.status(500).json({ error: "RELEASE_HISTORY_EXPORT_FAILED", taskUid, timestamp: new Date().toISOString() });
  }
}
