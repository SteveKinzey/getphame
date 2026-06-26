// Phame — Upgrade / Pricing page
// Three-tier pricing: Monthly $29 | Annual $290 | Lifetime $1,247

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Crown, Check, Star, Zap, BarChart2, ChevronLeft, Infinity,
  Loader2, Ticket, Unlock, Calendar, Shield, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// ── THB dual-currency display ─────────────────────────────────────────────────
// Fixed rate — update manually when USD/THB shifts significantly
const THB_PER_USD = 35;
function toThb(usdAmount: number): string {
  const raw = usdAmount * THB_PER_USD;
  // Round up to nearest 50 baht for clean pricing
  const rounded = Math.ceil(raw / 50) * 50;
  return `฿${rounded.toLocaleString()}`;
}

const UPGRADE_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-upgrade-hero-jBNmQektQK78tAwwYJ9c87.webp";

// ── Feature comparison table ─────────────────────────────────────────────────
const COMPARISON_ROWS: { feature: string; free: string | boolean; pro: string | boolean; lifetime: string | boolean }[] = [
  { feature: "Review requests (total)",   free: "10",        pro: "Unlimited",  lifetime: "Unlimited" },
  { feature: "Follow-up reminders",        free: true,       pro: true,         lifetime: true },
  { feature: "Saved contacts",             free: true,       pro: true,         lifetime: true },
  { feature: "CSV import",                 free: true,       pro: true,         lifetime: true },
  { feature: "WooCommerce sync",           free: false,      pro: true,         lifetime: true },
  { feature: "Email open & click tracking",free: false,      pro: true,         lifetime: true },
  { feature: "Advanced analytics",         free: false,      pro: true,         lifetime: true },
  { feature: "Multi-platform review links",free: "1",        pro: "Unlimited",  lifetime: "Unlimited" },
  { feature: "Daily send limit",           free: "50/day",   pro: "500/day",    lifetime: "500/day" },
  { feature: "Priority support",           free: false,      pro: true,         lifetime: true },
  { feature: "Future updates",             free: false,      pro: "While active",lifetime: "Forever" },
  { feature: "Price",                      free: "Free",     pro: "$29/mo",     lifetime: "$1,247" },
];

const PRO_FEATURES = [
  { icon: <Infinity size={14} />, text: "Unlimited review requests" },
  { icon: <Zap size={14} />, text: "Priority sending & follow-ups" },
  { icon: <BarChart2 size={14} />, text: "Advanced analytics" },
  { icon: <Star size={14} />, text: "Custom email templates" },
  { icon: <Crown size={14} />, text: "WooCommerce sync" },
  { icon: <Shield size={14} />, text: "Priority support" },
];

type Plan = "monthly" | "annual" | "lifetime";

const PLANS: Record<Plan, { label: string; price: string; thb: string; sub: string; badge?: string; savings?: string }> = {
  monthly: {
    label: "Monthly",
    price: "$29",
    thb: toThb(29),
    sub: "/ month",
  },
  annual: {
    label: "Annual",
    price: "$290",
    thb: toThb(290),
    sub: "/ year",
    badge: "Most Popular",
    savings: "Save $58/yr",
  },
  lifetime: {
    label: "Lifetime",
    price: "$1,247",
    thb: toThb(1247),
    sub: "one-time",
    badge: "Best Value",
    savings: "Pay once, own forever",
  },
};

export default function UpgradePage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: profile } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [accessCode, setAccessCode] = useState("");
  // Show PromptPay if Thai locale detected, or user manually reveals it
  const isThai = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("th");
  const [showPromptPay, setShowPromptPay] = useState(isThai);

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(err.message || t("toastMessages.failedToStartCheckout"));
    },
  });

  const createThbCheckout = trpc.stripe.createThbCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err) => {
      toast.error(err.message || t("toastMessages.promptPayUnavailable"));
    },
  });

  const redeemCode = trpc.accessCodes.redeem.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.note
          ? t("accessCode.codeAcceptedNote", { note: data.note })
          : t("accessCode.codeAcceptedPro")
      );
      setAccessCode("");
      utils.profile.get.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || t("accessCode.invalidCodeError"));
    },
  });

  // Track page view with UTM params on mount
  const trackPageView = trpc.analytics.trackPageView.useMutation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    trackPageView.mutate({
      page: "/upgrade",
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      referrer: document.referrer || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStripeCheckout() {
    createCheckout.mutate({ origin: window.location.origin, plan: selectedPlan });
  }

  function handleRedeemCode() {
    if (!accessCode.trim()) return;
    redeemCode.mutate({ code: accessCode.trim() });
  }

  const tier = profile?.tier;
  const isAdmin = user?.role === "admin";
  const isPaid = isAdmin || tier === "pro" || tier === "annual" || tier === "lifetime";
  if (isPaid) {
    const tierLabel = isAdmin && !tier ? t("paidUser.adminAccess") : tier === "lifetime" ? t("paidUser.lifetimeLicense") : tier === "annual" ? t("paidUser.annualPro") : t("paidUser.monthlyPro");
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-40 rr-bg-navy"
      >
        <Crown size={64} className="rr-text-gold mb-4" />
        <h2
          className="text-3xl font-black text-center mb-2 text-white"
        >
          {t("paidUser.onPro", { tierLabel })}
        </h2>
        <p className="text-center mb-8 text-white font-bold text-lg">
          {t("paidUser.enjoyFeatures")}
        </p>
        <button
          onClick={() => navigate("/")}
          className="py-3 px-8 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
          style={{ color: "var(--text-on-dark-secondary)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          {t("paidUser.backToDashboard", "Back to Dashboard")}
        </button>
        {!isAdmin && (tier === "pro" || tier === "annual") && (
          <button
            onClick={() => navigate("/cancel")}
            className="mt-4 text-xs"
            style={{ color: "var(--text-on-dark-muted)" }}
          >
            {t("paidUser.cancelPlan", "Cancel plan")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 rr-bg-navy">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-base font-bold mb-4 text-white"
        >
          <ChevronLeft size={16} />
          {t("header.back")}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="rr-text-gold" />
              <span
                className="text-sm font-bold tracking-widest uppercase rr-text-gold"
              >
                {t("header.upgrade")}
              </span>
            </div>
            <h1
              className="text-3xl leading-tight text-white rr-fw-black"
            >
              {t("header.title")}
              <br />
              <span className="rr-text-gold">{t("header.noLimits")}</span>
            </h1>
          </div>
          {/* Hero image — aligned with text, uncropped */}
          <div className="shrink-0" style={{ width: 100, height: 100 }}>
            <img src={UPGRADE_IMG} alt={t("header.heroImageAlt")} className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Plan selector tabs */}
        <div
          className="flex rounded-2xl p-1 gap-1 rr-bg-navy-mid"
        >
          {(["monthly", "annual", "lifetime"] as Plan[]).map((plan) => {
            const planLabel = plan === "monthly" ? t("planSelector.monthly") : plan === "annual" ? t("planSelector.annual") : t("planSelector.lifetime");
            const planBadge = plan === "annual" ? t("planSelector.mostPopularBadge") : plan === "lifetime" ? t("planSelector.bestValueBadge") : undefined;
            return (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition-all relative"
                style={{
                  background: selectedPlan === plan ? "oklch(0.80 0.18 80)" : "transparent",
                  color: selectedPlan === plan ? "oklch(0.15 0.05 260)" : "oklch(0.85 0.02 260)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {planLabel}
                {planBadge && selectedPlan !== plan && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded-full font-black whitespace-nowrap rr-bg-gold rr-text-navy"
                  >
                    {planBadge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pricing card */}
        <div
          className="rounded-2xl p-6 rr-bg-navy-mid" style={{ border: "2px solid oklch(0.80 0.18 80)" }}
        >
          {/* Price display */}
          <div className="flex items-end gap-2 mb-1">
            <span
              className="text-5xl font-black rr-text-gold"
            >
              {PLANS[selectedPlan].price}
            </span>
            <span className="text-xl mb-2 text-white font-bold">
              {selectedPlan === "monthly" ? t("pricingCard.monthlySub") : selectedPlan === "annual" ? t("pricingCard.annualSub") : t("pricingCard.lifetimeSub")}
            </span>
          </div>
          {/* THB equivalent — display only, USD is the charge currency */}
          <p className="text-sm mb-2 text-white/80 font-bold">
            ≈ {PLANS[selectedPlan].thb} THB
          </p>

          {PLANS[selectedPlan].savings && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-4 rr-bg-navy rr-text-gold"
            >
              {selectedPlan === "annual" && <Calendar size={11} />}
              {selectedPlan === "lifetime" && <Shield size={11} />}
              {selectedPlan === "annual" ? t("pricingCard.annualSavings") : t("pricingCard.lifetimeSavings")}
            </div>
          )}

          {selectedPlan === "monthly" && (
            <p className="text-sm mb-4 text-white/80 font-bold">
              {t("pricingCard.monthlyDescription", "Cancel anytime. No contracts.")}
            </p>
          )}
          {selectedPlan === "annual" && (
            <p className="text-sm mb-4 text-white/80 font-bold">
              {t("pricingCard.annualDescription", "Billed once per year. Equivalent to $24.17/mo.")}
            </p>
          )}
          {selectedPlan === "lifetime" && (
            <>
              <p className="text-sm mb-3 text-white/80 font-bold">
                {t("pricingCard.lifetimeDescription", "One-time payment. No renewals, ever.")}
              </p>
              {/* Best Value ROI callout */}
              <div
                className="rounded-xl px-4 py-3 mb-4"
                style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
              >
                <p className="text-xs font-black mb-0.5" style={{ color: "oklch(0.20 0.08 80)" }}>
                  {t("pricingCard.lifetimeRoiCalloutTitle")}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.25 0.06 80)" }}>
                  {t("pricingCard.lifetimeRoiCalloutDescription")}
                </p>
              </div>
            </>
          )}

          {/* Features */}
          <div className="flex flex-col gap-3 mb-6">
            {PRO_FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 rr-bg-gold rr-text-navy"
                >
                  {f.icon}
                </div>
                <span className="text-sm font-semibold text-white">
                  {f.text}
                </span>
              </div>
            ))}
          </div>

          {/* Primary CTA — Stripe Checkout */}
          <button
            onClick={handleStripeCheckout}
            disabled={createCheckout.isPending}
            className="w-full py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 rr-bg-gold rr-text-navy"
          >
            {createCheckout.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            {createCheckout.isPending
              ? t("pricingCard.redirectingToCheckout")
              : t("pricingCard.payByCard", { price: PLANS[selectedPlan].price })}
          </button>

          <p className="text-center text-sm font-bold mt-2 text-white/60">
            {t("pricingCard.secureCheckoutNote")}
          </p>

          {/* PromptPay CTA — Thailand users (locale-detected or manually revealed) */}
          {showPromptPay ? (
            <div className="mt-3">
              {/* Social proof — shown only with PromptPay */}
              <div
                className="rounded-xl px-3 py-2.5 mb-2 flex items-start gap-2"
                style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
              >
                <span className="text-sm mt-0.5">💬</span>
                <div>
                  <p className="text-xs font-black" style={{ color: "oklch(0.20 0.08 80)" }}>
                    ธุรกิจส่วนใหญ่คืนทุนภายใน 90 วัน
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.25 0.06 80)" }}>
                    Most businesses recover cost in 90 days — reviews drive repeat bookings and new customers on autopilot.
                  </p>
                </div>
              </div>
              <button
                onClick={() => createThbCheckout.mutate({ origin: window.location.origin, plan: selectedPlan })}
                disabled={createThbCheckout.isPending}
                className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 text-white" style={{ background: "oklch(0.18 0.07 260)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                {createThbCheckout.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="text-base">&#x0E3F;</span>
                )}
                {createThbCheckout.isPending
                  ? t("pricingCard.promptPayRedirecting")
                  : t("pricingCard.payWithPromptPay", { thb: PLANS[selectedPlan].thb })}
              </button>
              <p className="text-center text-xs mt-1 mb-1" style={{ color: "var(--text-on-dark-muted)" }}>
                {t("pricingCard.promptPayNote")}
                {!isThai && (
                  <button
                    onClick={() => setShowPromptPay(false)}
                    className="ml-2 underline"
                    style={{ color: "var(--text-on-dark-muted)" }}
                  >
                    {t("pricingCard.hidePromptPay")}
                  </button>
                )}
              </p>
            </div>
          ) : (
            // Non-Thai locale: show a subtle reveal link
            <p className="text-center text-sm font-bold mt-2 text-white/60">
              {t("pricingCard.promptPayReveal")}{" "}
              <button
                onClick={() => {
                  setShowPromptPay(true);
                  trackPageView.mutate({
                    page: "/upgrade/promptpay-reveal",
                    utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? undefined,
                    utmCampaign: `plan:${selectedPlan}`,
                  });
                }}
                className="underline font-semibold rr-text-gold"
              >
                {t("pricingCard.promptPayRevealLink")}
              </button>
            </p>
          )}

        </div>

        {/* Access Code Redeem */}
        <div
          className="rounded-2xl p-5 rr-bg-navy-mid" style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Ticket size={16} className="rr-text-gold" />
            <h3
              className="text-sm font-black text-white"
            >
              {t("accessCode.title")}
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("accessCode.description")}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemCode()}
              placeholder={t("accessCode.placeholder")}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-wider outline-none rr-bg-navy text-white" style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            />
            <button
              onClick={handleRedeemCode}
              disabled={!accessCode.trim() || redeemCode.isPending}
              className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 rr-bg-gold rr-text-navy"
            >
              {redeemCode.isPending ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
              {redeemCode.isPending ? "" : t("accessCode.redeem")}
            </button>
          </div>
        </div>

        {/* Stars / social proof */}
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={20} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
          ))}
        </div>
        <p className="text-center text-xs pb-4" style={{ color: "var(--text-on-dark-muted)" }}>
          {t("socialProof.trustedByBusinesses")}
        </p>

        {/* ── Plan comparison table ────────────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.12)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-4 text-center text-xs font-black py-3 px-2"
            style={{ background: "oklch(0.18 0.07 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            <div className="text-left pl-2" style={{ color: "var(--text-on-dark-secondary)" }}>{t("comparisonTable.feature", "Feature")}</div>
            <div style={{ color: "var(--text-on-dark-secondary)" }}>{t("comparisonTable.free", "Free")}</div>
            <div className="rr-text-gold">{t("comparisonTable.pro", "Pro")}</div>
            <div style={{ color: "oklch(0.90 0.14 80)" }}>{t("comparisonTable.lifetime", "Lifetime")}</div>
          </div>

          {/* Table rows */}
          {COMPARISON_ROWS.map((row, i) => {
            const isLast = i === COMPARISON_ROWS.length - 1;
            const renderCell = (val: string | boolean) => {
              if (val === true) return <Check size={14} style={{ color: "oklch(0.65 0.18 145)" }} className="mx-auto" />;
              if (val === false) return <span style={{ color: "var(--text-on-dark-disabled)" }}>—</span>;
              return <span>{val}</span>;
            };
            return (
              <div
                key={row.feature}
                className="grid grid-cols-4 text-center text-xs py-2.5 px-2 items-center"
                style={{
                  background: isLast
                    ? "oklch(0.26 0.10 260)"
                    : i % 2 === 0
                      ? "oklch(0.28 0.08 260)"
                      : "oklch(0.25 0.08 260)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  fontWeight: isLast ? 800 : 400,
                  color: isLast ? "oklch(0.80 0.18 80)" : "var(--text-on-dark-secondary)",
                  fontFamily: isLast ? "'Poppins', sans-serif" : undefined,
                }}
              >
                <div className="text-left pl-2" style={{ color: isLast ? "oklch(0.80 0.18 80)" : "var(--text-on-dark-secondary)", fontWeight: isLast ? 800 : 500 }}>
                  {row.feature}
                </div>
                <div>{renderCell(row.free)}</div>
                <div>{renderCell(row.pro)}</div>
                <div>{renderCell(row.lifetime)}</div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs pb-6" style={{ color: "var(--text-on-dark-disabled)" }}>
          {t("comparisonTable.freeTrialNote")}
        </p>
      </div>
    </div>
  );
}
