import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const sendMail = vi.fn().mockResolvedValue({ messageId: "platform-message" });
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
  };
});

vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));

import { sendUserWelcomeEmail } from "./smtp";

const managedKeys = [
  "SYSTEM_SMTP_HOST",
  "SYSTEM_SMTP_PORT",
  "SYSTEM_SMTP_USER",
  "SYSTEM_SMTP_PASS",
  "SYSTEM_FROM_EMAIL",
] as const;

describe("platform first-account welcome delivery", () => {
  const prior = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of managedKeys) prior.set(key, process.env[key]);
    Object.assign(process.env, {
      SYSTEM_SMTP_HOST: "smtp.platform.example",
      SYSTEM_SMTP_PORT: "587",
      SYSTEM_SMTP_USER: "no-reply@platform.example",
      SYSTEM_SMTP_PASS: "managed-platform-password",
      SYSTEM_FROM_EMAIL: "no-reply@platform.example",
    });
    mocks.createTransport.mockClear();
    mocks.sendMail.mockClear();
  });

  afterEach(() => {
    for (const key of managedKeys) {
      const value = prior.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("never reads a connected owner mailbox for a first-account administrative notice", async () => {
    await sendUserWelcomeEmail({
      ownerUserId: 987654,
      toEmail: "new-account@example.com",
      toName: "New Account",
    });

    expect(mocks.createTransport).toHaveBeenCalledWith({
      host: "smtp.platform.example",
      port: 587,
      secure: false,
      auth: {
        user: "no-reply@platform.example",
        pass: "managed-platform-password",
      },
      tls: { rejectUnauthorized: true },
    });
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: '"Get Phame" <no-reply@platform.example>',
      replyTo: "no-reply@platform.example",
      to: "new-account@example.com",
      subject: "Welcome to Get Phame! 🚀",
    }));
  });
});
