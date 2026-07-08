// Phame — Send Request Page
// Sends a review request email via the user's connected email account (SMTP)

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Star, Mail, User, AlertCircle, Settings2, Loader2, FileText, ChevronDown, Globe, Zap, BookUser, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import ContactPickerModal from "@/components/ContactPickerModal";
import { FREE_LIMIT } from "@shared/const";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import LanguageFlyout from "@/components/LanguageFlyout";

const SUCCESS_IMG =
  "https://assets.getphame.app/rr-send-success.webp";

export default function SendRequestPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { keyPressHaptic, buttonPressHaptic } = useHaptics();
  const { track } = useAnalytics();

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: smtpStatus } = trpc.smtp.status.useQuery();
  const { data: stats } = trpc.requests.stats.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();
  const { data: defaultTemplate } = trpc.templates.getDefault.useQuery();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const { isNative } = useContacts();
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<number | null>(null);
  const { data: reminderSettings } = trpc.reminders.getSettings.useQuery();
  const scheduleFollowUpNow = trpc.reminders.scheduleFollowUp.useMutation({
    onSuccess: () => {
      setReminderScheduled(true);
      toast.success(t("successScreen.scheduleFollowUp") + " " + t("toasts.scheduled", { defaultValue: "scheduled!" }));
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: platforms } = trpc.reviewPlatforms.list.useQuery();

  const PLATFORM_LABELS: Record<string, string> = {
    google: "Google",
    yelp: "Yelp",
    tripadvisor: "TripAdvisor",
    bing: "Bing",
    facebook: "Facebook",
    apple: "Apple Maps",
    other: "Other",
  };

  // Resolve the active review URL for preview
  const activePlatform = platforms?.find((p) => p.id === selectedPlatformId)
    ?? platforms?.find((p) => p.isDefault === 1)
    ?? platforms?.[0];
  const activeReviewUrl = activePlatform?.url ?? profile?.reviewLink ?? "";

  const sendRequest = trpc.requests.send.useMutation({
    onSuccess: (data) => {
      setSending(false);
      setSent(true);
      setLastRequestId(data.requestId ?? null);
      track("send_request", { platform: activePlatform?.platform ?? "unknown" });
      toast.success(t("toasts.reviewRequestSent", { defaultValue: "Review request sent!" }));
    },
    onError: (err) => {
      setSending(false);
      // Free-tier limit hit — redirect to upgrade page
      if (err.message.includes('10004')) {
        navigate('/upgrade');
        return;
      }
      toast.error(err.message);
    },
  });

  const emailConnected = smtpStatus?.connected ?? false;
  const profileComplete = !!profile?.businessName && !!profile?.reviewLink;

  // Resolve active template: explicit selection > default > null (uses server fallback)
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId !== null) {
      return templates?.find((tmpl) => tmpl.id === selectedTemplateId) ?? null;
    }
    return defaultTemplate ?? null;
  }, [selectedTemplateId, templates, defaultTemplate]);

  // Build live preview subject/body with placeholders replaced
  const previewSubject = useMemo(() => {
    if (!activeTemplate) return profile?.businessName ? `${profile.businessName} would love your feedback!` : "";
    return activeTemplate.subject
      .replace(/\{\{customer_name\}\}/g, customerName || "Customer")
      .replace(/\{\{customerName\}\}/g, customerName || "Customer")
      .replace(/\{\{business_name\}\}/g, profile?.businessName ?? "")
      .replace(/\{\{businessName\}\}/g, profile?.businessName ?? "")
      .replace(/\{\{review_link\}\}/g, activeReviewUrl)
      .replace(/\{\{reviewLink\}\}/g, activeReviewUrl);
  }, [activeTemplate, customerName, profile, activeReviewUrl]);

  const previewBody = useMemo(() => {
    if (!activeTemplate) {
      const name = customerName || "Customer";
      const biz = profile?.businessName ?? "";
      return `Hi ${name}! Thank you for choosing ${biz}. We hope you had a great experience! Could you take 30 seconds to leave us a quick review?`;
    }
    return activeTemplate.body
      .replace(/\{\{customer_name\}\}/g, customerName || "Customer")
      .replace(/\{\{customerName\}\}/g, customerName || "Customer")
      .replace(/\{\{business_name\}\}/g, profile?.businessName ?? "")
      .replace(/\{\{businessName\}\}/g, profile?.businessName ?? "")
      .replace(/\{\{review_link\}\}/g, activeReviewUrl)
      .replace(/\{\{reviewLink\}\}/g, activeReviewUrl);
  }, [activeTemplate, customerName, profile, activeReviewUrl]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.name = t("validationErrors.customerNameRequired");
    if (!customerEmail.trim()) errs.email = t("validationErrors.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errs.email = t("validationErrors.emailInvalid");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSend() {
    if (!validate()) return;
    // If no platform URL is available, show a multi-action toast instead of silently sending
    if (!activeReviewUrl) {
      toast.custom(
        (toastId) => (
          <div
            className="flex flex-col gap-2 px-4 py-3 rounded-xl shadow-lg bg-white" style={{ border: "1px solid oklch(0.90 0.02 260)", minWidth: "280px", maxWidth: "320px" }}
          >
            <p className="text-sm font-semibold rr-text-navy">
              {t("mainForm.noReviewPlatformsConfigured")}
            </p>
            <p className="text-xs rr-text-navy-muted">
              {t("mainForm.addOneInSettings")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigate("/settings"); toast.dismiss(toastId); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-black rr-bg-navy text-white"
              >
                {t("homePage.goToSettings")}
              </button>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
              >
                {t("homePage.dismiss")}
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
      return;
    }
    setSending(true);
    sendRequest.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      method: "email",
      templateId: selectedTemplateId ?? undefined,
      platformId: selectedPlatformId ?? undefined,
    });
  }

  function handleSendAnother() {
    setCustomerName("");
    setCustomerEmail("");
    setErrors({});
    setSent(false);
    setReminderScheduled(false);
    setLastRequestId(null);
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  // Milestone: total AFTER this send = stats.total + 1 (stats is pre-send)
  const totalAfterSend = (stats?.total ?? 0) + 1;
  const isMilestone = totalAfterSend === 10 || totalAfterSend === 25;
  const milestoneNum = totalAfterSend;

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-40 rr-bg-navy"
      >
        <div className="w-40 h-40 mb-6">
          <img src={SUCCESS_IMG} alt={t("successScreen.requestSent")} className="w-full h-full object-contain" loading="lazy" decoding="async" />
        </div>
        <h2
          className="text-3xl font-black text-center mb-2 text-white"
        >
          {t("successScreen.requestSent")}
        </h2>
        <p className="text-center mb-2" style={{ color: "var(--text-on-dark-secondary)" }}>
          {t("successScreen.requestSentTo", { customerName })}
        </p>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
          {t("successScreen.emailComesFrom", { email: smtpStatus?.email })}
        </p>
        <div className="flex gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={28} fill="oklch(0.80 0.18 80)" className="rr-text-gold" />
          ))}
        </div>

        {/* ── Milestone rating nudge ───────────────────────────────────── */}
        {isMilestone && (
          <div
            className="w-full max-w-xs rounded-2xl p-4 mb-6 rr-bg-navy-mid" style={{ border: "1.5px solid oklch(0.80 0.18 80)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 rr-bg-gold"
              >
                <Star size={15} className="rr-text-navy" />
              </div>
              <p className="text-sm font-black rr-text-gold">
                {t("successScreen.requestsSentMilestone", { milestoneNum })}
              </p>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-on-dark-secondary)" }}>
              {t("successScreen.milestoneDescription")}
            </p>
            <a
              href="https://getphame.app/review"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy"
            >
              <Star size={13} />
              {t("successScreen.ratePhame")}
            </a>
          </div>
        )}

        {/* ── Post-send reminder prompt ─────────────────────────────────── */}
        {/* Show only if auto-reminders are OFF and we have a request ID */}
        {lastRequestId && !reminderSettings?.followUpEnabled && (
          <div
            className="w-full max-w-xs rounded-2xl p-4 mb-4 rr-bg-navy-mid" style={{ border: "1.5px solid oklch(0.45 0.08 260)" }}
          >
            {reminderScheduled ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="rr-text-gold" />
                <p className="text-sm font-bold rr-text-gold">
                  {t("successScreen.scheduleFollowUp")}!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={16} className="rr-text-gold" />
                  <p className="text-sm font-bold text-white">
                    {t("successScreen.scheduleFollowUp")}?
                  </p>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--text-on-dark-secondary)" }}>
                  {t("successScreen.followUpDescription", {
                    defaultValue: `Auto-send a gentle reminder to ${customerName} in ${reminderSettings?.followUpDelayDays ?? 3} days if they haven't reviewed yet.`,
                    customerName,
                    days: reminderSettings?.followUpDelayDays ?? 3,
                  })}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      scheduleFollowUpNow.mutate({
                        customerRequestId: lastRequestId!,
                        customerName,
                        customerEmail,
                      })
                    }
                    disabled={scheduleFollowUpNow.isPending}
                    className="flex-1 py-2 rounded-xl text-xs font-black transition-transform active:scale-95 flex items-center justify-center gap-1 rr-bg-gold rr-text-navy"
                  >
                    {scheduleFollowUpNow.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                    {t("successScreen.yesRemindMe", { defaultValue: "Yes, remind me" })}
                  </button>
                  <button
                    onClick={() => setLastRequestId(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-transform active:scale-95"
                    style={{ background: "oklch(0.35 0.06 260)", color: "var(--text-on-dark-secondary)", fontFamily: "'Poppins', sans-serif" }}
                  >
                    {t("successScreen.notNow")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleSendAnother}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-lg rr-bg-gold rr-text-navy"
        >
          {t("successScreen.sendAnotherReviewRequest")}
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy animate-scale-in">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Send size={16} className="rr-text-gold" />
            <span
              className="text-xs font-bold tracking-widest uppercase rr-text-gold"
            >
              {t("mainForm.pageTitle")}
            </span>
          </div>
          <LanguageFlyout />
        </div>
        <h1
          className="text-2xl text-white rr-fw-black"
        >
          {t("page.requestAReview", { defaultValue: "Request a Review" })}
        </h1>
        {profile && (
          <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("mainForm.from")} {smtpStatus?.email ?? t("smtp.noEmailConnected", { defaultValue: "No email connected" })}
          </p>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* ── Email not connected warning ────────────────────────────────────── */}
        {!emailConnected && (
          <div
            className="flex items-start gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "oklch(0.97 0.03 80)" }}
          >
            <AlertCircle size={20} style={{ color: "oklch(0.65 0.18 80)" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1 rr-text-gold-dim">
                {t("smtp.emailNotConnectedTitle", { defaultValue: "Email not connected" })}
              </p>
              <p className="text-xs mb-2" style={{ color: "oklch(0.50 0.08 80)" }}>
                {t("smtp.emailNotConnectedDesc", { defaultValue: "Connect your email account in Settings. Works with Gmail, Outlook, Yahoo, or any business email." })}
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 text-xs font-bold rr-text-gold-dim"
              >
                <Settings2 size={12} />
                {t("homePage.goToSettings")}
              </button>
            </div>
          </div>
        )}

        {/* ── Profile not set up warning ───────────────────────────────────── */}
        {!profileComplete && (
          <div
            className="flex items-start gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "oklch(0.97 0.03 80)" }}
          >
            <AlertCircle size={20} style={{ color: "oklch(0.65 0.18 80)" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1 rr-text-gold-dim">
                {t("homePage.profileIncomplete")}
              </p>
              <p className="text-xs mb-2" style={{ color: "oklch(0.50 0.08 80)" }}>
                {t("profile.addBusinessNameAndLink", { defaultValue: "Add your business name and Google review link in Settings first." })}
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 text-xs font-bold rr-text-gold-dim"
              >
                <Settings2 size={12} />
                {t("homePage.goToSettings")}
              </button>
            </div>
          </div>
        )}

        {/* ── Free-tier usage counter ─────────────────────────────────────── */}
        {profile && profile.tier === 'free' && (() => {
          const totalSent = (profile as any).totalSent ?? 0;
          const remaining = Math.max(0, FREE_LIMIT - totalSent);
          const atLimit = totalSent >= FREE_LIMIT;
          if (atLimit) {
            return (
              <div
                className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                style={{ background: 'oklch(0.97 0.02 260)', border: '1px solid oklch(0.88 0.04 260)' }}
              >
                <Zap size={20} style={{ color: 'oklch(0.55 0.18 260)' }} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1 rr-text-navy">
                    {t("page.freeLimitReached", { defaultValue: "Free limit reached" })}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'oklch(0.45 0.05 260)' }}>
                    {t("page.freeLimitReachedDesc", { defaultValue: `You've used all ${FREE_LIMIT} free review requests. Upgrade to Pro to keep sending.`, FREE_LIMIT })}
                  </p>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: 'oklch(0.55 0.18 260)' }}
                  >
                    <Zap size={12} />
                    {t("page.upgradeToPro", { defaultValue: "Upgrade to Pro →" })}
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl"
              style={{ background: 'oklch(0.97 0.02 260)', border: '1px solid oklch(0.88 0.04 260)' }}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: 'oklch(0.55 0.18 260)' }} />
                <span className="text-xs font-semibold" style={{ color: 'oklch(0.35 0.06 260)' }}>
                  {t("page.freePlanRemaining", { defaultValue: `Free plan: ${remaining} of ${FREE_LIMIT} sends remaining`, remaining, FREE_LIMIT })}
                </span>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="text-xs font-bold px-3 py-1 rounded-lg rr-bg-navy rr-text-gold"
              >
                {t("page.upgrade", { defaultValue: "Upgrade" })}
              </button>
            </div>
          );
        })()}

        {/* ── Customer form ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2
            className="text-base font-black mb-4 rr-text-navy"
          >
            {t("page.customerDetails", { defaultValue: "Customer Details" })}
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name */}
            {/* Import from Contacts button — only shown in native app */}
            {isNative && (
              <button
                type="button"
                onClick={() => setContactPickerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-98 rr-bg-navy rr-text-gold"
              >
                <BookUser size={16} />
                {t("page.importFromContacts", { defaultValue: "Import from Contacts" })}
              </button>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                <User size={12} className="inline mr-1" />
                {t("mainForm.customerNameLabel")} *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                onKeyDown={(e) => { if (e.key.length === 1 || ['Backspace','Delete'].includes(e.key)) keyPressHaptic(); }}
                placeholder={t("mainForm.customerNamePlaceholder")}
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{
                  border: errors.name ? "2px solid oklch(0.65 0.22 27)" : "2px solid oklch(0.90 0.02 260)",
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: "16px",
                }}
              />
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.22 27)" }}>{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                <Mail size={12} className="inline mr-1" />
                {t("mainForm.customerEmailLabel")} *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => { setCustomerEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                onKeyDown={(e) => { if (e.key.length === 1 || ['Backspace','Delete'].includes(e.key)) keyPressHaptic(); }}
                placeholder={t("mainForm.customerEmailPlaceholder")}
                className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                style={{
                  border: errors.email ? "2px solid oklch(0.65 0.22 27)" : "2px solid oklch(0.90 0.02 260)",
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: "16px",
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: "oklch(0.65 0.22 27)" }}>{errors.email}</p>
              )}
            </div>

            {/* Template selector */}
            <div>
              <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                <FileText size={12} className="inline mr-1" />
                {t("mainForm.emailTemplateLabel")}
              </label>
              <div className="relative">
                <select
                  value={selectedTemplateId ?? "default"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTemplateId(val === "default" ? null : Number(val));
                  }}
                  className="w-full px-3 py-3 pr-8 rounded-xl text-sm outline-none appearance-none bg-white rr-text-navy" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "15px" }}
                >
                  <option value="default">
                    {defaultTemplate
                      ? t("mainForm.defaultTemplateWithName", { templateName: defaultTemplate.name })
                      : t("mainForm.defaultTemplate")}
                  </option>
                  {templates?.filter((tmpl) => !tmpl.isDefault).map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rr-text-navy-mid" />
              </div>
              {templates && templates.length === 0 && (
                <p className="text-xs mt-1 rr-text-navy-muted">
                  {t("mainForm.noTemplatesYet")}{" "}
                  <button
                    onClick={() => navigate("/templates")}
                    className="underline font-semibold"
                    style={{ color: "oklch(0.40 0.10 260)" }}
                  >
                    {t("mainForm.createOne")}
                  </button>
                </p>
              )}
            </div>

            {/* Platform selector */}
            {platforms && platforms.length > 0 && (
              <div>
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                  <Globe size={12} className="inline mr-1" />
                  {t("mainForm.reviewPlatformLabel")}
                </label>
                <div className="relative">
                  <select
                    value={selectedPlatformId ?? "default"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPlatformId(val === "default" ? null : Number(val));
                    }}
                    className="w-full px-3 py-3 pr-8 rounded-xl text-sm outline-none appearance-none bg-white rr-text-navy" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "15px" }}
                  >
                    <option value="default">
                      {platforms.find((p) => p.isDefault === 1)
                        ? `${platforms.find((p) => p.isDefault === 1)!.label || PLATFORM_LABELS[platforms.find((p) => p.isDefault === 1)!.platform] || t("mainForm.defaultPlatform")} (${t("mainForm.defaultPlatform", { defaultValue: "default" })})`
                        : platforms[0]
                        ? `${platforms[0].label || PLATFORM_LABELS[platforms[0].platform] || t("mainForm.firstPlatform")}`
                        : t("mainForm.defaultPlatform")}
                    </option>
                    {platforms
                      .filter((p) => p.isDefault !== 1)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rr-text-navy-mid" />
                </div>
                {activePlatform && (
                  <p className="text-xs mt-1 truncate rr-text-navy-muted">
                    {t("mainForm.link", { url: activePlatform.url })}
                  </p>
                )}
              </div>
            )}

            {/* No platforms warning */}
            {platforms && platforms.length === 0 && !profile?.reviewLink && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: "oklch(0.97 0.03 80)" }}
              >
                <AlertCircle size={14} style={{ color: "oklch(0.65 0.18 80)" }} className="shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: "oklch(0.50 0.08 80)" }}>
                  {t("mainForm.noReviewPlatformsConfigured")}{" "}
                  <button
                    onClick={() => navigate("/settings")}
                    className="underline font-semibold rr-text-gold-dim"
                  >
                    {t("mainForm.addOneInSettings")}
                  </button>
                </p>
              </div>
            )}

            {/* Live Email Preview */}
            {profile?.businessName && (
              <div
                className="px-4 py-3 rounded-xl rr-bg-white-card"
              >
                <p className="text-xs font-bold mb-2 rr-text-navy-mid">
                  {t("mainForm.emailPreview")}
                </p>
                <p className="text-xs mb-1" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>{t("mainForm.from")}</strong> {smtpStatus?.email ?? "your@email.com"}
                </p>
                <p className="text-xs mb-1" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>{t("mainForm.subject")}</strong> {previewSubject}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>{t("mainForm.body")}</strong> {previewBody.slice(0, 120)}{previewBody.length > 120 ? "…" : ""}
                </p>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={() => { buttonPressHaptic(); handleSend(); }}
              disabled={sending || !emailConnected || !profileComplete}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
              style={{
                background:
                  sending || !emailConnected || !profileComplete
                    ? "oklch(0.80 0.03 260)"
                    : "oklch(0.80 0.18 80)",
                color:
                  sending || !emailConnected || !profileComplete
                    ? "oklch(0.55 0.03 260)"
                    : "oklch(0.22 0.09 260)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {sending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  {t("mainForm.sending")}
                </>
              ) : (
                <>
                  <Star size={20} />
                  {t("mainForm.sendReviewRequest")}
                </>
              )}
            </button>


          </div>
        </div>
      </div>
    </div>

    {/* Native contacts picker - only rendered in Capacitor app */}
    <ContactPickerModal
      open={contactPickerOpen}
      onClose={() => setContactPickerOpen(false)}
      onImport={(contacts) => {
        if (contacts.length === 1) {
          setCustomerName(contacts[0].name);
          setCustomerEmail(contacts[0].email);
          setErrors({});
          toast.success(`${t("page.imported", { defaultValue: "Imported" })} ${contacts[0].name}`);
        } else {
          // For multiple contacts, pre-fill the first and show a toast
          setCustomerName(contacts[0].name);
          setCustomerEmail(contacts[0].email);
          setErrors({});
          toast.success(t("page.importedMultiple", { defaultValue: `Imported ${contacts.length} contacts - sending to first contact. Use Bulk Send for multiple.`, count: contacts.length }));
        }
      }}
    />
    </>
  );
}
