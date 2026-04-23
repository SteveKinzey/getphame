// LanguageFlyout — globe icon that opens a slide-down language picker.
//
// - First visit: language auto-detected from IP (handled in i18n.ts)
// - Choice persisted to localStorage — never asks again unless user opens the menu
// - Replaces the old inline EN|TH|CN pill everywhere in the app

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { setLanguage, getSavedLang, LANG_NAMES, type SupportedLang } from "@/lib/i18n";
import i18n from "@/lib/i18n";

const LANGS: { code: SupportedLang; label: string; native: string }[] = [
  { code: "en", label: "EN", native: "English" },
  { code: "th", label: "TH", native: "ภาษาไทย" },
  { code: "zh-CN", label: "CN", native: "中文" },
];

interface LanguageFlyoutProps {
  /** Where the flyout panel anchors. Default: 'left' */
  align?: "left" | "right";
  /** Extra class on the wrapper */
  className?: string;
}

export default function LanguageFlyout({ align = "left", className = "" }: LanguageFlyoutProps) {
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLang>(() => {
    const saved = getSavedLang();
    return saved ?? "en";
  });
  const ref = useRef<HTMLDivElement>(null);

  // Keep local state in sync with i18n (e.g. after IP detection resolves)
  useEffect(() => {
    const handler = (lng: string) => {
      if (lng === "en" || lng === "th" || lng === "zh-CN") {
        setActiveLang(lng as SupportedLang);
      }
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = (code: SupportedLang) => {
    setActiveLang(code);
    setLanguage(code);
    setOpen(false);
  };

  const activeLabel = LANGS.find(l => l.code === activeLang)?.label ?? "EN";

  return (
    <div
      ref={ref}
      className={`relative inline-block ${className}`}
      translate="no"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Globe trigger button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Select language"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full select-none transition-all"
        style={{
          background: open ? "oklch(0.80 0.18 80)" : "rgba(15, 31, 75, 0.82)",
          border: "1px solid rgba(255,255,255,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          color: open ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.95)",
        }}
      >
        <Globe size={13} strokeWidth={2.5} />
        <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.04em", lineHeight: 1 }}>
          {activeLabel}
        </span>
      </button>

      {/* Flyout panel */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-xl overflow-hidden shadow-xl"
          style={{
            top: "100%",
            ...(align === "left" ? { left: 0 } : { right: 0 }),
            minWidth: "140px",
            background: "oklch(0.22 0.09 260)",
            border: "1px solid rgba(255,255,255,0.15)",
            animation: "slideDown 120ms ease",
          }}
        >
          {LANGS.map(({ code, label, native }) => {
            const isActive = activeLang === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handleSelect(code)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isActive ? "oklch(0.80 0.18 80)" : "rgba(255,255,255,0.9)",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  borderBottom: code !== "zh-CN" ? "1px solid rgba(255,255,255,0.07)" : "none",
                  cursor: "pointer",
                }}
              >
                <span className="flex items-center gap-2.5">
                  <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.04em", opacity: 0.7 }}>
                    {label}
                  </span>
                  <span>{native}</span>
                </span>
                {isActive && (
                  <Check size={14} strokeWidth={3} style={{ color: "oklch(0.80 0.18 80)", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
