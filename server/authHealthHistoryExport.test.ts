import { describe, expect, it } from "vitest";
import { buildAuthHealthHistoryCsvFilename, serializeAuthHealthHistoryCsv } from "./authHealthHistoryExport";

describe("auth health history CSV", () => {
  it("whitelists sanitized columns, blocks formula injection, and excludes scheduler identifiers", () => {
    const csv = serializeAuthHealthHistoryCsv([{
      id: 9,
      triggerSource: "scheduled",
      scheduleCronTaskUid: "cron-secret-reference",
      overallStatus: "fail",
      configStatus: "ok",
      databaseStatus: "ok",
      userSchemaStatus: "ok",
      magicLinkSchemaStatus: "ok",
      sessionStatus: "ok",
      emailProviderStatus: "fail",
      providerName: "+Provider",
      failureCode: "provider_failed",
      failureDetail: "user@example.com token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
      durationMs: 17,
      checkedAt: Date.UTC(2026, 6, 21, 13, 0, 0),
    }]);

    expect(csv).toContain("record_id,checked_at_utc,trigger_source,overall_status");
    expect(csv).toContain("'+Provider");
    expect(csv).toContain("[redacted-email]");
    expect(csv).toContain("[redacted-token]");
    expect(csv).not.toContain("cron-secret-reference");
    expect(csv).not.toContain("user@example.com");
  });

  it("includes exact active local date labels in filesystem-safe filenames", () => {
    expect(buildAuthHealthHistoryCsvFilename({ fromDate: "2026-07-01", toDate: "2026-07-21" })).toBe("getphame-auth-health-history-2026-07-01-to-2026-07-21.csv");
    expect(buildAuthHealthHistoryCsvFilename({ fromDate: "2026-07-01" })).toBe("getphame-auth-health-history-from-2026-07-01.csv");
    expect(buildAuthHealthHistoryCsvFilename({ toDate: "2026-07-21" })).toBe("getphame-auth-health-history-through-2026-07-21.csv");
    expect(buildAuthHealthHistoryCsvFilename({}, new Date("2026-07-21T23:59:00Z"))).toBe("getphame-auth-health-history-2026-07-21.csv");
    expect(buildAuthHealthHistoryCsvFilename({ fromDate: "../../bad", toDate: "2026-07-21" }, new Date("2026-07-22T00:00:00Z"))).toBe("getphame-auth-health-history-through-2026-07-21.csv");
  });
});
