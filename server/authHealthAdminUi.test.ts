import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
    expect(page).toContain("Export filtered CSV");
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
    expect(page).toContain('id="health-history"');
    expect(page).toContain('window.location.hash === "#health-history"');
    expect(page).toContain('new URLSearchParams(window.location.search).get("section") === "health-history"');
    expect(page).toContain("Drag the handle, or focus it and press Space then an arrow key");
    expect(page).toContain("DndContext");
    expect(page).toContain("SortableContext");
    expect(page).toContain("Reorder ${preset.name}");
    expect(page).toContain("reorderHealthHistoryPresets.mutate");
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
  });
});
