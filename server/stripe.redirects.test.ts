import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();
const mockPromotionCodesList = vi.fn();
const mockPricesRetrieve = vi.fn();
const mockCouponsRetrieve = vi.fn();

vi.mock("stripe", () => {
  class MockStripe {
    checkout = { sessions: { create: mockCheckoutCreate } };
    billingPortal = { sessions: { create: mockPortalCreate } };
    promotionCodes = { list: mockPromotionCodesList };
    prices = { retrieve: mockPricesRetrieve };
    coupons = { retrieve: mockCouponsRetrieve };
  }

  return { default: MockStripe };
});

const BASE_PARAMS = {
  userId: 42,
  userEmail: "owner@example.com",
  userName: "Get Phame Owner",
  stripeCustomerId: null as string | null,
  origin: "https://legacy-preview.invalid",
};

describe("Stripe Checkout and promotion safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.APP_BASE_URL = "https://legacy-preview.invalid";
    process.env.STRIPE_TEST_PRICE_ID_USD_MONTHLY = "price_test_usd_monthly";
    process.env.STRIPE_TEST_PRICE_ID_USD_ANNUAL = "price_test_usd_annual";
    process.env.STRIPE_TEST_PRICE_ID_USD_LIFETIME = "price_test_usd_lifetime";
    process.env.STRIPE_TEST_PRICE_ID_THB_MONTHLY = "price_test_thb_monthly";
    process.env.STRIPE_TEST_PRICE_ID_THB_ANNUAL = "price_test_thb_annual";
    process.env.STRIPE_TEST_PRICE_ID_THB_LIFETIME = "price_test_thb_lifetime";
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/test",
    });
    mockPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/session/test",
    });
    mockPromotionCodesList.mockResolvedValue({ data: [], has_more: false });
    mockPricesRetrieve.mockResolvedValue({ product: "prod_getphame" });
    mockCouponsRetrieve.mockResolvedValue({
      id: "coupon_test",
      percent_off: 20,
    });
  });

  it("uses the canonical Get Phame origin when configuration or a browser supplies a legacy origin", async () => {
    const { createCheckoutSession } = await import("./stripe");

    await createCheckoutSession(BASE_PARAMS);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "https://getphame.app/payment-success?stripe=1&plan=monthly",
        cancel_url: "https://getphame.app/upgrade",
        branding_settings: expect.objectContaining({
          display_name: "Get Phame",
          icon: expect.objectContaining({
            type: "url",
            url: "https://assets.getphame.app/getphame-logo-mark.webp",
          }),
        }),
      })
    );
  });

  it("allows customer-entered promotion codes for a standard Get Phame monthly Checkout session", async () => {
    const { createCheckoutSession, getStripePriceIds } = await import(
      "./stripe"
    );

    await createCheckoutSession({
      ...BASE_PARAMS,
      origin: "https://getphame.app",
      plan: "monthly",
    });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        allow_promotion_codes: true,
        line_items: [
          { price: (await getStripePriceIds()).monthly, quantity: 1 },
        ],
      })
    );
  });

  it("resolves a campaign link to a Stripe promotion-code ID and applies it without trusting browser discount details", async () => {
    mockPromotionCodesList.mockResolvedValue({
      data: [
        {
          id: "promo_getphame_launch",
          code: "LAUNCH20",
          active: true,
          coupon: {
            id: "coupon_launch",
            percent_off: 20,
            applies_to: { products: ["prod_getphame"] },
          },
          times_redeemed: 0,
          max_redemptions: 50,
          expires_at: null,
          restrictions: { first_time_transaction: false },
          customer: null,
          created: 1_784_000_000,
        },
      ],
      has_more: false,
    });

    const { createCheckoutSession } = await import("./stripe");
    await createCheckoutSession({ ...BASE_PARAMS, promotionCode: "launch20" });

    const checkoutParams = mockCheckoutCreate.mock.calls[0][0];
    expect(mockPromotionCodesList).toHaveBeenCalledWith({
      code: "LAUNCH20",
      active: true,
      limit: 10,
    });
    expect(checkoutParams).toEqual(
      expect.objectContaining({
        discounts: [{ promotion_code: "promo_getphame_launch" }],
        cancel_url: "https://getphame.app/upgrade?promo=LAUNCH20",
        metadata: expect.objectContaining({ promotion_code: "LAUNCH20" }),
      })
    );
    expect(checkoutParams).not.toHaveProperty("allow_promotion_codes");
  });

  it("returns a concise live promotion monitor snapshot with plan eligibility and redemption state", async () => {
    mockPromotionCodesList.mockResolvedValue({
      data: [
        {
          id: "promo_monitor",
          code: "MONITOR25",
          active: true,
          coupon: {
            id: "coupon_monitor",
            percent_off: 25,
            applies_to: { products: ["prod_annual"] },
          },
          times_redeemed: 4,
          max_redemptions: 10,
          expires_at: 1_900_000_000,
          restrictions: { first_time_transaction: true },
          customer: null,
          created: 1_784_000_000,
        },
      ],
      has_more: false,
    });

    const { listStripePromotionCodes, getStripePriceIds } = await import(
      "./stripe"
    );
    const selectedPriceIds = await getStripePriceIds();
    mockPricesRetrieve.mockImplementation(async (priceId: string) => ({
      product:
        priceId === selectedPriceIds.annual ? "prod_annual" : "prod_other",
    }));

    const snapshot = await listStripePromotionCodes();

    expect(snapshot.hasMore).toBe(false);
    expect(snapshot.promotions).toEqual([
      expect.objectContaining({
        id: "promo_monitor",
        code: "MONITOR25",
        status: "active",
        discountLabel: "25% off",
        timesRedeemed: 4,
        maxRedemptions: 10,
        applicablePlans: ["annual"],
        firstTimeTransaction: true,
      }),
    ]);
  });

  it("uses the canonical Get Phame origin for PromptPay Checkout returns", async () => {
    process.env.STRIPE_TEST_PRICE_ID_THB_MONTHLY = "price_test_thb_monthly";
    const { createThbCheckoutSession } = await import("./stripe");

    await createThbCheckoutSession(BASE_PARAMS);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url:
          "https://getphame.app/payment-success?stripe=1&plan=monthly",
        cancel_url: "https://getphame.app/upgrade",
        branding_settings: expect.objectContaining({
          display_name: "Get Phame",
          icon: expect.objectContaining({
            type: "url",
            url: "https://assets.getphame.app/getphame-logo-mark.webp",
          }),
        }),
      })
    );
  });

  it("uses the canonical Get Phame origin for the Stripe Billing Portal return", async () => {
    const { createPortalSession } = await import("./stripe");

    await createPortalSession(
      "cus_test",
      "https://temporary-preview.manus.computer"
    );

    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_test",
      return_url: "https://getphame.app/settings",
    });
  });
});
