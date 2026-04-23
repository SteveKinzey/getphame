import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

const STORAGE_KEY = "rr-lang";
/**
 * A second key that marks the language as USER-CHOSEN (vs auto-detected).
 * When this key is set, we NEVER override the language — the user explicitly picked it.
 * When this key is absent, the stored language was auto-detected and can be refreshed.
 */
const USER_CHOSEN_KEY = "rr-lang-chosen";

// Supported language codes (i18next format)
export const SUPPORTED_LANGS = ["en", "th", "zh-CN", "fr", "es", "it"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Human-readable labels for the flyout
export const LANG_LABELS: Record<SupportedLang, string> = {
  en: "EN",
  th: "TH",
  "zh-CN": "CN",
  fr: "FR",
  es: "ES",
  it: "IT",
};

export const LANG_NAMES: Record<SupportedLang, string> = {
  en: "English",
  th: "ภาษาไทย",
  "zh-CN": "中文",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

/** Read persisted language from localStorage. Returns null if not set yet. */
export function getSavedLang(): SupportedLang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th") return "th";
    if (saved === "zh-CN") return "zh-CN";
    if (saved === "fr") return "fr";
    if (saved === "es") return "es";
    if (saved === "it") return "it";
    if (saved === "en") return "en";
  } catch {
    // ignore
  }
  return null;
}

/** Returns true if the user has explicitly chosen a language (vs auto-detected) */
function isUserChosen(): boolean {
  try {
    return localStorage.getItem(USER_CHOSEN_KEY) === "1";
  } catch {
    return false;
  }
}

/** Persist language choice to localStorage */
export function saveLang(lang: SupportedLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

/**
 * Switch language, persist, and update i18n.
 * Marks the choice as USER-CHOSEN so it is never overridden by auto-detection.
 */
export function setLanguage(lang: SupportedLang): void {
  saveLang(lang);
  try {
    // Mark as explicitly chosen — this persists forever until user picks again
    localStorage.setItem(USER_CHOSEN_KEY, "1");
  } catch {
    // ignore
  }
  i18n.changeLanguage(lang);
}

/**
 * Detect language from the browser's navigator.language.
 * Maps browser locale to one of our supported languages.
 */
function detectLangFromBrowser(): SupportedLang {
  try {
    const browserLang = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
    if (browserLang.startsWith("th")) return "th";
    if (browserLang.startsWith("zh")) return "zh-CN";
    if (browserLang.startsWith("fr")) return "fr";
    if (browserLang.startsWith("es")) return "es";
    if (browserLang.startsWith("it")) return "it";
  } catch {
    // ignore
  }
  return "en";
}

/** Detect language from server IP geolocation (called only on first visit) */
async function detectLangFromIP(): Promise<SupportedLang> {
  try {
    const res = await fetch("/api/detect-language");
    if (!res.ok) return "en";
    const data = await res.json() as { lang?: string };
    const lang = data.lang;
    if (lang === "th" || lang === "zh-CN" || lang === "fr" || lang === "es" || lang === "it") {
      return lang as SupportedLang;
    }
  } catch {
    // network error — fall back to English
  }
  return "en";
}

// ── Language resolution order ─────────────────────────────────────────────────
//
// 1. User explicitly chose a language → ALWAYS use it, never override
// 2. Language was auto-detected (no USER_CHOSEN_KEY) → re-detect from browser
//    locale on every load (instant, no network) and update if different
// 3. No saved language at all → detect from browser locale, save it
//
// This ensures:
//   - FR/ES/TH chosen by user stays FR/ES/TH forever
//   - Stale TH from old IP detection gets corrected to en-US on next load
//   - New users get their browser locale immediately

const userChosen = isUserChosen();
const savedLang = getSavedLang();
const browserLang = detectLangFromBrowser();

let initialLang: SupportedLang;

if (userChosen && savedLang) {
  // User explicitly picked — respect it unconditionally
  initialLang = savedLang;
} else {
  // Auto-detected or first visit — use browser locale (most reliable)
  initialLang = browserLang;
  // Update localStorage to match browser locale (corrects stale IP detections)
  saveLang(browserLang);
}

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: "en",
    supportedLngs: ["en", "th", "zh-CN", "fr", "es", "it"],
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

// If no user-chosen preference, optionally refine with IP detection
// (only if browser gave us English but IP might suggest another language)
if (!userChosen && browserLang === "en") {
  detectLangFromIP().then((ipLang) => {
    if (ipLang !== "en") {
      saveLang(ipLang);
      i18n.changeLanguage(ipLang);
    }
  });
}

export default i18n;
