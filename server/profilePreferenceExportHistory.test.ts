import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "./db";
import { listProfilePreferenceExportHistory } from "./profilePreferenceExportHistory";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("profile preference export history", () => {
  beforeEach(() => {
    vi.mocked(getDb).mockReset();
  });

  it("stores only tenant ID, format, and timestamp with a tenant-time index", () => {
    const schema = read("drizzle/schema.ts");
    const migration = read("drizzle/manual-pending/20260826_add_profile_preference_export_history.sql");
    const tableDefinition = schema.match(
      /export const profilePreferenceExportHistory = pgTable\([\s\S]*?\n\);\nexport type ProfilePreferenceExportHistory/
    )?.[0];

    expect(tableDefinition).toBeTruthy();
    const fields = [...(tableDefinition ?? "").matchAll(/^    (\w+):/gm)].map(match => match[1]);
    expect(fields).toEqual(["id", "userId", "format", "exportedAt"]);
    expect(tableDefinition).not.toMatch(/payload|content|body|data/i);
    expect(schema).toContain('"profile_preference_export_history"');
    expect(schema).toContain('format: varchar("format", { length: 8 }).notNull()');
    expect(schema).toContain('exportedAt: bigint("exported_at", { mode: "number" }).notNull()');
    expect(schema).toContain('profile_preference_export_history_user_time_idx');
    expect(schema).toContain("table.userId, table.exportedAt");
    expect(schema).toContain('references(() => users.id, { onDelete: "cascade" })');
    expect(migration).toContain("FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE");
  });

  it("records and lists history strictly through authenticated tenant ownership with a bounded newest-first list", () => {
    const helper = read("server/profilePreferenceExportHistory.ts");
    const router = read("server/routers.ts");
    expect(helper).toContain("MAX_PROFILE_PREFERENCE_EXPORT_HISTORY_ROWS = 20");
    expect(helper).toContain("const conditions = [eq(profilePreferenceExportHistory.userId, userId)]");
    expect(helper).toContain("gte(profilePreferenceExportHistory.exportedAt");
    expect(helper).toContain("lte(profilePreferenceExportHistory.exportedAt");
    expect(helper).toContain("orderBy(desc(profilePreferenceExportHistory.exportedAt))");
    expect(helper).toContain(".limit(MAX_PROFILE_PREFERENCE_EXPORT_HISTORY_ROWS)");
    expect(router).toContain("listProfilePreferenceExportHistory(ctx.user.id, input)");
    expect(router).toContain("isValidUtcCalendarDate");
    expect(router).toContain("profilePreferenceExportHistoryInputSchema");
    expect(router).toContain("recordProfilePreferenceExport({ userId: ctx.user.id, format: input.format })");
    expect(router).toContain('z.enum(["json", "csv"])');
  });

  it("surfaces unavailable history storage as an explicit failure instead of an empty list", async () => {
    vi.mocked(getDb).mockResolvedValue(undefined as never);

    await expect(listProfilePreferenceExportHistory(1)).rejects.toThrow("Database not available");
  });

  it("keeps Settings data management discoverable and avoids sensitive export fields", () => {
    const settings = read("client/src/pages/Settings.tsx");
    expect(settings).toContain('data-testid="settings-theme-reset-system"');
    expect(settings).toContain('serializeProfilePreferencesCsv(payload)');
    expect(settings).toContain('recordExport.mutate({ format })');
    expect(settings).toContain('data-testid="settings-profile-data-export-history"');
    expect(settings).toContain('data-testid="settings-profile-data-export-date-filter"');
    expect(settings).toContain("serializeProfilePreferencesExportReceipt");
    expect(settings).toContain("settings.dataExport.receiptAction");
    expect(settings).toContain('t("settings.dataExport.historyError"');
    expect(settings).toContain("historyHasError");
    expect(settings).not.toContain("encryptedPass");
  });
});
