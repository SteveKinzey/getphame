// ReviewLink — Home Dashboard
// Shows stats, SMTP connection status, and quick-send CTA

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Rocket, Star, Send, TrendingUp, Clock, AlertCircle, CheckCircle2, WifiOff, BookOpen, Share2, Target, Pencil, Check, X, Eye, MousePointerClick, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import OnboardingGuide from "@/components/OnboardingGuide";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-hero-onboarding-8SYQEqGEorTANQPoVMWeZD.webp";

const SHARE_URL = "https://reviewlink.app";
const SHARE_TEXT = "I've been using ReviewLink to send review requests from my own email — it's free and works great. Worth checking out:";

function ShareReferralCard() {
  const [copied, setCopied] = useState(false);
  const { track } = useAnalytics();

  const handleShare = async () => {
    track("share_referral");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ReviewLink — Free review request tool",
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {
        // user dismissed the share sheet — no action needed
      }
      return;
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(0.22 0.09 260)" }}
    >
      {/* Gold accent bar */}
      <div className="h-1 w-full" style={{ background: "oklch(0.80 0.18 80)" }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.80 0.18 80)" }}
          >
            <Share2 size={15} style={{ color: "oklch(0.22 0.09 260)" }} />
          </div>
          <div>
            <p className="text-xs font-black leading-tight" style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}>
              Know a local business owner?
            </p>
            <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
              Help them get more reviews — it's free.
            </p>
          </div>
        </div>

        {/* Message preview */}
        <div
          className="rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed"
          style={{ background: "oklch(0.30 0.08 260)", color: "var(--text-on-dark-secondary)" }}
        >
          <span style={{ color: "oklch(0.80 0.18 80)", fontWeight: 700 }}>"</span>
          {SHARE_TEXT}{" "}
          <span style={{ color: "oklch(0.80 0.18 80)" }}>{SHARE_URL}</span>
          <span style={{ color: "oklch(0.80 0.18 80)", fontWeight: 700 }}>"</span>
        </div>

        {/* CTA button */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-transform active:scale-95"
          style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? "Copied to clipboard!" : "Share ReviewLink"}
        </button>
      </div>
    </div>
  );
}

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

function TrackingSummaryCard() {
  const { isAuthenticated } = useAuth();
  const { data: overallStats, isLoading } = trpc.tracking.overallStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Don't render until we have data and there's at least one sent email
  if (isLoading || !overallStats || overallStats.totalSent === 0) return null;

  const { totalSent, uniqueOpens, uniqueClicks, openRate, clickRate } = overallStats;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} style={{ color: "oklch(0.22 0.09 260)" }} />
        <h3
          className="text-sm font-black"
          style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
        >
          Email Performance
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {/* Sent */}
        <div className="flex flex-col items-center rounded-xl py-3 px-2" style={{ background: "oklch(0.97 0.01 260)" }}>
          <Send size={14} style={{ color: "oklch(0.50 0.10 260)", marginBottom: 4 }} />
          <span className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
            {totalSent}
          </span>
          <span className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>Sent</span>
        </div>
        {/* Open Rate */}
        <div className="flex flex-col items-center rounded-xl py-3 px-2" style={{ background: "oklch(0.95 0.05 220)" }}>
          <Eye size={14} style={{ color: "oklch(0.45 0.15 220)", marginBottom: 4 }} />
          <span className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
            {openRate}%
          </span>
          <span className="text-xs" style={{ color: "oklch(0.50 0.08 220)" }}>Open Rate</span>
        </div>
        {/* Click Rate */}
        <div className="flex flex-col items-center rounded-xl py-3 px-2" style={{ background: "oklch(0.96 0.06 80)" }}>
          <MousePointerClick size={14} style={{ color: "oklch(0.55 0.18 80)", marginBottom: 4 }} />
          <span className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
            {clickRate}%
          </span>
          <span className="text-xs" style={{ color: "oklch(0.55 0.12 80)" }}>Click Rate</span>
        </div>
      </div>
      <p className="text-xs mt-2.5 text-center" style={{ color: "oklch(0.65 0.03 260)" }}>
        {uniqueOpens} opened · {uniqueClicks} clicked · across {totalSent} requests
      </p>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: smtpStatus } = trpc.smtp.status.useQuery();
  const { data: stats } = trpc.requests.stats.useQuery();
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery();
  const utils = trpc.useUtils();

  // Goal tracker state
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const setGoalMutation = trpc.profile.setGoal.useMutation({
    onSuccess: () => { utils.profile.get.invalidate(); setEditingGoal(false); },
    onError: (err) => toast.error(err.message),
  });

  const reviewGoal = profile?.reviewGoal ?? 0;
  // Count responded requests this calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const respondedThisMonth = stats?.recent
    ? (stats as any).respondedThisMonth ?? 0
    : 0;

  const handleShare = async () => {
    const shareText = "I use ReviewLink to collect Google reviews — it's free: https://reviewlink.app";
    if (navigator.share) {
      try {
        await navigator.share({ title: "ReviewLink", text: shareText, url: "https://reviewlink.app" });
      } catch {
        // user cancelled — no action needed
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Copied to clipboard! Share it with a friend.");
    }
  };

  // SEO: dynamic page title with keywords
  useEffect(() => {
    document.title = "ReviewLink — Send Google Review Requests Fast";
  }, []);

  const smtpConnected = smtpStatus?.connected ?? false;
  const profileComplete = !!profile?.businessName && !!profile?.reviewLink;
  // Show health alert only when SMTP is connected but the last check failed
  const smtpHealthFailed = smtpConnected && smtpStatus?.lastHealthStatus === "fail";

  // Setup complete banner — all 4 onboarding steps done
  const allDone =
    (onboardingStatus?.smtpConnected ?? false) &&
    (onboardingStatus?.hasPlatform ?? false) &&
    (onboardingStatus?.hasContacts ?? false) &&
    (onboardingStatus?.hasSentRequest ?? false);
  const [setupBannerDismissed, setSetupBannerDismissed] = useState(
    () => localStorage.getItem("rr_setup_banner_dismissed") === "1"
  );
  const dismissSetupBanner = () => {
    localStorage.setItem("rr_setup_banner_dismissed", "1");
    setSetupBannerDismissed(true);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--background)" }}>
      <OnboardingGuide
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        stepsDone={{
          smtp: onboardingStatus?.smtpConnected ?? false,
          platform: onboardingStatus?.hasPlatform ?? false,
          contacts: onboardingStatus?.hasContacts ?? false,
          sent: onboardingStatus?.hasSentRequest ?? false,
        }}
      />
      {/* Navy Header Panel */}
      <div
        className="relative px-5 pt-8 pb-6 overflow-hidden"
        style={{ background: "var(--navy)" }}
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
              <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
                {user?.name ?? user?.email ?? ""}
              </p>
          </div>
        </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "oklch(0.32 0.08 260)", color: "oklch(0.80 0.18 80)" }}
              title="Share ReviewLink with a friend"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
              style={{ background: "oklch(0.32 0.08 260)", color: "oklch(0.80 0.18 80)" }}
              title="Open setup guide"
            >
              <BookOpen size={13} />
              <span className="hidden sm:inline">Guide</span>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { label: "This Month", value: stats?.thisMonth ?? 0, icon: <Send size={14} /> },
            { label: "All Time", value: stats?.total ?? 0, icon: <TrendingUp size={14} /> },
            {
              label: profile?.tier === "pro" ? "Monthly Pro" : profile?.tier === "annual" ? "Annual Pro" : profile?.tier === "lifetime" ? "Lifetime" : "Free Plan",
              value: profile?.tier === "free" || !profile?.tier ? `${Math.max(0, 10 - (profile?.totalSent ?? 0))}/10` : "✓",
              icon: <Star size={14} />
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
              <div className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Compliance badge */}
        <button
          onClick={() => navigate("/compliance")}
          className="flex items-center gap-1.5 mt-3 relative z-10"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          title="View Compliance Guide"
        >
          <ShieldCheck size={12} style={{ color: "oklch(0.65 0.18 145)" }} />
          <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.18 145)" }}>Compliance: Active</span>
          <span className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>— view guide</span>
        </button>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── SMTP Health Failure Alert ─────────────────────────────────── */}
        {smtpHealthFailed && (
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "oklch(0.98 0.04 30)", border: "1.5px solid oklch(0.75 0.18 30)" }}
          >
            <div className="flex items-start gap-3">
              <WifiOff size={18} style={{ color: "oklch(0.55 0.22 30)", flexShrink: 0, marginTop: 1 }} />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-black" style={{ color: "oklch(0.35 0.12 30)", fontFamily: "'Poppins', sans-serif" }}>
                  Email connection issue detected
                </p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.08 30)" }}>
                  Your daily health check failed. Review requests may not be sending.
                  {smtpStatus?.lastHealthCheck ? ` Last checked ${formatRelativeTime(new Date(smtpStatus.lastHealthCheck))}.` : ""}
                </p>
                {smtpStatus?.lastHealthError && (
                  <p className="text-xs mt-1 font-mono" style={{ color: "oklch(0.45 0.10 30)", wordBreak: "break-word" }}>
                    Error: {smtpStatus.lastHealthError}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="w-full py-2 rounded-xl text-xs font-black"
              style={{ background: "oklch(0.55 0.22 30)", color: "white", fontFamily: "'Poppins', sans-serif" }}
            >
              Fix in Settings →
            </button>
          </div>
        )}
        {/* ── Setup complete banner ─────────────────────────────────────── */}
        {allDone && !setupBannerDismissed && (
          <div
            className="rounded-2xl p-4 shadow-sm flex items-start gap-3"
            style={{ background: 'oklch(0.96 0.06 145)', border: '1.5px solid oklch(0.80 0.14 145)' }}
          >
            <CheckCircle2 size={22} className="mt-0.5 shrink-0" style={{ color: 'oklch(0.50 0.18 145)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: 'oklch(0.28 0.10 145)', fontFamily: "'Poppins', sans-serif" }}>
                You're all set! 🚀
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.38 0.08 145)' }}>
                Email connected, review platform saved, contacts imported, first request sent. ReviewLink is fully operational.
              </p>
            </div>
            <button
              onClick={dismissSetupBanner}
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded-lg"
              style={{ color: 'oklch(0.50 0.10 145)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Setup nudges ─────────────────────────────────────────────────── */}
        {(!smtpConnected || !profileComplete) && (
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
                {smtpConnected ? (
                  <CheckCircle2 size={16} style={{ color: "oklch(0.55 0.18 145)" }} />
                ) : (
                  <AlertCircle size={16} style={{ color: "oklch(0.65 0.18 80)" }} />
                )}
                <span className="text-sm" style={{ color: smtpConnected ? "oklch(0.45 0.10 145)" : "oklch(0.40 0.04 260)" }}>
                  Email {smtpConnected ? `connected (${smtpStatus?.email})` : "— connect your email account"}
                </span>
              </div>
            </div>
            {(!smtpConnected || !profileComplete) && (
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
          disabled={!smtpConnected || !profileComplete}
          className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-xl transition-transform active:scale-95"
          style={{
            background:
              !smtpConnected || !profileComplete
                ? "oklch(0.80 0.03 260)"
                : "oklch(0.80 0.18 80)",
            color:
              !smtpConnected || !profileComplete
                ? "oklch(0.55 0.03 260)"
                : "oklch(0.22 0.09 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          <Rocket size={24} />
          Send a Review Request
        </button>

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

        {/* ── Monthly Review Goal Tracker ──────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: "oklch(0.22 0.09 260)" }} />
              <h3
                className="text-sm font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Monthly Goal
              </h3>
            </div>
            {!editingGoal ? (
              <button
                onClick={() => { setGoalInput(String(reviewGoal || "")); setEditingGoal(true); }}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ color: "oklch(0.50 0.10 260)", background: "oklch(0.96 0.01 260)" }}
              >
                <Pencil size={11} />
                {reviewGoal > 0 ? "Edit" : "Set goal"}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const val = parseInt(goalInput, 10);
                    if (!isNaN(val) && val >= 0) setGoalMutation.mutate({ goal: val });
                  }}
                  disabled={setGoalMutation.isPending}
                  className="p-1.5 rounded-lg"
                  style={{ background: "oklch(0.55 0.18 145)", color: "white" }}
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="p-1.5 rounded-lg"
                  style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.50 0.03 260)" }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {editingGoal ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={10000}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="e.g. 10"
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: "2px solid oklch(0.80 0.10 260)", fontSize: "16px" }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt(goalInput, 10);
                    if (!isNaN(val) && val >= 0) setGoalMutation.mutate({ goal: val });
                  }
                  if (e.key === "Escape") setEditingGoal(false);
                }}
              />
              <span className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>reviews / month</span>
            </div>
          ) : reviewGoal > 0 ? (
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span
                    className="text-3xl font-black"
                    style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                  >
                    {stats?.respondedThisMonth ?? 0}
                  </span>
                  <span className="text-sm ml-1" style={{ color: "oklch(0.55 0.03 260)" }}>
                    / {reviewGoal} goal
                  </span>
                </div>
                {(stats?.respondedThisMonth ?? 0) >= reviewGoal ? (
                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-full"
                    style={{ background: "oklch(0.92 0.08 145)", color: "oklch(0.35 0.15 145)" }}
                  >
                    Goal reached! 🎉
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>
                    {reviewGoal - (stats?.respondedThisMonth ?? 0)} to go
                  </span>
                )}
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "oklch(0.94 0.01 260)" }}>
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(((stats?.respondedThisMonth ?? 0) / reviewGoal) * 100))}%`,
                    background: (stats?.respondedThisMonth ?? 0) >= reviewGoal
                      ? "oklch(0.55 0.18 145)"
                      : "oklch(0.80 0.18 80)",
                  }}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: "oklch(0.65 0.03 260)" }}>
                {Math.min(100, Math.round(((stats?.respondedThisMonth ?? 0) / reviewGoal) * 100))}% of monthly goal
              </p>
            </div>
          ) : (
            <p className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>
              Set a monthly review goal to track your progress and stay motivated.
            </p>
          )}
        </div>

        {/* ── Email Tracking Summary Card ────────────────────────────── */}
        <TrackingSummaryCard />

        {/* ── Referral Nudge ───────────────────────────────────────────── */}
        <ShareReferralCard />

        {/* Platform Breakdown */}
        {stats?.platformBreakdown && stats.platformBreakdown.filter((p) => p.platform !== "unknown").length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3
              className="text-sm font-black mb-3"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Requests by Platform
            </h3>
            <div className="flex flex-col gap-2">
              {stats.platformBreakdown
                .filter((p) => p.platform !== "unknown")
                .map((p) => {
                  const total = stats.total || 1;
                  const pct = Math.round((p.count / total) * 100);
                  const platformLabel = p.label ?? p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
                  const colors: Record<string, string> = {
                    google: "oklch(0.55 0.20 145)",
                    yelp: "oklch(0.55 0.22 30)",
                    tripadvisor: "oklch(0.50 0.18 155)",
                    bing: "oklch(0.50 0.18 260)",
                    facebook: "oklch(0.45 0.18 250)",
                    other: "oklch(0.55 0.10 280)",
                  };
                  const barColor = colors[p.platform] ?? colors.other;
                  return (
                    <div key={p.platformId ?? p.platform}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.05 260)" }}>
                          {platformLabel}
                        </span>
                        <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)" }}>
                          {p.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "oklch(0.94 0.01 260)" }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
