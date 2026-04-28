/**
 * Tests for createThbCheckoutSession()
 * Verifies correct THB price ID selection per plan, PromptPay in payment methods,
 * THB currency, customer_email prefill, and missing env var guard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Stripe ───────────────────────────────────────────────────────────────
const mockSessionCreate = vi.fn();
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionCreate } },
  })),
}));

// ── Import after mocking ──────────────────────────────────────────────────────
// We import the module fresh each test via dynamic import to pick up env changes.
// For static tests we import once and manipulate the exported constant.

const BASE_PARAMS = {
  userId: 42,
  userEmail: "test@example.com",
  userName: "Test User",
  stripeCustomerId: null as string | null,
  origin: "https://getphame.app",
};

describe("createThbCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/test_thb",
    });
    // Set all three THB price env vars
    process.env.STRIPE_PRICE_ID_THB_MONTHLY = "price_monthly_thb_test";
    process.env.STRIPE_PRICE_ID_THB_ANNUAL = "price_annual_thb_test";
    process.env.STRIPE_PRICE_ID_THB_LIFETIME = "price_lifetime_thb_test";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  });

  it("returns a checkout URL string for plan=monthly", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    const url = await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly" });
    expect(typeof url).toBe("string");
    expect(url).toContain("checkout.stripe.com");
  });

  it("uses the monthly THB price ID for plan=monthly", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.line_items[0].price).toBe("price_monthly_thb_test");
  });

  it("uses the annual THB price ID for plan=annual", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "annual" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.line_items[0].price).toBe("price_annual_thb_test");
  });

  it("uses the lifetime THB price ID for plan=lifetime", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "lifetime" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.line_items[0].price).toBe("price_lifetime_thb_test");
  });

  it("includes promptpay in payment_method_types", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.payment_method_types).toContain("promptpay");
  });

  it("sets currency to thb", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.currency).toBe("thb");
  });

  it("prefills customer_email when no stripeCustomerId", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly", stripeCustomerId: null });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.customer_email).toBe("test@example.com");
  });

  it("uses customer ID instead of email when stripeCustomerId is provided", async () => {
    const { createThbCheckoutSession } = await import("./stripe");
    await createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly", stripeCustomerId: "cus_test123" });
    const call = mockSessionCreate.mock.calls[0][0];
    expect(call.customer).toBe("cus_test123");
    expect(call.customer_email).toBeUndefined();
  });

  it("throws when THB monthly price env var is missing", async () => {
    process.env.STRIPE_PRICE_ID_THB_MONTHLY = "";
    const { createThbCheckoutSession } = await import("./stripe");
    await expect(
      createThbCheckoutSession({ ...BASE_PARAMS, plan: "monthly" })
    ).rejects.toThrow(/monthly/i);
  });

  it("throws when THB annual price env var is missing", async () => {
    process.env.STRIPE_PRICE_ID_THB_ANNUAL = "";
    const { createThbCheckoutSession } = await import("./stripe");
    await expect(
      createThbCheckoutSession({ ...BASE_PARAMS, plan: "annual" })
    ).rejects.toThrow(/annual/i);
  });

  it("throws when THB lifetime price env var is missing", async () => {
    process.env.STRIPE_PRICE_ID_THB_LIFETIME = "";
    const { createThbCheckoutSession } = await import("./stripe");
    await expect(
      createThbCheckoutSession({ ...BASE_PARAMS, plan: "lifetime" })
    ).rejects.toThrow(/lifetime/i);
  });
});
