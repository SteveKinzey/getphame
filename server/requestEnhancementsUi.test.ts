import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const translationCall = (key: string) =>
  new RegExp(`t\\s*\\(\\s*["']${key}["']`);
const testId = (value: string) =>
  new RegExp(`data-testid\\s*=\\s*["']${value}["']`);

describe("request enhancement UI contracts", () => {
  it("keeps the AI tone adjustment visible, accessible, and entitlement-aware in the send composer", () => {
    const source = read("../client/src/pages/SendRequest.tsx");

    expect(source).toMatch(translationCall("mainForm.applyAiTone"));
    expect(source).toMatch(translationCall("mainForm.unlockAiTone"));
    expect(source).toMatch(/aria-label\s*=\s*\{\s*hasPaidAiAccess/);
    expect(source).toMatch(/adjustTone\s*\.\s*isPending/);
    expect(source).toMatch(/aria-live\s*=\s*["']polite["']/);
    expect(source).toMatch(/openUpgradeModal/);
    expect(source).toMatch(/tonePreviewDraft/);
    expect(source).toMatch(testId("ai-tone-preview-dialog"));
    expect(source).toMatch(/handleApplyTonePreview/);
    expect(source).toMatch(testId("ai-tone-preview-apply"));
    expect(source).toMatch(translationCall("mainForm.keepCurrentDraft"));
    expect(source).toMatch(/tonePreviewSourceDraft/);
    expect(source).toMatch(/getToneTextDiff/);
    expect(source).toMatch(testId("ai-tone-preview-comparison"));
    expect(source).toMatch(testId("ai-tone-preview-original"));
    expect(source).toMatch(testId("ai-tone-preview-adjusted"));
    expect(source).toMatch(
      translationCall("mainForm.tonePreviewOriginalDraft")
    );
    expect(source).toMatch(
      translationCall("mainForm.tonePreviewAdjustedDraft")
    );
  });

  it("keeps CSV diagnostics privacy-safe and available at both preview and completion stages", () => {
    const source = read("../client/src/pages/ImportContacts.tsx");

    expect(source).toMatch(/function\s+CsvErrorSummary/);
    expect(source).toMatch(/role\s*=\s*["']status["']/);
    expect(source).toMatch(translationCall("csvDiagnostics.privacyNote"));
    expect(source).toMatch(translationCall("csvDiagnostics.preImportTitle"));
    expect(source).toMatch(translationCall("csvDiagnostics.importResultTitle"));
    expect(source).toMatch(/Only\s+row\s+numbers\s+are\s+shown\s+here/);
    expect(source).toMatch(/serializeContactImportErrorReport/);
    expect(source).toMatch(testId("csv-error-report-download"));
    expect(source).toMatch(translationCall("csvDiagnostics.downloadReport"));
  });

  it("keeps chart export reachable, data-aware, and format-specific", () => {
    const source = read(
      "../client/src/components/dashboard/ActivityTrendCard.tsx"
    );

    expect(source).toMatch(/setRangeMode\(\s*["']custom["']\s*\)/);
    expect(source).toMatch(/resolveActivityTrendCustomRange/);
    expect(source).toMatch(/MAX_ACTIVITY_TREND_CUSTOM_DAYS/);
    expect(source).toMatch(/rangeMode\s*===\s*["']custom["']/);
    expect(source).toMatch(/\?\s*appliedCustomRange/);
    expect(source).toMatch(/setAppliedCustomRange\(\s*customRange\.query\s*\)/);
    expect(source).toMatch(
      /!customRange\.query\s*\|\|\s*!isCustomRangeDirty\s*\|\|\s*trendFetching/
    );
    expect(source).toMatch(/type\s*=\s*["']date["']/);
    expect(source).toMatch(/max\s*=\s*\{\s*today\s*\}/);
    expect(source).toMatch(/exportTrend\(\s*["']csv["']\s*\)/);
    expect(source).toMatch(/exportTrend\(\s*["']png["']\s*\)/);
    expect(source).toMatch(translationCall("activityTrend.exportCsvAria"));
    expect(source).toMatch(translationCall("activityTrend.exportPngAria"));
    expect(source).toMatch(
      /disabled\s*=\s*\{\s*!hasSelectedExportData\s*\|\|\s*trendLoading\s*\|\|\s*trendFetching\s*\}/
    );
    expect(source).toMatch(
      /chart\.toBase64Image\(\s*["']image\/png["']\s*,\s*1\s*\)/
    );
    expect(source).toMatch(/buildActivityTrendExportFilename/);
    expect(source).toMatch(/selectedExportSeries/);
    expect(source).toMatch(/serializeActivityTrendCsv/);
    expect(source).toMatch(translationCall("activityTrend.csvDownloaded"));
    expect(source).toMatch(translationCall("activityTrend.pngDownloaded"));
    expect(source).toMatch(translationCall("activityTrend.activeRange"));
    expect(source).toMatch(translationCall("activityTrend.emptyRange"));
    expect(source).toMatch(/role\s*=\s*["']alert["']/);
  });
});
