import type { Request, Response } from "express";
import { processDueReminders } from "./reminders";
import { sdk } from "./_core/sdk";

export async function reminderHeartbeatHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const summary = await processDueReminders();
    return res.json({ ok: true, taskUid: user.taskUid, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
      context: {
        url: req.originalUrl,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
