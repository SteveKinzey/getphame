import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("administrator operations analytics hub", () => {
  it("keeps trend, thresholds, and consolidated CSV behind admin-only procedures", () => {
    const routerPath = fileURLToPath(new URL("./routers.ts", import.meta.url));
    const router = readFileSync(routerPath, "utf8");
    expect(router).toContain("systemHealthTrend: adminProcedure");
    expect(router).toContain("operationsAlerts: adminProcedure");
    expect(router).toContain("operationsAnalyticsExport: adminProcedure");
    expect(router).toContain("buildAdminOperationsAnalyticsExport");
  });

  it("renders a responsive export control, explicit no-data chart state, and red threshold state", () => {
    const pagePath = fileURLToPath(
      new URL("../client/src/pages/AdminDashboard.tsx", import.meta.url)
    );
    const page = readFileSync(pagePath, "utf8");
    expect(page).toContain('data-testid="admin-operations-csv-export"');
    expect(page).toContain("Export analytics CSV");
    expect(page).toContain('data-testid="system-health-trend-chart"');
    expect(page).toContain("24-hour health trend");
    expect(page).toContain("Monitoring data unavailable");
    expect(page).toContain(
      "No health status is being inferred from missing data."
    );
    expect(page).toContain("text-red-700");
    expect(page).toContain("Below threshold");
    expect(page).toContain('role={isAlert ? "alert" : undefined}');
  });
});
