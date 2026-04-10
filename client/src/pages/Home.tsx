// ReviewLink — Home Dashboard
// Shows stats, Gmail connection status, and quick-send CTA

import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Rocket, Star, Send, TrendingUp, Clock, Crown, AlertCircle, CheckCircle2 } from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { useLocation } from "wouter";
import { format } from "date-fns";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, "MMM d");
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: gmailStatus } = trpc.gmail.status.useQuery();
  const { data: stats } = trpc.requests.stats.useQuery();

  // SEO: dynamic page title with keywords
  useEffect(() => {
    document.title = "ReviewLink — Send Google Review Requests Fast";
  }, []);

  const isPro = profile?.tier === "pro";
  const gmailConnected = gmailStatus?.connected ?? false;
  const profileComplete = !!profile?.businessName && !!profile?.reviewLink;
  const atFreeLimit = !isPro && (stats?.thisMonth ?? 0) >= 10;
  const remainingFree = Math.max(0, 10 - (stats?.thisMonth ?? 0));

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header Panel */}
      <div
        className="relative px-5 pt-14 pb-8 overflow-hidden"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        {/* Background rocket image */}
        <div
          className="absolute right-0 top-0 w-40 h-40 opacity-15 pointer-events-none"
          style={{ transform: "translate(10%, -10%)" }}
        >
          <img src={HERO_IMG} alt="" className="w-full h-full object-contain" />
        </div>

        {/* Header top row */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Rocket size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
              >
                ReviewLink
              </span>
            </div>
            <h1
              className="text-2xl leading-tight"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
            >
              {profile?.businessName ? `Hey, ${profile.businessName.split(" ")[0]}!` : `Welcome back!`}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                {user?.name ?? user?.email ?? ""}
              </p>
              {isPro && <ProBadge size="sm" />}
            </div>
          </div>

          {isPro && <ProBadge size="lg" />}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { label: "This Month", value: stats?.thisMonth ?? 0, icon: <Send size={14} /> },
            { label: "All Time", value: stats?.total ?? 0, icon: <TrendingUp size={14} /> },
            {
              label: isPro ? "Unlimited" : `${remainingFree} Left`,
              value: isPro ? "∞" : remainingFree,
              icon: <Star size={14} />,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-3 text-center"
              style={{ background: "oklch(0.30 0.08 260)" }}
            >
              <div
                className="flex items-center justify-center gap-1 mb-1"
                style={{ color: "oklch(0.80 0.18 80)" }}
              >
                {s.icon}
              </div>
              <div
                className="text-2xl font-black"
                style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
              >
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Setup nudges ─────────────────────────────────────────────────── */}
        {(!gmailConnected || !profileComplete) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p
              className="text-sm font-black mb-3"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Complete your setup
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {profileComplete ? (
                  <CheckCircle2 size={16} style={{ color: "oklch(0.55 0.18 145)" }} />
                ) : (
                  <AlertCircle size={16} style={{ color: "oklch(0.65 0.18 80)" }} />
                )}
                <span className="text-sm" style={{ color: profileComplete ? "oklch(0.45 0.10 145)" : "oklch(0.40 0.04 260)" }}>
                  Business profile {profileComplete ? "complete" : "— add your business name & review link"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {gmailConnected ? (
                  <CheckCircle2 size={16} style={{ color: "oklch(0.55 0.18 145)" }} />
                ) : (
                  <AlertCircle size={16} style={{ color: "oklch(0.65 0.18 80)" }} />
                )}
                <span className="text-sm" style={{ color: gmailConnected ? "oklch(0.45 0.10 145)" : "oklch(0.40 0.04 260)" }}>
                  Gmail {gmailConnected ? `connected (${gmailStatus?.gmailEmail})` : "— connect your Gmail account"}
                </span>
              </div>
            </div>
            {(!gmailConnected || !profileComplete) && (
              <button
                onClick={() => navigate("/settings")}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-black"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "oklch(0.80 0.18 80)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Go to Settings →
              </button>
            )}
          </div>
        )}

        {/* ── Quick Send CTA ───────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/send")}
          disabled={atFreeLimit || !gmailConnected || !profileComplete}
          className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-transform active:scale-95"
          style={{
            background:
              atFreeLimit || !gmailConnected || !profileComplete
                ? "oklch(0.80 0.03 260)"
                : "oklch(0.80 0.18 80)",
            color:
              atFreeLimit || !gmailConnected || !profileComplete
                ? "oklch(0.55 0.03 260)"
                : "oklch(0.22 0.09 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <Rocket size={24} />
          Send a Review Request
        </button>

        {atFreeLimit && (
          <button
            onClick={() => navigate("/upgrade")}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-sm"
            style={{
              background: "oklch(0.22 0.09 260)",
              color: "oklch(0.80 0.18 80)",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            <Crown size={16} />
            Upgrade to Pro — Unlimited Requests
          </button>
        )}

        {/* ── SEO keyword section — visible to crawlers, useful to users ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2
            className="text-sm font-black mb-2"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            Get More Business Reviews
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: "oklch(0.55 0.03 260)" }}>
            ReviewLink makes it easy to send personalized review requests to your customers via email — for Google, Yelp, TripAdvisor, Bing, Facebook, and more.
            Build your online reputation across every platform, increase star ratings, and attract new customers — all from one simple dashboard.
          </p>
        </div>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        {stats?.recent && stats.recent.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Recent Requests
              </h3>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs font-bold"
                style={{ color: "oklch(0.50 0.10 260)" }}
              >
                View All →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {stats.recent.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "oklch(0.94 0.01 260)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                      style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                    >
                      {req.customerName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>
                        {req.customerName}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>
                        {req.customerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: "oklch(0.96 0.04 145)",
                        color: "oklch(0.45 0.12 145)",
                      }}
                    >
                      Sent
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.03 260)" }}>
                      {formatRelativeTime(new Date(req.sentAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
