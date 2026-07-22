import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SUPPORTED_LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function getTranslation(catalog: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((value, segment) => (
    value && typeof value === "object" ? (value as Record<string, unknown>)[segment] : undefined
  ), catalog);
}

describe("admin authentication uptime summary", () => {
  it("keeps the rolling uptime aggregate behind the admin diagnostics router", () => {
    const routerPath = fileURLToPath(new URL("./routers/authDiagnostics.ts", import.meta.url));
    const router = readFileSync(routerPath, "utf8");

    expect(router).toContain("adminProcedure");
    expect(router).toContain("getAuthHealthUptimeSummary");
    expect(router).toContain("uptime");
  });

  it("renders the 24-hour monitoring metrics and an explicit unavailable-data state", () => {
    const pagePath = fileURLToPath(
      new URL("../client/src/pages/AdminAuthDiagnostics.tsx", import.meta.url)
    );
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain("24-hour observation");
    expect(page).toContain("Scheduled authentication uptime");
    expect(page).toContain("Uptime");
    expect(page).toContain("Observed runs");
    expect(page).toContain("Incidents");
    expect(page).toContain("Avg. latency");
    expect(page).toContain("coverage");
    expect(page).toContain("component uptime");
    expect(page).toContain("Monitoring data unavailable");
    expect(page).toContain("No health status is being inferred from missing data.");
    expect(page).toContain("Monitoring unavailable");
    expect(page).toContain('role="alert"');
    expect(page).toContain("Run immediate health check");
    expect(page).toContain("Checking auth dependencies");
    expect(page).toContain("Health check history &amp; failure events");
    expect(page).toContain("Sanitized failure detail");
    expect(page).toContain("Administrator-triggered");
    expect(page).toContain("Filter health history by status");
    expect(page).toContain("Filter health history by trigger source");
    expect(page).toContain("Rows per page");
    expect(page).toContain("Preview filtered CSV");
    expect(page).toContain("prepareHealthHistoryExport.mutate(request)");
    expect(page).toContain("prepareHealthHistoryExport.mutate({ ...csvPreviewRequest, columns, snapshotGeneratedAt: csvPreview.generatedAt })");
    expect(page).toContain("fromDate: historyFromDate || undefined");
    expect(page).toContain("toDate: historyToDate || undefined");
    expect(page).toContain("matching records");
    expect(page).toContain("Clear history filters");
    expect(page).toContain("Filter health history from date");
    expect(page).toContain("Filter health history to date");
    expect(page).toContain("localDateStartMs");
    expect(page).toContain("localDateEndMs");
    expect(page).toContain("Choose a date range of 366 days or less.");
    expect(page).toContain("Quick filter presets");
    expect(page).toContain("Relative date ranges");
    expect(page).toContain("Last {relativeDays} days");
    expect(page).toContain("Duplicate preset");
    expect(page).toContain("Active filters");
    expect(page).toContain("Remove ${chip.label} filter");
    expect(page).toContain("Clear all filters");
    expect(page).toContain("Alt + Shift + C");
    expect(page).toContain("aria-keyshortcuts={AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT}");
    expect(page).toContain("shouldClearAuthHealthHistoryFiltersFromShortcut(event)");
    expect(page).toContain("<TooltipTrigger asChild>");
    expect(page).toContain("Keyboard shortcut: Alt+Shift+C.");
    expect(page).toContain('side="top"');
    expect(page).toContain('<details className="w-full sm:w-auto">');
    expect(page).toContain("adminAuthDiagnostics.clearFilters.touchHelp");
    expect(page).toContain("Shortcut help");
    expect(page).toContain('id="health-history"');
    expect(page).toContain('window.location.hash === "#health-history"');
    expect(page).toContain('new URLSearchParams(window.location.search).get("section") === "health-history"');
    expect(page).toContain("Drag the handle, or focus it and press Space then an arrow key");
    expect(page).toContain("DndContext");
    expect(page).toContain("SortableContext");
    expect(page).toContain("Reorder ${preset.name}");
    expect(page).toContain("reorderHealthHistoryPresets.mutate");
    expect(page).toContain("undoHealthHistoryPresetReorder.mutate");
    expect(page).toContain("feedback.previousOrderedIds");
    expect(page).toContain("const previousOrderedIds = historyPresets.map");
    expect(page).toContain("8_000");
    expect(page).toContain("Previous preset order restored.");
    expect(page).toContain("Undoing…");
    expect(page).toContain('defaultValue: "Undo"');
    expect(page).toContain("presetReorderFeedback?.presetId === preset.id");
    expect(page).toContain("reorderSucceeded={presetReorderFeedback?.presetId === preset.id}");
    expect(page).toContain("ring-2 ring-emerald-500/30");
    expect(page).toContain("motion-safe:transition-[opacity,transform]");
    expect(page).toContain('reorderSucceeded ? "scale-100 opacity-100" : "scale-95 opacity-0"');
    expect(page).toContain('role="status" aria-live="polite"');
    expect(page).toContain("{{name}} saved in position {{position}} of {{total}}.");
    expect(page).toContain("window.setTimeout(scrollToHistory, delay)");
    expect(page).toContain("1_200");
    expect(page).toContain("new ResizeObserver(scrollToHistory)");
    expect(page).toContain("layoutObserver.observe(document.documentElement)");
    expect(page).toContain("5_000");
    expect(page).toContain("Save current");
    expect(page).toContain("Rename preset");
    expect(page).toContain("Delete");
    expect(page).toContain("fromMs: historyFromMs");
    expect(page).toContain("toMs: historyToMs");
    expect(page).toContain("Previous");
    expect(page).toContain("Next");
    expect(page).toContain("Preview sanitized CSV");
    expect(page).toContain("Review the exact filtered, sanitized snapshot before downloading it.");
    expect(page).toContain('max-h-[calc(100dvh-2rem)]');
    expect(page).toContain("Preparing the sanitized preview…");
    expect(page).toContain("Preview unavailable");
    expect(page).toContain("No rows to preview");
    expect(page).toContain("csvPreview.preview.columns.map");
    expect(page).toContain("visibleCsvRows.map");
    expect(page).toContain("Sanitized CSV data preview");
    expect(page).toContain("The preview and download share the same whitelisted columns");
    expect(page).toContain("The modal shows the first {{count}} rows");
    expect(page).toContain("The export safety cap includes the newest {{exported}}");
    expect(page).toContain("onClick={downloadHealthHistoryCsv}");
    expect(page).toContain("new Blob([csvPreview.csv], { type: csvPreview.mimeType })");
    expect(page).toContain("selectedCsvColumns");
    expect(page).toContain("snapshotGeneratedAt: csvPreview.generatedAt");
    expect(page).toContain("columns, snapshotGeneratedAt: csvPreview.generatedAt");
    expect(page).toContain("selectedCsvColumns.length === 1");
    expect(page).toContain("Choose at least one column. Preview, copy, and download stay in sync.");
    expect(page).toContain("csvPreview.availableColumns.map");
    expect(page).toContain("updatingColumns");
    expect(page).toContain("writeTextToClipboard");
    expect(page).toContain("navigator.clipboard.writeText(text)");
    expect(page).toContain('document.execCommand("copy")');
    expect(page).toContain("csvPreview.clipboardText");
    expect(page).toContain("Copy to Clipboard");
    expect(page).toContain("Copy failed — retry");
    expect(page).toContain("disabled={!csvPreview || csvPreview.rowCount === 0 || prepareHealthHistoryExport.isPending || selectedCsvColumns.length === 0}");
    expect(page).toContain("getAuthHealthHistoryCsvColumnsStorageKey(userId)");
    expect(page).toContain("parseStoredAuthHealthHistoryCsvColumns(");
    expect(page).toContain("serializeStoredAuthHealthHistoryCsvColumns(");
    expect(page).toContain("window.localStorage.getItem");
    expect(page).toContain("window.localStorage.setItem");
    expect(page).toContain('csvColumnPreferenceStatus === "saved"');
    expect(page).toContain("Column choices saved for your next export on this device.");
    expect(page).toContain("Column choices work for this export, but this browser could not remember them.");
    expect(page).toContain("csvPreview.searchRows");
    expect(page).toContain("normalizedCsvRowSearch");
    expect(page).toContain("matchingCsvRows");
    expect(page).toContain("visibleCsvRows");
    expect(page).toContain("Search prepared rows");
    expect(page).toContain("Search all {{total}} sanitized rows in this prepared snapshot.");
    expect(page).toContain("Search changes this preview only; copy and download still include every prepared row.");
    expect(page).toContain("No prepared rows match this search");
    expect(page).toContain("shouldUndoAuthHealthHistoryPresetReorderFromShortcut(event, canUndo)");
    expect(page).toContain('window.addEventListener("keydown", handleShortcut)');
    expect(page).toContain("aria-keyshortcuts={AUTH_HEALTH_HISTORY_REORDER_UNDO_SHORTCUT}");
    expect(page).toContain("Keyboard: Ctrl/Cmd + Z");
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
      "adminAuthDiagnostics.csvPreview.noSearchResults",
      "adminAuthDiagnostics.csvPreview.noSearchResultsHelp",
      "adminAuthDiagnostics.csvPreview.searchLimited",
    ];

    for (const locale of SUPPORTED_LOCALES) {
      const catalogPath = fileURLToPath(new URL(`../client/public/locales/${locale}/translation.json`, import.meta.url));
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as Record<string, unknown>;
      for (const path of requiredPaths) {
        const value = getTranslation(catalog, path);
        expect(value, `${locale}:${path}`).toBeTypeOf("string");
        expect((value as string).trim(), `${locale}:${path}`).not.toBe("");
      }
    }
  });
});
