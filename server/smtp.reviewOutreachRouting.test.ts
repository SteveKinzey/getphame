import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "review-message" });
  return {
    assertReviewOutreachAllowed: vi.fn(),
    resolveOutboundDeliveryChannel: vi.fn(),
    reserveAdaptiveSendCapacity: vi.fn().mockResolvedValue({ allowed: true }),
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
  };
});

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("./signupRisk", () => ({ assertReviewOutreachAllowed: mocks.assertReviewOutreachAllowed }));
vi.mock("./outboundDeliveryChannel", () => ({ resolveOutboundDeliveryChannel: mocks.resolveOutboundDeliveryChannel }));
vi.mock("./adaptiveSendLimits", () => ({ reserveAdaptiveSendCapacity: mocks.reserveAdaptiveSendCapacity }));

import { encryptPassword, sendMailViaSmtp } from "./smtp";

describe("review outreach sender routing", () => {
  const previousEncryptionKey = process.env.SMTP_CREDENTIAL_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SMTP_CREDENTIAL_ENCRYPTION_KEY = "test-smtp-encryption-key-that-is-long-enough";
    mocks.assertReviewOutreachAllowed.mockReset();
    mocks.assertReviewOutreachAllowed.mockResolvedValue(undefined);
    mocks.resolveOutboundDeliveryChannel.mockReset();
    mocks.reserveAdaptiveSendCapacity.mockClear();
    mocks.createTransport.mockClear();
    mocks.sendMail.mockClear();
  });

  afterEach(() => {
    if (previousEncryptionKey === undefined) delete process.env.SMTP_CREDENTIAL_ENCRYPTION_KEY;
    else process.env.SMTP_CREDENTIAL_ENCRYPTION_KEY = previousEncryptionKey;
  });

  it("blocks restricted accounts before resolving any sender or attempting a platform fallback", async () => {
    mocks.assertReviewOutreachAllowed.mockRejectedValue(new Error("Review outreach is temporarily unavailable for this account."));

    await expect(sendMailViaSmtp({
      userId: 71,
      to: "customer@example.test",
      subject: "A review request",
      html: "<p>Thank you</p>",
      safetyMode: "review_request",
    })).rejects.toThrow("Review outreach is temporarily unavailable");

    expect(mocks.resolveOutboundDeliveryChannel).not.toHaveBeenCalled();
    expect(mocks.createTransport).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("uses the verified user-owned channel for allowed review outreach", async () => {
    mocks.resolveOutboundDeliveryChannel.mockResolvedValue({
      key: "personal:22:custom_smtp",
      type: "personal",
      providerId: "custom_smtp",
      providerLabel: "Connected SMTP",
      connectedAt: Date.now(),
      tier: "pro",
      host: "smtp.owner.example",
      port: 587,
      secure: false,
      username: "owner@example.test",
      encryptedSecret: encryptPassword("owner-mailbox-password"),
      fromEmail: "owner@example.test",
      fromName: "Owner Business",
      replyTo: "owner@example.test",
    });

    await sendMailViaSmtp({
      userId: 72,
      to: "customer@example.test",
      subject: "A review request",
      html: "<p>Thank you</p>",
      safetyMode: "review_request",
    });

    expect(mocks.assertReviewOutreachAllowed).toHaveBeenCalledWith(72);
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.owner.example",
      auth: { user: "owner@example.test", pass: "owner-mailbox-password" },
    }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: '"Owner Business" <owner@example.test>',
      replyTo: "owner@example.test",
      to: "customer@example.test",
    }));
  });
});
