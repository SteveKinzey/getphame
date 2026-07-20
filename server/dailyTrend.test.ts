import { describe, expect, it } from "vitest";
import { buildDailyTrend } from "./dailyTrend";

describe("buildDailyTrend", () => {
  it("builds a dense UTC series and counts distinct open and click requests per day", () => {
    const result = buildDailyTrend({
      days: 7,
      nowMs: Date.parse("2026-07-14T12:00:00.000Z"),
      sendRows: [
        { sentAt: new Date("2026-07-09T23:59:59.000Z") },
        { sentAt: new Date("2026-07-10T00:00:01.000Z") },
        { sentAt: new Date("2026-07-10T18:30:00.000Z") },
      ],
      eventRows: [
        { createdAt: new Date("2026-07-10T08:00:00.000Z"), requestId: 101, type: "open" },
        { createdAt: new Date("2026-07-10T08:05:00.000Z"), requestId: 101, type: "open" },
        { createdAt: new Date("2026-07-10T09:00:00.000Z"), requestId: 102, type: "open" },
        { createdAt: new Date("2026-07-10T10:00:00.000Z"), requestId: 101, type: "click" },
        { createdAt: new Date("2026-07-10T10:05:00.000Z"), requestId: 101, type: "click" },
        { createdAt: new Date("2026-07-11T00:00:00.000Z"), requestId: 101, type: "open" },
        { createdAt: new Date("2026-07-11T00:00:00.000Z"), requestId: 999, type: "bounce" },
      ],
    });

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({ date: "2026-07-08", sends: 0, opens: 0, clicks: 0 });
    expect(result[1]).toEqual({ date: "2026-07-09", sends: 1, opens: 0, clicks: 0 });
    expect(result[2]).toEqual({ date: "2026-07-10", sends: 2, opens: 2, clicks: 1 });
    expect(result[3]).toEqual({ date: "2026-07-11", sends: 0, opens: 1, clicks: 0 });
    expect(result[6]).toEqual({ date: "2026-07-14", sends: 0, opens: 0, clicks: 0 });
  });
});
