import { describe, expect, it } from "vitest";
import type { BusinessProfile } from "../drizzle/schema";
import {
  QUIET_HOURS_DEFAULT_END_MINUTES,
  QUIET_HOURS_DEFAULT_START_MINUTES,
  isWithinQuietHours,
  nextAllowedDeliveryAt,
  quietWindowDurationMinutes,
  resolveQuietHoursWindow,
} from "./quietHours";

const chicagoWindow = {
  startMinutes: QUIET_HOURS_DEFAULT_START_MINUTES,
  endMinutes: QUIET_HOURS_DEFAULT_END_MINUTES,
  timeZone: "America/Chicago",
};

function profileWithQuietHours(overrides: Partial<BusinessProfile> = {}) {
  return {
    businessTimeZone: "America/Chicago",
    quietHoursStartMinutes: QUIET_HOURS_DEFAULT_START_MINUTES,
    quietHoursEndMinutes: QUIET_HOURS_DEFAULT_END_MINUTES,
    quietHoursShorteningApproved: 0,
    ...overrides,
  } as BusinessProfile;
}

describe("quiet-hours policy", () => {
  it("defaults to a 12-hour 8:00 PM–8:00 AM local customer-respect window", () => {
    expect(
      quietWindowDurationMinutes(
        QUIET_HOURS_DEFAULT_START_MINUTES,
        QUIET_HOURS_DEFAULT_END_MINUTES
      )
    ).toBe(12 * 60);
  });

  it("holds delivery at the start boundary and releases it exactly at the end boundary", () => {
    // January keeps America/Chicago on CST (UTC-6): 02:00 UTC is 8:00 PM local.
    const quietStart = Date.UTC(2026, 0, 16, 2, 0, 0);
    const quietEnd = Date.UTC(2026, 0, 16, 14, 0, 0);

    expect(isWithinQuietHours(quietStart, chicagoWindow)).toBe(true);
    expect(isWithinQuietHours(quietEnd, chicagoWindow)).toBe(false);
    expect(nextAllowedDeliveryAt(quietStart, chicagoWindow)).toBe(quietEnd);
  });

  it("does not silently permit a shorter window without an approved support exception", () => {
    const window = resolveQuietHoursWindow(
      profileWithQuietHours({
        quietHoursStartMinutes: 21 * 60,
        quietHoursEndMinutes: 7 * 60,
      })
    );

    expect(window).toEqual(chicagoWindow);
  });

  it("honors a shorter window only after the approved support exception is active", () => {
    const window = resolveQuietHoursWindow(
      profileWithQuietHours({
        quietHoursStartMinutes: 21 * 60,
        quietHoursEndMinutes: 7 * 60,
        quietHoursShorteningApproved: 1,
      })
    );

    expect(window).toEqual({
      startMinutes: 21 * 60,
      endMinutes: 7 * 60,
      timeZone: "America/Chicago",
    });
  });
});
