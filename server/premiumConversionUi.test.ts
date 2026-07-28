import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function collectStringPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value).flatMap(([key, child]) =>
    collectStringPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function getByPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

describe("premium conversion UI contracts", () => {
  it("mounts one accessible contextual dialog and preserves canonical plus legacy pricing entry points", () => {
    const app = read("../client/src/App.tsx");
    const modal = read("../client/src/components/PremiumUpgradeModal.tsx");

    expect(app.match(/<PremiumUpgradeModal \/>/g)).toHaveLength(1);
    expect(app).toContain('<Route path="/pricing" component={UpgradePage} />');
    expect(app).toContain('<Route path="/upgrade" component={UpgradePage} />');
    expect(modal).toContain('data-testid="premium-upgrade-modal"');
    expect(modal).toContain("max-h-[calc(100dvh-1.5rem)]");
    expect(modal).toContain('aria-label={t("premiumConversion.modal.closeLabel"');
    expect(modal).toContain('aria-label={t("premiumConversion.modal.benefitsLabel"');
    expect(modal).toContain('navigate(`/pricing?feature=${featureKey}`)');
    expect(modal).toContain("closeUpgradeModal();");
    expect(modal).toContain("motion-reduce:animate-none");
  });

  it("uses one typed feature registry and migrates every current paid-action trigger without losing context", () => {
    const controller = read("../client/src/lib/upgradeModal.ts");
    const sendRequest = read("../client/src/pages/SendRequest.tsx");
    const settings = read("../client/src/pages/Settings.tsx");
    const koalendar = read("../client/src/components/KoalendarSettingsCard.tsx");
    const adaptive = read("../client/src/components/AdaptiveSendLimitStatus.tsx");

    for (const key of ["send_limit", "koalendar", "bulk_sender", "plans"]) {
      expect(controller).toContain(`"${key}"`);
    }
    expect(controller).toContain("export type PremiumFeatureKey");
    expect(controller).toContain("normalizePremiumFeatureKey");
    expect(controller).toContain("updatePwaInstallSnapshot({ upgradeVisible: true })");
    expect(sendRequest.match(/openUpgradeModal\("send_limit"\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(settings).toContain('openUpgradeModal("bulk_sender")');
    expect(koalendar).toContain('openUpgradeModal("koalendar")');
    expect(adaptive).toContain('openUpgradeModal("bulk_sender")');
  });

  it("presents an entitlement-backed Free-versus-Premium decision layer before existing checkout plans", () => {
    const source = read("../client/src/pages/Upgrade.tsx");

    expect(source).toContain("function FreeVsPremiumOverview");
    expect(source).toContain('data-testid="free-vs-premium-overview"');
    expect(source).toContain("normalizePremiumFeatureKey");
    expect(source).toContain("premiumConversion.features.${featureKey}");
    expect(source).toContain('t("comparisonTable.freeRequestAllowance"');
    expect(source).toContain("10 first, then 5 / rolling 30 days");
    expect(source).toContain('document.getElementById("upgrade-plan-grid-heading")');
    expect(source).toContain('data-testid="upgrade-plan-grid"');
    expect(source).toContain("<FreeVsPremiumOverview featureKey={pricingFeature} />");
  });

  it("uses a single semantic marker with Free-only route indicators and visible locked-action labels", () => {
    const marker = read("../client/src/components/ProBadge.tsx");
    const desktopNav = read("../client/src/components/AppLayout.tsx");
    const mobileNav = read("../client/src/components/BottomNav.tsx");
    const sendRequest = read("../client/src/pages/SendRequest.tsx");
    const settings = read("../client/src/pages/Settings.tsx");
    const koalendar = read("../client/src/components/KoalendarSettingsCard.tsx");
    const adaptive = read("../client/src/components/AdaptiveSendLimitStatus.tsx");

    expect(marker).toContain('variant?: "status" | "locked" | "compact"');
    expect(marker).toContain('data-premium-marker="compact"');
    expect(marker).toContain("data-premium-marker={variant}");
    expect(marker).toContain('t("premiumConversion.marker.label"');
    expect(marker).toContain('t("premiumConversion.marker.contains"');
    expect(marker).toContain("aria-label={containsPremiumLabel}");

    expect(desktopNav).toContain('path: "/developer"');
    expect(desktopNav).toContain('path: "/settings"');
    expect(desktopNav).toContain("const showPremiumMarker = isFreePlan && containsPremiumFeatures");
    expect(desktopNav).toContain('<ProBadge variant="compact" size="sm"');
    expect(mobileNav).toContain("const showPremiumMarker = isFreePlan && containsPremiumFeatures");
    expect(mobileNav).toContain('<ProBadge variant="compact" size="sm"');
    expect(mobileNav).toContain("premiumConversion.marker.contains");

    expect(sendRequest.match(/<ProBadge variant="locked" size="sm" \/>/g)).toHaveLength(2);
    expect(settings.match(/<ProBadge variant="locked" size="sm" \/>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(koalendar.match(/<ProBadge variant="locked" size="sm" \/>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(adaptive).toContain('<ProBadge variant="locked" size="sm" />');
  });

  it("keeps premium dialog, marker, and comparison copy complete in catalogs and runtime fallbacks", () => {
    const english = JSON.parse(read("../client/public/locales/en/translation.json")) as Record<string, unknown>;
    const fallbackResources = JSON.parse(read("../client/src/lib/i18nCompleteFallbackResources.json")) as Record<string, unknown>;
    const premiumPaths = collectStringPaths(english.premiumConversion, "premiumConversion");
    const comparisonKeys = ["freeRequestAllowance", "bulkSender", "koalendarImports", "unlimited"] as const;

    expect(premiumPaths.length).toBeGreaterThanOrEqual(25);
    for (const locale of locales) {
      const bundle = JSON.parse(read(`../client/public/locales/${locale}/translation.json`)) as Record<string, unknown>;
      for (const path of premiumPaths) {
        const value = getByPath(bundle, path);
        expect(value, `${locale} is missing ${path}`).toEqual(expect.any(String));
        expect((value as string).trim(), `${locale} has an empty ${path}`).not.toBe("");
        expect(getByPath(fallbackResources[locale], path), `${locale} fallback differs at ${path}`).toBe(value);
      }
      for (const key of comparisonKeys) {
        const path = `comparisonTable.${key}`;
        const value = getByPath(bundle, path);
        expect(value, `${locale} is missing ${path}`).toEqual(expect.any(String));
        expect((value as string).trim(), `${locale} has an empty ${path}`).not.toBe("");
        expect(getByPath(fallbackResources[locale], path), `${locale} fallback differs at ${path}`).toBe(value);
      }
    }
  });
});
