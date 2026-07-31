import { describe, expect, it } from "vitest";
import { readProjectFile } from "./testProjectFile";

const localeCodes = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

const requiredAutomationHealthPaths = [
  "title",
  "subtitle",
  "accessDenied",
  "adminOnly",
  "dashboardCardTitle",
  "dashboardCardBody",
  "alert.title",
  "alert.body",
  "alert.recovery",
  "alert.viewDetails",
  "alert.acknowledge",
  "alert.acknowledged",
  "charts.driftTitle",
  "charts.driftDescription",
  "charts.mergesTitle",
  "charts.mergesDescription",
  "filters.title",
  "filters.custom",
  "filters.from",
  "filters.to",
  "filters.invalidOrder",
  "filters.rangeTooLong",
  "history.title",
  "history.empty",
  "history.source",
  "history.opensNewTab",
  "kind.driftAudit",
  "kind.dependabotMerge",
  "metrics.merges",
  "metrics.averageMerge",
  "metrics.driftSuccess",
  "metrics.latestDrift",
  "result.success",
  "result.failure",
] as const;

const requiredActivityTrendPaths = [
  "customRange",
  "rangeFrom",
  "rangeTo",
  "applyRange",
  "applyingRange",
  "rangeApplied",
  "rangeMissing",
  "rangeInvalidDate",
  "rangeInvalidOrder",
  "rangeFutureEnd",
  "rangeTooLong",
  "activeRange",
  "emptyRange",
] as const;

function valueAtPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, input);
}

describe("Automation Health administrator UI contracts", () => {
  it("mounts the administrator-only drift alert in the authenticated app shell", () => {
    const alert = readProjectFile(
      "../client/src/components/AutomationDriftAlert.tsx"
    );
    const layout = readProjectFile("../client/src/components/AppLayout.tsx");

    expect(alert).toContain('const isAdmin = user?.role === "admin"');
    expect(alert).toContain("enabled: isAdmin");
    expect(alert).toContain(
      "if (!isAdmin || !alert.data?.active || !alert.data.event) return null"
    );
    expect(alert).toContain('data-testid="automation-drift-alert"');
    expect(alert).toContain('role="alert"');
    expect(alert).toContain('aria-live="assertive"');
    expect(alert).toContain("automationHealth.acknowledgeAlert.useMutation");
    expect(alert).toContain('navigate("/admin/automation-health")');
    expect(layout).toContain(
      'import AutomationDriftAlert from "@/components/AutomationDriftAlert"'
    );
    expect(layout).toContain("<AutomationDriftAlert />");
  });

  it("keeps the Automation Health page administrator-gated, interactive, and accessible", () => {
    const page = readProjectFile(
      "../client/src/pages/AdminAutomationHealth.tsx"
    );
    const app = readProjectFile("../client/src/App.tsx");
    const admin = readProjectFile("../client/src/pages/AdminDashboard.tsx");

    expect(page).toContain('user.role !== "admin"');
    expect(page).toContain('enabled: user?.role === "admin" && !rangeError');
    expect(page).toContain('data-testid="automation-health-page"');
    expect(page).toContain('aria-pressed={preset === "custom"}');
    expect(page).toContain('type="date"');
    expect(page).toContain('kind === "all" ? undefined : kind');
    expect(page).toContain('result === "all" ? undefined : result');
    expect(page).toContain("<BarChart");
    expect(page).toContain("<LineChart");
    expect(page).toContain('role="img"');
    expect(page).toContain('role="alert"');
    expect(page).toContain("href={event.runUrl}");
    expect(page).toContain('target="_blank"');
    expect(page).toContain('className="mt-4 overflow-x-auto"');
    expect(app).toContain('path="/admin/automation-health"');
    expect(admin).toContain('path: "/admin/automation-health"');
    expect(admin).toContain('t("automationHealth.dashboardCardTitle"');
    expect(admin).toContain('t("automationHealth.dashboardCardBody"');
  });
});

describe("Automation Health and Activity Trend locale parity", () => {
  for (const locale of localeCodes) {
    it(`${locale} contains every required automation and custom-range key`, () => {
      const catalog = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as Record<string, unknown>;

      for (const path of requiredAutomationHealthPaths) {
        expect(
          valueAtPath(catalog.automationHealth, path),
          `${locale}: automationHealth.${path}`
        ).toEqual(expect.any(String));
        expect(
          (valueAtPath(catalog.automationHealth, path) as string).trim().length,
          `${locale}: automationHealth.${path} must not be blank`
        ).toBeGreaterThan(0);
      }

      for (const path of requiredActivityTrendPaths) {
        expect(
          valueAtPath(catalog.activityTrend, path),
          `${locale}: activityTrend.${path}`
        ).toEqual(expect.any(String));
        expect(
          (valueAtPath(catalog.activityTrend, path) as string).trim().length,
          `${locale}: activityTrend.${path} must not be blank`
        ).toBeGreaterThan(0);
      }
    });
  }
});
