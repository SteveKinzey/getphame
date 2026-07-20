import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { processDueKoalendarBookings } from "./koalendar";

export async function koalendarHeartbeatHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const processed = await processDueKoalendarBookings(100);
    return res.json({ ok: true, taskUid: user.taskUid, processed });
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
