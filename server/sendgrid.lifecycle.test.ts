import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  smtpSend: vi.fn(),
  createTransport: vi.fn(),
  sendgridSend: vi.fn(),
  setApiKey: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mocks.createTransport,
  },
}));
vi.mock("@sendgrid/mail", () => ({
  default: {
    send: mocks.sendgridSend,
    setApiKey: mocks.setApiKey,
  },
}));
vi.mock("./relayHealth", () => ({
  recordRelayEvent: vi.fn(),
  reserveRelayAlert: vi.fn(),
  sanitizeRelayDiagnostic: vi.fn((value: string) => value),
  sendSlackWebhookNotification: vi.fn(),
  startRelayOutage: vi.fn(),
}));
vi.mock("./relayAlertEmail", () => ({
  sendRelayAlertEmailFallback: vi.fn(),
}));

import { assertSystemMailConfigured, sendSystemEmailOnce } from "./sendgrid";

const message = {
  to: "owner@example.com",
  subject: "Notice",
  html: "<p>Notice</p>",
  text: "Notice",
};

describe("lifecycle system email transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_PORT;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
    delete process.env.SENDGRID_API_KEY;
    process.env.SYSTEM_NOREPLY_EMAIL = "no-reply@getphame.app";
    mocks.createTransport.mockReturnValue({ sendMail: mocks.smtpSend });
  });

  it("fails before delivery when no managed transport is configured", () => {
    expect(() => assertSystemMailConfigured()).toThrow(
      "SYSTEM_MAIL_NOT_CONFIGURED"
    );
  });

  it("uses full managed SMTP once and never falls through after an error", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.example.com";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SYSTEM_SMTP_USER = "system";
    process.env.SYSTEM_SMTP_PASS = "secret";
    process.env.SENDGRID_API_KEY = "sendgrid-backup";
    mocks.smtpSend.mockRejectedValue(new Error("ambiguous SMTP response"));
    await expect(sendSystemEmailOnce(message)).rejects.toThrow(
      "ambiguous SMTP response"
    );
    expect(mocks.smtpSend).toHaveBeenCalledTimes(1);
    expect(mocks.sendgridSend).not.toHaveBeenCalled();
  });

  it("uses the server-owned no-reply sender and returns only sanitized metadata", async () => {
    process.env.SENDGRID_API_KEY = "sendgrid-key";
    mocks.sendgridSend.mockResolvedValue([
      { headers: { "x-message-id": "msg_123" } },
    ]);
    await expect(sendSystemEmailOnce(message)).resolves.toEqual({
      provider: "sendgrid",
      messageId: "msg_123",
    });
    expect(mocks.sendgridSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Get Phame" <no-reply@getphame.app>',
        replyTo: "no-reply@getphame.app",
      })
    );
  });
});
