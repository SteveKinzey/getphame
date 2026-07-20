import { describe, it, expect } from "vitest";

const hasThbEnv = !!(process.env.STRIPE_PRICE_ID_THB_MONTHLY && process.env.STRIPE_PRICE_ID_THB_ANNUAL && process.env.STRIPE_PRICE_ID_THB_LIFETIME);

describe("THB Stripe price IDs", () => {
  it.skipIf(!hasThbEnv)("STRIPE_PRICE_ID_THB_MONTHLY is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_MONTHLY).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_MONTHLY).toMatch(/^price_/);
  });

  it.skipIf(!hasThbEnv)("STRIPE_PRICE_ID_THB_ANNUAL is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_ANNUAL).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_ANNUAL).toMatch(/^price_/);
  });

  it.skipIf(!hasThbEnv)("STRIPE_PRICE_ID_THB_LIFETIME is set and non-empty", () => {
    expect(process.env.STRIPE_PRICE_ID_THB_LIFETIME).toBeTruthy();
    expect(process.env.STRIPE_PRICE_ID_THB_LIFETIME).toMatch(/^price_/);
  });
});
