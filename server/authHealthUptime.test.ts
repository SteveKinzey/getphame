import { describe, expect, it } from "vitest";
import {
  calculateAuthHealthUptimeSummary,
  type AuthHealthUptimeRow,
} from "./db";

function healthRow(
  overallStatus: "ok" | "fail",
  checkedAt: number,
  overrides: Partial<AuthHealthUptimeRow> = {},
): AuthHealthUptimeRow {
  const componentStatus = overallStatus;
  return {
    overallStatus,
    configStatus: componentStatus,
    databaseStatus: componentStatus,
    userSchemaStatus: componentStatus,
    magicLinkSchemaStatus: componentStatus,
    sessionStatus: componentStatus,
    emailProviderStatus: componentStatus,
    durationMs: 20,
    checkedAt,
    ...overrides,
  };
}

describe("24-hour authentication uptime summary", () => {
  it("returns an explicit collecting state before the first scheduled run", () => {
    const summary = calculateAuthHealthUptimeSummary([]);

    expect(summary).toMatchObject({
      expectedRuns: 96,
      runCount: 0,
      uptimePercent: null,
      coveragePercent: 0,
      remainingRuns: 96,
      observationComplete: false,
      currentIncidentOpen: false,
    });
  });

  it("calculates availability, coverage, distinct incidents, latency, and component health", () => {
    const rows = [
      healthRow("ok", 1_000, { durationMs: 10 }),
      healthRow("fail", 2_000, { durationMs: 20, databaseStatus: "fail", emailProviderStatus: "ok" }),
      healthRow("ok", 3_000, { durationMs: 30 }),
      healthRow("fail", 4_000, { durationMs: 20, databaseStatus: "ok", emailProviderStatus: "fail" }),
      healthRow("fail", 5_000, { durationMs: 20, databaseStatus: "ok", emailProviderStatus: "fail" }),
    ];

    const summary = calculateAuthHealthUptimeSummary(rows);

    expect(summary).toMatchObject({
      runCount: 5,
      successfulRuns: 2,
      failedRuns: 3,
      uptimePercent: 40,
      coveragePercent: 5.21,
      remainingRuns: 91,
      observationComplete: false,
      incidentCount: 2,
      currentIncidentOpen: true,
      averageDurationMs: 20,
      latestCheckedAt: 5_000,
      firstObservedAt: 1_000,
      nextExpectedAt: 905_000,
    });
    expect(summary.components.find((component) => component.key === "emailProviderStatus")).toMatchObject({
      latestStatus: "fail",
      successfulRuns: 3,
      failedRuns: 2,
      uptimePercent: 60,
    });
  });

  it("marks a full healthy 96-run observation window complete", () => {
    const rows = Array.from({ length: 96 }, (_, index) => healthRow("ok", index * 900_000));
    const summary = calculateAuthHealthUptimeSummary(rows);

    expect(summary).toMatchObject({
      runCount: 96,
      successfulRuns: 96,
      failedRuns: 0,
      uptimePercent: 100,
      coveragePercent: 100,
      remainingRuns: 0,
      observationComplete: true,
      incidentCount: 0,
      currentIncidentOpen: false,
    });
  });
});
