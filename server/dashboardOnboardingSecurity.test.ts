import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";

const LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;
const SETUP_KEYS = [
  "setupProgressEyebrow",
  "setupProgressDescription",
  "setupProgressCount",
  "setupStepEmail",
  "setupStepEmailDescription",
  "setupActionEmail",
  "setupStepPlatform",
  "setupStepPlatformDescription",
  "setupActionPlatform",
  "setupStepContacts",
  "setupStepContactsDescription",
  "setupActionContacts",
  "setupStepSend",
  "setupStepSendDescription",
  "setupActionSend",
  "setupStepComplete",
  "setupStepNumber",
  "loadingAnalytics",
] as const;
const TOUR_KEYS = ["skip", "show", "skipTooltip", "showTooltip", "skipSuccess"] as const;

function readSource(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

function localeSection(locale: (typeof LOCALES)[number], section: string) {
  return (directKeyFallbackResources[locale] as Record<string, Record<string, unknown>>)[section];
}

describe("dashboard onboarding and security release", () => {
  it("provides complete setup-progress and Skip Tour copy for every supported locale", () => {
    for (const locale of LOCALES) {
      const homePage = localeSection(locale, "homePage");
      const onboardingWizard = localeSection(locale, "onboardingWizard");
      const tour = onboardingWizard.tour as Record<string, unknown>;

      for (const key of SETUP_KEYS) {
        expect(typeof homePage[key] === "string" && (homePage[key] as string).trim().length > 0, `${locale}.homePage.${key}`).toBe(true);
      }
      for (const key of TOUR_KEYS) {
        expect(typeof tour[key] === "string" && (tour[key] as string).trim().length > 0, `${locale}.onboardingWizard.tour.${key}`).toBe(true);
      }
    }
  });

  it("keeps localized setup guidance distinct from English for every non-English locale", () => {
    const englishHome = localeSection("en", "homePage");
    const englishTour = localeSection("en", "onboardingWizard").tour as Record<string, unknown>;

    for (const locale of LOCALES.filter((locale) => locale !== "en")) {
      const homePage = localeSection(locale, "homePage");
      const tour = localeSection(locale, "onboardingWizard").tour as Record<string, unknown>;
      expect(homePage.setupProgressDescription).not.toBe(englishHome.setupProgressDescription);
      expect(tour.skip).not.toBe(englishTour.skip);
    }
  });

  it("uses a progress card and intersection-gated lazy modules so dashboard analytics do not start in the initial page module", () => {
    const home = readSource("../client/src/pages/Home.tsx");
    const dashboard = readSource("../client/src/pages/Dashboard.tsx");
    const deferredSection = readSource("../client/src/components/dashboard/DeferredDashboardSection.tsx");
    const setupProgress = readSource("../client/src/components/dashboard/SetupProgressCard.tsx");

    expect(home).toContain('const TrackingSummaryCard = lazy(() => import("@/components/dashboard/TrackingSummaryCard"))');
    expect(home).toContain('const PlatformBreakdownChart = lazy(() => import("@/components/dashboard/PlatformBreakdownChart"))');
    expect(home).toContain("<SetupProgressCard status={onboardingStatus} onNavigate={navigate} />");
    expect(home).toContain("<DeferredDashboardSection loadingLabel={t(\"homePage.loadingAnalytics\")}");
    expect(home).not.toContain("trpc.tracking.overallStats.useQuery");
    expect(dashboard).toContain('const ActivityTrendCard = lazy(() => import("@/components/dashboard/ActivityTrendCard"))');
    expect(dashboard).toContain("<ActivityTrendCard total={stats?.total ?? 0} velocity={velocity} />");
    expect(dashboard).not.toContain("trpc.tracking.dailyTrend.useQuery");
    expect(deferredSection).toContain("IntersectionObserver");
    expect(deferredSection).toContain('rootMargin: "280px 0px"');
    expect(deferredSection).toContain("<Suspense fallback=");
    expect(setupProgress).toContain('path: "/settings"');
    expect(setupProgress).toContain('path: "/import"');
    expect(setupProgress).toContain('path: "/send"');
    expect(setupProgress).toContain('role="progressbar"');
  });

  it("persists Skip Tour state locally and lets users re-enable contextual tips", () => {
    const wizard = readSource("../client/src/components/OnboardingWizard.tsx");

    expect(wizard).toContain('const TOUR_SKIP_STORAGE_KEY = "rr_skip_tour"');
    expect(wizard).toContain('window.localStorage.getItem(TOUR_SKIP_STORAGE_KEY) === "1"');
    expect(wizard).toContain('window.localStorage.setItem(TOUR_SKIP_STORAGE_KEY, "1")');
    expect(wizard).toContain("window.localStorage.removeItem(TOUR_SKIP_STORAGE_KEY)");
    expect(wizard).toContain("if (tipsHidden) return null;");
    expect(wizard).toContain("<OnboardingTourContext.Provider value={{ tipsHidden }}>");
    expect(wizard).toContain('t("onboardingWizard.tour.skip")');
    expect(wizard).toContain('t("onboardingWizard.tour.show")');
  });

  it("uses a fixed canonical redirect target and isolates external popups from their opener", () => {
    const serverBootstrap = readSource("../server/_core/index.ts");
    const home = readSource("../client/src/pages/Home.tsx");
    const settings = readSource("../client/src/pages/Settings.tsx");

    expect(serverBootstrap).toContain('req.hostname.toLowerCase() === "www.getphame.app"');
    expect(serverBootstrap).toContain('res.redirect(301, `https://getphame.app${req.originalUrl}`)');
    expect(serverBootstrap).not.toContain('const apexHost = host.slice(4)');
    expect(home).toContain('window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")');
    expect(home).toContain('window.location.assign(`sms:?&body=${text}`)');
    expect(settings).toContain('window.open(url, "_blank", "noopener,noreferrer")');
  });
});
