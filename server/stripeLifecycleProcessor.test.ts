import { describe, expect, it, vi } from "vitest";
import {
  processStripeLifecycleEmails,
  STRIPE_LIFECYCLE_BATCH_LIMIT,
} from "./stripeLifecycleProcessor";

function outbox(id: number) {
  return {
    id,
    userId: 42,
    stripeSubscriptionId: "sub_123",
    stripeInvoiceId: null,
    sequenceKey: `trial:${id}`,
    kind: "trial-ending",
    locale: "en",
    state: "attempted",
    scheduledAt: 1,
    attemptedAt: 1,
    sentAt: null,
    provider: null,
    providerMessageId: null,
    errorCode: null,
    createdAt: 1,
    updatedAt: 1,
  } as const;
}

function deps() {
  return {
    assertConfigured: vi.fn(() => "sendgrid" as const),
    claimDue: vi.fn(),
    getContext: vi.fn(async () => ({
      outbox: outbox(1),
      email: "owner@example.com",
      accountName: "Alex",
      businessName: "Bakery",
    })),
    finish: vi.fn(async () => undefined),
    send: vi.fn(async () => ({
      provider: "sendgrid" as const,
      messageId: "msg_123",
    })),
  };
}

describe("Stripe lifecycle outbox processor", () => {
  it("checks transport readiness before any outbox claim", async () => {
    const mock = deps();
    mock.assertConfigured.mockImplementation(() => {
      throw new Error("SYSTEM_MAIL_NOT_CONFIGURED");
    });
    await expect(processStripeLifecycleEmails(100, mock)).rejects.toThrow(
      "SYSTEM_MAIL_NOT_CONFIGURED"
    );
    expect(mock.claimDue).not.toHaveBeenCalled();
  });

  it("records provider failure as terminal failed without an automatic retry", async () => {
    const mock = deps();
    mock.claimDue.mockResolvedValueOnce(outbox(1)).mockResolvedValueOnce(null);
    mock.send.mockRejectedValueOnce(new Error("ambiguous network failure"));
    await expect(processStripeLifecycleEmails(100, mock)).resolves.toEqual({
      checked: 1,
      sent: 0,
      failed: 1,
    });
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(mock.finish).toHaveBeenCalledWith({
      outboxId: 1,
      state: "failed",
      errorCode: "LIFECYCLE_DELIVERY_FAILED",
      now: 100,
    });
  });

  it("enforces the hard batch bound of 25 claimed records", async () => {
    const mock = deps();
    mock.claimDue.mockImplementation(async () =>
      outbox(mock.claimDue.mock.calls.length)
    );
    const result = await processStripeLifecycleEmails(100, mock);
    expect(result.checked).toBe(STRIPE_LIFECYCLE_BATCH_LIMIT);
    expect(mock.claimDue).toHaveBeenCalledTimes(STRIPE_LIFECYCLE_BATCH_LIMIT);
    expect(mock.send).toHaveBeenCalledTimes(STRIPE_LIFECYCLE_BATCH_LIMIT);
  });
});
