import { describe, expect, it } from "vitest";
import {
  deriveEntitlement,
  shouldSchedulePaymentAction,
  shouldScheduleTrialEnding,
  type CanonicalSubscription,
} from "./stripeLifecycle";

function subscription(
  overrides: Partial<CanonicalSubscription> = {}
): CanonicalSubscription {
  return {
    id: "sub_123",
    customerId: "cus_123",
    userId: 42,
    plan: "monthly",
    locale: "en",
    status: "trialing",
    trialEndsAt: 2_000_000,
    currentPeriodEndsAt: 3_000_000,
    cancelAtPeriodEnd: false,
    hasCollectedPayment: false,
    ...overrides,
  };
}

describe("Stripe lifecycle canonical policy", () => {
  it("gives trial access only through the finite Stripe trial end", () => {
    expect(deriveEntitlement(subscription())).toEqual({
      tier: "pro",
      planExpiresAt: 2_000_000,
      terminal: false,
    });
  });

  it("retains annual access through the period boundary when cancellation is pending", () => {
    expect(
      deriveEntitlement(
        subscription({
          plan: "annual",
          status: "active",
          cancelAtPeriodEnd: true,
          currentPeriodEndsAt: 4_000_000,
        })
      )
    ).toEqual({
      tier: "annual",
      planExpiresAt: 4_000_000,
      terminal: false,
    });
  });

  it.each(["paused", "canceled", "unpaid", "incomplete_expired"])(
    "downgrades terminal status %s",
    status => {
      expect(deriveEntitlement(subscription({ status }))).toEqual({
        tier: "free",
        planExpiresAt: null,
        terminal: true,
      });
    }
  );

  it("requires an unpaid future trial before scheduling a trial-ending notice", () => {
    expect(shouldScheduleTrialEnding(subscription(), 1_000_000)).toBe(true);
    expect(
      shouldScheduleTrialEnding(
        subscription({ hasCollectedPayment: true }),
        1_000_000
      )
    ).toBe(false);
    expect(
      shouldScheduleTrialEnding(subscription({ status: "active" }), 1_000_000)
    ).toBe(false);
    expect(shouldScheduleTrialEnding(subscription(), 3_000_000)).toBe(false);
  });

  it("limits payment-action notices to canonical unpaid states", () => {
    expect(
      shouldSchedulePaymentAction(subscription({ status: "past_due" }))
    ).toBe(true);
    expect(
      shouldSchedulePaymentAction(subscription({ status: "incomplete" }))
    ).toBe(true);
    expect(
      shouldSchedulePaymentAction(subscription({ status: "active" }))
    ).toBe(false);
    expect(
      shouldSchedulePaymentAction(subscription({ status: "canceled" }))
    ).toBe(false);
  });
});
