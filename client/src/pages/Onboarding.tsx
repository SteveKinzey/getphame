// Phame — Onboarding / Login screen
// Full-width responsive layout: two-column on desktop (left: branding/proof, right: auth card)
// Preserves all auth methods: Google, Apple, and email magic link.
import { Star, Mail, Loader2, CheckCircle2, Shield, Lock, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { motion } from "framer-motion";
import SEOHead from "@/components/landing/SEOHead";

const LOGO_URL = "https://assets.getphame.app/getphame-logo-mark.webp";

type MagicLinkState = "idle" | "loading" | "sent" | "error";

export default function OnboardingPage() {
  const { t } = useTranslation();
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
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          origin: window.location.origin,
        }),
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

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col">
      <SEOHead
        title="Sign Up — Get Phame | Start Getting More 5-Star Reviews"
        description="Create your free Get Phame account. Send personalized review requests from your own email. 10 free requests included, no credit card required."
        canonical="https://getphame.app/onboarding"
      />

      {/* Top bar */}
      <header className="w-full py-4 px-6 flex items-center justify-between z-10 relative">
        <a href="/" className="flex items-center gap-2.5 group">
          <img src={LOGO_URL} alt="Get Phame" className="w-9 h-9 transition-transform duration-200 group-hover:scale-105" />
          <div className="flex items-baseline">
            <span className="font-display font-extrabold text-lg tracking-tight text-white">GET&nbsp;</span>
            <span className="font-display font-extrabold text-lg tracking-tight" style={{ color: "oklch(0.78 0.15 75)" }}>PHAME</span>
          </div>
        </a>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left column — branding & proof (hidden on mobile, shown on desktop) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="hidden lg:flex flex-col gap-8"
          >
            <div>
              <h1 className="font-display font-extrabold text-4xl xl:text-5xl leading-tight mb-4">
                Get More 5-Star
                <br />
                <span style={{ color: "oklch(0.78 0.15 75)" }}>Google Reviews</span>
              </h1>
              <p className="text-xl font-bold leading-relaxed text-white/90">
                Send personalized review requests from your own email account. Your customers see it come from you — not a generic sender.
              </p>
            </div>

            {/* Trust points */}
            <div className="flex flex-col gap-4">
              {[
                { icon: Shield, text: "AES-256 encrypted credentials — your data stays safe" },
                { icon: Lock, text: "Sends from YOUR email — maximum deliverability" },
                { icon: Zap, text: "Set up in under 2 minutes — no technical skills needed" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.2)" }}>
                    <item.icon className="w-5 h-5" style={{ color: "oklch(0.78 0.15 75)" }} />
                  </div>
                  <p className="text-base font-bold leading-relaxed pt-2 text-white/90">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={18} fill="oklch(0.78 0.15 75)" style={{ color: "oklch(0.78 0.15 75)" }} />
                ))}
              </div>
              <span className="text-base font-bold text-white/70">
                Trusted by 500+ local businesses
              </span>
            </div>

            {/* Compliance note */}
            <div className="flex items-center gap-2 text-sm font-bold text-white/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Every email includes an unsubscribe link — fully compliant</span>
            </div>
          </motion.div>

          {/* Right column — Auth card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 rounded-3xl blur-xl opacity-40" style={{ background: "linear-gradient(135deg, rgba(255,184,0,0.15), transparent, rgba(255,184,0,0.08))" }} />

              {/* Card */}
              <div className="relative rounded-2xl p-8 md:p-10 shadow-2xl" style={{ background: "oklch(0.18 0.03 250)", border: "1px solid rgba(255,255,255,0.08)" }}>

                {/* Mobile heading (shown only on mobile) */}
                <div className="lg:hidden text-center mb-8">
                  <h1 className="font-display font-extrabold text-2xl mb-2">
                    Get More 5-Star
                  </h1>
                  <h2 className="font-display font-extrabold text-2xl" style={{ color: "oklch(0.78 0.15 75)" }}>
                    Google Reviews
                  </h2>
                  <p className="text-base font-bold mt-3 leading-relaxed text-white/80">
                    Send personalized review requests from your own email account.
                  </p>
                </div>

                {/* Desktop heading */}
                <div className="hidden lg:block text-center mb-8">
                  <h2 className="font-display font-bold text-xl mb-1">Create your free account</h2>
                  <p className="text-base font-bold text-white/70">No credit card required</p>
                </div>

                {/* Stars (mobile only) */}
                <div className="lg:hidden flex justify-center gap-1 mb-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={22} fill="oklch(0.78 0.15 75)" style={{ color: "oklch(0.78 0.15 75)" }} />
                  ))}
                </div>

                {/* Feature badges (mobile only) */}
                <div className="lg:hidden flex flex-wrap justify-center gap-2 mb-8">
                  {[
                    { text: t("features.sendsFromYourEmail") || "Sends from your email" },
                    { text: t("features.oneTapRequests") || "One-tap requests" },
                    { text: t("features.freeToStart") || "Free to start" },
                  ].map((f) => (
                    <span
                      key={f.text}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.2)", color: "oklch(0.78 0.15 75)" }}
                    >
                      {f.text}
                    </span>
                  ))}
                </div>

                {/* Auth buttons */}
                <div className="flex flex-col gap-3">
                  {/* Google */}
                  <button
                    onClick={handleGoogleSignIn}
                    className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white text-gray-900 font-semibold text-base rounded-xl hover:bg-gray-50 transition-all duration-200 active:scale-[0.98] shadow-lg"
                  >
                    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    {t("onboarding.googleBtn") || "Continue with Google"}
                  </button>

                  {/* Apple */}
                  <button
                    onClick={handleAppleSignIn}
                    className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-black text-white font-semibold text-base rounded-xl hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] shadow-lg border border-white/10"
                  >
                    <svg width="18" height="22" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="white">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.7 0 248.1 0 125.8 0 56.3 25.6 0 75.4 0c52.1 0 84.1 34.1 116.6 34.1 31.1 0 79.3-36.3 134.2-36.3 26.5 0 98.1 2.6 150.2 76.2zm-220-176.4c28.3-35.1 49.3-84.4 49.3-133.7 0-6.5-.6-13-1.9-18.1-46.9 1.9-101.9 31.4-135.3 71.9-26.5 29.9-50.6 79.2-50.6 129.2 0 7.1 1.3 14.3 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 42.2 0 95.2-28.3 123-66.1z"/>
                    </svg>
                    {t("onboarding.appleBtn") || "Continue with Apple"}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
                    <span className="text-sm font-black text-white/60">or</span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
                  </div>

                  {/* Email Magic Link */}
                  {!showEmailForm ? (
                    <button
                      onClick={() => setShowEmailForm(true)}
                      className="w-full py-4 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <Mail size={20} />
                      Continue with Email
                    </button>
                  ) : magicState === "sent" ? (
                    <div
                      className="w-full rounded-xl p-5 flex flex-col items-center gap-3 text-center"
                      style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.25)" }}
                    >
                      <CheckCircle2 size={32} style={{ color: "oklch(0.78 0.15 75)" }} />
                      <div>
                        <p className="font-bold text-white text-sm mb-1">Check your inbox!</p>
                        <p className="text-base font-bold text-white/70">
                          We sent a sign-in link to <strong className="text-white">{email}</strong>.
                          <br />It expires in 15 minutes.
                        </p>
                      </div>
                      <button
                        onClick={handleRetry}
                        className="text-sm font-bold underline mt-1 text-white/60"
                      >
                        Use a different email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleMagicLinkSend} className="flex flex-col gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                        className="w-full px-4 py-4 rounded-xl text-base font-medium outline-none text-white placeholder:text-white/60 font-medium"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.15)",
                        }}
                      />
                      {magicError && (
                        <p className="text-xs px-1 text-red-400">{magicError}</p>
                      )}
                      <button
                        type="submit"
                        disabled={magicState === "loading" || !email.trim()}
                        className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "oklch(0.78 0.15 75)", color: "#0a1628", opacity: magicState === "loading" ? 0.7 : 1 }}
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
                        style={{ color: "var(--text-on-dark-disabled)" }}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>

                {/* Fine print */}
                <p className="text-center text-sm font-bold text-white/80">
                  {t("onboarding.finePrint") || "Start free — 10 review requests included. No credit card required."}
                </p>
                <p className="mt-4 text-center text-sm font-bold text-white/70">
                  Already have an account?{" "}
                  <a href="/login" className="underline underline-offset-4 transition-colors hover:text-white" style={{ color: "oklch(0.78 0.15 75)" }}>
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center">
        <div className="flex items-center justify-center gap-4 text-sm font-bold text-white/50">
          <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
          <span>·</span>
          <a href="/terms-of-service" className="hover:text-white transition-colors">Terms</a>
          <span>·</span>
          <a href="mailto:support@getphame.app" className="hover:text-white transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
