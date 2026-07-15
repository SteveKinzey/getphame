import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS,
  FOLLOW_UP_DELAY_PRESETS,
  isValidFollowUpDelayDays,
  normalizeFollowUpDelayDays,
} from "../client/src/lib/reminderSettings";

describe("follow-up delay settings", () => {
  it("accepts editable whole-day values within the supported range", () => {
    expect(isValidFollowUpDelayDays("1")).toBe(true);
    expect(isValidFollowUpDelayDays("8")).toBe(true);
    expect(isValidFollowUpDelayDays(14)).toBe(true);
    expect(normalizeFollowUpDelayDays("8")).toBe(8);
  });

  it("provides fast 3, 5, and 7 day choices for either independently edited interval", () => {
    expect(FOLLOW_UP_DELAY_PRESETS).toEqual([3, 5, 7]);
    expect(DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS).toBe(7);
    expect(normalizeFollowUpDelayDays("5", DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS)).toBe(5);
  });

  it("rejects empty, fractional, and out-of-range values without saving them", () => {
    expect(isValidFollowUpDelayDays("")).toBe(false);
    expect(isValidFollowUpDelayDays("2.5")).toBe(false);
    expect(isValidFollowUpDelayDays("0")).toBe(false);
    expect(isValidFollowUpDelayDays("15")).toBe(false);
    expect(normalizeFollowUpDelayDays("", 6)).toBe(6);
  });
});
