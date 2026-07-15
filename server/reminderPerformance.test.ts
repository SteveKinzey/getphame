import { describe, expect, it } from "vitest";
import { shapeReminderTimingPerformanceRows } from "./reminderPerformance";

describe("reminder timing performance", () => {
  it("shapes real aggregate counts into a one-decimal success rate", () => {
    expect(shapeReminderTimingPerformanceRows([{
      stage: 2,
      firstDelayDays: 3,
      secondDelayDays: 7,
      firstStageEnabled: 1,
      secondStageEnabled: 1,
      sentCount: "8",
      successCount: "3",
    }])).toEqual([{
      stage: 2,
      firstDelayDays: 3,
      secondDelayDays: 7,
      firstStageEnabled: true,
      secondStageEnabled: true,
      sentCount: 8,
      successCount: 3,
      successRate: 37.5,
      isLowSample: false,
    }]);
  });

  it("marks small samples and never invents a percentage for an empty group", () => {
    expect(shapeReminderTimingPerformanceRows([{
      stage: 1,
      firstDelayDays: 5,
      secondDelayDays: 7,
      firstStageEnabled: 1,
      secondStageEnabled: 0,
      sentCount: 0,
      successCount: 0,
    }])[0]).toMatchObject({
      successRate: null,
      isLowSample: true,
      firstStageEnabled: true,
      secondStageEnabled: false,
    });
  });
});
