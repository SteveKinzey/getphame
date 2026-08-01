import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectUrl = new URL("../", import.meta.url);

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, projectUrl), "utf8");
}

function locale(language: string) {
  return JSON.parse(
    read(`client/public/locales/${language}/translation.json`)
  ) as Record<string, any>;
}

describe("Automation Health drilldown and acknowledgement UI contracts", () => {
  it("makes both chart tooltips keyboard-focusable daily-run launchers", () => {
    const source = read("client/src/pages/AdminAutomationHealth.tsx");

    expect(source.match(/automationHealth\.drilldown\.viewRuns/g)).toHaveLength(
      2
    );
    expect(
      source.match(
        /onClick=\{\(\) => point\?\.date && onOpen\(point\.date\)\}/g
      )
    ).toHaveLength(2);
    expect(
      source.match(/focus-visible:ring-2/g)?.length
    ).toBeGreaterThanOrEqual(2);
    expect(source).toContain("<AutomationAcknowledgementHistory />");
    expect(source).toContain("<AutomationRunDetailsDialog");
  });

  it("keeps the daily-run dialog bounded, lazy, state-complete, and privacy-safe", () => {
    const source = read("client/src/components/AutomationRunDetailsDialog.tsx");

    expect(source).toContain("limit: 50");
    expect(source).toContain("enabled: Boolean(selection)");
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain("query.data?.runs.length === 0");
    expect(source).toContain("i18n.resolvedLanguage");
    expect(source).toContain('rel="noreferrer"');
    expect(source).not.toContain("oidcJtiHash");
    expect(source).not.toContain("repositoryOwnerId");
  });

  it("shows acknowledgement actor, alert context, and recovery as distinct audit facts", () => {
    const source = read(
      "client/src/components/AutomationAcknowledgementHistory.tsx"
    );

    expect(source).toContain("limit: 50");
    expect(source).toContain("entry.actorName");
    expect(source).toContain("entry.adminUserId");
    expect(source).toContain("entry.failureSummary");
    expect(source).toContain("entry.recoveredAt");
    expect(source).toContain("automationHealth.ackHistory.awaitingRecovery");
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('rel="noreferrer"');
    expect(source).not.toContain("entry.email");
  });

  it("provides complete drilldown and acknowledgement copy in all maintained locales", () => {
    const languages = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
    const drilldownKeys = [
      "description",
      "empty",
      "error",
      "loading",
      "openRun",
      "title",
      "viewRuns",
    ];
    const acknowledgementKeys = [
      "acknowledgedAt",
      "actorFallback",
      "awaitingRecovery",
      "description",
      "empty",
      "error",
      "eyebrow",
      "loading",
      "noFailureSummary",
      "openAlertRun",
      "recovered",
      "recoveredAt",
      "title",
    ];

    for (const language of languages) {
      const automationHealth = locale(language).automationHealth;
      for (const key of drilldownKeys) {
        expect(
          automationHealth.drilldown[key],
          `${language}.${key}`
        ).toBeTruthy();
      }
      for (const key of acknowledgementKeys) {
        expect(
          automationHealth.ackHistory[key],
          `${language}.${key}`
        ).toBeTruthy();
      }
    }
  });
});
