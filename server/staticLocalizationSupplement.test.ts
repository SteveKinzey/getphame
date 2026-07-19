import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SUPPLEMENT_PATH = "/home/ubuntu/webdev-static-assets/getphame-static-localization-phame17.json";
const AUDIT_PATH = "/home/ubuntu/localization-gap-classification.json";
const SUPPORTED_NON_ENGLISH_LOCALES = ["es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

type AuditItem = { needsTranslation: boolean; value: string };
type Supplement = {
  version: string;
  manifest: Array<{ key: string; source: string }>;
  translations: Record<string, Record<string, string>>;
};

describe("versioned static-copy localization supplement", () => {
  const audit = JSON.parse(readFileSync(AUDIT_PATH, "utf8")) as { results: AuditItem[] };
  const supplement = JSON.parse(readFileSync(SUPPLEMENT_PATH, "utf8")) as Supplement;

  it("covers every unique customer-facing literal identified by the final static source audit", () => {
    const auditedSources = new Set(
      audit.results.filter((item) => item.needsTranslation).map((item) => item.value),
    );
    const supplementedSources = new Set(supplement.manifest.map((entry) => entry.source));

    expect(supplement.version).toBe("phame17-static-copy");
    expect(supplement.manifest).toHaveLength(136);
    expect(supplementedSources).toEqual(auditedSources);
  });

  it("provides complete non-English values for every supplemented source", () => {
    const keys = supplement.manifest.map((entry) => entry.key).sort();

    for (const locale of SUPPORTED_NON_ENGLISH_LOCALES) {
      const catalog = supplement.translations[locale];
      expect(catalog, `${locale} supplement is missing`).toBeTruthy();
      expect(Object.keys(catalog).sort(), `${locale} supplement key parity`).toEqual(keys);
      for (const key of keys) {
        expect(catalog[key]?.trim(), `${locale} lacks a value for ${key}`).toBeTruthy();
      }
    }
  });
});
