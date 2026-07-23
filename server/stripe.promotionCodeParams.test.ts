import { describe, expect, it } from "vitest";
import { buildStripePromotionCodeCreateParams } from "./stripe";

describe("Stripe Dahlia promotion-code parameters", () => {
  it("uses the required promotion object and never restores the removed top-level coupon field", () => {
    const expiresAt = Date.UTC(2026, 8, 15, 12, 30, 45, 987);
    const params = buildStripePromotionCodeCreateParams({
      couponId: "coupon_get_phame",
      code: "LAUNCH25",
      expiresAt,
      maxRedemptions: 250,
      firstTimeTransaction: true,
      createdByUserId: 42,
      applicablePlans: ["monthly", "annual"],
    });

    expect(params).toEqual({
      promotion: {
        type: "coupon",
        coupon: "coupon_get_phame",
      },
      code: "LAUNCH25",
      active: true,
      expires_at: Math.floor(expiresAt / 1000),
      max_redemptions: 250,
      restrictions: { first_time_transaction: true },
      metadata: {
        source: "get_phame_admin",
        created_by_user_id: "42",
        applicable_plans: "monthly,annual",
      },
    });
    expect(params).not.toHaveProperty("coupon");
  });

  it("omits optional restrictions when they are not configured", () => {
    const params = buildStripePromotionCodeCreateParams({
      couponId: "coupon_get_phame",
      code: "ANNUAL10",
      createdByUserId: 7,
      applicablePlans: ["annual"],
    });

    expect(params).not.toHaveProperty("expires_at");
    expect(params).not.toHaveProperty("max_redemptions");
    expect(params).not.toHaveProperty("restrictions");
  });
});
