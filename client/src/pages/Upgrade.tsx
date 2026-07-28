// Phame — Upgrade / Pricing page
// Three-tier pricing: Monthly $29 | Annual $290 | Lifetime $349

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Crown, Check, Star, Zap, BarChart2, ChevronLeft, Infinity,
  Loader2, Ticket, Unlock, Calendar, Shield, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { canManageSubscription, getEffectivePlan, PLAN_LABELS } from "@shared/plans";
import { normalizePremiumFeatureKey, type PremiumFeatureKey } from "@/lib/upgradeModal";
import {
  THB_DISPLAY,
  USD_ANNUAL_SAVINGS,
  USD_DISPLAY,
  USD_LIFETIME_PAYBACK_MONTHS,
  USD_LIFETIME_SAVINGS_BY_YEAR_TWO,
  USD_PRICES,
} from "@shared/pricing";
import PlanSwitchDialog from "@/components/PlanSwitchDialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

function formatUsd(usdAmount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usdAmount);
}

const UPGRADE_IMG = "https://assets.getphame.app/phame-app-screenshot.png";

// ── Feature comparison table ─────────────────────────────────────────────────
type ComparisonFeatureKey =
  | "reviewRequests"
  | "followUpReminders"
  | "savedContacts"
  | "csvImport"
  | "bulkSender"
  | "koalendarImports"
  | "multiPlatformPhames"
  | "price";

type ComparisonCell =
  | boolean
  | "__FREE_ALLOWANCE__"
  | "__UNLIMITED__"
  | "__ONE__"
  | "__FREE__"
  | "__MONTHLY_PRICE__"
  | "__LIFETIME_PRICE__";

const COMPARISON_FEATURE_DEFAULTS: Record<ComparisonFeatureKey, string> = {
  reviewRequests: "Review requests",
  followUpReminders: "Follow-up reminders",
  savedContacts: "Saved contacts",
  csvImport: "CSV import",
  bulkSender: "Bulk Sender connection",
  koalendarImports: "Koalendar contact imports",
  multiPlatformPhames: "Multi-platform review links",
  price: "Price",
};

const COMPARISON_ROWS: Array<{
  featureKey: ComparisonFeatureKey;
  free: ComparisonCell;
  pro: ComparisonCell;
  lifetime: ComparisonCell;
}> = [
  { featureKey: "reviewRequests", free: "__FREE_ALLOWANCE__", pro: "__UNLIMITED__", lifetime: "__UNLIMITED__" },
  { featureKey: "followUpReminders", free: true, pro: true, lifetime: true },
  { featureKey: "savedContacts", free: true, pro: true, lifetime: true },
  { featureKey: "csvImport", free: true, pro: true, lifetime: true },
  { featureKey: "bulkSender", free: false, pro: true, lifetime: true },
  { featureKey: "koalendarImports", free: false, pro: true, lifetime: true },
  { featureKey: "multiPlatformPhames", free: "__ONE__", pro: "__UNLIMITED__", lifetime: "__UNLIMITED__" },
  { featureKey: "price", free: "__FREE__", pro: "__MONTHLY_PRICE__", lifetime: "__LIFETIME_PRICE__" },
];

const PRO_FEATURES = [
  { icon: <Infinity size={14} />, key: "pricingCard.unlimitedReviewRequests", fallback: "Unlimited review requests" },
  { icon: <Zap size={14} />, key: "pricingCard.prioritySending", fallback: "Priority sending & follow-ups" },
  { icon: <BarChart2 size={14} />, key: "pricingCard.advancedAnalytics", fallback: "Advanced analytics" },
  { icon: <Star size={14} />, key: "pricingCard.customEmailTemplates", fallback: "Custom email templates" },
  { icon: <Crown size={14} />, key: "pricingCard.woocommerceSync", fallback: "WooCommerce sync" },
  { icon: <Shield size={14} />, key: "pricingCard.prioritySupport", fallback: "Priority support" },
];

type Plan = "monthly" | "annual" | "lifetime";

const PLAN_ORDER: Plan[] = ["monthly", "annual", "lifetime"];

const PLANS: Record<Plan, { label: string; price: string; thb: string; sub: string; badge?: string; savings?: string }> = {
  monthly: {
    label: "Monthly",
    price: USD_DISPLAY.monthly,
    thb: THB_DISPLAY.monthly,
    sub: "/ month",
  },
  annual: {
    label: "Annual",
    price: USD_DISPLAY.annual,
    thb: THB_DISPLAY.annual,
    sub: "/ year",
    badge: "Most Popular",
    savings: "Save $58/yr",
  },
  lifetime: {
    label: "Lifetime",
    price: USD_DISPLAY.lifetime,
    thb: THB_DISPLAY.lifetime,
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
  const { data: subscriptionStatus } = trpc.stripe.subscriptionStatus.useQuery(undefined, {
    enabled: profile?.tier === "pro" || profile?.tier === "annual",
  });
  const utils = trpc.useUtils();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [accessCode, setAccessCode] = useState("");
  const [planSwitchOpen, setPlanSwitchOpen] = useState(false);
  const [campaignPromotionCode] = useState(() => {
    if (typeof window === "undefined") return null;
    const rawCode = new URLSearchParams(window.location.search).get("promo")?.trim() ?? "";
    return rawCode && rawCode.length <= 64 ? rawCode.toUpperCase() : null;
  });
  const [pricingFeature] = useState<PremiumFeatureKey>(() => {
    if (typeof window === "undefined") return "plans";
    return normalizePremiumFeatureKey(new URLSearchParams(window.location.search).get("feature"));
  });
  // Show PromptPay if Thai locale detected, or user manually reveals it
  const isThai = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("th");
  const [showPromptPay, setShowPromptPay] = useState(isThai);
  const [upgradeImageFailed, setUpgradeImageFailed] = useState(false);

  // PayPal — check if configured on server
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);
  const [paypalLoading, setPaypalLoading] = useState(false);
  useEffect(() => {
    fetch("/api/paypal/status")
      .then((r) => r.json() as Promise<{ enabled: boolean; clientId: string | null }>)
      .then((d) => setPaypalClientId(d.enabled ? d.clientId : null))
      .catch(() => setPaypalClientId(null));
  }, []);

  const handlePayPalCreateOrder = useCallback(async () => {
    setPaypalLoading(true);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan, origin: window.location.origin }),
        credentials: "include",
      });
      const data = await res.json() as { orderId?: string; approvalUrl?: string; error?: string };
      if (!res.ok || !data.orderId) {
        toast.error(data.error ?? "Failed to start PayPal checkout.");
        return "";
      }
      return data.orderId;
    } catch {
      toast.error("PayPal checkout failed. Please try again.");
      return "";
    } finally {
      setPaypalLoading(false);
    }
  }, [selectedPlan]);

  const handlePayPalApprove = useCallback(async (data: { orderID: string }) => {
    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
        credentials: "include",
      });
      const result = await res.json() as { ok?: boolean; tier?: string; error?: string };
      if (!res.ok || !result.ok) {
        toast.error(result.error ?? "Payment capture failed.");
        return;
      }
      utils.profile.get.invalidate();
      navigate("/payment-success");
    } catch {
      toast.error("Payment capture failed. Please contact support.");
    }
  }, [utils, navigate]);

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

  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("paidUser.portalOpened", { defaultValue: "Secure billing opened in a new tab." }));
    },
    onError: (err) => toast.error(err.message),
  });

  // Track page view with UTM params on mount
  const trackPageView = trpc.analytics.trackPageView.useMutation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    trackPageView.mutate({
      page: window.location.pathname === "/pricing" ? "/pricing" : "/upgrade",
      utmSource: params.get("utm_source") ?? undefined,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
      referrer: document.referrer || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStripeCheckout(plan: Plan = selectedPlan) {
    setSelectedPlan(plan);
    createCheckout.mutate({
      origin: window.location.origin,
      plan,
      ...(campaignPromotionCode ? { promotionCode: campaignPromotionCode } : {}),
    });
  }

  function handleRedeemCode() {
    if (!accessCode.trim()) return;
    redeemCode.mutate({ code: accessCode.trim() });
  }

  const effectivePlan = getEffectivePlan(profile?.tier, user?.role);
  const tierLabel = PLAN_LABELS[effectivePlan];
  const isLife = effectivePlan === "life";
  const canManage = canManageSubscription(effectivePlan);
  const renewalDate = subscriptionStatus?.currentPeriodEnd
    ? new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(subscriptionStatus.currentPeriodEnd))
    : null;
  if (effectivePlan !== "free") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-40 rr-bg-navy"
      >
        <Crown size={64} className="rr-text-gold mb-4" />
        <h2
          className="text-3xl font-black text-center mb-2 text-white"
        >
          {t("paidUser.currentStatus", { defaultValue: "Your status: {{tierLabel}}", tierLabel })}
        </h2>
        <p className="text-center mb-8 text-white font-bold text-lg">
          {isLife
            ? t("paidUser.lifeMessage", { defaultValue: "Life access is active. There is nothing to upgrade or renew." })
            : t("paidUser.manageMessage", { defaultValue: "Change your billing cycle or end your subscription below." })}
        </p>
        {canManage && (
          <div className="w-full max-w-md rounded-2xl p-5 mb-6 rr-bg-navy-mid" style={{ border: "1px solid oklch(0.80 0.18 80 / 0.35)" }}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest rr-text-gold">
                  {t("paidUser.subscription", { defaultValue: "Subscription" })}
                </p>
                <p className="text-lg font-black text-white">{tierLabel}</p>
                {renewalDate && (
                  <p className="mt-1 text-xs font-bold text-white/70" data-testid="subscription-renewal-date">
                    {subscriptionStatus?.cancelAtPeriodEnd
                      ? t("paidUser.accessUntil", { defaultValue: "Access until {{date}}", date: renewalDate })
                      : t("paidUser.renewsOn", { defaultValue: "Renews on {{date}}", date: renewalDate })}
                  </p>
                )}
              </div>
              <CreditCard size={24} className="rr-text-gold" />
            </div>
            <button
              onClick={() => setPlanSwitchOpen(true)}
              disabled={createPortal.isPending}
              className="w-full py-3 px-5 rounded-xl font-black text-sm flex items-center justify-center gap-2 rr-bg-gold rr-text-navy disabled:opacity-60"
            >
              {createPortal.isPending ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              {effectivePlan === "annual"
                ? t("paidUser.switchMonthly", { defaultValue: "Switch to Monthly or manage billing" })
                : t("paidUser.changePlan", { defaultValue: "Change plan or manage billing" })}
            </button>
            <button
              onClick={() => navigate("/cancel")}
              className="w-full mt-3 py-2.5 px-5 rounded-xl text-sm font-bold text-white/80 hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.18)" }}
            >
              {t("paidUser.endSubscription", { defaultValue: "End subscription" })}
            </button>
            <p className="text-xs text-white/60 text-center mt-3">
              {t("paidUser.endExplanation", { defaultValue: "Ending your subscription returns the account to Free at the end of the paid period." })}
            </p>
            <PlanSwitchDialog
              open={planSwitchOpen}
              onOpenChange={setPlanSwitchOpen}
              currentPlan={effectivePlan as "monthly" | "annual"}
              onConfirm={() => createPortal.mutate({ origin: window.location.origin })}
              isPending={createPortal.isPending}
            />
          </div>
        )}
        <button
          onClick={() => navigate("/")}
          className="py-3 px-8 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
          style={{ color: "var(--text-on-dark-secondary)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          {t("paidUser.backToDashboard", "Back to Dashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 rr-bg-navy">
      {/* Header */}
      <div className="px-5 pt-14 pb-5 max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-base font-bold mb-4 text-white"
        >
          <ChevronLeft size={16} />
          {t("header.back")}
        </button>
        <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="rr-text-gold" />
              <span
                className="text-sm font-bold tracking-widest uppercase rr-text-gold"
              >
                {t("header.upgrade")}
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl leading-[0.95] text-white rr-fw-black"
            >
              {t("header.title")}
              <br />
              <span className="rr-text-gold">{t("header.noLimits")}</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-white/75">
              {t(`premiumConversion.features.${pricingFeature}.description`, {
                defaultValue: "Compare the free plan with paid access before deciding. Your current work stays in place while you review the options.",
              })}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-[oklch(0.80_0.18_80/0.7)] bg-[oklch(0.12_0.03_250)] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-[#D4A017]/35 bg-[#061a3a]/95 px-3 py-2 shadow-lg sm:left-5 sm:top-5">
              <img src="https://assets.getphame.app/getphame-logo-mark.webp" alt="" className="h-6 w-6 object-contain" aria-hidden="true" />
              <span className="font-['Syne'] text-xs font-black tracking-[0.14em] text-white sm:text-sm">
                GET <span className="text-[#D4A017]">PHAME</span> PRO
              </span>
            </div>
            {upgradeImageFailed ? (
              <UpgradeVisualFallback />
            ) : (
              <img
                src={UPGRADE_IMG}
                alt={t("header.heroImageAlt", { defaultValue: "Get Phame dashboard preview" })}
                className="aspect-[16/9] w-full object-cover object-top lg:min-h-[320px]"
                loading="eager"
                decoding="async"
                onError={() => setUpgradeImageFailed(true)}
              />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#061a3a]/20 to-transparent" />
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-6 max-w-7xl mx-auto">
        <FreeVsPremiumOverview featureKey={pricingFeature} />

        {false && (
          <>
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
          {campaignPromotionCode && (
            <div
              className="mb-5 rounded-xl px-4 py-3 flex gap-3"
              style={{ background: "oklch(0.28 0.08 260)", border: "1px solid oklch(0.80 0.18 80 / 0.45)" }}
              role="status"
            >
              <Ticket size={17} className="mt-0.5 shrink-0 rr-text-gold" />
              <div>
                <p className="text-sm font-black text-white">
                  {t("promotionLink.applied", { defaultValue: "Your campaign code will be applied at checkout" })}
                </p>
                <p className="mt-0.5 text-xs font-bold rr-text-gold">{campaignPromotionCode}</p>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  {t("promotionLink.verified", { defaultValue: "Eligibility is verified securely before Stripe Checkout opens." })}
                </p>
              </div>
            </div>
          )}
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
            {t("pricingGrid.approximateThb", {
              defaultValue: "≈ {{amount}} THB",
              amount: PLANS[selectedPlan].thb,
            })}
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
              <div key={f.key} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 rr-bg-gold rr-text-navy"
                >
                  {f.icon}
                </div>
                <span className="text-sm font-semibold text-white">
                  {t(f.key, { defaultValue: f.fallback })}
                </span>
              </div>
            ))}
          </div>

          {/* 7-day guarantee badge */}
          <div className="flex items-center justify-center gap-1.5 mb-3 px-3 py-2 rounded-xl" style={{ background: "oklch(0.19 0.08 260)", border: "1px solid oklch(0.28 0.07 260)" }}>
            <Shield size={13} className="rr-text-gold flex-shrink-0" />
            <span className="text-xs font-bold rr-text-gold">{t("pricingCard.guarantee", "7-day money-back guarantee")}</span>
          </div>
          {/* Primary CTA — Stripe Checkout */}
          <button
            onClick={() => handleStripeCheckout()}
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

          {/* PayPal CTA — shown only when PAYPAL_CLIENT_ID is configured */}
          {paypalClientId && (
            <div className="mt-3">
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
                <span className="text-xs font-bold" style={{ color: "var(--text-on-dark-muted)" }}>or pay with</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
              </div>
              {paypalLoading ? (
                <div className="w-full py-3 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-white/60" />
                </div>
              ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: paypalClientId!,
                    currency: "USD",
                    intent: "capture",
                  }}
                >
                  <PayPalButtons
                    style={{ layout: "horizontal", color: "gold", shape: "rect", label: "pay", height: 44 }}
                    createOrder={handlePayPalCreateOrder}
                    onApprove={handlePayPalApprove}
                    onError={(err) => {
                      console.error("[PayPal]", err);
                      toast.error("PayPal encountered an error. Please try again.");
                    }}
                    onCancel={() => toast("PayPal payment cancelled.")}
                  />
                </PayPalScriptProvider>
              )}
            </div>
          )}

          {/* PromptPay CTA — Thailand users (locale-detected or manually revealed) */}
          {showPromptPay ? (
            <div className="mt-3">
              <button
                onClick={() => createThbCheckout.mutate({
                  origin: window.location.origin,
                  plan: selectedPlan,
                  ...(campaignPromotionCode ? { promotionCode: campaignPromotionCode } : {}),
                })}
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
          </>
        )}

        <PricingPlanGrid
          selectedPlan={selectedPlan}
          campaignPromotionCode={campaignPromotionCode}
          isCheckoutPending={createCheckout.isPending}
          onSelectPlan={setSelectedPlan}
          onCheckout={handleStripeCheckout}
        />

        <AlternativePaymentOptions
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          paypalClientId={paypalClientId}
          paypalLoading={paypalLoading}
          onPayPalCreateOrder={handlePayPalCreateOrder}
          onPayPalApprove={handlePayPalApprove}
          showPromptPay={showPromptPay}
          isThai={isThai}
          isPromptPayPending={createThbCheckout.isPending}
          onPromptPayCheckout={() => createThbCheckout.mutate({
            origin: window.location.origin,
            plan: selectedPlan,
            ...(campaignPromotionCode ? { promotionCode: campaignPromotionCode } : {}),
          })}
          onRevealPromptPay={() => {
            setShowPromptPay(true);
            trackPageView.mutate({
              page: "/upgrade/promptpay-reveal",
              utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? undefined,
              utmCampaign: `plan:${selectedPlan}`,
            });
          }}
          onHidePromptPay={() => setShowPromptPay(false)}
        />

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

        <MobilePlanComparisonDrawer />

        {/* ── Plan comparison table ────────────────────────────────────────────── */}
        <div
          className="hidden overflow-hidden rounded-2xl md:block"
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
              if (val === "__FREE_ALLOWANCE__") {
                return <span>{t("comparisonTable.freeRequestAllowance", { defaultValue: "10 first, then 5 / rolling 30 days" })}</span>;
              }
              if (val === "__UNLIMITED__") return <span>{t("comparisonTable.unlimited", { defaultValue: "Unlimited" })}</span>;
              if (val === "__ONE__") return <span>1</span>;
              if (val === "__FREE__") return <span>{t("comparisonTable.free", { defaultValue: "Free" })}</span>;
              if (val === "__MONTHLY_PRICE__") {
                return <span>{USD_DISPLAY.monthly} {t("pricingCard.monthlySub", { defaultValue: "/ month" })}</span>;
              }
              if (val === "__LIFETIME_PRICE__") return <span>{USD_DISPLAY.lifetime}</span>;
              return <span>{val}</span>;
            };
            return (
              <div
                key={row.featureKey}
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
                  {t(`comparisonTable.${row.featureKey}`, {
                    defaultValue: COMPARISON_FEATURE_DEFAULTS[row.featureKey],
                  })}
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

      {/* ── FAQ section ─────────────────────────────────────────────────────── */}
      <div className="px-4 pb-16">
        <h2 className="text-lg font-black text-center text-white mb-5 mt-2">
          {t("upgradeFaq.title", "Common Questions")}
        </h2>
        <div className="flex flex-col gap-3">
          {[
            {
              q: t("upgradeFaq.q1", "Is the lifetime deal really one payment?"),
              a: t("upgradeFaq.a1", "Yes — you pay $349 once and Get Phame is yours forever. No monthly fees, no renewals, no surprises. You also get all future updates included."),
            },
            {
              q: t("upgradeFaq.q2", "What happens if I cancel a monthly or annual plan?"),
              a: t("upgradeFaq.a2", "You keep access until the end of your current billing period. After that your account returns to Free: 10 initial requests, then 5 every rolling 30 days. Your contacts and history are never deleted."),
            },
            {
              q: t("upgradeFaq.q3", "Can I switch from monthly to annual later?"),
              a: t("upgradeFaq.a3", "Yes. You can upgrade from monthly to annual or lifetime at any time from Settings. The unused portion of your current plan is not refunded, but the new plan starts immediately."),
            },
            {
              q: t("upgradeFaq.q4", "Is there a refund policy?"),
              a: t("upgradeFaq.a4", "We offer a 7-day refund on all plans, no questions asked. Contact support@getphame.app within 7 days of purchase and we will process the refund within 24 hours."),
            },
            {
              q: t("upgradeFaq.q5", "Does the lifetime plan cover multiple locations?"),
              a: t("upgradeFaq.a5", "The lifetime plan covers one business/location. If you manage multiple locations, you will need a separate account for each. Contact us for agency or multi-location pricing."),
            },
            {
              q: t("upgradeFaq.q6", "What payment methods are accepted?"),
              a: t("upgradeFaq.a6", "All major credit and debit cards via Stripe. Thai users can also pay via PromptPay — tap the PromptPay option below the main checkout button."),
            },
          ].map((faq, i) => (
            <UpgradeFaqItem key={i} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FreeVsPremiumOverview({ featureKey }: { featureKey: PremiumFeatureKey }) {
  const { t } = useTranslation();
  const featurePath = `premiumConversion.features.${featureKey}`;

  const scrollToPlans = () => {
    document.getElementById("upgrade-plan-grid-heading")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section
      data-testid="free-vs-premium-overview"
      aria-labelledby="free-vs-premium-heading"
      className="overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(135deg,oklch(0.26_0.09_260),oklch(0.17_0.06_260))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)] sm:p-7"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] rr-text-gold">
          {t("premiumConversion.modal.comparePlans", { defaultValue: "Compare free and premium" })}
        </p>
        <h2 id="free-vs-premium-heading" className="mt-2 text-2xl font-black text-white sm:text-3xl">
          {t(`${featurePath}.title`, { defaultValue: "Choose the plan that fits your workflow" })}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-white/70 sm:text-base">
          {t(`${featurePath}.description`, {
            defaultValue: "Compare the free plan with paid access before deciding. Your current work stays in place while you review the options.",
          })}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-[#061a3a]/55 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                {t("comparisonTable.free", { defaultValue: "Free" })}
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {t("comparisonTable.freeRequestAllowance", { defaultValue: "10 first, then 5 / rolling 30 days" })}
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-white" aria-hidden="true">
              <Check size={20} />
            </span>
          </div>
          <ul className="mt-5 grid gap-3" aria-label={t("comparisonTable.free", { defaultValue: "Free" })}>
            {(["followUpReminders", "savedContacts", "csvImport"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm font-bold text-white/75">
                <Check size={16} className="mt-0.5 shrink-0 text-[oklch(0.72_0.18_145)]" aria-hidden="true" />
                <span>{t(`comparisonTable.${key}`, { defaultValue: COMPARISON_FEATURE_DEFAULTS[key] })}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="relative rounded-3xl border border-[oklch(0.80_0.18_80/0.72)] bg-[linear-gradient(145deg,oklch(0.31_0.11_260),oklch(0.22_0.07_260))] p-5 shadow-[0_18px_50px_oklch(0.80_0.18_80/0.14)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
                {t("premiumConversion.marker.label", { defaultValue: "Premium" })}
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {t(`${featurePath}.title`, { defaultValue: "Choose the plan that fits your workflow" })}
              </p>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-200/10 rr-text-gold" aria-hidden="true">
              <Crown size={21} />
            </span>
          </div>
          <ul className="mt-5 grid gap-3" aria-label={t("premiumConversion.modal.benefitsLabel", { defaultValue: "Paid plan benefits" })}>
            {(["one", "two", "three"] as const).map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm font-bold text-white">
                <Check size={16} className="mt-0.5 shrink-0 rr-text-gold" aria-hidden="true" />
                <span>{t(`${featurePath}.benefits.${key}`)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={scrollToPlans}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-2xl px-5 py-3 text-base font-black rr-bg-gold rr-text-navy transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
          >
            {t("pricingGrid.title", { defaultValue: "Choose the plan that fits your growth" })}
          </button>
        </article>
      </div>
    </section>
  );
}

function UpgradeVisualFallback() {
  const { t } = useTranslation();

  return (
    <div
      className="relative grid aspect-[16/9] min-h-[220px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,oklch(0.3_0.12_255),transparent_35%),linear-gradient(135deg,oklch(0.13_0.05_258),oklch(0.21_0.08_260))] px-6 lg:min-h-[320px]"
      data-testid="upgrade-hero-fallback"
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)]" />
      <div className="relative grid w-full max-w-sm gap-3">
        {[
          [t("pricingGrid.heroSendRequests", { defaultValue: "Send requests" }), <Zap key="zap" size={16} />],
          [t("pricingGrid.heroAutomateFollowUps", { defaultValue: "Automate follow-ups" }), <Check key="check" size={16} />],
          [t("pricingGrid.heroTrackGrowth", { defaultValue: "Track your growth" }), <BarChart2 key="chart" size={16} />],
        ].map(([label, icon]) => (
          <div key={label as string} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#061a3a]/80 px-4 py-3 shadow-lg backdrop-blur-sm">
            <span className="text-sm font-black text-white">{label}</span>
            <span className="grid h-8 w-8 place-items-center rounded-full rr-bg-gold rr-text-navy">{icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type PricingPlanGridProps = {
  selectedPlan: Plan;
  campaignPromotionCode: string | null;
  isCheckoutPending: boolean;
  onSelectPlan: (plan: Plan) => void;
  onCheckout: (plan: Plan) => void;
};

function PricingPlanGrid({
  selectedPlan,
  campaignPromotionCode,
  isCheckoutPending,
  onSelectPlan,
  onCheckout,
}: PricingPlanGridProps) {
  const { t, i18n } = useTranslation();

  return (
    <section aria-labelledby="upgrade-plan-grid-heading">
      <div className="mb-5 flex flex-col gap-2 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] rr-text-gold">{t("header.upgrade")}</p>
        <h2 id="upgrade-plan-grid-heading" className="text-2xl font-black text-white sm:text-3xl">
          {t("pricingGrid.title", { defaultValue: "Choose the plan that fits your growth" })}
        </h2>
      </div>

      <div data-testid="upgrade-plan-guidance" className="mb-5 grid grid-cols-1 gap-2 text-left sm:grid-cols-3">
        {PLAN_ORDER.map((plan) => (
          <button
            key={plan}
            type="button"
            onClick={() => onSelectPlan(plan)}
            aria-pressed={selectedPlan === plan}
            className={`rounded-2xl border px-4 py-3 transition-colors ${
              selectedPlan === plan
                ? "border-[oklch(0.80_0.18_80)] bg-[oklch(0.28_0.09_260)]"
                : "border-white/10 bg-[#061a3a]/45 hover:border-white/30"
            }`}
          >
            <span className="block text-xs font-black uppercase tracking-[0.12em] rr-text-gold">
              {plan === "monthly" ? t("planSelector.monthly") : plan === "annual" ? t("planSelector.annual") : t("planSelector.lifetime")}
            </span>
            <span className="mt-1 block text-xs font-semibold leading-relaxed text-white/70">
              {t(`pricingGrid.guidance.${plan}`, {
                defaultValue: plan === "monthly"
                  ? "Best for short-term flexibility."
                  : plan === "annual"
                    ? "Best recurring value at about $24.17 per month."
                    : "Best long-term value: $349 once, with no renewals.",
              })}
            </span>
          </button>
        ))}
      </div>

      <SavingsCalculator locale={i18n.language} />

      {campaignPromotionCode && (
        <div
          className="mb-5 flex gap-3 rounded-2xl border border-[oklch(0.80_0.18_80/0.45)] bg-[oklch(0.28_0.08_260)] px-4 py-3"
          role="status"
        >
          <Ticket size={17} className="mt-0.5 shrink-0 rr-text-gold" />
          <div className="text-left">
            <p className="text-sm font-black text-white">
              {t("promotionLink.applied", { defaultValue: "Your campaign code will be applied at checkout" })}
            </p>
            <p className="mt-0.5 text-xs font-bold rr-text-gold">{campaignPromotionCode}</p>
          </div>
        </div>
      )}

      <div data-testid="upgrade-plan-grid" className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const planConfig = PLANS[plan];
          const isAnnual = plan === "annual";
          const isLifetime = plan === "lifetime";
          const isSelected = selectedPlan === plan;
          const planTitle = plan === "monthly"
            ? t("planSelector.monthly")
            : isAnnual
              ? t("planSelector.annual")
              : t("planSelector.lifetime");
          const planDescription = plan === "monthly"
            ? t("pricingCard.monthlyDescription", { defaultValue: "Cancel anytime. No contracts." })
            : isAnnual
              ? t("pricingCard.annualDescription", { defaultValue: "Billed once per year. Equivalent to $24.17/mo." })
              : t("pricingCard.lifetimeDescription", { defaultValue: "One-time payment. No renewals, ever." });
          const cardTreatment = isAnnual
            ? `border-[oklch(0.80_0.18_80/0.78)] bg-[linear-gradient(180deg,oklch(0.30_0.10_260),oklch(0.22_0.07_260))] shadow-[0_22px_60px_oklch(0.80_0.18_80/0.20)] lg:-translate-y-2 ${isSelected ? "ring-2 ring-[oklch(0.80_0.18_80/0.45)]" : ""}`
            : isSelected
              ? "border-[oklch(0.80_0.18_80)] bg-[oklch(0.25_0.09_260)] shadow-[0_22px_56px_rgba(212,160,23,0.16)]"
              : "border-white/12 rr-bg-navy-mid hover:-translate-y-0.5 hover:border-[oklch(0.80_0.18_80/0.62)]";

          return (
            <article
              key={plan}
              data-testid={`upgrade-plan-card-${plan}`}
              className={`relative flex min-w-0 flex-col rounded-[1.5rem] border p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)] transition-[transform,border-color,box-shadow] duration-200 sm:p-6 ${
                isLifetime ? "sm:col-span-2 lg:col-span-1" : ""
              } ${cardTreatment}`}
            >
              {isAnnual && (
                <span
                  data-testid="annual-most-popular-badge"
                  className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-[oklch(0.88_0.15_80/0.85)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] rr-bg-gold rr-text-navy shadow-[0_0_18px_oklch(0.80_0.18_80/0.45)]"
                >
                  {t("planSelector.mostPopularBadge", { defaultValue: "Most Popular" })}
                </span>
              )}
              <div className="mb-4 flex min-h-7 items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black text-white">{planTitle}</p>
                  <p className="mt-1 text-xs font-bold text-white/60">{planDescription}</p>
                </div>
                {!isAnnual && planConfig.badge && (
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide rr-bg-gold rr-text-navy">
                    {isAnnual ? t("planSelector.mostPopularBadge") : t("planSelector.bestValueBadge")}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-[#061a3a]/45 px-3 py-3 text-left transition-colors hover:border-[oklch(0.80_0.18_80/0.5)]"
                aria-pressed={isSelected}
              >
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black rr-text-gold">{planConfig.price}</span>
                  <span className="mb-1 text-sm font-bold text-white">{planConfig.sub}</span>
                </div>
                <p className="mt-1 text-xs font-bold text-white/60">
                  {t("pricingGrid.approximateThb", {
                    defaultValue: "≈ {{amount}} THB",
                    amount: planConfig.thb,
                  })}
                </p>
              </button>

              {planConfig.savings && (
                <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-[#061a3a] px-2.5 py-1 text-xs font-bold rr-text-gold">
                  {isAnnual ? <Calendar size={11} /> : <Shield size={11} />}
                  {isAnnual ? t("pricingCard.annualSavings") : t("pricingCard.lifetimeSavings")}
                </div>
              )}

              <ul
                className="mb-6 flex flex-1 flex-col gap-2.5"
                aria-label={t("pricingGrid.planFeaturesLabel", {
                  defaultValue: "{{plan}} plan features",
                  plan: planTitle,
                })}
              >
                {PRO_FEATURES.map((feature) => (
                  <li key={feature.key} className="flex items-start gap-2.5 text-sm font-semibold text-white">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full rr-bg-gold rr-text-navy">{feature.icon}</span>
                    <span>{t(feature.key, { defaultValue: feature.fallback })}</span>
                  </li>
                ))}
              </ul>

              <div className="mb-3 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#061a3a] px-3 py-2">
                <Shield size={13} className="shrink-0 rr-text-gold" />
                <span className="text-xs font-bold rr-text-gold">{t("pricingCard.guarantee", "7-day money-back guarantee")}</span>
              </div>

              <button
                type="button"
                onClick={() => onCheckout(plan)}
                disabled={isCheckoutPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-black transition-transform active:scale-[0.97] disabled:opacity-70 rr-bg-gold rr-text-navy"
              >
                {isCheckoutPending ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
                {isCheckoutPending
                  ? t("pricingCard.redirectingToCheckout")
                  : t("pricingCard.payByCard", { price: planConfig.price })}
              </button>
              <p className="mt-2 text-center text-xs font-bold text-white/55">{t("pricingCard.secureCheckoutNote")}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SavingsCalculator({ locale }: { locale: string }) {
  const { t } = useTranslation();

  return (
    <section
      data-testid="pricing-savings-calculator"
      aria-labelledby="upgrade-savings-heading"
      className="mb-5 overflow-hidden rounded-2xl border border-[oklch(0.80_0.18_80/0.28)] bg-[linear-gradient(120deg,oklch(0.29_0.10_260),oklch(0.19_0.07_260))] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1 text-left sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] rr-text-gold">
            {t("pricingGrid.savingsEyebrow", { defaultValue: "Savings calculator" })}
          </p>
          <h3 id="upgrade-savings-heading" className="mt-1 text-lg font-black text-white">
            {t("pricingGrid.savingsTitle", { defaultValue: "See what each commitment saves" })}
          </h3>
        </div>
        <p className="text-xs font-semibold text-white/60">
          {t("pricingGrid.savingsBasis", { defaultValue: "Compared with paying monthly" })}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#061a3a]/55 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
            {t("planSelector.monthly", { defaultValue: "Monthly" })}
          </p>
          <p className="mt-1 text-lg font-black text-white">{formatUsd(USD_PRICES.monthly * 12, locale)}</p>
          <p className="mt-1 text-xs font-semibold text-white/60">
            {t("pricingGrid.monthlyAnnualCost", { defaultValue: "for 12 months" })}
          </p>
        </div>
        <div className="rounded-xl border border-[oklch(0.80_0.18_80/0.58)] bg-[oklch(0.25_0.09_260)] p-3 shadow-[0_0_20px_oklch(0.80_0.18_80/0.12)]">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] rr-text-gold">
            {t("planSelector.annual", { defaultValue: "Annual" })}
          </p>
          <p className="mt-1 text-lg font-black rr-text-gold">
            {t("pricingGrid.annualSave", { defaultValue: "Save {{amount}}", amount: formatUsd(USD_ANNUAL_SAVINGS, locale) })}
          </p>
          <p className="mt-1 text-xs font-semibold text-white/70">
            {t("pricingGrid.annualSavingsDetail", { defaultValue: "{{price}} instead of {{monthly}} for year one", price: formatUsd(USD_PRICES.annual, locale), monthly: formatUsd(USD_PRICES.monthly * 12, locale) })}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#061a3a]/55 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
            {t("planSelector.lifetime", { defaultValue: "Lifetime" })}
          </p>
          <p className="mt-1 text-lg font-black text-[oklch(0.72_0.18_145)]">
            {t("pricingGrid.lifetimeSave", { defaultValue: "Save {{amount}} by year two", amount: formatUsd(USD_LIFETIME_SAVINGS_BY_YEAR_TWO, locale) })}
          </p>
          <p className="mt-1 text-xs font-semibold text-white/60">
            {t("pricingGrid.lifetimePayback", { defaultValue: "Pays for itself in about {{months}} months", months: USD_LIFETIME_PAYBACK_MONTHS })}
          </p>
        </div>
      </div>
    </section>
  );
}

function MobilePlanComparisonDrawer() {
  const { t } = useTranslation();
  const renderCell = (value: string | boolean) => {
    if (value === true) return (
      <Check
        size={13}
        className="mx-auto text-[oklch(0.72_0.18_145)]"
        aria-label={t("pricingGrid.includedLabel", { defaultValue: "Included" })}
      />
    );
    if (value === false) return <span className="text-white/35">—</span>;
    if (value === "__FREE_ALLOWANCE__") return <span>{t("comparisonTable.freeRequestAllowance", { defaultValue: "10 + 5 / 30d" })}</span>;
    if (value === "__UNLIMITED__") return <span>{t("comparisonTable.unlimited", { defaultValue: "Unlimited" })}</span>;
    if (value === "__ONE__") return <span>1</span>;
    if (value === "__FREE__") return <span>{t("comparisonTable.free", { defaultValue: "Free" })}</span>;
    if (value === "__MONTHLY_PRICE__") return <span>{USD_DISPLAY.monthly}</span>;
    if (value === "__LIFETIME_PRICE__") return <span>{USD_DISPLAY.lifetime}</span>;
    return <span>{value}</span>;
  };

  return (
    <div data-testid="mobile-plan-comparison-drawer" className="mb-5 md:hidden">
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            data-testid="mobile-comparison-trigger"
            className="flex w-full items-center justify-between rounded-2xl border border-white/12 bg-[oklch(0.24_0.08_260)] px-4 py-3 text-left transition-colors hover:border-[oklch(0.80_0.18_80/0.62)]"
          >
            <span>
              <span className="block text-sm font-black text-white">
                {t("comparisonTable.mobileTitle", { defaultValue: "Compare plan features" })}
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-white/60">
                {t("comparisonTable.mobileSubtitle", { defaultValue: "Open the compact feature comparison" })}
              </span>
            </span>
            <span className="rounded-full px-3 py-1 text-xs font-black rr-bg-gold rr-text-navy">
              {t("comparisonTable.mobileAction", { defaultValue: "Compare" })}
            </span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[82vh] overflow-y-auto border-white/15 rr-bg-navy text-white">
          <DrawerHeader className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] rr-text-gold">
              {t("comparisonTable.mobileEyebrow", { defaultValue: "Feature comparison" })}
            </p>
            <DrawerTitle className="text-xl font-black text-white">
              {t("comparisonTable.mobileTitle", { defaultValue: "Compare plan features" })}
            </DrawerTitle>
            <DrawerDescription className="text-white/65">
              {t("comparisonTable.mobileDescription", { defaultValue: "Compare Free, Pro, and Lifetime without leaving the upgrade page." })}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.20_0.07_260)] mx-4">
            <div className="grid grid-cols-[minmax(0,1.42fr)_repeat(3,minmax(0,0.78fr))] border-b border-white/10 bg-[#061a3a] px-2 py-2 text-center text-[10px] font-black">
              <div className="text-left text-white/55">{t("comparisonTable.feature", { defaultValue: "Feature" })}</div>
              <div className="text-white/55">{t("comparisonTable.free", { defaultValue: "Free" })}</div>
              <div className="rr-text-gold">{t("comparisonTable.pro", { defaultValue: "Pro" })}</div>
              <div className="text-[oklch(0.90_0.14_80)]">{t("comparisonTable.lifetime", { defaultValue: "Lifetime" })}</div>
            </div>
            {COMPARISON_ROWS.map((row, index) => (
              <div
                key={row.featureKey}
                className="grid grid-cols-[minmax(0,1.42fr)_repeat(3,minmax(0,0.78fr))] items-center px-2 py-2 text-center text-[10px] font-semibold text-white/75"
                style={{ background: index % 2 === 0 ? "oklch(0.25 0.08 260)" : "oklch(0.22 0.07 260)" }}
              >
                <div className="pr-1 text-left font-bold text-white/85">
                  {t(`comparisonTable.${row.featureKey}`, {
                    defaultValue: COMPARISON_FEATURE_DEFAULTS[row.featureKey],
                  })}
                </div>
                <div>{renderCell(row.free)}</div>
                <div>{renderCell(row.pro)}</div>
                <div>{renderCell(row.lifetime)}</div>
              </div>
            ))}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <button type="button" className="w-full rounded-xl border border-white/15 py-3 text-sm font-black text-white">
                {t("pricingGrid.closeComparison", { defaultValue: "Close comparison" })}
              </button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

type AlternativePaymentOptionsProps = {
  selectedPlan: Plan;
  onSelectPlan: (plan: Plan) => void;
  paypalClientId: string | null;
  paypalLoading: boolean;
  onPayPalCreateOrder: () => Promise<string>;
  onPayPalApprove: (data: { orderID: string }) => Promise<void>;
  showPromptPay: boolean;
  isThai: boolean;
  isPromptPayPending: boolean;
  onPromptPayCheckout: () => void;
  onRevealPromptPay: () => void;
  onHidePromptPay: () => void;
};

function AlternativePaymentOptions({
  selectedPlan,
  onSelectPlan,
  paypalClientId,
  paypalLoading,
  onPayPalCreateOrder,
  onPayPalApprove,
  showPromptPay,
  isThai,
  isPromptPayPending,
  onPromptPayCheckout,
  onRevealPromptPay,
  onHidePromptPay,
}: AlternativePaymentOptionsProps) {
  const { t } = useTranslation();

  if (!paypalClientId && !showPromptPay && isThai) return null;

  return (
    <section className="rounded-2xl border border-white/10 rr-bg-navy-mid" aria-labelledby="alternative-payment-heading">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">{t("pricingCard.otherPaymentMethods", { defaultValue: "Other payment methods" })}</p>
        <h2 id="alternative-payment-heading" className="mt-1 text-lg font-black text-white">
          {t("pricingCard.checkoutForPlan", { defaultValue: "Checkout for {{plan}}", plan: PLANS[selectedPlan].label })}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLAN_ORDER.map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => onSelectPlan(plan)}
              aria-pressed={selectedPlan === plan}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${
                selectedPlan === plan ? "rr-bg-gold rr-text-navy" : "border border-white/15 text-white/75 hover:border-[oklch(0.80_0.18_80/0.55)]"
              }`}
            >
              {PLANS[plan].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {paypalClientId && (
          <div className="rounded-xl border border-white/10 bg-[#061a3a]/50 p-4">
            <p className="mb-3 text-sm font-black text-white">PayPal</p>
            {paypalLoading ? (
              <div className="flex h-11 items-center justify-center"><Loader2 size={18} className="animate-spin text-white/60" /></div>
            ) : (
              <PayPalScriptProvider options={{ clientId: paypalClientId!, currency: "USD", intent: "capture" }}>
                <PayPalButtons
                  style={{ layout: "horizontal", color: "gold", shape: "rect", label: "pay", height: 44 }}
                  createOrder={onPayPalCreateOrder}
                  onApprove={onPayPalApprove}
                  onError={(err) => {
                    console.error("[PayPal]", err);
                    toast.error("PayPal encountered an error. Please try again.");
                  }}
                  onCancel={() => toast("PayPal payment cancelled.")}
                />
              </PayPalScriptProvider>
            )}
          </div>
        )}

        {showPromptPay ? (
          <div className="rounded-xl border border-white/10 bg-[#061a3a]/50 p-4">
            <p className="mb-3 text-sm font-black text-white">PromptPay</p>
            <button
              type="button"
              onClick={onPromptPayCheckout}
              disabled={isPromptPayPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[oklch(0.18_0.07_260)] py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            >
              {isPromptPayPending ? <Loader2 size={14} className="animate-spin" /> : <span className="text-base">฿</span>}
              {isPromptPayPending
                ? t("pricingCard.promptPayRedirecting")
                : t("pricingCard.payWithPromptPay", { thb: PLANS[selectedPlan].thb })}
            </button>
            {!isThai && (
              <button type="button" onClick={onHidePromptPay} className="mt-2 text-xs font-bold text-white/60 underline">
                {t("pricingCard.hidePromptPay")}
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-[#061a3a]/50 p-4">
            <p className="text-sm font-black text-white">PromptPay</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{t("pricingCard.promptPayReveal")}</p>
            <button type="button" onClick={onRevealPromptPay} className="mt-3 text-xs font-black underline rr-text-gold">
              {t("pricingCard.promptPayRevealLink")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function UpgradeFaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.19 0.08 260)", border: "1px solid oklch(0.28 0.07 260)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <span className="text-sm font-bold text-white">{q}</span>
        <span
          className="shrink-0 text-lg leading-none rr-text-gold"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? "300px" : "0px",
          overflow: "hidden",
          transition: "max-height 0.28s ease",
        }}
      >
        <div className="px-4 pb-4 text-xs leading-relaxed" style={{ color: "var(--text-on-dark-secondary)" }}>
          {a}
        </div>
      </div>
    </div>
  );
}
