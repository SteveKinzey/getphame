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
    expect(page).toContain("matching records");
    expect(page).toContain("Clear history filters");
    expect(page).toContain("Previous");
    expect(page).toContain("Next");
  });
});
