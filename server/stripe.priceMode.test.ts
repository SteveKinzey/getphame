import { afterEach, describe, expect, it } from "vitest";

import {
  STRIPE_PRICE_IDS,
  getStripePriceIds,
  getThbPriceIds,
  isStripeLiveMode,
} from "./stripe";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Stripe live/test Price isolation", () => {
  it("detects Stripe mode from the server-side secret key", () => {
    expect(isStripeLiveMode("sk_live_example")).toBe(true);
    expect(isStripeLiveMode("sk_test_example")).toBe(false);
    expect(isStripeLiveMode(undefined)).toBe(false);
  });

  it("preserves established USD live Price IDs in live mode", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    expect(getStripePriceIds()).toEqual(STRIPE_PRICE_IDS);
  });

  it("reads all USD Price IDs from managed test variables in test mode", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_TEST_PRICE_ID_USD_MONTHLY = "price_test_usd_monthly";
    process.env.STRIPE_TEST_PRICE_ID_USD_ANNUAL = "price_test_usd_annual";
    process.env.STRIPE_TEST_PRICE_ID_USD_LIFETIME = "price_test_usd_lifetime";

    expect(getStripePriceIds()).toEqual({
      monthly: "price_test_usd_monthly",
      annual: "price_test_usd_annual",
      lifetime: "price_test_usd_lifetime",
    });
  });

  it("selects isolated THB variables for test and live modes", () => {
    process.env.STRIPE_TEST_PRICE_ID_THB_MONTHLY = "price_test_thb_monthly";
    process.env.STRIPE_TEST_PRICE_ID_THB_ANNUAL = "price_test_thb_annual";
    process.env.STRIPE_TEST_PRICE_ID_THB_LIFETIME = "price_test_thb_lifetime";
    process.env.STRIPE_PRICE_ID_THB_MONTHLY = "price_live_thb_monthly";
    process.env.STRIPE_PRICE_ID_THB_ANNUAL = "price_live_thb_annual";
    process.env.STRIPE_PRICE_ID_THB_LIFETIME = "price_live_thb_lifetime";

    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    expect(getThbPriceIds()).toEqual({
      monthly: "price_test_thb_monthly",
      annual: "price_test_thb_annual",
      lifetime: "price_test_thb_lifetime",
    });

    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    expect(getThbPriceIds()).toEqual({
      monthly: "price_live_thb_monthly",
      annual: "price_live_thb_annual",
      lifetime: "price_live_thb_lifetime",
    });
  });
});
