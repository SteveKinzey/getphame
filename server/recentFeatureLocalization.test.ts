import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;
const LOCALES_ROOT = join(PROJECT_ROOT, "client/public/locales");
const FALLBACKS_PATH = join(PROJECT_ROOT, "client/src/lib/i18nCompleteFallbackResources.json");
const SUPPORTED_LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const REQUIRED_KEYS = [
  "csvDiagnostics.downloadReport",
  "csvDiagnostics.reportRowNumber",
  "csvDiagnostics.reportReason",
  "csvDiagnostics.reportUnavailableRow",
  "activityTrend.csvDownloaded",
  "activityTrend.pngDownloaded",
  "mainForm.tonePreviewTitle",
  "mainForm.tonePreviewDescription",
  "mainForm.keepCurrentDraft",
  "mainForm.applyAdjustedTone",
  "mainForm.tonePreviewComparisonTitle",
  "mainForm.tonePreviewOriginalDraft",
  "mainForm.tonePreviewAdjustedDraft",
  "mainForm.tonePreviewDiffLegend",
] as const;

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("recent feature localization", () => {
  const generatedFallbacks = JSON.parse(readFileSync(FALLBACKS_PATH, "utf8")) as Record<string, unknown>;

  for (const locale of SUPPORTED_LOCALES) {
    it(`keeps the preview, report, and export messages localized in ${locale}`, () => {
      const maintainedCatalog = JSON.parse(
        readFileSync(join(LOCALES_ROOT, locale, "translation.json"), "utf8"),
      ) as Record<string, unknown>;

      for (const key of REQUIRED_KEYS) {
        const maintainedValue = getByPath(maintainedCatalog, key);
        const fallbackValue = getByPath(generatedFallbacks[locale], key);

        expect(typeof maintainedValue === "string" && maintainedValue.trim().length > 0, `${locale} catalog ${key}`).toBe(true);
        expect(typeof fallbackValue === "string" && fallbackValue.trim().length > 0, `${locale} fallback ${key}`).toBe(true);
        expect(fallbackValue, `${locale} fallback ${key}`).toBe(maintainedValue);
      }
    });
  }
});
