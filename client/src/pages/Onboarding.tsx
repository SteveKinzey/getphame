// ReviewLink — Onboarding / Login screen
// Shown when user is not authenticated. Prompts them to sign in with Manus OAuth.
// After login, they set up their business profile in Settings.

import { Rocket, Star } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

export default function OnboardingPage() {
  function handleGoogleSignIn() {
    window.location.href = "/api/auth/google";
  }

  function handleAppleSignIn() {
    window.location.href = "/api/auth/apple";
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between pb-40 px-6 pt-16"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 self-start">
        <Rocket size={20} style={{ color: "oklch(0.80 0.18 80)" }} />
        <span
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
        >
          ReviewLink
        </span>
      </div>

      {/* Hero content */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-2xl">
          <img src={HERO_IMG} alt="ReviewLink" className="w-full h-full object-cover" />
        </div>

        <div>
          <h1
            className="text-4xl font-black leading-tight mb-3"
            style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
          >
            Get More 5-Star
            <br />
            <span style={{ color: "oklch(0.80 0.18 80)" }}>Google Reviews</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Send personalized review requests from your own email account. Your customers see it
            come from you — not a generic sender.
          </p>
        </div>

        {/* Stars */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={24} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {["Sends from your email", "One-tap requests", "Free to start"].map((f) => (
            <span
              key={f}
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,184,0,0.15)", color: "oklch(0.80 0.18 80)" }}
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
          className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-3"
          style={{
            background: "white",
            color: "#1a1a2e",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {/* Google SVG logo */}
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Apple Sign In */}
        <button
          onClick={handleAppleSignIn}
          className="w-full py-4 rounded-2xl font-bold text-base transition-transform active:scale-95 flex items-center justify-center gap-3"
          style={{
            background: "black",
            color: "white",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {/* Apple SVG logo */}
          <svg width="18" height="22" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="white">
            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.7 0 248.1 0 125.8 0 56.3 25.6 0 75.4 0c52.1 0 84.1 34.1 116.6 34.1 31.1 0 79.3-36.3 134.2-36.3 26.5 0 98.1 2.6 150.2 76.2zm-220-176.4c28.3-35.1 49.3-84.4 49.3-133.7 0-6.5-.6-13-1.9-18.1-46.9 1.9-101.9 31.4-135.3 71.9-26.5 29.9-50.6 79.2-50.6 129.2 0 7.1 1.3 14.3 1.9 16.5 3.2.6 8.4 1.3 13.6 1.3 42.2 0 95.2-28.3 123-66.1z"/>
          </svg>
          Continue with Apple
        </button>

        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Start free — 10 review requests included. No credit card required.
        </p>
      </div>
    </div>
  );
}
