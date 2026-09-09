import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { runRelayHeartbeatCheck } from "./relayHealth";

export async function relayHeartbeatHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;

    const result = await runRelayHeartbeatCheck({ source: "scheduled_heartbeat" });
    return res.json({
      ok: result.status === "healthy",
      taskUid,
      ...result,
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : "UnknownError";
    console.error("[RelayHeartbeat] Scheduled callback failed", { errorType, taskUid: taskUid ?? null });
    return res.status(500).json({
      error: "Relay heartbeat check failed",
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
