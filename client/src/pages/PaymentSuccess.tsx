// ReviewRocket — Payment Success Page
// Shown after a successful Stripe checkout. Confirms Pro activation and guides next steps.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Crown, CheckCircle2, Rocket, Star, ArrowRight, Infinity, Zap, BarChart2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PRO_PERKS = [
  { icon: <Infinity size={15} />, text: "Unlimited review requests" },
  { icon: <Zap size={15} />, text: "Priority sending" },
  { icon: <BarChart2 size={15} />, text: "Advanced analytics" },
  { icon: <Star size={15} />, text: "Custom email templates" },
  { icon: <Crown size={15} />, text: "Pro badge & priority support" },
];

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const [confettiDone, setConfettiDone] = useState(false);
  const utils = trpc.useUtils();

  // Invalidate profile so Pro status reflects immediately
  useEffect(() => {
    utils.profile.get.invalidate();
    utils.stripe.subscriptionStatus.invalidate();
    const timer = setTimeout(() => setConfettiDone(true), 2800);
    return () => clearTimeout(timer);
  }, [utils]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 pb-10 pt-14 relative overflow-hidden"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Animated background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              background: "oklch(0.80 0.18 80)",
              opacity: Math.random() * 0.5 + 0.1,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Crown hero */}
      <div className="relative mb-6 flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-2xl"
          style={{ background: "oklch(0.80 0.18 80)" }}
        >
          <Crown size={44} style={{ color: "oklch(0.22 0.09 260)" }} />
        </div>

        {/* Animated check badge */}
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2"
          style={{
            background: "oklch(0.55 0.18 145)",
            borderColor: "oklch(0.22 0.09 260)",
          }}
        >
          <CheckCircle2 size={16} color="white" />
        </div>
      </div>

      {/* Heading */}
      <h1
        className="text-4xl font-black text-center mb-2 leading-tight"
        style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
      >
        You're{" "}
        <span style={{ color: "oklch(0.80 0.18 80)" }}>Pro!</span>
      </h1>
      <p className="text-center text-base mb-1" style={{ color: "rgba(255,255,255,0.75)" }}>
        Payment confirmed. Welcome to the Pro plan.
      </p>
      <p className="text-center text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
        Your account has been upgraded instantly.
      </p>

      {/* Perks card */}
      <div
        className="w-full max-w-xs rounded-2xl p-5 mb-6"
        style={{ background: "oklch(0.30 0.08 260)" }}
      >
        <p
          className="text-xs font-black tracking-widest uppercase mb-4"
          style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
        >
          Your Pro Perks
        </p>
        <div className="flex flex-col gap-3">
          {PRO_PERKS.map((perk) => (
            <div key={perk.text} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
              >
                {perk.icon}
              </div>
              <span className="text-sm font-semibold" style={{ color: "white" }}>
                {perk.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button
          onClick={() => navigate("/send")}
          className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          <Rocket size={18} />
          Send Your First Request
          <ArrowRight size={16} />
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Go to Dashboard
        </button>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-1 mt-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={18} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
        ))}
      </div>
      <p className="text-center text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
        Thank you for supporting ReviewRocket
      </p>
    </div>
  );
}
