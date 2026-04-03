// ReviewRocket — Onboarding / Login screen
// Shown when user is not authenticated. Prompts them to sign in with Manus OAuth.
// After login, they set up their business profile in Settings.

import { Rocket, Star } from "lucide-react";
import { getLoginUrl } from "@/const";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

export default function OnboardingPage() {
  function handleGetStarted() {
    window.location.href = getLoginUrl();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between pb-12 px-6 pt-16"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 self-start">
        <Rocket size={20} style={{ color: "oklch(0.80 0.18 80)" }} />
        <span
          className="text-sm font-bold tracking-widest uppercase"
          style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
        >
          ReviewRocket
        </span>
      </div>

      {/* Hero content */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <div className="w-48 h-48 rounded-3xl overflow-hidden shadow-2xl">
          <img src={HERO_IMG} alt="ReviewRocket" className="w-full h-full object-cover" />
        </div>

        <div>
          <h1
            className="text-4xl font-black leading-tight mb-3"
            style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
          >
            Get More 5-Star
            <br />
            <span style={{ color: "oklch(0.80 0.18 80)" }}>Google Reviews</span>
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
            Send personalized review requests from your own Gmail account. Your customers see it
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
          {["Sends from your Gmail", "One-tap requests", "Free to start"].map((f) => (
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
        <button
          onClick={handleGetStarted}
          className="w-full py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Get Started Free →
        </button>
        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          10 free review requests per month. No credit card required.
        </p>
      </div>
    </div>
  );
}
