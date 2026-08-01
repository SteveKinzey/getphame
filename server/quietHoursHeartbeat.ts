import type { Request, Response } from "express";
import { processDueQuietHoursQueuedSends } from "./quietHours";
import { sdk } from "./_core/sdk";

/** Process durable review-email deliveries once their business-local quiet period has ended. */
export async function quietHoursHeartbeatHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const summary = await processDueQuietHoursQueuedSends();
    return res.json({ ok: true, taskUid: user.taskUid, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
