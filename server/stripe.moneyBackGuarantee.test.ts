import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubscriptionRetrieve = vi.fn();
const mockSubscriptionCancel = vi.fn();
const mockSubscriptionUpdate = vi.fn();
const mockInvoiceRetrieve = vi.fn();
const mockChargeRetrieve = vi.fn();
const mockChargeList = vi.fn();
const mockRefundCreate = vi.fn();

vi.mock("stripe", () => {
  class MockStripe {
    subscriptions = {
      retrieve: mockSubscriptionRetrieve,
      cancel: mockSubscriptionCancel,
      update: mockSubscriptionUpdate,
    };
    invoices = { retrieve: mockInvoiceRetrieve };
    charges = { retrieve: mockChargeRetrieve, list: mockChargeList };
    refunds = { create: mockRefundCreate };
  }
  return { default: MockStripe };
});

const PURCHASED_AT_SECONDS = 1_700_000_000;
const PURCHASED_AT_MS = PURCHASED_AT_SECONDS * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function setOwnedSubscription(overrides: Record<string, unknown> = {}) {
  mockSubscriptionRetrieve.mockResolvedValue({
    id: "sub_owner",
    customer: "cus_owner",
    status: "active",
    created: PURCHASED_AT_SECONDS,
    latest_invoice: {
      payment_intent: {
        id: "pi_owner",
        latest_charge: "ch_owner",
      },
    },
    ...overrides,
  });
}

function setCharge(overrides: Record<string, unknown> = {}) {
  mockChargeRetrieve.mockResolvedValue({
    id: "ch_owner",
    customer: "cus_owner",
    amount: 2900,
    amount_refunded: 0,
    currency: "usd",
    ...overrides,
  });
}

describe("Stripe seven-day money-back guarantee", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_guarantee";
    setOwnedSubscription();
    setCharge();
    mockSubscriptionCancel.mockResolvedValue({
      id: "sub_owner",
      status: "canceled",
    });
    mockSubscriptionUpdate.mockResolvedValue({
      id: "sub_owner",
      customer: "cus_owner",
      cancel_at_period_end: true,
      current_period_end: PURCHASED_AT_SECONDS + 30 * 24 * 60 * 60,
    });
    mockRefundCreate.mockResolvedValue({ id: "re_owner", status: "succeeded" });
    mockChargeList.mockResolvedValue({ data: [] });
  });

  it("is eligible through the exact seven-day deadline and expires one millisecond later", async () => {
    const { getMoneyBackGuaranteeStatus } = await import("./stripe");
    const atDeadline = await getMoneyBackGuaranteeStatus({
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "sub_owner",
      now: PURCHASED_AT_MS + SEVEN_DAYS_MS,
    });
    const afterDeadline = await getMoneyBackGuaranteeStatus({
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "sub_owner",
      now: PURCHASED_AT_MS + SEVEN_DAYS_MS + 1,
    });

    expect(atDeadline).toMatchObject({
      eligible: true,
      reason: "eligible",
      amount: 2900,
      currency: "usd",
    });
    expect(afterDeadline).toMatchObject({ eligible: false, reason: "expired" });
  });

  it("rejects a subscription or charge that does not belong to the signed-in Stripe customer", async () => {
    const { getMoneyBackGuaranteeStatus } = await import("./stripe");
    setOwnedSubscription({ customer: "cus_someone_else" });

    await expect(
      getMoneyBackGuaranteeStatus({
        stripeCustomerId: "cus_owner",
        stripeSubscriptionId: "sub_owner",
        now: PURCHASED_AT_MS,
      })
    ).rejects.toThrow(/does not belong/i);

    setOwnedSubscription();
    setCharge({ customer: "cus_someone_else" });
    await expect(
      getMoneyBackGuaranteeStatus({
        stripeCustomerId: "cus_owner",
        stripeSubscriptionId: "sub_owner",
        now: PURCHASED_AT_MS,
      })
    ).rejects.toThrow(/payment does not belong/i);
  });

  it("excludes lifetime purchases without calling Stripe subscription APIs", async () => {
    const { getMoneyBackGuaranteeStatus } = await import("./stripe");
    const result = await getMoneyBackGuaranteeStatus({
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "lifetime_cs_test_123",
      now: PURCHASED_AT_MS,
    });

    expect(result).toMatchObject({ eligible: false, reason: "lifetime" });
    expect(mockSubscriptionRetrieve).not.toHaveBeenCalled();
  });

  it("creates an idempotent full refund before canceling the subscription", async () => {
    const { claimMoneyBackGuarantee } = await import("./stripe");
    const order: string[] = [];
    mockRefundCreate.mockImplementation(async () => {
      order.push("refund");
      return { id: "re_owner", status: "succeeded" };
    });
    mockSubscriptionCancel.mockImplementation(async () => {
      order.push("cancel");
      return { id: "sub_owner", status: "canceled" };
    });

    const result = await claimMoneyBackGuarantee({
      userId: 42,
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "sub_owner",
      now: PURCHASED_AT_MS + 1000,
    });

    expect(order).toEqual(["refund", "cancel"]);
    expect(mockRefundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        charge: "ch_owner",
        reason: "requested_by_customer",
      }),
      { idempotencyKey: "getphame-guarantee-sub_owner-ch_owner" }
    );
    expect(result).toMatchObject({
      refunded: true,
      alreadyRefunded: false,
      canceled: true,
      amount: 2900,
    });
  });

  it("does not create a duplicate refund and still finishes cancellation when Stripe shows the charge fully refunded", async () => {
    const { claimMoneyBackGuarantee } = await import("./stripe");
    setCharge({ amount_refunded: 2900 });

    const result = await claimMoneyBackGuarantee({
      userId: 42,
      stripeCustomerId: "cus_owner",
      stripeSubscriptionId: "sub_owner",
      now: PURCHASED_AT_MS + 1000,
    });

    expect(mockRefundCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionCancel).toHaveBeenCalledWith("sub_owner");
    expect(result).toMatchObject({ refunded: true, alreadyRefunded: true });
  });

  it("supports canceling only the next renewal without issuing a refund", async () => {
    const { cancelSubscriptionRenewal } = await import("./stripe");
    const result = await cancelSubscriptionRenewal("cus_owner", "sub_owner");

    expect(mockRefundCreate).not.toHaveBeenCalled();
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith("sub_owner", {
      cancel_at_period_end: true,
    });
    expect(result.canceledAtPeriodEnd).toBe(true);
    expect(result.currentPeriodEnd).toBe(
      PURCHASED_AT_MS + 30 * 24 * 60 * 60 * 1000
    );
  });
});
