import { describe, expect, it } from "vitest";
import { evaluateOperationsAlertState } from "./systemHealth";
import type { ReminderTimingPerformanceRow } from "./reminderPerformance";

function reminderRow(sentCount: number, successCount: number): ReminderTimingPerformanceRow {
  return {
    stage: 1,
    firstDelayDays: 3,
    secondDelayDays: 10,
    firstStageEnabled: true,
    secondStageEnabled: true,
    sentCount,
    successCount,
    successRate: sentCount > 0 ? (successCount / sentCount) * 100 : null,
    isLowSample: sentCount < 5,
  };
}

describe("administrator operations alert thresholds", () => {
  it("does not infer failure when observations are missing", () => {
    const result = evaluateOperationsAlertState(null, []);
    expect(result.smtp).toMatchObject({ status: "ok", value: null, hasData: false });
    expect(result.reminders).toMatchObject({ status: "ok", value: null, hasData: false });
  });

  it("highlights SMTP below 95 percent and reminders below 20 percent after five sends", () => {
    const result = evaluateOperationsAlertState(
      { checkedAt: 1234, totalAccounts: 10, healthyAccounts: 9 },
      [reminderRow(10, 1)]
    );
    expect(result.smtp).toMatchObject({ status: "alert", value: 90, threshold: 95 });
    expect(result.reminders).toMatchObject({ status: "alert", value: 10, threshold: 20, sampleSize: 10 });
  });

  it("waits for the reminder minimum sample and keeps acceptable performance healthy", () => {
    const lowSample = evaluateOperationsAlertState(
      { checkedAt: 1234, totalAccounts: 20, healthyAccounts: 20 },
      [reminderRow(4, 0)]
    );
    expect(lowSample.smtp.status).toBe("ok");
    expect(lowSample.reminders).toMatchObject({ status: "ok", sampleSize: 4, minimumSample: 5 });

    const healthy = evaluateOperationsAlertState(
      { checkedAt: 1234, totalAccounts: 20, healthyAccounts: 19 },
      [reminderRow(10, 2)]
    );
    expect(healthy.smtp.status).toBe("ok");
    expect(healthy.reminders.status).toBe("ok");
  });
});
