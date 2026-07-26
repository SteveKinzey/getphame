import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Captions, Download, Languages, Play, RotateCcw, Settings2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildTranscriptFilename,
  createTranscriptPdfBlob,
  createTranscriptTextBlob,
  downloadTranscriptBlob,
  type TranscriptExportFormat,
} from "@/lib/transcriptExport";
import { trpc } from "@/lib/trpc";
import FadeUp from "./FadeUp";

export const WALKTHROUGH_VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/FzhqTiXowReoxlBi.mp4";
export const WALKTHROUGH_CAPTION_LANGUAGES = ["en", "es", "fr", "it", "de", "pt"] as const;
export type CaptionLanguage = (typeof WALKTHROUGH_CAPTION_LANGUAGES)[number];
export const WALKTHROUGH_CAPTION_TRACKS = {
  en: "/getphame-walkthrough.en.vtt",
  es: "/getphame-walkthrough.es.vtt",
  fr: "/getphame-walkthrough.fr.vtt",
  it: "/getphame-walkthrough.it.vtt",
  de: "/getphame-walkthrough.de.vtt",
  pt: "/getphame-walkthrough.pt.vtt",
} as const satisfies Record<CaptionLanguage, string>;
export const WALKTHROUGH_CAPTIONS_URL = WALKTHROUGH_CAPTION_TRACKS.en;
export const WALKTHROUGH_POSTER_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/nHoGaEKduUhABALQ.png";
const CAPTIONS_PREFERENCE_KEY = "getphame-walkthrough-captions";
const CAPTION_LANGUAGE_PREFERENCE_KEY = "getphame-walkthrough-caption-language";
const CAPTION_FONT_SIZE_PREFERENCE_KEY = "getphame-walkthrough-caption-font-size";
const CAPTION_BACKGROUND_PREFERENCE_KEY = "getphame-walkthrough-caption-background";
const CAPTION_FONT_FAMILY_PREFERENCE_KEY = "getphame-walkthrough-caption-font-family";
const CAPTION_TEXT_COLOR_PREFERENCE_KEY = "getphame-walkthrough-caption-text-color";
const CAPTION_TEXT_OPACITY_PREFERENCE_KEY = "getphame-walkthrough-caption-text-opacity";
const CAPTION_LINE_SPACING_PREFERENCE_KEY = "getphame-walkthrough-caption-line-spacing";
const CAPTION_TEXT_EDGE_PREFERENCE_KEY = "getphame-walkthrough-caption-text-edge";
type CaptionFontSize = "small" | "medium" | "large";
type CaptionBackground = "navy" | "black" | "translucent";
type CaptionFontFamily = "sans" | "serif" | "mono";
type CaptionTextColor = "white" | "gold" | "cyan";
type CaptionTextOpacity = "solid" | "high" | "soft";
type CaptionLineSpacing = "compact" | "standard" | "spacious";
type CaptionTextEdge = "none" | "shadow" | "outline";
export type TranscriptCue = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
};

function parseVttTimestamp(value: string): number | null {
  const match = value.match(/^(?:(\d+):)?(\d{2}):(\d{2}\.\d{3})$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseWebVttCues(source: string): TranscriptCue[] {
  return source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n\r?\n+/)
    .flatMap((block, blockIndex) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length === 0 || lines[0] === "WEBVTT" || lines[0].startsWith("NOTE")) return [];

      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex < 0) return [];
      const [rawStart, rawEnd] = lines[timingIndex].split("-->");
      const startTime = parseVttTimestamp(rawStart?.trim() ?? "");
      const endTime = parseVttTimestamp(rawEnd?.trim().split(/\s+/)[0] ?? "");
      const text = lines
        .slice(timingIndex + 1)
        .join(" ")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (startTime === null || endTime === null || endTime <= startTime || !text) return [];
      return [{ id: `cue-${blockIndex}-${startTime}`, startTime, endTime, text }];
    });
}

export function findActiveTranscriptCueIndex(cues: readonly TranscriptCue[], currentTime: number) {
  return cues.findIndex((cue) => currentTime >= cue.startTime && currentTime < cue.endTime);
}

export function formatTranscriptTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function isWalkthroughCaptionLanguage(value: string | null): value is CaptionLanguage {
  return WALKTHROUGH_CAPTION_LANGUAGES.includes(value as CaptionLanguage);
}

export function resolveWalkthroughCaptionLanguage(
  storedLanguage: string | null,
  browserLanguages: readonly string[],
): CaptionLanguage {
  if (isWalkthroughCaptionLanguage(storedLanguage)) return storedLanguage;

  for (const browserLanguage of browserLanguages) {
    const primaryLanguage = browserLanguage.trim().toLowerCase().split(/[-_]/)[0];
    if (isWalkthroughCaptionLanguage(primaryLanguage)) return primaryLanguage;
  }

  return "en";
}

function getOrderedBrowserLanguages(): string[] {
  if (typeof window === "undefined") return [];

  try {
    return Array.from(
      new Set([...(window.navigator.languages ?? []), window.navigator.language].filter(Boolean)),
    );
  } catch {
    return [];
  }
}

export default function VideoDemo() {
  const { t } = useTranslation();
  const trackCaptionLanguage = trpc.analytics.trackCaptionLanguage.useMutation();
  const [open, setOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const [captionSettingsMenuOpen, setCaptionSettingsMenuOpen] = useState(false);
  const [captionLanguageMenuOpen, setCaptionLanguageMenuOpen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(CAPTIONS_PREFERENCE_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const [captionLanguage, setCaptionLanguage] = useState<CaptionLanguage>(() => {
    if (typeof window === "undefined") return "en";
    let storedLanguage: string | null = null;
    try {
      storedLanguage = window.localStorage.getItem(CAPTION_LANGUAGE_PREFERENCE_KEY);
    } catch {
      // Browser negotiation still works when storage is restricted or unavailable.
    }
    return resolveWalkthroughCaptionLanguage(storedLanguage, getOrderedBrowserLanguages());
  });
  const [captionFontSize, setCaptionFontSize] = useState<CaptionFontSize>(() => {
    if (typeof window === "undefined") return "medium";
    try {
      const storedSize = window.localStorage.getItem(CAPTION_FONT_SIZE_PREFERENCE_KEY);
      return storedSize === "small" || storedSize === "large" ? storedSize : "medium";
    } catch {
      return "medium";
    }
  });
  const [captionBackground, setCaptionBackground] = useState<CaptionBackground>(() => {
    if (typeof window === "undefined") return "navy";
    try {
      const storedBackground = window.localStorage.getItem(CAPTION_BACKGROUND_PREFERENCE_KEY);
      return storedBackground === "black" || storedBackground === "translucent"
        ? storedBackground
        : "navy";
    } catch {
      return "navy";
    }
  });
  const [captionFontFamily, setCaptionFontFamily] = useState<CaptionFontFamily>(() => {
    if (typeof window === "undefined") return "sans";
    try {
      const storedFamily = window.localStorage.getItem(CAPTION_FONT_FAMILY_PREFERENCE_KEY);
      return storedFamily === "serif" || storedFamily === "mono" ? storedFamily : "sans";
    } catch {
      return "sans";
    }
  });
  const [captionTextColor, setCaptionTextColor] = useState<CaptionTextColor>(() => {
    if (typeof window === "undefined") return "white";
    try {
      const storedColor = window.localStorage.getItem(CAPTION_TEXT_COLOR_PREFERENCE_KEY);
      return storedColor === "gold" || storedColor === "cyan" ? storedColor : "white";
    } catch {
      return "white";
    }
  });
  const [captionTextOpacity, setCaptionTextOpacity] = useState<CaptionTextOpacity>(() => {
    if (typeof window === "undefined") return "solid";
    try {
      const storedOpacity = window.localStorage.getItem(CAPTION_TEXT_OPACITY_PREFERENCE_KEY);
      return storedOpacity === "high" || storedOpacity === "soft" ? storedOpacity : "solid";
    } catch {
      return "solid";
    }
  });
  const [captionLineSpacing, setCaptionLineSpacing] = useState<CaptionLineSpacing>(() => {
    if (typeof window === "undefined") return "standard";
    try {
      const storedSpacing = window.localStorage.getItem(CAPTION_LINE_SPACING_PREFERENCE_KEY);
      return storedSpacing === "compact" || storedSpacing === "spacious"
        ? storedSpacing
        : "standard";
    } catch {
      return "standard";
    }
  });
  const [captionTextEdge, setCaptionTextEdge] = useState<CaptionTextEdge>(() => {
    if (typeof window === "undefined") return "shadow";
    try {
      const storedEdge = window.localStorage.getItem(CAPTION_TEXT_EDGE_PREFERENCE_KEY);
      return storedEdge === "none" || storedEdge === "outline" ? storedEdge : "shadow";
    } catch {
      return "shadow";
    }
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptCueRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [transcriptCues, setTranscriptCues] = useState<TranscriptCue[]>([]);
  const [activeCueIndex, setActiveCueIndex] = useState(-1);
  const [transcriptStatus, setTranscriptStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [transcriptExportStatus, setTranscriptExportStatus] = useState<
    "idle" | "text" | "pdf" | "success" | "error"
  >("idle");
  const [transcriptExportMessage, setTranscriptExportMessage] = useState("");
  const captionLanguageOptions = [
    {
      value: "en" as const,
      label: t("landing.modal.captionLanguageEnglish", { defaultValue: "English" }),
      trackLabel: t("landing.modal.captionTrackEnglish", { defaultValue: "English captions" }),
    },
    {
      value: "es" as const,
      label: t("landing.modal.captionLanguageSpanish", { defaultValue: "Spanish" }),
      trackLabel: t("landing.modal.captionTrackSpanish", { defaultValue: "Spanish captions" }),
    },
    {
      value: "fr" as const,
      label: t("landing.modal.captionLanguageFrench", { defaultValue: "French" }),
      trackLabel: t("landing.modal.captionTrackFrench", { defaultValue: "French captions" }),
    },
    {
      value: "it" as const,
      label: t("landing.modal.captionLanguageItalian", { defaultValue: "Italian" }),
      trackLabel: t("landing.modal.captionTrackItalian", { defaultValue: "Italian captions" }),
    },
    {
      value: "de" as const,
      label: t("landing.modal.captionLanguageGerman", { defaultValue: "German" }),
      trackLabel: t("landing.modal.captionTrackGerman", { defaultValue: "German captions" }),
    },
    {
      value: "pt" as const,
      label: t("landing.modal.captionLanguagePortuguese", { defaultValue: "Portuguese" }),
      trackLabel: t("landing.modal.captionTrackPortuguese", { defaultValue: "Portuguese captions" }),
    },
  ];
  const selectedCaptionLanguageLabel =
    captionLanguageOptions.find((option) => option.value === captionLanguage)?.label ??
    captionLanguageOptions[0].label;
  const captionFontSizeOptions = [
    {
      value: "small" as const,
      label: t("landing.modal.captionFontSizeSmall", { defaultValue: "Small" }),
    },
    {
      value: "medium" as const,
      label: t("landing.modal.captionFontSizeMedium", { defaultValue: "Medium" }),
    },
    {
      value: "large" as const,
      label: t("landing.modal.captionFontSizeLarge", { defaultValue: "Large" }),
    },
  ];
  const captionBackgroundOptions = [
    {
      value: "navy" as const,
      label: t("landing.modal.captionBackgroundNavy", { defaultValue: "Dark navy" }),
    },
    {
      value: "black" as const,
      label: t("landing.modal.captionBackgroundBlack", { defaultValue: "Black" }),
    },
    {
      value: "translucent" as const,
      label: t("landing.modal.captionBackgroundClear", { defaultValue: "Translucent" }),
    },
  ];
  const captionFontFamilyOptions = [
    {
      value: "sans" as const,
      label: t("landing.modal.captionFontFamilySans", { defaultValue: "Sans serif" }),
    },
    {
      value: "serif" as const,
      label: t("landing.modal.captionFontFamilySerif", { defaultValue: "Serif" }),
    },
    {
      value: "mono" as const,
      label: t("landing.modal.captionFontFamilyMono", { defaultValue: "Monospace" }),
    },
  ];
  const captionTextColorOptions = [
    {
      value: "white" as const,
      label: t("landing.modal.captionTextColorWhite", { defaultValue: "White" }),
    },
    {
      value: "gold" as const,
      label: t("landing.modal.captionTextColorGold", { defaultValue: "Gold" }),
    },
    {
      value: "cyan" as const,
      label: t("landing.modal.captionTextColorCyan", { defaultValue: "Cyan" }),
    },
  ];
  const captionTextOpacityOptions = [
    {
      value: "solid" as const,
      label: t("landing.modal.captionTextOpacitySolid", { defaultValue: "100%" }),
    },
    {
      value: "high" as const,
      label: t("landing.modal.captionTextOpacityHigh", { defaultValue: "85%" }),
    },
    {
      value: "soft" as const,
      label: t("landing.modal.captionTextOpacitySoft", { defaultValue: "70%" }),
    },
  ];
  const captionLineSpacingOptions = [
    {
      value: "compact" as const,
      label: t("landing.modal.captionLineSpacingCompact", { defaultValue: "Compact" }),
    },
    {
      value: "standard" as const,
      label: t("landing.modal.captionLineSpacingStandard", { defaultValue: "Standard" }),
    },
    {
      value: "spacious" as const,
      label: t("landing.modal.captionLineSpacingSpacious", { defaultValue: "Spacious" }),
    },
  ];
  const captionTextEdgeOptions = [
    {
      value: "none" as const,
      label: t("landing.modal.captionTextEdgeNone", { defaultValue: "None" }),
    },
    {
      value: "shadow" as const,
      label: t("landing.modal.captionTextEdgeShadow", { defaultValue: "Shadow" }),
    },
    {
      value: "outline" as const,
      label: t("landing.modal.captionTextEdgeOutline", { defaultValue: "Outline" }),
    },
  ];
  const selectedCaptionFontSizeLabel =
    captionFontSizeOptions.find((option) => option.value === captionFontSize)?.label ??
    captionFontSizeOptions[1].label;
  const selectedCaptionBackgroundLabel =
    captionBackgroundOptions.find((option) => option.value === captionBackground)?.label ??
    captionBackgroundOptions[0].label;
  const selectedCaptionFontFamilyLabel =
    captionFontFamilyOptions.find((option) => option.value === captionFontFamily)?.label ??
    captionFontFamilyOptions[0].label;
  const selectedCaptionTextColorLabel =
    captionTextColorOptions.find((option) => option.value === captionTextColor)?.label ??
    captionTextColorOptions[0].label;
  const selectedCaptionTextOpacityLabel =
    captionTextOpacityOptions.find((option) => option.value === captionTextOpacity)?.label ??
    captionTextOpacityOptions[0].label;
  const selectedCaptionLineSpacingLabel =
    captionLineSpacingOptions.find((option) => option.value === captionLineSpacing)?.label ??
    captionLineSpacingOptions[1].label;
  const selectedCaptionTextEdgeLabel =
    captionTextEdgeOptions.find((option) => option.value === captionTextEdge)?.label ??
    captionTextEdgeOptions[1].label;

  const syncCaptionMode = useCallback(() => {
    const tracks = videoRef.current?.textTracks;
    if (!tracks) return;

    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      track.mode = captionsEnabled && track.language === captionLanguage ? "showing" : "disabled";
    }
  }, [captionLanguage, captionsEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CAPTIONS_PREFERENCE_KEY,
        captionsEnabled ? "on" : "off",
      );
      window.localStorage.setItem(CAPTION_LANGUAGE_PREFERENCE_KEY, captionLanguage);
      window.localStorage.setItem(CAPTION_FONT_SIZE_PREFERENCE_KEY, captionFontSize);
      window.localStorage.setItem(CAPTION_BACKGROUND_PREFERENCE_KEY, captionBackground);
      window.localStorage.setItem(CAPTION_FONT_FAMILY_PREFERENCE_KEY, captionFontFamily);
      window.localStorage.setItem(CAPTION_TEXT_COLOR_PREFERENCE_KEY, captionTextColor);
      window.localStorage.setItem(CAPTION_TEXT_OPACITY_PREFERENCE_KEY, captionTextOpacity);
      window.localStorage.setItem(CAPTION_LINE_SPACING_PREFERENCE_KEY, captionLineSpacing);
      window.localStorage.setItem(CAPTION_TEXT_EDGE_PREFERENCE_KEY, captionTextEdge);
    } catch {
      // Caption controls still work when storage is restricted or unavailable.
    }
    if (open) syncCaptionMode();
  }, [
    captionBackground,
    captionFontFamily,
    captionFontSize,
    captionLanguage,
    captionLineSpacing,
    captionTextColor,
    captionTextEdge,
    captionTextOpacity,
    captionsEnabled,
    open,
    syncCaptionMode,
  ]);

  const openVideo = () => {
    setVideoError(false);
    setOpen(true);
  };

  const retryVideo = () => {
    setVideoError(false);
    setVideoAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      const eventTarget = event.target instanceof HTMLElement ? event.target : null;
      const isMenuTarget = Boolean(
        eventTarget?.closest('[role="menu"], [role="menuitemradio"]'),
      );

      if (event.key === "Escape") {
        if (captionSettingsMenuOpen || captionLanguageMenuOpen || isMenuTarget) return;
        setOpen(false);
        return;
      }

      const isEditableTarget = Boolean(
        eventTarget &&
          (eventTarget.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(eventTarget.tagName) ||
            eventTarget.closest('[role="textbox"]') ||
            isMenuTarget),
      );

      if (
        event.key.toLowerCase() === "c" &&
        !event.defaultPrevented &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.repeat &&
        !isEditableTarget
      ) {
        event.preventDefault();
        setCaptionsEnabled((enabled) => !enabled);
        return;
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href], video[controls]") ?? [],
        ).filter((element) => !element.hasAttribute("disabled"));

        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [captionLanguageMenuOpen, captionSettingsMenuOpen, open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setTranscriptStatus("loading");
    setTranscriptCues([]);
    setActiveCueIndex(-1);
    setTranscriptExportStatus("idle");
    setTranscriptExportMessage("");

    void fetch(WALKTHROUGH_CAPTION_TRACKS[captionLanguage], { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Transcript request failed with ${response.status}`);
        return response.text();
      })
      .then((source) => {
        const cues = parseWebVttCues(source);
        if (cues.length === 0) throw new Error("Transcript contains no usable cues");
        setTranscriptCues(cues);
        setTranscriptStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTranscriptStatus("error");
      });

    return () => controller.abort();
  }, [captionLanguage, open]);

  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    const syncActiveCue = () => {
      setActiveCueIndex(findActiveTranscriptCueIndex(transcriptCues, video.currentTime));
    };
    syncActiveCue();
    video.addEventListener("timeupdate", syncActiveCue);
    video.addEventListener("seeked", syncActiveCue);
    video.addEventListener("loadedmetadata", syncActiveCue);
    return () => {
      video.removeEventListener("timeupdate", syncActiveCue);
      video.removeEventListener("seeked", syncActiveCue);
      video.removeEventListener("loadedmetadata", syncActiveCue);
    };
  }, [open, transcriptCues, videoAttempt]);

  useEffect(() => {
    if (activeCueIndex < 0) return;
    const activeCue = transcriptCueRefs.current[activeCueIndex];
    if (!activeCue) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    activeCue.scrollIntoView({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [activeCueIndex]);

  const jumpToTranscriptCue = (cue: TranscriptCue, cueIndex: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = cue.startTime + 0.01;
    setActiveCueIndex(cueIndex);
    void video.play().catch(() => {
      // Seeking still succeeds when the browser blocks playback.
    });
  };

  const downloadTranscript = async (format: TranscriptExportFormat) => {
    if (transcriptStatus !== "ready" || transcriptCues.length === 0) return;
    setTranscriptExportStatus(format);
    setTranscriptExportMessage("");

    const generatedValue = new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
      new Date(),
    );
    const metadata = {
      brand: "GET PHAME",
      documentTitle: t("landing.modal.transcriptExportDocumentTitle", {
        defaultValue: "Platform walkthrough transcript",
      }),
      languageLabel: t("landing.modal.transcriptExportLanguageLabel", {
        defaultValue: "Language",
      }),
      languageValue: selectedCaptionLanguageLabel,
      generatedLabel: t("landing.modal.transcriptExportGeneratedLabel", {
        defaultValue: "Generated",
      }),
      generatedValue,
      sourceLabel: t("landing.modal.transcriptExportSourceLabel", { defaultValue: "Source" }),
      sourceValue: "https://getphame.app",
    };

    try {
      const blob =
        format === "text"
          ? createTranscriptTextBlob(transcriptCues, metadata)
          : await createTranscriptPdfBlob(transcriptCues, metadata);
      downloadTranscriptBlob(blob, buildTranscriptFilename(captionLanguage, format));
      setTranscriptExportStatus("success");
      setTranscriptExportMessage(
        t(
          format === "text"
            ? "landing.modal.transcriptExportTextSuccess"
            : "landing.modal.transcriptExportPdfSuccess",
          {
            defaultValue:
              format === "text"
                ? "Text transcript downloaded."
                : "PDF transcript downloaded.",
          },
        ),
      );
    } catch {
      setTranscriptExportStatus("error");
      setTranscriptExportMessage(
        t("landing.modal.transcriptExportError", {
          defaultValue: "The transcript download could not be created. Please try again.",
        }),
      );
    }
  };

  return (
    <>
      <section className="py-16 md:py-20 bg-[oklch(0.12_0.025_250/0.5)]">
        <div className="container">
          <FadeUp className="text-center mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
{t("landing.section.tagline", { defaultValue: "See it in action" })}
            </p>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
{t("landing.section.title", { defaultValue: "See How It Works" })}
            </h2>
            <p className="text-slate-300 font-medium">
{t("landing.section.description", { defaultValue: "Watch the 63-second platform walkthrough — English narration with optional captions" })}
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="max-w-3xl mx-auto">
              {/* Video thumbnail card */}
              <button
                type="button"
                onClick={openVideo}
                aria-label={t("landing.thumbnail.playButtonAriaLabel", { defaultValue: "Play product walkthrough video" })}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="group relative w-full rounded-2xl overflow-hidden border border-[#1e3050] shadow-2xl shadow-black/40 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.008] motion-safe:active:scale-[0.995] motion-reduce:transform-none hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d32]"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-[oklch(0.14_0.03_250)]">
                  <img
                    src={WALKTHROUGH_POSTER_URL}
                    alt={t("landing.thumbnail.altText", { defaultValue: "Get Phame platform walkthrough video thumbnail" })}
                    className="w-full h-full object-cover opacity-70 transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-85 group-focus-visible:opacity-85 motion-reduce:transition-none"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.03_250/0.7)] via-transparent to-[oklch(0.08_0.03_250/0.2)]" />

                  {/* Gold glow behind play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-28 h-28 rounded-full bg-primary/30 blur-2xl opacity-60 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100 group-hover:scale-105 group-focus-visible:opacity-100 group-focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none" />
                    {/* Play button */}
                    <div
                      data-walkthrough-play-overlay="true"
                      aria-hidden="true"
                      className="relative w-18 h-18 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_oklch(0.78_0.15_75/0.5)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05] group-focus-visible:scale-[1.05] motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <Play
                        size={28}
                        className="text-primary-foreground fill-primary-foreground ml-1"
                      />
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                    <span className="text-xs font-semibold text-white tracking-wide">1:03</span>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0f1d32] border-t border-[#1e3050]">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Play size={14} className="text-primary fill-primary ml-0.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">{t("landing.bottomBar.title", { defaultValue: "Get Phame — Platform Walkthrough" })}</p>
                    <p className="text-xs text-slate-400 font-medium">{t("landing.bottomBar.description", { defaultValue: "Individual outreach · Connected inbox · Limited reminders · Stop on completion" })}</p>
                  </div>
                  <div className="ml-auto shrink-0 text-xs font-medium text-primary group-hover:underline">
{t("landing.bottomBar.watchNow", { defaultValue: "Watch now →" })}
                  </div>
                </div>
              </button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="get-phame-video-title"
            aria-describedby="get-phame-video-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

            {/* Modal content */}
            <motion.div
              ref={dialogRef}
              className="relative w-full max-w-6xl"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                ref={closeButtonRef}
                onClick={() => setOpen(false)}
                aria-label={t("landing.modal.closeButtonAriaLabel", { defaultValue: "Close video" })}
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={16} className="text-white" />
              </button>

              <h3 id="get-phame-video-title" className="sr-only">
                {t("landing.modal.videoTitle", { defaultValue: "Get Phame platform walkthrough" })}
              </h3>
              <p id="get-phame-video-description" className="sr-only">
                {t("landing.modal.captionNotice", { defaultValue: "English narration with optional English, Spanish, French, Italian, German, and Portuguese captions." })}
              </p>

              {/* Self-hosted video and custom caption control */}
              <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-2xl border border-[#1e3050] bg-[#06111f] p-2 shadow-2xl shadow-black/60 sm:p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                  <div className="min-w-0">
                <div className="relative aspect-video max-h-[calc(100dvh-10rem)] overflow-hidden rounded-xl bg-black">
                  <video
                    key={videoAttempt}
                    id="getphame-walkthrough-player"
                    ref={videoRef}
                    src={WALKTHROUGH_VIDEO_URL}
                    poster={WALKTHROUGH_POSTER_URL}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={() => {
                      setVideoError(false);
                      syncCaptionMode();
                    }}
                    onLoadedData={syncCaptionMode}
                    onError={() => setVideoError(true)}
                    aria-label={t("landing.modal.videoTitle", { defaultValue: "Get Phame platform walkthrough" })}
                    aria-describedby="get-phame-video-description getphame-caption-status"
                    data-caption-state={captionsEnabled ? "on" : "off"}
                    data-caption-language={captionLanguage}
                    data-caption-size={captionFontSize}
                    data-caption-background={captionBackground}
                    data-caption-font-family={captionFontFamily}
                    data-caption-text-color={captionTextColor}
                    data-caption-text-opacity={captionTextOpacity}
                    data-caption-line-spacing={captionLineSpacing}
                    data-caption-text-edge={captionTextEdge}
                    className="getphame-walkthrough-video absolute inset-0 h-full w-full object-contain"
                  >
                    {captionLanguageOptions.map((option) => (
                      <track
                        key={option.value}
                        kind="captions"
                        src={WALKTHROUGH_CAPTION_TRACKS[option.value]}
                        srcLang={option.value}
                        label={option.trackLabel}
                        default={captionsEnabled && captionLanguage === option.value}
                      />
                    ))}
                    {t("landing.modal.videoFallback", { defaultValue: "Your browser does not support HTML video." })}
                  </video>
                  {videoError && (
                    <div
                      role="alert"
                      className="absolute inset-0 z-10 flex items-center justify-center bg-[#06111f] px-6 text-center"
                    >
                      <div className="max-w-md">
                        <p className="text-base font-semibold text-white">
                          {t("landing.modal.videoError", { defaultValue: "The walkthrough could not load in this browser." })}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={retryVideo}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]"
                          >
                            {t("landing.modal.videoRetry", { defaultValue: "Try again" })}
                          </button>
                          <a
                            href={WALKTHROUGH_VIDEO_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {t("landing.modal.videoOpenDirect", { defaultValue: "Open video directly" })}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-2">
                  <p className="px-1 text-center text-xs leading-relaxed text-slate-300 sm:text-left sm:text-sm">
                    {t("landing.modal.captionsHelp", { defaultValue: "Use the quick CC button or press C to toggle captions. Customize their appearance, or select any transcript line to jump to that moment." })}
                  </p>
                  <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          data-testid="caption-toggle"
                          aria-controls="getphame-walkthrough-player"
                          aria-pressed={captionsEnabled}
                          aria-keyshortcuts="C"
                          aria-label={t(captionsEnabled ? "landing.modal.captionsDisable" : "landing.modal.captionsEnable", {
                            defaultValue: captionsEnabled ? "Disable captions" : "Enable captions",
                          })}
                          onClick={() => setCaptionsEnabled((enabled) => !enabled)}
                          className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-[transform,background-color,border-color,color,box-shadow,filter] duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:brightness-110 motion-safe:hover:shadow-[0_8px_24px_oklch(0.78_0.15_75/0.18)] motion-reduce:transition-none active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f] sm:order-first sm:w-auto ${
                            captionsEnabled
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/35 bg-white/5 text-white hover:border-white/60 hover:bg-white/10"
                          }`}
                        >
                          <Captions className="h-5 w-5" aria-hidden="true" />
                          <span>
                            {t(captionsEnabled ? "landing.modal.captionsDisable" : "landing.modal.captionsEnable", {
                              defaultValue: captionsEnabled ? "Disable captions" : "Enable captions",
                            })}
                          </span>
                          <kbd className="hidden rounded border border-current/25 px-1.5 py-0.5 text-[10px] font-black leading-none opacity-75 sm:inline-flex" aria-hidden="true">
                            C
                          </kbd>
                          <span
                            aria-hidden="true"
                            className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                              captionsEnabled
                                ? "bg-[#07182A]/15 text-[#07182A]"
                                : "bg-white/10 text-white/80"
                            }`}
                          >
                            {t(captionsEnabled ? "landing.modal.captionsOn" : "landing.modal.captionsOff", {
                              defaultValue: captionsEnabled ? "Captions on" : "Captions off",
                            })}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        sideOffset={8}
                        className="border border-primary/25 bg-[#0b1b30] font-semibold text-white shadow-xl shadow-black/40 motion-reduce:animate-none"
                      >
                        {t("landing.modal.captionToggleTooltip", {
                          defaultValue: "Current caption language: {{language}}",
                          language: selectedCaptionLanguageLabel,
                        })}
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenu
                      open={captionSettingsMenuOpen}
                      onOpenChange={(nextOpen) => {
                        setCaptionSettingsMenuOpen(nextOpen);
                        if (nextOpen) setCaptionLanguageMenuOpen(false);
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          data-testid="caption-settings-trigger"
                          aria-controls="getphame-walkthrough-player"
                          aria-label={t("landing.modal.captionSettingsAriaLabel", {
                            defaultValue: "Open caption appearance settings",
                          })}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/5 px-4 text-sm font-bold text-white transition-[transform,background-color,border-color] duration-150 hover:border-primary/70 hover:bg-white/10 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f] sm:w-auto"
                        >
                          <Settings2 className="h-5 w-5 text-primary" aria-hidden="true" />
                          <span>{t("landing.modal.captionSettings", { defaultValue: "Caption settings" })}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="top"
                        sideOffset={8}
                        onEscapeKeyDown={(event) => event.stopPropagation()}
                        className="max-h-[min(34rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto border-[#29415f] bg-[#0b1b30] text-white shadow-2xl shadow-black/60"
                      >
                        <div
                          data-testid="caption-live-preview"
                          data-caption-size={captionFontSize}
                          data-caption-background={captionBackground}
                          data-caption-font-family={captionFontFamily}
                          data-caption-text-color={captionTextColor}
                          data-caption-text-opacity={captionTextOpacity}
                          data-caption-line-spacing={captionLineSpacing}
                          data-caption-text-edge={captionTextEdge}
                          className="getphame-caption-preview mx-1 mb-1 rounded-lg border border-white/15 bg-[#06111f] p-2"
                        >
                          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
                            {t("landing.modal.captionPreview", { defaultValue: "Live preview" })}
                          </p>
                          <div className="flex min-h-16 items-center justify-center rounded-md border border-white/10 bg-[#122239] px-2 py-2 text-center">
                            <span className="getphame-caption-preview-swatch">
                              <span className="getphame-caption-preview-text">
                                {transcriptCues[activeCueIndex]?.text ??
                                  t("landing.modal.captionPreviewSample", {
                                    defaultValue: "Your captions will look like this.",
                                  })}
                              </span>
                            </span>
                          </div>
                        </div>
                        <DropdownMenuItem
                          data-testid="caption-settings-reset"
                          disabled={
                            captionFontSize === "medium" &&
                            captionBackground === "navy" &&
                            captionFontFamily === "sans" &&
                            captionTextColor === "white" &&
                            captionTextOpacity === "solid" &&
                            captionLineSpacing === "standard" &&
                            captionTextEdge === "shadow"
                          }
                          onSelect={() => {
                            setCaptionFontSize("medium");
                            setCaptionBackground("navy");
                            setCaptionFontFamily("sans");
                            setCaptionTextColor("white");
                            setCaptionTextOpacity("solid");
                            setCaptionLineSpacing("standard");
                            setCaptionTextEdge("shadow");
                            setCaptionSettingsMenuOpen(false);
                          }}
                          className="min-h-10 cursor-pointer gap-2 text-white focus:bg-primary/15 focus:text-white data-[disabled]:cursor-not-allowed data-[disabled]:text-slate-500"
                        >
                          <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
                          {t("landing.modal.captionSettingsReset", { defaultValue: "Restore defaults" })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionFontSize", { defaultValue: "Font size" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionFontSize}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "small" && value !== "medium" && value !== "large") return;
                            setCaptionFontSize(value);
                          }}
                        >
                          {captionFontSizeOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-size-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionBackground", { defaultValue: "Background color" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionBackground}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "navy" && value !== "black" && value !== "translucent") return;
                            setCaptionBackground(value);
                          }}
                        >
                          {captionBackgroundOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-background-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionFontFamily", { defaultValue: "Font family" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionFontFamily}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "sans" && value !== "serif" && value !== "mono") return;
                            setCaptionFontFamily(value);
                          }}
                        >
                          {captionFontFamilyOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-font-family-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionTextColor", { defaultValue: "Text color" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionTextColor}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "white" && value !== "gold" && value !== "cyan") return;
                            setCaptionTextColor(value);
                          }}
                        >
                          {captionTextColorOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-text-color-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionTextOpacity", { defaultValue: "Text opacity" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionTextOpacity}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "solid" && value !== "high" && value !== "soft") return;
                            setCaptionTextOpacity(value);
                          }}
                        >
                          {captionTextOpacityOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-text-opacity-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionLineSpacing", { defaultValue: "Line spacing" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionLineSpacing}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "compact" && value !== "standard" && value !== "spacious") return;
                            setCaptionLineSpacing(value);
                          }}
                        >
                          {captionLineSpacingOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-line-spacing-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="inline-flex min-h-10 w-[6.5rem] items-center px-1 py-1 align-middle text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionTextEdge", { defaultValue: "Text edge" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionTextEdge}
                          className="inline-grid w-[calc(100%-6.5rem)] grid-cols-3 gap-1 pr-1 align-middle"
                          onValueChange={(value) => {
                            if (value !== "none" && value !== "shadow" && value !== "outline") return;
                            setCaptionTextEdge(value);
                          }}
                        >
                          {captionTextEdgeOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-text-edge-${option.value}`}
                              onSelect={(event) => event.preventDefault()}
                              className="min-h-10 cursor-pointer justify-center px-2 text-center text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu
                      open={captionLanguageMenuOpen}
                      onOpenChange={(nextOpen) => {
                        setCaptionLanguageMenuOpen(nextOpen);
                        if (nextOpen) setCaptionSettingsMenuOpen(false);
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          data-testid="caption-language-trigger"
                          aria-controls="getphame-walkthrough-player"
                          aria-label={t("landing.modal.captionLanguageAriaLabel", {
                            defaultValue: "Caption language: {{language}}",
                            language: selectedCaptionLanguageLabel,
                          })}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/35 bg-white/5 px-4 text-sm font-bold text-white transition-[transform,background-color,border-color] duration-150 hover:border-primary/70 hover:bg-white/10 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f] sm:w-auto"
                        >
                          <Languages className="h-5 w-5 text-primary" aria-hidden="true" />
                          <span>{t("landing.modal.captionLanguage", { defaultValue: "Language" })}</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white/85">
                            {selectedCaptionLanguageLabel}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="top"
                        sideOffset={8}
                        onEscapeKeyDown={(event) => event.stopPropagation()}
                        className="min-w-56 border-[#29415f] bg-[#0b1b30] text-white shadow-2xl shadow-black/60"
                      >
                        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionLanguage", { defaultValue: "Caption language" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionLanguage}
                          onValueChange={(value) => {
                            if (!isWalkthroughCaptionLanguage(value)) return;
                            if (value === captionLanguage) {
                              setCaptionLanguageMenuOpen(false);
                              return;
                            }
                            setCaptionLanguage(value);
                            setCaptionsEnabled(true);
                            setCaptionLanguageMenuOpen(false);
                            trackCaptionLanguage.mutate({ language: value });
                          }}
                        >
                          {captionLanguageOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-language-${option.value}`}
                              className="min-h-10 cursor-pointer text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p id="getphame-caption-status" role="status" aria-live="polite" className="sr-only">
                    {t(captionsEnabled ? "landing.modal.captionsOn" : "landing.modal.captionsOff", {
                      defaultValue: captionsEnabled ? "Captions on" : "Captions off",
                    })}
                    {`. ${selectedCaptionLanguageLabel}. `}
                    {t("landing.modal.captionAppearanceStatusExpanded", {
                      defaultValue:
                        "Caption size {{size}}, {{family}} font, {{color}} text at {{opacity}} opacity, {{spacing}} line spacing, {{edge}} text edge, with {{background}} background",
                      size: selectedCaptionFontSizeLabel,
                      background: selectedCaptionBackgroundLabel,
                      family: selectedCaptionFontFamilyLabel,
                      color: selectedCaptionTextColorLabel,
                      opacity: selectedCaptionTextOpacityLabel,
                      spacing: selectedCaptionLineSpacingLabel,
                      edge: selectedCaptionTextEdgeLabel,
                    })}
                  </p>
                </div>
                  </div>

                  <aside
                    data-testid="transcript-panel"
                    aria-labelledby="getphame-transcript-title"
                    className="flex min-h-0 flex-col rounded-xl border border-[#29415f] bg-[#0b1b30] p-3 lg:max-h-[calc(100dvh-7rem)]"
                  >
                    <div className="border-b border-white/10 px-1 pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 id="getphame-transcript-title" className="font-display text-base font-bold text-white">
                          {t("landing.modal.transcriptTitle", { defaultValue: "Interactive transcript" })}
                        </h4>
                        <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                          {selectedCaptionLanguageLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-300">
                        {t("landing.modal.transcriptHelp", {
                          defaultValue: "Select a line to jump to that moment in the video.",
                        })}
                      </p>
                      <div
                        role="group"
                        aria-label={t("landing.modal.transcriptExportGroupLabel", {
                          defaultValue: "Download transcript",
                        })}
                        className="mt-3 grid grid-cols-2 gap-2"
                      >
                        <button
                          type="button"
                          data-testid="transcript-download-text"
                          disabled={
                            transcriptStatus !== "ready" ||
                            transcriptExportStatus === "text" ||
                            transcriptExportStatus === "pdf"
                          }
                          aria-describedby="getphame-transcript-export-status"
                          onClick={() => void downloadTranscript("text")}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2 text-xs font-bold text-white transition-[transform,background-color,border-color] duration-150 hover:border-primary/60 hover:bg-white/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
                          {transcriptExportStatus === "text"
                            ? t("landing.modal.transcriptExportPreparing", {
                                defaultValue: "Preparing…",
                              })
                            : t("landing.modal.transcriptExportText", {
                                defaultValue: "Download TXT",
                              })}
                        </button>
                        <button
                          type="button"
                          data-testid="transcript-download-pdf"
                          disabled={
                            transcriptStatus !== "ready" ||
                            transcriptExportStatus === "text" ||
                            transcriptExportStatus === "pdf"
                          }
                          aria-describedby="getphame-transcript-export-status"
                          onClick={() => void downloadTranscript("pdf")}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2 text-xs font-bold text-white transition-[transform,background-color,border-color] duration-150 hover:border-primary/60 hover:bg-white/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
                          {transcriptExportStatus === "pdf"
                            ? t("landing.modal.transcriptExportPreparing", {
                                defaultValue: "Preparing…",
                              })
                            : t("landing.modal.transcriptExportPdf", {
                                defaultValue: "Download PDF",
                              })}
                        </button>
                      </div>
                      <p
                        id="getphame-transcript-export-status"
                        role={transcriptExportStatus === "error" ? "alert" : "status"}
                        aria-live="polite"
                        className="sr-only"
                      >
                        {transcriptExportMessage}
                      </p>
                    </div>

                    <div
                      data-testid="transcript-cue-list"
                      className="mt-2 max-h-72 min-h-40 overflow-y-auto pr-1 lg:max-h-none lg:flex-1"
                    >
                      {transcriptStatus === "loading" && (
                        <p role="status" className="px-2 py-6 text-center text-sm font-semibold text-slate-300">
                          {t("landing.modal.transcriptLoading", { defaultValue: "Loading transcript…" })}
                        </p>
                      )}
                      {transcriptStatus === "error" && (
                        <p role="alert" className="px-2 py-6 text-center text-sm font-semibold text-slate-300">
                          {t("landing.modal.transcriptError", {
                            defaultValue: "The transcript is unavailable right now.",
                          })}
                        </p>
                      )}
                      {transcriptStatus === "ready" && (
                        <ol className="space-y-1.5" aria-label={t("landing.modal.transcriptCueList", { defaultValue: "Transcript cues" })}>
                          {transcriptCues.map((cue, index) => {
                            const isActive = index === activeCueIndex;
                            const timeLabel = formatTranscriptTime(cue.startTime);
                            return (
                              <li key={cue.id}>
                                <button
                                  ref={(element) => {
                                    transcriptCueRefs.current[index] = element;
                                  }}
                                  type="button"
                                  data-testid={`transcript-cue-${index}`}
                                  data-start-time={cue.startTime.toFixed(3)}
                                  aria-current={isActive ? "true" : undefined}
                                  aria-label={t("landing.modal.transcriptJumpTo", {
                                    defaultValue: "Jump to {{time}}: {{text}}",
                                    time: timeLabel,
                                    text: cue.text,
                                  })}
                                  onClick={() => jumpToTranscriptCue(cue, index)}
                                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-[transform,background-color,border-color,color] duration-150 motion-reduce:transition-none active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isActive
                                      ? "border-primary bg-primary/15 text-white"
                                      : "border-transparent bg-white/[0.035] text-slate-200 hover:border-white/20 hover:bg-white/[0.07]"
                                  }`}
                                >
                                  <span className="flex items-start gap-3">
                                    <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${isActive ? "bg-primary text-primary-foreground" : "bg-white/10 text-slate-300"}`}>
                                      {timeLabel}
                                    </span>
                                    <span className="text-sm font-semibold leading-snug">{cue.text}</span>
                                  </span>
                                  {isActive && (
                                    <span className="mt-1.5 block pl-[3.15rem] text-[10px] font-black uppercase tracking-wider text-primary">
                                      {t("landing.modal.transcriptCurrent", { defaultValue: "Current caption" })}
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
