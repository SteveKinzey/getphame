// ReviewRocket — Upgrade to Pro Screen
// Design: Navy background, gold crown hero, premium pricing card

import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Crown, Check, Rocket, Star, Zap, BarChart2, ChevronLeft, Infinity } from "lucide-react";
import { toast } from "sonner";

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
  { icon: <Crown size={14} />, text: "Pro badge & support" },
];

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const { data: profile } = trpc.profile.get.useQuery();

  const isPro = profile?.tier === "pro";

  function handleUpgrade() {
    toast.info("Stripe integration coming soon! Contact us to upgrade manually.");
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
          style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
        >
          You're on Pro!
        </h2>
        <p className="text-center mb-8" style={{ color: "rgba(255,255,255,0.7)" }}>
          Enjoy unlimited review requests and all Pro features.
        </p>
        <button
          onClick={() => navigate("/")}
          className="py-4 px-8 rounded-2xl font-black text-lg"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Back to Dashboard
        </button>
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
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
          >
            Upgrade
          </span>
        </div>
        <h1
          className="text-3xl leading-tight"
          style={{ color: "white", fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
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
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
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

          <button
            onClick={handleUpgrade}
            className="w-full py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
            style={{
              background: "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
              fontFamily: "'Syne', sans-serif",
            }}
          >
            <Crown size={18} className="inline mr-2" />
            Upgrade to Pro
          </button>
        </div>

        {/* Free vs Pro comparison */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3
            className="text-sm font-black mb-3"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
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
