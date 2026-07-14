// Get Phame — Referral Landing Page (/ref/:code)
// Stores the referral code in localStorage and redirects to the landing page.
// On login, App.tsx reads phame_ref and calls claimReferral automatically.

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Star, ArrowRight, Users, Gift, CheckCircle2 } from "lucide-react";

export default function ReferralLanding() {
  const params = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);
  const code = params.code ?? "";

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }
    // Persist the referral code — App.tsx will claim it after login
    localStorage.setItem("phame_ref", code);
  }, [code]);

  // Countdown then redirect to landing page
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <img src="https://assets.getphame.app/getphame-logo-mark.webp" alt="GetPhame logo" className="w-8 h-8 rounded-xl" loading="eager" decoding="async" />
          <span className="font-display font-extrabold text-xl tracking-tight">
            <span className="text-white">GET</span><span style={{ color: 'oklch(0.80 0.18 80)' }}>PHAME</span>
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{ background: "oklch(0.28 0.09 260)", border: "1px solid oklch(0.35 0.09 260)" }}
      >
        {/* Gift icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "oklch(0.80 0.18 80 / 0.15)" }}
        >
          <Gift size={32} style={{ color: "oklch(0.80 0.18 80)" }} />
        </div>

        <h1
          className="text-2xl font-black text-white mb-2"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          You've been invited!
        </h1>
        <p className="text-sm mb-6" style={{ color: "oklch(0.75 0.05 260)" }}>
          A friend thinks Get Phame can help your business earn more 5-star reviews — automatically.
        </p>

        {/* Perks */}
        <div className="space-y-3 mb-8 text-left">
          {[
            "Send personalised review requests from your own email",
            "Automated follow-up reminders — set it and forget it",
            "Works with Google, Yelp, TripAdvisor, Facebook & more",
          ].map((perk) => (
            <div key={perk} className="flex items-start gap-3">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0"
                style={{ color: "oklch(0.80 0.18 80)" }}
              />
              <span className="text-sm text-white">{perk}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Start Free — No Credit Card
          <ArrowRight size={16} />
        </button>

        {/* Auto-redirect notice */}
        <p className="text-xs mt-4" style={{ color: "oklch(0.55 0.05 260)" }}>
          Redirecting automatically in {countdown}s…
        </p>
      </div>

      {/* Social proof */}
      <div className="mt-6 flex items-center gap-2">
        <Users size={14} style={{ color: "oklch(0.55 0.05 260)" }} />
        <span className="text-xs" style={{ color: "oklch(0.55 0.05 260)" }}>
          Join local businesses already collecting reviews on autopilot
        </span>
      </div>

      {/* Referral code badge */}
      {code && (
        <div
          className="mt-4 px-3 py-1.5 rounded-full text-xs font-mono"
          style={{ background: "oklch(0.28 0.09 260)", color: "oklch(0.65 0.05 260)", border: "1px solid oklch(0.35 0.09 260)" }}
        >
          Referral code: {code}
        </div>
      )}
    </div>
  );
}
