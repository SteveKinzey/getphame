// ReviewLink — Upgrade Page
// Three-tier pricing: Monthly $29 | Annual $290 | Lifetime $1,247
// All billing via Zoho Books invoice (Stripe processes the card inside Zoho)

import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Crown, Check, Star, Zap, BarChart2, ChevronLeft, Infinity,
  Loader2, FileText, Ticket, Unlock, Calendar, Shield
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const UPGRADE_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-upgrade-hero-jBNmQektQK78tAwwYJ9c87.webp";

const PRO_FEATURES = [
  { icon: <Infinity size={14} />, text: "Unlimited review requests" },
  { icon: <Zap size={14} />, text: "Priority sending & follow-ups" },
  { icon: <BarChart2 size={14} />, text: "Advanced analytics" },
  { icon: <Star size={14} />, text: "Custom email templates" },
  { icon: <Crown size={14} />, text: "WooCommerce sync" },
  { icon: <Shield size={14} />, text: "Priority support" },
];

type Plan = "monthly" | "annual" | "lifetime";

const PLANS: Record<Plan, { label: string; price: string; sub: string; badge?: string; savings?: string }> = {
  monthly: {
    label: "Monthly",
    price: "$29",
    sub: "/ month",
  },
  annual: {
    label: "Annual",
    price: "$290",
    sub: "/ year",
    badge: "Most Popular",
    savings: "Save $58/yr",
  },
  lifetime: {
    label: "Lifetime",
    price: "$1,247",
    sub: "one-time",
    badge: "Best Value",
    savings: "Pay once, own forever",
  },
};

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.get.useQuery();
  const utils = trpc.useUtils();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [accessCode, setAccessCode] = useState("");

  const createInvoice = trpc.zoho.createInvoice.useMutation({
    onSuccess: (data) => {
      toast.success(data.message, { duration: 10000 });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create invoice. Please try again.");
    },
  });

  const redeemCode = trpc.accessCodes.redeem.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.note
          ? `🎉 Code accepted! ${data.note} — You're now on Pro!`
          : "🎉 Code accepted! You're now on Pro!"
      );
      setAccessCode("");
      utils.profile.get.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Invalid code. Please try again.");
    },
  });

  function handleInvoice() {
    createInvoice.mutate({ plan: selectedPlan });
  }

  function handleRedeemCode() {
    if (!accessCode.trim()) return;
    redeemCode.mutate({ code: accessCode.trim() });
  }

  const tier = profile?.tier;
  const isPaid = tier === "pro" || tier === "annual" || tier === "lifetime";

  if (isPaid) {
    const tierLabel = tier === "lifetime" ? "Lifetime License" : tier === "annual" ? "Annual Pro" : "Monthly Pro";
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-32"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <Crown size={64} style={{ color: "oklch(0.80 0.18 80)" }} className="mb-4" />
        <h2
          className="text-3xl font-black text-center mb-2"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
        >
          You're on {tierLabel}!
        </h2>
        <p className="text-center mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
          Enjoy unlimited review requests and all Pro features.
        </p>
        <button
          onClick={() => navigate("/")}
          className="py-3 px-8 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
          style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.22 0.09 260)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Crown size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            Upgrade
          </span>
        </div>
        <h1
          className="text-3xl leading-tight"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Go Pro.
          <br />
          <span style={{ color: "oklch(0.80 0.18 80)" }}>No Limits.</span>
        </h1>
      </div>

      {/* Hero image */}
      <div className="flex justify-center mb-4">
        <div className="w-28 h-28">
          <img src={UPGRADE_IMG} alt="Pro" className="w-full h-full object-contain" />
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Plan selector tabs */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ background: "oklch(0.30 0.08 260)" }}
        >
          {(["monthly", "annual", "lifetime"] as Plan[]).map((plan) => (
            <button
              key={plan}
              onClick={() => setSelectedPlan(plan)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all relative"
              style={{
                background: selectedPlan === plan ? "oklch(0.80 0.18 80)" : "transparent",
                color: selectedPlan === plan ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.5)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {PLANS[plan].label}
              {PLANS[plan].badge && selectedPlan !== plan && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded-full font-black whitespace-nowrap"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
                >
                  {PLANS[plan].badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pricing card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "oklch(0.30 0.08 260)", border: "2px solid oklch(0.80 0.18 80)" }}
        >
          {/* Price display */}
          <div className="flex items-end gap-2 mb-1">
            <span
              className="text-5xl font-black"
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
            >
              {PLANS[selectedPlan].price}
            </span>
            <span className="text-lg mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              {PLANS[selectedPlan].sub}
            </span>
          </div>

          {PLANS[selectedPlan].savings && (
            <div
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {selectedPlan === "annual" && <Calendar size={11} />}
              {selectedPlan === "lifetime" && <Shield size={11} />}
              {PLANS[selectedPlan].savings}
            </div>
          )}

          {selectedPlan === "monthly" && (
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Cancel anytime. No contracts.
            </p>
          )}
          {selectedPlan === "annual" && (
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              Billed once per year. Equivalent to $24.17/mo.
            </p>
          )}
          {selectedPlan === "lifetime" && (
            <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
              One-time payment. No renewals, ever.
            </p>
          )}

          {/* Features */}
          <div className="flex flex-col gap-3 mb-6">
            {PRO_FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
                >
                  {f.icon}
                </div>
                <span className="text-sm font-semibold" style={{ color: "white" }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleInvoice}
            disabled={createInvoice.isPending}
            className="w-full py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {createInvoice.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileText size={18} />
            )}
            {createInvoice.isPending
              ? "Sending invoice..."
              : `Get Invoice — ${PLANS[selectedPlan].price}`}
          </button>

          <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
            An invoice will be emailed to you. Pay by card via the secure invoice link.
          </p>
        </div>

        {/* Access Code Redeem */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "oklch(0.30 0.08 260)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Ticket size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
            <h3
              className="text-sm font-black"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
            >
              Have an access code?
            </h3>
          </div>
          <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
            Enter your beta or promo code to unlock Pro access.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleRedeemCode()}
              placeholder="e.g. BETA-X7K2-P9QM"
              className="flex-1 px-4 py-3 rounded-xl text-sm font-mono tracking-wider outline-none"
              style={{
                background: "oklch(0.22 0.09 260)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <button
              onClick={handleRedeemCode}
              disabled={!accessCode.trim() || redeemCode.isPending}
              className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
            >
              {redeemCode.isPending ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
              {redeemCode.isPending ? "" : "Redeem"}
            </button>
          </div>
        </div>

        {/* Stars / social proof */}
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={20} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>
        <p className="text-center text-xs pb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
          Trusted by local businesses to get more 5-star reviews
        </p>
      </div>
    </div>
  );
}
