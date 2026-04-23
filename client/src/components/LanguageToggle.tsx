// LanguageToggle — inline EN | TH | CN pill, placed in the header/nav of each screen.
//
// Uses react-i18next for instant, offline-capable translations.
// No Google Translate dependency — language switches are instant with no reload.
// The user's choice is persisted to localStorage under `rr-lang`.
//
// This component is NOT floating — it must be placed explicitly inside
// the header/nav of each page (Home, LandingPage, Onboarding, etc.).

import i18n from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

type Lang = "en" | "th" | "cn";

const STORAGE_KEY = "rr-lang";
const I18N_LANG: Record<Lang, string> = {
  en: "en",
  th: "th",
  cn: "zh-CN",
};

/** Read the current language from localStorage (defaulting to English). */
function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "th" || v === "cn") return v;
    return "en";
  } catch {
    return "en";
  }
}

interface LanguageToggleProps {
  /** Optional extra className for the wrapper div */
  className?: string;
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const [lang, setLang] = useState<Lang>(() => readStoredLang());

  // Keep <html lang="..."> in sync
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = I18N_LANG[lang];
    }
  }, [lang]);

  const handleSelect = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      setLang(next);
      i18n.changeLanguage(I18N_LANG[next]);
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
        aria-pressed={lang === "cn"}
        aria-label="Switch to Chinese / 切换到中文"
        onClick={() => handleSelect("cn")}
        style={btnStyle(lang === "cn")}
      >
        CN
      </button>
    </div>
  );
}
