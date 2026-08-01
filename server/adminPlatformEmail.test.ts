import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTransporter: vi.fn(),
}));

vi.mock("./smtp", () => ({
  createTransporter: mocks.createTransporter,
}));

import { buildSmtpOnboardingTemplate, sanitizeAdminMessage, sendAdminPlatformEmail } from "./adminPlatformEmail";

describe("administrator platform email", () => {
  it("builds an editable safe SMTP onboarding template for common providers", () => {
    const template = buildSmtpOnboardingTemplate("Alex");
    expect(template.subject).toContain("Get Phame");
    expect(template.bodyText).toContain("Gmail or Google Workspace");
    expect(template.bodyText).toContain("Microsoft 365 / Outlook");
    expect(template.bodyText).toContain("Outlook.com, Live, or Hotmail");
    expect(template.bodyText).toContain("Yahoo!");
    expect(template.bodyText).toContain("Zoho Mail");
    expect(template.bodyText).toContain("Proton Mail Bridge");
    expect(template.bodyText).toContain("Never send your password");
  });

  it("rejects unsafe or empty message content", () => {
    expect(() => sanitizeAdminMessage({ subject: "", bodyText: "Hello" })).toThrow("Subject is required");
    expect(() => sanitizeAdminMessage({ subject: "Hello", bodyText: "" })).toThrow("Message is required");
  });

  it("treats a non-numeric managed SMTP port as missing configuration before transport creation", async () => {
    vi.stubEnv("SYSTEM_SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SYSTEM_SMTP_PORT", "not-a-port");
    vi.stubEnv("SYSTEM_SMTP_USER", "mailer");
    vi.stubEnv("SYSTEM_SMTP_PASS", "managed-secret");
    vi.stubEnv("HELLO_FROM_EMAIL", "hello@getphame.app");

    await expect(sendAdminPlatformEmail({ to: "member@example.test", subject: "Welcome", bodyText: "Hello" })).resolves.toEqual({
      sent: false,
      providerMessageId: null,
      failureCode: "not_configured",
    });
    expect(mocks.createTransporter).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });
});
