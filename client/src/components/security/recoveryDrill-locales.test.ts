import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function flatten(
  value: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === "string") {
      result[path] = item;
    } else if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.assign(result, flatten(item as Record<string, unknown>, path));
    }
  }

  return result;
}

function readRecoveryDrill(locale: (typeof locales)[number]) {
  const path = join(
    process.cwd(),
    "client",
    "public",
    "locales",
    locale,
    "translation.json"
  );
  const bundle = JSON.parse(readFileSync(path, "utf8")) as {
    recoveryDrill?: Record<string, unknown>;
  };
  expect(bundle.recoveryDrill, `${locale}.recoveryDrill`).toBeDefined();
  return flatten(bundle.recoveryDrill ?? {});
}

describe("recovery drill locale bundles", () => {
  const english = readRecoveryDrill("en");
  const requiredPaths = Object.keys(english).sort();

  it("defines the complete English recovery workflow", () => {
    expect(requiredPaths).toHaveLength(81);
    expect(english["scheduledFor"]).toContain("{{date}}");
  });

  for (const locale of locales) {
    it(`${locale} preserves every recovery key and placeholder`, () => {
      const localized = readRecoveryDrill(locale);
      expect(Object.keys(localized).sort()).toEqual(requiredPaths);

      for (const path of requiredPaths) {
        expect(
          localized[path].trim(),
          `${locale}.recoveryDrill.${path}`
        ).not.toBe("");
        const englishPlaceholders = english[path].match(/{{[^}]+}}/g) ?? [];
        const localizedPlaceholders = localized[path].match(/{{[^}]+}}/g) ?? [];
        expect(
          localizedPlaceholders.sort(),
          `${locale}.recoveryDrill.${path}`
        ).toEqual(englishPlaceholders.sort());
      }
    });
  }
});
