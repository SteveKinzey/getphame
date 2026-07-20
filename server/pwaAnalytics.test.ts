import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  fromPwaEventPage,
  PWA_EVENT_NAMES,
  summarizePwaEvents,
  toPwaEventPage,
  type PwaAnalyticsRow,
} from "./pwaAnalytics";

function projectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("privacy-light PWA analytics", () => {
  it("accepts only the explicit install and share event allowlist", () => {
    expect(PWA_EVENT_NAMES).toEqual([
      "install_guide_viewed",
      "install_guide_dismissed",
      "install_prompt_opened",
      "install_accepted",
      "install_declined",
      "app_installed",
      "install_banner_viewed",
      "install_banner_clicked",
      "install_banner_dismissed",
      "install_banner_remind_later",
      "share_completed",
      "share_cancelled",
      "share_copied",
    ]);

    for (const event of PWA_EVENT_NAMES) {
      expect(fromPwaEventPage(toPwaEventPage(event))).toBe(event);
    }
    expect(fromPwaEventPage("/pwa/customer-email")).toBeNull();
    expect(fromPwaEventPage("/customers/42")).toBeNull();
  });

  it("reports aggregate funnel counts and rates without raw visitor records", () => {
    const now = Date.UTC(2026, 6, 15);
    const row = (event: (typeof PWA_EVENT_NAMES)[number], daysAgo: number, platform: string): PwaAnalyticsRow => ({
      page: toPwaEventPage(event),
      utmMedium: platform,
      createdAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
    });
    const rows = [
      row("install_guide_viewed", 1, "ios"),
      row("install_guide_viewed", 2, "android"),
      row("install_prompt_opened", 2, "android"),
      row("install_accepted", 2, "android"),
      row("app_installed", 2, "android"),
      row("share_completed", 3, "ios"),
      row("share_copied", 40, "unknown"),
      row("share_cancelled", 3, "ios"),
      { page: "/customers/private", utmMedium: "ios", createdAt: new Date(now) },
    ];

    const summary = summarizePwaEvents(rows, now);
    expect(summary.allTime.install_guide_viewed).toBe(2);
    expect(summary.allTime.share_copied).toBe(1);
    expect(summary.last30Days.share_copied).toBe(0);
    expect(summary.byPlatform.android.app_installed).toBe(1);
    expect(summary.rates).toEqual({
      promptEngagement: 50,
      installCompletion: 50,
      installAcceptance: 100,
      shareConversion: 100,
      shareCompletion: 66.7,
    });
    expect(summary).not.toHaveProperty("rows");
    expect(summary).not.toHaveProperty("visitors");
  });
});

describe("Get Phame install and sharing contracts", () => {
  it("uses native sharing, canonical clipboard fallback, accessible status, and detectable cancellation", () => {
    const prompt = projectFile("../client/src/components/PWAInstallPrompt.tsx");
    const home = projectFile("../client/src/pages/Home.tsx");
    const shareHelper = projectFile("../client/src/lib/pwaShare.ts");
    expect(prompt).toContain('const CANONICAL_URL = "https://getphame.app/"');
    expect(prompt).toContain("navigator.share(shareData)");
    expect(prompt).toContain("navigator.clipboard.writeText(CANONICAL_URL)");
    expect(prompt).toContain('error.name === "AbortError"');
    expect(prompt).toContain('aria-live="polite"');
    expect(prompt).toContain('record("share_completed")');
    expect(prompt).toContain('record("share_copied")');
    expect(home).toContain("shareGetPhame()");
    expect(home).toContain('event: "share_completed"');
    expect(home).toContain('event: "share_copied"');
    expect(home).toContain('event: "share_cancelled"');
    expect(home).toContain('role="status" aria-live="polite"');
    expect(shareHelper).toContain("navigator.share(await getLocalizedGetPhameShareData())");
    expect(shareHelper).toContain("navigator.clipboard.writeText(GET_PHAME_SHARE_DATA.url");
    expect(shareHelper).toContain('error.name === "AbortError"');
  });

  it("keeps install attention motion non-obstructive and disabled for reduced motion", () => {
    const prompt = projectFile("../client/src/components/PWAInstallPrompt.tsx");
    const styles = projectFile("../client/src/index.css");
    expect(prompt).toContain("pwa-install-attention");
    expect(styles).toContain(".pwa-install-attention");
    expect(styles).toContain("transform: translateY(-2px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation: none !important");
  });

  it("makes the onboarding completion step a localized install-and-share conversion surface", () => {
    const guide = projectFile("../client/src/components/OnboardingGuide.tsx");
    expect(guide).toContain('onboardingGuide.allSet.iosInstall');
    expect(guide).toContain('onboardingGuide.allSet.androidInstall');
    expect(guide).toContain("navigator.share(shareData)");
    expect(guide).toContain('navigator.clipboard.writeText(url)');
    expect(guide).toContain('event: "share_cancelled"');
    expect(guide).toContain('event: "share_copied"');
    expect(guide).toContain('aria-live="polite"');

    const requiredKeys = [
      "installTitle",
      "iosInstall",
      "androidInstall",
      "shareButton",
      "shareText",
      "shareSuccess",
      "copySuccess",
      "shareCancelled",
      "shareError",
    ];

    for (const locale of ["en", "zh-CN", "es", "fr", "th", "zh-TW"]) {
      const messages = JSON.parse(projectFile(`../client/public/locales/${locale}/translation.json`));
      const allSet = messages.onboardingGuide.allSet;
      expect(allSet).toBeTypeOf("object");
      for (const key of requiredKeys) {
        expect(allSet[key], `${locale} is missing onboardingGuide.allSet.${key}`).toBeTypeOf("string");
        expect(allSet[key].trim()).not.toBe("");
      }
    }
  });
});
