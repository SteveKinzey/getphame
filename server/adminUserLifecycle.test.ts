import { describe, expect, it } from "vitest";
import {
  MAX_ADMIN_GRANT_MONTHS,
  MAX_ADMIN_SUSPENSION_DAYS,
  resolveFlexibleAccessExpiry,
  resolveSuspensionUntil,
} from "./adminUserLifecycle";

describe("admin user lifecycle helpers", () => {
  it("extends paid access from the later of now or the current expiry", () => {
    const now = Date.UTC(2026, 0, 31);
    const expiry = resolveFlexibleAccessExpiry(Date.UTC(2026, 2, 15), { kind: "months", quantity: 2 }, now);
    expect(expiry).toBe(Date.UTC(2026, 4, 15));
  });

  it("uses calendar years and enforces bounded administrator inputs", () => {
    const now = Date.UTC(2026, 5, 1);
    expect(resolveFlexibleAccessExpiry(null, { kind: "years", quantity: 2 }, now)).toBe(Date.UTC(2028, 5, 1));
    expect(() => resolveFlexibleAccessExpiry(null, { kind: "months", quantity: MAX_ADMIN_GRANT_MONTHS + 1 }, now)).toThrow("Months must be a whole number");
  });

  it("creates a precise temporary suspension and rejects unsafe durations", () => {
    const now = Date.UTC(2026, 5, 1);
    expect(resolveSuspensionUntil(7, now)).toBe(now + 7 * 24 * 60 * 60 * 1000);
    expect(() => resolveSuspensionUntil(MAX_ADMIN_SUSPENSION_DAYS + 1, now)).toThrow("Suspension days must be a whole number");
  });
});
