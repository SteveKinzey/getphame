// LanguageFlyout — globe icon that opens a language picker rendered via portal.
//
// Uses ReactDOM.createPortal to render the dropdown at document.body level,
// so it is NEVER clipped by any parent stacking context, overflow, or z-index.
//
// - First visit: language selected from ordered browser preferences (handled in i18n.ts)
// - Choice persisted to localStorage — never asks again unless user opens the menu

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Globe, Check } from "lucide-react";
import { setLanguage, getSavedLang, type SupportedLang } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import { LANGUAGE_OPTIONS } from "@/lib/languageOptions";

interface LanguageFlyoutProps {
  className?: string;
}

export default function LanguageFlyout({ className = "" }: LanguageFlyoutProps) {
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<SupportedLang>(() => {
    const active = i18n.resolvedLanguage ?? i18n.language;
    if (LANGUAGE_OPTIONS.some((language) => language.code === active)) {
      return active as SupportedLang;
    }
    const saved = getSavedLang();
    return saved ?? "en";
  });
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep local state in sync with i18n (e.g. after IP detection resolves)
  useEffect(() => {
    const handler = (lng: string) => {
      if (LANGUAGE_OPTIONS.some(l => l.code === lng)) setActiveLang(lng as SupportedLang);
    };
    i18n.on("languageChanged", handler);
    return () => { i18n.off("languageChanged", handler); };
  }, []);

  // Compute portal position from button bounding rect
  const computePos = useCallback(() => {
    if (!btnRef.current) return null;
    const rect = btnRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    };
  }, []);

  // Toggle handler — uses onClick with stopPropagation so the document
  // 'click' outside-handler never sees this event (prevents open→close race).
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => {
      if (prev) return false;
      const pos = computePos();
      if (pos) setPanelPos(pos);
      return true;
    });
  }, [computePos]);

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "scroll") { setOpen(false); return; }
      const target = (e as MouseEvent).target as Node;
      // Don't close if click is inside the trigger button or the panel
      if (btnRef.current && btnRef.current.contains(target)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      setOpen(false);
    };
    // Use 'click' (not 'mousedown') — the button's onClick fires first with
    // stopPropagation, so this handler never sees trigger-button clicks.
    document.addEventListener("click", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const handleSelect = (code: SupportedLang) => {
    setActiveLang(code);
    setLanguage(code);
    setOpen(false);
  };

  const activeLabel = LANGUAGE_OPTIONS.find(l => l.code === activeLang)?.label ?? "EN";

  const panel = open && panelPos ? createPortal(
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: panelPos.top,
        right: panelPos.right,
        zIndex: 99999,
        minWidth: "160px",
        background: "oklch(0.22 0.09 260)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        overflow: "hidden",
        animation: "lfSlideDown 120ms ease",
        fontFamily: "'Poppins', sans-serif",
      }}
      translate="no"
    >
      {LANGUAGE_OPTIONS.map(({ code, label, native, flag }, idx) => {
        const isActive = activeLang === code;
        return (
          <button
            key={code}
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => handleSelect(code)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "12px 16px",
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              color: isActive ? "oklch(0.80 0.18 80)" : "white",
              fontSize: "15px",
              fontWeight: 700,
              borderBottom: idx < LANGUAGE_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>{flag}</span>
              <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.04em", opacity: 0.9 }}>
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
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        aria-label="Select language"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full select-none transition-all ${className}`}
        style={{
          background: open ? "oklch(0.80 0.18 80)" : "rgba(15, 31, 75, 0.82)",
          border: "1px solid rgba(255,255,255,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          color: open ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.95)",
          fontFamily: "'Poppins', sans-serif",
        }}
        translate="no"
      >
        <Globe size={13} strokeWidth={2.5} />
        <span style={{ fontSize: "13px", fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1 }}>
          {activeLabel}
        </span>
      </button>
      {panel}
    </>
  );
}
