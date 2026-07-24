import { describe, expect, it, vi } from "vitest";
import {
  calculateComplimentaryExpiry,
  complimentaryEmailFingerprint,
  getComplimentaryAccessStatus,
} from "./complimentaryAccess";
import { hasPaidOrAdminAccess } from "./entitlements";
import { evaluateFreeQuotaAccess, type FreeQuotaDataSource } from "./quotaEnforcement";

describe("complimentary access", () => {
  it("uses exact UTC days and clamps calendar months at month end", () => {
    const startsAt = Date.UTC(2025, 0, 31, 12);

    expect(calculateComplimentaryExpiry(startsAt, 1, "day"))
      .toBe(startsAt + 24 * 60 * 60 * 1000);
    expect(calculateComplimentaryExpiry(startsAt, 1, "month"))
      .toBe(Date.UTC(2025, 1, 28, 12));
  });

  it("clamps leap-day annual grants and enforces bounded durations", () => {
    const leapDay = Date.UTC(2024, 1, 29, 8, 30);

    expect(calculateComplimentaryExpiry(leapDay, 1, "year"))
      .toBe(Date.UTC(2025, 1, 28, 8, 30));
    expect(() => calculateComplimentaryExpiry(leapDay, 0, "day")).toThrow(/between 1 and 365/i);
    expect(() => calculateComplimentaryExpiry(leapDay, 25, "month")).toThrow(/between 1 and 24/i);
    expect(() => calculateComplimentaryExpiry(leapDay, 6, "year")).toThrow(/between 1 and 5/i);
  });

  it("gives revocation precedence over expiry and treats the exact expiry as ended", () => {
    const now = Date.UTC(2026, 6, 22);

    expect(getComplimentaryAccessStatus({ expiresAt: now + 1, revokedAt: null }, now)).toBe("active");
    expect(getComplimentaryAccessStatus({ expiresAt: now, revokedAt: null }, now)).toBe("expired");
    expect(getComplimentaryAccessStatus({ expiresAt: now + 1000, revokedAt: now - 1 }, now)).toBe("revoked");
  });

  it("normalizes email identity into a deterministic one-way fingerprint", () => {
    const fingerprint = complimentaryEmailFingerprint("  Customer@Example.COM  ");

    expect(fingerprint).toBe(complimentaryEmailFingerprint("customer@example.com"));
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("customer");
    expect(fingerprint).not.toContain("example.com");
  });
});

describe("paid entitlement precedence", () => {
  const now = Date.UTC(2026, 6, 22);

  it("allows administrators, lifetime plans, active subscriptions, and active complimentary grants", () => {
    expect(hasPaidOrAdminAccess({ role: "admin", tier: "free" }, now)).toBe(true);
    expect(hasPaidOrAdminAccess({ role: "user", tier: "lifetime" }, now)).toBe(true);
    expect(hasPaidOrAdminAccess({ role: "user", tier: "annual", planExpiresAt: now }, now)).toBe(true);
    expect(hasPaidOrAdminAccess({
      role: "user",
      tier: "free",
      complimentaryAccessExpiresAt: now + 1,
    }, now)).toBe(true);
  });

  it("rejects expired subscriptions and expired complimentary grants", () => {
    expect(hasPaidOrAdminAccess({ role: "user", tier: "pro", planExpiresAt: now - 1 }, now)).toBe(false);
    expect(hasPaidOrAdminAccess({
      role: "user",
      tier: "free",
      complimentaryAccessExpiresAt: now,
    }, now)).toBe(false);
  });
});

describe("free quota integration", () => {
  const blockedQuota = {
    phase: "rolling" as const,
    limit: 5,
    used: 5,
    remaining: 0,
    totalSent: 15,
    blocked: true,
    nextAvailableAt: Date.UTC(2026, 7, 1),
  };

  it("bypasses free limits for active complimentary access without loading quota", async () => {
    const dataSource: FreeQuotaDataSource = {
      getUserRole: vi.fn().mockResolvedValue("user"),
      hasComplimentaryAccess: vi.fn().mockResolvedValue(true),
      getQuota: vi.fn().mockResolvedValue(blockedQuota),
    };

    await expect(evaluateFreeQuotaAccess(42, "free", dataSource)).resolves.toEqual({
      allowed: true,
      bypassed: true,
      quota: null,
    });
    expect(dataSource.getQuota).not.toHaveBeenCalled();
  });

  it("still blocks ordinary free accounts at the shared quota boundary", async () => {
    const dataSource: FreeQuotaDataSource = {
      getUserRole: vi.fn().mockResolvedValue("user"),
      hasComplimentaryAccess: vi.fn().mockResolvedValue(false),
      getQuota: vi.fn().mockResolvedValue(blockedQuota),
    };

    await expect(evaluateFreeQuotaAccess(42, "free", dataSource)).resolves.toEqual({
      allowed: false,
      bypassed: false,
      quota: blockedQuota,
    });
  });
});
