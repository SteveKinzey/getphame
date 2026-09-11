import { describe, expect, it } from "vitest";
import { assessSubscriptionRecordHealth } from "./subscriptionRecordHealth";

const healthyProfiles = [
  { userId: 1, tier: "pro" as const },
  { userId: 2, tier: "annual" as const },
  { userId: 3, tier: "lifetime" as const },
  { userId: 4, tier: "free" as const },
];

const healthySubscriptions = [
  { userId: 1, plan: "monthly" as const, status: "active" },
  { userId: 2, plan: "annual" as const, status: "trialing" },
  { userId: 3, plan: "lifetime" as const, status: "lifetime" },
];

describe("subscription record health", () => {
  it("reports a healthy local entitlement ledger without exposing account data", () => {
    expect(
      assessSubscriptionRecordHealth(healthyProfiles, healthySubscriptions, 42)
    ).toEqual({
      checkedAt: 42,
      profileCount: 4,
      subscriptionRecordCount: 3,
      issueCount: 0,
      healthy: true,
      issues: [],
    });
  });

  it("summarizes only bounded mismatch categories", () => {
    const result = assessSubscriptionRecordHealth(
      [
        { userId: 1, tier: "pro" as const },
        { userId: 2, tier: "free" as const },
        { userId: 3, tier: "annual" as const },
      ],
      [
        { userId: 1, plan: "monthly" as const, status: "canceled" },
        { userId: 2, plan: "monthly" as const, status: "active" },
        { userId: 3, plan: "monthly" as const, status: "active" },
        { userId: 4, plan: "annual" as const, status: "active" },
        { userId: 4, plan: "annual" as const, status: "canceled" },
      ],
      99
    );

    expect(result).toMatchObject({
      checkedAt: 99,
      profileCount: 3,
      subscriptionRecordCount: 5,
      issueCount: 5,
      healthy: false,
    });
    expect(result.issues).toEqual([
      { kind: "active_subscription_on_free_profile", count: 1 },
      { kind: "duplicate_subscription_records", count: 1 },
      { kind: "paid_profile_without_active_subscription", count: 1 },
      { kind: "plan_tier_mismatch", count: 1 },
      { kind: "subscription_without_business_profile", count: 1 },
    ]);
    expect(JSON.stringify(result)).not.toContain("@");
    expect(JSON.stringify(result)).not.toContain("stripeSubscriptionId");
  });
});
