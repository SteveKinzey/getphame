import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function toFormattedSourcePattern(snippet: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = "";

  for (let index = 0; index < snippet.length; ) {
    const character = snippet[index];
    if (character === '"' || character === "'") {
      let closingIndex = index + 1;
      while (closingIndex < snippet.length) {
        if (
          snippet[closingIndex] === character &&
          snippet[closingIndex - 1] !== "\\"
        )
          break;
        closingIndex += 1;
      }
      if (closingIndex < snippet.length) {
        pattern += `["']${escape(snippet.slice(index + 1, closingIndex))}["']`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (/\s/.test(character)) {
      while (index < snippet.length && /\s/.test(snippet[index])) index += 1;
      pattern += "\\s*";
      continue;
    }

    pattern += escape(character);
    if ("().,=:?{}[]<>".includes(character)) pattern += "\\s*";
    index += 1;
  }

  return new RegExp(pattern);
}

function expectFormattedSource(source: string) {
  return {
    toContain(snippet: string) {
      expect(source).toMatch(toFormattedSourcePattern(snippet));
    },
    not: {
      toContain(snippet: string) {
        expect(source).not.toMatch(toFormattedSourcePattern(snippet));
      },
    },
  };
}

const root = process.cwd();
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const pageSource = readFileSync(
  path.join(root, "client/src/pages/AdminSecurityAudits.tsx"),
  "utf8"
);
const i18nSource = readFileSync(
  path.join(root, "client/src/lib/i18n.ts"),
  "utf8"
);
const serviceWorker = readFileSync(
  path.join(root, "client/public/sw.js"),
  "utf8"
);

function readCatalog(locale: (typeof locales)[number]) {
  return JSON.parse(
    readFileSync(
      path.join(root, `client/public/locales/${locale}/translation.json`),
      "utf8"
    )
  ) as Record<string, unknown>;
}

function valueAtPath(catalog: Record<string, unknown>, key: string) {
  return key.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[segment];
  }, catalog);
}

describe("Security Audit History localization", () => {
  it("defines every visible audit key in all seven maintained locale catalogs", () => {
    const staticKeys = Array.from(
      pageSource.matchAll(/t\(\s*["'](securityAudits\.[^"']+)["']/g),
      match => match[1]
    );
    const requiredKeys = Array.from(
      new Set([
        ...staticKeys,
        "securityAudits.outcome.clean",
        "securityAudits.outcome.attention",
        "securityAudits.outcome.failed",
        "securityAudits.validation.passed",
        "securityAudits.validation.failed",
        "securityAudits.validation.not_run",
      ])
    );

    expect(requiredKeys.length).toBeGreaterThan(30);

    for (const locale of locales) {
      const catalog = readCatalog(locale);
      for (const key of requiredKeys) {
        const value = valueAtPath(catalog, key);
        expect(value, `${locale} is missing ${key}`).toBeTypeOf("string");
        expect(
          (value as string).trim(),
          `${locale} has an empty ${key}`
        ).not.toBe("");
      }
    }
  });

  it("keeps non-English page titles translated and locale formatting active", () => {
    const englishTitle = valueAtPath(readCatalog("en"), "securityAudits.title");

    for (const locale of locales.filter(locale => locale !== "en")) {
      expect(valueAtPath(readCatalog(locale), "securityAudits.title")).not.toBe(
        englishTitle
      );
    }

    expectFormattedSource(pageSource).toContain(
      "new Intl.NumberFormat(locale)"
    );
    expectFormattedSource(pageSource).toContain(
      "new Intl.DateTimeFormat(locale"
    );
  });

  it("advances both locale HTTP and offline PWA cache contracts", () => {
    expectFormattedSource(i18nSource).toContain(
      'loadPath: "/locales/{{lng}}/{{ns}}.json?v=phame61"'
    );
    expectFormattedSource(serviceWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );

    for (const locale of locales) {
      expectFormattedSource(serviceWorker).toContain(
        `/locales/${locale}/translation.json`
      );
    }
  });
});
