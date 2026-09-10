import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { processMonthlyDiagnosticsExport } from "./monthlyDiagnosticsSchedule";

export type MonthlyDiagnosticsRouteDeps = {
  authenticate: typeof sdk.authenticateRequest;
  process: typeof processMonthlyDiagnosticsExport;
};

const defaultDeps: MonthlyDiagnosticsRouteDeps = {
  authenticate: request => sdk.authenticateRequest(request),
  process: processMonthlyDiagnosticsExport,
};

export function createMonthlyDiagnosticsScheduleHandler(
  deps: MonthlyDiagnosticsRouteDeps = defaultDeps
) {
  return async function monthlyDiagnosticsScheduleHandler(
    req: Request,
    res: Response
  ) {
    try {
      const user = await deps.authenticate(req);
      if (!user.isCron || !user.taskUid) {
        return res.status(403).json({ error: "cron-only" });
      }
      const result = await deps.process(user.taskUid);
      return res.json(result);
    } catch (error) {
      console.error("[MonthlyDiagnostics] Scheduled callback failed.", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return res.status(500).json({
        error: "MONTHLY_DIAGNOSTICS_EXPORT_FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export const monthlyDiagnosticsScheduleHandler =
  createMonthlyDiagnosticsScheduleHandler();
