// LanguageToggle — floating EN | TH pill, top-right of every screen.
//
// Strategy: we embed the Google Translate Website widget (see index.html)
// and drive it via the `googtrans` cookie. Flipping the cookie + reloading
// is the most reliable way to get a clean translated/untranslated page
// without stale inline DOM mutations that the widget leaves behind.
//
// The user's choice is persisted to localStorage under `rr-lang` so a
// subsequent visit (and the pre-paint bootstrap in index.html) picks up
// the same language before the widget initialises.

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

type Lang = "en" | "th";

const STORAGE_KEY = "rr-lang";

/** Read the current language from localStorage (defaulting to English). */
function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "th" ? "th" : "en";
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

  if (lang === "th") {
    const value = "/en/th";
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
 * Ask the hidden Google Translate widget to re-scan the DOM and translate
 * whatever is currently rendered. We flip the dropdown to empty (the widget
 * treats that as “show original”) and then back to Thai on the next frame —
 * that round-trip forces a full re-translation of the current subtree,
 * including nodes React mounted after the widget's initial pass.
 */
function pokeGoogleTranslate(target: Lang) {
  if (target !== "th") return;
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return;
  try {
    combo.value = "";
    combo.dispatchEvent(new Event("change"));
    requestAnimationFrame(() => {
      combo.value = "th";
      combo.dispatchEvent(new Event("change"));
    });
  } catch {
    /* widget not ready yet — next navigation retry will catch it */
  }
}

export default function LanguageToggle() {
  const [lang, setLang] = useState<Lang>(() => readStoredLang());
  const [location] = useLocation();

  // Keep <html lang="..."> in sync so our CSS font swap + accessibility
  // tooling (screen readers) know which language is being rendered.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // SPA navigation fix: wouter swaps route subtrees without a page reload,
  // and Google Translate's own MutationObserver frequently misses those
  // React-committed changes (especially with tRPC async content that lands
  // after route mount). Re-poke the widget on every navigation while Thai
  // is active, with a few staggered retries to catch async content.
  useEffect(() => {
    if (lang !== "th") return;
    const delays = [60, 250, 800, 1800];
    const timers = delays.map((ms) =>
      window.setTimeout(() => pokeGoogleTranslate("th"), ms),
    );
    return () => timers.forEach((id) => clearTimeout(id));
  }, [location, lang]);

  // Dynamic content (modals, tRPC results, toasts) can land well after the
  // route change settles. A MutationObserver on #root catches those and
  // triggers a debounced re-translate.
  //
  // Loop-prevention: the Google widget mutates the DOM when it translates
  // (it wraps text nodes in <font> tags), which would retrigger our observer
  // and cause an infinite poke loop. We disconnect the observer BEFORE each
  // poke and reconnect ~1s later, after Google's translation pass has
  // settled.
  useEffect(() => {
    if (lang !== "th") return;
    if (typeof document === "undefined") return;
    const root = document.getElementById("root");
    if (!root) return;

    const OBSERVER_OPTS: MutationObserverInit = {
      childList: true,
      subtree: true,
    };
    let debounceTimer: number | undefined;
    let reconnectTimer: number | undefined;

    const schedule = () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        observer.disconnect();
        pokeGoogleTranslate("th");
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
      // Full reload is the simplest way to get Google Translate to
      // either (a) re-translate against the new target or (b) restore
      // the original untranslated DOM. Trying to toggle via the hidden
      // <select> leaves the page in an inconsistent half-translated
      // state on many pages.
      window.location.reload();
    },
    [lang],
  );

  return (
    <div
      // Mark the toggle itself as "do not translate" so the Google
      // widget doesn't mangle the "EN"/"TH" labels or the aria text.
      className="notranslate"
      translate="no"
      role="group"
      aria-label="Language"
      style={{
        position: "fixed",
        top: "max(0.5rem, env(safe-area-inset-top, 0.5rem))",
        // The app shell is capped at 480px wide and centered (.mobile-screen).
        // On wider viewports the right edge of the app sits at `50vw + 240px`,
        // so offset the pill inwards from that. On narrow viewports we fall
        // back to a simple 0.5rem inset via max().
        right: "max(0.5rem, calc(50vw - 240px + 0.5rem))",
        zIndex: 60,
        display: "inline-flex",
        alignItems: "center",
        padding: "2px",
        borderRadius: "9999px",
        background: "rgba(15, 31, 75, 0.82)", // navy, semi-transparent
        border: "1px solid rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        fontFamily: "'Poppins', sans-serif",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        aria-label="Switch to English"
        onClick={() => handleSelect("en")}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 10px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          background: lang === "en" ? "oklch(0.80 0.18 80)" : "transparent",
          color: lang === "en" ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.85)",
          transition: "background 120ms ease, color 120ms ease",
        }}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === "th"}
        aria-label="Switch to Thai / เปลี่ยนเป็นภาษาไทย"
        onClick={() => handleSelect("th")}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 10px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          background: lang === "th" ? "oklch(0.80 0.18 80)" : "transparent",
          color: lang === "th" ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.85)",
          transition: "background 120ms ease, color 120ms ease",
        }}
      >
        TH
      </button>
    </div>
  );
}
