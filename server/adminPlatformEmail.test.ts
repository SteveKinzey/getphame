import { describe, expect, it } from "vitest";
import { buildSmtpOnboardingTemplate, sanitizeAdminMessage } from "./adminPlatformEmail";

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
});
