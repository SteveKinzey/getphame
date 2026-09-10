import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const clientSourceRoot = path.join(projectRoot, "client", "src");
const localeRoot = path.join(projectRoot, "client", "public", "locales");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (!entry.isFile()) return [];
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return [];
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function collectDirectTranslationKeys(): string[] {
  const keys = new Set<string>();
  const directCallPattern = /\b(?:t|i18n\.t)\(\s*["'`]([^"'`$]+)["'`]/g;

  for (const file of listSourceFiles(clientSourceRoot)) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(directCallPattern)) {
      if (match[1]?.startsWith("passkeys.")) keys.add(match[1]);
    }
  }

  return [...keys].sort();
}

function getNestedValue(
  source: Record<string, unknown>,
  dottedPath: string
): unknown {
  return dottedPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

describe("direct passkey i18n key coverage", () => {
  const directKeys = collectDirectTranslationKeys();

  it("discovers literal translation keys from the frontend source", () => {
    expect(directKeys.length).toBeGreaterThan(0);
    expect(directKeys).toContain("passkeys.signIn.orAlternative");
  });

  for (const locale of locales) {
    it(`${locale} contains every directly referenced translation key`, () => {
      const file = path.join(localeRoot, locale, "translation.json");
      const bundle = JSON.parse(fs.readFileSync(file, "utf8")) as Record<
        string,
        unknown
      >;

      for (const key of directKeys) {
        const value = getNestedValue(bundle, key);
        expect(value, `${locale}:${key}`).toBeTypeOf("string");
        expect(
          (value as string).trim().length,
          `${locale}:${key}`
        ).toBeGreaterThan(0);
      }
    });
  }
});
