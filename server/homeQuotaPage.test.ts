import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FreeQuotaSummary } from "../shared/quota";

let profileFixture: {
  tier: "free";
  businessName: string;
  reviewLink: string;
  reviewGoal: number;
  planExpiresAt: null;
  freeQuota: FreeQuotaSummary;
};

const query = (data: unknown, extras: Record<string, unknown> = {}) => ({ data, ...extras });

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 701, name: "Quota Tester", email: "quota@example.test", role: "user" },
    isAuthenticated: true,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    profile: {
      get: { useQuery: () => query(profileFixture) },
      setGoal: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    smtp: { status: { useQuery: () => query({ connected: true, lastHealthStatus: "pass" }) } },
    requests: { stats: { useQuery: () => query({ thisMonth: 0, total: 0, recent: [] }) } },
    onboarding: {
      status: {
        useQuery: () => query({
          smtpConnected: true,
          hasPlatform: true,
          hasContacts: true,
          hasSentRequest: true,
        }),
      },
    },
    referral: {
      getCode: { useQuery: () => query({ shareUrl: "https://getphame.app/r/quota-test" }) },
      getStats: {
        useQuery: () => query({ totalReferrals: 0, convertedReferrals: 0, monthsEarned: 0 }, { isLoading: false }),
      },
    },
    tracking: {
      overallStats: {
        useQuery: () => query({ uniqueOpens: 0, uniqueClicks: 0, totalSent: 0 }, { isLoading: false }),
      },
    },
    analytics: {
      trackPwaEvent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    useUtils: () => ({ profile: { get: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("wouter", () => ({ useLocation: () => ["/", vi.fn()] }));
vi.mock("@/components/OnboardingGuide", () => ({ default: () => null }));
vi.mock("@/components/LanguageFlyout", () => ({
  default: () => React.createElement("div", { "data-testid": "language-flyout" }),
}));
vi.mock("@/hooks/useAnalytics", () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; date?: string }) => {
      const value = options?.defaultValue ?? key;
      return options?.date ? value.replace("{{date}}", options.date) : value;
    },
  }),
}));

describe("Home dashboard Free quota page wiring", () => {
  let HomePage: React.ComponentType;

  beforeAll(async () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { getItem: vi.fn(() => null), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() },
    });
    HomePage = (await import("../client/src/pages/Home")).default;
  });

  beforeEach(() => {
    profileFixture = {
      tier: "free",
      businessName: "Quota Test Business",
      reviewLink: "https://example.test/review",
      reviewGoal: 0,
      planExpiresAt: null,
      freeQuota: {
        phase: "initial",
        used: 0,
        remaining: 10,
        limit: 10,
        totalSent: 0,
        blocked: false,
        nextAvailableAt: null,
      },
    };
  });

  const renderHome = () => renderToStaticMarkup(React.createElement(HomePage));

  it("keeps the mobile brand lockup above the Share, Guide, and language controls", () => {
    const html = renderHome();

    expect(html).toContain('data-testid="home-header-layout"');
    expect(html).toContain('flex flex-col items-stretch gap-3 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2');
    expect(html).toContain('data-testid="home-header-actions"');
    expect(html).toContain('justify-end gap-2 flex-wrap sm:flex-nowrap');

    const brandIndex = html.indexOf('aria-label="Get Phame"');
    const actionsIndex = html.indexOf('data-testid="home-header-actions"');
    expect(brandIndex).toBeGreaterThan(-1);
    expect(actionsIndex).toBeGreaterThan(brandIndex);
    expect(html).toContain("Share");
    expect(html).toContain("Guide");
    expect(html).toContain('data-testid="language-flyout"');
  });

  it("renders the initial 10-request state from profile.freeQuota", () => {
    const html = renderHome();
    expect(html).toContain('data-phase="initial"');
    expect(html).toContain('data-blocked="false"');
    expect(html).toContain("Free plan: 10 initial requests, then 5 every rolling 30 days");
    expect(html).toContain("10/10");
  });

  it("renders the rolling 5-request state from profile.freeQuota", () => {
    profileFixture.freeQuota = {
      ...profileFixture.freeQuota,
      phase: "rolling",
      used: 0,
      totalSent: 10,
      remaining: 5,
      limit: 5,
    };
    const html = renderHome();
    expect(html).toContain('data-phase="rolling"');
    expect(html).toContain('data-blocked="false"');
    expect(html).toContain("Free plan: 5 requests every rolling 30 days");
    expect(html).toContain("5/5");
  });

  it("renders the blocked rolling state and next availability from profile.freeQuota", () => {
    const nextAvailableAt = Date.UTC(2026, 7, 15);
    profileFixture.freeQuota = {
      ...profileFixture.freeQuota,
      phase: "rolling",
      used: 5,
      totalSent: 15,
      remaining: 0,
      limit: 5,
      blocked: true,
      nextAvailableAt,
    };
    const html = renderHome();
    expect(html).toContain('data-phase="rolling"');
    expect(html).toContain('data-blocked="true"');
    expect(html).toContain("Free plan: 5 requests every rolling 30 days");
    expect(html).toContain("Next request available");
    expect(html).toContain("0/5");
  });
});
