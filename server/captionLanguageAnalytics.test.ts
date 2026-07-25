import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CAPTION_LANGUAGE_ANALYTICS_LANGUAGES,
  CAPTION_LANGUAGE_ANALYTICS_SOURCE,
  fromCaptionLanguageEventPage,
  summarizeCaptionLanguageEvents,
  toCaptionLanguageEventPage,
} from "./captionLanguageAnalytics";

const routerPath = fileURLToPath(new URL("./routers.ts", import.meta.url));
const componentPath = fileURLToPath(
  new URL("../client/src/components/landing/VideoDemo.tsx", import.meta.url),
);

describe("caption-language analytics privacy contract", () => {
  it("accepts only the six supported bounded language codes", () => {
    expect(CAPTION_LANGUAGE_ANALYTICS_LANGUAGES).toEqual(["en", "es", "fr", "it", "de", "pt"]);
    for (const language of CAPTION_LANGUAGE_ANALYTICS_LANGUAGES) {
      expect(fromCaptionLanguageEventPage(toCaptionLanguageEventPage(language))).toBe(language);
    }
    expect(fromCaptionLanguageEventPage("/captions/language/ja")).toBeNull();
    expect(fromCaptionLanguageEventPage("/captions/language/en/free-text")).toBeNull();
  });

  it("returns aggregate counts only and ignores malformed event pages", () => {
    const now = Date.UTC(2026, 6, 25);
    const summary = summarizeCaptionLanguageEvents([
      { page: toCaptionLanguageEventPage("it"), createdAt: new Date(now - 1_000) },
      { page: toCaptionLanguageEventPage("it"), createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000) },
      { page: toCaptionLanguageEventPage("fr"), createdAt: new Date(now - 2_000) },
      { page: "/captions/language/unsupported", createdAt: new Date(now) },
    ], now);

    expect(summary.allTime.it).toBe(2);
    expect(summary.allTime.fr).toBe(1);
    expect(summary.last30Days.it).toBe(1);
    expect(summary.last30Days.fr).toBe(1);
    expect(summary.topAllTime).toEqual({ language: "it", count: 2 });
    expect(summary.topLast30Days).toEqual({ language: "fr", count: 1 });
    expect(JSON.stringify(summary)).not.toMatch(/user|identity|referrer|agent|free.?text/i);
  });

  it("emits from the explicit language handler and persists no visitor context", async () => {
    const [routerSource, componentSource] = await Promise.all([
      readFile(routerPath, "utf8"),
      readFile(componentPath, "utf8"),
    ]);

    expect(componentSource.match(/trackCaptionLanguage\.mutate/g)).toHaveLength(1);
    const analyticsCallIndex = componentSource.indexOf("trackCaptionLanguage.mutate({ language: value })");
    expect(analyticsCallIndex).toBeGreaterThan(-1);
    expect(componentSource.slice(analyticsCallIndex - 450, analyticsCallIndex + 120)).toContain(
      "setCaptionLanguage(value)",
    );

    expect(routerSource).toContain("z.enum(CAPTION_LANGUAGE_ANALYTICS_LANGUAGES)");
    expect(routerSource).toContain("utmSource: CAPTION_LANGUAGE_ANALYTICS_SOURCE");
    expect(routerSource).toContain("userId: null");
    expect(routerSource).toContain("referrer: null");
    expect(routerSource).toContain("userAgent: null");
    expect(routerSource).toContain("utmCampaign: \"walkthrough_caption_language\"");
    expect(CAPTION_LANGUAGE_ANALYTICS_SOURCE).toBe("walkthrough_captions");
  });
});
