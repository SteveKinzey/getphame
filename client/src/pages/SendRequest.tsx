// ReviewLink — Send Request Page
// Sends a review request email via the user's connected email account (SMTP)

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Rocket, Mail, User, Star, AlertCircle, Settings2, Loader2, FileText, ChevronDown, Globe, Zap, BookUser } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import ContactPickerModal from "@/components/ContactPickerModal";
import { FREE_LIMIT } from "@shared/const";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";

const SUCCESS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-send-success-8kZtg3dvEuiCrR8DrxxgKA.webp";

export default function SendRequestPage() {
  const [, navigate] = useLocation();
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

  const { data: platforms } = trpc.reviewPlatforms.list.useQuery();

  const PLATFORM_ICONS: Record<string, string> = {
    google: "🔍",
    yelp: "⭐",
    tripadvisor: "🦉",
    bing: "🌐",
    facebook: "👍",
    other: "🔗",
  };

  const PLATFORM_LABELS: Record<string, string> = {
    google: "Google",
    yelp: "Yelp",
    tripadvisor: "TripAdvisor",
    bing: "Bing",
    facebook: "Facebook",
    other: "Other",
  };

  // Resolve the active review URL for preview
  const activePlatform = platforms?.find((p) => p.id === selectedPlatformId)
    ?? platforms?.find((p) => p.isDefault === 1)
    ?? platforms?.[0];
  const activeReviewUrl = activePlatform?.url ?? profile?.reviewLink ?? "";

  const sendRequest = trpc.requests.send.useMutation({
    onSuccess: () => {
      setSending(false);
      setSent(true);
      track("send_request", { platform: activePlatform?.platform ?? "unknown" });
      toast.success("Review request sent!");
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
      return templates?.find((t) => t.id === selectedTemplateId) ?? null;
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
    if (!customerName.trim()) errs.name = "Customer name is required";
    if (!customerEmail.trim()) errs.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errs.email = "Enter a valid email address";
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
            className="flex flex-col gap-2 px-4 py-3 rounded-xl shadow-lg"
            style={{ background: "white", border: "1px solid oklch(0.90 0.02 260)", minWidth: "280px", maxWidth: "320px" }}
          >
            <p className="text-sm font-semibold" style={{ color: "oklch(0.22 0.09 260)" }}>
              No review platform configured
            </p>
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
              Add a review link in Settings so customers know where to leave their review.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigate("/settings"); toast.dismiss(toastId); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-black"
                style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
              >
                Go to Settings
              </button>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
              >
                Dismiss
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
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  // Milestone: total AFTER this send = stats.total + 1 (stats is pre-send)
  const totalAfterSend = (stats?.total ?? 0) + 1;
  const isMilestone = totalAfterSend === 10 || totalAfterSend === 25;
  const milestoneNum = totalAfterSend;

  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-40"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="w-40 h-40 mb-6">
          <img src={SUCCESS_IMG} alt="Sent!" className="w-full h-full object-contain" />
        </div>
        <h2
          className="text-3xl font-black text-center mb-2"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
        >
          Request Sent! 🚀
        </h2>
        <p className="text-center mb-2" style={{ color: "var(--text-on-dark-secondary)" }}>
          Your review request was sent to{" "}
          <strong style={{ color: "oklch(0.80 0.18 80)" }}>{customerName}</strong> from your email
          account.
        </p>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-on-dark-secondary)" }}>
          The email comes from <strong>{smtpStatus?.email}</strong> so it feels personal.
        </p>
        <div className="flex gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={28} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>

        {/* ── Milestone rating nudge ───────────────────────────────────── */}
        {isMilestone && (
          <div
            className="w-full max-w-xs rounded-2xl p-4 mb-6"
            style={{ background: "oklch(0.30 0.08 260)", border: "1.5px solid oklch(0.80 0.18 80)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.80 0.18 80)" }}
              >
                <Rocket size={15} style={{ color: "oklch(0.22 0.09 260)" }} />
              </div>
              <p className="text-sm font-black" style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}>
                {milestoneNum} requests sent!
              </p>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--text-on-dark-secondary)" }}>
              You're getting results for real businesses. If ReviewLink is helping you, a quick review means the world to us.
            </p>
            <a
              href="https://reviewlink.app/review"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95"
              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              <Star size={13} />
              Rate ReviewLink
            </a>
          </div>
        )}

        <button
          onClick={handleSendAnother}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-lg"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Send Another Request
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen pb-40" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Send size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            Send Request
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Request a Review
        </h1>
        {profile && (
          <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
            From: {smtpStatus?.email ?? "No email connected"}
          </p>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Email not connected warning ────────────────────────────────────── */}
        {!emailConnected && (
          <div
            className="flex items-start gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "oklch(0.97 0.03 80)" }}
          >
            <AlertCircle size={20} style={{ color: "oklch(0.65 0.18 80)" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.40 0.10 80)" }}>
                Email not connected
              </p>
              <p className="text-xs mb-2" style={{ color: "oklch(0.50 0.08 80)" }}>
                Connect your email account in Settings. Works with Gmail, Outlook, Yahoo, or any business email.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 text-xs font-bold"
                style={{ color: "oklch(0.40 0.10 80)" }}
              >
                <Settings2 size={12} />
                Go to Settings →
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
              <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.40 0.10 80)" }}>
                Business profile incomplete
              </p>
              <p className="text-xs mb-2" style={{ color: "oklch(0.50 0.08 80)" }}>
                Add your business name and Google review link in Settings first.
              </p>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-1 text-xs font-bold"
                style={{ color: "oklch(0.40 0.10 80)" }}
              >
                <Settings2 size={12} />
                Go to Settings →
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
                  <p className="text-sm font-bold mb-1" style={{ color: 'oklch(0.22 0.09 260)' }}>
                    Free limit reached
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'oklch(0.45 0.05 260)' }}>
                    You've used all {FREE_LIMIT} free review requests. Upgrade to Pro to keep sending.
                  </p>
                  <button
                    onClick={() => navigate('/upgrade')}
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: 'oklch(0.55 0.18 260)' }}
                  >
                    <Zap size={12} />
                    Upgrade to Pro →
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
                  Free plan: {remaining} of {FREE_LIMIT} sends remaining
                </span>
              </div>
              <button
                onClick={() => navigate('/upgrade')}
                className="text-xs font-bold px-3 py-1 rounded-lg"
                style={{ background: 'oklch(0.22 0.09 260)', color: 'oklch(0.80 0.18 80)' }}
              >
                Upgrade
              </button>
            </div>
          );
        })()}

        {/* ── Customer form ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2
            className="text-base font-black mb-4"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            Customer Details
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name */}
            {/* Import from Contacts button — only shown in native app */}
            {isNative && (
              <button
                type="button"
                onClick={() => setContactPickerOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-98"
                style={{
                  background: 'oklch(0.22 0.09 260)',
                  color: 'oklch(0.80 0.18 80)',
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <BookUser size={16} />
                Import from Contacts
              </button>
            )}

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                <User size={12} className="inline mr-1" />
                Customer Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="e.g. Sarah Johnson"
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
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                <Mail size={12} className="inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => { setCustomerEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="sarah@example.com"
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
              <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                <FileText size={12} className="inline mr-1" />
                Email Template
              </label>
              <div className="relative">
                <select
                  value={selectedTemplateId ?? "default"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTemplateId(val === "default" ? null : Number(val));
                  }}
                  className="w-full px-3 py-3 pr-8 rounded-xl text-sm outline-none appearance-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: "15px",
                    background: "white",
                    color: "oklch(0.22 0.09 260)",
                  }}
                >
                  <option value="default">
                    {defaultTemplate ? `${defaultTemplate.name} (default)` : "Default template"}
                  </option>
                  {templates?.filter((t) => !t.isDefault).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.50 0.04 260)" }} />
              </div>
              {templates && templates.length === 0 && (
                <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                  No templates yet.{" "}
                  <button
                    onClick={() => navigate("/templates")}
                    className="underline font-semibold"
                    style={{ color: "oklch(0.40 0.10 260)" }}
                  >
                    Create one →
                  </button>
                </p>
              )}
            </div>

            {/* Platform selector */}
            {platforms && platforms.length > 0 && (
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                  <Globe size={12} className="inline mr-1" />
                  Review Platform
                </label>
                <div className="relative">
                  <select
                    value={selectedPlatformId ?? "default"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedPlatformId(val === "default" ? null : Number(val));
                    }}
                    className="w-full px-3 py-3 pr-8 rounded-xl text-sm outline-none appearance-none"
                    style={{
                      border: "2px solid oklch(0.90 0.02 260)",
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: "15px",
                      background: "white",
                      color: "oklch(0.22 0.09 260)",
                    }}
                  >
                    <option value="default">
                      {platforms.find((p) => p.isDefault === 1)
                        ? `${PLATFORM_ICONS[platforms.find((p) => p.isDefault === 1)!.platform] ?? "🔗"} ${platforms.find((p) => p.isDefault === 1)!.label || PLATFORM_LABELS[platforms.find((p) => p.isDefault === 1)!.platform] || "Default"} (default)`
                        : platforms[0]
                        ? `${PLATFORM_ICONS[platforms[0].platform] ?? "🔗"} ${platforms[0].label || PLATFORM_LABELS[platforms[0].platform] || "First platform"}`
                        : "Default platform"}
                    </option>
                    {platforms
                      .filter((p) => p.isDefault !== 1)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {PLATFORM_ICONS[p.platform] ?? "🔗"} {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.50 0.04 260)" }} />
                </div>
                {activePlatform && (
                  <p className="text-xs mt-1 truncate" style={{ color: "oklch(0.60 0.03 260)" }}>
                    Link: {activePlatform.url}
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
                  No review platforms configured.{" "}
                  <button
                    onClick={() => navigate("/settings")}
                    className="underline font-semibold"
                    style={{ color: "oklch(0.40 0.10 80)" }}
                  >
                    Add one in Settings →
                  </button>
                </p>
              </div>
            )}

            {/* Live Email Preview */}
            {profile?.businessName && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.97 0.01 260)" }}
              >
                <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.40 0.04 260)" }}>
                  Email Preview
                </p>
                <p className="text-xs mb-1" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>From:</strong> {smtpStatus?.email ?? "your@email.com"}
                </p>
                <p className="text-xs mb-1" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>Subject:</strong> {previewSubject}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>Body:</strong> {previewBody.slice(0, 120)}{previewBody.length > 120 ? "…" : ""}
                </p>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
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
                  Sending...
                </>
              ) : (
                <>
                  <Rocket size={20} />
                  Send Review Request
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
          toast.success(`Imported ${contacts[0].name}`);
        } else {
          // For multiple contacts, pre-fill the first and show a toast
          setCustomerName(contacts[0].name);
          setCustomerEmail(contacts[0].email);
          setErrors({});
          toast.success(`Imported ${contacts.length} contacts - sending to first contact. Use Bulk Send for multiple.`);
        }
      }}
    />
    </>
  );
}
