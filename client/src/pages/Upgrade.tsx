// ReviewLink — Upgrade to Pro Screen
// Design: Navy background, gold crown hero, premium pricing card

import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Crown, Check, Star, Zap, BarChart2, ChevronLeft, Infinity, Loader2, CreditCard, Settings, Ticket, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const UPGRADE_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-upgrade-hero-jBNmQektQK78tAwwYJ9c87.webp";

const FREE_FEATURES = [
  "10 review requests / month",
  "Gmail sending (your own account)",
  "Activity dashboard",
];

const PRO_FEATURES = [
  { icon: <Infinity size={14} />, text: "Unlimited review requests" },
  { icon: <Zap size={14} />, text: "Priority sending" },
  { icon: <BarChart2 size={14} />, text: "Advanced analytics" },
  { icon: <Star size={14} />, text: "Custom email templates" },
  { icon: <Crown size={14} />, text: "Pro badge & priority support" },
];

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: subStatus } = trpc.stripe.subscriptionStatus.useQuery();

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: ({ url }) => {
      toast.info("Redirecting to secure checkout...");
      window.open(url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout. Please try again.");
    },
  });

  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => {
      toast.info("Opening billing portal...");
      window.open(url, "_blank");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open billing portal.");
    },
  });

  const isPro = profile?.tier === "pro";
  const utils = trpc.useUtils();

  const [accessCode, setAccessCode] = useState("");
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

  function handleRedeemCode() {
    if (!accessCode.trim()) return;
    redeemCode.mutate({ code: accessCode.trim() });
  }

  function handleUpgrade() {
    createCheckout.mutate({ origin: window.location.origin });
  }

  function handleManageBilling() {
    createPortal.mutate({ origin: window.location.origin });
  }

  if (isPro) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-28"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <Crown size={64} style={{ color: "oklch(0.80 0.18 80)" }} className="mb-4" />
        <h2
          className="text-3xl font-black text-center mb-2"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
        >
          You're on Pro!
        </h2>
        <p className="text-center mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
          Enjoy unlimited review requests and all Pro features.
        </p>
        {subStatus?.status && (
          <p className="text-center text-xs mb-6 px-4 py-2 rounded-full"
            style={{ background: "oklch(0.30 0.08 260)", color: "oklch(0.80 0.18 80)" }}>
            Subscription status: <strong>{subStatus.status}</strong>
          </p>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleManageBilling}
            disabled={createPortal.isPending}
            className="py-4 px-8 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {createPortal.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CreditCard size={18} />
            )}
            Manage Billing
          </button>

          <button
            onClick={() => navigate("/")}
            className="py-3 px-8 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
            style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.22 0.09 260)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6">
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
      <div className="flex justify-center mb-6">
        <div className="w-36 h-36">
          <img src={UPGRADE_IMG} alt="Pro" className="w-full h-full object-contain" />
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Pricing card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "oklch(0.30 0.08 260)" }}
        >
          <div className="flex items-end gap-2 mb-1">
            <span
              className="text-5xl font-black"
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
            >
              $29
            </span>
            <span className="text-lg mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              / month
            </span>
          </div>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
            Cancel anytime. No contracts.
          </p>

          {/* Pro features */}
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

          {/* Stripe Checkout Button */}
          <button
            onClick={handleUpgrade}
            disabled={createCheckout.isPending}
            className="w-full py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {createCheckout.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Crown size={18} />
            )}
            {createCheckout.isPending ? "Loading checkout..." : "Upgrade to Pro — $29/mo"}
          </button>

          <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            Secure payment powered by Stripe
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
            Enter your beta or promo code below to unlock Pro access for free.
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
              style={{
                background: "oklch(0.80 0.18 80)",
                color: "oklch(0.22 0.09 260)",
              }}
            >
              {redeemCode.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Unlock size={16} />
              )}
              {redeemCode.isPending ? "" : "Redeem"}
            </button>
          </div>
        </div>

        {/* Free vs Pro comparison */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3
            className="text-sm font-black mb-3"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            Free Plan Includes
          </h3>
          <div className="flex flex-col gap-2">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check size={14} style={{ color: "oklch(0.55 0.18 145)" }} />
                <span className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Test card notice */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: "oklch(0.28 0.06 260)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <CreditCard size={16} style={{ color: "oklch(0.80 0.18 80)" }} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.80 0.18 80)" }}>
              Testing? Use card 4242 4242 4242 4242
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Any future date and any 3-digit CVC. This is a test environment.
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={20} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>
        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          Trusted by local businesses to get more 5-star reviews
        </p>
      </div>
    </div>
  );
}
