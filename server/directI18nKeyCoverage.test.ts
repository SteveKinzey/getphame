import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";
import {
  mergeLocaleFallback,
  type ResourceRecord,
} from "../client/src/lib/i18nFallback";

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;
const CLIENT_SOURCE = join(PROJECT_ROOT, "client/src");
const LOCALES_ROOT = join(PROJECT_ROOT, "client/public/locales");
const FALLBACKS_PATH = join(
  CLIENT_SOURCE,
  "lib/i18nCompleteFallbackResources.json"
);
const SUPPORTED_NON_ENGLISH_LOCALES = [
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;
const NAMESPACES = ["translation", "landing", "cancellation"] as const;
const DIRECT_KEY_PATTERN = /\bt\(\s*["']([A-Za-z][A-Za-z0-9_.-]+)["']/g;

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as ResourceRecord)[segment];
  }, value);
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.tsx$/.test(entry.name) ? [path] : [];
  });
}

function collectDirectKeys(): Map<string, Set<string>> {
  const keys = new Map<string, Set<string>>();

  for (const filePath of collectSourceFiles(CLIENT_SOURCE)) {
    const source = readFileSync(filePath, "utf8");
    for (const match of source.matchAll(DIRECT_KEY_PATTERN)) {
      const key = match[1];
      const usages = keys.get(key) ?? new Set<string>();
      usages.add(relative(PROJECT_ROOT, filePath));
      keys.set(key, usages);
    }
  }

  return keys;
}

describe("direct i18n key coverage", () => {
  const generatedFallbacks = JSON.parse(
    readFileSync(FALLBACKS_PATH, "utf8")
  ) as Record<string, ResourceRecord>;
  const directKeys = collectDirectKeys();

  it("keeps literal direct i18n calls covered by a non-empty string in every supported non-English locale", () => {
    expect(directKeys.size).toBeGreaterThan(300);

    for (const locale of SUPPORTED_NON_ENGLISH_LOCALES) {
      const generatedBundle = mergeLocaleFallback(
        generatedFallbacks[locale],
        directKeyFallbackResources[locale]
      );
      const completedNamespaces = NAMESPACES.map(namespace => {
        const maintainedPath = join(LOCALES_ROOT, locale, `${namespace}.json`);
        const maintained = JSON.parse(
          readFileSync(maintainedPath, "utf8")
        ) as ResourceRecord;
        return mergeLocaleFallback(generatedBundle, maintained);
      });

      for (const [key, usages] of directKeys) {
        const resolved = completedNamespaces
          .map(namespace => getByPath(namespace, key))
          .find(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0
          );

        expect(
          resolved,
          `${locale} is missing ${key} used by ${[...usages].join(", ")}`
        ).toBeTruthy();
      }
    }
  });
});
