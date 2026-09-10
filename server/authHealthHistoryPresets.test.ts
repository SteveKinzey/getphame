import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  MAX_AUTH_HEALTH_HISTORY_PRESETS,
  buildDuplicateAuthHealthHistoryPresetName,
  normalizeAuthHealthHistoryPresetName,
  validateCompleteAuthHealthHistoryPresetOrder,
} from "./authHealthHistoryPresets";

describe("auth health history preset persistence", () => {
  it("normalizes names for owner-scoped upsert semantics", () => {
    expect(normalizeAuthHealthHistoryPresetName("  Manual   Failures  ")).toBe(
      "manual failures"
    );
    expect(MAX_AUTH_HEALTH_HISTORY_PRESETS).toBe(20);
  });

  it("generates deterministic copy names without colliding with the owner's presets", () => {
    expect(
      buildDuplicateAuthHealthHistoryPresetName("Manual failures", [
        "Manual failures",
      ])
    ).toBe("Manual failures copy");
    expect(
      buildDuplicateAuthHealthHistoryPresetName("Manual failures", [
        "Manual failures",
        "Manual failures copy",
        "Manual failures copy 2",
      ])
    ).toBe("Manual failures copy 3");
    expect(
      buildDuplicateAuthHealthHistoryPresetName("X".repeat(80), [])
    ).toHaveLength(80);
  });

  it("keeps every preset read, update, and delete operation owner-scoped", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "server/authHealthHistoryPresets.ts"),
      "utf8"
    );
    expect(source).toContain(
      "eq(authHealthHistoryPresets.ownerUserId, ownerUserId)"
    );
    expect(
      source.match(/eq\(authHealthHistoryPresets\.ownerUserId, ownerUserId\)/g)
        ?.length ?? 0
    ).toBeGreaterThanOrEqual(7);
    expect(source).toContain("sameName.id !== input.id");
    expect(source).toContain('outcome: "name_conflict"');
    expect(source).toContain('outcome: "limit_reached"');
    expect(source).toContain("duplicateAuthHealthHistoryPreset");
    expect(source).toContain(
      "existing.length >= MAX_AUTH_HEALTH_HISTORY_PRESETS"
    );
    expect(source).toContain("reorderAuthHealthHistoryPresets");
    expect(source).toContain("db.transaction");
    expect(source).toContain("sortOrder: index");
  });

  it("accepts only a complete duplicate-free permutation of the owner's preset IDs", () => {
    expect(
      validateCompleteAuthHealthHistoryPresetOrder([3, 1, 2], [1, 2, 3])
    ).toEqual([3, 1, 2]);
    expect(() =>
      validateCompleteAuthHealthHistoryPresetOrder([1, 1, 2], [1, 2, 3])
    ).toThrow("duplicate IDs");
    expect(() =>
      validateCompleteAuthHealthHistoryPresetOrder([1, 2], [1, 2, 3])
    ).toThrow("every saved preset");
    expect(() =>
      validateCompleteAuthHealthHistoryPresetOrder([1, 2, 4], [1, 2, 3])
    ).toThrow("current owner's preset IDs");
  });

  it("defines an additive owner/name unique migration without storing health rows or failure details", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "drizzle/0018_flimsy_vertigo.sql"),
      "utf8"
    );
    expect(migration).toContain("CREATE TABLE `auth_health_history_presets`");
    expect(migration).toContain(
      "auth_health_history_presets_owner_name_unique"
    );
    expect(migration).toContain(
      "auth_health_history_presets_owner_updated_idx"
    );
    expect(migration).not.toContain("failure_detail");
    expect(migration).not.toContain("schedule_cron_task_uid");
  });

  it("adds preset ordering without recreating or dropping the existing table", () => {
    const migration = fs.readFileSync(
      path.join(process.cwd(), "drizzle/0019_overconfident_meteorite.sql"),
      "utf8"
    );
    expect(migration).toContain(
      "ALTER TABLE `auth_health_history_presets` ADD `sort_order`"
    );
    expect(migration).toContain("auth_health_history_presets_owner_sort_idx");
    expect(migration).not.toContain("CREATE TABLE");
    expect(migration).not.toContain("DROP TABLE");
  });
});
