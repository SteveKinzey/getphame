/**
 * Verify that the three THB Stripe price IDs are present in the environment.
 * These are required for the PromptPay checkout flow to work.
 */
import { describe, it, expect } from "vitest";

describe("THB Stripe price IDs", () => {
  it("STRIPE_PRICE_ID_THB_MONTHLY is set and non-empty", () => {
    const id = process.env.STRIPE_PRICE_ID_THB_MONTHLY;
    expect(id).toBeTruthy();
    expect(id).toMatch(/^price_/);
  });

  it("STRIPE_PRICE_ID_THB_ANNUAL is set and non-empty", () => {
    const id = process.env.STRIPE_PRICE_ID_THB_ANNUAL;
    expect(id).toBeTruthy();
    expect(id).toMatch(/^price_/);
  });

  it("STRIPE_PRICE_ID_THB_LIFETIME is set and non-empty", () => {
    const id = process.env.STRIPE_PRICE_ID_THB_LIFETIME;
    expect(id).toBeTruthy();
    expect(id).toMatch(/^price_/);
  });

  it("all three IDs are distinct", () => {
    const monthly  = process.env.STRIPE_PRICE_ID_THB_MONTHLY;
    const annual   = process.env.STRIPE_PRICE_ID_THB_ANNUAL;
    const lifetime = process.env.STRIPE_PRICE_ID_THB_LIFETIME;
    const ids = [monthly, annual, lifetime].filter(Boolean);
    expect(new Set(ids).size).toBe(3);
  });
});
