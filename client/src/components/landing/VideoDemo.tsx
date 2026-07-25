import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "./FadeUp";

export const WALKTHROUGH_VIDEO_URL = "/manus-storage/getphame-walkthrough-captioned_d6454fd4.mp4";
export const WALKTHROUGH_CAPTIONS_URL = "/getphame-walkthrough.en.vtt";
export const WALKTHROUGH_POSTER_URL = "/manus-storage/getphame-walkthrough-poster_98943590.png";

export default function VideoDemo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoAttempt, setVideoAttempt] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
      if (event.key === "Escape") {
        setOpen(false);
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
{t("landing.section.description", { defaultValue: "Watch the 63-second platform walkthrough — English narration with visible captions" })}
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
                {t("landing.modal.captionNotice", { defaultValue: "English narration with visible captions." })}
              </p>

              {/* Self-hosted video wrapper */}
              <div className="relative aspect-video max-h-[calc(100dvh-5rem)] rounded-2xl overflow-hidden border border-[#1e3050] bg-[#06111f] shadow-2xl shadow-black/60">
                <video
                  key={videoAttempt}
                  src={WALKTHROUGH_VIDEO_URL}
                  poster={WALKTHROUGH_POSTER_URL}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={() => setVideoError(false)}
                  onError={() => setVideoError(true)}
                  aria-label={t("landing.modal.videoTitle", { defaultValue: "Get Phame platform walkthrough" })}
                  className="absolute inset-0 w-full h-full object-contain"
                >
                  <track
                    kind="captions"
                    src={WALKTHROUGH_CAPTIONS_URL}
                    srcLang="en"
                    label={t("landing.modal.captionTrackLabel", { defaultValue: "English captions" })}
                  />
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
