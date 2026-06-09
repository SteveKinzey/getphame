// Phame — Payment Success Page
// Shown after a successful Stripe checkout. Tier-aware messaging for Pro/Annual/Lifetime.

import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Crown,
  CheckCircle2,
  Star,
  Star,
  ArrowRight,
  Infinity,
  Zap,
  BarChart2,
  Shield,
  Bell,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const PERKS_BY_TIER: Record<string, { icon: React.ReactNode; text: string }[]> = {
  pro: [
    { icon: <Infinity size={15} />, text: "Unlimited review requests" },
    { icon: <Zap size={15} />, text: "Priority sending" },
    { icon: <Bell size={15} />, text: "Automated follow-up reminders" },
    { icon: <BarChart2 size={15} />, text: "Advanced analytics" },
    { icon: <Crown size={15} />, text: "Priority support" },
  ],
  annual: [
    { icon: <Infinity size={15} />, text: "Unlimited review requests" },
    { icon: <Zap size={15} />, text: "Priority sending" },
    { icon: <Bell size={15} />, text: "Automated follow-up reminders" },
    { icon: <BarChart2 size={15} />, text: "Advanced analytics" },
    { icon: <Star size={15} />, text: "2 months free vs monthly" },
  ],
  lifetime: [
    { icon: <Infinity size={15} />, text: "Unlimited review requests — forever" },
    { icon: <Shield size={15} />, text: "Never pay again — one-time fee" },
    { icon: <Bell size={15} />, text: "Automated follow-up reminders" },
    { icon: <BarChart2 size={15} />, text: "Advanced analytics" },
    { icon: <Crown size={15} />, text: "Lifetime priority support" },
  ],
};

const HEADING_BY_TIER: Record<string, { top: string; highlight: string; sub: string }> = {
  pro: {
    top: "You're",
    highlight: "Pro!",
    sub: "Monthly plan activated. Your account is upgraded.",
  },
  annual: {
    top: "You're",
    highlight: "Pro Annual!",
    sub: "Annual plan activated — you're saving 2 months.",
  },
  lifetime: {
    top: "You're a",
    highlight: "Lifetime Member!",
    sub: "One-time payment. Access forever. No renewals.",
  },
};

const CARD_TITLE_BY_TIER: Record<string, string> = {
  pro: "Your Pro Perks",
  annual: "Your Annual Perks",
  lifetime: "Your Lifetime Perks",
};

export default function PaymentSuccessPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Read tier from profile (invalidated on mount so it reflects the new state)
  const { data: profile } = trpc.profile.get.useQuery();
  const tier = (profile?.tier ?? "pro") as "pro" | "annual" | "lifetime";

  // Stable random star positions — computed once per mount
  const stars = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.5 + 0.1,
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 2,
      })),
    []
  );

  // Invalidate profile so tier reflects immediately
  useEffect(() => {
    utils.profile.get.invalidate();
    utils.stripe.subscriptionStatus.invalidate();
  }, [utils]);

  const heading = HEADING_BY_TIER[tier] ?? HEADING_BY_TIER.pro;
  const perks = PERKS_BY_TIER[tier] ?? PERKS_BY_TIER.pro;
  const cardTitle = CARD_TITLE_BY_TIER[tier] ?? "Your Perks";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 pb-40 pt-14 relative overflow-hidden rr-bg-navy"
    >
      {/* Animated background stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${s.size}px`,
              height: `${s.size}px`,
              top: `${s.top}%`,
              left: `${s.left}%`,
              background: "oklch(0.80 0.18 80)",
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Crown / shield hero */}
      <div className="relative mb-6 flex flex-col items-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-2xl rr-bg-gold"
        >
          {tier === "lifetime" ? (
            <Shield size={44} className="rr-text-navy" />
          ) : (
            <Crown size={44} className="rr-text-navy" />
          )}
        </div>

        {/* Animated check badge */}
        <div
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center border-2 rr-bg-green" style={{ borderColor: "oklch(0.22 0.09 260)" }}
        >
          <CheckCircle2 size={16} color="white" />
        </div>
      </div>

      {/* Heading */}
      <h1
        className="text-4xl font-black text-center mb-2 leading-tight text-white"
      >
        {heading.top}{" "}
        <span className="rr-text-gold">{heading.highlight}</span>
      </h1>
      <p className="text-center text-base mb-1" style={{ color: "var(--text-on-dark-secondary)" }}>
        Payment confirmed. {heading.sub}
      </p>
      <p className="text-center text-sm mb-8" style={{ color: "var(--text-on-dark-muted)" }}>
        Your account has been upgraded instantly.
      </p>

      {/* Perks card */}
      <div
        className="w-full max-w-xs rounded-2xl p-5 mb-6 rr-bg-navy-mid"
      >
        <p
          className="text-xs font-black tracking-widest uppercase mb-4 rr-text-gold"
        >
          {cardTitle}
        </p>
        <div className="flex flex-col gap-3">
          {perks.map((perk) => (
            <div key={perk.text} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 rr-bg-gold rr-text-navy"
              >
                {perk.icon}
              </div>
              <span className="text-sm font-semibold text-white">
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
          className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 rr-bg-gold rr-text-navy"
        >
          <Star size={18} />
          Send Your First Request
          <ArrowRight size={16} />
        </button>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ color: "var(--text-on-dark-secondary)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Go to Dashboard
        </button>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-1 mt-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={18} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
        ))}
      </div>
      <p className="text-center text-xs mt-2" style={{ color: "var(--text-on-dark-disabled)" }}>
        Thank you for supporting Phame
      </p>
    </div>
  );
}
