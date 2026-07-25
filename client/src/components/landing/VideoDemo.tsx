import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Captions, Languages, Play, RotateCcw, Settings2, X } from "lucide-react";
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
import { trpc } from "@/lib/trpc";
import FadeUp from "./FadeUp";

export const WALKTHROUGH_VIDEO_URL = "/manus-storage/getphame-walkthrough-toggle-ready_4a3636b0.mp4";
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
export const WALKTHROUGH_POSTER_URL = "/manus-storage/getphame-walkthrough-toggle-ready-poster_7dfd9fb1.png";
const CAPTIONS_PREFERENCE_KEY = "getphame-walkthrough-captions";
const CAPTION_LANGUAGE_PREFERENCE_KEY = "getphame-walkthrough-caption-language";
const CAPTION_FONT_SIZE_PREFERENCE_KEY = "getphame-walkthrough-caption-font-size";
const CAPTION_BACKGROUND_PREFERENCE_KEY = "getphame-walkthrough-caption-background";
type CaptionFontSize = "small" | "medium" | "large";
type CaptionBackground = "navy" | "black" | "translucent";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const selectedCaptionFontSizeLabel =
    captionFontSizeOptions.find((option) => option.value === captionFontSize)?.label ??
    captionFontSizeOptions[1].label;
  const selectedCaptionBackgroundLabel =
    captionBackgroundOptions.find((option) => option.value === captionBackground)?.label ??
    captionBackgroundOptions[0].label;

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
    } catch {
      // Caption controls still work when storage is restricted or unavailable.
    }
    if (open) syncCaptionMode();
  }, [captionBackground, captionFontSize, captionLanguage, captionsEnabled, open, syncCaptionMode]);

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
        if (isMenuTarget) return;
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
  }, [open]);

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
                onClick={openVideo}
                aria-label={t("landing.thumbnail.playButtonAriaLabel", { defaultValue: "Play product walkthrough video" })}
                className="group relative w-full rounded-2xl overflow-hidden border border-[#1e3050] hover:border-primary/40 transition-all duration-300 shadow-2xl shadow-black/40 hover:shadow-[0_0_60px_oklch(0.78_0.15_75/0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-[oklch(0.14_0.03_250)]">
                  <img
                    src={WALKTHROUGH_POSTER_URL}
                    alt={t("landing.thumbnail.altText", { defaultValue: "Get Phame platform walkthrough video thumbnail" })}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-300"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Dark overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.03_250/0.7)] via-transparent to-[oklch(0.08_0.03_250/0.2)]" />

                  {/* Gold glow behind play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-28 h-28 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/35 transition-colors duration-300" />
                    {/* Play button */}
                    <div className="relative w-18 h-18 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_oklch(0.78_0.15_75/0.5)] group-hover:scale-110 group-hover:shadow-[0_0_60px_oklch(0.78_0.15_75/0.7)] transition-all duration-300">
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
              className="relative w-full max-w-4xl"
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
                    {t("landing.modal.captionsHelp", { defaultValue: "Use the quick CC button or press C to toggle captions. Choose a language, font size, and background from the menus." })}
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
                        className="min-w-64 border-[#29415f] bg-[#0b1b30] text-white shadow-2xl shadow-black/60"
                      >
                        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionFontSize", { defaultValue: "Font size" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionFontSize}
                          onValueChange={(value) => {
                            if (value !== "small" && value !== "medium" && value !== "large") return;
                            setCaptionFontSize(value);
                            setCaptionSettingsMenuOpen(false);
                          }}
                        >
                          {captionFontSizeOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-size-${option.value}`}
                              className="min-h-10 cursor-pointer text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-primary">
                          {t("landing.modal.captionBackground", { defaultValue: "Background color" })}
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={captionBackground}
                          onValueChange={(value) => {
                            if (value !== "navy" && value !== "black" && value !== "translucent") return;
                            setCaptionBackground(value);
                            setCaptionSettingsMenuOpen(false);
                          }}
                        >
                          {captionBackgroundOptions.map((option) => (
                            <DropdownMenuRadioItem
                              key={option.value}
                              value={option.value}
                              data-testid={`caption-background-${option.value}`}
                              className="min-h-10 cursor-pointer text-white focus:bg-primary/15 focus:text-white"
                            >
                              {option.label}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator className="bg-white/15" />
                        <DropdownMenuItem
                          data-testid="caption-settings-reset"
                          disabled={captionFontSize === "medium" && captionBackground === "navy"}
                          onSelect={() => {
                            setCaptionFontSize("medium");
                            setCaptionBackground("navy");
                            setCaptionSettingsMenuOpen(false);
                          }}
                          className="min-h-10 cursor-pointer gap-2 text-white focus:bg-primary/15 focus:text-white data-[disabled]:cursor-not-allowed data-[disabled]:text-slate-500"
                        >
                          <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
                          {t("landing.modal.captionSettingsReset", { defaultValue: "Restore defaults" })}
                        </DropdownMenuItem>
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
                    {t("landing.modal.captionAppearanceStatus", {
                      defaultValue: "Caption size {{size}} with {{background}} background",
                      size: selectedCaptionFontSizeLabel,
                      background: selectedCaptionBackgroundLabel,
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
