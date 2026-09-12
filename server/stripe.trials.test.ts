import { beforeEach, describe, expect, it, vi } from "vitest";

const checkoutCreate = vi.fn();

vi.mock("stripe", () => {
  class MockStripe {
    checkout = { sessions: { create: checkoutCreate } };
  }
  return { default: MockStripe };
});

const base = {
  userId: 42,
  userEmail: "owner@example.com",
  userName: "Owner",
  stripeCustomerId: null as string | null,
  origin: "https://getphame.app",
  lifecycleLocale: "fr" as const,
};

describe("Stripe recurring Checkout trials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_TRIAL_PERIOD_DAYS = "21";
    process.env.STRIPE_TEST_PRICE_ID_USD_MONTHLY = "price_usd_monthly";
    process.env.STRIPE_TEST_PRICE_ID_USD_ANNUAL = "price_usd_annual";
    process.env.STRIPE_TEST_PRICE_ID_USD_LIFETIME = "price_usd_lifetime";
    process.env.STRIPE_TEST_PRICE_ID_THB_MONTHLY = "price_thb_monthly";
    process.env.STRIPE_TEST_PRICE_ID_THB_ANNUAL = "price_thb_annual";
    process.env.STRIPE_TEST_PRICE_ID_THB_LIFETIME = "price_thb_lifetime";
    checkoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test" });
  });

  it.each(["monthly", "annual"] as const)(
    "adds the fixed trial and server-owned metadata to USD %s Checkout",
    async plan => {
      const { createCheckoutSession } = await import("./stripe");
      await createCheckoutSession({ ...base, plan });
      expect(checkoutCreate.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          mode: "subscription",
          metadata: expect.objectContaining({
            getphame_user_id: "42",
            getphame_plan: plan,
            getphame_locale: "fr",
          }),
          subscription_data: {
            trial_period_days: 21,
            metadata: {
              getphame_user_id: "42",
              getphame_plan: plan,
              getphame_locale: "fr",
            },
          },
        })
      );
    }
  );

  it("adds the same fixed trial policy to THB recurring Checkout", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...base, plan: "monthly" });
    expect(checkoutCreate.mock.calls[0][0].subscription_data).toEqual({
      trial_period_days: 21,
      metadata: {
        getphame_user_id: "42",
        getphame_plan: "monthly",
        getphame_locale: "fr",
      },
    });
  });

  it("keeps lifetime Checkout as a one-time payment without a trial", async () => {
    const { createCheckoutSession } = await import("./stripe");
    await createCheckoutSession({ ...base, plan: "lifetime" });
    expect(checkoutCreate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ mode: "payment" })
    );
    expect(checkoutCreate.mock.calls[0][0]).not.toHaveProperty(
      "subscription_data"
    );
  });

  it.each(["0", "731", "1.5", "bad", ""])(
    "rejects invalid production trial configuration %s",
    async value => {
      const { getStripeTrialPeriodDays } = await import("./stripe");
      expect(() => getStripeTrialPeriodDays(value, "production")).toThrow(
        /between 1 and 730/
      );
    }
  );

  it("allows a safe local default while production fails closed when missing", async () => {
    const { getStripeTrialPeriodDays } = await import("./stripe");
    expect(getStripeTrialPeriodDays("", "development")).toBe(14);
    expect(() => getStripeTrialPeriodDays("", "production")).toThrow(
      /between 1 and 730/
    );
  });
});
