import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const localeRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/public/locales",
);

const authoredLandingLocales = ["en", "th", "zh-TW", "zh-CN", "fr", "es"] as const;

function readLanding(locale: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(localeRoot, locale, "landing.json"), "utf8"),
  ) as Record<string, unknown>;
}

function flattenStrings(value: unknown, prefix = ""): Map<string, string> {
  const result = new Map<string, string>();
  if (!value || typeof value !== "object") return result;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") {
      result.set(childPath, child);
    } else {
      for (const [nestedPath, nestedValue] of flattenStrings(child, childPath)) {
        result.set(nestedPath, nestedValue);
      }
    }
  }
  return result;
}

function landingStrings(locale: string): Map<string, string> {
  return flattenStrings(readLanding(locale).landing);
}

describe("landing locale coverage", () => {
  const english = landingStrings("en");
  const requiredPurposeKeys = [
    "purpose.title",
    "purpose.description",
    "purpose.steps.customers",
    "purpose.steps.send",
    "purpose.steps.reviews",
    "purpose.googleTitle",
    "purpose.googleDescription",
    "purpose.googleSendingNote",
    "purpose.privacyLink",
  ] as const;

  for (const locale of authoredLandingLocales) {
    it(`${locale} contains every landing string`, () => {
      const localized = landingStrings(locale);
      expect([...localized.keys()].sort()).toEqual([...english.keys()].sort());

      for (const [key, value] of localized) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    });

    it(`${locale} explains the app purpose and Google sign-in data use`, () => {
      const localized = landingStrings(locale);

      for (const key of requiredPurposeKeys) {
        expect(localized.get(key)?.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    });
  }

  it("English disclosure names the Google data received and excluded services", () => {
    const disclosure = english.get("purpose.googleDescription") ?? "";
    const sendingNote = english.get("purpose.googleSendingNote") ?? "";

    expect(disclosure).toContain("name and email address");
    expect(disclosure).toContain("Gmail messages");
    expect(disclosure).toContain("Google Drive files");
    expect(disclosure).toContain("Google Calendar");
    expect(sendingNote).toContain("configured separately");
  });

  for (const locale of ["es", "zh-CN", "zh-TW"] as const) {
    it(`${locale} uses localized hero and rolling allowance copy`, () => {
      const localized = landingStrings(locale);
      const hero = localized.get("hero.headlinePart1");
      const allowance = localized.get("pricing.free.features.requests");

      expect(hero).not.toBe(english.get("hero.headlinePart1"));
      expect(allowance).not.toContain("initial review requests");
      expect(allowance).toContain("10");
      expect(allowance).toContain("5");
      expect(allowance).toContain("30");
    });
  }

  it("keeps substantial authored Italian landing copy with English fallback for missing keys", () => {
    const italian = landingStrings("it");
    expect(italian.size).toBeGreaterThan(150);
    expect(italian.get("hero.headlinePart1")?.trim().length).toBeGreaterThan(0);
    for (const key of requiredPurposeKeys) {
      expect(italian.get(key)?.trim().length, `it:${key}`).toBeGreaterThan(0);
    }

    const i18nSource = fs.readFileSync(
      path.resolve(localeRoot, "../../src/lib/i18n.ts"),
      "utf8",
    );
    expect(i18nSource).toContain('fallbackLng: "en"');
  });

  it("renders the purpose disclosure directly after the public hero", () => {
    const landingPageSource = fs.readFileSync(
      path.resolve(localeRoot, "../../src/pages/LandingPage.tsx"),
      "utf8",
    );

    expect(landingPageSource).toContain(
      'import AppPurpose from "@/components/landing/AppPurpose"',
    );
    expect(landingPageSource.indexOf("<AppPurpose />")).toBeGreaterThan(
      landingPageSource.indexOf("<Hero />"),
    );
  });

  it("uses the configured landing namespace in every translated landing component", () => {
    const componentsRoot = path.resolve(localeRoot, "../../src/components/landing");
    const componentSources = fs.readdirSync(componentsRoot)
      .filter(file => file.endsWith(".tsx"))
      .map(file => ({
        file,
        source: fs.readFileSync(path.join(componentsRoot, file), "utf8"),
      }));

    for (const { file, source } of componentSources) {
      const explicitNamespaces = [...source.matchAll(/useTranslation\(\s*["']([^"']+)["']\s*\)/g)]
        .map(match => match[1]);
      expect(
        explicitNamespaces.every(namespace => namespace === "landing"),
        `${file} requests an unconfigured landing namespace: ${explicitNamespaces.join(", ")}`,
      ).toBe(true);
    }
  });
});
