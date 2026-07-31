import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { AutomationEvent } from "../drizzle/schema";
import { summarizeAutomationEvents } from "./automationHealthDb";

const dayMs = 24 * 60 * 60 * 1000;
const fromMs = Date.UTC(2026, 6, 1);
const toMs = Date.UTC(2026, 6, 3, 23, 59, 59, 999);

function event(overrides: Partial<AutomationEvent> = {}): AutomationEvent {
  return {
    id: 1,
    eventKey: "drift_audit:100:1",
    oidcJtiHash: "a".repeat(64),
    kind: "drift_audit",
    result: "success",
    repository: "SteveKinzey/getphame",
    repositoryId: "101010101",
    repositoryOwnerId: "20202020",
    ref: "refs/heads/main",
    eventName: "schedule",
    workflow: "Monthly Workflow Drift Audit",
    workflowRef:
      "SteveKinzey/getphame/.github/workflows/workflow-drift-audit.yml@refs/heads/main",
    workflowSha: "b".repeat(40),
    runId: "100",
    runNumber: 1,
    runAttempt: 1,
    runUrl: "https://github.com/SteveKinzey/getphame/actions/runs/100",
    eventAt: fromMs,
    durationMs: 1_000,
    pullRequestNumber: null,
    pullRequestCreatedAt: null,
    pullRequestMergedAt: null,
    failureCode: null,
    failureSummary: null,
    receivedAt: fromMs + 1_000,
    ...overrides,
  };
}

describe("Automation Health dashboard aggregation", () => {
  it("calculates Dependabot, drift, chart, and history contracts independently", () => {
    const firstMerge = event({
      id: 2,
      eventKey: "dependabot_merge:101:1",
      kind: "dependabot_merge",
      result: "success",
      eventAt: fromMs + 2 * 60 * 60 * 1_000,
      pullRequestNumber: 51,
      pullRequestCreatedAt: fromMs - 2 * dayMs,
      pullRequestMergedAt: fromMs,
    });
    const secondMerge = event({
      id: 3,
      eventKey: "dependabot_merge:102:1",
      kind: "dependabot_merge",
      result: "success",
      eventAt: fromMs + dayMs + 2 * 60 * 60 * 1_000,
      pullRequestNumber: 52,
      pullRequestCreatedAt: fromMs - 3 * dayMs,
      pullRequestMergedAt: fromMs + dayMs,
    });
    const failedDrift = event({
      id: 4,
      eventKey: "drift_audit:103:1",
      result: "failure",
      eventAt: fromMs + dayMs + 4 * 60 * 60 * 1_000,
      failureCode: "workflow_failed",
      failureSummary: "The deterministic drift audit failed.",
    });
    const secondSuccess = event({
      id: 5,
      eventKey: "drift_audit:104:1",
      eventAt: fromMs + dayMs + 5 * 60 * 60 * 1_000,
    });
    const ignoredFailedMerge = event({
      id: 6,
      eventKey: "dependabot_merge:105:1",
      kind: "dependabot_merge",
      result: "failure",
      eventAt: fromMs + dayMs,
    });

    const summary = summarizeAutomationEvents({
      filters: { fromMs, toMs, limit: 10 },
      history: [failedDrift],
      allRangeEvents: [
        event(),
        firstMerge,
        secondMerge,
        failedDrift,
        secondSuccess,
        ignoredFailedMerge,
      ],
      latestDrift: failedDrift,
    });

    expect(summary.dependabot).toEqual({
      mergedCount: 2,
      averageMergeDurationMs: 3 * dayMs,
      medianMergeDurationMs: 3 * dayMs,
    });
    expect(summary.drift).toMatchObject({
      auditCount: 3,
      successCount: 2,
      failureCount: 1,
      successRate: 2 / 3,
      latest: failedDrift,
    });
    expect(summary.daily).toEqual([
      {
        date: "2026-07-01",
        dependabotMerges: 1,
        driftSuccesses: 1,
        driftFailures: 0,
      },
      {
        date: "2026-07-02",
        dependabotMerges: 1,
        driftSuccesses: 1,
        driftFailures: 1,
      },
      {
        date: "2026-07-03",
        dependabotMerges: 0,
        driftSuccesses: 0,
        driftFailures: 0,
      },
    ]);
    expect(summary.history).toEqual([failedDrift]);
  });

  it("returns null rates and a dense zero series when no events exist", () => {
    const summary = summarizeAutomationEvents({
      filters: { fromMs, toMs, limit: 10 },
      history: [],
      allRangeEvents: [],
      latestDrift: null,
    });

    expect(summary.dependabot).toEqual({
      mergedCount: 0,
      averageMergeDurationMs: null,
      medianMergeDurationMs: null,
    });
    expect(summary.drift).toEqual({
      auditCount: 0,
      successCount: 0,
      failureCount: 0,
      successRate: null,
      latest: null,
    });
    expect(summary.daily).toHaveLength(3);
    expect(
      summary.daily.every(
        point =>
          point.dependabotMerges === 0 &&
          point.driftSuccesses === 0 &&
          point.driftFailures === 0
      )
    ).toBe(true);
  });

  it("applies kind and result filters to history-aligned metrics and daily series", () => {
    const failedDrift = event({
      id: 2,
      eventKey: "drift_audit:filtered-failure:1",
      result: "failure",
      eventAt: fromMs + dayMs,
      failureCode: "workflow_failed",
    });
    const successfulDrift = event({
      id: 3,
      eventKey: "drift_audit:filtered-success:1",
      eventAt: fromMs + dayMs,
    });
    const successfulMerge = event({
      id: 4,
      eventKey: "dependabot_merge:filtered:1",
      kind: "dependabot_merge",
      result: "success",
      eventAt: fromMs + dayMs,
      pullRequestCreatedAt: fromMs - dayMs,
      pullRequestMergedAt: fromMs,
    });

    const summary = summarizeAutomationEvents({
      filters: {
        fromMs,
        toMs,
        kind: "drift_audit",
        result: "failure",
        limit: 10,
      },
      history: [failedDrift],
      allRangeEvents: [failedDrift, successfulDrift, successfulMerge],
      latestDrift: failedDrift,
    });

    expect(summary.dependabot).toEqual({
      mergedCount: 0,
      averageMergeDurationMs: null,
      medianMergeDurationMs: null,
    });
    expect(summary.drift).toMatchObject({
      auditCount: 1,
      successCount: 0,
      failureCount: 1,
      successRate: 0,
    });
    expect(
      summary.daily.reduce(
        (totals, point) => ({
          dependabotMerges: totals.dependabotMerges + point.dependabotMerges,
          driftSuccesses: totals.driftSuccesses + point.driftSuccesses,
          driftFailures: totals.driftFailures + point.driftFailures,
        }),
        { dependabotMerges: 0, driftSuccesses: 0, driftFailures: 0 }
      )
    ).toEqual({
      dependabotMerges: 0,
      driftSuccesses: 0,
      driftFailures: 1,
    });
    expect(summary.history).toEqual([failedDrift]);
  });

  it("reuses the same filter-aware range condition for history and aggregates", () => {
    const source = readFileSync(
      new URL("./automationHealthDb.ts", import.meta.url),
      "utf8"
    );
    expect(source.match(/\.where\(rangeCondition\)/g)).toHaveLength(2);
  });
});
