import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";
const source = readFileSync(
  new URL("../client/src/pages/Upgrade.tsx", import.meta.url),
  "utf8"
);
const pricingSource = readFileSync(
  new URL("../shared/pricing.ts", import.meta.url),
  "utf8"
);
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const reviewedPricingKeys = [
  "heroSendRequests",
  "heroAutomateFollowUps",
  "heroTrackGrowth",
  "closeComparison",
  "includedLabel",
  "planFeaturesLabel",
  "approximateThb",
] as const;
const reviewedGuidanceKeys = ["monthly", "annual", "lifetime"] as const;
const fallbackResources = directKeyFallbackResources as unknown as Record<
  string,
  { pricingGrid: Record<string, string | Record<string, string>> }
>;
describe("upgrade pricing layout", () => {
  it("uses the approved public product screenshot instead of the retired private asset", () => {
    expect(source).toContain(
      'const UPGRADE_IMG = "https://assets.getphame.app/phame-app-screenshot.png";'
    );
    expect(source).toContain(
      "https://assets.getphame.app/getphame-logo-mark.webp"
    );
    expect(source).not.toContain(
      "/manus-storage/getphame-pro-whiteboard-growth_3e9448fc.png"
    );
    expect(source).toContain("onError={() => setUpgradeImageFailed(true)}");
    expect(source).toContain("<UpgradeVisualFallback />");
  });
  it("defines a three-plan desktop grid with a deliberate tablet and mobile reflow", () => {
    expect(source).toContain('data-testid="upgrade-plan-grid"');
    expect(source).toMatch(/sm:grid-cols-2\s+lg:grid-cols-3/);
    expect(source).toMatch(/sm:col-span-2\s+lg:col-span-1/);
    expect(source).toContain("data-testid={`upgrade-plan-card-${plan}`}");
    expect(source).toContain(
      'const PLAN_ORDER: Plan[] = ["monthly", "annual", "lifetime"];'
    );
  });
  it("keeps each card connected to the existing secure plan-specific checkout path", () => {
    expect(source).toContain(
      "function handleStripeCheckout(plan: Plan = selectedPlan)"
    );
    expect(source).toContain("onCheckout={handleStripeCheckout}");
    expect(source).toContain("onClick={() => onCheckout(plan)}");
  });
  it("explains annual and lifetime savings using calculated, plan-derived values", () => {
    expect(pricingSource).toContain(
      "USD_PRICES.monthly * 12 - USD_PRICES.annual"
    );
    expect(pricingSource).toContain(
      "USD_PRICES.monthly * 24 - USD_PRICES.lifetime"
    );
    expect(source).toContain("formatUsd(USD_ANNUAL_SAVINGS, locale)");
    expect(source).toContain(
      "formatUsd(USD_LIFETIME_SAVINGS_BY_YEAR_TWO, locale)"
    );
    expect(source).toContain('data-testid="pricing-savings-calculator"');
    expect(source).toContain('t("pricingGrid.annualSave"');
    expect(source).toContain('t("pricingGrid.lifetimeSave"');
    expect(source).toContain("pricingGrid.guidance.${plan}");
    expect(source).not.toContain("pricingGrid.previousPrice");
    expect(source).not.toContain("$497");
  });
  it("keeps the Annual plan visibly featured and exposes a compact mobile comparison drawer", () => {
    expect(source).toContain('data-testid="annual-most-popular-badge"');
    expect(source).toContain("lg:-translate-y-2");
    expect(source).toContain('data-testid="mobile-plan-comparison-drawer"');
    expect(source).toContain('data-testid="mobile-comparison-trigger"');
    expect(source).toContain("<MobilePlanComparisonDrawer />");
    expect(source).toContain(
      'className="hidden overflow-hidden rounded-2xl md:block"'
    );
  });
  it("localizes fallback artwork, pricing labels, plan-feature accessibility, and comparison controls", () => {
    for (const key of reviewedPricingKeys) {
      expect(source).toContain(`pricingGrid.${key}`);
    }
    expect(source).toContain(
      "t(feature.key, { defaultValue: feature.fallback })"
    );
    expect(source).toContain('aria-label={t("pricingGrid.planFeaturesLabel"');
    expect(source).toContain('aria-label={t("pricingGrid.includedLabel"');
  });
  it("keeps every reviewed upgrade label in parity across catalogs and direct fallbacks", () => {
    for (const locale of locales) {
      const resource = JSON.parse(
        readFileSync(
          new URL(
            `../client/public/locales/${locale}/translation.json`,
            import.meta.url
          ),
          "utf8"
        )
      ) as { pricingGrid: Record<string, string | Record<string, string>> };
      for (const key of reviewedPricingKeys) {
        expect(
          resource.pricingGrid[key],
          `${locale}.pricingGrid.${key}`
        ).toBeTypeOf("string");
        expect(
          (resource.pricingGrid[key] as string | undefined)?.trim(),
          `${locale}.pricingGrid.${key}`
        ).not.toBe("");
        expect(fallbackResources[locale]?.pricingGrid[key]).toBe(
          resource.pricingGrid[key]
        );
      }
      const guidance = resource.pricingGrid.guidance as Record<string, string>;
      const fallbackGuidance = fallbackResources[locale]?.pricingGrid
        .guidance as Record<string, string>;
      for (const key of reviewedGuidanceKeys) {
        expect(
          guidance?.[key],
          `${locale}.pricingGrid.guidance.${key}`
        ).toBeTypeOf("string");
        expect(
          guidance?.[key]?.trim(),
          `${locale}.pricingGrid.guidance.${key}`
        ).not.toBe("");
        expect(fallbackGuidance?.[key]).toBe(guidance[key]);
      }
      expect(resource.pricingGrid.previousPrice).toBeUndefined();
    }
  });
});
