import { useState } from "react";
import { Play, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FadeUp from "./FadeUp";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=EWHSE1oyJOk";
const YOUTUBE_EMBED = "https://www.youtube.com/embed/EWHSE1oyJOk?autoplay=1&rel=0&modestbranding=1&origin=https://getphame.app";
const YOUTUBE_THUMB = "https://img.youtube.com/vi/EWHSE1oyJOk/maxresdefault.jpg";

export default function VideoDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="py-16 md:py-20 bg-[oklch(0.12_0.025_250/0.5)]">
        <div className="container">
          <FadeUp className="text-center mb-8">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              See it in action
            </p>
            <h2 className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
              See How It Works
            </h2>
            <p className="text-slate-300 font-medium">
              Watch a quick walkthrough — set up in under 2 minutes
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="max-w-3xl mx-auto">
              {/* Video thumbnail card */}
              <button
                onClick={() => setOpen(true)}
                aria-label="Play product walkthrough video"
                className="group relative w-full rounded-2xl overflow-hidden border border-[#1e3050] hover:border-primary/40 transition-all duration-300 shadow-2xl shadow-black/40 hover:shadow-[0_0_60px_oklch(0.78_0.15_75/0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-[oklch(0.14_0.03_250)]">
                  <img
                    src={YOUTUBE_THUMB}
                    alt="GetPhame product walkthrough video thumbnail"
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity duration-300"
                    onError={(e) => {
                      // Fallback to hqdefault if maxresdefault fails
                      (e.target as HTMLImageElement).src =
                        "https://img.youtube.com/vi/EWHSE1oyJOk/hqdefault.jpg";
                    }}
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
                    <span className="text-xs font-semibold text-white tracking-wide">2:14</span>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="flex items-center gap-3 px-5 py-3.5 bg-[#0f1d32] border-t border-[#1e3050]">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Play size={14} className="text-primary fill-primary ml-0.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">GetPhame — Full Product Walkthrough</p>
                    <p className="text-xs text-slate-400 font-medium">Connect email · Import customers · Send requests · Track results</p>
                  </div>
                  <div className="ml-auto shrink-0 text-xs font-medium text-primary group-hover:underline">
                    Watch now →
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
              className="relative w-full max-w-4xl"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close video"
                className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={16} className="text-white" />
              </button>

              {/* iframe wrapper */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-[#1e3050] shadow-2xl shadow-black/60">
                <iframe
                  src={YOUTUBE_EMBED}
                  title="GetPhame product walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
