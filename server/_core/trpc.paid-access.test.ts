import { describe, expect, it } from "vitest";
import { hasActivePaidEntitlement } from "./trpc";

const NOW = 1_800_000_000_000;

describe("hasActivePaidEntitlement", () => {
  it("allows administrators regardless of tier or expiry", () => {
    expect(
      hasActivePaidEntitlement({
        role: "admin",
        tier: "free",
        planExpiresAt: NOW - 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it.each(["pro", "annual"])("allows an active %s subscription", tier => {
    expect(
      hasActivePaidEntitlement({
        role: "user",
        tier,
        planExpiresAt: NOW + 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("allows lifetime subscribers even when a stale expiry exists", () => {
    expect(
      hasActivePaidEntitlement({
        role: "user",
        tier: "lifetime",
        planExpiresAt: NOW - 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it.each(["pro", "annual"])("rejects an expired %s subscription", tier => {
    expect(
      hasActivePaidEntitlement({
        role: "user",
        tier,
        planExpiresAt: NOW - 1,
        now: NOW,
      }),
    ).toBe(false);
  });

  it.each([undefined, null, "free"])("rejects a non-paid tier: %s", tier => {
    expect(
      hasActivePaidEntitlement({
        role: "user",
        tier,
        now: NOW,
      }),
    ).toBe(false);
  });
});
