import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail })),
  },
}));

import { sendSupportMessage, SUPPORT_FROM_EMAIL, SUPPORT_TO_EMAIL } from "./supportEmail";
import { checkSupportSubmissionRateLimit, resetSupportSubmissionRateLimitForTests } from "./supportRateLimit";

const smtpEnv = {
  SYSTEM_SMTP_HOST: "smtp.resend.com",
  SYSTEM_SMTP_PORT: "465",
  SYSTEM_SMTP_USER: "resend",
  SYSTEM_SMTP_PASS: "re_test_support_key",
};

const originalEnv = Object.fromEntries(Object.keys(smtpEnv).map((key) => [key, process.env[key]]));

describe("support message delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupportSubmissionRateLimitForTests();
    Object.assign(process.env, smtpEnv);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("sends to the confirmed support inbox from hello@getphame.app with a safe reply-to", async () => {
    sendMail.mockResolvedValue({ accepted: [SUPPORT_TO_EMAIL], rejected: [] });

    await expect(sendSupportMessage({
      name: "Ava <script>",
      email: "ava@example.com",
      topic: "technical",
      subject: "Cannot import customers",
      message: "The import stops at 80%.\nCan you help?",
      submissionId: 42,
      attachment: {
        filename: "screen shot.png",
        url: "/manus-storage/support/42/screen-shot.png",
      },
    })).resolves.toEqual({ sent: true });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: `"Get Phame Support" <${SUPPORT_FROM_EMAIL}>`,
      to: SUPPORT_TO_EMAIL,
      replyTo: "ava@example.com",
      subject: "[Technical issue] Support request: Cannot import customers",
      text: expect.stringContaining("The import stops at 80%"),
      html: expect.stringContaining("&lt;script&gt;"),
    }));
    expect(sendMail.mock.calls[0]?.[0]?.text).toContain("Topic: Technical issue");
    expect(sendMail.mock.calls[0]?.[0]?.text).toContain("Screenshot: screen shot.png");
    expect(sendMail.mock.calls[0]?.[0]?.html).toContain("Reference #42");
  });

  it("does not claim delivery when the provider rejects the support inbox", async () => {
    sendMail.mockResolvedValue({ accepted: [], rejected: [SUPPORT_TO_EMAIL] });

    await expect(sendSupportMessage({
      email: "ava@example.com",
      topic: "technical",
      subject: "Help",
      message: "I need help with a setting.",
    })).resolves.toEqual({ sent: false });
  });

  it("limits anonymous form submissions without storing support message content", () => {
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).not.toThrow();
    expect(() => checkSupportSubmissionRateLimit("198.51.100.4")).toThrow("Please wait before sending another support request.");
  });
});
