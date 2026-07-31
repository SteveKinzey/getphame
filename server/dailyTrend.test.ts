import { describe, expect, it } from "vitest";
import {
  buildDailyTrend,
  DailyTrendRangeError,
  MAX_ACTIVITY_TREND_RANGE_DAYS,
  resolveDailyTrendRange,
} from "./dailyTrend";

describe("buildDailyTrend", () => {
  it("builds a dense UTC series and counts distinct open and click requests per day", () => {
    const result = buildDailyTrend({
      startDate: "2026-07-08",
      days: 7,
      timeZone: "UTC",
      sendRows: [
        { sentAt: new Date("2026-07-09T23:59:59.000Z") },
        { sentAt: new Date("2026-07-10T00:00:01.000Z") },
        { sentAt: new Date("2026-07-10T18:30:00.000Z") },
      ],
      eventRows: [
        {
          createdAt: new Date("2026-07-10T08:00:00.000Z"),
          requestId: 101,
          type: "open",
        },
        {
          createdAt: new Date("2026-07-10T08:05:00.000Z"),
          requestId: 101,
          type: "open",
        },
        {
          createdAt: new Date("2026-07-10T09:00:00.000Z"),
          requestId: 102,
          type: "open",
        },
        {
          createdAt: new Date("2026-07-10T10:00:00.000Z"),
          requestId: 101,
          type: "click",
        },
        {
          createdAt: new Date("2026-07-10T10:05:00.000Z"),
          requestId: 101,
          type: "click",
        },
        {
          createdAt: new Date("2026-07-11T00:00:00.000Z"),
          requestId: 101,
          type: "open",
        },
        {
          createdAt: new Date("2026-07-11T00:00:00.000Z"),
          requestId: 999,
          type: "bounce",
        },
      ],
    });

    expect(result).toHaveLength(7);
    expect(result[0]).toEqual({
      date: "2026-07-08",
      sends: 0,
      opens: 0,
      clicks: 0,
    });
    expect(result[1]).toEqual({
      date: "2026-07-09",
      sends: 1,
      opens: 0,
      clicks: 0,
    });
    expect(result[2]).toEqual({
      date: "2026-07-10",
      sends: 2,
      opens: 2,
      clicks: 1,
    });
    expect(result[3]).toEqual({
      date: "2026-07-11",
      sends: 0,
      opens: 1,
      clicks: 0,
    });
    expect(result[6]).toEqual({
      date: "2026-07-14",
      sends: 0,
      opens: 0,
      clicks: 0,
    });
  });

  it("buckets timestamps by the requested local calendar rather than UTC", () => {
    const result = buildDailyTrend({
      startDate: "2026-07-10",
      days: 2,
      timeZone: "America/New_York",
      sendRows: [
        { sentAt: new Date("2026-07-11T02:00:00.000Z") },
        { sentAt: new Date("2026-07-11T04:00:00.000Z") },
      ],
      eventRows: [
        {
          createdAt: new Date("2026-07-11T03:59:59.000Z"),
          requestId: 1,
          type: "open",
        },
        {
          createdAt: new Date("2026-07-11T04:00:00.000Z"),
          requestId: 2,
          type: "click",
        },
      ],
    });

    expect(result).toEqual([
      { date: "2026-07-10", sends: 1, opens: 1, clicks: 0 },
      { date: "2026-07-11", sends: 1, opens: 0, clicks: 1 },
    ]);
  });
});

describe("resolveDailyTrendRange", () => {
  const nowMs = Date.parse("2026-03-10T12:00:00.000Z");

  it("preserves preset behavior with a dense UTC window", () => {
    const result = resolveDailyTrendRange({ days: 30 }, nowMs);

    expect(result).toMatchObject({
      startDate: "2026-02-09",
      endDate: "2026-03-10",
      days: 30,
      timeZone: "UTC",
      isCustom: false,
    });
    expect(result.startAt.toISOString()).toBe("2026-02-09T00:00:00.000Z");
    expect(result.endExclusive.toISOString()).toBe("2026-03-11T00:00:00.000Z");
  });

  it("resolves an inclusive custom range across a daylight-saving transition", () => {
    const result = resolveDailyTrendRange(
      {
        startDate: "2026-03-07",
        endDate: "2026-03-09",
        timeZone: "America/New_York",
        startTimezoneOffsetMinutes: 300,
        endTimezoneOffsetMinutes: 240,
      },
      nowMs
    );

    expect(result).toMatchObject({
      startDate: "2026-03-07",
      endDate: "2026-03-09",
      days: 3,
      timeZone: "America/New_York",
      isCustom: true,
    });
    expect(result.startAt.toISOString()).toBe("2026-03-07T05:00:00.000Z");
    expect(result.endExclusive.toISOString()).toBe("2026-03-10T04:00:00.000Z");
  });

  it.each([
    [{ startDate: "2026-03-01" }, /both a start and end date/i],
    [
      {
        days: 30,
        startDate: "2026-03-01",
        endDate: "2026-03-02",
        timeZone: "UTC",
        startTimezoneOffsetMinutes: 0,
        endTimezoneOffsetMinutes: 0,
      },
      /either a preset period or a custom/i,
    ],
    [
      {
        startDate: "2026-03-09",
        endDate: "2026-03-08",
        timeZone: "UTC",
        startTimezoneOffsetMinutes: 0,
        endTimezoneOffsetMinutes: 0,
      },
      /on or after/i,
    ],
    [
      {
        startDate: "2026-03-01",
        endDate: "2026-03-11",
        timeZone: "UTC",
        startTimezoneOffsetMinutes: 0,
        endTimezoneOffsetMinutes: 0,
      },
      /future/i,
    ],
    [
      {
        startDate: "2025-03-01",
        endDate: "2026-03-02",
        timeZone: "UTC",
        startTimezoneOffsetMinutes: 0,
        endTimezoneOffsetMinutes: 0,
      },
      new RegExp(`${MAX_ACTIVITY_TREND_RANGE_DAYS} days or fewer`, "i"),
    ],
    [
      {
        startDate: "2026-03-01",
        endDate: "2026-03-02",
        timeZone: "Not/A_Zone",
        startTimezoneOffsetMinutes: 0,
        endTimezoneOffsetMinutes: 0,
      },
      /valid timezone/i,
    ],
  ])("rejects an invalid custom range %#", (input, message) => {
    expect(() => resolveDailyTrendRange(input, nowMs)).toThrow(
      DailyTrendRangeError
    );
    expect(() => resolveDailyTrendRange(input, nowMs)).toThrow(message);
  });
});
