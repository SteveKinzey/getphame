import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  BULK_SENDER_PRESETS,
  BULK_SENDER_PROVIDER_IDS,
  resolveBulkSenderHost,
  resolveBulkSenderUsername,
} from "../shared/bulkSenderPresets";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";
import { resolveSafeCustomSmtpHost } from "./bulkSender";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

const settingsSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Settings.tsx"),
  "utf8"
);
const providerDiscoveryControlsSource = readFileSync(
  resolve(
    process.cwd(),
    "client/src/components/BulkProviderDiscoveryControls.tsx"
  ),
  "utf8"
);
const providerSetupGuideSource = readFileSync(
  resolve(process.cwd(), "client/src/components/BulkProviderSetupGuide.tsx"),
  "utf8"
);
const mailDeliveryNoticeSource = readFileSync(
  resolve(process.cwd(), "client/src/components/MailDeliveryStateNotice.tsx"),
  "utf8"
);
const serverSource = readFileSync(
  resolve(process.cwd(), "server/bulkSender.ts"),
  "utf8"
);
const schemaSource = readFileSync(
  resolve(process.cwd(), "drizzle/schema.ts"),
  "utf8"
);
const deliveryRoutingSource = readFileSync(
  resolve(process.cwd(), "server/outboundDeliveryChannel.ts"),
  "utf8"
);
const presetDocsSource = readFileSync(
  resolve(process.cwd(), "docs/bulk-sender-smtp-presets.md"),
  "utf8"
);
const mailjetResearchSource = readFileSync(
  resolve(process.cwd(), "docs/mailjet-smtp-research.md"),
  "utf8"
);
const supportedLocales = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;

describe("Bulk Sender provider presets", () => {
  it("ships the full user-owned bulk provider catalog, including SendGrid and Mailjet", () => {
    expect(BULK_SENDER_PROVIDER_IDS).toHaveLength(13);
    expect(Object.keys(BULK_SENDER_PRESETS)).toEqual([
      ...BULK_SENDER_PROVIDER_IDS,
    ]);
    expect(BULK_SENDER_PROVIDER_IDS).toContain("mailjet");
    expect(BULK_SENDER_PROVIDER_IDS).toContain("sendgrid");
    expect(BULK_SENDER_PRESETS.sendgrid.fixedUsername).toBe("apikey");
    expect(BULK_SENDER_PRESETS.sendgrid.secretHelp).toContain(
      "own SendGrid account"
    );
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
    expect(resolveBulkSenderHost("amazon_ses", "eu-west-1")).toBe(
      "email-smtp.eu-west-1.amazonaws.com"
    );
    expect(resolveBulkSenderHost("mailgun", "eu")).toBe("smtp.eu.mailgun.org");
    expect(resolveBulkSenderHost("smtp2go", "au")).toBe("mail-au.smtp2go.com");
    expect(resolveBulkSenderHost("sparkpost", "eu")).toBe(
      "smtp.eu.sparkpostmail.com"
    );
  });

  it("applies supported fixed and token-as-username provider semantics without a second secret field", () => {
    expect(resolveBulkSenderUsername("sparkpost", "ignored", "secret")).toBe(
      "SMTP_Injection"
    );
    expect(
      resolveBulkSenderUsername("postmark", "ignored", "server-token")
    ).toBe("server-token");
    expect(
      resolveBulkSenderUsername("amazon_ses", " ses-user ", "secret")
    ).toBe("ses-user");
  });

  it("uses Mailjet's official relay, STARTTLS submission port, and API-key credentials", () => {
    const mailjet = BULK_SENDER_PRESETS.mailjet;
    expect(mailjet.defaultHost).toBe("in-v3.mailjet.com");
    expect(mailjet.defaultPort).toBe(587);
    expect(mailjet.defaultSecurity).toBe("starttls");
    expect(mailjet.usernameMode).toBe("user");
    expect(mailjet.usernameLabel).toBe("Mailjet API key");
    expect(mailjet.secretLabel).toBe("Mailjet Secret key");
    expect(mailjet.secretHelp).toContain(
      "Do not use your Mailjet account password"
    );
    expect(
      resolveBulkSenderUsername("mailjet", " public-api-key ", "secret-key")
    ).toBe("public-api-key");
  });

  it("documents Mailjet using current official sources and no credential values", () => {
    for (const source of [presetDocsSource, mailjetResearchSource]) {
      expectSourceContract(source).toContain(
        "https://dev.mailjet.com/smtp-relay/configuration/"
      );
      expectSourceContract(source).toContain("in-v3.mailjet.com");
      expect(source).not.toMatch(/mj-[a-z0-9]{20,}/i);
    }
    expectSourceContract(mailjetResearchSource).toContain(
      "Senders and domains"
    );
  });
});

describe("Bulk Sender transport safeguards", () => {
  it("rejects local and private custom SMTP destinations before authentication", async () => {
    await expect(resolveSafeCustomSmtpHost("localhost")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(resolveSafeCustomSmtpHost("127.0.0.1")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(
      resolveSafeCustomSmtpHost("smtp.example.com/path")
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("verifies SMTP without sending, enforces trusted TLS, and returns safe categorized errors", () => {
    expectSourceContract(serverSource).toContain("await transporter.verify()");
    expectSourceContract(serverSource).toContain("rejectUnauthorized: true");
    expectSourceContract(serverSource).toContain("connectionTimeout: 10_000");
    expect(serverSource).not.toContain("transporter.sendMail");
    expectSourceContract(serverSource).toContain(
      "Authentication failed. Check the provider-specific username and secret."
    );
    expect(serverSource).not.toContain("message: error.message");
    expectSourceContract(serverSource).toContain(
      'value.provider === "mailjet"'
    );
    expectSourceContract(serverSource).toContain("!value.smtpUsername?.trim()");
  });

  it("encrypts the secret at rest and never returns it from the status procedure", () => {
    expectSourceContract(serverSource).toContain(
      "apiKey: encryptPassword(secret)"
    );
    const statusBlock = serverSource.slice(
      serverSource.indexOf("status: protectedProcedure"),
      serverSource.indexOf("connect: protectedProcedure")
    );
    expect(statusBlock).not.toContain("credentials.apiKey");
    expect(statusBlock).not.toContain("credentials.secret");
  });

  it("keeps legacy provider fields while adding the SMTP metadata contract", () => {
    expectSourceContract(schemaSource).toContain('"mailgunDomain"');
    expectSourceContract(schemaSource).toContain('varchar("smtpHost"');
    expectSourceContract(schemaSource).toContain('integer("smtpPort"');
    expectSourceContract(schemaSource).toContain('varchar("smtpUsername"');
    expectSourceContract(schemaSource).toContain('varchar("providerRegion"');
  });

  it("requires an explicit user-owned channel, permits verified user SendGrid SMTP, and blocks legacy platform-style SendGrid", () => {
    expectSourceContract(deliveryRoutingSource).toContain(
      'preference?.selectedChannel === "bulk"'
    );
    expectSourceContract(deliveryRoutingSource).toContain(
      'preference?.selectedChannel !== "personal"'
    );
    expectSourceContract(deliveryRoutingSource).toContain(
      'bulk.provider === "sendgrid" && !(bulk.smtpHost && bulk.smtpPort && bulk.smtpUsername)'
    );
    expect(serverSource).toMatch(
      /credentials\.provider\s*===\s*["']sendgrid["']\s*&&\s*!\s*\(\s*credentials\.smtpHost\s*&&\s*credentials\.smtpPort\s*&&\s*credentials\.smtpUsername\s*\)/s
    );
    expectSourceContract(serverSource).toContain(
      "legacyPlatformConnection: true as const"
    );
    expectSourceContract(serverSource).toContain(
      'selectedForOutreach: activeChannel?.type === "bulk"'
    );
    expectSourceContract(serverSource).toContain(
      'await selectOutboundDeliveryChannel(ctx.user.id, "bulk")'
    );
  });
});

describe("Bulk Sender Settings experience", () => {
  it("uses guided provider presets, accessible fields, and a single verify-and-connect action", () => {
    expectSourceContract(settingsSource).toContain(
      "BulkProviderDiscoveryControls"
    );
    expectSourceContract(providerDiscoveryControlsSource).toContain(
      "BULK_SENDER_PROVIDER_IDS.filter"
    );
    expectSourceContract(providerDiscoveryControlsSource).toContain(
      'id="bulk-sender-provider-search"'
    );
    expectSourceContract(providerDiscoveryControlsSource).toContain(
      'id="bulk-sender-provider"'
    );
    expectSourceContract(providerSetupGuideSource).toContain(
      'data-testid="provider-credential-note"'
    );
    expectSourceContract(providerSetupGuideSource).toContain(
      'data-testid="provider-verification-note"'
    );
    expectSourceContract(providerSetupGuideSource).toContain("preset.docsUrl");
    expectSourceContract(settingsSource).toContain('id="bulk-sender-secret"');
    expectSourceContract(settingsSource).toContain(
      'id="bulk-sender-from-email"'
    );
    expectSourceContract(settingsSource).toContain("Connect and test");
    expectSourceContract(settingsSource).toContain(
      "Credentials are tested without sending a message"
    );
    expectSourceContract(mailDeliveryNoticeSource).toContain(
      "Active for customer review requests"
    );
    expectSourceContract(mailDeliveryNoticeSource).toContain(
      "Needs attention — update your SMTP details and reconnect"
    );
  });

  it("shows a legacy-mode migration notice without exposing stored credentials", () => {
    expectSourceContract(settingsSource).toContain(
      'status.connectionMode === "legacy_api"'
    );
    expectSourceContract(settingsSource).toContain("legacy API mode");
    expect(settingsSource).not.toContain("status.apiKey");
    expect(settingsSource).not.toContain("status.secret");
  });

  it("localizes Mailjet labels and guidance in every catalog and synchronous fallback", () => {
    expectSourceContract(providerDiscoveryControlsSource).toContain(
      'provider === "mailjet"'
    );
    expectSourceContract(providerDiscoveryControlsSource).toContain(
      "settings.bulkSender.providers.mailjet.secretHelp"
    );
    expectSourceContract(settingsSource).toContain("fromEmailIsValid");

    for (const locale of supportedLocales) {
      const catalog = JSON.parse(
        readFileSync(
          resolve(
            process.cwd(),
            `client/public/locales/${locale}/translation.json`
          ),
          "utf8"
        )
      );
      const maintained = catalog.settings.bulkSender.providers.mailjet;
      const fallback = (
        (directKeyFallbackResources[locale] as Record<string, unknown>)
          .settings as Record<string, unknown>
      ).bulkSender as Record<string, unknown>;
      const fallbackMailjet = (fallback.providers as Record<string, unknown>)
        .mailjet as Record<string, unknown>;
      expect(maintained.label).toBe("Mailjet");
      expect(maintained.secretHelp.length).toBeGreaterThan(20);
      expect(maintained.fromEmailHelp.length).toBeGreaterThan(10);
      expect(fallbackMailjet).toEqual(maintained);
    }
  });
});
