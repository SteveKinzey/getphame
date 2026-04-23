import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";

const STORAGE_KEY = "rr-lang";

// Supported language codes (i18next format)
export const SUPPORTED_LANGS = ["en", "th", "zh-CN", "fr", "es"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Human-readable labels for the flyout
export const LANG_LABELS: Record<SupportedLang, string> = {
  en: "EN",
  th: "TH",
  "zh-CN": "CN",
  fr: "FR",
  es: "ES",
};

export const LANG_NAMES: Record<SupportedLang, string> = {
  en: "English",
  th: "ภาษาไทย",
  "zh-CN": "中文",
  fr: "Français",
  es: "Español",
};

/** Read persisted language from localStorage. Returns null if not set yet. */
export function getSavedLang(): SupportedLang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th") return "th";
    if (saved === "zh-CN") return "zh-CN";
    if (saved === "fr") return "fr";
    if (saved === "es") return "es";
    if (saved === "en") return "en";
  } catch {
    // ignore
  }
  return null;
}

/** Persist language choice to localStorage */
export function saveLang(lang: SupportedLang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

/** Switch language, persist, and update i18n */
export function setLanguage(lang: SupportedLang): void {
  saveLang(lang);
  i18n.changeLanguage(lang);
}

/** Detect language from server IP geolocation (called only on first visit) */
async function detectLangFromIP(): Promise<SupportedLang> {
  try {
    const res = await fetch("/api/detect-language");
    if (!res.ok) return "en";
    const data = await res.json() as { lang?: string };
    const lang = data.lang;
    if (lang === "th" || lang === "zh-CN" || lang === "fr" || lang === "es") {
      return lang as SupportedLang;
    }
  } catch {
    // network error — fall back to English
  }
  return "en";
}

// Determine initial language:
// 1. If user has previously chosen a language → use that (localStorage)
// 2. Otherwise → detect from IP, save, and use
const savedLang = getSavedLang();
const initialLang: SupportedLang = savedLang ?? "en";

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: "en",
    supportedLngs: ["en", "th", "zh-CN", "fr", "es"],
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

// If no saved preference, detect from IP and apply asynchronously
if (!savedLang) {
  detectLangFromIP().then((detected) => {
    saveLang(detected);
    if (detected !== "en") {
      i18n.changeLanguage(detected);
    }
  });
}

export default i18n;
