// Phame — Home Dashboard
// Shows stats, SMTP connection status, and quick-send CTA

import { lazy, useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Star, Send, TrendingUp, Clock, AlertCircle, CheckCircle2, WifiOff, BookOpen, Share2, Target, Pencil, Check, X, ShieldCheck, AlertTriangle, CreditCard, Gift, Users } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import OnboardingGuide from "@/components/OnboardingGuide";
import LanguageFlyout from "@/components/LanguageFlyout";
import { FreeQuotaStatus } from "@/components/FreeQuotaStatus";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "react-i18next";
import { getEffectivePlan } from "@shared/plans";
import LandingBrandLink from "@/components/LandingBrandLink";
import HomeInstallBanner from "@/components/HomeInstallBanner";
import { getPwaPlatform, shareGetPhame } from "@/lib/pwaShare";
import DeferredDashboardSection from "@/components/dashboard/DeferredDashboardSection";
import SetupProgressCard from "@/components/dashboard/SetupProgressCard";

const TrackingSummaryCard = lazy(() => import("@/components/dashboard/TrackingSummaryCard"));
const PlatformBreakdownChart = lazy(() => import("@/components/dashboard/PlatformBreakdownChart"));

const LOGO_URL = "https://assets.getphame.app/getphame-logo.svg";
const HERO_IMG = "https://assets.getphame.app/getphame-logo.svg";

function ReferralRewardsCard() {
  const { t } = useTranslation("translation");
  const { data: referralStats, isLoading } = trpc.referral.getStats.useQuery();
  const { data: referralData } = trpc.referral.getCode.useQuery();
  const shareUrl = referralData?.shareUrl ?? "https://getphame.app";
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("referralRewards.copySuccessToast"));
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error(t("referralRewards.copyErrorToast"));
    }
  };

  const total = referralStats?.totalReferrals ?? 0;
  const converted = referralStats?.convertedReferrals ?? 0;
  const months = referralStats?.monthsEarned ?? 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Gold accent bar */}
      <div className="h-1 w-full rr-bg-gold" />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 rr-bg-navy">
              <Gift size={15} className="rr-text-gold" />
            </div>
            <div>
              <p className="text-sm font-black rr-text-navy leading-tight">{t("referralRewards.title")}</p>
              <p className="text-sm font-semibold rr-text-navy-mid">{t("referralRewards.subtitle")}</p>
            </div>
          </div>
          {months > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg rr-bg-gold">
              <Star size={11} className="rr-text-navy" fill="currentColor" />
              <span className="text-xs font-black rr-text-navy">{t("referralRewards.monthsShort", { count: months })}</span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="flex flex-col items-center rounded-xl py-2.5 px-2 rr-bg-white-card">
            <Users size={13} className="rr-text-navy mb-1" />
            <span className="text-lg font-black rr-text-navy">{isLoading ? "—" : total}</span>
            <span className="text-sm font-semibold rr-text-navy-mid text-center leading-tight">{t("referralRewards.joined")}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl py-2.5 px-2" style={{ background: "oklch(0.96 0.04 80)" }}>
            <CreditCard size={13} style={{ color: "oklch(0.55 0.18 80)", marginBottom: 4 }} />
            <span className="text-lg font-black rr-text-navy">{isLoading ? "—" : converted}</span>
            <span className="text-xs text-center leading-tight" style={{ color: "oklch(0.55 0.12 80)" }}>{t("referralRewards.converted")}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl py-2.5 px-2" style={{ background: "oklch(0.96 0.06 145)" }}>
            <Gift size={13} style={{ color: "oklch(0.45 0.18 145)", marginBottom: 4 }} />
            <span className="text-lg font-black rr-text-navy">{isLoading ? "—" : months}</span>
            <span className="text-xs text-center leading-tight" style={{ color: "oklch(0.45 0.12 145)" }}>{t("referralRewards.freeMonths")}</span>
          </div>
        </div>

        {/* Social share buttons */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* WhatsApp */}
          <button
            onClick={() => {
              const text = encodeURIComponent(t("referralRewards.shareMessage", { url: shareUrl }));
              window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
            }}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 transition-opacity active:opacity-70"
            style={{ background: "oklch(0.93 0.08 145)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="oklch(0.35 0.18 145)"/>
            </svg>
            <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.18 145)" }}>{t("referralRewards.whatsApp")}</span>
          </button>
          {/* iMessage / SMS */}
          <button
            onClick={() => {
              const text = encodeURIComponent(t("referralRewards.shareMessage", { url: shareUrl }));
              window.location.assign(`sms:?&body=${text}`);
            }}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 transition-opacity active:opacity-70"
            style={{ background: "oklch(0.93 0.06 220)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" fill="oklch(0.35 0.15 220)"/>
              <circle cx="8" cy="10" r="1.5" fill="oklch(0.35 0.15 220)"/>
              <circle cx="12" cy="10" r="1.5" fill="oklch(0.35 0.15 220)"/>
              <circle cx="16" cy="10" r="1.5" fill="oklch(0.35 0.15 220)"/>
            </svg>
            <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.15 220)" }}>{t("referralRewards.message")}</span>
          </button>
          {/* Copy link */}
          <button
            onClick={handleCopyCode}
            className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-2 transition-opacity active:opacity-70"
            style={{ background: copied ? "oklch(0.93 0.08 145)" : "oklch(0.94 0.02 260)" }}
          >
            {copied
              ? <Check size={18} style={{ color: "oklch(0.35 0.18 145)" }} />
              : <Share2 size={18} className="rr-text-navy" />}
            <span className="text-xs font-bold" style={copied ? { color: "oklch(0.35 0.18 145)" } : { color: "var(--rr-navy)" }}>
              {copied ? t("referralRewards.copied") : t("referralRewards.copyLink")}
            </span>
          </button>
        </div>
        {/* Referral link URL display */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: "oklch(0.94 0.02 260)" }}
        >
          <span className="flex-1 text-sm font-semibold rr-text-navy-mid truncate">{shareUrl}</span>
        </div>

        {/* Progress hint */}
        {total === 0 && (
          <p className="text-sm font-semibold rr-text-navy-mid text-center mt-2.5">
            {t("referralRewards.noReferralsHint")}
          </p>
        )}
        {total > 0 && converted < total && (
          <p className="text-sm font-semibold rr-text-navy-mid text-center mt-2.5">
            {t(
              total - converted === 1
                ? "referralRewards.pendingReferralsHint"
                : "referralRewards.pendingReferralsHint_plural",
              { count: total - converted },
            )}
          </p>
        )}
        {converted > 0 && months === 0 && (
          <p className="text-xs text-center mt-2.5" style={{ color: "oklch(0.55 0.18 80)" }}>
            {t("referralRewards.rewardProcessingHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function ShareReferralCard() {
  const { t } = useTranslation("translation");
  const [copied, setCopied] = useState(false);
  const { track } = useAnalytics();
  const { data: referralData } = trpc.referral.getCode.useQuery();
  const { data: referralStats } = trpc.referral.getStats.useQuery();
  const shareUrl = referralData?.shareUrl ?? "https://getphame.app";

  const handleShare = async () => {
    track("share_referral");
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("shareReferralCard.title"),
          text: t("shareReferralCard.shareText"),
          url: shareUrl,
        });
      } catch {
        // user dismissed the share sheet — no action needed
      }
      return;
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${t("shareReferralCard.shareText")} ${shareUrl}`);
      setCopied(true);
      toast.success(t("shareReferralCard.copySuccessToast"));
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error(t("shareReferralCard.copyErrorToast"));
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden rr-bg-navy"
    >
      {/* Gold accent bar */}
      <div className="h-1 w-full rr-bg-gold" />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 rr-bg-gold"
          >
            <Share2 size={15} className="rr-text-navy" />
          </div>
          <div>
            <p className="text-xs font-black leading-tight text-white">
              {t("shareReferralCard.header")}
            </p>
            <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
              {t("shareReferralCard.subHeader")}
            </p>
          </div>
        </div>

        {/* Message preview */}
        <div
          className="rounded-xl px-3 py-2.5 mb-3 text-xs leading-relaxed"
          style={{ background: "oklch(0.30 0.08 260)", color: "var(--text-on-dark-secondary)" }}
        >
          <span className="rr-text-gold rr-fw-bold">"</span>
          {t("shareReferralCard.shareText")}{" "}
          <span className="rr-text-gold">{shareUrl}</span>
          <span className="rr-text-gold rr-fw-bold">"</span>
        </div>

        {/* CTA button */}
        <button
          onClick={handleShare}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? t("shareReferralCard.copiedToClipboard") : t("shareReferralCard.sharePhame")}
        </button>

        {/* Referral stats */}
        {referralStats && (referralStats.totalReferrals > 0 || referralStats.monthsEarned > 0) && (
          <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
            <span>
              <span className="rr-text-gold font-black">{referralStats.totalReferrals}</span>{" "}
              {referralStats.totalReferrals === 1 ? "friend joined" : "friends joined"}
            </span>
            <span>
              <span className="rr-text-gold font-black">{referralStats.monthsEarned}</span>{" "}
              {referralStats.monthsEarned === 1 ? "free month earned" : "free months earned"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return t("relativeTime.justNow");
  if (diffMins < 60) return t("relativeTime.minutesAgo", { diffMins });
  if (diffHours < 24) return t("relativeTime.hoursAgo", { diffHours });
  if (diffDays < 7) return t("relativeTime.daysAgo", { diffDays });
  return format(date, "MMM d");
}

export default function HomePage() {
  const { t } = useTranslation("translation");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: smtpStatus } = trpc.smtp.status.useQuery();
  const { data: stats } = trpc.requests.stats.useQuery();
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery();
  const { data: referralData } = trpc.referral.getCode.useQuery();
  const utils = trpc.useUtils();
  const pwaAnalytics = trpc.analytics.trackPwaEvent.useMutation();

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
    const outcome = await shareGetPhame();
    const platform = getPwaPlatform();

    if (outcome === "shared") {
      pwaAnalytics.mutate({ event: "share_completed", platform });
      setShareStatus(t("pwaInstallBanner.shareSuccess", { defaultValue: "Get Phame shared successfully." }));
      return;
    }
    if (outcome === "copied") {
      pwaAnalytics.mutate({ event: "share_copied", platform });
      const message = t("pwaInstallBanner.shareCopied", { defaultValue: "Get Phame link copied." });
      setShareStatus(message);
      toast.success(message);
      return;
    }
    if (outcome === "cancelled") {
      pwaAnalytics.mutate({ event: "share_cancelled", platform });
      setShareStatus(t("pwaInstallBanner.shareCancelled", { defaultValue: "Sharing cancelled." }));
      return;
    }

    const message = t("pwaInstallBanner.shareError", { defaultValue: "Unable to share Get Phame right now." });
    setShareStatus(message);
    toast.error(message);
  };

  // SEO: dynamic page title with keywords
  useEffect(() => {
    document.title = t("homePage.pageTitle");
  }, [t]);

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

  // Subscription expiry warning banner — show when planExpiresAt < 7 days away
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isExpiringSoon =
    profile?.planExpiresAt != null &&
    profile.planExpiresAt > Date.now() &&
    profile.planExpiresAt - Date.now() < SEVEN_DAYS_MS;
  const expiryDismissKey = `rr_expiry_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(
    () => localStorage.getItem(expiryDismissKey) === "1"
  );
  const dismissExpiryBanner = () => {
    localStorage.setItem(expiryDismissKey, "1");
    setExpiryBannerDismissed(true);
  };
  const daysUntilExpiry = profile?.planExpiresAt
    ? Math.ceil((profile.planExpiresAt - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  // Plan label must use effective entitlements so administrators display Life, not Free.
  const effectivePlan = getEffectivePlan(profile?.tier, user?.role);
  const tierLabel =
    effectivePlan === "monthly" ? t("homePage.monthlyPro", { defaultValue: "Monthly Pro" }) :
    effectivePlan === "annual" ? t("homePage.annualPro", { defaultValue: "Annual Pro" }) :
    effectivePlan === "life" ? t("homePage.lifePlan", { defaultValue: "Life Plan" }) :
    t("homePage.freePlan", { defaultValue: "Free Plan" });

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--background)" }}>
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
        className="relative px-5 pt-8 pb-6 overflow-hidden animate-scale-in"
        style={{ background: "var(--navy)" }}
      >
        {/* Header top row */}
        <div className="relative z-10 mb-6">
          {/* Mobile: brand occupies row 1 and actions occupy row 2. Desktop: one row. */}
          <div
            className="flex flex-col items-stretch gap-3 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
            data-testid="home-header-layout"
          >
            <div className="home-brand-full">
              <LandingBrandLink
                className="justify-start"
                iconClassName="w-7 h-7"
                textClassName="text-xl"
                tone="split"
              />
            </div>
            <div className="home-brand-mark shrink-0">
              <LandingBrandLink showText={false} iconClassName="w-7 h-7" tone="split" />
            </div>
            <div
              className="flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap"
              data-testid="home-header-actions"
            >
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors rr-text-gold" style={{ background: "oklch(0.32 0.08 260)" }}
                title={t("nav.shareHint", { defaultValue: "Share Get Phame with a friend" })}
              >
                <Share2 size={13} />
                <span>{t("nav.share", { defaultValue: "Share" })}</span>
              </button>
              <button
                onClick={() => setGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors rr-text-gold" style={{ background: "oklch(0.32 0.08 260)" }}
                title={t("nav.guideHint", { defaultValue: "Open setup guide" })}
              >
                <BookOpen size={13} />
                <span>{t("nav.guide", { defaultValue: "Guide" })}</span>
              </button>
              <LanguageFlyout />
              <span className="sr-only" role="status" aria-live="polite">{shareStatus}</span>
            </div>
          </div>
          {/* Greeting */}
          <h1 className="text-2xl leading-tight rr-fw-black" style={{ paddingTop: '10px', color: '#f9ae00' }}>
            {(() => {
              const firstName = user?.name ? user.name.split(" ")[0] : null;
              return firstName
                ? t("homePage.greeting", { defaultValue: `Hey, ${firstName}!`, name: firstName })
                : t("homePage.welcomeBack");
            })()}
          </h1>
          {/* Company name (businessName from profile), fallback to email */}
          <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
            {profile?.businessName ?? user?.email ?? ""}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { label: t("homePage.thisMonth", { defaultValue: "This Month" }), value: stats?.thisMonth ?? 0, icon: <Send size={14} /> },
            { label: t("homePage.allTime", { defaultValue: "All Time" }), value: stats?.total ?? 0, icon: <TrendingUp size={14} /> },
            {
              label: tierLabel,
              value: effectivePlan === "free"
                ? `${profile?.freeQuota?.remaining ?? 10}/${profile?.freeQuota?.limit ?? 10}`
                : "✓",
              icon: <img src={LOGO_URL} alt="GetPhame" style={{ width: 16, height: 16, objectFit: 'contain' }} />
            },
          ].map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-3 text-center rr-bg-navy-mid animate-fade-up"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className="flex items-center justify-center gap-1 mb-1 rr-text-gold"
              >
                {s.icon}
              </div>
              <div
                className="text-2xl font-black text-white"
              >
                {s.value}
              </div>
              <div className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {effectivePlan === "free" && (
          <FreeQuotaStatus quota={profile?.freeQuota} t={t} />
        )}

        {/* Compliance badge */}
        <button
          onClick={() => navigate("/compliance")}
          className="flex items-center gap-1.5 mt-3 relative z-10"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          title={t("nav.complianceHint", { defaultValue: "View Compliance Guide" })}
        >
          <ShieldCheck size={12} style={{ color: "oklch(0.65 0.18 145)" }} />
          <span className="text-xs font-bold" style={{ color: "oklch(0.65 0.18 145)" }}>{t("nav.complianceActive", { defaultValue: "Compliance: Active" })}</span>
          <span className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>{t("nav.complianceViewGuide", { defaultValue: "— view guide" })}</span>
        </button>
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
      <div className="mb-4">
        <HomeInstallBanner />
      </div>
      {/* Responsive grid: single column on mobile, 2-col on lg (main + sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* ── Left column (main content) — spans 2 cols on desktop ── */}
      <div className="lg:col-span-2 flex flex-col gap-4">
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
                  {t("homePage.smtpHealthAlertTitle")}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.08 30)" }}>
                  {t("homePage.smtpHealthAlertText")}
                  {smtpStatus?.lastHealthCheck ? ` ${t("homePage.lastChecked", { defaultValue: "Last checked" })} ${formatRelativeTime(new Date(smtpStatus.lastHealthCheck), t)}.` : ""}
                </p>
                {smtpStatus?.lastHealthError && (
                  <p className="text-xs mt-1 font-mono" style={{ color: "oklch(0.45 0.10 30)", wordBreak: "break-word" }}>
                    {t("homePage.errorPrefix", { defaultValue: "Error:" })} {smtpStatus.lastHealthError}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="w-full py-2 rounded-xl text-xs font-black text-white" style={{ background: "oklch(0.55 0.22 30)" }}
            >
              {t("homePage.fixInSettings", { defaultValue: "Fix in Settings →" })}
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
                {t("homePage.setupBannerTitle")}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.38 0.08 145)' }}>
                {t("homePage.setupBannerText")}
              </p>
            </div>
            <button
              onClick={dismissSetupBanner}
              aria-label={t("homePage.dismiss")}
              className="shrink-0 p-1 rounded-lg"
              style={{ color: 'oklch(0.50 0.10 145)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Subscription expiry warning banner ─────────────────────────── */}
        {isExpiringSoon && !expiryBannerDismissed && (
          <div
            className="rounded-2xl p-4 shadow-sm flex items-start gap-3 rr-bg-gold-pale" style={{ border: "1.5px solid oklch(0.82 0.14 80)" }}
          >
            <AlertTriangle size={22} className="mt-0.5 shrink-0" style={{ color: 'oklch(0.60 0.18 60)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: 'oklch(0.30 0.10 60)', fontFamily: "'Poppins', sans-serif" }}>
                {t("homePage.expiringSoonTitle")}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.40 0.08 60)' }}>
                {t("homePage.expiringSoonText", { daysUntilExpiry })}
              </p>
              <button
                onClick={() => navigate('/settings')}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity active:opacity-70 text-white" style={{ background: "oklch(0.60 0.18 60)" }}
              >
                <CreditCard size={12} />
                {t("homePage.manageBilling", { defaultValue: "Manage Billing" })}
              </button>
            </div>
            <button
              onClick={dismissExpiryBanner}
              aria-label={t("homePage.dismiss")}
              className="shrink-0 p-1 rounded-lg"
              style={{ color: 'oklch(0.55 0.10 60)' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Setup progress ────────────────────────────────────────────────── */}
        {!allDone && <SetupProgressCard status={onboardingStatus} userId={user?.id} onNavigate={navigate} />}

        {/* ── Quick Send CTA ───────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/send")}
          disabled={!smtpConnected || !profileComplete}
          className="w-full h-16 rounded-2xl flex items-center justify-center font-black text-xl transition-transform active:scale-95 overflow-hidden"
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
          <span className="inline-flex items-center gap-2">
            <Send size={22} strokeWidth={2.5} style={{ color: 'oklch(0.22 0.09 260)' }} className="flex-shrink-0" />
            {t("homePage.sendRequest")}
          </span>
        </button>


        {/* ── SEO keyword section — visible to crawlers, useful to users ─── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2
            className="text-sm font-black mb-2 rr-text-navy"
          >
            {t("homePage.seoTitle", { defaultValue: "Get More Business Reviews" })}
          </h2>
          <p className="text-xs leading-relaxed rr-text-navy-muted">
            {t("homePage.seoDescription", { defaultValue: "Get Phame makes it easy to send personalized review requests to your customers via email — for Google, Yelp, TripAdvisor, Bing, Facebook, and more. Build your online reputation across every platform, increase star ratings, and attract new customers — all from one simple dashboard." })}
          </p>
        </div>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        {stats?.recent && stats.recent.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-black rr-text-navy"
              >
                {t("homePage.recentRequestsTitle")}
              </h3>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs font-bold"
                style={{ color: "oklch(0.50 0.10 260)" }}
              >
                {t("homePage.viewAllRequests")}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {stats.recent.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "oklch(0.94 0.01 260)" }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black rr-bg-navy rr-text-gold"
                    >
                      {req.customerName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold rr-text-navy">
                        {req.customerName}
                      </p>
                      <p className="text-sm font-semibold rr-text-navy-mid">
                        {req.customerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-bold rr-bg-green-pale" style={{ color: "oklch(0.45 0.12 145)" }}
                    >
                      {req.sentAt
                        ? t("homePage.sent")
                        : t("quietHours.queuedForDelivery", "Queued for delivery")}
                    </div>
                    <p className="text-xs mt-0.5 rr-text-navy-faint">
                      {req.sentAt
                        ? formatRelativeTime(new Date(req.sentAt), t)
                        : t("quietHours.queuedForDelivery", "Queued for delivery")}
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
              <Target size={16} className="rr-text-navy" />
              <h3
                className="text-sm font-black rr-text-navy"
              >
                {t("homePage.monthlyGoal")}
              </h3>
            </div>
            {!editingGoal ? (
              <button
                onClick={() => { setGoalInput(String(reviewGoal || "")); setEditingGoal(true); }}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg rr-bg-surface" style={{ color: "oklch(0.50 0.10 260)" }}
              >
                <Pencil size={11} />
                {reviewGoal > 0 ? t("homePage.editGoal") : t("homePage.setYourGoal")}
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const val = parseInt(goalInput, 10);
                    if (!isNaN(val) && val >= 0) setGoalMutation.mutate({ goal: val });
                  }}
                  disabled={setGoalMutation.isPending}
                  className="p-1.5 rounded-lg rr-bg-green text-white"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="p-1.5 rounded-lg rr-bg-surface" style={{ color: "oklch(0.50 0.03 260)" }}
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
              <span className="text-sm font-semibold rr-text-navy-mid">{t("homePage.reviewsPerMonth", { defaultValue: "reviews / month" })}</span>
            </div>
          ) : reviewGoal > 0 ? (
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span
                    className="text-3xl font-black rr-text-navy"
                  >
                    {stats?.respondedThisMonth ?? 0}
                  </span>
                  <span className="text-sm ml-1 rr-text-navy-muted">
                    / {reviewGoal} {t("homePage.goal", { defaultValue: "goal" })}
                  </span>
                </div>
                {(stats?.respondedThisMonth ?? 0) >= reviewGoal ? (
                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-full"
                    style={{ background: "oklch(0.92 0.08 145)", color: "oklch(0.35 0.15 145)" }}
                  >
                    {t("homePage.goalReached", { defaultValue: "Goal reached! 🎉" })}
                  </span>
                ) : (
                  <span className="text-sm font-semibold rr-text-navy-mid">
                    {reviewGoal - (stats?.respondedThisMonth ?? 0)} {t("homePage.toGo", { defaultValue: "to go" })}
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
              <p className="text-xs mt-1.5 rr-text-navy-faint">
                {Math.min(100, Math.round(((stats?.respondedThisMonth ?? 0) / reviewGoal) * 100))}% {t("homePage.ofMonthlyGoal", { defaultValue: "of monthly goal" })}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold rr-text-navy-mid">
              {t("homePage.goalDescription")}
            </p>
          )}
        </div>

        {/* Platform Breakdown */}
        {stats?.platformBreakdown && stats.platformBreakdown.filter((p) => p.platform !== "unknown").length > 0 && (
          <DeferredDashboardSection loadingLabel={t("homePage.loadingAnalytics")} minHeightClassName="min-h-[184px]">
            <PlatformBreakdownChart platformBreakdown={stats.platformBreakdown} total={stats.total} />
          </DeferredDashboardSection>
        )}
      </div>{/* end left column */}

      {/* ── Right column (sidebar widgets) — stacks below on mobile ── */}
      <div className="flex flex-col gap-4">
        <DeferredDashboardSection loadingLabel={t("homePage.loadingAnalytics")}>
          <TrackingSummaryCard />
        </DeferredDashboardSection>
        <ReferralRewardsCard />
        <ShareReferralCard />
      </div>{/* end right column */}

      </div>{/* end grid */}
      </div>{/* end outer padding */}
    </div>
  );
}
