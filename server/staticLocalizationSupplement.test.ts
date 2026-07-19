import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("locale-specific static-copy localization supplements", () => {
  const helperSource = readProjectFile("../client/src/lib/autoText.ts");
  const bootstrapSource = readProjectFile("../client/src/main.tsx");
  const i18nSource = readProjectFile("../client/src/lib/i18n.ts");

  it("loads only a selected non-English locale from independently cacheable deployed assets", () => {
    for (const locale of ["es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      expect(helperSource).toContain(`getphame-static-copy-${locale}-phame18-static-copy_`);
    }
    expect(helperSource).toContain("const STATIC_COPY_SUPPLEMENT_URLS");
    expect(helperSource).toContain('if (locale === "en") return Promise.resolve();');
    expect(helperSource).toContain("new Map<SupportedLang, Promise<void>>()");
    expect(helperSource).not.toContain("autoTextManifest.json");
    expect(helperSource).not.toContain("autoTextTranslations.json");
    expect(helperSource).not.toContain("/home/ubuntu");
  });

  it("installs the initial active catalog before mount and preloads static copy before language changes", () => {
    expect(helperSource).toContain("Static localization supplement locale mismatch");
    expect(helperSource).toContain("mergeStaticCopySupplement");
    expect(bootstrapSource).toContain("i18nReady.then(() => loadStaticLocalizationSupplement())");
    expect(i18nSource).toContain("prepareStaticCopyLocale");
    expect(i18nSource).toContain("Promise.all([i18n.loadLanguages(lang), prepareStaticCopyLocale(lang)])");
  });
});
