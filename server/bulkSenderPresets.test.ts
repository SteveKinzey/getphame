import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BULK_SENDER_PRESETS,
  BULK_SENDER_PROVIDER_IDS,
  resolveBulkSenderHost,
  resolveBulkSenderUsername,
} from "../shared/bulkSenderPresets";
import { resolveSafeCustomSmtpHost } from "./bulkSender";

const settingsSource = readFileSync(resolve(process.cwd(), "client/src/pages/Settings.tsx"), "utf8");
const serverSource = readFileSync(resolve(process.cwd(), "server/bulkSender.ts"), "utf8");
const schemaSource = readFileSync(resolve(process.cwd(), "drizzle/schema.ts"), "utf8");

describe("Bulk Sender provider presets", () => {
  it("ships only the 12 source-backed providers and omits the incomplete Mailjet entry", () => {
    expect(BULK_SENDER_PROVIDER_IDS).toHaveLength(12);
    expect(Object.keys(BULK_SENDER_PRESETS)).toEqual([...BULK_SENDER_PROVIDER_IDS]);
    expect(BULK_SENDER_PROVIDER_IDS).not.toContain("mailjet");
  });

  it("gives every provider safe credential guidance and an official HTTPS setup link", () => {
    for (const provider of BULK_SENDER_PROVIDER_IDS) {
      const preset = BULK_SENDER_PRESETS[provider];
      expect(preset.label.length).toBeGreaterThan(1);
      expect(preset.docsUrl).toMatch(/^https:\/\//);
      expect(preset.defaultPort).toBeGreaterThan(0);
      expect(preset.defaultPort).toBeLessThanOrEqual(65_535);
      expect(preset.secretLabel.length).toBeGreaterThan(2);
      expect(preset.secretHelp.length).toBeGreaterThan(10);
      if (provider !== "custom_smtp") expect(preset.defaultHost).toContain(".");
    }
  });

  it("resolves provider regions to the approved SMTP endpoints", () => {
    expect(resolveBulkSenderHost("amazon_ses", "eu-west-1")).toBe("email-smtp.eu-west-1.amazonaws.com");
    expect(resolveBulkSenderHost("mailgun", "eu")).toBe("smtp.eu.mailgun.org");
    expect(resolveBulkSenderHost("smtp2go", "au")).toBe("mail-au.smtp2go.com");
    expect(resolveBulkSenderHost("sparkpost", "eu")).toBe("smtp.eu.sparkpostmail.com");
  });

  it("applies fixed and token-as-username provider semantics without a second secret field", () => {
    expect(resolveBulkSenderUsername("sendgrid", "ignored", "secret")).toBe("apikey");
    expect(resolveBulkSenderUsername("sparkpost", "ignored", "secret")).toBe("SMTP_Injection");
    expect(resolveBulkSenderUsername("postmark", "ignored", "server-token")).toBe("server-token");
    expect(resolveBulkSenderUsername("amazon_ses", " ses-user ", "secret")).toBe("ses-user");
  });
});

describe("Bulk Sender transport safeguards", () => {
  it("rejects local and private custom SMTP destinations before authentication", async () => {
    await expect(resolveSafeCustomSmtpHost("localhost")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(resolveSafeCustomSmtpHost("127.0.0.1")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(resolveSafeCustomSmtpHost("smtp.example.com/path")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("verifies SMTP without sending, enforces trusted TLS, and returns safe categorized errors", () => {
    expect(serverSource).toContain("await transporter.verify()");
    expect(serverSource).toContain("rejectUnauthorized: true");
    expect(serverSource).toContain("connectionTimeout: 10_000");
    expect(serverSource).not.toContain("transporter.sendMail");
    expect(serverSource).toContain("Authentication failed. Check the provider-specific username and secret.");
    expect(serverSource).not.toContain("message: error.message");
  });

  it("encrypts the secret at rest and never returns it from the status procedure", () => {
    expect(serverSource).toContain("apiKey: encryptPassword(secret)");
    const statusBlock = serverSource.slice(
      serverSource.indexOf("status: protectedProcedure"),
      serverSource.indexOf("connect: protectedProcedure"),
    );
    expect(statusBlock).not.toContain("credentials.apiKey");
    expect(statusBlock).not.toContain("credentials.secret");
  });

  it("keeps legacy provider fields while adding the SMTP metadata contract", () => {
    expect(schemaSource).toContain('"mailgunDomain"');
    expect(schemaSource).toContain('varchar("smtpHost"');
    expect(schemaSource).toContain('integer("smtpPort"');
    expect(schemaSource).toContain('varchar("smtpUsername"');
    expect(schemaSource).toContain('varchar("providerRegion"');
  });
});

describe("Bulk Sender Settings experience", () => {
  it("uses guided provider presets, accessible fields, and a single verify-and-connect action", () => {
    expect(settingsSource).toContain("BULK_SENDER_PROVIDER_IDS.map");
    expect(settingsSource).toContain('id="bulk-sender-provider"');
    expect(settingsSource).toContain('id="bulk-sender-secret"');
    expect(settingsSource).toContain('id="bulk-sender-from-email"');
    expect(settingsSource).toContain("Connect and test");
    expect(settingsSource).toContain("Credentials are tested without sending a message");
  });

  it("shows a legacy-mode migration notice without exposing stored credentials", () => {
    expect(settingsSource).toContain('status.connectionMode === "legacy_api"');
    expect(settingsSource).toContain("legacy API mode");
    expect(settingsSource).not.toContain("status.apiKey");
    expect(settingsSource).not.toContain("status.secret");
  });
});
