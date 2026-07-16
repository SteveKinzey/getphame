import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

import { GUIDE_PDF_URL, sendLeadGuideEmail } from "./leadGuideEmail";

const smtpEnv = {
  SYSTEM_SMTP_HOST: "smtp.example.test",
  SYSTEM_SMTP_PORT: "465",
  SYSTEM_SMTP_USER: "system-user",
  SYSTEM_SMTP_PASS: "system-secret",
  SYSTEM_FROM_EMAIL: "guides@getphame.app",
};

const originalEnv = Object.fromEntries(
  Object.keys(smtpEnv).map((key) => [key, process.env[key]]),
);

describe("lead guide email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, smtpEnv);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses the permanent branded R2 PDF and reports provider acceptance honestly", async () => {
    sendMail.mockResolvedValue({
      accepted: ["recipient@example.com"],
      rejected: [],
      messageId: "provider-message-123",
      response: "250 queued",
    });

    const result = await sendLeadGuideEmail("recipient@example.com");

    expect(GUIDE_PDF_URL).toBe("https://assets.getphame.app/getphame-30-day-review-playbook.pdf");
    expect(result).toEqual({
      sent: true,
      providerMessageId: "provider-message-123",
      responseCode: 250,
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: "recipient@example.com",
      html: expect.stringContaining(GUIDE_PDF_URL),
      text: expect.stringContaining(GUIDE_PDF_URL),
    }));
  });

  it("does not claim success when the provider rejects every recipient", async () => {
    sendMail.mockResolvedValue({
      accepted: [],
      rejected: ["recipient@example.com"],
      messageId: "provider-message-456",
      response: "550 recipient rejected",
    });

    await expect(sendLeadGuideEmail("recipient@example.com")).resolves.toEqual({
      sent: false,
      providerMessageId: "provider-message-456",
      responseCode: 550,
      error: "Email provider did not accept the recipient",
    });
  });

  it("keeps the direct-download flow available when system SMTP is unavailable", async () => {
    delete process.env.SYSTEM_SMTP_HOST;

    await expect(sendLeadGuideEmail("recipient@example.com")).resolves.toEqual({
      sent: false,
      error: "System SMTP not configured",
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
