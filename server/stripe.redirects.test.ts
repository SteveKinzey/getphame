import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();

vi.mock("stripe", () => {
  class MockStripe {
    checkout = { sessions: { create: mockCheckoutCreate } };
    billingPortal = { sessions: { create: mockPortalCreate } };
  }

  return { default: MockStripe };
});

const BASE_PARAMS = {
  userId: 42,
  userEmail: "owner@example.com",
  userName: "Get Phame Owner",
  stripeCustomerId: null as string | null,
  origin: "https://reviewlink.app",
};

describe("Stripe redirect domains", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.APP_BASE_URL = "https://reviewlink.app";
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/test" });
  });

  it("uses the canonical Get Phame origin when configuration or a browser supplies a legacy origin", async () => {
    const { createCheckoutSession } = await import("./stripe");

    await createCheckoutSession(BASE_PARAMS);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://getphame.app/payment-success?stripe=1&plan=monthly",
        cancel_url: "https://getphame.app/upgrade",
      }),
    );
  });

  it("uses the canonical Get Phame origin for PromptPay Checkout returns", async () => {
    process.env.STRIPE_PRICE_ID_THB_MONTHLY = "price_thb_monthly";
    const { createThbCheckoutSession } = await import("./stripe");

    await createThbCheckoutSession(BASE_PARAMS);

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://getphame.app/payment-success?stripe=1&plan=monthly",
        cancel_url: "https://getphame.app/upgrade",
      }),
    );
  });

  it("uses the canonical Get Phame origin for the Stripe Billing Portal return", async () => {
    const { createPortalSession } = await import("./stripe");

    await createPortalSession("cus_test", "https://temporary-preview.manus.computer");

    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_test",
      return_url: "https://getphame.app/settings",
    });
  });
});
