import { describe, expect, it } from "vitest";
import {
  canManageSubscription,
  getEffectivePlan,
  getEffectiveTier,
  PLAN_LABELS,
} from "@shared/plans";

describe("Get Phame effective plans", () => {
  it.each([
    ["free", "user", "free", "Free"],
    ["pro", "user", "monthly", "Monthly"],
    ["annual", "user", "annual", "Annual"],
    ["lifetime", "user", "life", "Life"],
  ] as const)("maps %s to %s plan", (tier, role, expectedPlan, expectedLabel) => {
    const plan = getEffectivePlan(tier, role);
    expect(plan).toBe(expectedPlan);
    expect(PLAN_LABELS[plan]).toBe(expectedLabel);
  });

  it("treats every administrator as Life regardless of the stored tier", () => {
    expect(getEffectivePlan("free", "admin")).toBe("life");
    expect(getEffectiveTier("free", "admin")).toBe("lifetime");
  });

  it("only allows Monthly and Annual users to manage Stripe subscriptions", () => {
    expect(canManageSubscription("free")).toBe(false);
    expect(canManageSubscription("monthly")).toBe(true);
    expect(canManageSubscription("annual")).toBe(true);
    expect(canManageSubscription("life")).toBe(false);
  });
});
