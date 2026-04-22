// LanguageToggle — inline EN | TH | CN pill, placed in the header/nav of each screen.
//
// Strategy: we lazy-load the Google Translate widget only when the user
// explicitly selects TH or CN. This prevents Google's tracking pixel images
// from being injected into the DOM on every page load (which caused 4 SEO
// "missing alt text" flags from audit tools).
//
// When EN is selected we skip loading the widget entirely and just reload
// without the googtrans cookie.
//
// The user's choice is persisted to localStorage under `rr-lang` so a
// subsequent visit picks up the same language before the widget initialises.
//
// This component is NOT floating — it must be placed explicitly inside
// the header/nav of each page (Home, LandingPage, Onboarding, etc.).

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

type Lang = "en" | "th" | "cn";

// Google Translate language codes
const GT_LANG: Record<Exclude<Lang, "en">, string> = {
  th: "th",
  cn: "zh-CN",
};

const STORAGE_KEY = "rr-lang";

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

/**
 * Set or clear the `googtrans` cookie on every relevant domain scope so
 * the Google Translate widget picks up the new target language on the
 * next page load.
 */
function writeGoogTransCookie(lang: Lang) {
  if (typeof document === "undefined") return;
  const host = window.location.hostname;
  const parts = host.split(".");
  const rootDomain = parts.length > 1 ? parts.slice(-2).join(".") : host;

  if (lang !== "en") {
    const gtCode = GT_LANG[lang];
    const value = `/en/${gtCode}`;
    document.cookie = `googtrans=${value};path=/`;
    document.cookie = `googtrans=${value};path=/;domain=${host}`;
    if (rootDomain !== host) {
      document.cookie = `googtrans=${value};path=/;domain=.${rootDomain}`;
    }
  } else {
    // Delete the cookie in every scope it may have been set in
    const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=;path=/;expires=${expired}`;
    document.cookie = `googtrans=;path=/;domain=${host};expires=${expired}`;
    if (rootDomain !== host) {
      document.cookie = `googtrans=;path=/;domain=.${rootDomain};expires=${expired}`;
    }
  }
}

/**
 * Lazy-load the Google Translate widget script, then initialise it.
 * Safe to call multiple times — will not double-inject.
 */
function loadGoogleTranslate(targetLang: Exclude<Lang, "en">) {
  if (typeof window === "undefined") return;
  if ((window as any).__gtLoaded) {
    pokeGoogleTranslate(targetLang);
    return;
  }
  (window as any).__gtLoaded = true;

  // Define the init callback before the script loads
  (window as any).googleTranslateElementInit = function () {
    new (window as any).google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,th,zh-CN",
        autoDisplay: false,
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
      },
      "rr-google-translate",
    );
    // Poke after widget initialises
    setTimeout(() => pokeGoogleTranslate(targetLang), 400);
  };

  const script = document.createElement("script");
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.appendChild(script);
}

/**
 * Ask the hidden Google Translate widget to re-scan the DOM and translate
 * whatever is currently rendered.
 */
function pokeGoogleTranslate(target: Exclude<Lang, "en">) {
  const gtCode = GT_LANG[target];
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return;
  try {
    combo.value = "";
    combo.dispatchEvent(new Event("change"));
    requestAnimationFrame(() => {
      combo.value = gtCode;
      combo.dispatchEvent(new Event("change"));
    });
  } catch {
    /* widget not ready yet — next navigation retry will catch it */
  }
}

interface LanguageToggleProps {
  /** Optional extra className for the wrapper div */
  className?: string;
}

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const [lang, setLang] = useState<Lang>(() => readStoredLang());
  const [location] = useLocation();

  // On mount: if a non-English language was previously saved, lazy-load the widget
  useEffect(() => {
    if (lang !== "en") {
      loadGoogleTranslate(lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang="..."> in sync
  useEffect(() => {
    if (typeof document !== "undefined") {
      const htmlLang = lang === "cn" ? "zh-CN" : lang;
      document.documentElement.lang = htmlLang;
    }
  }, [lang]);

  // SPA navigation fix: re-poke the widget on every navigation while non-English is active
  useEffect(() => {
    if (lang === "en") return;
    const delays = [60, 250, 800, 1800];
    const timers = delays.map((ms) =>
      window.setTimeout(() => pokeGoogleTranslate(lang), ms),
    );
    return () => timers.forEach((id) => clearTimeout(id));
  }, [location, lang]);

  // MutationObserver for dynamic content (modals, tRPC results, toasts)
  useEffect(() => {
    if (lang === "en") return;
    if (typeof document === "undefined") return;
    const root = document.getElementById("root");
    if (!root) return;

    const OBSERVER_OPTS: MutationObserverInit = { childList: true, subtree: true };
    let debounceTimer: number | undefined;
    let reconnectTimer: number | undefined;

    const schedule = () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        observer.disconnect();
        pokeGoogleTranslate(lang);
        if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
        reconnectTimer = window.setTimeout(() => {
          const currentRoot = document.getElementById("root");
          if (currentRoot) observer.observe(currentRoot, OBSERVER_OPTS);
        }, 1000);
      }, 250);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, OBSERVER_OPTS);
    return () => {
      observer.disconnect();
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    };
  }, [lang]);

  const handleSelect = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore quota / privacy-mode errors */
      }
      writeGoogTransCookie(next);
      if (next !== "en") {
        // Load the widget if not already loaded, then reload for clean translation
        loadGoogleTranslate(next);
      }
      window.location.reload();
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
