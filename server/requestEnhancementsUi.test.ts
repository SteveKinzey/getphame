import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("request enhancement UI contracts", () => {
  it("keeps the AI tone adjustment visible, accessible, and entitlement-aware in the send composer", () => {
    const source = read("../client/src/pages/SendRequest.tsx");

    expect(source).toContain('t("mainForm.applyAiTone"');
    expect(source).toContain('t("mainForm.unlockAiTone"');
    expect(source).toContain("aria-label={hasPaidAiAccess");
    expect(source).toContain("adjustTone.isPending");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("openUpgradeModal");
    expect(source).toContain("tonePreviewDraft");
    expect(source).toContain('data-testid="ai-tone-preview-dialog"');
    expect(source).toContain("handleApplyTonePreview");
    expect(source).toContain('data-testid="ai-tone-preview-apply"');
    expect(source).toContain('t("mainForm.keepCurrentDraft"');
    expect(source).toContain("tonePreviewSourceDraft");
    expect(source).toContain("getToneTextDiff");
    expect(source).toContain('data-testid="ai-tone-preview-comparison"');
    expect(source).toContain('data-testid="ai-tone-preview-original"');
    expect(source).toContain('data-testid="ai-tone-preview-adjusted"');
    expect(source).toContain('t("mainForm.tonePreviewOriginalDraft"');
    expect(source).toContain('t("mainForm.tonePreviewAdjustedDraft"');
  });

  it("keeps CSV diagnostics privacy-safe and available at both preview and completion stages", () => {
    const source = read("../client/src/pages/ImportContacts.tsx");

    expect(source).toContain("function CsvErrorSummary");
    expect(source).toContain('role="status"');
    expect(source).toContain('t("csvDiagnostics.privacyNote"');
    expect(source).toContain('t("csvDiagnostics.preImportTitle"');
    expect(source).toContain('t("csvDiagnostics.importResultTitle"');
    expect(source).toContain("Only row numbers are shown here");
    expect(source).toContain("serializeContactImportErrorReport");
    expect(source).toContain('data-testid="csv-error-report-download"');
    expect(source).toContain('t("csvDiagnostics.downloadReport"');
  });

  it("keeps chart export reachable, data-aware, and format-specific", () => {
    const source = read(
      "../client/src/components/dashboard/ActivityTrendCard.tsx"
    );

    expect(source).toContain('setRangeMode("custom")');
    expect(source).toContain("resolveActivityTrendCustomRange");
    expect(source).toContain("MAX_ACTIVITY_TREND_CUSTOM_DAYS");
    expect(source).toContain('rangeMode === "custom"');
    expect(source).toContain("? appliedCustomRange");
    expect(source).toContain("setAppliedCustomRange(customRange.query)");
    expect(source).toContain(
      "!customRange.query || !isCustomRangeDirty || trendFetching"
    );
    expect(source).toContain('type="date"');
    expect(source).toContain("max={today}");
    expect(source).toContain('exportTrend("csv")');
    expect(source).toContain('exportTrend("png")');
    expect(source).toContain('t("activityTrend.exportCsvAria"');
    expect(source).toContain('t("activityTrend.exportPngAria"');
    expect(source).toContain(
      "disabled={!hasSelectedExportData || trendLoading || trendFetching}"
    );
    expect(source).toContain('chart.toBase64Image("image/png", 1)');
    expect(source).toContain("buildActivityTrendExportFilename(");
    expect(source).toContain("selectedExportSeries");
    expect(source).toContain("serializeActivityTrendCsv");
    expect(source).toContain('t("activityTrend.csvDownloaded"');
    expect(source).toContain('t("activityTrend.pngDownloaded"');
    expect(source).toContain('t("activityTrend.activeRange"');
    expect(source).toContain('t("activityTrend.emptyRange"');
    expect(source).toContain('role="alert"');
  });
});
