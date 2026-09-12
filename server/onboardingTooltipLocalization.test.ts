import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";

const LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const TOOLTIP_KEYS = [
  "smtpPassword",
  "testConnection",
  "reviewPlatform",
  "reviewUrl",
  "firstRequest",
] as const;

type TooltipCopy = { label?: unknown; text?: unknown };

function getTooltip(locale: string, key: string): TooltipCopy {
  const localeResource = directKeyFallbackResources[locale] as Record<
    string,
    unknown
  >;
  const onboarding = localeResource.onboardingWizard as Record<string, unknown>;
  const tooltips = onboarding.tooltips as Record<string, TooltipCopy>;
  return tooltips[key];
}

describe("onboarding tooltip localization", () => {
  it("provides complete native-language guidance for every setup tooltip in every supported locale", () => {
    for (const locale of LOCALES) {
      for (const key of TOOLTIP_KEYS) {
        const tooltip = getTooltip(locale, key);
        expect(
          typeof tooltip.label === "string" && tooltip.label.trim().length > 0,
          `${locale}.${key}.label`
        ).toBe(true);
        expect(
          typeof tooltip.text === "string" && tooltip.text.trim().length > 12,
          `${locale}.${key}.text`
        ).toBe(true);
      }
    }
  });

  it("keeps non-English tooltip guidance distinct from the English source copy", () => {
    for (const locale of LOCALES.filter(locale => locale !== "en")) {
      for (const key of TOOLTIP_KEYS) {
        expect(getTooltip(locale, key).text).not.toBe(
          getTooltip("en", key).text
        );
      }
    }
  });

  it("uses the established accessible tooltip primitive for every guided setup moment", () => {
    const source = readFileSync(
      fileURLToPath(
        new URL(
          "../client/src/components/OnboardingWizard.tsx",
          import.meta.url
        )
      ),
      "utf8"
    );

    expect(source).toContain('from "@/components/ui/tooltip"');
    expect(source).toContain("<TooltipTrigger asChild>");
    expect(source).toContain('type="button"');
    expect(source).toContain("aria-label={label}");
    for (const key of TOOLTIP_KEYS) {
      expect(source).toContain(`onboardingWizard.tooltips.${key}.label`);
      expect(source).toContain(`onboardingWizard.tooltips.${key}.text`);
    }
  });
});
