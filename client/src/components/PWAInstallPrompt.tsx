// PWAInstallPrompt — bottom-sheet guiding users to install Phame as a PWA
// Shows once per device, dismissed to localStorage, hidden if already installed or in Capacitor

import { useState, useEffect } from "react";
import { X, Share, MoreVertical, Plus } from "lucide-react";

const STORAGE_KEY = "rl-pwa-prompt-dismissed";

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  // Already installed as PWA or running inside Capacitor native shell
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    // Don't show if already installed, already dismissed, or on desktop
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const p = detectPlatform();
    if (p === "other") return; // Desktop — skip

    setPlatform(p);

    // Show after a short delay so it doesn't interrupt page load
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={dismiss}
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 rr-bg-navy" style={{ margin: "0 auto", animation: "slideUp 0.3s ease-out", maxWidth: "480" }}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold tracking-widest uppercase rr-text-gold"
              >
                Get Phame
              </span>
            </div>
            <h2
              className="text-xl text-white rr-fw-black"
            >
              Add to Home Screen
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
              Install Get Phame for the best experience — works like a real app.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          {platform === "ios" ? (
            <>
              <Step
                number={1}
                icon={<Share size={18} className="rr-text-gold" />}
                text={
                  <>
                    Tap the{" "}
                    <span className="font-bold rr-text-gold">
                      Share
                    </span>{" "}
                    button at the bottom of Safari
                  </>
                }
              />
              <Step
                number={2}
                icon={<Plus size={18} className="rr-text-gold" />}
                text={
                  <>
                    Scroll down and tap{" "}
                    <span className="font-bold rr-text-gold">
                      Add to Home Screen
                    </span>
                  </>
                }
              />
              <Step
                number={3}
                icon={
                  <span className="text-sm font-black rr-text-gold">
                    ✓
                  </span>
                }
                text={
                  <>
                    Tap{" "}
                    <span className="font-bold rr-text-gold">
                      Add
                    </span>{" "}
                    — Get Phame will appear on your home screen
                  </>
                }
              />
            </>
          ) : (
            <>
              <Step
                number={1}
                icon={<MoreVertical size={18} className="rr-text-gold" />}
                text={
                  <>
                    Tap the{" "}
                    <span className="font-bold rr-text-gold">
                      three-dot menu
                    </span>{" "}
                    in the top-right of Chrome
                  </>
                }
              />
              <Step
                number={2}
                icon={<Plus size={18} className="rr-text-gold" />}
                text={
                  <>
                    Tap{" "}
                    <span className="font-bold rr-text-gold">
                      Add to Home screen
                    </span>
                  </>
                }
              />
              <Step
                number={3}
                icon={
                  <span className="text-sm font-black rr-text-gold">
                    ✓
                  </span>
                }
                text={
                  <>
                    Tap{" "}
                    <span className="font-bold rr-text-gold">
                      Add
                    </span>{" "}
                    — Get Phame will appear on your home screen
                  </>
                }
              />
            </>
          )}
        </div>

        {/* Dismiss link */}
        <button
          onClick={dismiss}
          className="w-full text-center text-xs mt-5"
          style={{ color: "var(--text-on-dark-muted)" }}
        >
          Maybe later
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function Step({
  number,
  icon,
  text,
}: {
  number: number;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.07)" }}
    >
      {/* Step number */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 rr-bg-gold rr-text-navy"
      >
        {number}
      </div>
      {/* Icon */}
      <div className="flex-shrink-0">{icon}</div>
      {/* Text */}
      <p className="text-sm" style={{ color: "var(--text-on-dark-primary)" }}>
        {text}
      </p>
    </div>
  );
}
