/**
 * PaywallModal — fires when a free-tier user hits a gated feature.
 *
 * Usage:
 *   const [paywallOpen, setPaywallOpen] = useState(false);
 *   const [paywallFeature, setPaywallFeature] = useState("");
 *
 *   // In mutation onError:
 *   if (err.message.includes("10003")) {
 *     setPaywallFeature("Bulk Send");
 *     setPaywallOpen(true);
 *     return;
 *   }
 *
 *   <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />
 */
import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Crown, Check, X, Zap, Loader2, Star, BarChart2, Infinity, Shield } from "lucide-react";
import { toast } from "sonner";

// ── THB dual-currency (mirrors Upgrade.tsx) ───────────────────────────────────
const THB_PER_USD = 35;
function toThb(usdAmount: number): string {
  const raw = usdAmount * THB_PER_USD;
  const rounded = Math.ceil(raw / 50) * 50;
  return `฿${rounded.toLocaleString()}`;
}

type Plan = "monthly" | "annual" | "lifetime";

const PLANS: Record<Plan, { label: string; price: string; thb: string; sub: string; badge?: string; savings?: string }> = {
  monthly:  { label: "Monthly",  price: "$29",  thb: toThb(29),  sub: "/ month" },
  annual:   { label: "Annual",   price: "$290", thb: toThb(290), sub: "/ year",     badge: "Most Popular", savings: "Save $58/yr" },
  lifetime: { label: "Lifetime", price: "$497", thb: toThb(497), sub: "one-time",   badge: "Best Value",   savings: "Pay once, own forever" },
};

const PRO_BULLETS = [
  { icon: <Infinity size={13} />, text: "Unlimited review requests" },
  { icon: <Zap size={13} />,      text: "Bulk send to contacts & WooCommerce" },
  { icon: <Star size={13} />,     text: "Follow-up reminder emails" },
  { icon: <BarChart2 size={13} />,text: "Advanced analytics & tracking" },
  { icon: <Crown size={13} />,    text: "WooCommerce sync + CSV export" },
  { icon: <Shield size={13} />,   text: "Priority support" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** The feature name that triggered the paywall, e.g. "Bulk Send" */
  feature?: string;
}

export default function PaywallModal({ open, onClose, feature }: Props) {
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);

  // Detect Thai locale for PromptPay option
  const isThai = typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("th");
  const [showThb, setShowThb] = useState(isThai);

  // Reset state when modal opens
  useEffect(() => {
    if (open) { setSelectedPlan("annual"); setLoading(false); }
  }, [open]);

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err) => { setLoading(false); toast.error(err.message); },
  });

  const createThbCheckout = trpc.stripe.createThbCheckout.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err) => { setLoading(false); toast.error(err.message || "PromptPay checkout unavailable."); },
  });

  const handleCheckout = useCallback((useThb = false) => {
    setLoading(true);
    const origin = window.location.origin;
    if (useThb) {
      createThbCheckout.mutate({ plan: selectedPlan, origin });
    } else {
      createCheckout.mutate({ plan: selectedPlan, origin });
    }
  }, [selectedPlan, createCheckout, createThbCheckout]);

  const handleViewFullPage = () => {
    onClose();
    navigate("/upgrade");
  };

  if (!open) return null;

  const plan = PLANS[selectedPlan];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: "oklch(0.22 0.09 260)",
          maxHeight: "92dvh",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Upgrade to Pro"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="px-5 pb-8 pt-2">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
              style={{ background: "oklch(0.80 0.18 80 / 0.15)", border: "1px solid oklch(0.80 0.18 80 / 0.3)" }}>
              <Crown size={22} style={{ color: "oklch(0.80 0.18 80)" }} />
            </div>
            <h2 className="text-xl font-black text-white mb-1">
              {feature ? `${feature} requires Pro` : "Upgrade to Pro"}
            </h2>
            <p className="text-sm text-white/60">
              Unlock all features with a Pro subscription
            </p>
          </div>

          {/* Pro bullets */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {PRO_BULLETS.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-white/80">
                <span style={{ color: "oklch(0.80 0.18 80)" }}>{b.icon}</span>
                {b.text}
              </div>
            ))}
          </div>

          {/* Plan selector */}
          <div className="flex gap-2 mb-4">
            {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                className="flex-1 relative rounded-xl py-3 px-2 text-center transition-all duration-150 active:scale-[0.97]"
                style={{
                  background: selectedPlan === key ? "oklch(0.80 0.18 80)" : "oklch(0.30 0.07 260)",
                  border: selectedPlan === key ? "2px solid oklch(0.80 0.18 80)" : "2px solid transparent",
                  color: selectedPlan === key ? "oklch(0.22 0.09 260)" : "white",
                }}
              >
                {p.badge && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{
                      background: selectedPlan === key ? "oklch(0.22 0.09 260)" : "oklch(0.80 0.18 80)",
                      color: selectedPlan === key ? "oklch(0.80 0.18 80)" : "oklch(0.22 0.09 260)",
                    }}
                  >
                    {p.badge}
                  </span>
                )}
                <div className="font-black text-sm">{p.label}</div>
                <div className="font-black text-base">{showThb ? p.thb : p.price}</div>
                <div className="text-[10px] opacity-70">{p.sub}</div>
                {p.savings && (
                  <div className="text-[9px] font-bold mt-0.5 opacity-80">{p.savings}</div>
                )}
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <button
            onClick={() => handleCheckout(false)}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] mb-3"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
            {loading ? "Redirecting…" : `Upgrade — ${showThb ? plan.thb : plan.price} ${plan.sub}`}
          </button>

          {/* PromptPay option for Thai users */}
          {isThai && (
            <button
              onClick={() => handleCheckout(true)}
              disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 mb-3 transition-all duration-150 active:scale-[0.97]"
              style={{
                background: "oklch(0.30 0.07 260)",
                color: "white",
                border: "1px solid oklch(0.40 0.07 260)",
              }}
            >
              Pay with PromptPay (฿)
            </button>
          )}

          {!isThai && (
            <button
              onClick={() => setShowThb(!showThb)}
              className="w-full text-xs text-white/40 hover:text-white/60 transition-colors mb-3"
            >
              {showThb ? "Show USD prices" : "Pay in Thai Baht (฿) / PromptPay"}
            </button>
          )}

          {/* View full page link */}
          <button
            onClick={handleViewFullPage}
            className="w-full text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            View full pricing page →
          </button>

          <p className="text-center text-[10px] text-white/30 mt-3">
            Secure payment via Stripe · Cancel anytime
          </p>
        </div>
      </div>
    </>
  );
}
