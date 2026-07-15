import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SUPPORTED_LOCALES = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;
const SELECTABLE_LOCALES = ["en", "zh-CN", "es", "fr", "th", "zh-TW"] as const;

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
      'export const SUPPORTED_LANGS = ["en", "zh-CN", "es", "fr", "th", "zh-TW"] as const;'
    );
    expect(i18nSource).toContain(
      'supportedLngs: [...SUPPORTED_LANGS]'
    );
    expect(i18nSource).toContain(
      'loadPath: "/locales/{{lng}}/{{ns}}.json?v=phame9"'
    );
    expect(i18nSource).toContain('ns: ["landing", "translation", "cancellation"]');
    expect(i18nSource).toContain('fallbackNS: "translation"');

    for (const locale of SELECTABLE_LOCALES) {
      expect(
        languageFlyoutSource.includes(`code: "${locale}"`),
        `LanguageFlyout is missing supported locale: ${locale}`
      ).toBe(true);
    }

    expect(languageFlyoutSource).not.toContain('code: "it"');
    expect(readProjectFile("../client/public/locales/it/translation.json")).toContain('"account"');
  });
});
