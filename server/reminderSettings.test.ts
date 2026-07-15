import { describe, expect, it } from "vitest";
import {
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

  it("rejects empty, fractional, and out-of-range values without saving them", () => {
    expect(isValidFollowUpDelayDays("")).toBe(false);
    expect(isValidFollowUpDelayDays("2.5")).toBe(false);
    expect(isValidFollowUpDelayDays("0")).toBe(false);
    expect(isValidFollowUpDelayDays("15")).toBe(false);
    expect(normalizeFollowUpDelayDays("", 6)).toBe(6);
  });
});
