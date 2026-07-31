// Phame — Send Request Page
// Sends a review request email via the user's connected email account (SMTP)

import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Star, Mail, User, AlertCircle, Settings2, Loader2, FileText, ChevronDown, Globe, Zap, BookUser, Bell, CheckCircle2, ShieldCheck, AlertTriangle, RotateCcw, PencilLine, Sparkles, GitCompareArrows, Copy, ListFilter, Lightbulb } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import ContactPickerModal from "@/components/ContactPickerModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import LanguageFlyout from "@/components/LanguageFlyout";
import { completeSuccessfulRequest } from "@/lib/onboardingFlow";
import { openUpgradeModal } from "@/lib/upgradeModal";
import ProBadge from "@/components/ProBadge";
import { getChangedToneLineSegments, getToneTextDiff, type ToneDiffSegment } from "@/lib/toneDraftDiff";
import {
  buildSafePlatformLinks,
  containsDirectYelpLink,
  getFallbackReviewRequestDraft,
  getReviewPlatformValue,
  MAX_REVIEW_REQUEST_BODY_CHARS,
  MAX_REVIEW_REQUEST_SUBJECT_CHARS,
  renderReviewRequestDraft,
} from "@shared/reviewRequestDraft";

const SUCCESS_IMG =
  "https://assets.getphame.app/rr-send-success.webp";

function ToneDiffText({ segments, mode }: { segments: ToneDiffSegment[]; mode: "before" | "after" }) {
  const changedKind = mode === "before" ? "removed" : "added";
  const changedClass = mode === "before"
    ? "rounded bg-rose-100 px-0.5 text-rose-950 decoration-rose-500/70 line-through"
    : "rounded bg-emerald-100 px-0.5 text-emerald-950";

  return (
    <span className="whitespace-pre-wrap">
      {segments.map((segment, index) => (
        <span key={`${segment.kind}-${index}`} className={segment.kind === changedKind ? changedClass : undefined}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}

type TonePreviewRationale = {
  field: "subject" | "body";
  rationale: string;
};

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
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [selectedTone, setSelectedTone] = useState<"warmer" | "professional" | "concise">("warmer");
  const [loadedDraftSourceKey, setLoadedDraftSourceKey] = useState("");
  const [tonePreviewDraft, setTonePreviewDraft] = useState<{ subject: string; body: string } | null>(null);
  const [tonePreviewSourceDraft, setTonePreviewSourceDraft] = useState<{ subject: string; body: string } | null>(null);
  const [tonePreviewRationales, setTonePreviewRationales] = useState<TonePreviewRationale[]>([]);
  const [tonePreviewChangedOnly, setTonePreviewChangedOnly] = useState(false);
  const [tonePreviewOpen, setTonePreviewOpen] = useState(false);
  const [finalPreviewOpen, setFinalPreviewOpen] = useState(false);
  const [complianceChecked, setComplianceChecked] = useState({
    realCustomers: false,
    noIncentives: false,
    allCustomers: false,
  });
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const { isNative } = useContacts();
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [reminderScheduled, setReminderScheduled] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<number | null>(null);
  const trpcUtils = trpc.useUtils();
  const dismissOnboarding = trpc.onboarding.dismiss.useMutation({
    onSuccess: () => trpcUtils.onboarding.status.invalidate(),
  });
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

  // Resolve the active review destination for preview. Yelp intentionally uses
  // a plain-text search instruction instead of a direct solicitation link.
  const activePlatform = platforms?.find((p) => p.id === selectedPlatformId)
    ?? platforms?.find((p) => p.isDefault === 1)
    ?? platforms?.[0];
  const activeReviewValue = getReviewPlatformValue(
    activePlatform,
    profile?.businessName ?? "",
    profile?.reviewLink ?? "",
  );

  const sendRequest = trpc.requests.send.useMutation({
    onSuccess: (data) => {
      setFinalPreviewOpen(false);
      setComplianceChecked({ realCustomers: false, noIncentives: false, allCustomers: false });
      completeSuccessfulRequest({
        requestId: data.requestId,
        setSending,
        setSent,
        setLastRequestId,
        persistDismiss: () => dismissOnboarding.mutate(),
      });
      track("send_request", { platform: activePlatform?.platform ?? "unknown" });
      toast.success(t("toasts.reviewRequestSent", { defaultValue: "Review request sent!" }));
    },
    onError: (err) => {
      setSending(false);
      // Preserve the current form while explaining the matching paid benefit.
      if (err.message.includes('10004')) {
        openUpgradeModal("send_limit");
        return;
      }
      toast.error(err.message);
    },
  });

  const adjustTone = trpc.email.adjustTone.useMutation({
    onSuccess: (draft, sourceDraft) => {
      setTonePreviewSourceDraft({ subject: sourceDraft.subject, body: sourceDraft.body });
      setTonePreviewDraft(draft);
      setTonePreviewRationales(draft.rationales);
      setTonePreviewChangedOnly(false);
      setTonePreviewOpen(true);
    },
    onError: (err) => {
      setTonePreviewSourceDraft(null);
      setTonePreviewRationales([]);
      if (err.data?.code === "FORBIDDEN") {
        openUpgradeModal("plans");
        return;
      }
      toast.error(err.message);
    },
  });

  const emailConnected = smtpStatus?.connected ?? false;
  const profileComplete = !!profile?.businessName && !!profile?.reviewLink;
  const hasPaidAiAccess = profile?.hasPaidAccess ?? false;
  const tonePreviewComparison = useMemo(() => {
    if (!tonePreviewSourceDraft || !tonePreviewDraft) return null;
    return {
      subject: getToneTextDiff(tonePreviewSourceDraft.subject, tonePreviewDraft.subject),
      body: getToneTextDiff(tonePreviewSourceDraft.body, tonePreviewDraft.body),
    };
  }, [tonePreviewSourceDraft, tonePreviewDraft]);
  const renderedTonePreviewComparison = useMemo(() => {
    if (!tonePreviewComparison) return null;
    const project = (segments: ToneDiffSegment[], changedKind: "removed" | "added") => (
      tonePreviewChangedOnly ? getChangedToneLineSegments(segments, changedKind) : segments
    );
    return {
      subject: {
        before: project(tonePreviewComparison.subject.before, "removed"),
        after: project(tonePreviewComparison.subject.after, "added"),
      },
      body: {
        before: project(tonePreviewComparison.body.before, "removed"),
        after: project(tonePreviewComparison.body.after, "added"),
      },
    };
  }, [tonePreviewChangedOnly, tonePreviewComparison]);

  function handleToneAdjustment() {
    if (!profile?.businessName) {
      toast.error(t("profile.addBusinessNameAndLink", { defaultValue: "Add your business name and review link in Settings first." }));
      return;
    }
    if (!hasPaidAiAccess) {
      openUpgradeModal("plans");
      return;
    }
    adjustTone.mutate({
      subject: draftSubject,
      body: draftBody,
      tone: selectedTone,
      businessName: profile.businessName,
    });
  }

  function handleApplyTonePreview() {
    if (!tonePreviewDraft) return;
    setDraftSubject(tonePreviewDraft.subject);
    setDraftBody(tonePreviewDraft.body);
    setErrors((current) => ({ ...current, subject: undefined, body: undefined }));
    setTonePreviewOpen(false);
    setTonePreviewDraft(null);
    setTonePreviewSourceDraft(null);
    setTonePreviewRationales([]);
    setTonePreviewChangedOnly(false);
    toast.success(t("mainForm.toneApplied", { defaultValue: "Tone applied. Review the message before sending." }));
  }

  function handleTonePreviewOpenChange(open: boolean) {
    setTonePreviewOpen(open);
    if (!open) {
      setTonePreviewDraft(null);
      setTonePreviewSourceDraft(null);
      setTonePreviewRationales([]);
      setTonePreviewChangedOnly(false);
    }
  }

  async function handleCopyTonePreviewDraft() {
    if (!tonePreviewDraft) return;
    try {
      await navigator.clipboard.writeText(`${tonePreviewDraft.subject}\n\n${tonePreviewDraft.body}`);
      toast.success(t("mainForm.tonePreviewCopySuccess", { defaultValue: "Revised draft copied to your clipboard." }));
    } catch {
      toast.error(t("mainForm.tonePreviewCopyError", { defaultValue: "Could not copy the revised draft. Please select and copy it manually." }));
    }
  }

  // Resolve active template: explicit selection > default > null (uses server fallback)
  const activeTemplate = useMemo(() => {
    if (selectedTemplateId !== null) {
      return templates?.find((tmpl) => tmpl.id === selectedTemplateId) ?? null;
    }
    return defaultTemplate ?? null;
  }, [selectedTemplateId, templates, defaultTemplate]);

  const fallbackDraft = useMemo(() => getFallbackReviewRequestDraft(), []);
  const sourceDraft = activeTemplate ?? fallbackDraft;
  const draftSourceKey = activeTemplate
    ? `template:${activeTemplate.id}:${String(activeTemplate.updatedAt ?? "")}`
    : `fallback:${profile?.businessName ?? ""}`;

  // Load a selected template once. Recipient/platform edits update only the
  // rendered preview, so the user's send-time copy is never overwritten.
  useEffect(() => {
    if (loadedDraftSourceKey === draftSourceKey) return;
    setDraftSubject(sourceDraft.subject);
    setDraftBody(sourceDraft.body);
    setLoadedDraftSourceKey(draftSourceKey);
    setErrors((current) => ({ ...current, subject: undefined, body: undefined }));
  }, [draftSourceKey, loadedDraftSourceKey, sourceDraft.body, sourceDraft.subject]);

  const safePlatformLinks = useMemo(
    () => buildSafePlatformLinks(platforms ?? [], profile?.businessName ?? "", activeReviewValue),
    [activeReviewValue, platforms, profile?.businessName],
  );
  const draftContext = useMemo(() => ({
    customerName: customerName || t("mainForm.previewCustomer", { defaultValue: "Customer" }),
    businessName: profile?.businessName ?? "",
    reviewValue: activeReviewValue,
    platformLinks: safePlatformLinks,
  }), [activeReviewValue, customerName, profile?.businessName, safePlatformLinks, t]);

  // Build the exact plain-text copy that the server will escape and send.
  const previewSubject = useMemo(() => {
    return renderReviewRequestDraft(draftSubject, draftContext).replace(/\s*[\r\n]+\s*/g, " ");
  }, [draftContext, draftSubject]);

  const previewBody = useMemo(() => {
    return renderReviewRequestDraft(draftBody, draftContext);
  }, [draftBody, draftContext]);

  const allComplianceChecked = complianceChecked.realCustomers
    && complianceChecked.noIncentives
    && complianceChecked.allCustomers;

  function validate() {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.name = t("validationErrors.customerNameRequired");
    if (!customerEmail.trim()) errs.email = t("validationErrors.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errs.email = t("validationErrors.emailInvalid");
    if (!draftSubject.trim()) {
      errs.subject = t("mainForm.subjectRequired", { defaultValue: "Enter an email subject." });
    } else if (draftSubject.trim().length > MAX_REVIEW_REQUEST_SUBJECT_CHARS) {
      errs.subject = t("mainForm.subjectTooLong", {
        defaultValue: "Keep the subject under {{max}} characters.",
        max: MAX_REVIEW_REQUEST_SUBJECT_CHARS,
      });
    } else if (/[\r\n]/.test(draftSubject)) {
      errs.subject = t("mainForm.subjectSingleLine", { defaultValue: "Keep the subject on one line." });
    }
    if (!draftBody.trim()) {
      errs.body = t("mainForm.bodyRequired", { defaultValue: "Enter an email message." });
    } else if (draftBody.trim().length > MAX_REVIEW_REQUEST_BODY_CHARS) {
      errs.body = t("mainForm.bodyTooLong", {
        defaultValue: "Keep the message under {{max}} characters.",
        max: MAX_REVIEW_REQUEST_BODY_CHARS,
      });
    } else if (containsDirectYelpLink(`${draftSubject}\n${draftBody}`)) {
      errs.body = t("mainForm.yelpDirectLinkBlocked", {
        defaultValue: "Remove the direct Yelp link. Get Phame will add a plain-text search instruction instead.",
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function resetComplianceChecklist() {
    setComplianceChecked({ realCustomers: false, noIncentives: false, allCustomers: false });
  }

  function handleReviewBeforeSend() {
    if (!validate()) return;
    // If no platform URL is available, show a multi-action toast instead of silently sending
    if (!activeReviewValue) {
      toast.custom(
        (toastId) => (
          <div
            className="flex flex-col gap-2 px-4 py-3 rounded-xl shadow-lg bg-white" style={{ border: "1px solid oklch(0.90 0.02 260)", minWidth: "280px", maxWidth: "320px" }}
          >
            <p className="text-base font-bold rr-text-navy">
              {t("mainForm.noReviewPlatformsConfigured")}
            </p>
            <p className="text-sm font-bold rr-text-navy-mid">
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
                className="px-3 py-1.5 rounded-lg text-sm font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
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
    resetComplianceChecklist();
    setFinalPreviewOpen(true);
  }

  function handleConfirmedSend() {
    if (!validate() || !allComplianceChecked) return;
    setSending(true);
    sendRequest.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      method: "email",
      templateId: selectedTemplateId ?? undefined,
      platformId: selectedPlatformId ?? undefined,
      editedSubject: draftSubject.trim(),
      editedBody: draftBody.trim(),
      complianceConfirmed: true,
    });
  }

  function handleSendAnother() {
    setCustomerName("");
    setCustomerEmail("");
    setErrors({});
    setSent(false);
    setReminderScheduled(false);
    setLastRequestId(null);
    setDraftSubject(sourceDraft.subject);
    setDraftBody(sourceDraft.body);
    setFinalPreviewOpen(false);
    resetComplianceChecklist();
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
        <p className="text-center mb-2 text-white font-bold text-lg">
          {t("successScreen.requestSentTo", { customerName })}
        </p>
        <p className="text-base text-center mb-8 text-white/90 font-bold">
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
            <p className="text-sm mb-3 text-white/90 font-bold">
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
                <p className="text-sm mb-3 text-white/90 font-bold">
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
      <div className="px-5 pt-14 md:pt-6 pb-6 rr-bg-navy animate-scale-in">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Send size={16} className="rr-text-gold" />
            <span
              className="text-sm font-bold tracking-widest uppercase rr-text-gold"
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
          <p className="text-base font-bold mt-1 text-white/90">
            {t("mainForm.from")} {smtpStatus?.email ?? t("smtp.noEmailConnected", { defaultValue: "No email connected" })}
          </p>
        )}
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
      {/* Desktop: two-column grid. Mobile: single column */}
      <div className="max-w-5xl mx-auto lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 flex flex-col gap-4">
        {/* ── Left column ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
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
          const quota = profile.freeQuota;
          if (quota.blocked) {
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
                    {quota.nextAvailableAt
                      ? t("page.freeRollingLimitReachedDesc", {
                          defaultValue: "You've used all 5 requests in your current rolling 30-day allowance. Your next request becomes available on {{date}}, or upgrade to keep sending now.",
                          date: new Date(quota.nextAvailableAt).toLocaleDateString(),
                        })
                      : t("page.freeInitialLimitReachedDesc", {
                          defaultValue: "You've used your 10 initial requests. Your recurring allowance is 5 requests every rolling 30 days, or upgrade for unlimited requests.",
                        })}
                  </p>
                  <button
                    onClick={() => openUpgradeModal("send_limit")}
                    className="flex flex-wrap items-center gap-2 text-xs font-bold"
                    style={{ color: 'oklch(0.55 0.18 260)' }}
                  >
                    <Zap size={12} aria-hidden="true" />
                    <span>{t("page.upgradeToPro", { defaultValue: "Upgrade to Pro →" })}</span>
                    <ProBadge variant="locked" size="sm" />
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
                  {quota.phase === "initial"
                    ? t("page.freeInitialRemaining", {
                        defaultValue: "Free plan: {{remaining}} of 10 initial requests remaining — then 5 every rolling 30 days",
                        remaining: quota.remaining,
                      })
                    : t("page.freeRollingRemaining", {
                        defaultValue: "Free plan: {{remaining}} of 5 requests remaining in your rolling 30-day allowance",
                        remaining: quota.remaining,
                      })}
                </span>
              </div>
              <button
                onClick={() => openUpgradeModal("send_limit")}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1 text-xs font-bold rr-bg-navy rr-text-gold"
              >
                <span>{t("page.upgrade", { defaultValue: "Upgrade" })}</span>
                <ProBadge variant="locked" size="sm" />
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

            {/* Send-time message editor. Edits apply only to this request. */}
            <div
              className="rounded-2xl p-4 rr-bg-cream-warm"
              style={{ border: "1px solid oklch(0.90 0.02 260)" }}
              data-testid="send-message-editor"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <PencilLine size={15} className="rr-text-gold-dim" aria-hidden="true" />
                    <h3 className="text-sm font-black rr-text-navy">
                      {t("mainForm.editMessageTitle", { defaultValue: "Edit this message" })}
                    </h3>
                  </div>
                  <p className="text-xs mt-1 rr-text-navy-muted">
                    {t("mainForm.editMessageDescription", { defaultValue: "Personalize this email without changing your saved template." })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraftSubject(sourceDraft.subject);
                    setDraftBody(sourceDraft.body);
                    setErrors((current) => ({ ...current, subject: undefined, body: undefined }));
                  }}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold rr-text-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ background: "oklch(0.93 0.02 260)" }}
                >
                  <RotateCcw size={13} aria-hidden="true" />
                  {t("mainForm.resetToTemplate", { defaultValue: "Reset" })}
                </button>
              </div>

              <div
                className="mb-4 flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ border: "1px solid oklch(0.89 0.025 260)" }}
              >
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-black rr-text-navy">
                    <Sparkles size={14} className="rr-text-gold-dim" aria-hidden="true" />
                    {t("mainForm.aiToneTitle", { defaultValue: "AI tone adjustment" })}
                    {!hasPaidAiAccess && <ProBadge variant="locked" size="sm" />}
                  </p>
                  <p className="mt-0.5 text-[11px] rr-text-navy-muted">
                    {t("mainForm.aiToneDescription", { defaultValue: "Refines your draft while keeping placeholders and review links intact." })}
                  </p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <label className="sr-only" htmlFor="send-request-tone">
                    {t("mainForm.aiToneLabel", { defaultValue: "Email tone" })}
                  </label>
                  <select
                    id="send-request-tone"
                    value={selectedTone}
                    onChange={(event) => setSelectedTone(event.target.value as typeof selectedTone)}
                    className="min-h-9 min-w-0 flex-1 rounded-lg bg-white px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rr-text-navy"
                    style={{ border: "1px solid oklch(0.84 0.03 260)" }}
                    disabled={adjustTone.isPending}
                  >
                    <option value="warmer">{t("mainForm.aiToneWarmer", { defaultValue: "Warmer" })}</option>
                    <option value="professional">{t("mainForm.aiToneProfessional", { defaultValue: "Professional" })}</option>
                    <option value="concise">{t("mainForm.aiToneConcise", { defaultValue: "Concise" })}</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleToneAdjustment}
                    disabled={adjustTone.isPending || !draftSubject.trim() || !draftBody.trim()}
                    className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black transition-opacity disabled:cursor-not-allowed disabled:opacity-55 rr-bg-navy rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-label={hasPaidAiAccess
                      ? t("mainForm.applyAiTone", { defaultValue: "Apply AI tone adjustment" })
                      : t("mainForm.unlockAiTone", { defaultValue: "Unlock AI tone adjustment" })}
                  >
                    {adjustTone.isPending ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Sparkles size={13} aria-hidden="true" />}
                    <span>{adjustTone.isPending
                      ? t("mainForm.aiToneWorking", { defaultValue: "Adjusting" })
                      : hasPaidAiAccess
                        ? t("mainForm.applyAiTone", { defaultValue: "Adjust" })
                        : t("mainForm.unlockAiTone", { defaultValue: "Unlock" })}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label htmlFor="send-request-subject" className="text-xs font-bold rr-text-navy-mid">
                      {t("mainForm.subjectLabel", { defaultValue: "Subject" })}
                    </label>
                    <span className="text-[11px] rr-text-navy-muted" aria-live="polite">
                      {draftSubject.length}/{MAX_REVIEW_REQUEST_SUBJECT_CHARS}
                    </span>
                  </div>
                  <input
                    id="send-request-subject"
                    type="text"
                    value={draftSubject}
                    maxLength={MAX_REVIEW_REQUEST_SUBJECT_CHARS}
                    onChange={(event) => {
                      setDraftSubject(event.target.value);
                      setErrors((current) => ({ ...current, subject: undefined }));
                    }}
                    className="w-full rounded-xl bg-white px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rr-text-navy"
                    style={{ border: errors.subject ? "2px solid oklch(0.65 0.22 27)" : "2px solid oklch(0.90 0.02 260)" }}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? "send-request-subject-error" : undefined}
                  />
                  {errors.subject && (
                    <p id="send-request-subject-error" className="text-xs mt-1 rr-text-red" role="alert">{errors.subject}</p>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label htmlFor="send-request-body" className="text-xs font-bold rr-text-navy-mid">
                      {t("mainForm.messageLabel", { defaultValue: "Message" })}
                    </label>
                    <span className="text-[11px] rr-text-navy-muted" aria-live="polite">
                      {draftBody.length}/{MAX_REVIEW_REQUEST_BODY_CHARS}
                    </span>
                  </div>
                  <textarea
                    id="send-request-body"
                    value={draftBody}
                    rows={11}
                    maxLength={MAX_REVIEW_REQUEST_BODY_CHARS}
                    onChange={(event) => {
                      setDraftBody(event.target.value);
                      setErrors((current) => ({ ...current, body: undefined }));
                    }}
                    className="w-full resize-y rounded-xl bg-white px-3 py-3 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rr-text-navy"
                    style={{ border: errors.body ? "2px solid oklch(0.65 0.22 27)" : "2px solid oklch(0.90 0.02 260)", minHeight: "220px" }}
                    aria-invalid={Boolean(errors.body)}
                    aria-describedby={errors.body ? "send-request-body-error" : "send-request-placeholder-help"}
                  />
                  {errors.body ? (
                    <p id="send-request-body-error" className="text-xs mt-1 rr-text-red" role="alert">{errors.body}</p>
                  ) : (
                    <p id="send-request-placeholder-help" className="text-xs mt-1 rr-text-navy-muted">
                      {t("mainForm.placeholderHelp", { defaultValue: "Placeholders such as {{customerName}}, {{businessName}}, and {{platformLinks}} are filled automatically." })}
                    </p>
                  )}
                </div>
              </div>
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

            {/* Live Email Preview — shown inline on mobile, hidden on desktop (shown in right column) */}
            {profile?.businessName && (
              <div
                className="px-4 py-3 rounded-xl rr-bg-white-card lg:hidden"
              >
                <p className="text-xs font-bold mb-2 rr-text-navy-mid">
                  {t("mainForm.livePreview", { defaultValue: "Live email preview" })}
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

            {/* Review button — sending happens only from the final confirmation dialog */}
            <button
              onClick={() => { buttonPressHaptic(); handleReviewBeforeSend(); }}
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
                  <Mail size={20} />
                  {t("mainForm.reviewAndSend", { defaultValue: "Review & send" })}
                </>
              )}
            </button>


          </div>
        </div>
      </div>{/* end left column */}

        {/* ── Right column: Desktop email preview panel ─────────────────────── */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Preview header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="rr-text-navy-mid" />
                  <span className="text-sm font-black rr-text-navy">{t("mainForm.livePreview", { defaultValue: "Live email preview" })}</span>
                </div>
              </div>
              {/* Preview body */}
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold rr-text-navy-mid">{t("mainForm.from")}</span>
                  <span className="text-sm rr-text-navy">{smtpStatus?.email ?? "your@email.com"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold rr-text-navy-mid">{t("mainForm.subject")}</span>
                  <span className="text-sm rr-text-navy">{previewSubject || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold rr-text-navy-mid">{t("mainForm.body")}</span>
                  <div
                    className="text-sm rr-text-navy leading-relaxed whitespace-pre-wrap rounded-xl p-3"
                    style={{ background: "oklch(0.97 0.01 260)", minHeight: "120px" }}
                  >
                    {previewBody || <span className="opacity-40">{t("mainForm.previewPlaceholder", { defaultValue: "Add the customer and message details to see the final email." })}</span>}
                  </div>
                </div>
                {/* Recipient info */}
                {customerName && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "oklch(0.97 0.03 80)" }}>
                    <User size={13} className="rr-text-gold-dim shrink-0" />
                    <span className="text-xs rr-text-navy-mid">
                      {t("mainForm.sendingTo", {
                        defaultValue: "Sending to {{name}} ({{email}})",
                        name: customerName,
                        email: customerEmail,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Compliance reminder */}
            <div className="mt-4 px-4 py-3 rounded-2xl" style={{ background: "oklch(0.22 0.09 260)" }}>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="rr-text-gold" aria-hidden="true" />
                <p className="text-xs font-bold rr-text-gold">
                  {t("mainForm.complianceReminderTitle", { defaultValue: "Send responsibly" })}
                </p>
              </div>
              <p className="text-xs text-white/80">
                {t("mainForm.complianceReminderBody", { defaultValue: "Use neutral wording, contact real customers only, and never offer incentives or filter by satisfaction." })}
              </p>
            </div>
          </div>
        </div>

      </div>{/* end grid wrapper */}
      </div>{/* end outer padding */}
    </div>

    <Dialog
      open={finalPreviewOpen}
      onOpenChange={(open) => {
        if (sending) return;
        setFinalPreviewOpen(open);
        if (!open) resetComplianceChecklist();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-testid="send-final-preview-dialog">
        <DialogHeader>
          <DialogTitle className="rr-text-navy">
            {t("mainForm.finalPreviewTitle", { defaultValue: "Review the final email" })}
          </DialogTitle>
          <DialogDescription>
            {t("mainForm.finalPreviewDescription", { defaultValue: "Check the recipient and exact message before sending." })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 rounded-2xl p-4 rr-bg-cream-warm sm:grid-cols-2" style={{ border: "1px solid oklch(0.90 0.02 260)" }}>
            <div>
              <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.from")}</p>
              <p className="break-all text-sm rr-text-navy">{smtpStatus?.email ?? "your@email.com"}</p>
            </div>
            <div>
              <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.to", { defaultValue: "To:" })}</p>
              <p className="break-all text-sm rr-text-navy">{customerName} &lt;{customerEmail}&gt;</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4" style={{ border: "1px solid oklch(0.90 0.02 260)" }}>
            <div className="mb-4">
              <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.subject")}</p>
              <p className="mt-1 text-sm font-bold rr-text-navy">{previewSubject}</p>
            </div>
            <div>
              <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.body")}</p>
              <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed rr-text-navy">{previewBody}</div>
            </div>
          </div>

          {platforms?.some((platform) => platform.platform === "yelp") && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 rr-bg-gold-pale" style={{ border: "1px solid oklch(0.85 0.12 80)" }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0 rr-text-gold-dim" aria-hidden="true" />
              <p className="text-xs rr-text-gold-dim">
                {t("bulkSendDialog.yelpWarning")}
              </p>
            </div>
          )}

          <div className="rounded-2xl p-4 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.88 0.03 260)" }}>
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={15} className="rr-text-green" aria-hidden="true" />
              <p className="text-sm font-black rr-text-navy">{t("bulkSendDialog.complianceChecklistTitle")}</p>
            </div>
            <div className="flex flex-col gap-2">
              {([
                { key: "realCustomers", label: t("bulkSendDialog.realCustomersCheck") },
                { key: "noIncentives", label: t("bulkSendDialog.noIncentivesCheck") },
                { key: "allCustomers", label: t("bulkSendDialog.allCustomersCheck") },
              ] as const).map((item) => (
                <label key={item.key} className="flex min-h-10 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/70">
                  <input
                    type="checkbox"
                    checked={complianceChecked[item.key]}
                    onChange={(event) => setComplianceChecked((current) => ({ ...current, [item.key]: event.target.checked }))}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[oklch(0.55_0.18_145)]"
                  />
                  <span className="text-xs leading-relaxed rr-text-navy-mid">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => setFinalPreviewOpen(false)}
            disabled={sending}
            className="min-h-11 rounded-xl px-4 text-sm font-bold rr-text-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50"
            style={{ background: "oklch(0.93 0.02 260)" }}
          >
            {t("mainForm.backToEdit", { defaultValue: "Back to edit" })}
          </button>
          <button
            type="button"
            onClick={() => { buttonPressHaptic(); handleConfirmedSend(); }}
            disabled={sending || !allComplianceChecked}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {sending
              ? t("mainForm.sending")
              : t("mainForm.confirmAndSend", { defaultValue: "Confirm & send" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={tonePreviewOpen} onOpenChange={handleTonePreviewOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl lg:max-w-4xl" data-testid="ai-tone-preview-dialog">
        <DialogHeader>
          <DialogTitle className="rr-text-navy">
            {t("mainForm.tonePreviewTitle", { defaultValue: "Review the AI-adjusted email" })}
          </DialogTitle>
          <DialogDescription>
            {t("mainForm.tonePreviewDescription", { defaultValue: "Your current draft will not change until you choose Apply adjusted tone." })}
          </DialogDescription>
        </DialogHeader>

        {tonePreviewSourceDraft && tonePreviewDraft && tonePreviewComparison && renderedTonePreviewComparison && (
          <section
            className="overflow-hidden rounded-2xl bg-white"
            style={{ border: "1px solid oklch(0.90 0.02 260)" }}
            data-testid="ai-tone-preview-comparison"
            aria-label={t("mainForm.tonePreviewComparisonTitle", { defaultValue: "Compare the changes" })}
          >
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3" style={{ borderColor: "oklch(0.90 0.02 260)" }}>
              <GitCompareArrows size={17} className="rr-text-navy" aria-hidden="true" />
              <p className="text-sm font-black rr-text-navy">
                {t("mainForm.tonePreviewComparisonTitle", { defaultValue: "Compare the changes" })}
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={tonePreviewChangedOnly}
                aria-describedby="tone-preview-filter-description"
                onClick={() => setTonePreviewChangedOnly((current) => !current)}
                className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ background: tonePreviewChangedOnly ? "oklch(0.74 0.15 83)" : "oklch(0.93 0.02 260)", color: "oklch(0.20 0.04 260)" }}
                data-testid="ai-tone-preview-changed-only-toggle"
              >
                <ListFilter size={14} aria-hidden="true" />
                {tonePreviewChangedOnly
                  ? t("mainForm.tonePreviewShowFullDraft", { defaultValue: "Show full drafts" })
                  : t("mainForm.tonePreviewChangedOnly", { defaultValue: "Changed lines only" })}
              </button>
              <p id="tone-preview-filter-description" className="basis-full text-xs leading-relaxed rr-text-navy-mid">
                {t("mainForm.tonePreviewChangedOnlyDescription", { defaultValue: "Filters both drafts to the full lines that contain a highlighted change." })}
              </p>
              <p className="basis-full text-xs leading-relaxed rr-text-navy-mid">
                {t("mainForm.tonePreviewDiffLegend", { defaultValue: "Removed text is highlighted in red. Added text is highlighted in green." })}
              </p>
            </div>

            <div className="grid gap-px bg-[oklch(0.90_0.02_260)] md:grid-cols-2">
              <section className="min-w-0 bg-white p-4" data-testid="ai-tone-preview-original" aria-label={t("mainForm.tonePreviewOriginalDraft", { defaultValue: "Original draft" })}>
                <p className="mb-4 text-xs font-black uppercase tracking-wide rr-text-navy-mid">
                  {t("mainForm.tonePreviewOriginalDraft", { defaultValue: "Original draft" })}
                </p>
                <div className="mb-4">
                  <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.subject")}</p>
                  <p className="mt-1 break-words text-sm font-bold leading-relaxed rr-text-navy">
                    {renderedTonePreviewComparison.subject.before.length > 0
                      ? <ToneDiffText segments={renderedTonePreviewComparison.subject.before} mode="before" />
                      : <span className="italic rr-text-navy-mid">{t("mainForm.tonePreviewNoChangedLines", { defaultValue: "No changed lines in this section." })}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.body")}</p>
                  <div className="mt-1 break-words text-sm leading-relaxed rr-text-navy">
                    {renderedTonePreviewComparison.body.before.length > 0
                      ? <ToneDiffText segments={renderedTonePreviewComparison.body.before} mode="before" />
                      : <span className="italic rr-text-navy-mid">{t("mainForm.tonePreviewNoChangedLines", { defaultValue: "No changed lines in this section." })}</span>}
                  </div>
                </div>
              </section>

              <section className="min-w-0 bg-white p-4" data-testid="ai-tone-preview-adjusted" aria-label={t("mainForm.tonePreviewAdjustedDraft", { defaultValue: "AI-adjusted draft" })}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-wide rr-text-navy-mid">
                    {t("mainForm.tonePreviewAdjustedDraft", { defaultValue: "AI-adjusted draft" })}
                  </p>
                  <button
                    type="button"
                    onClick={() => { buttonPressHaptic(); void handleCopyTonePreviewDraft(); }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-black rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ background: "oklch(0.93 0.02 260)" }}
                    data-testid="ai-tone-preview-copy-revised"
                  >
                    <Copy size={14} aria-hidden="true" />
                    {t("mainForm.tonePreviewCopyRevised", { defaultValue: "Copy revised draft" })}
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.subject")}</p>
                  <p className="mt-1 break-words text-sm font-bold leading-relaxed rr-text-navy">
                    {renderedTonePreviewComparison.subject.after.length > 0
                      ? <ToneDiffText segments={renderedTonePreviewComparison.subject.after} mode="after" />
                      : <span className="italic rr-text-navy-mid">{t("mainForm.tonePreviewNoChangedLines", { defaultValue: "No changed lines in this section." })}</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold rr-text-navy-mid">{t("mainForm.body")}</p>
                  <div className="mt-1 break-words text-sm leading-relaxed rr-text-navy">
                    {renderedTonePreviewComparison.body.after.length > 0
                      ? <ToneDiffText segments={renderedTonePreviewComparison.body.after} mode="after" />
                      : <span className="italic rr-text-navy-mid">{t("mainForm.tonePreviewNoChangedLines", { defaultValue: "No changed lines in this section." })}</span>}
                  </div>
                </div>
              </section>
            </div>

            {tonePreviewRationales.length > 0 && (
              <section className="border-t p-4" style={{ borderColor: "oklch(0.90 0.02 260)" }} aria-labelledby="tone-preview-rationales-title" data-testid="ai-tone-preview-rationales">
                <div className="flex items-start gap-2">
                  <Lightbulb size={17} className="mt-0.5 rr-text-gold" aria-hidden="true" />
                  <div>
                    <h3 id="tone-preview-rationales-title" className="text-sm font-black rr-text-navy">
                      {t("mainForm.tonePreviewRationaleTitle", { defaultValue: "Why AI suggested these adjustments" })}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed rr-text-navy-mid">
                      {t("mainForm.tonePreviewRationaleDescription", { defaultValue: "A brief explanation for each adjusted field. AI keeps request details, placeholders, and links intact." })}
                    </p>
                  </div>
                </div>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {tonePreviewRationales.map((entry) => (
                    <li key={entry.field} className="rounded-xl p-3 rr-bg-cream-warm" style={{ border: "1px solid oklch(0.90 0.03 83)" }}>
                      <p className="text-xs font-black uppercase tracking-wide rr-text-navy-mid">
                        {entry.field === "subject" ? t("mainForm.subject") : t("mainForm.body")}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed rr-text-navy">{entry.rationale}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => handleTonePreviewOpenChange(false)}
            className="min-h-11 rounded-xl px-4 text-sm font-bold rr-text-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: "oklch(0.93 0.02 260)" }}
          >
            {t("mainForm.keepCurrentDraft", { defaultValue: "Keep current draft" })}
          </button>
          <button
            type="button"
            onClick={() => { buttonPressHaptic(); handleApplyTonePreview(); }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            data-testid="ai-tone-preview-apply"
          >
            <Sparkles size={16} aria-hidden="true" />
            {t("mainForm.applyAdjustedTone", { defaultValue: "Apply adjusted tone" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
