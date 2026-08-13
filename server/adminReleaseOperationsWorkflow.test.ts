import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const routerSource = readFileSync(join(root, "server/routers.ts"), "utf8");
const scheduleSource = readFileSync(join(root, "server/releaseHistoryExportSchedule.ts"), "utf8");
const handlerSource = readFileSync(join(root, "server/releaseHistoryExportScheduleRoutes.ts"), "utf8");

describe("administrator release operations workflow", () => {
  it("keeps retention change history, schedules, and acknowledgements behind administrator procedures", () => {
    for (const name of [
      "listAuditRetentionPolicyChanges",
      "getReleaseHistoryExportSchedule",
      "updateReleaseHistoryExportSchedule",
      "listReleaseHistoryExportRuns",
      "acknowledgeRendererFailureAlert",
    ]) {
      expect(routerSource).toMatch(new RegExp(`${name}: adminProcedure`));
    }
  });

  it("uses a cron-only scheduled callback with bounded sanitized snapshots", () => {
    expect(handlerSource).toContain("user.isCron");
    expect(handlerSource).toContain("user.taskUid");
    expect(scheduleSource).toContain('RELEASE_HISTORY_EXPORT_CALLBACK_PATH = "/api/scheduled/release-history-export"');
    expect(scheduleSource).toContain("RELEASE_HISTORY_EXPORT_LIMIT");
    expect(scheduleSource).toContain("notifyOwner");
    expect(scheduleSource).not.toMatch(/setInterval|node-cron/);
  });

  it("does not persist customer content or email HTML in scheduled export run records", () => {
    const runInsert = scheduleSource.slice(scheduleSource.indexOf("db.insert(releaseHistoryExportRuns).values"));
    expect(runInsert).not.toMatch(/recipient|emailHtml|customer|rawConsole|cookie/i);
    expect(routerSource).toContain("acknowledgedLatestOccurredAt");
  });
});
