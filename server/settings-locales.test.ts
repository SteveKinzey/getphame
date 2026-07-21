import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SUPPORTED_LOCALES = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;
const SELECTABLE_LOCALES = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("Settings locale coverage", () => {
  it("provides every Settings translation key in every supported locale", () => {
    const settingsSource = readProjectFile("../client/src/pages/Settings.tsx");
    const settingsKeys = Array.from(
      settingsSource.matchAll(/\bt\(\s*["']([A-Za-z0-9_.-]+)["']/g),
      match => match[1]
    ).sort();

    expect(settingsKeys.length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as unknown;

      for (const key of settingsKeys) {
        const translatedValue = getByPath(dictionary, key);
        expect(
          typeof translatedValue === "string" && translatedValue.trim().length > 0,
          `${locale} is missing Settings translation key: ${key}`
        ).toBe(true);
      }
    }
  });

  it("keeps the supported-locale lists aligned and cache-busts updated dictionaries", () => {
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");
    const languageFlyoutSource = readProjectFile("../client/src/components/LanguageFlyout.tsx");

    expect(i18nSource).toContain(
      'export const SUPPORTED_LANGS = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;'
    );
    expect(i18nSource).toContain(
      'supportedLngs: [...SUPPORTED_LANGS]'
    );
    expect(i18nSource).toContain(
      'loadPath: "/locales/{{lng}}/{{ns}}.json?v=phame17"'
    );
    expect(i18nSource).toContain('ns: ["landing", "translation", "cancellation"]');
    expect(i18nSource).toContain('fallbackNS: "landing"');

    for (const locale of SELECTABLE_LOCALES) {
      expect(
        languageFlyoutSource.includes(`code: "${locale}"`),
        `LanguageFlyout is missing supported locale: ${locale}`
      ).toBe(true);
    }

    expect(languageFlyoutSource).toContain('code: "it"');
    expect(readProjectFile("../client/public/locales/it/translation.json")).toContain('"account"');
  });

  it("provides translated public navigation, footer, and support controls around Login", () => {
    const sharedChromeSources = [
      readProjectFile("../client/src/components/landing/Navbar.tsx"),
      readProjectFile("../client/src/components/landing/Footer.tsx"),
      readProjectFile("../client/src/components/landing/SupportDialog.tsx"),
    ];
    const sharedChromeKeys = Array.from(
      new Set(
        sharedChromeSources.flatMap((source) =>
          Array.from(source.matchAll(/t\(\s*["'](landing\.(?:navbar|footer|support)\.[A-Za-z0-9_.-]+)["']/g), (match) => match[1])
        )
      )
    );

    expect(sharedChromeKeys.length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/landing.json`)
      ) as unknown;

      for (const key of sharedChromeKeys) {
        const translatedValue = getByPath(dictionary, key);
        expect(
          typeof translatedValue === "string" && translatedValue.trim().length > 0,
          `${locale} is missing public login chrome translation key: ${key}`
        ).toBe(true);
      }
    }
  });

  it("provides the complete translated Compliance Guide contract in every supported locale", () => {
    const complianceSource = readProjectFile("../client/src/pages/Compliance.tsx");
    const complianceKeys = Array.from(
      new Set(
        Array.from(
          complianceSource.matchAll(/guide\(\s*["']([A-Za-z0-9_.-]+)["']/g),
          (match) => `complianceGuide.${match[1]}`
        )
      )
    );

    expect(complianceKeys.length).toBeGreaterThan(40);

    const englishDictionary = JSON.parse(
      readProjectFile("../client/public/locales/en/translation.json")
    ) as unknown;

    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = JSON.parse(
        readProjectFile(`../client/public/locales/${locale}/translation.json`)
      ) as unknown;

      for (const key of complianceKeys) {
        const translatedValue = getByPath(dictionary, key);
        expect(
          typeof translatedValue === "string" && translatedValue.trim().length > 0,
          `${locale} is missing Compliance Guide translation key: ${key}`
        ).toBe(true);
      }

      if (locale !== "en") {
        expect(
          getByPath(dictionary, "complianceGuide.title"),
          `${locale} Compliance Guide title must not fall back to English`
        ).not.toBe(getByPath(englishDictionary, "complianceGuide.title"));
        expect(
          getByPath(dictionary, "complianceGuide.subtitle"),
          `${locale} Compliance Guide subtitle must not fall back to English`
        ).not.toBe(getByPath(englishDictionary, "complianceGuide.subtitle"));
      }
    }
  });

  it("allows a valid URL language override without replacing a visitor’s saved preference", () => {
    const i18nSource = readProjectFile("../client/src/lib/i18n.ts");
    const languageFlyoutSource = readProjectFile("../client/src/components/LanguageFlyout.tsx");

    expect(i18nSource).toContain('function getLangFromQuery(): SupportedLang | null');
    expect(i18nSource).toContain('new URLSearchParams(window.location.search).get("lang")');
    expect(i18nSource).toContain("const queryLang = getLangFromQuery()");
    expect(i18nSource).toContain("if (queryLang) {");
    expect(i18nSource).toContain("if (!queryLang && !userChosen && browserLang === \"en\")");
    expect(languageFlyoutSource).toContain("const active = i18n.resolvedLanguage ?? i18n.language");
    expect(languageFlyoutSource).toContain("return active as SupportedLang");
  });
});
