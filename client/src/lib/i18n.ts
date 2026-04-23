import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

const STORAGE_KEY = "rr-lang";

// Map our internal lang codes to i18next language codes
export const LANG_MAP: Record<string, string> = {
  en: "en",
  th: "th",
  cn: "zh-CN",
};

export const LANG_REVERSE_MAP: Record<string, string> = {
  en: "en",
  th: "th",
  "zh-CN": "cn",
};

// Read saved language from localStorage
function getSavedLang(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th") return "th";
    if (saved === "cn") return "zh-CN";
  } catch {
    // ignore
  }
  return "en";
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: getSavedLang(),
    fallbackLng: "en",
    supportedLngs: ["en", "th", "zh-CN"],
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },
    detection: {
      order: [], // We handle detection ourselves via localStorage
      caches: [],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;
