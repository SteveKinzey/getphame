import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveWalkthroughCaptionLanguage } from "./VideoDemo";

const componentPath = fileURLToPath(new URL("./VideoDemo.tsx", import.meta.url));
const indexCssPath = fileURLToPath(new URL("../../index.css", import.meta.url));
const serverIndexPath = fileURLToPath(
  new URL("../../../../server/_core/index.ts", import.meta.url),
);
const fallbackResourcesPath = fileURLToPath(
  new URL("../../lib/i18nCompleteFallbackResources.json", import.meta.url),
);
const serviceWorkerPath = fileURLToPath(new URL("../../../public/sw.js", import.meta.url));
const captionTrackPaths = {
  en: fileURLToPath(new URL("../../../public/getphame-walkthrough.en.vtt", import.meta.url)),
  es: fileURLToPath(new URL("../../../public/getphame-walkthrough.es.vtt", import.meta.url)),
  fr: fileURLToPath(new URL("../../../public/getphame-walkthrough.fr.vtt", import.meta.url)),
  it: fileURLToPath(new URL("../../../public/getphame-walkthrough.it.vtt", import.meta.url)),
  de: fileURLToPath(new URL("../../../public/getphame-walkthrough.de.vtt", import.meta.url)),
  pt: fileURLToPath(new URL("../../../public/getphame-walkthrough.pt.vtt", import.meta.url)),
} as const;
const servedLocales = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;
const captionControlKeys = [
  "captionNotice",
  "captionTrackLabel",
  "captionTrackEnglish",
  "captionTrackSpanish",
  "captionTrackFrench",
  "captionTrackItalian",
  "captionTrackGerman",
  "captionTrackPortuguese",
  "captionLanguage",
  "captionLanguageAriaLabel",
  "captionLanguageEnglish",
  "captionLanguageSpanish",
  "captionLanguageFrench",
  "captionLanguageItalian",
  "captionLanguageGerman",
  "captionLanguagePortuguese",
  "captionsOn",
  "captionsOff",
  "captionsEnable",
  "captionsDisable",
  "captionToggleTooltip",
  "captionsHelp",
  "captionSettings",
  "captionSettingsAriaLabel",
  "captionFontSize",
  "captionFontSizeSmall",
  "captionFontSizeMedium",
  "captionFontSizeLarge",
  "captionBackground",
  "captionBackgroundBlack",
  "captionBackgroundNavy",
  "captionBackgroundClear",
  "captionAppearanceStatus",
  "videoFallback",
  "videoError",
  "videoRetry",
  "videoOpenDirect",
] as const;

function extractCueTimings(vtt: string) {
  return vtt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("-->"));
}

describe("VideoDemo media contract", () => {
  it("resolves saved and ordered browser caption languages deterministically", () => {
    expect(resolveWalkthroughCaptionLanguage("fr", ["pt-BR", "de-DE"])).toBe("fr");
    expect(resolveWalkthroughCaptionLanguage("invalid", ["ja-JP", "pt-BR", "de-DE"])).toBe("pt");
    expect(resolveWalkthroughCaptionLanguage(null, ["ja-JP", "de_DE", "pt-BR"])).toBe("de");
    expect(resolveWalkthroughCaptionLanguage(null, ["ja-JP", "ko-KR"])).toBe("en");
    expect(resolveWalkthroughCaptionLanguage(null, [])).toBe("en");
  });

  it("uses the clean self-hosted walkthrough and no stale YouTube embed", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain("/manus-storage/getphame-walkthrough-toggle-ready_4a3636b0.mp4");
    expect(source).toContain("/manus-storage/getphame-walkthrough-toggle-ready-poster_7dfd9fb1.png");
    expect(source).not.toContain("youtube.com");
    expect(source).not.toContain("GetPhame");
  });

  it("ships English, Spanish, French, Italian, German, and Portuguese WebVTT tracks with exact timing parity", async () => {
    const tracks = await Promise.all(
      Object.entries(captionTrackPaths).map(async ([language, path]) => ({
        language,
        source: await readFile(path, "utf8"),
      })),
    );
    const sourceTimings = extractCueTimings(tracks[0].source);

    expect(sourceTimings).toHaveLength(11);
    for (const track of tracks) {
      expect(track.source.trimStart().startsWith("WEBVTT")).toBe(true);
      expect(track.source).toContain("Get Phame");
      expect(extractCueTimings(track.source)).toEqual(sourceTimings);
      expect(track.source.match(/line:88% position:50% align:middle size:84%/g)).toHaveLength(11);
    }
  });

  it("maps one localized track per language and shows only the selected track", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain('en: "/getphame-walkthrough.en.vtt"');
    expect(source).toContain('es: "/getphame-walkthrough.es.vtt"');
    expect(source).toContain('fr: "/getphame-walkthrough.fr.vtt"');
    expect(source).toContain('it: "/getphame-walkthrough.it.vtt"');
    expect(source).toContain('de: "/getphame-walkthrough.de.vtt"');
    expect(source).toContain('pt: "/getphame-walkthrough.pt.vtt"');
    expect(source).toContain('kind="captions"');
    expect(source).toContain("captionLanguageOptions.map");
    expect(source).toContain('track.language === captionLanguage ? "showing" : "disabled"');
    expect(source).toContain("setCaptionLanguage(value)");
    expect(source).toContain("setCaptionsEnabled(true)");
    expect(source).toContain("playsInline");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).not.toContain('crossOrigin="anonymous"');
  });

  it("persists accessible caption, language, size, and background controls", async () => {
    const [source, css] = await Promise.all([
      readFile(componentPath, "utf8"),
      readFile(indexCssPath, "utf8"),
    ]);

    expect(source).toContain('"getphame-walkthrough-captions"');
    expect(source).toContain('"getphame-walkthrough-caption-language"');
    expect(source).toContain('"getphame-walkthrough-caption-font-size"');
    expect(source).toContain('"getphame-walkthrough-caption-background"');
    expect(source).toContain("aria-pressed={captionsEnabled}");
    expect(source).toContain('aria-keyshortcuts="C"');
    expect(source).toContain('data-testid="caption-toggle"');
    expect(source).toContain("<Tooltip>");
    expect(source).toContain("landing.modal.captionToggleTooltip");
    expect(source).toContain("language: selectedCaptionLanguageLabel");
    expect(source).toContain("motion-safe:hover:-translate-y-0.5");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("motion-reduce:animate-none");
    expect(source).toContain("sm:order-first");
    expect(source).toContain('data-testid="caption-language-trigger"');
    expect(source).toContain('data-testid="caption-settings-trigger"');
    expect(source).toContain("data-caption-language={captionLanguage}");
    expect(source).toContain("data-caption-size={captionFontSize}");
    expect(source).toContain("data-caption-background={captionBackground}");
    expect(source).toContain("landing.modal.captionFontSizeSmall");
    expect(source).toContain("landing.modal.captionBackgroundClear");
    expect(source).toContain("landing.modal.captionAppearanceStatus");
    expect(source).not.toContain("landing.modal.captionSizeSmall");
    expect(source).not.toContain("landing.modal.captionBackgroundTranslucent");
    expect(source).not.toContain("landing.modal.captionStatusSummary");

    expect(css).toContain(".getphame-walkthrough-video[data-caption-size='small']::cue");
    expect(css).toContain(".getphame-walkthrough-video[data-caption-size='large']::cue");
    expect(css).toContain(".getphame-walkthrough-video[data-caption-background='black']::cue");
    expect(css).toContain(".getphame-walkthrough-video[data-caption-background='translucent']::cue");
  });

  it("limits the C shortcut to the active dialog and ignores conflicting key events", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain("if (!open) return");
    expect(source).toContain('event.key.toLowerCase() === "c"');
    expect(source).toContain("!event.defaultPrevented");
    expect(source).toContain("!event.altKey");
    expect(source).toContain("!event.ctrlKey");
    expect(source).toContain("!event.metaKey");
    expect(source).toContain("!event.repeat");
    expect(source).toContain("eventTarget.isContentEditable");
    expect(source).toContain("eventTarget.closest('[role=\"textbox\"]')");
    expect(source).toContain("isMenuTarget");
    expect(source).toContain("document.removeEventListener(\"keydown\", handleKeyDown)");
  });

  it("negotiates a first-use caption language while preserving valid saved choices", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain('WALKTHROUGH_CAPTION_LANGUAGES = ["en", "es", "fr", "it", "de", "pt"]');
    expect(source).toContain("if (isWalkthroughCaptionLanguage(storedLanguage)) return storedLanguage");
    expect(source).toContain("for (const browserLanguage of browserLanguages)");
    expect(source).toContain("browserLanguage.trim().toLowerCase().split(/[-_]/)[0]");
    expect(source).toContain('return "en"');
    expect(source).toContain("window.navigator.languages");
    expect(source).toContain("window.navigator.language");
  });

  it("allows the managed-storage redirect host and shows localized recovery controls", async () => {
    const [serverSource, componentSource] = await Promise.all([
      readFile(serverIndexPath, "utf8"),
      readFile(componentPath, "utf8"),
    ]);

    expect(serverSource).toContain("mediaSrc:");
    expect(serverSource.match(/https:\/\/d36hbw14aib5lz\.cloudfront\.net/g)).toHaveLength(2);
    expect(componentSource).toContain("videoError");
    expect(componentSource).toContain("onError");
    expect(componentSource).toContain("landing.modal.videoError");
    expect(componentSource).toContain("landing.modal.videoRetry");
    expect(componentSource).toContain("landing.modal.videoOpenDirect");
  });

  it.each(servedLocales)("keeps the %s landing-video catalog complete and current", async (locale) => {
    const localePath = fileURLToPath(
      new URL(`../../../public/locales/${locale}/landing.json`, import.meta.url),
    );
    const catalog = JSON.parse(await readFile(localePath, "utf8")) as {
      landing: {
        section: { description: string };
        thumbnail: { altText: string };
        bottomBar: { title: string };
        modal: Record<string, string>;
      };
    };

    expect(catalog.landing.section.description).toContain("63");
    expect(catalog.landing.thumbnail.altText).toContain("Get Phame");
    expect(catalog.landing.bottomBar.title).toContain("Get Phame");
    expect(catalog.landing.modal.videoTitle).toContain("Get Phame");
    for (const key of captionControlKeys) {
      expect(catalog.landing.modal[key], `${locale} landing.modal.${key}`).toBeTruthy();
    }
    expect(catalog.landing.modal.captionLanguageAriaLabel).toContain("{{language}}");
    expect(catalog.landing.modal.captionToggleTooltip).toContain("{{language}}");
    expect(catalog.landing.modal.captionAppearanceStatus).toContain("{{size}}");
    expect(catalog.landing.modal.captionAppearanceStatus).toContain("{{background}}");
    expect(catalog.landing.modal.iframeTitle).toBeUndefined();
  });

  it("keeps the generated runtime fallback complete for every caption-control locale", async () => {
    const fallbackResources = JSON.parse(await readFile(fallbackResourcesPath, "utf8")) as Record<
      string,
      { landing: { modal: Record<string, string> } }
    >;

    for (const locale of servedLocales) {
      for (const key of captionControlKeys) {
        expect(fallbackResources[locale]?.landing.modal[key], `${locale} fallback landing.modal.${key}`).toBeTruthy();
      }
    }
  });

  it("keeps the active English translation override aligned with the player lookups", async () => {
    const translationPath = fileURLToPath(
      new URL("../../../public/locales/en/translation.json", import.meta.url),
    );
    const catalog = JSON.parse(await readFile(translationPath, "utf8")) as {
      landing: { modal: Record<string, string> };
    };

    for (const key of captionControlKeys) {
      expect(catalog.landing.modal[key], `en translation landing.modal.${key}`).toBeTruthy();
    }
    expect(catalog.landing.modal.captionTrackEnglish).toBe("English captions");
    expect(catalog.landing.modal.captionLanguageSpanish).toBe("Spanish");
    expect(catalog.landing.modal.captionLanguageFrench).toBe("French");
    expect(catalog.landing.modal.captionLanguageItalian).toBe("Italian");
    expect(catalog.landing.modal.captionLanguageGerman).toBe("German");
    expect(catalog.landing.modal.captionLanguagePortuguese).toBe("Portuguese");
    expect(catalog.landing.modal.captionsEnable).toBe("Enable captions");
    expect(catalog.landing.modal.captionFontSizeLarge).toBe("Large");
    expect(catalog.landing.modal.captionBackgroundNavy).toBe("Navy");
    expect(catalog.landing.modal.captionToggleTooltip).toBe("Current caption language: {{language}}");
  });

  it("bumps the PWA cache and pre-caches caption tracks while bypassing managed media", async () => {
    const serviceWorker = await readFile(serviceWorkerPath, "utf8");

    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v15'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.en.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.es.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.fr.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.it.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.de.vtt'");
    expect(serviceWorker).toContain("'/getphame-walkthrough.pt.vtt'");
    expect(serviceWorker).toContain("'/locales/fr/landing.json'");
    expect(serviceWorker).toContain("url.pathname.startsWith('/manus-storage/')");
    expect(serviceWorker).toContain(".filter((name) => name !== CACHE_NAME)");
    expect(serviceWorker).toContain("self.skipWaiting()");
    expect(serviceWorker).toContain("self.clients.claim()");
  });
});
