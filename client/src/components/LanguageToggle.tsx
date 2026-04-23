// LanguageToggle — inline EN | TH | CN pill, placed in the header/nav of each screen.
//
// Uses react-i18next for instant, offline-capable translations.
// No Google Translate dependency — language switches are instant with no reload.
// The user's choice is persisted to localStorage under `rr-lang`.
//
// This component is NOT floating — it must be placed explicitly inside
// the header/nav of each page (Home, LandingPage, Onboarding, etc.).
//
// NOTE: Uses the same STORAGE_KEY and SupportedLang values as LanguageFlyout
// and i18n.ts to ensure full consistency across all 5 supported languages.

import i18n from "@/lib/i18n";
import { getSavedLang, setLanguage, type SupportedLang } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

interface LanguageToggleProps {
  /** Optional extra className for the wrapper div */
  className?: string;
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const [lang, setLang] = useState<SupportedLang>(() => getSavedLang() ?? "en");

  // Keep local state in sync with i18n (e.g. after IP/browser detection resolves)
  useEffect(() => {
    const handler = (lng: string) => {
      const supported: SupportedLang[] = ["en", "th", "zh-CN", "fr", "es"];
      if (supported.includes(lng as SupportedLang)) {
        setLang(lng as SupportedLang);
      }
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  // Keep <html lang="..."> in sync
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const handleSelect = useCallback(
    (next: SupportedLang) => {
      if (next === lang) return;
      setLang(next);
      setLanguage(next); // saves to localStorage + calls i18n.changeLanguage
    },
    [lang],
  );

  const btnStyle = (active: boolean) => ({
    appearance: "none" as const,
    border: "none",
    cursor: "pointer",
    padding: "4px 9px",
    borderRadius: "9999px",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.04em",
    background: active ? "oklch(0.80 0.18 80)" : "transparent",
    color: active ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.85)",
    transition: "background 120ms ease, color 120ms ease",
  });

  // Show the active language label — map zh-CN → CN for display
  const displayLabel = (l: SupportedLang) => {
    if (l === "zh-CN") return "CN";
    return l.toUpperCase();
  };

  return (
    <div
      className={`notranslate inline-flex items-center p-0.5 rounded-full select-none ${className}`}
      translate="no"
      role="group"
      aria-label="Language"
      style={{
        background: "rgba(15, 31, 75, 0.82)",
        border: "1px solid rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1,
      }}
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        aria-label="Switch to English"
        onClick={() => handleSelect("en")}
        style={btnStyle(lang === "en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === "th"}
        aria-label="Switch to Thai / เปลี่ยนเป็นภาษาไทย"
        onClick={() => handleSelect("th")}
        style={btnStyle(lang === "th")}
      >
        TH
      </button>
      <button
        type="button"
        aria-pressed={lang === "zh-CN"}
        aria-label="Switch to Chinese / 切换到中文"
        onClick={() => handleSelect("zh-CN")}
        style={btnStyle(lang === "zh-CN")}
      >
        CN
      </button>
      {/* Show active label if user picked FR or ES via the full flyout */}
      {(lang === "fr" || lang === "es") && (
        <button
          type="button"
          aria-pressed={true}
          aria-label={lang === "fr" ? "Français" : "Español"}
          onClick={() => handleSelect(lang)}
          style={btnStyle(true)}
        >
          {displayLabel(lang)}
        </button>
      )}
    </div>
  );
}
