import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  MAX_AUTH_HEALTH_HISTORY_PRESETS,
  normalizeAuthHealthHistoryPresetName,
} from "./authHealthHistoryPresets";

describe("auth health history preset persistence", () => {
  it("normalizes names for owner-scoped upsert semantics", () => {
    expect(normalizeAuthHealthHistoryPresetName("  Manual   Failures  ")).toBe("manual failures");
    expect(MAX_AUTH_HEALTH_HISTORY_PRESETS).toBe(20);
  });

  it("keeps every preset read, update, and delete operation owner-scoped", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/authHealthHistoryPresets.ts"), "utf8");
    expect(source).toContain("eq(authHealthHistoryPresets.ownerUserId, ownerUserId)");
    expect(source.match(/eq\(authHealthHistoryPresets\.ownerUserId, ownerUserId\)/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(source).toContain("sameName.id !== input.id");
    expect(source).toContain('outcome: "name_conflict"');
    expect(source).toContain('outcome: "limit_reached"');
  });

  it("defines an additive owner/name unique migration without storing health rows or failure details", () => {
    const migration = fs.readFileSync(path.join(process.cwd(), "drizzle/0002_flimsy_vertigo.sql"), "utf8");
    expect(migration).toContain("CREATE TABLE `auth_health_history_presets`");
    expect(migration).toContain("auth_health_history_presets_owner_name_unique");
    expect(migration).toContain("auth_health_history_presets_owner_updated_idx");
    expect(migration).not.toContain("failure_detail");
    expect(migration).not.toContain("schedule_cron_task_uid");
  });
});
