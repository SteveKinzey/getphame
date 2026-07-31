import { describe, expect, it } from "vitest";
import {
  createDefaultActivityTrendRange,
  resolveActivityTrendCustomRange,
  toActivityTrendInputDate,
} from "./activityTrendRange";

describe("activityTrendRange", () => {
  const now = new Date(2026, 6, 31, 12, 0, 0);

  it("creates a 30-day inclusive default range using local calendar dates", () => {
    expect(createDefaultActivityTrendRange(now)).toEqual({
      startDate: "2026-07-02",
      endDate: "2026-07-31",
    });
    expect(toActivityTrendInputDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("builds a stable UTC custom query with inclusive day count", () => {
    const result = resolveActivityTrendCustomRange(
      "2026-07-01",
      "2026-07-31",
      now,
      "UTC"
    );

    expect(result).toEqual({
      query: {
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        timeZone: "UTC",
        startTimezoneOffsetMinutes: new Date(2026, 6, 1).getTimezoneOffset(),
        endTimezoneOffsetMinutes: new Date(2026, 7, 1).getTimezoneOffset(),
      },
      days: 31,
      error: null,
    });
  });

  it.each([
    ["", "2026-07-31", "missing"],
    ["2026-02-30", "2026-07-31", "invalidDate"],
    ["2026-07-31", "2026-07-01", "invalidOrder"],
    ["2026-07-01", "2026-08-01", "futureEnd"],
    ["2025-07-30", "2026-07-31", "rangeTooLong"],
  ] as const)("returns %s/%s validation as %s", (startDate, endDate, error) => {
    expect(
      resolveActivityTrendCustomRange(startDate, endDate, now, "UTC")
    ).toMatchObject({
      query: null,
      error,
    });
  });
});
