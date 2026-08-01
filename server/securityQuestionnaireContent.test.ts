import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function expectPopulatedSecuritySummary(value: unknown, locale: string) {
  expect(value, `${locale} security summary is missing`).toBeTruthy();
  const summary = value as Record<string, unknown>;
  for (const key of ["eyebrow", "title", "description", "cta"]) {
    expect(typeof summary[key], `${locale}.${key} must be a string`).toBe(
      "string"
    );
    expect(
      (summary[key] as string).trim().length,
      `${locale}.${key} must be populated`
    ).toBeGreaterThan(0);
  }
  for (const group of ["noSelling", "minimalData", "protected", "account"]) {
    const item = summary[group] as Record<string, unknown>;
    expect(item, `${locale}.${group} is missing`).toBeTruthy();
    expect(typeof item.title).toBe("string");
    expect(typeof item.description).toBe("string");
    expect((item.title as string).trim().length).toBeGreaterThan(0);
    expect((item.description as string).trim().length).toBeGreaterThan(0);
  }
}

describe("public security questionnaire content", () => {
  it("places a concise security summary after the homepage trust strip", () => {
    const landingPage = read("client/src/pages/LandingPage.tsx");
    const securitySummary = read(
      "client/src/components/landing/SecuritySummary.tsx"
    );

    expect(landingPage).toContain(
      'import SecuritySummary from "@/components/landing/SecuritySummary"'
    );
    expect(landingPage.indexOf("<SecuritySummary />")).toBeGreaterThan(
      landingPage.indexOf("<TrustBar />")
    );
    expect(landingPage.indexOf("<SecuritySummary />")).toBeLessThan(
      landingPage.indexOf("<VideoDemo />")
    );
    expect(securitySummary).toContain('id="privacy-and-security"');
    expect(securitySummary).toContain('href="/security"');
    expect(securitySummary).toContain('id: "no-selling"');
    expect(securitySummary).toContain('id: "minimal-data"');
    expect(securitySummary).toContain('id: "sensitive-details"');
    expect(securitySummary).toContain('id: "account-protection"');
    expect(securitySummary).toContain("key={id}");
    expect(securitySummary).not.toContain("key={title}");
    expect(securitySummary).toContain("We do not sell your data");
    expect(securitySummary).toContain("We collect only what we need");
    expect(securitySummary).toContain(
      "Your connected-email password is encrypted before storage"
    );
    expect(securitySummary).not.toMatch(/end-to-end encryption/i);
    expect(securitySummary).not.toMatch(
      /100% secure|unhackable|guaranteed security/i
    );
  });

  it("provides the complete security summary in every supported landing locale", () => {
    for (const locale of locales) {
      const catalog = JSON.parse(
        read(`client/public/locales/${locale}/landing.json`)
      );
      expectPopulatedSecuritySummary(catalog.landing.securitySummary, locale);
      const rendered = JSON.stringify(catalog.landing.securitySummary);
      expect(rendered).toContain("Get Phame");
      expect(rendered).not.toContain("GetPhame");
    }
  });

  it("keeps the linked security policy aligned with the active session and release controls", () => {
    const policy = read("client/src/pages/SecurityPolicy.tsx");

    expect(policy).toContain(
      'const LAST_UPDATED_AT = new Date("2026-08-01T00:00:00Z")'
    );
    expect(policy).toContain("new Intl.DateTimeFormat(");
    expect(policy).toContain('timeZone: "UTC"');
    expect(policy).not.toContain("const LAST_UPDATED =");
    expect(policy).toMatch(
      /opaque, revocable identifiers stored in HttpOnly, SameSite\s+cookies/
    );
    expect(policy).toContain(
      "Raw session tokens are not stored in the database"
    );
    expect(policy).toMatch(
      /Opens a pull request with validated dependency fixes for review\s+before merge/
    );
    expect(policy).toContain("a release is <em>blocked</em>");
    expect(policy).not.toContain("signed JWTs");
    expect(policy).not.toContain("all 54 unit tests");
    expect(policy).not.toContain("structurally impossible");
    expect(policy).not.toContain("GetPhame");
  });

  it("localizes every corrected security-policy fragment", () => {
    const manifest = JSON.parse(
      read("client/src/lib/autoTextManifest.json")
    ) as Array<{
      key: string;
      source: string;
      usages: Array<{ file: string }>;
    }>;
    const securityEntries = manifest.filter(entry =>
      entry.usages.some(
        usage => usage.file === "client/src/pages/SecurityPolicy.tsx"
      )
    );
    const securitySource = securityEntries
      .map(entry => entry.source)
      .join("\n");
    const correctedKeys = [
      "k_5e2808e8191196",
      "k_53ae9c4e03c0c1",
      "k_aee81bf17b95ce",
      "k_a9f385611961ed",
      "k_970594bfcc95ed",
      "k_9f8be392fdd62f",
      "k_79904b41b8d1e1",
      "k_f0ad66876e35f4",
      "k_355d331b13ae55",
      "k_4e39f38a4aae25",
      "k_b9c542bcc8905b",
      "k_b06bae2552c5fb",
      "k_fd705e4988fabe",
    ];
    const catalogs = JSON.parse(
      read("client/src/lib/autoTextTranslations.json")
    ) as Record<string, Record<string, string>>;
    const findingPrefix = manifest.find(
      entry => entry.key === "k_fd705e4988fabe"
    );

    expect(findingPrefix?.source).toBe(
      "1 moderate finding exists in a dev-only migration tool ("
    );
    expect(securitySource).not.toContain("GetPhame");
    expect(securitySource).not.toContain("signed JWTs");
    expect(securitySource).not.toContain("all 54 unit tests");
    expect(securitySource).not.toContain("structurally impossible");
    for (const locale of locales.filter(locale => locale !== "en")) {
      for (const key of correctedKeys) {
        expect(
          catalogs[locale]?.[key]?.trim().length,
          `${locale}.${key} must be translated`
        ).toBeGreaterThan(0);
        expect(catalogs[locale][key]).not.toContain("GetPhame");
      }
      expect(catalogs[locale]["k_fd705e4988fabe"]).not.toMatch(/2026/);
    }
  });
});
