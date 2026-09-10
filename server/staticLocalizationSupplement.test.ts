import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

describe("locale-specific static-copy localization supplements", () => {
  const helperSource = readProjectFile("../client/src/lib/autoText.ts");
  const bootstrapSource = readProjectFile("../client/src/main.tsx");
  const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

  it("loads only a selected non-English locale from independently cacheable deployed assets", () => {
    for (const locale of ["es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      expectFormattedSource(helperSource).toContain(
        `"/api/assets/static-copy/${locale}"`
      );
    }
    expectFormattedSource(helperSource).toContain(
      "const STATIC_COPY_SUPPLEMENT_URLS"
    );
    expectFormattedSource(helperSource).toContain(
      'if (locale === "en") return Promise.resolve();'
    );
    expectFormattedSource(helperSource).toContain(
      "new Map<SupportedLang, Promise<void>>()"
    );
    expectFormattedSource(helperSource).not.toContain("autoTextManifest.json");
    expectFormattedSource(helperSource).not.toContain(
      "autoTextTranslations.json"
    );
    expectFormattedSource(helperSource).not.toContain("/home/ubuntu");
  });

  it("installs the initial active catalog before mount and preloads static copy before language changes", () => {
    expectFormattedSource(helperSource).toContain(
      "Static localization supplement locale mismatch"
    );
    expectFormattedSource(helperSource).toContain("mergeStaticCopySupplement");
    expectFormattedSource(bootstrapSource).toContain(
      "void i18nReady .then(() => {"
    );
    expectFormattedSource(bootstrapSource).toContain(
      "return loadStaticLocalizationSupplement();"
    );
    expectFormattedSource(i18nSource).toContain("prepareStaticCopyLocale");
    expectFormattedSource(i18nSource).toContain(
      "Promise.all([i18n.loadLanguages(lang), prepareStaticCopyLocale(lang)])"
    );
  });
});
