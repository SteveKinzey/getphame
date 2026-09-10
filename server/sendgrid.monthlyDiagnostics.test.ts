import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  smtpSend: vi.fn(),
  createTransport: vi.fn(),
  sendgridSend: vi.fn(),
  setApiKey: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));
vi.mock("@sendgrid/mail", () => ({
  default: { send: mocks.sendgridSend, setApiKey: mocks.setApiKey },
}));
vi.mock("./relayHealth", () => ({
  recordRelayEvent: vi.fn(),
  reserveRelayAlert: vi.fn(),
  sanitizeRelayDiagnostic: vi.fn((value: string) => value),
  sendSlackWebhookNotification: vi.fn(),
  startRelayOutage: vi.fn(),
}));
vi.mock("./relayAlertEmail", () => ({ sendRelayAlertEmailFallback: vi.fn() }));

import {
  sendSystemReportEmailOnce,
  SYSTEM_REPORT_ATTACHMENT_MAX_BYTES,
} from "./sendgrid";

const base = {
  to: "admin@example.test",
  subject: "Monthly report",
  html: "<p>Monthly report</p>",
  text: "Monthly report",
  suppressRelayAlert: true as const,
};

const attachment = {
  filename: "getphame-auth-health-2026-08.csv",
  mimeType: "text/csv" as const,
  content: "checked_at_utc\r\n2026-08-01T00:00:00.000Z\r\n",
};

describe("monthly diagnostic report transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_PORT;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
    delete process.env.SENDGRID_API_KEY;
    mocks.createTransport.mockReturnValue({ sendMail: mocks.smtpSend });
  });

  it("strictly rejects invalid count, MIME, filename, and size boundaries", async () => {
    await expect(
      sendSystemReportEmailOnce({ ...base, attachments: [] })
    ).rejects.toThrow("REPORT_ATTACHMENT_COUNT_INVALID");
    await expect(
      sendSystemReportEmailOnce({
        ...base,
        attachments: [{ ...attachment, mimeType: "text/plain" as "text/csv" }],
      })
    ).rejects.toThrow("REPORT_ATTACHMENT_INVALID");
    await expect(
      sendSystemReportEmailOnce({
        ...base,
        attachments: [{ ...attachment, filename: "../report.csv" }],
      })
    ).rejects.toThrow("REPORT_ATTACHMENT_INVALID");
    await expect(
      sendSystemReportEmailOnce({
        ...base,
        attachments: [
          {
            ...attachment,
            content: "x".repeat(SYSTEM_REPORT_ATTACHMENT_MAX_BYTES + 1),
          },
        ],
      })
    ).rejects.toThrow("REPORT_ATTACHMENT_TOO_LARGE");
  });

  it("uses configured SMTP once and does not fail over on an ambiguous error", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.example.test";
    process.env.SYSTEM_SMTP_PORT = "587";
    process.env.SYSTEM_SMTP_USER = "system";
    process.env.SYSTEM_SMTP_PASS = "secret";
    process.env.SENDGRID_API_KEY = "backup-key";
    mocks.smtpSend.mockRejectedValue(new Error("ambiguous"));

    await expect(
      sendSystemReportEmailOnce({ ...base, attachments: [attachment] })
    ).rejects.toThrow("ambiguous");
    expect(mocks.smtpSend).toHaveBeenCalledTimes(1);
    expect(mocks.sendgridSend).not.toHaveBeenCalled();
  });

  it("maps at most two CSV attachments to SendGrid base64 and returns metadata only", async () => {
    process.env.SENDGRID_API_KEY = "sendgrid-key";
    mocks.sendgridSend.mockResolvedValue([
      { headers: { "x-message-id": "message-123" } },
    ]);

    await expect(
      sendSystemReportEmailOnce({ ...base, attachments: [attachment] })
    ).resolves.toEqual({ provider: "sendgrid", messageId: "message-123" });
    expect(mocks.sendgridSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.test",
        attachments: [
          expect.objectContaining({
            filename: attachment.filename,
            type: "text/csv",
            disposition: "attachment",
            content: Buffer.from(attachment.content, "utf8").toString("base64"),
          }),
        ],
      })
    );
  });
});
