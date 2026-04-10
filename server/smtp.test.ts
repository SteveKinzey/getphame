/**
 * Tests for SMTP helpers — encryption, host detection, and app-password hints.
 * Does NOT test live SMTP connections (requires real credentials).
 */

import { describe, it, expect } from "vitest";
import {
  encryptPassword,
  decryptPassword,
  detectSmtpSettings,
  getAppPasswordHint,
} from "./smtp";

describe("encryptPassword / decryptPassword", () => {
  it("round-trips a plain password", () => {
    const plain = "MyS3cretP@ssword!";
    const encrypted = encryptPassword(plain);
    expect(encrypted).not.toBe(plain);
    expect(decryptPassword(encrypted)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plain = "same-password";
    const enc1 = encryptPassword(plain);
    const enc2 = encryptPassword(plain);
    expect(enc1).not.toBe(enc2);
    // Both should still decrypt correctly
    expect(decryptPassword(enc1)).toBe(plain);
    expect(decryptPassword(enc2)).toBe(plain);
  });

  it("handles special characters and unicode", () => {
    const plain = "P@$$w0rd!#€£¥";
    expect(decryptPassword(encryptPassword(plain))).toBe(plain);
  });
});

describe("detectSmtpSettings", () => {
  it("detects Gmail settings", () => {
    const result = detectSmtpSettings("user@gmail.com");
    expect(result).toEqual({ host: "smtp.gmail.com", port: 587, secure: 0 });
  });

  it("detects Outlook settings", () => {
    const result = detectSmtpSettings("user@outlook.com");
    expect(result).toEqual({ host: "smtp-mail.outlook.com", port: 587, secure: 0 });
  });

  it("detects Yahoo settings", () => {
    const result = detectSmtpSettings("user@yahoo.com");
    expect(result).toEqual({ host: "smtp.mail.yahoo.com", port: 587, secure: 0 });
  });

  it("detects Zoho settings", () => {
    const result = detectSmtpSettings("user@zoho.com");
    expect(result).toEqual({ host: "smtp.zoho.com", port: 587, secure: 0 });
  });

  it("returns null for unknown domains", () => {
    expect(detectSmtpSettings("user@mycompany.com")).toBeNull();
    expect(detectSmtpSettings("user@unknowndomain.xyz")).toBeNull();
  });

  it("handles uppercase email domains", () => {
    const result = detectSmtpSettings("user@GMAIL.COM");
    expect(result).toEqual({ host: "smtp.gmail.com", port: 587, secure: 0 });
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
    const hint = getAppPasswordHint("user@outlook.com");
    expect(hint).not.toBeNull();
    expect(hint).toContain("App Password");
  });

  it("returns Yahoo hint for yahoo.com", () => {
    const hint = getAppPasswordHint("user@yahoo.com");
    expect(hint).not.toBeNull();
    expect(hint).toContain("App Password");
  });

  it("returns null for unknown providers", () => {
    expect(getAppPasswordHint("user@mycompany.com")).toBeNull();
    expect(getAppPasswordHint("user@zoho.com")).toBeNull();
  });
});
