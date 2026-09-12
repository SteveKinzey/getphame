import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const paths = [
  "developerIntegrations.simulator.presetsLabel",
  "developerIntegrations.simulator.presetLoadedToast",
  "developerIntegrations.simulator.presets.zapier",
  "developerIntegrations.simulator.presets.make",
  "developerIntegrations.simulator.presets.jotform",
];

function valueAtPath(value: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, value);
}

describe("developer webhook simulator preset localization", () => {
  it("ships every preset label in every served locale and fallback catalog", () => {
    const fallback = JSON.parse(
      readFileSync(
        resolve(root, "client/src/lib/i18nCompleteFallbackResources.json"),
        "utf8"
      )
    ) as Record<string, Record<string, unknown>>;

    for (const locale of locales) {
      const catalog = JSON.parse(
        readFileSync(
          resolve(root, `client/public/locales/${locale}/translation.json`),
          "utf8"
        )
      ) as Record<string, unknown>;
      for (const path of paths) {
        expect(valueAtPath(catalog, path), `${locale} ${path}`).toEqual(
          expect.any(String)
        );
        expect(
          valueAtPath(fallback[locale], path),
          `fallback ${locale} ${path}`
        ).toEqual(expect.any(String));
      }
    }
  });
});
