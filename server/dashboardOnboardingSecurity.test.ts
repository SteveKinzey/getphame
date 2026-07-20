import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";
import { summarizeOnboardingChecklistEvents, toOnboardingChecklistEventPage } from "./onboardingChecklistAnalytics";

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
const TOUR_KEYS = ["skip", "show", "skipTooltip", "showTooltip", "skipSuccess", "saveError"] as const;
const ACTIVITY_TREND_KEYS = ["title", "rangeAria", "range", "loading", "empty", "sent", "opens", "clicks", "openRate", "clickRate", "thisWeek", "priorWeek", "allTime"] as const;
const ONBOARDING_TIP_KEYS = ["title", "description", "enable", "disable"] as const;

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
      const activityTrend = localeSection(locale, "activityTrend");
      const onboardingTips = localeSection(locale, "settings").onboardingTips as Record<string, unknown>;

      for (const key of SETUP_KEYS) {
        expect(typeof homePage[key] === "string" && (homePage[key] as string).trim().length > 0, `${locale}.homePage.${key}`).toBe(true);
      }
      for (const key of TOUR_KEYS) {
        expect(typeof tour[key] === "string" && (tour[key] as string).trim().length > 0, `${locale}.onboardingWizard.tour.${key}`).toBe(true);
      }
      for (const key of ACTIVITY_TREND_KEYS) {
        expect(typeof activityTrend[key] === "string" && (activityTrend[key] as string).trim().length > 0, `${locale}.activityTrend.${key}`).toBe(true);
      }
      for (const key of ONBOARDING_TIP_KEYS) {
        expect(typeof onboardingTips[key] === "string" && (onboardingTips[key] as string).trim().length > 0, `${locale}.settings.onboardingTips.${key}`).toBe(true);
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
    const settings = readSource("../client/src/pages/Settings.tsx");

    expect(wizard).toContain('const TOUR_SKIP_STORAGE_KEY = "rr_skip_tour"');
    expect(wizard).toContain('window.localStorage.getItem(TOUR_SKIP_STORAGE_KEY) === "1"');
    expect(wizard).toContain('window.localStorage.setItem(TOUR_SKIP_STORAGE_KEY, "1")');
    expect(wizard).toContain("window.localStorage.removeItem(TOUR_SKIP_STORAGE_KEY)");
    expect(wizard).toContain("if (tipsHidden) return null;");
    expect(wizard).toContain("<OnboardingTourContext.Provider value={{ tipsHidden }}>");
    expect(wizard).toContain('t("onboardingWizard.tour.skip")');
    expect(wizard).toContain('t("onboardingWizard.tour.show")');
    expect(wizard).toContain("onboardingTipsEnabled");
    expect(wizard).toContain('const ONBOARDING_TIPS_CHANGE_EVENT = "rr:onboarding-tips-change"');
    expect(wizard).toContain("new CustomEvent(ONBOARDING_TIPS_CHANGE_EVENT");
    expect(settings).toContain("settings.onboardingTips.title");
    expect(settings).toContain("aria-pressed={notifPrefs?.onboardingTipsEnabled ?? true}");
    expect(settings).toContain("const toggleOnboardingTips");
    expect(settings).toContain("rr:onboarding-tips-change");
  });

  it("records only allowlisted checklist events and reports anonymized, deduplicated drop-off totals", () => {
    const now = Date.now();
    const row = (event: Parameters<typeof toOnboardingChecklistEventPage>[0], userId: number, ageDays = 0) => ({
      page: toOnboardingChecklistEventPage(event),
      userId,
      createdAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    });
    const summary = summarizeOnboardingChecklistEvents([
      row("checklist_viewed", 1), row("checklist_viewed", 1), row("checklist_viewed", 2),
      row("email_step_viewed", 1), row("email_step_viewed", 2), row("email_step_actioned", 1),
      row("platform_step_viewed", 1), row("checklist_completed", 1),
      row("contacts_step_viewed", 3, 31),
    ], now);

    expect(summary.allTime.checklist_viewed).toBe(2);
    expect(summary.last30Days.checklist_viewed).toBe(2);
    expect(summary.steps.email).toEqual({ shown: 2, actioned: 1, dropOff: 1, continuationRate: 50 });
    expect(summary.steps.platform).toEqual({ shown: 1, actioned: 0, dropOff: 1, continuationRate: 0 });
    expect(summary.rates.completion).toBe(50);
    expect(summary).not.toHaveProperty("rows");
    expect(summary).not.toHaveProperty("users");
  });

  it("keeps checklist telemetry authenticated, constrained, and aggregate-only in the administrator dashboard", () => {
    const routers = readSource("../server/routers.ts");
    const setupProgress = readSource("../client/src/components/dashboard/SetupProgressCard.tsx");
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");

    expect(routers).toContain("trackOnboardingChecklistEvent: protectedProcedure");
    expect(routers).toContain("z.enum(ONBOARDING_CHECKLIST_EVENT_NAMES)");
    expect(routers).toContain("utmSource: ONBOARDING_CHECKLIST_EVENT_SOURCE");
    expect(routers).toContain("referrer: null");
    expect(routers).toContain("userAgent: null");
    expect(routers).toContain("onboardingChecklistFunnel: adminProcedure.query");
    expect(setupProgress).toContain("trackChecklistEvent.mutate({ event: \"checklist_viewed\" })");
    expect(setupProgress).toContain("trackedSnapshots");
    expect(setupProgress).toContain("_step_actioned");
    expect(admin).toContain('data-testid="admin-setup-funnel"');
    expect(admin).toContain("Aggregate account-level events only");
  });

  it("localizes every chart label, axis date, tooltip rate, and empty state", () => {
    const activityTrend = readSource("../client/src/components/dashboard/ActivityTrendCard.tsx");

    expect(activityTrend).toContain("useTranslation(\"translation\")");
    expect(activityTrend).toContain("i18n.resolvedLanguage || i18n.language");
    expect(activityTrend).toContain('t("activityTrend.empty"');
    expect(activityTrend).toContain('t("activityTrend.openRate"');
    expect(activityTrend).toContain('t("activityTrend.clickRate"');
    expect(activityTrend).toContain('t("activityTrend.thisWeek"');
    expect(activityTrend).toContain('t("activityTrend.allTime"');
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
