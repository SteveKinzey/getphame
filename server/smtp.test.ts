/**
 * Tests for SMTP helpers — encryption, TLS validation, host detection, and app-password hints.
 * Does NOT test live SMTP connections because those require real credentials.
 */

import { createCipheriv, createHash, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTransporter,
  decryptPassword,
  detectSmtpSettings,
  encryptPassword,
  getAppPasswordHint,
} from "./smtp";

const PRIMARY_TEST_KEY =
  "smtp-primary-test-key-with-more-than-thirty-two-characters";
const LEGACY_TEST_KEY =
  "legacy-session-test-key-with-more-than-thirty-two-characters";

function encryptLegacyPassword(plaintext: string, secret: string): string {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}${cipher.getAuthTag().toString("hex")}${encrypted.toString("hex")}`;
}

beforeEach(() => {
  vi.stubEnv("SMTP_CREDENTIAL_ENCRYPTION_KEY", PRIMARY_TEST_KEY);
  vi.stubEnv("JWT_SECRET", LEGACY_TEST_KEY);
  vi.stubEnv("ALLOW_INSECURE_SMTP_TLS", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptPassword / decryptPassword", () => {
  it("round-trips a plain password in the versioned dedicated-key format", () => {
    const plain = "MyS3cretP@ssword!";
    const encrypted = encryptPassword(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted).toMatch(/^v2:/);
    expect(decryptPassword(encrypted)).toBe(plain);
  });

  it("produces different ciphertext each time because the IV is random", () => {
    const plain = "same-password";
    const enc1 = encryptPassword(plain);
    const enc2 = encryptPassword(plain);
    expect(enc1).not.toBe(enc2);
    expect(decryptPassword(enc1)).toBe(plain);
    expect(decryptPassword(enc2)).toBe(plain);
  });

  it("handles special characters and unicode", () => {
    const plain = "P@$$w0rd!#€£¥";
    expect(decryptPassword(encryptPassword(plain))).toBe(plain);
  });

  it("does not depend on JWT_SECRET for newly encrypted credentials", () => {
    const encrypted = encryptPassword("independent-secret");
    vi.stubEnv("JWT_SECRET", "a-completely-different-session-secret-value");
    expect(decryptPassword(encrypted)).toBe("independent-secret");
  });

  it("decrypts historical JWT-secret ciphertext during managed-key rotation", () => {
    const encrypted = encryptLegacyPassword("legacy-password", LEGACY_TEST_KEY);
    expect(decryptPassword(encrypted)).toBe("legacy-password");
  });

  it("fails loudly when the dedicated encryption key is absent", () => {
    vi.stubEnv("SMTP_CREDENTIAL_ENCRYPTION_KEY", "");
    expect(() => encryptPassword("must-not-use-a-fallback")).toThrow(
      "SMTP_CREDENTIAL_ENCRYPTION_KEY"
    );
  });
});

describe("createTransporter TLS validation", () => {
  const options = {
    host: "smtp.example.test",
    port: 587,
    secure: false,
    user: "sender@example.test",
    pass: "app-password",
  };

  it("validates SMTP certificates by default", () => {
    const transporter = createTransporter(options) as unknown as {
      options: { tls: { rejectUnauthorized: boolean } };
    };
    expect(transporter.options.tls.rejectUnauthorized).toBe(true);
  });

  it("allows insecure compatibility only through the explicit opt-out", () => {
    vi.stubEnv("ALLOW_INSECURE_SMTP_TLS", "true");
    const transporter = createTransporter(options) as unknown as {
      options: { tls: { rejectUnauthorized: boolean } };
    };
    expect(transporter.options.tls.rejectUnauthorized).toBe(false);
  });
});

describe("detectSmtpSettings", () => {
  it("detects Gmail settings", () => {
    expect(detectSmtpSettings("user@gmail.com")).toEqual({
      host: "smtp.gmail.com",
      port: 587,
      secure: 0,
    });
  });

  it("detects Outlook settings", () => {
    expect(detectSmtpSettings("user@outlook.com")).toEqual({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: 0,
    });
  });

  it("detects Yahoo settings", () => {
    expect(detectSmtpSettings("user@yahoo.com")).toEqual({
      host: "smtp.mail.yahoo.com",
      port: 587,
      secure: 0,
    });
  });

  it("detects Zoho settings", () => {
    expect(detectSmtpSettings("user@zoho.com")).toEqual({
      host: "smtp.zoho.com",
      port: 587,
      secure: 0,
    });
  });

  it("returns null for unknown domains", () => {
    expect(detectSmtpSettings("user@mycompany.com")).toBeNull();
    expect(detectSmtpSettings("user@unknowndomain.xyz")).toBeNull();
  });

  it("handles uppercase email domains", () => {
    expect(detectSmtpSettings("user@GMAIL.COM")).toEqual({
      host: "smtp.gmail.com",
      port: 587,
      secure: 0,
    });
  });

  it("returns null for malformed emails", () => {
    expect(detectSmtpSettings("notanemail")).toBeNull();
    expect(detectSmtpSettings("@nodomain")).toBeNull();
  });
});

describe("getAppPasswordHint", () => {
  it("returns Gmail hint for gmail.com", () => {
    const hint = getAppPasswordHint("user@gmail.com");
    expect(hint).not.toBeNull();
    expect(hint).toContain("App Password");
    expect(hint).toContain("myaccount.google.com");
  });

  it("returns Outlook hint for outlook.com", () => {
    expect(getAppPasswordHint("user@outlook.com")).toContain("App Password");
  });

  it("returns Yahoo hint for yahoo.com", () => {
    expect(getAppPasswordHint("user@yahoo.com")).toContain("App Password");
  });

  it("returns Zoho SMTP hints for its domains and host", () => {
    expect(getAppPasswordHint("user@zoho.com")).toContain("SMTP Access");
    expect(getAppPasswordHint("user@zohomail.com")).toContain("SMTP Access");
    expect(getAppPasswordHint("user@custombiz.com", "smtp.zoho.com")).toContain(
      "SMTP Access"
    );
  });

  it("returns null for unknown providers", () => {
    expect(getAppPasswordHint("user@mycompany.com")).toBeNull();
  });
});

describe("sendWelcomeEmail", () => {
  it("is exported from smtp.ts", async () => {
    const { sendWelcomeEmail } = await import("./smtp");
    expect(typeof sendWelcomeEmail).toBe("function");
  });

  it("returns a non-throwing failure when no SMTP credentials exist for the user", async () => {
    const { sendWelcomeEmail } = await import("./smtp");
    const result = await sendWelcomeEmail(999999);
    expect(result).toHaveProperty("ok");
    if (!result.ok) expect(typeof result.error).toBe("string");
  });
});
