import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import {
  monthlyDiagnosticExportDeliveries,
  monthlyDiagnosticExportRuns,
  monthlyDiagnosticExportSchedules,
} from "../drizzle/schema";
import { monthlyDiagnosticsScheduleSourceContract } from "./monthlyDiagnosticsSchedule";

describe("monthly diagnostics persistence and scheduler contract", () => {
  it("stores metadata and recipient IDs, never email addresses or report contents", () => {
    const scheduleColumns = Object.keys(monthlyDiagnosticExportSchedules)
      .join(" ")
      .toLowerCase();
    const runColumns = Object.keys(monthlyDiagnosticExportRuns)
      .join(" ")
      .toLowerCase();
    const deliveryColumns = Object.keys(monthlyDiagnosticExportDeliveries)
      .join(" ")
      .toLowerCase();

    expect(deliveryColumns).toContain("recipientuserid");
    expect(monthlyDiagnosticsScheduleSourceContract).toEqual({
      persistsReportContent: false,
      persistsRecipientEmail: false,
      deliveryClaimTransition: "pending -> attempted",
      automaticRetryAfterAttempt: false,
    });
    for (const forbidden of [
      "recipientemail",
      "emailaddress",
      "csv",
      "content",
      "body",
      "rawresponse",
      "rawerror",
    ]) {
      expect(
        `${scheduleColumns} ${runColumns} ${deliveryColumns}`
      ).not.toContain(forbidden);
    }
  });

  it("has unique schedule, monthly run, and per-recipient delivery ledgers", () => {
    const schedule = getTableConfig(monthlyDiagnosticExportSchedules);
    const runs = getTableConfig(monthlyDiagnosticExportRuns);
    const deliveries = getTableConfig(monthlyDiagnosticExportDeliveries);
    expect(schedule.indexes.some(index => index.config.unique)).toBe(true);
    expect(runs.indexes.some(index => index.config.unique)).toBe(true);
    expect(deliveries.indexes.some(index => index.config.unique)).toBe(true);
    expect(runs.columns.some(column => column.name === "snapshot_key")).toBe(
      true
    );
    expect(monthlyDiagnosticExportSchedules.enabled.default).toBe(true);
    expect(monthlyDiagnosticExportSchedules.cronExpression.default).toBe(
      "0 10 8 1 * *"
    );
  });

  it("uses managed Heartbeat only and keeps request-body data out of processing", () => {
    const scheduleSource = readFileSync(
      new URL("./monthlyDiagnosticsSchedule.ts", import.meta.url),
      "utf8"
    );
    const routeSource = readFileSync(
      new URL("./monthlyDiagnosticsScheduleRoutes.ts", import.meta.url),
      "utf8"
    );
    expect(scheduleSource).not.toMatch(/setInterval|node-cron/);
    expect(scheduleSource).toContain("createHeartbeatJob");
    expect(scheduleSource).toContain("listHeartbeatJobs");
    expect(routeSource).toContain("sdk.authenticateRequest");
    expect(routeSource).not.toContain("req.body");
  });
});
