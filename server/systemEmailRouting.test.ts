import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("nodemailer", () => {
  const sendMailMock = vi.fn();
  return {
    default: {
      createTransport: vi.fn(() => ({
        sendMail: sendMailMock,
      })),
    },
    sendMailMock,
  };
});

vi.mock("@sendgrid/mail", () => {
  const sendMock = vi.fn();
  const setApiKeyMock = vi.fn();
  return {
    default: {
      setApiKey: setApiKeyMock,
      send: sendMock,
    },
    sendMock,
    setApiKeyMock,
  };
});

describe("system email priority routing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SYSTEM_SMTP_HOST;
    delete process.env.SYSTEM_SMTP_USER;
    delete process.env.SYSTEM_SMTP_PASS;
    delete process.env.SYSTEM_SMTP_PORT;
    delete process.env.SENDGRID_API_KEY;
    delete process.env.ALLOW_INSECURE_SMTP_TLS;
  });

  it("routes through primary SYSTEM_SMTP_* when both SMTP and SendGrid are configured", async () => {
    process.env.SYSTEM_SMTP_HOST = "smtp.resend.com";
    process.env.SYSTEM_SMTP_PORT = "465";
    process.env.SYSTEM_SMTP_USER = "resend";
    process.env.SYSTEM_SMTP_PASS = "re_test_secret";
    process.env.SENDGRID_API_KEY = "SG.test_backup_key";

    const { sendSystemEmail } = await import("./sendgrid");
    const transport = nodemailer.createTransport as unknown as ReturnType<typeof vi.fn>;
    const sendMail = (transport() as { sendMail: ReturnType<typeof vi.fn> }).sendMail;

    sendMail.mockResolvedValueOnce({ messageId: "smtp-msg-123" });

    await sendSystemEmail({
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: "re_test_secret" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      }),
    );
    expect(sgMail.send).not.toHaveBeenCalled();
    expect(sgMail.setApiKey).not.toHaveBeenCalled();
  });

  it("routes through backup SendGrid when SYSTEM_SMTP_* is absent", async () => {
    process.env.SENDGRID_API_KEY = "SG.test_backup_key";

    const { sendSystemEmail } = await import("./sendgrid");

    (sgMail.send as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { statusCode: 202 },
      {},
    ]);

    await sendSystemEmail({
      to: "recipient@example.com",
      subject: "Test Backup SendGrid",
      html: "<p>Backup Hello</p>",
    });

    expect(sgMail.setApiKey).toHaveBeenCalledWith("SG.test_backup_key");
    expect(sgMail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        subject: "Test Backup SendGrid",
        html: "<p>Backup Hello</p>",
      }),
    );
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it("skips and logs a warning when neither primary SMTP nor backup SendGrid are configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendSystemEmail } = await import("./sendgrid");

    await sendSystemEmail({
      to: "recipient@example.com",
      subject: "No Config",
      html: "<p>Empty</p>",
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("neither primary SYSTEM_SMTP_* nor backup SENDGRID_API_KEY are configured"),
    );
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sgMail.send).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
