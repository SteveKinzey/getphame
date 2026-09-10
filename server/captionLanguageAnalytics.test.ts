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

const routerPath = fileURLToPath(new URL("./routers.ts", import.meta.url));
const componentPath = fileURLToPath(
  new URL("../client/src/components/landing/VideoDemo.tsx", import.meta.url)
);

describe("caption-language analytics privacy contract", () => {
  it("accepts only the six supported bounded language codes", () => {
    expect(CAPTION_LANGUAGE_ANALYTICS_LANGUAGES).toEqual([
      "en",
      "es",
      "fr",
      "it",
      "de",
      "pt",
    ]);
    for (const language of CAPTION_LANGUAGE_ANALYTICS_LANGUAGES) {
      expect(
        fromCaptionLanguageEventPage(toCaptionLanguageEventPage(language))
      ).toBe(language);
    }
    expect(fromCaptionLanguageEventPage("/captions/language/ja")).toBeNull();
    expect(
      fromCaptionLanguageEventPage("/captions/language/en/free-text")
    ).toBeNull();
  });

  it("returns aggregate counts only and ignores malformed event pages", () => {
    const now = Date.UTC(2026, 6, 25);
    const summary = summarizeCaptionLanguageEvents(
      [
        {
          page: toCaptionLanguageEventPage("it"),
          createdAt: new Date(now - 1_000),
        },
        {
          page: toCaptionLanguageEventPage("it"),
          createdAt: new Date(now - 40 * 24 * 60 * 60 * 1000),
        },
        {
          page: toCaptionLanguageEventPage("fr"),
          createdAt: new Date(now - 2_000),
        },
        { page: "/captions/language/unsupported", createdAt: new Date(now) },
      ],
      now
    );

    expect(summary.allTime.it).toBe(2);
    expect(summary.allTime.fr).toBe(1);
    expect(summary.last30Days.it).toBe(1);
    expect(summary.last30Days.fr).toBe(1);
    expect(summary.topAllTime).toEqual({ language: "it", count: 2 });
    expect(summary.topLast30Days).toEqual({ language: "fr", count: 1 });
    expect(JSON.stringify(summary)).not.toMatch(
      /user|identity|referrer|agent|free.?text/i
    );
  });

  it("emits from the explicit language handler and persists no visitor context", async () => {
    const [routerSource, componentSource] = await Promise.all([
      readFile(routerPath, "utf8"),
      readFile(componentPath, "utf8"),
    ]);

    expect(componentSource.match(/trackCaptionLanguage\.mutate/g)).toHaveLength(
      1
    );
    expect(componentSource).toMatch(
      /setCaptionLanguage\s*\(\s*value\s*\)\s*;\s*setCaptionsEnabled\s*\(\s*true\s*\)\s*;\s*setCaptionLanguageMenuOpen\s*\(\s*false\s*\)\s*;\s*trackCaptionLanguage\s*\.\s*mutate\s*\(\s*\{\s*language\s*:\s*value\s*,?\s*\}\s*\)/s
    );

    expectFormattedSource(routerSource).toContain(
      "z.enum(CAPTION_LANGUAGE_ANALYTICS_LANGUAGES)"
    );
    expectFormattedSource(routerSource).toContain(
      "utmSource: CAPTION_LANGUAGE_ANALYTICS_SOURCE"
    );
    expectFormattedSource(routerSource).toContain("userId: null");
    expectFormattedSource(routerSource).toContain("referrer: null");
    expectFormattedSource(routerSource).toContain("userAgent: null");
    expectFormattedSource(routerSource).toContain(
      'utmCampaign: "walkthrough_caption_language"'
    );
    expect(CAPTION_LANGUAGE_ANALYTICS_SOURCE).toBe("walkthrough_captions");
  });
});
