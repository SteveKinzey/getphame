import { describe, expect, it } from "vitest";
import { PWA_UPDATE_TELEMETRY_EVENT_NAMES } from "@shared/pwaUpdateTelemetry";
import {
  getPwaUpdateTelemetryDay,
  summarizePwaUpdateTelemetry,
  type PwaUpdateTelemetryRow,
} from "./pwaUpdateTelemetry";

describe("anonymous PWA update telemetry", () => {
  it("accepts only the explicitly allowlisted update-notice interactions", () => {
    expect(PWA_UPDATE_TELEMETRY_EVENT_NAMES).toEqual([
      "notice_shown",
      "update_requested",
      "update_deferred",
      "update_blocked",
      "update_discard_confirmed",
      "update_applying",
    ]);
  });

  it("returns daily aggregates and interaction rates without raw identities or event records", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const rows: PwaUpdateTelemetryRow[] = [
      { event: "notice_shown", eventDay: "2026-08-01", total: 10 },
      { event: "update_requested", eventDay: "2026-08-01", total: 4 },
      { event: "update_deferred", eventDay: "2026-08-01", total: 3 },
      { event: "update_blocked", eventDay: "2026-08-01", total: 1 },
      { event: "update_applying", eventDay: "2026-08-01", total: 3 },
      { event: "notice_shown", eventDay: "2026-06-01", total: 9 },
      { event: "unknown", eventDay: "2026-08-01", total: 99 },
      { event: "notice_shown", eventDay: "2026-08-01", total: -1 },
    ];

    const summary = summarizePwaUpdateTelemetry(rows, now);

    expect(getPwaUpdateTelemetryDay(now)).toBe("2026-08-01");
    expect(summary.allTime.notice_shown).toBe(19);
    expect(summary.last30Days.notice_shown).toBe(10);
    expect(summary.rates).toEqual({
      requestRate: 21.1,
      deferralRate: 15.8,
      applyingRate: 75,
      blockedRate: 25,
    });
    expect(summary).not.toHaveProperty("rows");
    expect(summary).not.toHaveProperty("userId");
    expect(summary).not.toHaveProperty("visitor");
    expect(summary).not.toHaveProperty("device");
    expect(summary).not.toHaveProperty("version");
  });
});
