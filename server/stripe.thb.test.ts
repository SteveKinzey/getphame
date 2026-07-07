import { describe, it, expect } from "vitest";

describe("THB Stripe price IDs", () => {
  it("STRIPE_PRICE_ID_THB_MONTHLY is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_MONTHLY).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_MONTHLY).toMatch(/^price_/);
  });

  it("STRIPE_PRICE_ID_THB_ANNUAL is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_ANNUAL).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_ANNUAL).toMatch(/^price_/);
  });

  it("STRIPE_PRICE_ID_THB_LIFETIME is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_LIFETIME).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_LIFETIME).toMatch(/^price_/);
  });
});
