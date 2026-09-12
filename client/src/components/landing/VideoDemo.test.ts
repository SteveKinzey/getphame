import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findActiveTranscriptCueIndex,
  formatTranscriptTime,
  parseWebVttCues,
  resolveWalkthroughCaptionLanguage,
} from "./VideoDemo";

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

const componentPath = fileURLToPath(
  new URL("./VideoDemo.tsx", import.meta.url)
);
const indexCssPath = fileURLToPath(new URL("../../index.css", import.meta.url));
const serverIndexPath = fileURLToPath(
  new URL("../../../../server/_core/index.ts", import.meta.url)
);
const fallbackResourcesPath = fileURLToPath(
  new URL("../../lib/i18nCompleteFallbackResources.json", import.meta.url)
);
const serviceWorkerPath = fileURLToPath(
  new URL("../../../public/sw.js", import.meta.url)
);
const captionTrackPaths = {
  en: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.en.vtt", import.meta.url)
  ),
  es: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.es.vtt", import.meta.url)
  ),
  fr: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.fr.vtt", import.meta.url)
  ),
  it: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.it.vtt", import.meta.url)
  ),
  de: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.de.vtt", import.meta.url)
  ),
  pt: fileURLToPath(
    new URL("../../../public/getphame-walkthrough.pt.vtt", import.meta.url)
  ),
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
  "captionPreview",
  "captionPreviewSample",
  "captionFontFamily",
  "captionFontFamilySans",
  "captionFontFamilySerif",
  "captionFontFamilyMono",
  "captionTextColor",
  "captionTextColorWhite",
  "captionTextColorGold",
  "captionTextColorCyan",
  "captionTextOpacity",
  "captionTextOpacitySolid",
  "captionTextOpacityHigh",
  "captionTextOpacitySoft",
  "captionLineSpacing",
  "captionLineSpacingCompact",
  "captionLineSpacingStandard",
  "captionLineSpacingSpacious",
  "captionTextEdge",
  "captionTextEdgeNone",
  "captionTextEdgeShadow",
  "captionTextEdgeOutline",
  "captionSettingsReset",
  "captionAppearanceStatus",
  "captionAppearanceStatusExpanded",
  "transcriptTitle",
  "transcriptHelp",
  "transcriptLoading",
  "transcriptError",
  "transcriptCueList",
  "transcriptJumpTo",
  "transcriptCurrent",
  "transcriptExportGroupLabel",
  "transcriptExportText",
  "transcriptExportPdf",
  "transcriptExportPreparing",
  "transcriptExportDocumentTitle",
  "transcriptExportLanguageLabel",
  "transcriptExportGeneratedLabel",
  "transcriptExportSourceLabel",
  "transcriptExportTextSuccess",
  "transcriptExportPdfSuccess",
  "transcriptExportError",
  "videoFallback",
  "videoError",
  "videoRetry",
  "videoOpenDirect",
] as const;

function extractCueTimings(vtt: string) {
  return vtt
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.includes("-->"));
}

describe("VideoDemo media contract", () => {
  it("resolves saved and ordered browser caption languages deterministically", () => {
    expect(resolveWalkthroughCaptionLanguage("fr", ["pt-BR", "de-DE"])).toBe(
      "fr"
    );
    expect(
      resolveWalkthroughCaptionLanguage("invalid", ["ja-JP", "pt-BR", "de-DE"])
    ).toBe("pt");
    expect(
      resolveWalkthroughCaptionLanguage(null, ["ja-JP", "de_DE", "pt-BR"])
    ).toBe("de");
    expect(resolveWalkthroughCaptionLanguage(null, ["ja-JP", "ko-KR"])).toBe(
      "en"
    );
    expect(resolveWalkthroughCaptionLanguage(null, [])).toBe("en");
  });

  it("uses durable public walkthrough assets and no signed-storage or stale YouTube dependency", async () => {
    const source = await readFile(componentPath, "utf8");

    expectFormattedSource(source).toContain(
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/FzhqTiXowReoxlBi.mp4"
    );
    expectFormattedSource(source).toContain(
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/nHoGaEKduUhABALQ.png"
    );
    expectFormattedSource(source).not.toContain(
      "/manus-storage/getphame-walkthrough"
    );
    expectFormattedSource(source).not.toContain("youtube.com");
    expectFormattedSource(source).not.toContain("GetPhame");
  });

  it("uses an accessible custom play overlay with restrained reduced-motion-safe hover feedback", async () => {
    const source = await readFile(componentPath, "utf8");

    expectFormattedSource(source).toContain('type="button"');
    expectFormattedSource(source).toContain('aria-haspopup="dialog"');
    expectFormattedSource(source).toContain("aria-expanded={open}");
    expectFormattedSource(source).toContain(
      'data-walkthrough-play-overlay="true"'
    );
    expectFormattedSource(source).toContain('aria-hidden="true"');
    expectFormattedSource(source).toContain("motion-safe:hover:scale-[1.008]");
    expectFormattedSource(source).toContain("group-hover:scale-[1.05]");
    expectFormattedSource(source).toContain("group-focus-visible:scale-[1.05]");
    expectFormattedSource(source).toContain("motion-reduce:transform-none");
    expectFormattedSource(source).toContain("motion-reduce:transition-none");
    expectFormattedSource(source).toContain(
      "ease-[cubic-bezier(0.23,1,0.32,1)]"
    );
  });

  it("ships English, Spanish, French, Italian, German, and Portuguese WebVTT tracks with exact timing parity", async () => {
    const tracks = await Promise.all(
      Object.entries(captionTrackPaths).map(async ([language, path]) => ({
        language,
        source: await readFile(path, "utf8"),
      }))
    );
    const sourceTimings = extractCueTimings(tracks[0].source);

    expect(sourceTimings).toHaveLength(11);
    for (const track of tracks) {
      expect(track.source.trimStart().startsWith("WEBVTT")).toBe(true);
      expect(track.source).toContain("Get Phame");
      expect(extractCueTimings(track.source)).toEqual(sourceTimings);
      expect(
        track.source.match(/line:88% position:50% align:middle size:84%/g)
      ).toHaveLength(11);
    }
  });

  it("maps one localized track per language and shows only the selected track", async () => {
    const source = await readFile(componentPath, "utf8");

    expectFormattedSource(source).toContain(
      'en: "/getphame-walkthrough.en.vtt"'
    );
    expectFormattedSource(source).toContain(
      'es: "/getphame-walkthrough.es.vtt"'
    );
    expectFormattedSource(source).toContain(
      'fr: "/getphame-walkthrough.fr.vtt"'
    );
    expectFormattedSource(source).toContain(
      'it: "/getphame-walkthrough.it.vtt"'
    );
    expectFormattedSource(source).toContain(
      'de: "/getphame-walkthrough.de.vtt"'
    );
    expectFormattedSource(source).toContain(
      'pt: "/getphame-walkthrough.pt.vtt"'
    );
    expectFormattedSource(source).toContain('kind="captions"');
    expectFormattedSource(source).toContain("captionLanguageOptions.map");
    expectFormattedSource(source).toContain(
      'track.language === captionLanguage ? "showing" : "disabled"'
    );
    expectFormattedSource(source).toContain("setCaptionLanguage(value)");
    expectFormattedSource(source).toContain("setCaptionsEnabled(true)");
    expectFormattedSource(source).toContain("playsInline");
    expectFormattedSource(source).toContain('role="dialog"');
    expectFormattedSource(source).toContain('aria-modal="true"');
    expectFormattedSource(source).not.toContain('crossOrigin="anonymous"');
  });

  it("persists accessible caption controls and keeps the live preview equivalent to WebVTT cue styles", async () => {
    const [source, css] = await Promise.all([
      readFile(componentPath, "utf8"),
      readFile(indexCssPath, "utf8"),
    ]);

    expectFormattedSource(source).toContain('"getphame-walkthrough-captions"');
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-language"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-font-size"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-background"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-font-family"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-text-color"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-text-opacity"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-line-spacing"'
    );
    expectFormattedSource(source).toContain(
      '"getphame-walkthrough-caption-text-edge"'
    );
    expectFormattedSource(source).toContain("aria-pressed={captionsEnabled}");
    expectFormattedSource(source).toContain('aria-keyshortcuts="C"');
    expectFormattedSource(source).toContain('data-testid="caption-toggle"');
    expectFormattedSource(source).toContain("<Tooltip>");
    expectFormattedSource(source).toContain(
      "landing.modal.captionToggleTooltip"
    );
    expectFormattedSource(source).toContain(
      "language: selectedCaptionLanguageLabel"
    );
    expectFormattedSource(source).toContain(
      "motion-safe:hover:-translate-y-0.5"
    );
    expectFormattedSource(source).toContain("motion-reduce:transition-none");
    expectFormattedSource(source).toContain("motion-reduce:animate-none");
    expectFormattedSource(source).toContain("sm:order-first");
    expectFormattedSource(source).toContain(
      'data-testid="caption-language-trigger"'
    );
    expectFormattedSource(source).toContain(
      'data-testid="caption-settings-trigger"'
    );
    expectFormattedSource(source).toContain(
      "data-caption-language={captionLanguage}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-size={captionFontSize}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-background={captionBackground}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-font-family={captionFontFamily}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-text-color={captionTextColor}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-text-opacity={captionTextOpacity}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-line-spacing={captionLineSpacing}"
    );
    expectFormattedSource(source).toContain(
      "data-caption-text-edge={captionTextEdge}"
    );
    expectFormattedSource(source).toContain(
      'data-testid="caption-live-preview"'
    );
    expectFormattedSource(source).toContain(
      "transcriptCues[activeCueIndex]?.text"
    );
    expectFormattedSource(source).toContain(
      "landing.modal.captionFontSizeSmall"
    );
    expectFormattedSource(source).toContain(
      "landing.modal.captionBackgroundClear"
    );
    expectFormattedSource(source).toContain(
      'data-testid="caption-settings-reset"'
    );
    expectFormattedSource(source).toContain('captionFontFamily === "sans"');
    expectFormattedSource(source).toContain('captionTextColor === "white"');
    expectFormattedSource(source).toContain('captionTextOpacity === "solid"');
    expectFormattedSource(source).toContain(
      'captionLineSpacing === "standard"'
    );
    expectFormattedSource(source).toContain('captionTextEdge === "shadow"');
    expectFormattedSource(source).toContain('setCaptionFontSize("medium")');
    expectFormattedSource(source).toContain('setCaptionBackground("navy")');
    expectFormattedSource(source).toContain('setCaptionFontFamily("sans")');
    expectFormattedSource(source).toContain('setCaptionTextColor("white")');
    expectFormattedSource(source).toContain('setCaptionTextOpacity("solid")');
    expectFormattedSource(source).toContain(
      'setCaptionLineSpacing("standard")'
    );
    expectFormattedSource(source).toContain('setCaptionTextEdge("shadow")');
    expectFormattedSource(source).toContain(
      "landing.modal.captionSettingsReset"
    );
    expectFormattedSource(source).toContain(
      "landing.modal.captionAppearanceStatusExpanded"
    );
    expectFormattedSource(source).not.toContain(
      "landing.modal.captionSizeSmall"
    );
    expectFormattedSource(source).not.toContain(
      "landing.modal.captionBackgroundTranslucent"
    );
    expectFormattedSource(source).not.toContain(
      "landing.modal.captionStatusSummary"
    );

    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-size='small']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-size='large']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-background='black']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-background='translucent']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-caption-preview[data-caption-size='large']"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-font-family='serif']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-font-family='mono']::cue"
    );
    expectFormattedSource(css).toContain(
      ".getphame-walkthrough-video[data-caption-text-color='gold']::cue"
    );
    expectFormattedSource(css).toContain(
      "[data-caption-text-opacity='soft']::cue"
    );
    expectFormattedSource(css).toContain(
      "[data-caption-line-spacing='compact']::cue"
    );
    expectFormattedSource(css).toContain(
      "[data-caption-line-spacing='spacious']::cue"
    );
    expectFormattedSource(css).toContain(
      "[data-caption-text-edge='none']::cue"
    );
    expectFormattedSource(css).toContain(
      "[data-caption-text-edge='outline']::cue"
    );
  });

  it("parses WebVTT into deterministic transcript cues and resolves active timestamps", async () => {
    const source = await readFile(captionTrackPaths.en, "utf8");
    const cues = parseWebVttCues(source);

    expect(cues).toHaveLength(11);
    expect(cues[0]).toMatchObject({ startTime: 0, endTime: 4.25 });
    expect(cues[0].text).toBe(
      "Great service does not always become a public review."
    );
    expect(findActiveTranscriptCueIndex(cues, 0)).toBe(0);
    expect(findActiveTranscriptCueIndex(cues, 4.249)).toBe(0);
    expect(findActiveTranscriptCueIndex(cues, 4.25)).toBe(-1);
    expect(formatTranscriptTime(0)).toBe("0:00");
    expect(formatTranscriptTime(62.9)).toBe("1:02");
  });

  it("strips inline WebVTT tags without leaving tag names in cue text", () => {
    const cues = parseWebVttCues(`WEBVTT

00:00:00.000 --> 00:00:04.000
<i>Hello</i>
<c.voice>world</c>
`);

    expect(cues).toHaveLength(1);
    expect(cues[0]?.text).toBe("Hello world");
  });

  it("ships a synchronized keyboard-accessible transcript with click-to-seek behavior", async () => {
    const source = await readFile(componentPath, "utf8");

    expectFormattedSource(source).toContain('data-testid="transcript-panel"');
    expectFormattedSource(source).toContain(
      'data-testid="transcript-cue-list"'
    );
    expectFormattedSource(source).toContain(
      "fetch(WALKTHROUGH_CAPTION_TRACKS[captionLanguage]"
    );
    expectFormattedSource(source).toContain(
      'video.addEventListener("timeupdate", syncActiveCue)'
    );
    expectFormattedSource(source).toContain(
      "findActiveTranscriptCueIndex(transcriptCues, video.currentTime)"
    );
    expectFormattedSource(source).toContain(
      'aria-current={isActive ? "true" : undefined}'
    );
    expectFormattedSource(source).toContain(
      "video.currentTime = cue.startTime + 0.01"
    );
    expectFormattedSource(source).toContain("activeCue.scrollIntoView");
    expectFormattedSource(source).toContain("prefers-reduced-motion: reduce");
    expectFormattedSource(source).toContain(
      "lg:grid-cols-[minmax(0,1fr)_20rem]"
    );
    expectFormattedSource(source).toContain(
      'data-testid="transcript-download-text"'
    );
    expectFormattedSource(source).toContain(
      'data-testid="transcript-download-pdf"'
    );
    expectFormattedSource(source).toContain(
      "createTranscriptTextBlob(transcriptCues, metadata)"
    );
    expectFormattedSource(source).toContain(
      "await createTranscriptPdfBlob(transcriptCues, metadata)"
    );
    expectFormattedSource(source).toContain(
      "buildTranscriptFilename(captionLanguage, format)"
    );
  });

  it("limits the C shortcut to the active dialog and ignores conflicting key events", async () => {
    const source = await readFile(componentPath, "utf8");

    expectFormattedSource(source).toContain("if (!open) return");
    expectFormattedSource(source).toContain('event.key.toLowerCase() === "c"');
    expectFormattedSource(source).toContain("!event.defaultPrevented");
    expectFormattedSource(source).toContain("!event.altKey");
    expectFormattedSource(source).toContain("!event.ctrlKey");
    expectFormattedSource(source).toContain("!event.metaKey");
    expectFormattedSource(source).toContain("!event.repeat");
    expectFormattedSource(source).toContain("eventTarget.isContentEditable");
    expectFormattedSource(source).toContain(
      "eventTarget.closest('[role=\"textbox\"]')"
    );
    expectFormattedSource(source).toContain("isMenuTarget");
    expectFormattedSource(source).toContain(
      'document.removeEventListener("keydown", handleKeyDown)'
    );
  });

  it("negotiates a first-use caption language while preserving valid saved choices", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toMatch(
      /(?:export\s+)?const\s+WALKTHROUGH_CAPTION_LANGUAGES\s*=\s*\[\s*["']en["']\s*,\s*["']es["']\s*,\s*["']fr["']\s*,\s*["']it["']\s*,\s*["']de["']\s*,\s*["']pt["']\s*,?\s*\]\s*as\s+const/s
    );
    expectFormattedSource(source).toContain(
      "if (isWalkthroughCaptionLanguage(storedLanguage)) return storedLanguage"
    );
    expectFormattedSource(source).toContain(
      "for (const browserLanguage of browserLanguages)"
    );
    expectFormattedSource(source).toContain(
      "browserLanguage .trim() .toLowerCase() .split(/[-_]/)[0]"
    );
    expectFormattedSource(source).toContain('return "en"');
    expectFormattedSource(source).toContain("window.navigator.languages");
    expectFormattedSource(source).toContain("window.navigator.language");
  });

  it("allows the durable media CDN without retaining the signed redirect host and shows localized recovery controls", async () => {
    const [serverSource, componentSource] = await Promise.all([
      readFile(serverIndexPath, "utf8"),
      readFile(componentPath, "utf8"),
    ]);
    const mediaSrcBlock =
      serverSource.match(/mediaSrc:\s*\[([\s\S]*?)\],/)?.[1] ?? "";

    expectFormattedSource(serverSource).toContain("mediaSrc:");
    expect(mediaSrcBlock).toContain("https://files.manuscdn.com");
    expect(mediaSrcBlock).not.toContain(
      "https://d36hbw14aib5lz.cloudfront.net"
    );
    expectFormattedSource(componentSource).toContain("videoError");
    expectFormattedSource(componentSource).toContain("onError");
    expectFormattedSource(componentSource).toContain(
      "landing.modal.videoError"
    );
    expectFormattedSource(componentSource).toContain(
      "landing.modal.videoRetry"
    );
    expectFormattedSource(componentSource).toContain(
      "landing.modal.videoOpenDirect"
    );
  });

  it.each(servedLocales)(
    "keeps the %s landing-video catalog complete and current",
    async locale => {
      const localePath = fileURLToPath(
        new URL(
          `../../../public/locales/${locale}/landing.json`,
          import.meta.url
        )
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
        expect(
          catalog.landing.modal[key],
          `${locale} landing.modal.${key}`
        ).toBeTruthy();
      }
      expect(catalog.landing.modal.captionLanguageAriaLabel).toContain(
        "{{language}}"
      );
      expect(catalog.landing.modal.captionToggleTooltip).toContain(
        "{{language}}"
      );
      if (locale !== "en") {
        expect(catalog.landing.modal.captionToggleTooltip).not.toBe(
          "Current caption language: {{language}}"
        );
      }
      expect(catalog.landing.modal.captionAppearanceStatus).toContain(
        "{{size}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatus).toContain(
        "{{background}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatusExpanded).toContain(
        "{{family}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatusExpanded).toContain(
        "{{color}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatusExpanded).toContain(
        "{{opacity}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatusExpanded).toContain(
        "{{spacing}}"
      );
      expect(catalog.landing.modal.captionAppearanceStatusExpanded).toContain(
        "{{edge}}"
      );
      expect(catalog.landing.modal.transcriptJumpTo).toContain("{{time}}");
      expect(catalog.landing.modal.transcriptJumpTo).toContain("{{text}}");
      expect(catalog.landing.modal.iframeTitle).toBeUndefined();
    }
  );

  it("keeps the generated runtime fallback complete for every caption-control locale", async () => {
    const fallbackResources = JSON.parse(
      await readFile(fallbackResourcesPath, "utf8")
    ) as Record<string, { landing: { modal: Record<string, string> } }>;

    for (const locale of servedLocales) {
      for (const key of captionControlKeys) {
        expect(
          fallbackResources[locale]?.landing.modal[key],
          `${locale} fallback landing.modal.${key}`
        ).toBeTruthy();
      }
      expect(
        fallbackResources[locale]?.landing.modal.captionToggleTooltip
      ).toContain("{{language}}");
      if (locale !== "en") {
        expect(
          fallbackResources[locale]?.landing.modal.captionToggleTooltip
        ).not.toBe("Current caption language: {{language}}");
      }
    }
  });

  it("keeps the active English translation override aligned with the player lookups", async () => {
    const translationPath = fileURLToPath(
      new URL("../../../public/locales/en/translation.json", import.meta.url)
    );
    const catalog = JSON.parse(await readFile(translationPath, "utf8")) as {
      landing: { modal: Record<string, string> };
    };

    for (const key of captionControlKeys) {
      expect(
        catalog.landing.modal[key],
        `en translation landing.modal.${key}`
      ).toBeTruthy();
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
    expect(catalog.landing.modal.captionToggleTooltip).toBe(
      "Current caption language: {{language}}"
    );
    expect(catalog.landing.modal.captionSettingsReset).toBe("Restore defaults");
    expect(catalog.landing.modal.captionLineSpacingStandard).toBe("Standard");
    expect(catalog.landing.modal.captionTextEdgeShadow).toBe("Shadow");
    expect(catalog.landing.modal.transcriptExportText).toBe("Download TXT");
    expect(catalog.landing.modal.transcriptExportPdf).toBe("Download PDF");
  });

  it("bumps the PWA cache and pre-caches caption tracks while bypassing managed media", async () => {
    const serviceWorker = await readFile(serviceWorkerPath, "utf8");

    expectFormattedSource(serviceWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.en.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.es.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.fr.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.it.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.de.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/getphame-walkthrough.pt.vtt'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "'/locales/fr/landing.json'"
    );
    expectFormattedSource(serviceWorker).toContain(
      "url.pathname.startsWith('/manus-storage/')"
    );
    expectFormattedSource(serviceWorker).toContain(
      "filter(name => name.startsWith('getphame-') && name !== CACHE_NAME)"
    );
    expectFormattedSource(serviceWorker).toContain("self.skipWaiting()");
    expectFormattedSource(serviceWorker).toContain("self.clients.claim()");
  });
});
