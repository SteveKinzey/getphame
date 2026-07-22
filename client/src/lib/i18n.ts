import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import generatedFallbackResources from "./i18nCompleteFallbackResources.json";
import directKeyFallbackResources from "./i18nDirectKeyFallbackResources";
import { mergeLocaleFallback, type ResourceRecord } from "./i18nFallback";

const STORAGE_KEY = "rr-lang";

/**
 * A second key that marks the language as USER-CHOSEN (vs auto-detected).
 * When this key is set, we NEVER override the language — the user explicitly picked it.
 * When this key is absent, the stored language was auto-detected and can be refreshed.
 */
const USER_CHOSEN_KEY = "rr-lang-chosen";

// Supported language codes (i18next format), ordered exactly as displayed in selectors.
export const SUPPORTED_LANGS = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Human-readable labels for the flyout
export const LANG_LABELS: Record<SupportedLang, string> = {
  en: "EN",
  "zh-CN": "CN",
  es: "ES",
  fr: "FR",
  it: "IT",
  th: "TH",
  "zh-TW": "TW",
};

export const LANG_NAMES: Record<SupportedLang, string> = {
  en: "English",
  "zh-CN": "简体中文",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  th: "ภาษาไทย",
  "zh-TW": "繁體中文",
};

/** Read persisted language from localStorage. Returns null if not set yet. */
export function getSavedLang(): SupportedLang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th") return "th";
    if (saved === "zh-TW") return "zh-TW";
    if (saved === "zh-CN") return "zh-CN";
    if (saved === "fr") return "fr";
    if (saved === "it") return "it";
    if (saved === "es") return "es";
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

/** Preload legacy static-copy translations before changing the rendered locale. */
async function prepareStaticCopyLocale(lang: SupportedLang): Promise<void> {
  const { loadStaticLocalizationSupplement } = await import("./autoText");
  await loadStaticLocalizationSupplement(lang);
}

/**
 * Switch language, persist, and update i18n.
 * Pre-loads the locale file before switching to avoid Suspense failures.
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
  // Pre-load both i18n and the selected static-copy bundle, then switch. This
  // prevents a mixed-language frame during a user-initiated language change.
  void Promise.all([i18n.loadLanguages(lang), prepareStaticCopyLocale(lang)]).then(() => {
    i18n.changeLanguage(lang);
  }).catch(() => {
    // Fallback: try switching anyway
    i18n.changeLanguage(lang);
  });
}

/**
 * Detect language from the browser's navigator.language.
 * Maps browser locale to one of our supported languages.
 * Distinguishes Simplified and Traditional Chinese browser locales so each
 * supported landing translation is selected without rewriting user choice.
 */
function detectLangFromBrowser(): SupportedLang {
  try {
    const browserLang = (navigator.language || navigator.languages?.[0] || "").toLowerCase();
    if (browserLang.startsWith("th")) return "th";
    if (
      browserLang.startsWith("zh-cn") ||
      browserLang.startsWith("zh-sg") ||
      browserLang.includes("hans")
    ) return "zh-CN";
    if (browserLang.startsWith("zh")) return "zh-TW";
    if (browserLang.startsWith("fr")) return "fr";
    if (browserLang.startsWith("it")) return "it";
    if (browserLang.startsWith("es")) return "es";
  } catch {
    // ignore
  }
  return "en";
}

/**
 * Return a valid language explicitly requested in the URL without changing a
 * visitor's saved preference. This supports shareable localized routes such as
 * /login?lang=es and keeps QA checks isolated from normal language selection.
 */
function getLangFromQuery(): SupportedLang | null {
  try {
    const requested = new URLSearchParams(window.location.search).get("lang");
    return SUPPORTED_LANGS.includes(requested as SupportedLang)
      ? (requested as SupportedLang)
      : null;
  } catch {
    return null;
  }
}

/** Detect language from server IP geolocation (called only on first visit) */
async function detectLangFromIP(): Promise<SupportedLang> {
  try {
    const res = await fetch("/api/detect-language");
    if (!res.ok) return "en";
    const data = await res.json() as { lang?: string };
    const lang = data.lang;
    if (lang === "zh-CN" || lang === "zh-TW") return lang;
    if (lang === "th" || lang === "fr" || lang === "it" || lang === "es") {
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
const queryLang = getLangFromQuery();

let initialLang: SupportedLang;

if (queryLang) {
  initialLang = queryLang;
} else if (userChosen && savedLang) {
  // User explicitly picked — respect it unconditionally
  initialLang = savedLang;
} else {
  // Auto-detected or first visit — use browser locale (most reliable)
  initialLang = browserLang;
  // Update localStorage to match browser locale (corrects stale IP detections)
  saveLang(browserLang);
}

// A deterministic, generated safety net for legacy literal defaults and direct
// `t(key)` calls uncovered by the full-app audit. Keep existing remote
// dictionaries authoritative: these values only fill absent translation keys
// and never overwrite a maintained locale entry.
function installGeneratedFallbacks(language: string): void {
  if (!SUPPORTED_LANGS.includes(language as SupportedLang)) return;
  const generatedBundle = generatedFallbackResources[language as SupportedLang] as ResourceRecord;
  const directKeyBundle = directKeyFallbackResources[language] ?? {};
  const bundle = mergeLocaleFallback(generatedBundle, directKeyBundle);
  // Legacy components use a mixture of implicit, landing, and cancellation
  // namespaces. Rebuild each namespace with maintained values prioritized so
  // every `t("key")` lookup stays localized even when an old catalog has a
  // scalar at a path now used as a nested object.
  for (const namespace of ["translation", "landing", "cancellation"]) {
    const maintained = i18n.getResourceBundle(language, namespace) as ResourceRecord | undefined;
    const completedBundle = mergeLocaleFallback(bundle, maintained);
    i18n.addResourceBundle(language, namespace, completedBundle, true, true);
  }
}

// The HTTP backend resolves locale namespaces asynchronously and may replace a
// namespace after the first synchronous fallback install. Re-merge the
// generated safety net after each locale load so missing maintained keys never
// regress to raw IDs such as `mainForm.pageTitle` in authenticated workflows.
i18n.on("loaded", (loaded) => {
  Object.keys(loaded).forEach(installGeneratedFallbacks);
});

/**
 * Resolves only after the initial locale dictionaries and generated fallback
 * resources are installed. The app bootstrap awaits this promise before React
 * mounts, so customer-facing surfaces never paint raw identifiers while i18n
 * is still loading over the network.
 */
export const i18nReady = i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGS],
    ns: ["landing", "translation", "cancellation"],
    // The authenticated product, forms, settings, and shared app shell use
    // `translation` as their canonical namespace. Making it the default keeps
    // legacy `useTranslation()` calls locale-aware instead of resolving keys
    // such as `mainForm.pageTitle` against the landing namespace first.
    defaultNS: "translation",
    fallbackNS: "landing",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json?v=phame27",
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Disable Suspense — without a <Suspense> boundary, useSuspense:true causes
      // language switches to silently fail when the new locale file is loading.
      useSuspense: false,
    },
  })
  .then(() => {
    for (const language of SUPPORTED_LANGS) {
      installGeneratedFallbacks(language);
    }
  });

// If no user-chosen preference, optionally refine with IP detection
// (only if browser gave us English but IP might suggest another language)
if (!queryLang && !userChosen && browserLang === "en") {
  detectLangFromIP().then((ipLang) => {
    if (ipLang !== "en") {
      saveLang(ipLang);
      void prepareStaticCopyLocale(ipLang).finally(() => i18n.changeLanguage(ipLang));
    }
  });
}

export default i18n;
