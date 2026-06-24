// Phame — Onboarding / Login screen
// Shown when user is not authenticated. Prompts them to sign in with Google, Apple, or email magic link.

import { Star, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const HERO_IMG = "https://assets.getphame.app/phame-hero-illustration.png";

type MagicLinkState = "idle" | "loading" | "sent" | "error";

export default function OnboardingPage() {
  const { t } = useTranslation();

  // Magic link state
  const [email, setEmail] = useState("");
  const [magicState, setMagicState] = useState<MagicLinkState>("idle");
  const [magicError, setMagicError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  function handleGoogleSignIn() {
    window.location.href = "/api/auth/google";
  }

  function handleAppleSignIn() {
    window.location.href = "/api/auth/apple";
  }

  async function handleMagicLinkSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setMagicState("loading");
    setMagicError("");

    try {
      const res = await fetch("/api/auth/magic/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setMagicError(data.error ?? "Something went wrong. Please try again.");
        setMagicState("error");
      } else {
        setMagicState("sent");
      }
    } catch {
      setMagicError("Network error. Please check your connection and try again.");
      setMagicState("error");
    }
  }

  function handleRetry() {
    setMagicState("idle");
    setMagicError("");
  }

  const featurePills: string[] = [
    t("features.sendsFromYourEmail"),
    t("features.oneTapRequests"),
    t("features.freeToStart"),
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between pb-40 px-6 pt-16 rr-bg-navy"
    >
      {/* Top bar: logo + language toggle */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <img
            src="https://assets.getphame.app/phame-wordmark-transparent-clean.png"
            alt="Phame"
            style={{ width: '160px', height: '60px', objectFit: 'cover', marginLeft: '-20px' }}
          />
        </div>
      </div>

      {/* Hero content */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-2xl">
          <img src={HERO_IMG} alt={t("hero.rocketIllustrationAlt")} className="w-full h-full object-cover" />
        </div>

        <div>
          <h1
            className="text-4xl font-black leading-tight mb-3 text-white"
          >
            {t("hero.titlePart1")}
            <br />
            <span className="rr-text-gold">{t("hero.titlePart2")}</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("hero.description")}
          </p>
        </div>

        {/* Stars */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={24} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {featurePills.map((f) => (
            <span
              key={f}
              className="text-xs font-semibold px-3 py-1 rounded-full rr-text-gold" style={{ background: "rgba(255,184,0,0.15)" }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-3 bg-white" style={{ color: "#1a1a2e" }}
        >
          {/* Google SVG logo */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {t("onboarding.googleBtn")}
        </button>

        {/* Apple Sign In */}
        <button
          onClick={handleAppleSignIn}
          className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-3 text-white" style={{ background: "black" }}
        >
          {/* Apple SVG logo */}
          <svg width="18" height="22" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="white">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.7 0 248.1 0 125.8 0 56.3 25.6 0 75.4 0c52.1 0 84.1 34.1 116.6 34.1 31.1 0 79.3-36.3 134.2-36.3 26.5 0 98.1 2.6 150.2 76.2zm-220-176.4c28.3-35.1 49.3-84.4 49.3-133.7 0-6.5-.6-13-1.9-18.1-46.9 1.9-101.9 31.4-135.3 71.9-26.5 29.9-50.6 79.2-50.6 129.2 0 7.1 1.3 14.3 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 42.2 0 95.2-28.3 123-66.1z"/>
          </svg>
          {t("onboarding.appleBtn")}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-on-dark-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* Email Magic Link */}
        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-3"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Mail size={20} />
            Continue with Email
          </button>
        ) : magicState === "sent" ? (
          /* Success state */
          <div
            className="w-full rounded-2xl p-5 flex flex-col items-center gap-3 text-center"
            style={{ background: "rgba(255,184,0,0.10)", border: "1px solid rgba(255,184,0,0.3)" }}
          >
            <CheckCircle2 size={32} className="rr-text-gold" />
            <div>
              <p className="font-bold text-white text-sm mb-1">Check your inbox!</p>
              <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                We sent a sign-in link to <strong className="text-white">{email}</strong>.
                <br />It expires in 15 minutes.
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="text-xs underline mt-1"
              style={{ color: "var(--text-on-dark-muted)" }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Email input form */
          <form onSubmit={handleMagicLinkSend} className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full px-4 py-4 rounded-2xl text-base font-medium outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
              }}
            />
            {magicError && (
              <p className="text-xs px-1" style={{ color: "#ff6b6b" }}>{magicError}</p>
            )}
            <button
              type="submit"
              disabled={magicState === "loading" || !email.trim()}
              className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-2 rr-bg-gold"
              style={{ color: "#1a1a2e", opacity: magicState === "loading" ? 0.7 : 1 }}
            >
              {magicState === "loading" ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sending link…
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Send Sign-In Link
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setShowEmailForm(false); setMagicState("idle"); setMagicError(""); setEmail(""); }}
              className="text-xs text-center py-1"
              style={{ color: "var(--text-on-dark-muted)" }}
            >
              Cancel
            </button>
          </form>
        )}

        <p className="text-center text-xs" style={{ color: "var(--text-on-dark-muted)" }}>
          {t("onboarding.finePrint")}
        </p>
      </div>
    </div>
  );
}
