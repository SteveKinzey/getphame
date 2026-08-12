import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import directKeyFallbackResources from "../client/src/lib/i18nDirectKeyFallbackResources";
import {
  summarizeOnboardingChecklistEvents,
  toOnboardingChecklistEventPage,
} from "./onboardingChecklistAnalytics";
import { buildOnboardingFunnelInsightFallback } from "./onboardingFunnelInsight";
import { claimOnboardingChecklistTelemetryEvent } from "../client/src/lib/onboardingChecklistTelemetry";

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
const TOUR_KEYS = [
  "skip",
  "show",
  "skipTooltip",
  "showTooltip",
  "skipSuccess",
  "saveError",
  "tipsRemaining_one",
  "tipsRemaining_other",
] as const;
const ACTIVITY_TREND_KEYS = [
  "title",
  "rangeAria",
  "range",
  "loading",
  "empty",
  "sent",
  "opens",
  "clicks",
  "openRate",
  "clickRate",
  "thisWeek",
  "priorWeek",
  "allTime",
] as const;
const ONBOARDING_TIP_KEYS = [
  "title",
  "description",
  "enable",
  "disable",
] as const;

function readSource(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}

function localeSection(locale: (typeof LOCALES)[number], section: string) {
  return (
    directKeyFallbackResources[locale] as Record<
      string,
      Record<string, unknown>
    >
  )[section];
}

describe("dashboard onboarding and security release", () => {
  it("provides complete setup-progress and Skip Tour copy for every supported locale", () => {
    for (const locale of LOCALES) {
      const homePage = localeSection(locale, "homePage");
      const onboardingWizard = localeSection(locale, "onboardingWizard");
      const tour = onboardingWizard.tour as Record<string, unknown>;
      const activityTrend = localeSection(locale, "activityTrend");
      const onboardingTips = localeSection(locale, "settings")
        .onboardingTips as Record<string, unknown>;

      for (const key of SETUP_KEYS) {
        expect(
          typeof homePage[key] === "string" &&
            (homePage[key] as string).trim().length > 0,
          `${locale}.homePage.${key}`
        ).toBe(true);
      }
      for (const key of TOUR_KEYS) {
        expect(
          typeof tour[key] === "string" &&
            (tour[key] as string).trim().length > 0,
          `${locale}.onboardingWizard.tour.${key}`
        ).toBe(true);
      }
      for (const key of ACTIVITY_TREND_KEYS) {
        expect(
          typeof activityTrend[key] === "string" &&
            (activityTrend[key] as string).trim().length > 0,
          `${locale}.activityTrend.${key}`
        ).toBe(true);
      }
      for (const key of ONBOARDING_TIP_KEYS) {
        expect(
          typeof onboardingTips[key] === "string" &&
            (onboardingTips[key] as string).trim().length > 0,
          `${locale}.settings.onboardingTips.${key}`
        ).toBe(true);
      }
    }
  });

  it("keeps localized setup guidance distinct from English for every non-English locale", () => {
    const englishHome = localeSection("en", "homePage");
    const englishTour = localeSection("en", "onboardingWizard").tour as Record<
      string,
      unknown
    >;

    for (const locale of LOCALES.filter(locale => locale !== "en")) {
      const homePage = localeSection(locale, "homePage");
      const tour = localeSection(locale, "onboardingWizard").tour as Record<
        string,
        unknown
      >;
      expect(homePage.setupProgressDescription).not.toBe(
        englishHome.setupProgressDescription
      );
      expect(tour.skip).not.toBe(englishTour.skip);
    }
  });

  it("uses a progress card and intersection-gated lazy modules so dashboard analytics do not start in the initial page module", () => {
    const home = readSource("../client/src/pages/Home.tsx");
    const dashboard = readSource("../client/src/pages/Dashboard.tsx");
    const deferredSection = readSource(
      "../client/src/components/dashboard/DeferredDashboardSection.tsx"
    );
    const setupProgress = readSource(
      "../client/src/components/dashboard/SetupProgressCard.tsx"
    );

    expect(home).toContain(
      'const TrackingSummaryCard = lazy(() => import("@/components/dashboard/TrackingSummaryCard"))'
    );
    expect(home).toContain(
      'const PlatformBreakdownChart = lazy(() => import("@/components/dashboard/PlatformBreakdownChart"))'
    );
    expect(home).toContain(
      "<SetupProgressCard status={onboardingStatus} userId={user?.id} onNavigate={navigate} />"
    );
    expect(home).toContain(
      '<DeferredDashboardSection loadingLabel={t("homePage.loadingAnalytics")}'
    );
    expect(home).not.toContain("trpc.tracking.overallStats.useQuery");
    expect(dashboard).toContain(
      'const ActivityTrendCard = lazy(() => import("@/components/dashboard/ActivityTrendCard"))'
    );
    expect(dashboard).toContain(
      "<ActivityTrendCard total={stats?.total ?? 0} velocity={velocity} />"
    );
    expect(dashboard).not.toContain("trpc.tracking.dailyTrend.useQuery");
    expect(deferredSection).toContain("IntersectionObserver");
    expect(deferredSection).toContain('rootMargin: "280px 0px"');
    expect(deferredSection).toContain("<Suspense fallback=");
    expect(setupProgress).toContain('path: "/settings"');
    expect(setupProgress).toContain('path: "/import"');
    expect(setupProgress).toContain('path: "/send"');
    expect(setupProgress).toContain('role="progressbar"');
  });

  it("keeps completed setup controls visible and prevents nested activity action buttons", () => {
    const setupProgress = readSource(
      "../client/src/components/dashboard/SetupProgressCard.tsx"
    );
    const recentActivity = readSource(
      "../client/src/components/dashboard/RecentActivityCard.tsx"
    );

    expect(setupProgress).toContain('t("homePage.setupProgressPercentage"');
    expect(setupProgress).toContain('t("homePage.setupProgressDismiss")');
    expect(setupProgress).toContain("window.localStorage.setItem(dismissStorageKey, \"true\")");
    expect(setupProgress).toContain("title={step.complete ?");
    expect(recentActivity).toContain('role="button"');
    expect(recentActivity).toContain('tabIndex={0}');
    expect(recentActivity).toContain("handleMarkSingle(e, req.id)");
    expect(recentActivity).not.toContain("return (\n              <button\n                key={req.id}");
  });

  it("persists Skip Tour state locally and lets users re-enable contextual tips", () => {
    const wizard = readSource("../client/src/components/OnboardingWizard.tsx");
    const settings = readSource("../client/src/pages/Settings.tsx");

    expect(wizard).toContain('const TOUR_SKIP_STORAGE_KEY = "rr_skip_tour"');
    expect(wizard).toContain(
      'window.localStorage.getItem(TOUR_SKIP_STORAGE_KEY) === "1"'
    );
    expect(wizard).toContain(
      'window.localStorage.setItem(TOUR_SKIP_STORAGE_KEY, "1")'
    );
    expect(wizard).toContain(
      "window.localStorage.removeItem(TOUR_SKIP_STORAGE_KEY)"
    );
    expect(wizard).toContain("if (tipsHidden) return null;");
    expect(wizard).toContain(
      "<OnboardingTourContext.Provider value={{ tipsHidden }}>"
    );
    expect(wizard).toContain('t("onboardingWizard.tour.skip")');
    expect(wizard).toContain('t("onboardingWizard.tour.show")');
    expect(wizard).toContain("onboardingTipsEnabled");
    expect(wizard).toContain(
      'const ONBOARDING_TIPS_CHANGE_EVENT = "rr:onboarding-tips-change"'
    );
    expect(wizard).toContain("new CustomEvent(ONBOARDING_TIPS_CHANGE_EVENT");
    expect(settings).toContain("settings.onboardingTips.title");
    expect(settings).toContain(
      "aria-pressed={notifPrefs?.onboardingTipsEnabled ?? true}"
    );
    expect(settings).toContain("const toggleOnboardingTips");
    expect(settings).toContain("rr:onboarding-tips-change");
  });

  it("records only allowlisted checklist events and reports anonymized, deduplicated drop-off totals", () => {
    const now = Date.now();
    const row = (
      event: Parameters<typeof toOnboardingChecklistEventPage>[0],
      userId: number,
      ageDays = 0
    ) => ({
      page: toOnboardingChecklistEventPage(event),
      userId,
      createdAt: new Date(now - ageDays * 24 * 60 * 60 * 1000),
    });
    const summary = summarizeOnboardingChecklistEvents(
      [
        row("checklist_viewed", 1),
        row("checklist_viewed", 1),
        row("checklist_viewed", 2),
        row("email_step_viewed", 1),
        row("email_step_viewed", 2),
        row("email_step_actioned", 1),
        row("platform_step_viewed", 1),
        row("checklist_completed", 1),
        row("contacts_step_viewed", 3, 31),
      ],
      now
    );

    expect(summary.allTime.checklist_viewed).toBe(2);
    expect(summary.last30Days.checklist_viewed).toBe(2);
    expect(summary.steps.email).toEqual({
      shown: 2,
      actioned: 1,
      dropOff: 1,
      continuationRate: 50,
    });
    expect(summary.steps.platform).toEqual({
      shown: 1,
      actioned: 0,
      dropOff: 1,
      continuationRate: 0,
    });
    expect(summary.rates.completion).toBe(50);
    expect(summary).not.toHaveProperty("rows");
    expect(summary).not.toHaveProperty("users");
  });

  it("keeps checklist telemetry authenticated, constrained, and aggregate-only in the administrator dashboard", () => {
    const routers = readSource("../server/routers.ts");
    const setupProgress = readSource(
      "../client/src/components/dashboard/SetupProgressCard.tsx"
    );
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");
    const rateLimiter = readSource("../server/rateLimiter.ts");

    expect(routers).toContain(
      "trackOnboardingChecklistEvent: protectedProcedure"
    );
    expect(routers).toContain("z.enum(ONBOARDING_CHECKLIST_EVENT_NAMES)");
    expect(routers).toContain("utmSource: ONBOARDING_CHECKLIST_EVENT_SOURCE");
    expect(routers).toContain("referrer: null");
    expect(routers).toContain("userAgent: null");
    expect(routers).toMatch(
      /onboardingChecklistFunnel:\s*adminProcedure\s*\.input/
    );
    expect(routers).toContain(
      "checkOnboardingChecklistEventRateLimit(ctx.user.id)"
    );
    expect(rateLimiter).toContain("MAX_ONBOARDING_EVENTS_PER_WINDOW = 60");
    expect(rateLimiter).toContain("checkOnboardingChecklistEventRateLimit");
    expect(setupProgress).toContain("claimOnboardingChecklistTelemetryEvent");
    expect(setupProgress).toContain("trackedEvents");
    expect(setupProgress).toContain("_step_actioned");
    expect(admin).toContain('data-testid="admin-setup-funnel"');
    expect(admin).toContain("Aggregate account-level events only");
  });

  it("claims each checklist telemetry event once per account across routine component remounts", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const firstMountEvents = new Set<string>();
    const remountedEvents = new Set<string>();

    expect(
      claimOnboardingChecklistTelemetryEvent(
        1_987_654_321,
        "checklist_viewed",
        firstMountEvents,
        storage
      )
    ).toBe(true);
    expect(
      claimOnboardingChecklistTelemetryEvent(
        1_987_654_321,
        "checklist_viewed",
        firstMountEvents,
        storage
      )
    ).toBe(false);
    expect(
      claimOnboardingChecklistTelemetryEvent(
        1_987_654_321,
        "checklist_viewed",
        remountedEvents,
        storage
      )
    ).toBe(false);
    expect(
      claimOnboardingChecklistTelemetryEvent(
        1_987_654_322,
        "checklist_viewed",
        remountedEvents,
        storage
      )
    ).toBe(true);
  });

  it("bounds admin funnel date filters and exports aggregate-only CSV through the server-authorized contract", () => {
    const routers = readSource("../server/routers.ts");
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");

    expect(routers).toContain("MAX_ONBOARDING_FUNNEL_RANGE_DAYS = 366");
    expect(routers).toContain("onboardingChecklistFunnelInputSchema");
    expect(routers).toContain(
      "Choose either a preset period or a custom date range."
    );
    expect(routers).toContain(
      "onboardingChecklistFunnelExport: adminProcedure"
    );
    expect(routers).toContain("serializeAdminOperationsCsv(rows)");
    expect(routers).toContain(
      "contains no raw event, identity, or customer data"
    );
    expect(admin).toContain("onboardingFunnelRangeValid");
    expect(admin).toContain("onboardingChecklistFunnelExport.useQuery");
    expect(admin).toContain("downloadOnboardingFunnelCsv");
    expect(admin).toContain("URL.revokeObjectURL(url)");
    expect(admin).toContain('data-testid="admin-setup-funnel"');
  });

  it("offers reusable presets and compares adjacent aggregate periods without exposing event rows", () => {
    const routers = readSource("../server/routers.ts");
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");

    expect(routers).toContain("comparison: {");
    expect(routers).toContain("previousPeriodStart");
    expect(routers).toContain("previousPeriodEnd");
    expect(admin).toContain("Last 7 Days");
    expect(admin).toContain("Last 30 Days");
    expect(admin).toContain("data-testid={`setup-funnel-preset-${period}`}");
    expect(admin).toContain('data-testid="setup-funnel-comparison-chart"');
    expect(admin).toContain("Current period vs. previous period");
  });

  it("builds a deterministic aggregate-only fallback insight around the highest drop-off step", () => {
    const step = (shown: number, actioned: number) => ({
      shown,
      actioned,
      dropOff: Math.max(shown - actioned, 0),
      continuationRate: shown ? Math.round((actioned / shown) * 1000) / 10 : 0,
    });
    const fallback = buildOnboardingFunnelInsightFallback({
      currentWindowDays: 30,
      current: {
        email: step(20, 16),
        platform: step(18, 9),
        contacts: step(12, 10),
        send: step(8, 7),
      },
      previous: {
        email: step(20, 18),
        platform: step(18, 12),
        contacts: step(12, 11),
        send: step(8, 7),
      },
    });

    expect(fallback.source).toBe("fallback");
    expect(fallback.highestDropOff).toMatchObject({
      step: "platform",
      label: "Add platform",
      rate: 50,
      delta: 16.7,
    });
    expect(fallback.observation).toContain("Add platform");
    expect(fallback.recommendation).toMatch(/potential improvement/i);
    expect(fallback).not.toHaveProperty("userId");
    expect(fallback).not.toHaveProperty("events");
  });

  it("keeps AI insight generation aggregate-only, admin-authorized, structured, rate-limited, and safely cached", () => {
    const routers = readSource("../server/routers.ts");
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");
    const insight = readSource("../server/onboardingFunnelInsight.ts");
    const rateLimiter = readSource("../server/rateLimiter.ts");

    expect(routers).toContain(
      "onboardingChecklistFunnelInsight: adminProcedure"
    );
    expect(routers).toContain(
      "checkOnboardingFunnelInsightRateLimit(ctx.user.id)"
    );
    expect(routers).toContain("generateOnboardingFunnelInsight");
    expect(admin).toContain('data-testid="setup-funnel-ai-insight"');
    expect(admin).toContain("staleTime: 5 * 60_000");
    expect(admin).toContain("refetchOnWindowFocus: false");
    expect(insight).toContain(
      "Use only the aggregate numbers supplied by the user."
    );
    expect(insight).toContain("Do not infer causation");
    expect(insight).toContain("buildOnboardingFunnelInsightFallback");
    expect(rateLimiter).toContain("MAX_ONBOARDING_INSIGHTS_PER_WINDOW = 12");
    expect(rateLimiter).toContain("checkOnboardingFunnelInsightRateLimit");
  });

  it("animates visible onboarding tips accessibly and communicates the remaining localized tip count", () => {
    const wizard = readSource("../client/src/components/OnboardingWizard.tsx");
    const styles = readSource("../client/src/index.css");

    expect(wizard).toContain("onboarding-tip-fade");
    expect(wizard).toContain("remainingTipCount");
    expect(wizard).toContain('t("onboardingWizard.tour.tipsRemaining"');
    expect(wizard).toContain('aria-live="polite"');
    expect(styles).toContain(".onboarding-tip-fade");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("localizes every chart label, axis date, tooltip rate, and empty state", () => {
    const activityTrend = readSource(
      "../client/src/components/dashboard/ActivityTrendCard.tsx"
    );

    expect(activityTrend).toContain('useTranslation("translation")');
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

    expect(serverBootstrap).toContain(
      'req.hostname.toLowerCase() === "www.getphame.app"'
    );
    expect(serverBootstrap).toContain(
      "res.redirect(301, `https://getphame.app${req.originalUrl}`)"
    );
    expect(serverBootstrap).not.toContain("const apexHost = host.slice(4)");
    expect(home).toContain(
      'window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")'
    );
    expect(home).toContain("window.location.assign(`sms:?&body=${text}`)");
    expect(settings).toContain(
      'window.open(url, "_blank", "noopener,noreferrer")'
    );
  });
});
