import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      const canWrap = "().,=:?{}[]<>".includes(character);
      if (canWrap) pattern += "\\s*";
      pattern += escape(character);
      if (canWrap) pattern += "\\s*";
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;

function getTranslation(catalog: Record<string, unknown>, path: string) {
  return path
    .split(".")
    .reduce<unknown>(
      (value, segment) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      catalog
    );
}

describe("admin authentication uptime summary", () => {
  it("keeps the rolling uptime aggregate behind the admin diagnostics router", () => {
    const routerPath = fileURLToPath(
      new URL("./routers/authDiagnostics.ts", import.meta.url)
    );
    const router = readFileSync(routerPath, "utf8");

    expectSourceContract(router).toContain("adminProcedure");
    expectSourceContract(router).toContain("getAuthHealthUptimeSummary");
    expectSourceContract(router).toContain("uptime");
  });

  it("renders the 24-hour monitoring metrics and an explicit unavailable-data state", () => {
    const pagePath = fileURLToPath(
      new URL("../client/src/pages/AdminAuthDiagnostics.tsx", import.meta.url)
    );
    const page = readFileSync(pagePath, "utf8");

    expectSourceContract(page).toContain("24-hour observation");
    expectSourceContract(page).toContain("Scheduled authentication uptime");
    expectSourceContract(page).toContain("Uptime");
    expectSourceContract(page).toContain("Observed runs");
    expectSourceContract(page).toContain("Incidents");
    expectSourceContract(page).toContain("Avg. latency");
    expectSourceContract(page).toContain("coverage");
    expectSourceContract(page).toContain("component uptime");
    expectSourceContract(page).toContain("Monitoring data unavailable");
    expectSourceContract(page).toContain(
      "No health status is being inferred from missing data."
    );
    expectSourceContract(page).toContain("Monitoring unavailable");
    expectSourceContract(page).toContain('role="alert"');
    expectSourceContract(page).toContain("Run immediate health check");
    expectSourceContract(page).toContain("Checking auth dependencies");
    expectSourceContract(page).toContain(
      "Health check history &amp; failure events"
    );
    expectSourceContract(page).toContain("Sanitized failure detail");
    expectSourceContract(page).toContain("Administrator-triggered");
    expectSourceContract(page).toContain("Filter health history by status");
    expectSourceContract(page).toContain(
      "Filter health history by trigger source"
    );
    expectSourceContract(page).toContain("Rows per page");
    expectSourceContract(page).toContain("Preview filtered CSV");
    expect(page).toMatch(
      /prepareHealthHistoryExport\.mutate\s*\(\s*request\s*\)/s
    );
    expect(page).toMatch(
      /prepareHealthHistoryExport\.mutate\s*\(\s*\{\s*\.\.\.csvPreviewRequest\s*,\s*columns\s*,\s*snapshotGeneratedAt:\s*csvPreview\.generatedAt\s*,?\s*\}\s*\)/s
    );
    expectSourceContract(page).toContain(
      "fromDate: historyFromDate || undefined"
    );
    expectSourceContract(page).toContain("toDate: historyToDate || undefined");
    expectSourceContract(page).toContain("matching records");
    expectSourceContract(page).toContain("Clear history filters");
    expectSourceContract(page).toContain("Filter health history from date");
    expectSourceContract(page).toContain("Filter health history to date");
    expectSourceContract(page).toContain("localDateStartMs");
    expectSourceContract(page).toContain("localDateEndMs");
    expectSourceContract(page).toContain(
      "Choose a date range of 366 days or less."
    );
    expectSourceContract(page).toContain("Quick filter presets");
    expectSourceContract(page).toContain("Relative date ranges");
    expectSourceContract(page).toContain("Last {relativeDays} days");
    expectSourceContract(page).toContain("Duplicate preset");
    expectSourceContract(page).toContain("Active filters");
    expectSourceContract(page).toContain("Remove ${chip.label} filter");
    expectSourceContract(page).toContain("Clear all filters");
    expectSourceContract(page).toContain("Alt + Shift + C");
    expectSourceContract(page).toContain(
      "aria-keyshortcuts={AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT}"
    );
    expectSourceContract(page).toContain(
      "shouldClearAuthHealthHistoryFiltersFromShortcut(event)"
    );
    expectSourceContract(page).toContain("<TooltipTrigger asChild>");
    expectSourceContract(page).toContain("Keyboard shortcut: Alt+Shift+C.");
    expectSourceContract(page).toContain('side="top"');
    expectSourceContract(page).toContain(
      '<details className="w-full sm:w-auto">'
    );
    expectSourceContract(page).toContain(
      "adminAuthDiagnostics.clearFilters.touchHelp"
    );
    expectSourceContract(page).toContain("Shortcut help");
    expectSourceContract(page).toContain('id="health-history"');
    expectSourceContract(page).toContain(
      'window.location.hash === "#health-history"'
    );
    expectSourceContract(page).toContain(
      'new URLSearchParams(window.location.search).get("section") === "health-history"'
    );
    expectSourceContract(page).toContain(
      "Drag the handle, or focus it and press Space then an arrow key"
    );
    expectSourceContract(page).toContain("DndContext");
    expectSourceContract(page).toContain("SortableContext");
    expectSourceContract(page).toContain("Reorder ${preset.name}");
    expectSourceContract(page).toContain("reorderHealthHistoryPresets.mutate");
    expectSourceContract(page).toContain(
      "undoHealthHistoryPresetReorder.mutate"
    );
    expectSourceContract(page).toContain("feedback.previousOrderedIds");
    expectSourceContract(page).toContain(
      "const previousOrderedIds = historyPresets.map"
    );
    expectSourceContract(page).toContain("8_000");
    expectSourceContract(page).toContain("Previous preset order restored.");
    expectSourceContract(page).toContain("Undoing…");
    expectSourceContract(page).toContain('defaultValue: "Undo"');
    expectSourceContract(page).toContain(
      'type PresetReorderUndoTrigger = "button" | "keyboard"'
    );
    expectSourceContract(page).toContain(
      "handleUndoPresetReorder = (trigger: PresetReorderUndoTrigger) =>"
    );
    expectSourceContract(page).toContain('if (trigger === "keyboard")');
    expectSourceContract(page).toContain(
      "adminAuthDiagnostics.presets.undoShortcutSucceeded"
    );
    expectSourceContract(page).toContain(
      "adminAuthDiagnostics.presets.undoShortcutSucceededDescription"
    );
    expectSourceContract(page).toContain('handleUndoPresetReorder("keyboard")');
    expectSourceContract(page).toContain('handleUndoPresetReorder("button")');
    expect(page).toMatch(
      /presetReorderFeedback\?\s*\.\s*presetId\s*===\s*preset\s*\.\s*id/s
    );
    expect(page).toMatch(
      /reorderSucceeded\s*=\s*\{\s*presetReorderFeedback\?\s*\.\s*presetId\s*===\s*preset\s*\.\s*id\s*\}/s
    );
    expectSourceContract(page).toContain("ring-2 ring-emerald-500/30");
    expectSourceContract(page).toContain(
      "motion-safe:transition-[opacity,transform]"
    );
    expectSourceContract(page).toContain(
      'reorderSucceeded ? "scale-100 opacity-100" : "scale-95 opacity-0"'
    );
    expectSourceContract(page).toContain('role="status" aria-live="polite"');
    expectSourceContract(page).toContain(
      "{{name}} saved in position {{position}} of {{total}}."
    );
    expectSourceContract(page).toContain(
      "window.setTimeout(scrollToHistory, delay)"
    );
    expectSourceContract(page).toContain("1_200");
    expectSourceContract(page).toContain("new ResizeObserver(scrollToHistory)");
    expectSourceContract(page).toContain(
      "layoutObserver.observe(document.documentElement)"
    );
    expectSourceContract(page).toContain("5_000");
    expectSourceContract(page).toContain("Save current");
    expectSourceContract(page).toContain("Rename preset");
    expectSourceContract(page).toContain("Delete");
    expectSourceContract(page).toContain("fromMs: historyFromMs");
    expectSourceContract(page).toContain("toMs: historyToMs");
    expectSourceContract(page).toContain("Previous");
    expectSourceContract(page).toContain("Next");
    expectSourceContract(page).toContain("Preview sanitized CSV");
    expectSourceContract(page).toContain(
      "Review the exact filtered, sanitized snapshot before downloading it."
    );
    expectSourceContract(page).toContain("max-h-[calc(100dvh-2rem)]");
    expectSourceContract(page).toContain("Preparing the sanitized preview…");
    expectSourceContract(page).toContain("Preview unavailable");
    expectSourceContract(page).toContain("No rows to preview");
    expectSourceContract(page).toContain("csvPreview.preview.columns.map");
    expectSourceContract(page).toContain("visibleCsvRows.map");
    expectSourceContract(page).toContain("Sanitized CSV data preview");
    expectSourceContract(page).toContain(
      "The preview and download share the same whitelisted columns"
    );
    expectSourceContract(page).toContain(
      "The modal shows the first {{count}} rows"
    );
    expectSourceContract(page).toContain(
      "The export safety cap includes the newest {{exported}}"
    );
    expectSourceContract(page).toContain("onClick={downloadHealthHistoryCsv}");
    expectSourceContract(page).toContain(
      "downloadCsvFile(csvPreview.csv, csvPreview.mimeType, csvPreview.filename)"
    );
    expectSourceContract(page).toContain("selectedCsvColumns");
    expectSourceContract(page).toContain(
      "snapshotGeneratedAt: csvPreview.generatedAt"
    );
    expectSourceContract(page).toContain(
      "columns, snapshotGeneratedAt: csvPreview.generatedAt"
    );
    expectSourceContract(page).toContain("selectedCsvColumns.length === 1");
    expectSourceContract(page).toContain(
      "Choose at least one column. Preview, copy, and download stay in sync."
    );
    expectSourceContract(page).toContain("csvPreview.availableColumns.map");
    expectSourceContract(page).toContain("updatingColumns");
    expectSourceContract(page).toContain("writeTextToClipboard");
    expectSourceContract(page).toContain("navigator.clipboard.writeText(text)");
    expectSourceContract(page).toContain('document.execCommand("copy")');
    expectSourceContract(page).toContain("csvPreview.clipboardText");
    expectSourceContract(page).toContain("Copy to Clipboard");
    expectSourceContract(page).toContain("Copy failed — retry");
    expectSourceContract(page).toContain(
      "disabled={!csvPreview || csvPreview.rowCount === 0 || prepareHealthHistoryExport.isPending || selectedCsvColumns.length === 0}"
    );
    expectSourceContract(page).toContain(
      "getAuthHealthHistoryCsvColumnsStorageKey(userId)"
    );
    expectSourceContract(page).toContain(
      "parseStoredAuthHealthHistoryCsvColumns("
    );
    expectSourceContract(page).toContain(
      "serializeStoredAuthHealthHistoryCsvColumns("
    );
    expectSourceContract(page).toContain("window.localStorage.getItem");
    expectSourceContract(page).toContain("window.localStorage.setItem");
    expectSourceContract(page).toContain(
      'csvColumnPreferenceStatus === "saved"'
    );
    expectSourceContract(page).toContain(
      "Column choices saved for your next export on this device."
    );
    expectSourceContract(page).toContain(
      "Column choices work for this export, but this browser could not remember them."
    );
    expectSourceContract(page).toContain("csvPreview.searchRows");
    expectSourceContract(page).toContain(
      "filterPreparedCsvRows(csvPreview.searchRows, csvPreview.preview.columns, csvRowSearch)"
    );
    expectSourceContract(page).toContain("normalizedCsvRowSearch");
    expectSourceContract(page).toContain("matchingCsvRows");
    expectSourceContract(page).toContain("visibleCsvRows");
    expectSourceContract(page).toContain("Search prepared rows");
    expectSourceContract(page).toContain(
      "Search all {{total}} sanitized rows in this prepared snapshot."
    );
    expectSourceContract(page).toContain(
      "Search filters this preview and the matching-results CSV; copy and the main download still include every prepared row."
    );
    expectSourceContract(page).toContain("downloadMatchingHealthHistoryCsv");
    expectSourceContract(page).toContain(
      "serializePreparedCsvRows<AuthHealthHistoryExportColumnKey>(matchingCsvRows, csvPreview.preview.columns)"
    );
    expectSourceContract(page).toContain(
      "buildAuthHealthHistorySearchResultsCsvFilename(csvPreview.filename)"
    );
    expectSourceContract(page).toContain("Download matches CSV");
    expectSourceContract(page).toContain(
      "Downloaded {{count}} matching sanitized health records."
    );
    expectSourceContract(page).toContain(
      "onClick={downloadMatchingHealthHistoryCsv}"
    );
    expectSourceContract(page).toContain(
      'aria-describedby="csv-row-search-results-summary"'
    );
    expectSourceContract(page).toContain("No prepared rows match this search");
    expectSourceContract(page).toContain(
      "shouldUndoAuthHealthHistoryPresetReorderFromShortcut(event, canUndo)"
    );
    expectSourceContract(page).toContain(
      'window.addEventListener("keydown", handleShortcut)'
    );
    expectSourceContract(page).toContain(
      "aria-keyshortcuts={AUTH_HEALTH_HISTORY_REORDER_UNDO_SHORTCUT}"
    );
    expectSourceContract(page).toContain("Keyboard: Ctrl/Cmd + Z");
  });

  it("localizes every new administrator shortcut, reorder, and CSV preview message", () => {
    const requiredPaths = [
      "adminAuthDiagnostics.clearFilters.button",
      "adminAuthDiagnostics.clearFilters.tooltip",
      "adminAuthDiagnostics.clearFilters.touchHelp",
      "adminAuthDiagnostics.clearFilters.cleared",
      "adminAuthDiagnostics.presets.orderSavedDetail",
      "adminAuthDiagnostics.presets.orderRestored",
      "adminAuthDiagnostics.presets.undo",
      "adminAuthDiagnostics.presets.undoing",
      "adminAuthDiagnostics.presets.undoError",
      "adminAuthDiagnostics.presets.undoSucceeded",
      "adminAuthDiagnostics.presets.undoShortcutSucceeded",
      "adminAuthDiagnostics.presets.undoShortcutSucceededDescription",
      "adminAuthDiagnostics.presets.undoShortcutHint",
      "adminAuthDiagnostics.csvPreview.preparing",
      "adminAuthDiagnostics.csvPreview.openButton",
      "adminAuthDiagnostics.csvPreview.title",
      "adminAuthDiagnostics.csvPreview.description",
      "adminAuthDiagnostics.csvPreview.loading",
      "adminAuthDiagnostics.csvPreview.errorTitle",
      "adminAuthDiagnostics.csvPreview.errorDescription",
      "adminAuthDiagnostics.csvPreview.emptyTitle",
      "adminAuthDiagnostics.csvPreview.emptyDescription",
      "adminAuthDiagnostics.csvPreview.fileLabel",
      "adminAuthDiagnostics.csvPreview.summary",
      "adminAuthDiagnostics.csvPreview.sanitizedNotice",
      "adminAuthDiagnostics.csvPreview.tableLabel",
      "adminAuthDiagnostics.csvPreview.previewLimited",
      "adminAuthDiagnostics.csvPreview.exportLimited",
      "adminAuthDiagnostics.csvPreview.close",
      "adminAuthDiagnostics.csvPreview.download",
      "adminAuthDiagnostics.csvPreview.downloaded",
      "adminAuthDiagnostics.csvPreview.columnsTitle",
      "adminAuthDiagnostics.csvPreview.columnsHelp",
      "adminAuthDiagnostics.csvPreview.columnsSelected",
      "adminAuthDiagnostics.csvPreview.selectAllColumns",
      "adminAuthDiagnostics.csvPreview.updatingColumns",
      "adminAuthDiagnostics.csvPreview.copy",
      "adminAuthDiagnostics.csvPreview.copying",
      "adminAuthDiagnostics.csvPreview.copySucceeded",
      "adminAuthDiagnostics.csvPreview.copyFailed",
      "adminAuthDiagnostics.csvPreview.copied",
      "adminAuthDiagnostics.csvPreview.copyError",
      "adminAuthDiagnostics.csvPreview.columnsRemembered",
      "adminAuthDiagnostics.csvPreview.columnsStorageUnavailable",
      "adminAuthDiagnostics.csvPreview.searchTitle",
      "adminAuthDiagnostics.csvPreview.searchPlaceholder",
      "adminAuthDiagnostics.csvPreview.clearSearch",
      "adminAuthDiagnostics.csvPreview.searchResults",
      "adminAuthDiagnostics.csvPreview.searchScope",
      "adminAuthDiagnostics.csvPreview.searchExportNotice",
      "adminAuthDiagnostics.csvPreview.downloadSearchResults",
      "adminAuthDiagnostics.csvPreview.searchResultsDownloaded",
      "adminAuthDiagnostics.csvPreview.noSearchResults",
      "adminAuthDiagnostics.csvPreview.noSearchResultsHelp",
      "adminAuthDiagnostics.csvPreview.searchLimited",
    ];

    for (const locale of SUPPORTED_LOCALES) {
      const catalogPath = fileURLToPath(
        new URL(
          `../client/public/locales/${locale}/translation.json`,
          import.meta.url
        )
      );
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Record<
        string,
        unknown
      >;
      for (const path of requiredPaths) {
        const value = getTranslation(catalog, path);
        expect(value, `${locale}:${path}`).toBeTypeOf("string");
        expect((value as string).trim(), `${locale}:${path}`).not.toBe("");
      }
    }
  });
});
