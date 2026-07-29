import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("request enhancement UI contracts", () => {
  it("keeps the AI tone adjustment visible, accessible, and entitlement-aware in the send composer", () => {
    const source = read("../client/src/pages/SendRequest.tsx");

    expect(source).toContain('t("mainForm.applyAiTone"');
    expect(source).toContain('t("mainForm.unlockAiTone"');
    expect(source).toContain('aria-label={hasPaidAiAccess');
    expect(source).toContain("adjustTone.isPending");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("openUpgradeModal");
  });

  it("keeps CSV diagnostics privacy-safe and available at both preview and completion stages", () => {
    const source = read("../client/src/pages/ImportContacts.tsx");

    expect(source).toContain("function CsvErrorSummary");
    expect(source).toContain('role="status"');
    expect(source).toContain('t("csvDiagnostics.privacyNote"');
    expect(source).toContain('t("csvDiagnostics.preImportTitle"');
    expect(source).toContain('t("csvDiagnostics.importResultTitle"');
    expect(source).toContain("Only row numbers are shown here");
  });

  it("keeps chart export reachable, data-aware, and format-specific", () => {
    const source = read("../client/src/components/dashboard/ActivityTrendCard.tsx");

    expect(source).toContain('exportTrend("csv")');
    expect(source).toContain('exportTrend("png")');
    expect(source).toContain('t("activityTrend.exportCsvAria"');
    expect(source).toContain('t("activityTrend.exportPngAria"');
    expect(source).toContain("disabled={!hasTrendData || trendLoading}");
    expect(source).toContain('chart.toBase64Image("image/png", 1)');
    expect(source).toContain("serializeActivityTrendCsv");
  });
});
