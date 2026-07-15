"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, MoreVertical, Plus, Share, Share2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "rl-pwa-prompt-dismissed";
const CANONICAL_URL = "https://getphame.app/";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type Platform = "ios" | "android" | "other";
type ShareStatus = "idle" | "shared" | "copied" | "cancelled";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "other";
}

function analyticsPlatform(platform: Platform) {
  return platform === "other" ? "unknown" as const : platform;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

async function copyCanonicalUrl(): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(CANONICAL_URL);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = CANONICAL_URL;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was unavailable");
}

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const trackPwaEvent = trpc.analytics.trackPwaEvent.useMutation();

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const detectedPlatform = detectPlatform();
    if (detectedPlatform === "other") return;
    setPlatform(detectedPlatform);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
      localStorage.setItem(STORAGE_KEY, "1");
      trackPwaEvent.mutate({ event: "app_installed", platform: analyticsPlatform(detectedPlatform) });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    const timer = window.setTimeout(() => {
      setVisible(true);
      trackPwaEvent.mutate({ event: "install_guide_viewed", platform: analyticsPlatform(detectedPlatform) });
    }, 3000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
    // The mutation client is intentionally sampled only when the prompt lifecycle starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const record = (event: Parameters<typeof trackPwaEvent.mutate>[0]["event"]) => {
    trackPwaEvent.mutate({ event, platform: analyticsPlatform(platform) });
  };

  const dismiss = () => {
    record("install_guide_dismissed");
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const install = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      record("install_prompt_opened");
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") {
        record("install_accepted");
        setVisible(false);
        localStorage.setItem(STORAGE_KEY, "1");
      } else {
        record("install_declined");
      }
    } finally {
      setInstalling(false);
    }
  };

  const shareGetPhame = async () => {
    setSharing(true);
    setShareStatus("idle");
    const shareData = {
      title: "Get Phame",
      text: "Turn happy customers into more trusted reviews with Get Phame.",
      url: CANONICAL_URL,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("shared");
        record("share_completed");
      } else {
        await copyCanonicalUrl();
        setShareStatus("copied");
        record("share_copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareStatus("cancelled");
        record("share_cancelled");
      } else {
        try {
          await copyCanonicalUrl();
          setShareStatus("copied");
          record("share_copied");
        } catch {
          setShareStatus("cancelled");
          record("share_cancelled");
        }
      }
    } finally {
      setSharing(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={dismiss}
      />

      <div
        className="pwa-install-sheet fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 pt-5 pb-10 rr-bg-navy"
        style={{ margin: "0 auto", maxWidth: "480px" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.2)" }} />

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1" aria-label="Get Phame">
              <img
                src="https://assets.getphame.app/getphame-logo.svg"
                alt=""
                className="pwa-install-attention h-7 w-7 rounded-lg"
              />
              <span className="text-sm font-black tracking-widest uppercase text-white">
                Get <span className="rr-text-gold">Phame</span>
              </span>
            </div>
            <h2 id="pwa-install-title" className="text-xl text-white rr-fw-black">
              Add to Home Screen
            </h2>
            <p className="text-base font-bold mt-1 text-white/90">
              Install Get Phame for the best experience — it works like a native app.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close install guide"
            className="p-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X size={16} color="white" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {platform === "ios" ? (
            <>
              <Step number={1} icon={<Share size={18} className="rr-text-gold" />} text={<>Tap the <span className="font-bold rr-text-gold">Share</span> button at the bottom of Safari</>} />
              <Step number={2} icon={<Plus size={18} className="rr-text-gold" />} text={<>Scroll down and tap <span className="font-bold rr-text-gold">Add to Home Screen</span></>} />
              <Step number={3} icon={<span className="text-sm font-black rr-text-gold">✓</span>} text={<>Tap <span className="font-bold rr-text-gold">Add</span> — Get Phame will appear on your home screen</>} />
            </>
          ) : (
            <>
              {installPrompt ? (
                <button
                  type="button"
                  onClick={install}
                  disabled={installing}
                  className="mb-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-black rr-bg-gold rr-text-navy disabled:cursor-wait disabled:opacity-70"
                >
                  <Download size={19} aria-hidden="true" />
                  {installing ? "Opening install…" : "Install Get Phame"}
                </button>
              ) : null}
              <Step number={1} icon={<MoreVertical size={18} className="rr-text-gold" />} text={<>Tap the <span className="font-bold rr-text-gold">three-dot menu</span> in the top-right of Chrome</>} />
              <Step number={2} icon={<Plus size={18} className="rr-text-gold" />} text={<>Tap <span className="font-bold rr-text-gold">Install app</span> or <span className="font-bold rr-text-gold">Add to Home screen</span></>} />
              <Step number={3} icon={<span className="text-sm font-black rr-text-gold">✓</span>} text={<>Confirm installation — Get Phame will appear on your home screen</>} />
            </>
          )}
        </div>

        <button
          type="button"
          onClick={shareGetPhame}
          disabled={sharing}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-base font-black text-white transition-[transform,background-color] duration-150 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {shareStatus === "shared" ? <Check size={19} aria-hidden="true" /> : shareStatus === "copied" ? <Copy size={19} aria-hidden="true" /> : <Share2 size={19} aria-hidden="true" />}
          {sharing ? "Opening share…" : shareStatus === "shared" ? "Shared" : shareStatus === "copied" ? "Link copied" : "Share Get Phame"}
        </button>
        <p className="sr-only" aria-live="polite">
          {shareStatus === "shared" ? "Get Phame shared successfully." : shareStatus === "copied" ? "Get Phame link copied to the clipboard." : shareStatus === "cancelled" ? "Sharing cancelled." : ""}
        </p>

        <button type="button" onClick={dismiss} className="w-full text-center text-sm font-bold mt-5 text-white/60">
          Maybe later
        </button>
      </div>
    </>
  );
}

function Step({ number, icon, text }: { number: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 rr-bg-gold rr-text-navy">
        {number}
      </div>
      <div className="flex-shrink-0">{icon}</div>
      <p className="text-base font-bold text-white">{text}</p>
    </div>
  );
}
