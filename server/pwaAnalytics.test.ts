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

function toFormattedSourcePattern(snippet: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = "";

  for (let index = 0; index < snippet.length; ) {
    const character = snippet[index];
    if (character === '"' || character === "'") {
      let closingIndex = index + 1;
      while (closingIndex < snippet.length) {
        if (
          snippet[closingIndex] === character &&
          snippet[closingIndex - 1] !== "\\"
        )
          break;
        closingIndex += 1;
      }
      if (closingIndex < snippet.length) {
        pattern += `["']${escape(snippet.slice(index + 1, closingIndex))}["']`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (/\s/.test(character)) {
      while (index < snippet.length && /\s/.test(snippet[index])) index += 1;
      pattern += "\\s*";
      continue;
    }

    pattern += escape(character);
    if ("().,=:?{}[]<>".includes(character)) pattern += "\\s*";
    index += 1;
  }

  return new RegExp(pattern);
}

function expectFormattedSource(source: string) {
  return {
    toContain(snippet: string) {
      expect(source).toMatch(toFormattedSourcePattern(snippet));
    },
    not: {
      toContain(snippet: string) {
        expect(source).not.toMatch(toFormattedSourcePattern(snippet));
      },
    },
  };
}

function projectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
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
    const row = (
      event: (typeof PWA_EVENT_NAMES)[number],
      daysAgo: number,
      platform: string
    ): PwaAnalyticsRow => ({
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
      {
        page: "/customers/private",
        utmMedium: "ios",
        createdAt: new Date(now),
      },
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
    expectFormattedSource(prompt).toContain(
      'const CANONICAL_URL = "https://getphame.app/"'
    );
    expectFormattedSource(prompt).toContain("navigator.share(shareData)");
    expectFormattedSource(prompt).toContain(
      "navigator.clipboard.writeText(CANONICAL_URL)"
    );
    expectFormattedSource(prompt).toContain('error.name === "AbortError"');
    expectFormattedSource(prompt).toContain('aria-live="polite"');
    expectFormattedSource(prompt).toContain('record("share_completed")');
    expectFormattedSource(prompt).toContain('record("share_copied")');
    expectFormattedSource(home).toContain("shareGetPhame()");
    expectFormattedSource(home).toContain('event: "share_completed"');
    expectFormattedSource(home).toContain('event: "share_copied"');
    expectFormattedSource(home).toContain('event: "share_cancelled"');
    expectFormattedSource(home).toContain('role="status" aria-live="polite"');
    expectFormattedSource(shareHelper).toContain(
      "navigator.share(await getLocalizedGetPhameShareData())"
    );
    expectFormattedSource(shareHelper).toContain(
      "navigator.clipboard.writeText(GET_PHAME_SHARE_DATA.url"
    );
    expectFormattedSource(shareHelper).toContain('error.name === "AbortError"');
  });

  it("keeps install attention motion non-obstructive and disabled for reduced motion", () => {
    const prompt = projectFile("../client/src/components/PWAInstallPrompt.tsx");
    const styles = projectFile("../client/src/index.css");
    expectFormattedSource(prompt).toContain("pwa-install-attention");
    expectFormattedSource(styles).toContain(".pwa-install-attention");
    expectFormattedSource(styles).toContain("transform: translateY(-2px)");
    expectFormattedSource(styles).toContain(
      "@media (prefers-reduced-motion: reduce)"
    );
    expectFormattedSource(styles).toContain("animation: none !important");
  });

  it("makes the onboarding completion step a localized install-and-share conversion surface", () => {
    const guide = projectFile("../client/src/components/OnboardingGuide.tsx");
    expectFormattedSource(guide).toContain("onboardingGuide.allSet.iosInstall");
    expectFormattedSource(guide).toContain(
      "onboardingGuide.allSet.androidInstall"
    );
    expectFormattedSource(guide).toContain("navigator.share(shareData)");
    expectFormattedSource(guide).toContain(
      "navigator.clipboard.writeText(url)"
    );
    expectFormattedSource(guide).toContain('event: "share_cancelled"');
    expectFormattedSource(guide).toContain('event: "share_copied"');
    expectFormattedSource(guide).toContain('aria-live="polite"');

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
      const messages = JSON.parse(
        projectFile(`../client/public/locales/${locale}/translation.json`)
      );
      const allSet = messages.onboardingGuide.allSet;
      expect(allSet).toBeTypeOf("object");
      for (const key of requiredKeys) {
        expect(
          allSet[key],
          `${locale} is missing onboardingGuide.allSet.${key}`
        ).toBeTypeOf("string");
        expect(allSet[key].trim()).not.toBe("");
      }
    }
  });
});
