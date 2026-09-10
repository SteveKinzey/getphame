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

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

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

    expect(home).toMatch(
      /const\s+TrackingSummaryCard\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*["']@\/components\/dashboard\/TrackingSummaryCard["']\s*\)\s*\)/
    );
    expect(home).toMatch(
      /const\s+PlatformBreakdownChart\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*["']@\/components\/dashboard\/PlatformBreakdownChart["']\s*\)\s*\)/
    );
    expectSourceContract(home).toContain(
      "<SetupProgressCard status={onboardingStatus} userId={user?.id} onNavigate={navigate} />"
    );
    expectSourceContract(home).toContain(
      '<DeferredDashboardSection loadingLabel={t("homePage.loadingAnalytics")}'
    );
    expect(home).not.toContain("trpc.tracking.overallStats.useQuery");
    expect(dashboard).toMatch(
      /const\s+ActivityTrendCard\s*=\s*lazy\s*\(\s*\(\s*\)\s*=>\s*import\s*\(\s*["']@\/components\/dashboard\/ActivityTrendCard["']\s*\)\s*\)/s
    );
    expectSourceContract(dashboard).toContain(
      "<ActivityTrendCard total={stats?.total ?? 0} velocity={velocity} />"
    );
    expect(dashboard).not.toContain("trpc.tracking.dailyTrend.useQuery");
    expectSourceContract(deferredSection).toContain("IntersectionObserver");
    expectSourceContract(deferredSection).toContain('rootMargin: "280px 0px"');
    expectSourceContract(deferredSection).toContain("<Suspense fallback=");
    expectSourceContract(setupProgress).toContain('path: "/settings"');
    expectSourceContract(setupProgress).toContain('path: "/import"');
    expectSourceContract(setupProgress).toContain('path: "/send"');
    expectSourceContract(setupProgress).toContain('role="progressbar"');
  });

  it("persists Skip Tour state locally and lets users re-enable contextual tips", () => {
    const wizard = readSource("../client/src/components/OnboardingWizard.tsx");
    const settings = readSource("../client/src/pages/Settings.tsx");

    expectSourceContract(wizard).toContain(
      'const TOUR_SKIP_STORAGE_KEY = "rr_skip_tour"'
    );
    expectSourceContract(wizard).toContain(
      'window.localStorage.getItem(TOUR_SKIP_STORAGE_KEY) === "1"'
    );
    expectSourceContract(wizard).toContain(
      'window.localStorage.setItem(TOUR_SKIP_STORAGE_KEY, "1")'
    );
    expectSourceContract(wizard).toContain(
      "window.localStorage.removeItem(TOUR_SKIP_STORAGE_KEY)"
    );
    expectSourceContract(wizard).toContain("if (tipsHidden) return null;");
    expectSourceContract(wizard).toContain(
      "<OnboardingTourContext.Provider value={{ tipsHidden }}>"
    );
    expectSourceContract(wizard).toContain('t("onboardingWizard.tour.skip")');
    expectSourceContract(wizard).toContain('t("onboardingWizard.tour.show")');
    expectSourceContract(wizard).toContain("onboardingTipsEnabled");
    expectSourceContract(wizard).toContain(
      'const ONBOARDING_TIPS_CHANGE_EVENT = "rr:onboarding-tips-change"'
    );
    expectSourceContract(wizard).toContain(
      "new CustomEvent(ONBOARDING_TIPS_CHANGE_EVENT"
    );
    expectSourceContract(settings).toContain("settings.onboardingTips.title");
    expectSourceContract(settings).toContain(
      "aria-pressed={notifPrefs?.onboardingTipsEnabled ?? true}"
    );
    expectSourceContract(settings).toContain("const toggleOnboardingTips");
    expectSourceContract(settings).toContain("rr:onboarding-tips-change");
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

    expectSourceContract(routers).toContain(
      "trackOnboardingChecklistEvent: protectedProcedure"
    );
    expectSourceContract(routers).toContain(
      "z.enum(ONBOARDING_CHECKLIST_EVENT_NAMES)"
    );
    expectSourceContract(routers).toContain(
      "utmSource: ONBOARDING_CHECKLIST_EVENT_SOURCE"
    );
    expectSourceContract(routers).toContain("referrer: null");
    expectSourceContract(routers).toContain("userAgent: null");
    expect(routers).toMatch(
      /onboardingChecklistFunnel:\s*adminProcedure\s*\.input/
    );
    expectSourceContract(routers).toContain(
      "checkOnboardingChecklistEventRateLimit(ctx.user.id)"
    );
    expectSourceContract(rateLimiter).toContain(
      "MAX_ONBOARDING_EVENTS_PER_WINDOW = 60"
    );
    expectSourceContract(rateLimiter).toContain(
      "checkOnboardingChecklistEventRateLimit"
    );
    expectSourceContract(setupProgress).toContain(
      "claimOnboardingChecklistTelemetryEvent"
    );
    expectSourceContract(setupProgress).toContain("trackedEvents");
    expectSourceContract(setupProgress).toContain("_step_actioned");
    expectSourceContract(admin).toContain('data-testid="admin-setup-funnel"');
    expectSourceContract(admin).toContain(
      "Aggregate account-level events only"
    );
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

    expectSourceContract(routers).toContain(
      "MAX_ONBOARDING_FUNNEL_RANGE_DAYS = 366"
    );
    expectSourceContract(routers).toContain(
      "onboardingChecklistFunnelInputSchema"
    );
    expectSourceContract(routers).toContain(
      "Choose either a preset period or a custom date range."
    );
    expectSourceContract(routers).toContain(
      "onboardingChecklistFunnelExport: adminProcedure"
    );
    expectSourceContract(routers).toContain(
      "serializeAdminOperationsCsv(rows)"
    );
    expectSourceContract(routers).toContain(
      "contains no raw event, identity, or customer data"
    );
    expectSourceContract(admin).toContain("onboardingFunnelRangeValid");
    expectSourceContract(admin).toContain(
      "onboardingChecklistFunnelExport.useQuery"
    );
    expectSourceContract(admin).toContain("downloadOnboardingFunnelCsv");
    expectSourceContract(admin).toContain("URL.revokeObjectURL(url)");
    expectSourceContract(admin).toContain('data-testid="admin-setup-funnel"');
  });

  it("offers reusable presets and compares adjacent aggregate periods without exposing event rows", () => {
    const routers = readSource("../server/routers.ts");
    const admin = readSource("../client/src/pages/AdminDashboard.tsx");

    expectSourceContract(routers).toContain("comparison: {");
    expectSourceContract(routers).toContain("previousPeriodStart");
    expectSourceContract(routers).toContain("previousPeriodEnd");
    expectSourceContract(admin).toContain("Last 7 Days");
    expectSourceContract(admin).toContain("Last 30 Days");
    expectSourceContract(admin).toContain(
      "data-testid={`setup-funnel-preset-${period}`}"
    );
    expectSourceContract(admin).toContain(
      'data-testid="setup-funnel-comparison-chart"'
    );
    expectSourceContract(admin).toContain("Current period vs. previous period");
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

    expectSourceContract(routers).toContain(
      "onboardingChecklistFunnelInsight: adminProcedure"
    );
    expectSourceContract(routers).toContain(
      "checkOnboardingFunnelInsightRateLimit(ctx.user.id)"
    );
    expectSourceContract(routers).toContain("generateOnboardingFunnelInsight");
    expectSourceContract(admin).toContain(
      'data-testid="setup-funnel-ai-insight"'
    );
    expectSourceContract(admin).toContain("staleTime: 5 * 60_000");
    expectSourceContract(admin).toContain("refetchOnWindowFocus: false");
    expectSourceContract(insight).toContain(
      "Use only the aggregate numbers supplied by the user."
    );
    expectSourceContract(insight).toContain("Do not infer causation");
    expectSourceContract(insight).toContain(
      "buildOnboardingFunnelInsightFallback"
    );
    expectSourceContract(rateLimiter).toContain(
      "MAX_ONBOARDING_INSIGHTS_PER_WINDOW = 12"
    );
    expectSourceContract(rateLimiter).toContain(
      "checkOnboardingFunnelInsightRateLimit"
    );
  });

  it("animates visible onboarding tips accessibly and communicates the remaining localized tip count", () => {
    const wizard = readSource("../client/src/components/OnboardingWizard.tsx");
    const styles = readSource("../client/src/index.css");

    expectSourceContract(wizard).toContain("onboarding-tip-fade");
    expectSourceContract(wizard).toContain("remainingTipCount");
    expectSourceContract(wizard).toContain(
      't("onboardingWizard.tour.tipsRemaining"'
    );
    expectSourceContract(wizard).toContain('aria-live="polite"');
    expectSourceContract(styles).toContain(".onboarding-tip-fade");
    expectSourceContract(styles).toContain(
      "@media (prefers-reduced-motion: reduce)"
    );
  });

  it("localizes every chart label, axis date, tooltip rate, and empty state", () => {
    const activityTrend = readSource(
      "../client/src/components/dashboard/ActivityTrendCard.tsx"
    );

    expectSourceContract(activityTrend).toContain(
      'useTranslation("translation")'
    );
    expectSourceContract(activityTrend).toContain(
      "i18n.resolvedLanguage || i18n.language"
    );
    expectSourceContract(activityTrend).toContain('t("activityTrend.empty"');
    expectSourceContract(activityTrend).toContain('t("activityTrend.openRate"');
    expectSourceContract(activityTrend).toContain(
      't("activityTrend.clickRate"'
    );
    expectSourceContract(activityTrend).toContain('t("activityTrend.thisWeek"');
    expectSourceContract(activityTrend).toContain('t("activityTrend.allTime"');
  });

  it("uses a fixed canonical redirect target and isolates external popups from their opener", () => {
    const serverBootstrap = readSource("../server/_core/index.ts");
    const home = readSource("../client/src/pages/Home.tsx");
    const settings = readSource("../client/src/pages/Settings.tsx");

    expectSourceContract(serverBootstrap).toContain(
      'req.hostname.toLowerCase() === "www.getphame.app"'
    );
    expectSourceContract(serverBootstrap).toContain(
      "res.redirect(301, `https://getphame.app${req.originalUrl}`)"
    );
    expect(serverBootstrap).not.toContain("const apexHost = host.slice(4)");
    expect(home).toMatch(
      /window\.open\s*\(\s*`https:\/\/wa\.me\/\?text=\$\{text\}`\s*,\s*["']_blank["']\s*,\s*["']noopener,noreferrer["']\s*\)/
    );
    expectSourceContract(home).toContain(
      "window.location.assign(`sms:?&body=${text}`)"
    );
    expectSourceContract(settings).toContain(
      'window.open(url, "_blank", "noopener,noreferrer")'
    );
  });
});
