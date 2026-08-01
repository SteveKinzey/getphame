import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_TREND_PRESET_RANGES,
  ACTIVITY_TREND_PRESET_SERIES,
  buildDuplicateActivityTrendPresetName,
  MAX_ACTIVITY_TREND_EXPORT_PRESETS,
  normalizeActivityTrendPresetName,
  normalizeActivityTrendPresetSeries,
  validateActivityTrendPresetRange,
  validateCompleteActivityTrendPresetOrder,
} from "./activityTrendExportPresets";

describe("Activity Trend export preset persistence", () => {
  it("normalizes owner-scoped names and keeps canonical ranges and series", () => {
    expect(normalizeActivityTrendPresetName("  Monthly   Performance  ")).toBe(
      "monthly performance"
    );
    expect(ACTIVITY_TREND_PRESET_RANGES).toEqual(["30", "60", "90", "custom"]);
    expect(ACTIVITY_TREND_PRESET_SERIES).toEqual(["sends", "opens", "clicks"]);
    expect(MAX_ACTIVITY_TREND_EXPORT_PRESETS).toBe(20);
  });

  it("canonicalizes non-empty unique series and rejects duplicates", () => {
    expect(normalizeActivityTrendPresetSeries(["clicks", "sends"])).toEqual([
      "sends",
      "clicks",
    ]);
    expect(() => normalizeActivityTrendPresetSeries([])).toThrow("one or more");
    expect(() =>
      normalizeActivityTrendPresetSeries(["sends", "sends"])
    ).toThrow("unique");
  });

  it("validates bounded custom dates and clears dates for fixed presets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00.000Z"));
    expect(
      validateActivityTrendPresetRange({
        rangeKey: "custom",
        customStartDate: "2026-07-01",
        customEndDate: "2026-07-31",
      })
    ).toEqual({ customStartDate: "2026-07-01", customEndDate: "2026-07-31" });
    expect(
      validateActivityTrendPresetRange({
        rangeKey: "30",
        customStartDate: "2026-07-01",
        customEndDate: "2026-07-31",
      })
    ).toEqual({ customStartDate: null, customEndDate: null });
    expect(() =>
      validateActivityTrendPresetRange({
        rangeKey: "custom",
        customStartDate: "2026-07-31",
        customEndDate: "2026-07-01",
      })
    ).toThrow("must not be before");
    expect(() =>
      validateActivityTrendPresetRange({
        rangeKey: "custom",
        customStartDate: "2026-08-01",
        customEndDate: "2026-08-01",
      })
    ).toThrow("cannot be in the future");
    vi.useRealTimers();
  });

  it("generates deterministic bounded copy names", () => {
    expect(buildDuplicateActivityTrendPresetName("Monthly", ["Monthly"])).toBe(
      "Monthly copy"
    );
    expect(
      buildDuplicateActivityTrendPresetName("Monthly", [
        "Monthly",
        "Monthly copy",
        "Monthly copy 2",
      ])
    ).toBe("Monthly copy 3");
    expect(
      buildDuplicateActivityTrendPresetName("X".repeat(80), [])
    ).toHaveLength(80);
  });

  it("accepts only a complete duplicate-free owner preset permutation", () => {
    expect(
      validateCompleteActivityTrendPresetOrder([3, 1, 2], [1, 2, 3])
    ).toEqual([3, 1, 2]);
    expect(() =>
      validateCompleteActivityTrendPresetOrder([1, 1, 2], [1, 2, 3])
    ).toThrow("duplicate_ids");
    expect(() =>
      validateCompleteActivityTrendPresetOrder([1, 2], [1, 2, 3])
    ).toThrow("membership_mismatch");
  });

  it("keeps every read and mutation owner-scoped and migrates additively", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "server/activityTrendExportPresets.ts"),
      "utf8"
    );
    const migration = fs.readFileSync(
      path.join(process.cwd(), "drizzle/0036_productive_spot.sql"),
      "utf8"
    );
    expect(
      source.match(
        /eq\(activityTrendExportPresets\.ownerUserId, ownerUserId\)/g
      )?.length ?? 0
    ).toBeGreaterThanOrEqual(9);
    expect(source).toContain("sameName.id !== input.id");
    expect(source).toContain("db.transaction");
    expect(source).toContain("sortOrder: index");
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS `activity_trend_export_presets`"
    );
    expect(migration).toContain("WHEN ''days30'' THEN ''30''");
    expect(migration).toContain("CHANGE COLUMN `include_sent` `include_sends`");
    expect(migration).toContain("activity_trend_presets_owner_name_unique");
    expect(migration).toContain("activity_trend_presets_owner_sort_idx");
    expect(migration).not.toContain("DROP TABLE");
  });
});
