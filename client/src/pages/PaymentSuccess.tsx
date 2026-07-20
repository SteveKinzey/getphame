// Phame — Payment Success Page
// Shown after a successful Stripe checkout. Tier-aware messaging for Pro/Annual/Lifetime.

import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Crown,
  CheckCircle2,
  Star,
  ArrowRight,
  Infinity,
  Zap,
  BarChart2,
  Shield,
  Bell,
  Building2,
  ClipboardList,
  Send,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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

const NEXT_STEPS = [
  {
    number: "01",
    icon: <Building2 size={17} />,
    title: "Set up your business",
    description: "Add your business name, sender details, and review destination.",
    route: "/settings",
    action: "Open settings",
  },
  {
    number: "02",
    icon: <ClipboardList size={17} />,
    title: "Choose your request template",
    description: "Start from a proven message, then personalize the follow-up experience.",
    route: "/templates",
    action: "View templates",
  },
  {
    number: "03",
    icon: <Send size={17} />,
    title: "Send your first request",
    description: "Invite a recent customer and turn the completed job into a review opportunity.",
    route: "/send",
    action: "Send a request",
  },
];

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Read tier from profile (invalidated on mount so it reflects the new state)
  const { data: profile } = trpc.profile.get.useQuery();
  const stripeReturnTier = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") !== "1") return null;
    const plan = params.get("plan");
    return plan === "annual" || plan === "lifetime" ? plan : "pro";
  }, []);
  const tier = (stripeReturnTier ?? profile?.tier ?? "pro") as "pro" | "annual" | "lifetime";

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") !== "1") return;
    toast.success(t("paymentSuccess.confirmedToast", { defaultValue: "Payment confirmed. Your Get Phame access is active." }));
    window.history.replaceState({}, "", "/payment-success");
  }, [t]);

  // PayPal: capture the order when returning from PayPal approval
  // PayPal redirects to /payment-success?paypal=1&token=ORDER_ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPayPal = params.get("paypal") === "1";
    const orderId = params.get("token"); // PayPal passes the order ID as ?token=
    if (!isPayPal || !orderId) return;

    // Clean the URL immediately so a refresh doesn't re-capture
    window.history.replaceState({}, "", "/payment-success");

    fetch("/api/paypal/capture-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
      credentials: "include",
    })
      .then((r) => r.json())
      .then(() => {
        utils.profile.get.invalidate();
        utils.stripe.subscriptionStatus.invalidate();
      })
      .catch((err) => console.error("[PayPal] Capture failed:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <p className="text-center text-xl font-black mb-1 text-white" role="status" data-testid="stripe-success-confirmation">
        {t("paymentSuccess.confirmed", { defaultValue: "Payment confirmed." })} {heading.sub}
      </p>
      <p className="max-w-xl text-center text-base font-bold mb-8 text-white/85">
        {t("paymentSuccess.thankYou", { defaultValue: "Thank you for investing in your reputation system. Your next three actions will turn that upgrade into visible customer trust." })}
      </p>

      <div className="w-full max-w-4xl grid gap-4 lg:grid-cols-[0.88fr_1.12fr] mb-6">
        {/* Perks card */}
        <section className="rounded-2xl p-5 rr-bg-navy-mid">
          <p className="text-base font-black tracking-widest uppercase mb-4 rr-text-gold">{cardTitle}</p>
          <div className="flex flex-col gap-3">
            {perks.map((perk) => (
              <div key={perk.text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 rr-bg-gold rr-text-navy">
                  {perk.icon}
                </div>
                <span className="text-base font-bold text-white">{perk.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl p-5 rr-bg-navy-mid" style={{ border: "1px solid oklch(0.80 0.18 80 / 0.35)" }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-base font-black text-white">Your next steps</p>
              <p className="mt-1 text-sm leading-5 text-white/75">A clear path from activation to your first review request.</p>
            </div>
            <ClipboardList size={21} className="shrink-0 rr-text-gold" />
          </div>
          <ol className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <li key={step.number} className="flex gap-3 rounded-xl p-3" style={{ background: "oklch(0.22 0.09 260)" }}>
                <span className="font-mono text-xs font-black rr-text-gold">{step.number}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-white"><span className="rr-text-gold">{step.icon}</span><p className="font-black text-sm">{step.title}</p></div>
                  <p className="mt-1 text-xs leading-5 text-white/70">{step.description}</p>
                  <button onClick={() => navigate(step.route)} className="mt-2 text-xs font-black rr-text-gold flex items-center gap-1">
                    {step.action} <ArrowRight size={12} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* CTA buttons */}
      <div className="w-full max-w-4xl grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => navigate("/settings")}
          className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 rr-bg-gold rr-text-navy"
        >
          <Building2 size={18} />
          Complete your setup
          <ArrowRight size={16} />
        </button>
        <button
          onClick={() => navigate("/send")}
          className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 text-white transition-transform active:scale-95"
          style={{ border: "1px solid rgba(255,255,255,0.22)", background: "oklch(0.28 0.07 260)" }}
        >
          <Send size={18} className="rr-text-gold" />
          Send your first request
        </button>
      </div>

      <button
        onClick={() => navigate("/")}
        className="mt-3 py-3 px-8 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
        style={{ color: "var(--text-on-dark-secondary)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        Go to Dashboard
      </button>

      {/* Stars */}
      <div className="flex justify-center gap-1 mt-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={18} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
        ))}
      </div>
      <p className="text-center text-base font-bold mt-2 text-white/80">
        {t("paymentSuccess.closingThankYou", { defaultValue: "Thank you for choosing Get Phame." })}
      </p>
    </div>
  );
}
