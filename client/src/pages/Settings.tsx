// Phame — Settings Page
// Sections: Business Profile, Email Connection, Plan

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  Building2,
  MapPin,
  Link2,
  Crown,
  Save,
  CheckCircle2,
  Mail,
  LogOut,
  Loader2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  ShoppingBag,
  ChevronRight,
  Clock,
  RefreshCw,
  Plus,
  Trash2,
  Star,
  Globe,
  Pencil,
  X,
  RotateCcw,
  Send,
  BookOpen,
  Eye,
  EyeOff,
  Smartphone,
  Info,
  Apple,
  Key,
  Copy,
  Download,
  Bell,
  ShieldCheck,
  Moon,
  Sun,
  Monitor,
  Zap,
  AlertTriangle,
  CheckCircle,
  Gift,
  Users,
  TrendingUp,
  Camera,
  UserRound,
  Upload,
  ImageOff,
} from "lucide-react";
import OnboardingGuide from "@/components/OnboardingGuide";
import PlatformIcon from "@/components/PlatformIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import LanguageFlyout from "@/components/LanguageFlyout";
import LandingBrandLink from "@/components/LandingBrandLink";
import {
  buildProfilePreferencesExportFilename,
  buildProfilePreferencesExportReceiptFilename,
  serializeProfilePreferencesCsv,
  serializeProfilePreferencesExportReceipt,
  type ProfilePreferenceExportFormat,
  type ProfilePreferencesExportPayload,
} from "@/lib/profilePreferencesExport";
import { IntegrationGuide } from "@/components/IntegrationGuide";
import {
  canManageSubscription,
  getEffectivePlan,
  PLAN_LABELS,
} from "@shared/plans";
import PlanSwitchDialog from "@/components/PlanSwitchDialog";
import KoalendarSettingsCard from "@/components/KoalendarSettingsCard";
import AdaptiveSendLimitStatus from "@/components/AdaptiveSendLimitStatus";
import AdaptiveSendBurstCapSettings from "@/components/AdaptiveSendBurstCapSettings";
import PasskeySecurityCard from "@/components/security/PasskeySecurityCard";
import RecoveryDrillCard from "@/components/security/RecoveryDrillCard";
import {
  BULK_SENDER_PRESETS,
  BULK_SENDER_PROVIDER_IDS,
  getBulkSenderPreset,
  resolveBulkSenderHost,
  type BulkSenderProvider,
  type BulkSenderSecurity,
} from "@shared/bulkSenderPresets";
import {
  DEFAULT_FOLLOW_UP_DELAY_DAYS,
  DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS,
  FOLLOW_UP_DELAY_PRESETS,
  getProjectedFollowUpDates,
  isValidFollowUpDelayDays,
  normalizeFollowUpDelayDays,
} from "@/lib/reminderSettings";
import { openUpgradeModal } from "@/lib/upgradeModal";
import ProBadge from "@/components/ProBadge";
import ApplicationVersionDiagnosticsCard from "@/components/ApplicationVersionDiagnosticsCard";
import { useUpdateDirtySource } from "@/contexts/UpdateSafetyContext";
import {
  SettingsBulkMailConnectionStatus,
  SettingsPersonalMailConnectionStatus,
} from "@/components/SettingsMailConnectionStatus";
import {
  ConnectionSavedNotice,
  SmtpAppPasswordHelpTooltip,
  SmtpCandidateConnectionActions,
} from "@/components/SmtpConnectionFeedback";
import SmtpTestEmailHistory from "@/components/SmtpTestEmailHistory";
import PausedAutomationQueue from "@/components/PausedAutomationQueue";
import { BulkProviderDiscoveryControls } from "@/components/BulkProviderDiscoveryControls";

const QUIET_HOURS_MINUTES = 12 * 60;
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes)
    ? hours * 60 + minutes
    : 0;
}

function minutesToTime(value: number | null | undefined, fallback: string) {
  if (!Number.isInteger(value) || value! < 0 || value! >= 24 * 60)
    return fallback;
  return `${String(Math.floor(value! / 60)).padStart(2, "0")}:${String(value! % 60).padStart(2, "0")}`;
}

function quietDurationMinutes(startMinutes: number, endMinutes: number) {
  const duration = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
  return duration === 0 ? 24 * 60 : duration;
}

// ── Share & Earn Card ────────────────────────────────────────────────────────
function ShareAndEarnCard({
  profile,
}: {
  profile: ProfileData | null | undefined;
}) {
  const { data: codeData, isLoading: codeLoading } =
    trpc.referral.getCode.useQuery();
  const { data: stats } = trpc.referral.getStats.useQuery();
  const [copied, setCopied] = useState(false);

  const tier = profile?.tier ?? "free";
  const isPaid = tier === "pro" || tier === "annual";

  const handleCopy = () => {
    if (!codeData?.shareUrl) return;
    navigator.clipboard.writeText(codeData.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Referral link copied!");
  };

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ border: "1px solid oklch(0.91 0.02 260)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "oklch(0.80 0.18 80)" }}
        >
          <Gift size={16} style={{ color: "oklch(0.22 0.09 260)" }} />
        </div>
        <div>
          <h2 className="text-sm font-black rr-text-navy">Share &amp; Earn</h2>
          <p className="text-xs rr-text-navy-muted">
            Refer a friend — get 1 free month when they subscribe
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Users, label: "Referred", value: stats?.totalReferrals ?? 0 },
          {
            icon: TrendingUp,
            label: "Converted",
            value: stats?.convertedReferrals ?? 0,
          },
          {
            icon: Gift,
            label: "Months Earned",
            value: stats?.monthsEarned ?? 0,
          },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl p-2.5 text-center"
            style={{ background: "oklch(0.97 0.01 260)" }}
          >
            <Icon size={14} className="mx-auto mb-1 rr-text-navy-muted" />
            <p className="text-base font-black rr-text-navy">{value}</p>
            <p className="text-xs rr-text-navy-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      {codeLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 size={16} className="animate-spin rr-text-navy-muted" />
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
        >
          <div
            className="flex items-center gap-2 px-3 py-2.5"
            style={{ background: "oklch(0.97 0.01 260)" }}
          >
            <p
              className="text-xs flex-1 truncate font-mono rr-text-navy"
              style={{ fontSize: "11px" }}
            >
              {codeData?.shareUrl ?? "Loading..."}
            </p>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: copied
                  ? "oklch(0.55 0.15 150)"
                  : "oklch(0.22 0.09 260)",
                color: copied ? "white" : "oklch(0.80 0.18 80)",
              }}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Eligibility note */}
      {!isPaid && (
        <p
          className="text-xs mt-3 text-center"
          style={{ color: "oklch(0.55 0.08 260)" }}
        >
          Upgrade to a paid plan to receive your free month reward when a
          referral converts.
        </p>
      )}
    </div>
  );
}

// ── Inline From Name editor (shown in connected SMTP card) ─────────────────────
function InlineFromNameEdit({
  current,
  onSaved,
}: {
  current: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
  }, [current]);

  const updateFromName = trpc.smtp.updateFromName.useMutation({
    onSuccess: () => {
      onSaved();
      setEditing(false);
      toast.success("Sender name updated!");
    },
    onError: err => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-base flex-1 rr-text-navy font-bold">
          <span className="rr-text-navy-mid rr-fw-semibold">Sender name:</span>{" "}
          {current || <span className="rr-text-navy-faint">Not set</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm px-2 py-1 rounded-lg font-black rr-text-navy rr-bg-surface-darker"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. Steve at Acme Plumbing"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
        name="rr-pages-settings-value-241"
      />
      <button
        onClick={() => setEditing(false)}
        className="text-sm px-2 py-1 rounded-lg font-black rr-text-navy-muted rr-bg-surface-darker"
      >
        Cancel
      </button>
      <button
        disabled={updateFromName.isPending}
        onClick={() => updateFromName.mutate({ fromName: value.trim() })}
        className="text-sm px-2 py-1 rounded-lg font-black rr-bg-navy text-white"
      >
        {updateFromName.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          "Save"
        )}
      </button>
    </div>
  );
}

function InlineReplyToEdit({
  current,
  onSaved,
}: {
  current: string;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  useEffect(() => {
    setValue(current);
  }, [current]);

  const updateReplyTo = trpc.smtp.updateReplyTo.useMutation({
    onSuccess: () => {
      onSaved();
      setEditing(false);
      toast.success("Reply-To address updated!");
    },
    onError: err => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-base flex-1 rr-text-navy font-bold">
          <span className="rr-text-navy-mid rr-fw-semibold">Reply-To:</span>{" "}
          {current || (
            <span className="rr-text-navy-faint">Same as sending address</span>
          )}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-sm px-2 py-1 rounded-lg font-black rr-text-navy rr-bg-surface-darker"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. support@mycompany.com"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
        name="rr-pages-settings-value-297"
        autoComplete="email"
      />
      <button
        onClick={() => setEditing(false)}
        className="text-sm px-2 py-1 rounded-lg font-black rr-text-navy-muted rr-bg-surface-darker"
      >
        Cancel
      </button>
      <button
        disabled={updateReplyTo.isPending}
        onClick={() => updateReplyTo.mutate({ replyTo: value.trim() })}
        className="text-sm px-2 py-1 rounded-lg font-black rr-bg-navy text-white"
      >
        {updateReplyTo.isPending ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          "Save"
        )}
      </button>
    </div>
  );
}

// ── Send Feedback Section ────────────────────────────────────────────────────
function SendFeedbackSection() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Build a mailto link as a lightweight feedback channel
      const subject = encodeURIComponent("Get Phame Feedback");
      const body = encodeURIComponent(message.trim());
      window.location.href = `mailto:support@phame.app?subject=${subject}&body=${body}`;
      toast.success("Opening your email client to send feedback");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error(
        "Could not open email client. Please email support@phame.app directly."
      );
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent"
        style={{ color: "oklch(0.45 0.10 260)" }}
        aria-label="Send feedback to Get Phame support"
      >
        <Send size={14} aria-hidden="true" />
        Send Feedback
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3 rr-bg-white-card"
      style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold rr-text-navy">Send Feedback</p>
        <button
          onClick={() => {
            setOpen(false);
            setMessage("");
          }}
          aria-label="Close feedback form"
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <X size={14} className="rr-text-navy-muted" />
        </button>
      </div>
      <p className="text-base font-bold leading-relaxed rr-text-navy-mid">
        Found a bug? Have a suggestion? We read every message.
      </p>
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Describe what you found or what you'd love to see…"
        rows={4}
        maxLength={1000}
        className="w-full rounded-xl px-3 py-2.5 text-xs resize-none outline-none bg-white rr-text-navy"
        style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
        aria-label="Feedback message"
        name="rr-pages-settings-message-379"
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-sm font-bold"
          style={{ color: "oklch(0.25 0.04 260)" }}
        >
          {message.length}/1000
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setOpen(false);
              setMessage("");
            }}
            className="px-4 py-2 rounded-xl text-sm font-black rr-text-navy"
            style={{ background: "oklch(0.90 0.01 260)" }}
          >
            Cancel
          </button>
          <button
            disabled={!message.trim() || sending}
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1"
            style={{
              background: message.trim()
                ? "oklch(0.22 0.09 260)"
                : "oklch(0.70 0.04 260)",
              color: "oklch(0.80 0.18 80)",
              cursor: message.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Nunito', sans-serif",
            }}
            aria-label="Send feedback"
          >
            {sending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={12} aria-hidden="true" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Account Section ────────────────────────────────────────────────────
type AccountDeletionPreviewTestOverride = {
  startOpen?: boolean;
  preview: {
    totalRecords: number;
    categories: Array<{ key: string; count: number }>;
  };
};

export function DeleteAccountSection({
  testOverride,
}: {
  testOverride?: AccountDeletionPreviewTestOverride;
}) {
  const [open, setOpen] = useState(() => testOverride?.startOpen ?? false);
  const [confirmed, setConfirmed] = useState(false);
  const [, navigate] = useLocation();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const deletionPreview = trpc.account.previewDeletion.useQuery(undefined, {
    enabled: open && !testOverride,
    retry: false,
  });
  const previewData = testOverride?.preview ?? deletionPreview.data;
  const previewIsLoading = !testOverride && deletionPreview.isLoading;
  const previewHasError = !testOverride && deletionPreview.isError;

  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted. Goodbye!");
      logout();
      navigate("/");
    },
    onError: err => toast.error(err.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent"
        style={{ color: "oklch(0.55 0.15 25)" }}
      >
        <Trash2 size={14} />
        Delete Account
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: "oklch(0.99 0.005 25)",
        border: "1.5px solid oklch(0.80 0.12 25)",
      }}
    >
      <p
        className="text-sm font-bold"
        style={{
          color: "oklch(0.40 0.15 25)",
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        Delete your account?
      </p>
      <p
        className="text-sm font-bold leading-relaxed"
        style={{ color: "oklch(0.15 0.05 260)" }}
      >
        This will permanently delete your account, all contacts, email
        templates, review requests, tracking data, and SMTP credentials. This
        action cannot be undone.
      </p>
      <div
        className="rounded-xl rr-bg-surface-darker px-3 py-3"
        data-testid="settings-account-deletion-preview"
      >
        <p className="text-xs font-black rr-text-navy">
          {t("settings.deleteAccount.previewTitle", {
            defaultValue: "Data scheduled for deletion",
          })}
        </p>
        {previewIsLoading ? (
          <p className="mt-2 flex items-center gap-2 text-xs rr-text-navy-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            {t("settings.deleteAccount.previewLoading", {
              defaultValue: "Calculating your data impact…",
            })}
          </p>
        ) : previewHasError ? (
          <p
            className="mt-2 text-xs"
            role="alert"
            style={{ color: "oklch(0.48 0.16 25)" }}
          >
            {t("settings.deleteAccount.previewUnavailable", {
              defaultValue:
                "We could not calculate your data preview. You can cancel and try again.",
            })}
          </p>
        ) : previewData ? (
          <>
            <p className="mt-1 text-xs rr-text-navy-muted">
              {t("settings.deleteAccount.previewSummary", {
                count: previewData.totalRecords,
                defaultValue:
                  "{{count}} records are currently scheduled for permanent deletion.",
              })}
            </p>
            <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
              {previewData.categories.map(category => (
                <li
                  key={category.key}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 rr-text-navy"
                >
                  <span>
                    {t(
                      `settings.deleteAccount.previewCategories.${category.key}`,
                      { defaultValue: category.key }
                    )}
                  </span>
                  <strong>{category.count}</strong>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5"
          name="rr-pages-settings-confirmed-460"
        />
        <span
          className="text-sm font-bold"
          style={{ color: "oklch(0.15 0.05 260)" }}
        >
          I understand this is permanent and cannot be reversed.
        </span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen(false);
            setConfirmed(false);
          }}
          className="flex-1 py-2 rounded-xl text-sm font-black rr-text-navy"
          style={{ background: "oklch(0.90 0.01 260)" }}
        >
          Cancel
        </button>
        <button
          disabled={!confirmed || deleteAccount.isPending}
          onClick={() => deleteAccount.mutate()}
          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
          style={{
            background: confirmed
              ? "oklch(0.50 0.18 25)"
              : "oklch(0.80 0.05 25)",
            color: "white",
            cursor: confirmed ? "pointer" : "not-allowed",
          }}
        >
          {deleteAccount.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          Delete Forever
        </button>
      </div>
    </div>
  );
}

// ── Billing Section ─────────────────────────────────────────────────────────
type ProfileData = {
  tier: string;
  planExpiresAt?: number | null;
  stripeCustomerId?: string | null;
  [key: string]: unknown;
};

function BillingSection({
  profile,
}: {
  profile: ProfileData | null | undefined;
}) {
  const [, navigate] = useLocation();
  const [showRetention, setShowRetention] = useState(false);
  const [planSwitchOpen, setPlanSwitchOpen] = useState(false);
  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: err => toast.error(err.message),
  });

  const tier = profile?.tier ?? "free";
  const effectivePlan = getEffectivePlan(tier);
  const isLife = effectivePlan === "life";
  const canManage = canManageSubscription(effectivePlan);
  const planExpiresAt = profile?.planExpiresAt;
  const hasStripe = !!profile?.stripeCustomerId;

  const TIER_COLORS: Record<string, { bg: string; text: string }> = {
    free: { bg: "oklch(0.94 0.01 260)", text: "oklch(0.45 0.04 260)" },
    pro: { bg: "oklch(0.80 0.18 80)", text: "oklch(0.22 0.09 260)" },
    annual: { bg: "oklch(0.80 0.18 80)", text: "oklch(0.22 0.09 260)" },
    lifetime: { bg: "oklch(0.22 0.09 260)", text: "oklch(0.80 0.18 80)" },
  };
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.free;

  const renewalLabel = (() => {
    if (tier === "lifetime") return "Never renews — yours forever";
    if (tier === "free") return null;
    if (planExpiresAt) {
      const d = new Date(planExpiresAt);
      return `Renews ${d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`;
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="rr-text-gold" />
          <h2 className="text-base font-black rr-text-navy">Billing</h2>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: colors.bg, color: colors.text }}
        >
          {PLAN_LABELS[effectivePlan]}
        </span>
      </div>

      {renewalLabel && (
        <p className="text-sm mb-3 flex items-center gap-1.5 rr-text-navy-mid font-bold">
          <Clock size={12} />
          {renewalLabel}
        </p>
      )}

      {effectivePlan === "free" ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold rr-text-navy-mid">
            Upgrade to Pro for unlimited sends, follow-up reminders, and
            priority support.
          </p>
          <button
            onClick={() => navigate("/upgrade")}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
          >
            <Crown size={16} />
            Upgrade to Pro
          </button>
        </div>
      ) : isLife ? (
        <p className="text-sm font-semibold rr-text-navy-mid">
          Life access is active. There are no renewals and no upgrade or
          cancellation actions.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {hasStripe && canManage ? (
            showRetention ? (
              /* ── Retention prompt ─────────────────────────────────────── */
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "oklch(0.97 0.005 260)",
                  border: "1.5px solid oklch(0.88 0.03 260)",
                }}
              >
                <p className="text-sm font-black rr-text-navy">
                  Before you go...
                </p>
                <div className="space-y-1.5">
                  {[
                    tier === "annual"
                      ? "2 months free vs monthly — already paid"
                      : null,
                    "Automated follow-up reminders (day 3 + day 10)",
                    "Unlimited review requests",
                    "Priority support",
                  ]
                    .filter(Boolean)
                    .map(perk => (
                      <div
                        key={perk as string}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2
                          size={13}
                          className="rr-text-green"
                          style={{ flexShrink: "0" }}
                        />
                        <span className="text-xs rr-text-navy-mid">{perk}</span>
                      </div>
                    ))}
                </div>
                <p className="text-sm font-semibold rr-text-navy-mid">
                  Cancelling will downgrade your account to Free at the end of
                  the billing period.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRetention(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy"
                  >
                    Keep My Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowRetention(false);
                      navigate("/cancel");
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black rr-text-navy"
                    style={{ background: "oklch(0.90 0.01 260)" }}
                  >
                    Continue to Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPlanSwitchOpen(true)}
                  disabled={createPortal.isPending}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-navy text-white disabled:opacity-60"
                >
                  {createPortal.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ExternalLink size={16} />
                  )}
                  {effectivePlan === "annual"
                    ? "Switch to Monthly or Manage Billing"
                    : "Change Plan or Manage Billing"}
                </button>
                <PlanSwitchDialog
                  open={planSwitchOpen}
                  onOpenChange={setPlanSwitchOpen}
                  currentPlan={effectivePlan as "monthly" | "annual"}
                  onConfirm={() =>
                    createPortal.mutate({ origin: window.location.origin })
                  }
                  isPending={createPortal.isPending}
                />
                <button
                  onClick={() => setShowRetention(true)}
                  className="text-xs text-center py-2 rr-text-navy-muted"
                >
                  End subscription
                </button>
              </div>
            )
          ) : (
            <p className="text-sm font-semibold rr-text-navy-mid">
              Your plan is active. Contact support to manage billing.
            </p>
          )}
          {!isLife && (
            <button
              onClick={() => navigate("/upgrade")}
              className="text-xs text-center py-1.5 rr-text-navy-muted"
            >
              View all plans
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bulk Sender Section ──────────────────────────────────────────────────────
function isBulkSenderProvider(
  value: string | null | undefined
): value is BulkSenderProvider {
  return Boolean(
    value && BULK_SENDER_PROVIDER_IDS.includes(value as BulkSenderProvider)
  );
}

function BulkSenderSection({
  profile,
  disableStatusQuery = false,
}: {
  profile: ProfileData | null | undefined;
  disableStatusQuery?: boolean;
}) {
  const { t } = useTranslation();
  const tier = profile?.tier ?? "free";
  const isPro = tier !== "free";
  const statusQuery = trpc.bulkSender.status.useQuery(undefined, {
    enabled: !disableStatusQuery,
  });
  const status = disableStatusQuery ? undefined : statusQuery.data;
  const refetch = statusQuery.refetch;
  const [provider, setProvider] = useState<BulkSenderProvider>(
    BULK_SENDER_PROVIDER_IDS[0]
  );
  const [secret, setSecret] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecurity, setSmtpSecurity] =
    useState<BulkSenderSecurity>("starttls");
  const [providerRegion, setProviderRegion] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [secretTouched, setSecretTouched] = useState(false);
  const [connectionSavedNotice, setConnectionSavedNotice] = useState(false);
  const preset = getBulkSenderPreset(provider);
  const localizedPreset =
    provider === "mailjet"
      ? {
          ...preset,
          label: t("settings.bulkSender.providers.mailjet.label", {
            defaultValue: preset.label,
          }),
          description: t("settings.bulkSender.providers.mailjet.description", {
            defaultValue: preset.description,
          }),
          usernameLabel: t(
            "settings.bulkSender.providers.mailjet.usernameLabel",
            { defaultValue: preset.usernameLabel }
          ),
          usernamePlaceholder: t(
            "settings.bulkSender.providers.mailjet.usernamePlaceholder",
            { defaultValue: preset.usernamePlaceholder }
          ),
          secretLabel: t("settings.bulkSender.providers.mailjet.secretLabel", {
            defaultValue: preset.secretLabel,
          }),
          secretPlaceholder: t(
            "settings.bulkSender.providers.mailjet.secretPlaceholder",
            { defaultValue: preset.secretPlaceholder }
          ),
          secretHelp: t("settings.bulkSender.providers.mailjet.secretHelp", {
            defaultValue: preset.secretHelp,
          }),
        }
      : preset;
  const resolvedHost =
    provider === "custom_smtp"
      ? smtpHost
      : resolveBulkSenderHost(provider, providerRegion || preset.defaultRegion);

  const applyProvider = (nextProvider: BulkSenderProvider) => {
    const nextPreset = getBulkSenderPreset(nextProvider);
    setProvider(nextProvider);
    setProviderRegion(nextPreset.defaultRegion ?? "");
    setSmtpHost(nextPreset.defaultHost);
    setSmtpPort(nextPreset.defaultPort);
    setSmtpSecurity(nextPreset.defaultSecurity);
    setSmtpUsername(
      nextPreset.usernameMode === "fixed"
        ? (nextPreset.fixedUsername ?? "")
        : ""
    );
    setSecret("");
    setShowSecret(false);
  };

  const openUpdateForm = () => {
    const nextProvider = isBulkSenderProvider(status?.provider)
      ? status.provider
      : BULK_SENDER_PROVIDER_IDS[0];
    const nextPreset = getBulkSenderPreset(nextProvider);
    setProvider(nextProvider);
    setProviderRegion(status?.providerRegion ?? nextPreset.defaultRegion ?? "");
    setSmtpHost(status?.smtpHost ?? nextPreset.defaultHost);
    setSmtpPort(status?.smtpPort ?? nextPreset.defaultPort);
    setSmtpSecurity(status?.smtpSecurity ?? nextPreset.defaultSecurity);
    setSmtpUsername(
      nextPreset.usernameMode === "fixed"
        ? (nextPreset.fixedUsername ?? "")
        : ""
    );
    setFromEmail(status?.fromEmail ?? "");
    setFromName(status?.fromName ?? "");
    setSecret("");
    setShowSecret(false);
    setConnectionSavedNotice(false);
    setShowForm(true);
  };

  const connectMutation = trpc.bulkSender.connect.useMutation({
    onSuccess: () => {
      toast.success(
        t("settings.bulkSender.connectedToast", {
          defaultValue: "Bulk Sender connected.",
        })
      );
      setShowForm(false);
      setSecret("");
      setConnectionSavedNotice(true);
      refetch();
    },
    onError: err => toast.error(err.message),
  });
  const disconnectMutation = trpc.bulkSender.disconnect.useMutation({
    onSuccess: () => {
      toast.success(
        t("settings.bulkSender.disconnectedToast", {
          defaultValue: "Bulk Sender disconnected.",
        })
      );
      refetch();
    },
    onError: err => toast.error(err.message),
  });
  const testMutation = trpc.bulkSender.test.useMutation({
    onSuccess: res => {
      if (res.ok)
        toast.success(
          t("settings.bulkSender.healthyToast", {
            defaultValue: "Connection healthy.",
          })
        );
      else
        toast.error(
          res.error ??
            t("settings.bulkSender.testFailed", {
              defaultValue: "Connection test failed.",
            })
        );
    },
    onError: err => toast.error(err.message),
  });

  const usernameIsValid =
    preset.usernameMode !== "user" || smtpUsername.trim().length > 0;
  const customHostIsValid =
    provider !== "custom_smtp" || smtpHost.trim().length > 0;
  const fromEmailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail.trim());
  const usernameValidation =
    preset.usernameMode === "user" && usernameTouched
      ? smtpUsername.trim().length > 0
        ? "valid"
        : "invalid"
      : "idle";
  const secretValidation = secretTouched
    ? secret.trim().length > 0
      ? "valid"
      : "invalid"
    : "idle";
  const canConnect = Boolean(
    secret.trim() && fromEmailIsValid && usernameIsValid && customHostIsValid
  );

  const submitConnection = () => {
    connectMutation.mutate({
      provider,
      secret,
      smtpUsername: preset.usernameMode === "user" ? smtpUsername : undefined,
      smtpHost: provider === "custom_smtp" ? smtpHost : undefined,
      smtpPort: provider === "custom_smtp" ? smtpPort : undefined,
      smtpSecurity: provider === "custom_smtp" ? smtpSecurity : undefined,
      providerRegion: providerRegion || undefined,
      fromEmail,
      fromName: fromName || undefined,
    });
  };

  return (
    <div
      id="bulk-sender"
      className="scroll-mt-24 bg-white rounded-2xl p-4 shadow-sm sm:p-5"
      style={{ border: "1px solid oklch(0.91 0.02 260)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap size={18} className="rr-text-gold" />
          <h2 className="text-base font-black rr-text-navy">Bulk Sender</h2>
          {!isPro && <ProBadge variant="locked" size="sm" />}
        </div>
        {isPro && status?.connected && !showForm && (
          <button
            type="button"
            onClick={openUpdateForm}
            className="min-h-10 rounded-lg px-3 text-xs font-bold rr-text-navy-mid hover:rr-text-navy"
          >
            {t("settings.bulkSender.update", { defaultValue: "Update" })}
          </button>
        )}
      </div>
      <p className="text-xs mb-4 rr-text-navy-muted">
        {t("settings.bulkSender.description", {
          defaultValue:
            "Connect your own verified transactional SMTP relay for higher-volume sending. Credentials are tested without sending a message.",
        })}
      </p>
      {status?.legacyPlatformConnection === true && (
        <div
          className="mb-4 rounded-xl px-3 py-2.5 text-xs font-semibold rr-text-navy-mid"
          style={{
            background: "oklch(0.97 0.02 80)",
            border: "1px solid oklch(0.88 0.08 80)",
          }}
        >
          <SettingsBulkMailConnectionStatus status={status} translate={t} />
        </div>
      )}

      {!isPro ? (
        <div
          className="rounded-xl p-4 flex items-start gap-3"
          style={{
            background: "oklch(0.97 0.01 260)",
            border: "1px solid oklch(0.88 0.03 260)",
          }}
        >
          <Crown size={16} className="mt-0.5 shrink-0 rr-text-gold" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold rr-text-navy mb-0.5">
              {t("settings.bulkSender.proTitle", {
                defaultValue: "Pro feature",
              })}
            </p>
            <p className="text-sm font-semibold rr-text-navy-mid">
              {t("settings.bulkSender.proBody", {
                defaultValue:
                  "Upgrade to Pro to connect a transactional email service for higher-volume delivery.",
              })}
            </p>
            <button
              type="button"
              onClick={() => openUpgradeModal("bulk_sender")}
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black rr-bg-navy rr-text-gold transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none"
            >
              <span>
                {t("premiumConversion.modal.comparePlans", {
                  defaultValue: "Compare free and premium",
                })}
              </span>
              <ProBadge variant="locked" size="sm" />
            </button>
          </div>
        </div>
      ) : status?.connected && !showForm ? (
        <div className="space-y-3">
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              background: "oklch(0.97 0.02 150)",
              border: "1px solid oklch(0.85 0.08 150)",
            }}
          >
            <CheckCircle
              size={16}
              className="shrink-0"
              style={{ color: "oklch(0.45 0.15 150)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold rr-text-navy">
                {status.provider === "mailjet"
                  ? t("settings.bulkSender.providers.mailjet.label", {
                      defaultValue: "Mailjet",
                    })
                  : isBulkSenderProvider(status.provider)
                    ? BULK_SENDER_PRESETS[status.provider].label
                    : status.provider}{" "}
                {t("settings.bulkSender.connected", {
                  defaultValue: "connected",
                })}
              </p>
              <p className="text-sm font-semibold rr-text-navy-mid truncate">
                {status.fromEmail}
              </p>
              {status.smtpHost && (
                <p className="mt-0.5 truncate text-xs rr-text-navy-muted">
                  {status.smtpHost}:{status.smtpPort}
                </p>
              )}
              <SettingsBulkMailConnectionStatus status={status} translate={t} />
            </div>
          </div>
          {connectionSavedNotice && (
            <ConnectionSavedNotice
              message={t("settings.bulkSender.connectionSavedMessage", {
                defaultValue:
                  "Your bulk mail server is connected and ready to use.",
              })}
            />
          )}
          {status.connectionMode === "legacy_api" && (
            <div
              className="rounded-xl px-3 py-2 text-xs font-semibold rr-text-navy-mid"
              style={{
                background: "oklch(0.97 0.02 80)",
                border: "1px solid oklch(0.88 0.08 80)",
              }}
            >
              {t("settings.bulkSender.legacyNotice", {
                defaultValue:
                  "This existing connection uses the legacy API mode. Update it when convenient to use the guided SMTP preset.",
              })}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="min-h-11 flex-1 py-2 rounded-xl text-xs font-bold border rr-text-navy-mid"
              style={{ border: "1.5px solid oklch(0.88 0.03 260)" }}
            >
              {testMutation.isPending ? (
                <Loader2 size={12} className="animate-spin inline mr-1" />
              ) : null}
              {t("settings.bulkSender.testConnection", {
                defaultValue: "Test connection",
              })}
            </button>
            <button
              type="button"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="min-h-11 flex-1 py-2 rounded-xl text-xs font-bold"
              style={{
                background: "oklch(0.97 0.02 30)",
                border: "1.5px solid oklch(0.85 0.08 30)",
                color: "oklch(0.50 0.15 30)",
              }}
            >
              {t("settings.bulkSender.disconnect", {
                defaultValue: "Disconnect",
              })}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="bulk-sender-provider"
              className="block text-xs font-bold mb-1 rr-text-navy-mid"
            >
              {t("settings.bulkSender.provider", { defaultValue: "Provider" })}
            </label>
            <BulkProviderDiscoveryControls
              provider={provider}
              onProviderChange={applyProvider}
              translate={(key, options) => t(key, options) as string}
            />
          </div>

          {preset.regions?.length ? (
            <div>
              <label
                htmlFor="bulk-sender-region"
                className="block text-xs font-bold mb-1 rr-text-navy-mid"
              >
                {t("settings.bulkSender.region", { defaultValue: "Region" })}
              </label>
              <select
                id="bulk-sender-region"
                value={providerRegion || preset.defaultRegion}
                onChange={event => {
                  setProviderRegion(event.target.value);
                  setSmtpHost(
                    resolveBulkSenderHost(provider, event.target.value)
                  );
                }}
                className="min-h-11 w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none rr-text-navy"
                style={{
                  border: "2px solid oklch(0.90 0.02 260)",
                  fontSize: "16px",
                }}
              >
                {preset.regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {provider === "custom_smtp" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="bulk-sender-host"
                  className="block text-xs font-bold mb-1 rr-text-navy-mid"
                >
                  {t("settings.bulkSender.smtpHost", {
                    defaultValue: "SMTP host",
                  })}
                </label>
                <input
                  id="bulk-sender-host"
                  type="text"
                  value={smtpHost}
                  onChange={event => setSmtpHost(event.target.value)}
                  placeholder="smtp.provider.com"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="min-h-11 w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontSize: "16px",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="bulk-sender-port"
                  className="block text-xs font-bold mb-1 rr-text-navy-mid"
                >
                  {t("settings.bulkSender.smtpPort", { defaultValue: "Port" })}
                </label>
                <input
                  id="bulk-sender-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={smtpPort}
                  onChange={event => setSmtpPort(Number(event.target.value))}
                  className="min-h-11 w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontSize: "16px",
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="bulk-sender-security"
                  className="block text-xs font-bold mb-1 rr-text-navy-mid"
                >
                  {t("settings.bulkSender.security", {
                    defaultValue: "Security",
                  })}
                </label>
                <select
                  id="bulk-sender-security"
                  value={smtpSecurity}
                  onChange={event =>
                    setSmtpSecurity(event.target.value as BulkSenderSecurity)
                  }
                  className="min-h-11 w-full rounded-xl px-3 py-2 outline-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontSize: "16px",
                  }}
                >
                  <option value="starttls">STARTTLS</option>
                  <option value="tls">TLS / SSL</option>
                </select>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: "oklch(0.97 0.01 260)",
                border: "1px solid oklch(0.90 0.02 260)",
              }}
            >
              <p className="text-xs font-bold rr-text-navy">
                {t("settings.bulkSender.presetEndpoint", {
                  defaultValue: "Preset endpoint",
                })}
              </p>
              <p className="mt-0.5 break-all text-xs rr-text-navy-muted">
                {resolvedHost}:{preset.defaultPort} ·{" "}
                {preset.defaultSecurity === "tls" ? "TLS / SSL" : "STARTTLS"}
              </p>
            </div>
          )}

          {preset.usernameMode === "user" ? (
            <div>
              <label
                htmlFor="bulk-sender-username"
                className="block text-xs font-bold mb-1 rr-text-navy-mid"
              >
                {localizedPreset.usernameLabel}
              </label>
              <input
                id="bulk-sender-username"
                type="text"
                value={smtpUsername}
                onChange={event => {
                  setSmtpUsername(event.target.value);
                  setUsernameTouched(true);
                }}
                onBlur={() => setUsernameTouched(true)}
                placeholder={localizedPreset.usernamePlaceholder}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={usernameValidation === "invalid"}
                aria-describedby={
                  usernameValidation === "idle"
                    ? undefined
                    : "bulk-sender-username-feedback"
                }
                className="min-h-11 w-full rounded-xl px-3 py-2 outline-none"
                style={{
                  border:
                    usernameValidation === "invalid"
                      ? "2px solid oklch(0.62 0.20 27)"
                      : usernameValidation === "valid"
                        ? "2px solid oklch(0.56 0.14 145)"
                        : "2px solid oklch(0.90 0.02 260)",
                  fontSize: "16px",
                }}
              />
              {usernameValidation !== "idle" && (
                <p
                  id="bulk-sender-username-feedback"
                  role="status"
                  aria-live="polite"
                  className="mt-1 text-xs font-semibold"
                  style={{
                    color:
                      usernameValidation === "valid"
                        ? "oklch(0.40 0.12 145)"
                        : "oklch(0.48 0.16 27)",
                  }}
                >
                  {t(
                    usernameValidation === "valid"
                      ? "smtp.credentialReady"
                      : "smtp.credentialRequired",
                    {
                      defaultValue:
                        usernameValidation === "valid"
                          ? "Looks good."
                          : "This field is required.",
                    }
                  )}
                </p>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl px-3 py-2.5"
              style={{
                background: "oklch(0.97 0.01 260)",
                border: "1px solid oklch(0.90 0.02 260)",
              }}
            >
              <p className="text-xs font-bold rr-text-navy">
                {preset.usernameLabel}
              </p>
              <p className="mt-0.5 text-xs rr-text-navy-muted">
                {preset.usernameMode === "fixed"
                  ? preset.fixedUsername
                  : t("settings.bulkSender.secretUsedForUsername", {
                      defaultValue:
                        "Your secret is used securely for both SMTP fields.",
                    })}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="bulk-sender-secret"
                className="text-xs font-bold rr-text-navy-mid"
              >
                {localizedPreset.secretLabel}
              </label>
              <a
                href={preset.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-8 rounded-md px-1 text-xs flex items-center gap-0.5"
                style={{ color: "oklch(0.40 0.14 150)" }}
              >
                {t("settings.bulkSender.setupHelp", {
                  defaultValue: "Setup help",
                })}{" "}
                <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                id="bulk-sender-secret"
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={event => {
                  setSecret(event.target.value);
                  setSecretTouched(true);
                }}
                onBlur={() => setSecretTouched(true)}
                placeholder={localizedPreset.secretPlaceholder}
                autoComplete="new-password"
                aria-invalid={secretValidation === "invalid"}
                aria-describedby={
                  secretValidation === "idle"
                    ? undefined
                    : "bulk-sender-secret-feedback"
                }
                className="min-h-11 w-full px-3 py-2 pr-11 rounded-xl outline-none"
                style={{
                  border:
                    secretValidation === "invalid"
                      ? "2px solid oklch(0.62 0.20 27)"
                      : secretValidation === "valid"
                        ? "2px solid oklch(0.56 0.14 145)"
                        : "2px solid oklch(0.90 0.02 260)",
                  fontSize: "16px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(value => !value)}
                aria-label={
                  showSecret
                    ? t("settings.bulkSender.hideSecret", {
                        defaultValue: "Hide secret",
                      })
                    : t("settings.bulkSender.showSecret", {
                        defaultValue: "Show secret",
                      })
                }
                aria-pressed={showSecret}
                className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg rr-text-navy-muted"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {secretValidation !== "idle" && (
              <p
                id="bulk-sender-secret-feedback"
                role="status"
                aria-live="polite"
                className="mt-1 text-xs font-semibold"
                style={{
                  color:
                    secretValidation === "valid"
                      ? "oklch(0.40 0.12 145)"
                      : "oklch(0.48 0.16 27)",
                }}
              >
                {t(
                  secretValidation === "valid"
                    ? "smtp.credentialReady"
                    : "smtp.credentialRequired",
                  {
                    defaultValue:
                      secretValidation === "valid"
                        ? "Secret entered. Test before saving."
                        : "This field is required.",
                  }
                )}
              </p>
            )}
            <p className="mt-1 text-xs rr-text-navy-muted">
              {localizedPreset.secretHelp}
            </p>
          </div>

          <div>
            <label
              htmlFor="bulk-sender-from-email"
              className="block text-xs font-bold mb-1 rr-text-navy-mid"
            >
              {t("settings.bulkSender.fromEmail", {
                defaultValue: "From email",
              })}
            </label>
            <input
              id="bulk-sender-from-email"
              type="email"
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder="noreply@yourdomain.com"
              autoCapitalize="none"
              className="min-h-11 w-full px-3 py-2 rounded-xl outline-none"
              style={{
                border: "2px solid oklch(0.90 0.02 260)",
                fontSize: "16px",
              }}
              autoComplete="email"
            />
            <p className="text-xs mt-1 rr-text-navy-muted">
              {provider === "mailjet"
                ? t("settings.bulkSender.providers.mailjet.fromEmailHelp", {
                    defaultValue:
                      "This sender address or domain must already be validated in Mailjet.",
                  })
                : t("settings.bulkSender.fromEmailHelp", {
                    defaultValue:
                      "This sender must already be verified with your provider.",
                  })}
            </p>
          </div>

          <div>
            <label
              htmlFor="bulk-sender-from-name"
              className="block text-xs font-bold mb-1 rr-text-navy-mid"
            >
              {t("settings.bulkSender.fromName", { defaultValue: "From name" })}{" "}
              <span className="font-normal">
                ({t("common.optional", { defaultValue: "optional" })})
              </span>
            </label>
            <input
              id="bulk-sender-from-name"
              type="text"
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="Your Business Name"
              className="min-h-11 w-full px-3 py-2 rounded-xl outline-none"
              style={{
                border: "2px solid oklch(0.90 0.02 260)",
                fontSize: "16px",
              }}
            />
          </div>

          <div
            className="rounded-xl px-3 py-2 flex items-start gap-2"
            style={{
              background: "oklch(0.97 0.02 80)",
              border: "1px solid oklch(0.88 0.08 80)",
            }}
          >
            <AlertTriangle
              size={12}
              className="mt-0.5 shrink-0"
              style={{ color: "oklch(0.55 0.18 80)" }}
            />
            <p className="text-xs" style={{ color: "oklch(0.45 0.10 80)" }}>
              {t("settings.bulkSender.compliance", {
                defaultValue:
                  "Only send to people who have consented to receive this outreach. Get Phame preserves unsubscribe handling and compliance safeguards.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {status?.connected && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-11 flex-1 py-2.5 rounded-xl text-sm font-bold border rr-text-navy-mid"
                style={{ border: "1.5px solid oklch(0.88 0.03 260)" }}
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
            )}
            <button
              type="button"
              onClick={submitConnection}
              disabled={connectMutation.isPending || !canConnect}
              aria-busy={connectMutation.isPending}
              className="min-h-11 flex-1 py-2.5 rounded-xl text-sm font-bold rr-bg-navy rr-text-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connectMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin inline mr-1" />
                  {t("settings.bulkSender.connectingAndVerifying", {
                    defaultValue: "Connecting and verifying…",
                  })}
                </>
              ) : (
                t("settings.bulkSender.connectAndTest", {
                  defaultValue: "Connect and test",
                })
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Development-only browser coverage fixture for the real Settings bulk-sender flow. */
export function SettingsBulkSenderTestFixture() {
  return (
    <BulkSenderSection
      profile={{ tier: "pro" } as ProfileData}
      disableStatusQuery
    />
  );
}

function AccountProfileCard() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: account, isLoading } = trpc.accountProfile.get.useQuery();
  const [name, setName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (account?.name) setName(account.name);
  }, [account?.name]);

  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  const refreshIdentity = async () => {
    await Promise.all([
      utils.accountProfile.get.invalidate(),
      utils.auth.me.invalidate(),
    ]);
  };

  const updateProfile = trpc.accountProfile.update.useMutation({
    onSuccess: async () => {
      await refreshIdentity();
      toast.success(
        t("settings.accountProfile.saved", { defaultValue: "Profile updated." })
      );
    },
    onError: error => toast.error(error.message),
  });

  const uploadAvatar = trpc.accountProfile.uploadAvatar.useMutation({
    onSuccess: async () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshIdentity();
      toast.success(
        t("settings.accountProfile.avatarSaved", {
          defaultValue: "Profile photo updated.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });

  const removeAvatar = trpc.accountProfile.removeAvatar.useMutation({
    onSuccess: async () => {
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refreshIdentity();
      toast.success(
        t("settings.accountProfile.avatarRemoved", {
          defaultValue: "Profile photo removed.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      toast.error(
        t("settings.accountProfile.avatarInvalid", {
          defaultValue: "Choose a JPG, PNG, or WebP image up to 3 MB.",
        })
      );
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitAvatar = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onerror = () =>
      toast.error(
        t("settings.accountProfile.avatarReadError", {
          defaultValue: "We could not read that image. Try another file.",
        })
      );
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const dataBase64 = result.includes(",") ? result.split(",")[1] : "";
      uploadAvatar.mutate({
        mimeType: selectedFile.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp",
        dataBase64,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  if (isLoading) {
    return (
      <div
        className="h-52 animate-pulse rounded-2xl bg-white"
        aria-label={t("settings.accountProfile.loading", {
          defaultValue: "Loading account profile",
        })}
      />
    );
  }

  const avatarSrc =
    previewUrl ||
    account?.avatarUrl ||
    "https://assets.getphame.app/getphame-logo.svg";
  const nameChanged =
    name.trim() !== (account?.name ?? "") && name.trim().length >= 2;

  return (
    <section
      className="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="account-profile-title"
    >
      <div className="mb-5 flex items-center gap-2">
        <UserRound size={18} className="rr-text-navy" aria-hidden="true" />
        <div>
          <h2
            id="account-profile-title"
            className="text-base font-black rr-text-navy"
          >
            {t("settings.accountProfile.title", {
              defaultValue: "Account profile",
            })}
          </h2>
          <p className="text-xs rr-text-navy-muted">
            {t("settings.accountProfile.description", {
              defaultValue:
                "Manage the identity shown in your Get Phame account.",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-start">
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative h-28 w-28 overflow-hidden rounded-3xl border-4 border-white shadow-md"
            style={{ background: "oklch(0.22 0.09 260)" }}
          >
            <img
              src={avatarSrc}
              alt={t("settings.accountProfile.avatarAlt", {
                defaultValue: "Account profile photo",
              })}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full rr-bg-gold rr-text-navy shadow-md"
              aria-label={t("settings.accountProfile.chooseAvatar", {
                defaultValue: "Choose profile photo",
              })}
            >
              <Camera size={16} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={event => chooseAvatar(event.target.files?.[0])}
            name="rr-pages-settings-field-1145"
          />
          <p className="text-center text-[11px] font-semibold rr-text-navy-muted">
            {t("settings.accountProfile.avatarHelp", {
              defaultValue: "JPG, PNG, or WebP · 3 MB max",
            })}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="account-display-name"
              className="mb-1.5 block text-xs font-bold rr-text-navy-mid"
            >
              {t("settings.accountProfile.displayName", {
                defaultValue: "Display name",
              })}
            </label>
            <input
              id="account-display-name"
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
            />
          </div>
          <div>
            <label
              htmlFor="account-email"
              className="mb-1.5 block text-xs font-bold rr-text-navy-mid"
            >
              {t("settings.accountProfile.email", {
                defaultValue: "Email address",
              })}
            </label>
            <input
              id="account-email"
              name="account-email"
              type="email"
              autoComplete="email"
              value={account?.email ?? ""}
              readOnly
              className="w-full cursor-not-allowed rounded-xl px-4 py-3 text-sm font-semibold opacity-70 rr-bg-surface-darker rr-text-navy"
            />
            <p className="mt-1 text-[11px] rr-text-navy-muted">
              {t("settings.accountProfile.emailHelp", {
                defaultValue:
                  "Your sign-in email is managed by your authentication provider.",
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" aria-live="polite">
            <button
              type="button"
              onClick={() => updateProfile.mutate({ name: name.trim() })}
              disabled={!nameChanged || updateProfile.isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50 rr-bg-navy"
            >
              {updateProfile.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {t("settings.accountProfile.save", {
                defaultValue: "Save profile",
              })}
            </button>
            {selectedFile && (
              <button
                type="button"
                onClick={submitAvatar}
                disabled={uploadAvatar.isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:opacity-50"
              >
                {uploadAvatar.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {t("settings.accountProfile.uploadAvatar", {
                  defaultValue: "Upload photo",
                })}
              </button>
            )}
            {(account?.avatarUrl || selectedFile) && (
              <button
                type="button"
                onClick={() =>
                  selectedFile
                    ? (setSelectedFile(null), setPreviewUrl(null))
                    : removeAvatar.mutate()
                }
                disabled={removeAvatar.isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-text-navy"
                style={{ border: "1.5px solid oklch(0.84 0.05 260)" }}
              >
                {removeAvatar.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImageOff size={16} />
                )}
                {selectedFile
                  ? t("common.cancel", { defaultValue: "Cancel" })
                  : t("settings.accountProfile.removeAvatar", {
                      defaultValue: "Remove photo",
                    })}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsSkeleton({ title }: { title: string }) {
  return (
    <div
      className="min-h-screen pb-40 rr-bg-cream-warm"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="px-5 pt-12 pb-5 rr-bg-navy">
        <div className="flex items-center justify-between mb-4">
          <LandingBrandLink iconClassName="w-8 h-8" textClassName="text-lg" />
          <LanguageFlyout />
        </div>
        <h1 className="text-2xl text-white rr-fw-black">{title}</h1>
        <div className="h-4 w-40 rounded-lg bg-white/15 animate-pulse mt-2" />
      </div>
      <div className="px-4 py-5 space-y-4 max-w-3xl mx-auto">
        {[0, 1, 2].map(section => (
          <div
            key={section}
            className="bg-white rounded-2xl p-5 shadow-sm animate-pulse"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl rr-bg-surface-darker" />
              <div className="h-5 w-36 rounded-lg rr-bg-surface-darker" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-24 rounded rr-bg-surface-darker" />
              <div className="h-11 w-full rounded-xl rr-bg-surface-darker" />
              <div className="h-4 w-32 rounded rr-bg-surface-darker" />
              <div className="h-11 w-full rounded-xl rr-bg-surface-darker" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThemePreferenceCard() {
  const { t } = useTranslation();
  const { theme, themePreference, setThemePreference, switchable } = useTheme();

  if (!switchable || !setThemePreference) return null;

  return (
    <section
      data-testid="settings-theme-preference"
      className="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="settings-appearance-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
          {themePreference === "system" ? (
            <Monitor size={18} aria-hidden="true" />
          ) : theme === "dark" ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="settings-appearance-title"
            className="text-base font-black rr-text-navy"
          >
            {t("settings.appearance.title", { defaultValue: "Appearance" })}
          </h2>
          <p className="mt-1 text-sm rr-text-navy-muted">
            {t("settings.appearance.description", {
              defaultValue:
                "Choose the color mode you want Get Phame to remember on this device.",
            })}
          </p>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label={t("settings.appearance.label", {
          defaultValue: "Color mode",
        })}
      >
        {(["light", "dark", "system"] as const).map(option => {
          const selected = themePreference === option;
          const label = t(`theme.${option}`, {
            defaultValue:
              option === "light"
                ? "Light"
                : option === "dark"
                  ? "Dark"
                  : "System",
          });
          const Icon =
            option === "light" ? Sun : option === "dark" ? Moon : Monitor;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={`settings-theme-${option}`}
              onClick={() => setThemePreference(option)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                selected
                  ? "border-amber-400 rr-bg-navy rr-text-gold"
                  : "border-slate-200 bg-slate-50 rr-text-navy hover:border-amber-300"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
      <p
        className="mt-3 text-xs font-semibold rr-text-navy-muted"
        aria-live="polite"
      >
        {themePreference === "system"
          ? t("settings.appearance.systemSaved", {
              theme: t(`theme.${theme}`, {
                defaultValue: theme === "light" ? "Light" : "Dark",
              }),
              defaultValue:
                "System mode is saved and currently using {{theme}}.",
            })
          : t("settings.appearance.saved", {
              theme: t(`theme.${themePreference}`, {
                defaultValue: themePreference === "light" ? "Light" : "Dark",
              }),
              defaultValue: "{{theme}} mode is saved on this device.",
            })}
      </p>
      {themePreference !== "system" ? (
        <button
          type="button"
          data-testid="settings-theme-reset-system"
          onClick={() => setThemePreference("system")}
          className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <RotateCcw size={16} aria-hidden="true" />
          {t("settings.appearance.resetSystem", {
            defaultValue: "Reset to System default",
          })}
        </button>
      ) : null}
    </section>
  );
}

type ExportHistoryPreviewEntry = {
  id: number;
  format: string;
  exportedAt: number;
};
type ProfilePreferencesExportCardTestOverride = {
  account: { name: string | null; email: string | null };
  history?: ExportHistoryPreviewEntry[];
  historyError?: boolean;
};

export function ProfilePreferencesExportCard({
  profile,
  testOverride,
}: {
  profile: ProfileData | null | undefined;
  testOverride?: ProfilePreferencesExportCardTestOverride;
}) {
  const { t } = useTranslation();
  const accountQuery = trpc.accountProfile.get.useQuery(undefined, {
    enabled: !testOverride,
  });
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const exportHistory = trpc.accountProfile.exportHistory.useQuery(
    {
      startDate: historyStartDate || undefined,
      endDate: historyEndDate || undefined,
    },
    { enabled: !testOverride }
  );
  const recordExport = trpc.accountProfile.recordExport.useMutation({
    onSuccess: () => exportHistory.refetch(),
    onError: () =>
      toast.error(
        t("settings.dataExport.historyRecordError", {
          defaultValue:
            "Your file downloaded, but we could not update download history.",
        })
      ),
  });
  const { theme, themePreference } = useTheme();
  const { hapticEnabled } = useHaptics();
  const [selectedFormat, setSelectedFormat] =
    useState<ProfilePreferenceExportFormat>("json");
  const [previewHistory, setPreviewHistory] = useState<
    ExportHistoryPreviewEntry[]
  >(testOverride?.history ?? []);
  const account = testOverride?.account ?? accountQuery.data;
  const historyEntries = testOverride ? previewHistory : exportHistory.data;
  const displayedHistory = testOverride
    ? (historyEntries ?? []).filter(entry => {
        const exportedDay = new Date(entry.exportedAt)
          .toISOString()
          .slice(0, 10);
        return (
          (!historyStartDate || exportedDay >= historyStartDate) &&
          (!historyEndDate || exportedDay <= historyEndDate)
        );
      })
    : historyEntries;
  const historyIsLoading = testOverride ? false : exportHistory.isLoading;
  const historyHasError = testOverride?.historyError ?? exportHistory.isError;
  const safeString = (value: unknown) =>
    typeof value === "string" ? value : null;

  const downloadReceipt = (entry: ExportHistoryPreviewEntry) => {
    const filename = buildProfilePreferencesExportFilename(
      entry.format as ProfilePreferenceExportFormat,
      new Date(entry.exportedAt).toISOString()
    );
    const receiptFilename = buildProfilePreferencesExportReceiptFilename(
      entry.exportedAt
    );
    const content = serializeProfilePreferencesExportReceipt({
      receiptId: entry.id,
      format: entry.format as ProfilePreferenceExportFormat,
      exportedAt: entry.exportedAt,
      filename,
    });
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = receiptFilename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success(
      t("settings.dataExport.receiptSuccess", {
        defaultValue: "Your export receipt is ready.",
      })
    );
  };

  const downloadExport = (format: ProfilePreferenceExportFormat) => {
    if (!account) {
      toast.error(
        t("settings.dataExport.unavailable", {
          defaultValue:
            "Your profile is still loading. Please try again in a moment.",
        })
      );
      return;
    }

    const payload: ProfilePreferencesExportPayload = {
      format: "get-phame-profile-preferences/v1",
      exportedAt: new Date().toISOString(),
      account: {
        displayName: account.name,
        email: account.email,
      },
      businessProfile: {
        businessName: safeString(profile?.businessName),
        reviewLink: safeString(profile?.reviewLink),
        fromName: safeString(profile?.fromName),
        replyTo: safeString(profile?.replyTo),
        consentLabelName: safeString(profile?.consentLabelName),
        physicalAddress: safeString(profile?.physicalAddress),
      },
      preferences: {
        themePreference,
        resolvedTheme: theme,
        hapticsEnabled: Boolean(hapticEnabled),
      },
    };
    const content =
      format === "json"
        ? JSON.stringify(payload, null, 2)
        : serializeProfilePreferencesCsv(payload);
    const contentType =
      format === "json"
        ? "application/json;charset=utf-8"
        : "text/csv;charset=utf-8";
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildProfilePreferencesExportFilename(
      format,
      payload.exportedAt
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    if (testOverride) {
      setPreviewHistory(current => [
        { id: Date.now(), format, exportedAt: Date.now() },
        ...current,
      ]);
    } else {
      recordExport.mutate({ format });
    }
    toast.success(
      t("settings.dataExport.success", {
        defaultValue: "Your profile and preferences download is ready.",
      })
    );
  };

  return (
    <section
      data-testid="settings-profile-data-export"
      className="rounded-2xl bg-white p-5 shadow-sm"
      aria-labelledby="settings-data-export-title"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
          <Download size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="settings-data-export-title"
            className="text-base font-black rr-text-navy"
          >
            {t("settings.dataExport.title", {
              defaultValue: "Download your data",
            })}
          </h2>
          <p className="mt-1 text-sm rr-text-navy-muted">
            {t("settings.dataExport.description", {
              defaultValue:
                "Download your account identity, business profile, and on-device preferences as a JSON or CSV file.",
            })}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-xl rr-bg-surface-darker px-3 py-2 text-xs rr-text-navy-muted">
        {t("settings.dataExport.scope", {
          defaultValue:
            "This download does not include passwords, mail credentials, API keys, payment details, customer records, or diagnostic history.",
        })}
      </p>
      <div
        className="mt-4"
        role="radiogroup"
        aria-label={t("settings.dataExport.formatLabel", {
          defaultValue: "Download format",
        })}
      >
        <p className="text-xs font-bold rr-text-navy-muted">
          {t("settings.dataExport.formatLabel", {
            defaultValue: "Download format",
          })}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["json", "csv"] as const).map(format => (
            <button
              key={format}
              type="button"
              role="radio"
              aria-checked={selectedFormat === format}
              data-testid={`settings-profile-data-export-format-${format}`}
              onClick={() => setSelectedFormat(format)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-black transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                selectedFormat === format
                  ? "border-amber-400 rr-bg-navy rr-text-gold"
                  : "border-slate-200 bg-slate-50 rr-text-navy hover:border-amber-300"
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        data-testid="settings-profile-data-export-download"
        onClick={() => downloadExport(selectedFormat)}
        aria-busy={!account || recordExport.isPending}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white rr-bg-navy"
      >
        {recordExport.isPending ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Download size={16} aria-hidden="true" />
        )}
        {t("settings.dataExport.action", {
          defaultValue: "Download profile and preferences",
        })}
      </button>
      <div className="mt-5 border-t border-slate-100 pt-4" aria-live="polite">
        <div className="flex items-center gap-2">
          <Clock size={15} className="rr-text-gold" aria-hidden="true" />
          <h3 className="text-sm font-black rr-text-navy">
            {t("settings.dataExport.historyTitle", {
              defaultValue: "Download history",
            })}
          </h3>
        </div>
        <div
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
          data-testid="settings-profile-data-export-date-filter"
        >
          <label
            htmlFor="settings-profile-data-export-date-start"
            className="text-xs font-bold rr-text-navy-muted"
          >
            {t("settings.dataExport.filterFrom", { defaultValue: "From date" })}
            <input
              id="settings-profile-data-export-date-start"
              name="exportHistoryStartDate"
              type="date"
              data-testid="settings-profile-data-export-date-start"
              value={historyStartDate}
              max={historyEndDate || undefined}
              onChange={event => setHistoryStartDate(event.target.value)}
              className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 rr-text-navy"
            />
          </label>
          <label
            htmlFor="settings-profile-data-export-date-end"
            className="text-xs font-bold rr-text-navy-muted"
          >
            {t("settings.dataExport.filterTo", { defaultValue: "To date" })}
            <input
              id="settings-profile-data-export-date-end"
              name="exportHistoryEndDate"
              type="date"
              data-testid="settings-profile-data-export-date-end"
              value={historyEndDate}
              min={historyStartDate || undefined}
              onChange={event => setHistoryEndDate(event.target.value)}
              className="mt-1 block min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 rr-text-navy"
            />
          </label>
        </div>
        {(historyStartDate || historyEndDate) && (
          <button
            type="button"
            onClick={() => {
              setHistoryStartDate("");
              setHistoryEndDate("");
            }}
            className="mt-2 min-h-9 rounded-lg px-2 text-xs font-black rr-text-navy hover:rr-bg-surface-darker"
          >
            {t("settings.dataExport.filterClear", {
              defaultValue: "Clear dates",
            })}
          </button>
        )}
        {historyIsLoading ? (
          <div className="mt-3 flex items-center gap-2 text-xs rr-text-navy-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {t("settings.dataExport.historyLoading", {
              defaultValue: "Loading download history…",
            })}
          </div>
        ) : historyHasError ? (
          <div
            className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
            role="alert"
          >
            <span className="rr-text-navy-muted">
              {t("settings.dataExport.historyError", {
                defaultValue: "We could not load your download history.",
              })}
            </span>
            <button
              type="button"
              onClick={() => exportHistory.refetch()}
              className="min-h-9 shrink-0 rounded-lg px-2 font-black rr-text-navy hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {t("settings.dataExport.historyRetry", { defaultValue: "Retry" })}
            </button>
          </div>
        ) : displayedHistory?.length ? (
          <ul
            data-testid="settings-profile-data-export-history"
            className="mt-3 space-y-2"
          >
            {displayedHistory.map(entry => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-xl rr-bg-surface-darker px-3 py-2 text-xs"
              >
                <span className="font-black uppercase rr-text-navy">
                  {entry.format}
                </span>
                <div className="flex items-center gap-2">
                  <time
                    className="text-right rr-text-navy-muted"
                    dateTime={new Date(entry.exportedAt).toISOString()}
                  >
                    {new Date(entry.exportedAt).toLocaleString()}
                  </time>
                  <button
                    type="button"
                    onClick={() => downloadReceipt(entry)}
                    className="min-h-9 rounded-lg px-2 font-black rr-text-navy hover:bg-white"
                    data-testid={`settings-profile-data-export-receipt-${entry.id}`}
                  >
                    {t("settings.dataExport.receiptAction", {
                      defaultValue: "Receipt",
                    })}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs rr-text-navy-muted">
            {historyStartDate || historyEndDate
              ? t("settings.dataExport.historyFilteredEmpty", {
                  defaultValue: "No downloads match those dates.",
                })
              : t("settings.dataExport.historyEmpty", {
                  defaultValue: "Your downloads will appear here.",
                })}
          </p>
        )}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { hapticEnabled, setHapticEnabled } = useHaptics();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const { track } = useAnalytics();

  // ── Profile form state ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } =
    trpc.profile.get.useQuery();
  const { data: quietHoursStatus } =
    trpc.profile.getQuietHoursStatus.useQuery();
  const { data: adaptiveSendStatus } = trpc.contacts.getDailyStatus.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setPhame] = useState("");
  const [consentLabelName, setConsentLabelName] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [quietStart, setQuietStart] = useState("20:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [quietHoursReason, setQuietHoursReason] = useState("");

  // Reminder settings state
  const { data: reminderSettings } = trpc.reminders.getSettings.useQuery();
  const { data: reminderPerformance, isLoading: reminderPerformanceLoading } =
    trpc.reminders.timingPerformance.useQuery();
  const [followUpDelayInput, setFollowUpDelayInput] = useState(
    String(DEFAULT_FOLLOW_UP_DELAY_DAYS)
  );
  const [followUpSecondDelayInput, setFollowUpSecondDelayInput] = useState(
    String(DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS)
  );
  const [followUpFirstEnabled, setFollowUpFirstEnabled] = useState(true);
  const [followUpSecondEnabled, setFollowUpSecondEnabled] = useState(true);
  const [projectionAnchor] = useState(() => Date.now());
  const utils = trpc.useUtils();
  const updateReminderSettings = trpc.reminders.updateSettings.useMutation({
    onSuccess: async (_data, variables) => {
      setFollowUpDelayInput(String(variables.followUpDelayDays));
      setFollowUpSecondDelayInput(String(variables.followUpSecondDelayDays));
      setFollowUpFirstEnabled(variables.followUpFirstEnabled === 1);
      setFollowUpSecondEnabled(variables.followUpSecondEnabled === 1);
      await utils.reminders.getSettings.invalidate();
      toast.success("Follow-up settings saved!");
    },
    onError: err => toast.error(err.message),
  });

  useEffect(() => {
    if (reminderSettings?.followUpDelayDays != null) {
      setFollowUpDelayInput(String(reminderSettings.followUpDelayDays));
    }
    if (reminderSettings?.followUpSecondDelayDays != null) {
      setFollowUpSecondDelayInput(
        String(reminderSettings.followUpSecondDelayDays)
      );
    }
    if (reminderSettings?.followUpFirstEnabled != null) {
      setFollowUpFirstEnabled(reminderSettings.followUpFirstEnabled === 1);
    }
    if (reminderSettings?.followUpSecondEnabled != null) {
      setFollowUpSecondEnabled(reminderSettings.followUpSecondEnabled === 1);
    }
  }, [
    reminderSettings?.followUpDelayDays,
    reminderSettings?.followUpSecondDelayDays,
    reminderSettings?.followUpFirstEnabled,
    reminderSettings?.followUpSecondEnabled,
  ]);

  const followUpDelayIsValid = isValidFollowUpDelayDays(followUpDelayInput);
  const followUpSecondDelayIsValid = isValidFollowUpDelayDays(
    followUpSecondDelayInput
  );
  const savedFollowUpDelayDays =
    reminderSettings?.followUpDelayDays ?? DEFAULT_FOLLOW_UP_DELAY_DAYS;
  const savedFollowUpSecondDelayDays =
    reminderSettings?.followUpSecondDelayDays ??
    DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS;
  const savedFollowUpFirstEnabled =
    (reminderSettings?.followUpFirstEnabled ?? 1) === 1;
  const savedFollowUpSecondEnabled =
    (reminderSettings?.followUpSecondEnabled ?? 1) === 1;
  const editedFollowUpDelayDays = normalizeFollowUpDelayDays(
    followUpDelayInput,
    savedFollowUpDelayDays
  );
  const editedFollowUpSecondDelayDays = normalizeFollowUpDelayDays(
    followUpSecondDelayInput,
    savedFollowUpSecondDelayDays
  );
  const followUpTimingIsValid =
    followUpDelayIsValid && followUpSecondDelayIsValid;
  const followUpTimingHasChanges =
    followUpTimingIsValid &&
    (editedFollowUpDelayDays !== savedFollowUpDelayDays ||
      editedFollowUpSecondDelayDays !== savedFollowUpSecondDelayDays ||
      followUpFirstEnabled !== savedFollowUpFirstEnabled ||
      followUpSecondEnabled !== savedFollowUpSecondEnabled);
  const projectedFollowUpDates = getProjectedFollowUpDates(
    projectionAnchor,
    editedFollowUpDelayDays,
    editedFollowUpSecondDelayDays
  );
  const formatProjectedDate = (date: Date) =>
    date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const { data: reEngagementSettings } =
    trpc.profile.getReEngagementSettings.useQuery();
  const updateReEngagementSettings =
    trpc.profile.updateReEngagementSettings.useMutation({
      onSuccess: () => {
        toast.success("Re-engagement settings saved!");
      },
      onError: err => toast.error(err.message),
    });

  // Populate form once profile loads (useEffect avoids render-phase setState)
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName);
      setPhame(profile.reviewLink);
      setConsentLabelName(profile.consentLabelName ?? "");
      setFromName(profile.fromName ?? "");
      setReplyTo(profile.replyTo ?? "");
      setPhysicalAddress(profile.physicalAddress ?? "");
      setQuietStart(minutesToTime(profile.quietHoursStartMinutes, "20:00"));
      setQuietEnd(minutesToTime(profile.quietHoursEndMinutes, "08:00"));
    }
  }, [profile?.id]);

  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Business profile saved!");
    },
    onError: err => toast.error(err.message),
  });
  const updateQuietHours = trpc.profile.updateQuietHours.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.profile.get.invalidate(),
        utils.profile.getQuietHoursStatus.invalidate(),
      ]);
      toast.success(
        t("quietHours.toastSaved", {
          defaultValue: "Business-local quiet hours saved.",
        })
      );
    },
    onError: err => toast.error(err.message),
  });
  const requestQuietHoursShortening =
    trpc.profile.requestQuietHoursShortening.useMutation({
      onSuccess: result => {
        if (result.alreadyApproved) {
          toast.success(
            t("quietHours.toastPermissionActive", {
              defaultValue:
                "Your quiet-hours shortening permission is already active.",
            })
          );
          return;
        }
        setQuietHoursReason("");
        toast.success(
          t("quietHours.toastRequested", {
            defaultValue:
              "Your exception request has been sent to support@getphame.app.",
          })
        );
      },
      onError: err => toast.error(err.message),
    });

  // ── Onboarding status ──────────────────────────────────────────────────────
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery();

  // ── Onboarding reset ─────────────────────────────────────────────────────
  const resetOnboarding = trpc.onboarding.reset.useMutation({
    onSuccess: () => {
      utils.onboarding.status.invalidate();
      toast.success("Setup wizard reopened! Check the home screen.");
    },
    onError: err => toast.error(err.message),
  });

  // ── WooCommerce credentials ───────────────────────────────────────────────
  const { data: wooCreds } = trpc.woo.getCredentials.useQuery();
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [wooSecretTouched, setWooSecretTouched] = useState(false);
  const [showWooSecret, setShowWooSecret] = useState(false);
  const [wooFormOpen, setWooFormOpen] = useState(false);

  const saveWooCreds = trpc.woo.saveCredentials.useMutation({
    onSuccess: () => {
      utils.woo.getCredentials.invalidate();
      toast.success("WooCommerce store connected!");
      setWooFormOpen(false);
      setWooKey("");
      setWooSecret("");
    },
    onError: err => toast.error(err.message),
  });

  const { data: syncHistory } = trpc.woo.syncHistory.useQuery(undefined, {
    enabled: !!wooCreds,
  });
  const quickSync = trpc.woo.sync.useMutation({
    onSuccess: result => {
      utils.woo.getCredentials.invalidate();
      utils.woo.listPending.invalidate();
      utils.woo.pendingCount.invalidate();
      if ((result.staged ?? result.added) > 0) {
        toast.success(
          `Synced — ${result.staged ?? result.added} order${(result.staged ?? result.added) !== 1 ? "s" : ""} staged for import. Review them in the Pending Imports banner below.`,
          { duration: 6000 }
        );
      } else {
        toast.success("Sync complete — no new orders found.");
      }
    },
    onError: err => toast.error(`Sync failed: ${err.message}`),
  });

  // ── WooCommerce pending imports ────────────────────────────────────────────
  const { data: wooPending } = trpc.woo.pendingCount.useQuery(undefined, {
    enabled: !!wooCreds,
  });
  const importPending = trpc.woo.importPending.useMutation({
    onSuccess: result => {
      utils.woo.pendingCount.invalidate();
      utils.woo.listPending.invalidate();
      toast.success(
        `Imported ${result.imported} customer${result.imported !== 1 ? "s" : ""} from WooCommerce.`
      );
    },
    onError: err => toast.error(err.message),
  });
  const dismissPending = trpc.woo.dismissPending.useMutation({
    onSuccess: () => {
      utils.woo.pendingCount.invalidate();
      toast.success("Pending imports dismissed.");
    },
    onError: err => toast.error(err.message),
  });

  function handleSaveWoo() {
    if (!wooUrl.trim()) {
      toast.error("Store URL is required");
      return;
    }
    if (!wooKey.trim()) {
      toast.error("Consumer Key is required");
      return;
    }
    if (!wooSecret.trim()) {
      toast.error("Consumer Secret is required");
      return;
    }
    saveWooCreds.mutate({
      storeUrl: wooUrl.trim(),
      consumerKey: wooKey.trim(),
      consumerSecret: wooSecret.trim(),
    });
  }

  // ── Webhooks ───────────────────────────────────────────────────────────────
  const { data: webhookList } = trpc.webhook.list.useQuery();
  const { data: notifPrefs } = trpc.notificationPrefs.get.useQuery();
  const updateNotifPrefs = trpc.notificationPrefs.update.useMutation({
    onSuccess: () => {
      utils.notificationPrefs.get.invalidate();
      toast.success("Notification preference saved.");
    },
    onError: err => toast.error(err.message),
  });
  const toggleOnboardingTips = () => {
    const onboardingTipsEnabled = !(notifPrefs?.onboardingTipsEnabled ?? true);
    updateNotifPrefs.mutate(
      { onboardingTipsEnabled },
      {
        onSuccess: () =>
          window.dispatchEvent(
            new CustomEvent("rr:onboarding-tips-change", {
              detail: { tipsEnabled: onboardingTipsEnabled },
            })
          ),
      }
    );
  };
  const [expandedWebhookId, setExpandedWebhookId] = useState<number | null>(
    null
  );
  const { data: webhookLogs } = trpc.webhook.deliveryLogs.useQuery(
    { webhookId: expandedWebhookId ?? 0, limit: 5 },
    { enabled: expandedWebhookId !== null }
  );
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookLabel, setNewWebhookLabel] = useState("My Webhook");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const createWebhook = trpc.webhook.create.useMutation({
    onSuccess: () => {
      utils.webhook.list.invalidate();
      setShowAddWebhook(false);
      setNewWebhookUrl("");
      setNewWebhookLabel("My Webhook");
      setNewWebhookSecret("");
      toast.success("Webhook created.");
    },
    onError: err => toast.error(err.message),
  });
  const deleteWebhook = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      utils.webhook.list.invalidate();
      toast.success("Webhook deleted.");
    },
    onError: err => toast.error(err.message),
  });
  const testWebhook = trpc.webhook.test.useMutation({
    onSuccess: data => {
      if (data.success)
        toast.success(`Test ping sent — got HTTP ${data.status}`);
      else toast.error(`Webhook test failed (HTTP ${data.status})`);
    },
    onError: err => toast.error(err.message),
  });
  const retryDelivery = trpc.webhook.retryDelivery.useMutation({
    onSuccess: data => {
      utils.webhook.deliveryLogs.invalidate();
      if (data.success) toast.success(`Retry succeeded — HTTP ${data.status}`);
      else toast.error(`Retry failed (HTTP ${data.status ?? "ERR"})`);
    },
    onError: err => toast.error(err.message),
  });

  // ── Review Platforms ─────────────────────────────────────────────────────
  const { data: platforms, isLoading: platformsLoading } =
    trpc.reviewPlatforms.list.useQuery();
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState<number | null>(
    null
  );
  const [newPlatformType, setNewPlatformType] = useState<string>("google");
  const [newPlatformUrl, setNewPlatformUrl] = useState("");
  const [newPlatformLabel, setNewPlatformLabel] = useState("");

  const addPlatform = trpc.reviewPlatforms.add.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      setShowAddPlatform(false);
      setNewPlatformUrl("");
      setNewPlatformLabel("");
      setNewPlatformType("google");
    },
    onError: err => toast.error(err.message),
  });

  const updatePlatform = trpc.reviewPlatforms.update.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      setEditingPlatformId(null);
    },
    onError: err => toast.error(err.message),
  });

  const restorePlatform = trpc.reviewPlatforms.restore.useMutation({
    onSuccess: () => utils.reviewPlatforms.list.invalidate(),
    onError: err => toast.error(`Restore failed: ${err.message}`),
  });

  const removePlatform = trpc.reviewPlatforms.remove.useMutation({
    onSuccess: (_, _variables) => {
      utils.reviewPlatforms.list.invalidate();
    },
    onError: err => {
      utils.reviewPlatforms.list.invalidate(); // re-sync in case of partial state
      toast.error(`Could not remove platform: ${err.message}`);
    },
  });

  const setDefaultPlatform = trpc.reviewPlatforms.setDefault.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      toast.success("Default platform updated!");
    },
    onError: err => toast.error(err.message),
  });

  const PLATFORM_LABELS: Record<string, string> = {
    google: "Google",
    yelp: "Yelp",
    tripadvisor: "TripAdvisor",
    bing: "Bing",
    facebook: "Facebook",
    apple: "Apple Maps",
    other: "Other",
  };
  // PLATFORM_ICONS kept for <select name="rr-pages-settings-field-1579"> option text only (SVG can't go inside <option>)
  const PLATFORM_ICONS: Record<string, string> = {
    google: "Google",
    yelp: "Yelp",
    tripadvisor: "TripAdvisor",
    bing: "Bing",
    facebook: "Facebook",
    apple: "Apple Maps",
    other: "Other",
  };
  const PLATFORM_PLACEHOLDERS: Record<string, string> = {
    google: "https://g.page/r/your-business/review",
    yelp: "e.g. Search for [Your Business Name] on Yelp in [City, State]",
    tripadvisor: "https://www.tripadvisor.com/Restaurant_Review-...",
    bing: "https://www.bingplaces.com/...",
    facebook: "https://www.facebook.com/your-page/reviews",
    apple: "https://maps.apple.com/?cid=your-business-id",
    other: "https://...",
  };

  // ── SMTP email connection ──────────────────────────────────────────────────
  const { data: smtpStatus, isLoading: smtpLoading } =
    trpc.smtp.status.useQuery();
  const { data: smtpTestEmailHistory, isLoading: smtpTestEmailHistoryLoading } =
    trpc.smtp.testEmailHistory.useQuery();
  const { data: pausedAutomationQueue } =
    trpc.smtp.pausedAutomationQueue.useQuery();
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpEmailTouched, setSmtpEmailTouched] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPasswordTouched, setSmtpPasswordTouched] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(0);
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpHint, setSmtpHint] = useState<string | null>(null);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    ok: boolean;
    error?: string | null;
  } | null>(null);
  const [smtpConnectionSavedNotice, setSmtpConnectionSavedNotice] =
    useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [testEmailSentNotice, setTestEmailSentNotice] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [disconnectAcknowledged, setDisconnectAcknowledged] = useState(false);
  const normalizedSmtpEmail = smtpEmail.trim().toLowerCase();
  const smtpEmailValidation =
    smtpEmailTouched && normalizedSmtpEmail.length > 0
      ? EMAIL_ADDRESS_PATTERN.test(normalizedSmtpEmail)
        ? "valid"
        : "invalid"
      : "idle";
  const smtpPasswordValidation = smtpPasswordTouched
    ? smtpPassword.trim().length > 0
      ? "valid"
      : "invalid"
    : "idle";

  useEffect(() => {
    const focusSmtp =
      window.location.hash === "#smtp-settings" ||
      new URLSearchParams(window.location.search).get("focus") === "smtp";
    if (smtpLoading || !focusSmtp) return;
    window.setTimeout(
      () =>
        document
          .getElementById("smtp-settings")
          ?.scrollIntoView({ block: "start" }),
      0
    );
  }, [smtpLoading]);

  // Auto-detect SMTP settings when email changes; also pass host so hint fires for Google Workspace
  const { data: smtpDetect } = trpc.smtp.detect.useQuery(
    { email: smtpEmail, host: smtpHost || undefined },
    { enabled: smtpEmail.includes("@") && smtpEmail.includes(".") }
  );
  useEffect(() => {
    if (smtpDetect?.detected) {
      setSmtpHost(smtpDetect.detected.host);
      setSmtpPort(smtpDetect.detected.port);
      setSmtpSecure(smtpDetect.detected.secure);
    }
    setSmtpHint(smtpDetect?.hint ?? null);
    // Auto-expand Advanced panel for custom/unrecognised domains
    if (smtpDetect && !smtpDetect.detected?.host) {
      setShowAdvanced(true);
    }
  }, [smtpDetect]);

  const connectSmtp = trpc.smtp.connect.useMutation({
    onSuccess: () => {
      utils.smtp.status.invalidate();
      setShowSmtpForm(false);
      setSmtpPassword("");
      setSmtpConnectionSavedNotice(true);
      track("smtp_connect");
      toast.success("Email account connected!");
    },
    onError: err => toast.error(err.message),
  });

  const disconnectSmtp = trpc.smtp.disconnect.useMutation({
    onSuccess: () => {
      utils.smtp.status.invalidate();
      utils.smtp.testEmailHistory.invalidate();
      utils.smtp.pausedAutomationQueue.invalidate();
      setDisconnectConfirmOpen(false);
      setDisconnectAcknowledged(false);
      setSmtpConnectionSavedNotice(false);
      setTestEmailSentNotice(false);
      setSmtpPassword("");
      setShowSmtpForm(true);
      toast.success(
        "Email account disconnected. Connect a new server to resume outreach."
      );
    },
    onError: err => toast.error(err.message),
  });

  const testSmtp = trpc.smtp.test.useMutation({
    onSuccess: result => {
      utils.smtp.status.invalidate();
      if (result.ok) {
        toast.success("Connection verified — your email is working correctly.");
      } else {
        toast.error(`Connection failed: ${result.error ?? "Unknown error"}`);
      }
    },
    onError: err => toast.error(err.message),
  });

  const testCredentials = trpc.smtp.testCredentials.useMutation({
    onSuccess: result => {
      setSmtpTestResult(result);
    },
    onError: err => {
      setSmtpTestResult({ ok: false, error: err.message });
    },
  });

  // ── Email preview ─────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: previewData, isLoading: previewLoading } =
    trpc.smtp.previewEmail.useQuery(undefined, { enabled: previewOpen });

  const resendWelcome = trpc.smtp.sendWelcome.useMutation({
    onSuccess: () => {
      toast.success(
        `Confirmation email sent! Check your inbox at ${smtpStatus?.email ?? "your email"}.`,
        { duration: 5000 }
      );
    },
    onError: err => toast.error(err.message),
  });

  const sendSmtpTestEmail = trpc.smtp.sendTestEmail.useMutation({
    onSuccess: ({ to }) => {
      setTestEmailSentNotice(true);
      utils.smtp.testEmailHistory.invalidate();
      toast.success(`Test email sent to ${to}.`, { duration: 5000 });
    },
    onError: err => {
      utils.smtp.testEmailHistory.invalidate();
      toast.error(err.message);
    },
  });

  const retryFailedSmtpTestEmail = () => {
    setTestEmailSentNotice(false);
    setTestEmailRecipient(current => current || smtpStatus?.email || "");
    window.setTimeout(
      () => document.getElementById("smtp-test-email-recipient")?.focus(),
      0
    );
  };

  function handleSaveProfile() {
    if (!businessName.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (!reviewLink.trim()) {
      toast.error("Google review link is required");
      return;
    }
    upsertProfile.mutate({
      businessName: businessName.trim(),
      reviewLink: reviewLink.trim(),
      fromName: fromName.trim() || undefined,
      replyTo: replyTo.trim() || undefined,
      consentLabelName: consentLabelName.trim() || undefined,
    });
  }

  const quietStartMinutes = timeToMinutes(quietStart);
  const quietEndMinutes = timeToMinutes(quietEnd);
  const quietDuration = quietDurationMinutes(
    quietStartMinutes,
    quietEndMinutes
  );
  const quietHoursShorteningApproved =
    quietHoursStatus?.profile?.quietHoursShorteningApproved === 1;
  const requiresQuietHoursException =
    !quietHoursShorteningApproved && quietDuration < QUIET_HOURS_MINUTES;
  const profileHasUnsavedChanges = profile
    ? businessName !== profile.businessName ||
      reviewLink !== profile.reviewLink ||
      fromName !== (profile.fromName ?? "") ||
      replyTo !== (profile.replyTo ?? "") ||
      consentLabelName !== (profile.consentLabelName ?? "")
    : false;
  const quietHoursHasUnsavedChanges = profile
    ? physicalAddress !== (profile.physicalAddress ?? "") ||
      quietStart !== minutesToTime(profile.quietHoursStartMinutes, "20:00") ||
      quietEnd !== minutesToTime(profile.quietHoursEndMinutes, "08:00") ||
      quietHoursReason.trim().length > 0
    : false;
  useUpdateDirtySource(
    "settings-core-forms",
    profileHasUnsavedChanges ||
      quietHoursHasUnsavedChanges ||
      followUpTimingHasChanges
  );

  function handleSaveQuietHours() {
    if (!physicalAddress.trim()) {
      toast.error(
        t("quietHours.toastAddressRequired", {
          defaultValue:
            "Enter your physical business address so we can determine local time.",
        })
      );
      return;
    }
    if (requiresQuietHoursException) {
      if (quietHoursReason.trim().length < 10) {
        toast.error(
          t("quietHours.toastReasonRequired", {
            defaultValue:
              "Please explain why a shorter quiet period is needed.",
          })
        );
        return;
      }
      requestQuietHoursShortening.mutate({
        requestedStartMinutes: quietStartMinutes,
        requestedEndMinutes: quietEndMinutes,
        reason: quietHoursReason.trim(),
      });
      return;
    }
    updateQuietHours.mutate({
      physicalAddress: physicalAddress.trim(),
      quietHoursStartMinutes: quietStartMinutes,
      quietHoursEndMinutes: quietEndMinutes,
    });
  }

  if (profileLoading) {
    return (
      <SettingsSkeleton
        title={t("tabs.account", { defaultValue: "Account & Profile" })}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen pb-40 rr-bg-cream-warm">
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
        {/* Navy Header */}
        <div className="px-5 pt-14 md:pt-6 pb-6 rr-bg-navy">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Settings size={16} className="rr-text-gold" />
              <span className="text-xs font-bold tracking-widest uppercase rr-text-gold">
                {t("nav.settings")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors rr-text-gold"
                style={{ background: "oklch(0.32 0.08 260)" }}
                aria-label={
                  theme === "dark"
                    ? t("theme.switchToLight", {
                        defaultValue: "Switch to light mode",
                      })
                    : t("theme.switchToDark", {
                        defaultValue: "Switch to dark mode",
                      })
                }
                title={theme === "dark" ? t("theme.light") : t("theme.dark")}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                onClick={() => setGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold rr-text-gold"
                style={{ background: "oklch(0.32 0.08 260)" }}
              >
                <BookOpen size={13} />
                {t("nav.guide")}
              </button>
              <LanguageFlyout />
            </div>
          </div>
          <h1 className="text-2xl text-white rr-fw-black">
            {t("tabs.account", { defaultValue: "Account & Profile" })}
          </h1>
          {user && (
            <div className="flex items-center gap-2 mt-1">
              <p
                className="text-sm"
                style={{ color: "var(--text-on-dark-secondary)" }}
              >
                {user.name ?? user.email ?? "Signed in"}
              </p>
            </div>
          )}
        </div>

        <div className="px-4 py-4 lg:px-8 lg:py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            <AccountProfileCard />
            <ThemePreferenceCard />
            <ProfilePreferencesExportCard
              profile={profile as ProfileData | null | undefined}
            />
            <PasskeySecurityCard />
            <RecoveryDrillCard />
            {/* ── Business Profile ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={18} className="rr-text-navy" />
                <h2 className="text-base font-black rr-text-navy">
                  {t("profile.title")}
                </h2>
              </div>

              {profileLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin rr-text-navy" />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      {t("profile.businessName")} *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder="e.g. Maria's Hair Salon"
                      className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none border-2 transition-all"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-business-name-1877"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      <Link2 size={12} className="inline mr-1" />
                      {t("profile.reviewLink")} *
                    </label>
                    <input
                      type="url"
                      value={reviewLink}
                      onChange={e => setPhame(e.target.value)}
                      placeholder="https://g.page/r/your-business/review"
                      className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-review-link-1896"
                    />
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      {t("profile.reviewLinkDescription")}
                    </p>
                  </div>

                  {/* ── Email Sender Settings ───────────────────────────────── */}
                  <div
                    className="rounded-xl p-3 mt-1 rr-bg-white-card"
                    style={{ border: "1px solid oklch(0.90 0.02 260)" }}
                  >
                    <p className="text-xs font-black mb-3 rr-text-navy-mid">
                      {t("profile.emailSenderSettings", {
                        defaultValue: "Email Sender Settings",
                      })}
                    </p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                          {t("profile.fromName")}
                        </label>
                        <input
                          type="text"
                          value={fromName}
                          onChange={e => setFromName(e.target.value)}
                          placeholder={
                            businessName || "e.g. Maria's Hair Salon"
                          }
                          className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-from-name-1925"
                        />
                        <p className="text-xs mt-1 rr-text-navy-muted">
                          {t("profile.fromNameDescription")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                          {t("profile.replyToEmail")}
                        </label>
                        <input
                          type="email"
                          value={replyTo}
                          onChange={e => setReplyTo(e.target.value)}
                          placeholder="e.g. steve@sk-america.com"
                          className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-reply-to-1940"
                          autoComplete="email"
                        />
                        <p className="text-xs mt-1 rr-text-navy-muted">
                          {t("profile.replyToEmailDescription")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                          {t("profile.consentLabelName", {
                            defaultValue: "Consent checkbox business name",
                          })}{" "}
                          <span className="font-normal">
                            (
                            {t("common.optional", { defaultValue: "optional" })}
                            )
                          </span>
                        </label>
                        <input
                          type="text"
                          value={consentLabelName}
                          onChange={e => setConsentLabelName(e.target.value)}
                          placeholder={
                            businessName || "e.g. Maria's Hair Salon"
                          }
                          className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-consent-label-name-1955"
                        />
                        <p className="text-xs mt-1 rr-text-navy-muted">
                          {t("profile.consentLabelNameDescription", {
                            defaultValue:
                              "The business name shown in the consent checkbox label on your forms. Defaults to your business name above.",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <section
                    className="rounded-xl p-4 flex flex-col gap-3"
                    aria-labelledby="quiet-hours-heading"
                    style={{
                      border: "1px solid oklch(0.80 0.18 80 / 0.45)",
                      background: "oklch(0.985 0.012 85)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="shrink-0 rounded-lg p-2"
                        style={{
                          background: "oklch(0.80 0.18 80 / 0.22)",
                          color: "oklch(0.22 0.09 260)",
                        }}
                      >
                        <Moon size={17} aria-hidden="true" />
                      </div>
                      <div>
                        <h3
                          id="quiet-hours-heading"
                          className="text-sm font-black rr-text-navy"
                        >
                          {t("quietHours.title", {
                            defaultValue: "Customer quiet hours",
                          })}
                        </h3>
                        <p className="text-xs mt-0.5 rr-text-navy-muted">
                          {t("quietHours.subtitle", {
                            defaultValue:
                              "Review-request emails wait during your business’s local quiet period and resume after it ends.",
                          })}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="quiet-hours-address"
                        className="block text-xs font-bold mb-1 rr-text-navy-mid"
                      >
                        <MapPin
                          size={12}
                          className="inline mr-1"
                          aria-hidden="true"
                        />
                        {t("quietHours.addressLabel", {
                          defaultValue: "Physical business address",
                        })}
                      </label>
                      <input
                        id="quiet-hours-address"
                        type="text"
                        autoComplete="street-address"
                        value={physicalAddress}
                        onChange={event =>
                          setPhysicalAddress(event.target.value)
                        }
                        placeholder={t("quietHours.addressPlaceholder", {
                          defaultValue:
                            "Street address, city, region, postal code, country",
                        })}
                        className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                        style={{
                          border: "2px solid oklch(0.90 0.02 260)",
                          fontSize: "16px",
                        }}
                      />
                      <p className="text-xs mt-1 rr-text-navy-muted">
                        {quietHoursStatus?.profile?.businessTimeZone
                          ? t("quietHours.addressTimezoneVerified", {
                              defaultValue:
                                "Verified local timezone: {{timezone}}.",
                              timezone:
                                quietHoursStatus.profile.businessTimeZone,
                            })
                          : t("quietHours.addressTimezonePending", {
                              defaultValue:
                                "We verify this address and derive its IANA timezone before saving.",
                            })}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="quiet-hours-start"
                          className="block text-xs font-bold mb-1 rr-text-navy-mid"
                        >
                          {t("quietHours.startLabel", {
                            defaultValue: "Quiet period starts",
                          })}
                        </label>
                        <input
                          id="quiet-hours-start"
                          type="time"
                          value={quietStart}
                          onChange={event => setQuietStart(event.target.value)}
                          className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="quiet-hours-end"
                          className="block text-xs font-bold mb-1 rr-text-navy-mid"
                        >
                          {t("quietHours.endLabel", {
                            defaultValue: "Quiet period ends",
                          })}
                        </label>
                        <input
                          id="quiet-hours-end"
                          type="time"
                          value={quietEnd}
                          onChange={event => setQuietEnd(event.target.value)}
                          className="rr-form-field w-full px-3 py-3 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: "white",
                        border: "1px solid oklch(0.90 0.02 260)",
                      }}
                      aria-live="polite"
                    >
                      <p className="font-bold rr-text-navy">
                        {quietHoursShorteningApproved
                          ? t("quietHours.durationApproved", {
                              defaultValue:
                                "{{minutes}}-minute quiet period (support permission active)",
                              minutes: quietDuration,
                            })
                          : t("quietHours.durationStandard", {
                              defaultValue: "{{minutes}}-minute quiet period",
                              minutes: quietDuration,
                            })}
                      </p>
                      <p className="mt-1 rr-text-navy-muted">
                        {t("quietHours.legalNote", {
                          defaultValue:
                            "The default 8:00 PM–8:00 AM local window is a customer-respect standard. CAN-SPAM does not set a time-of-day sending rule; it still requires compliant identification and opt-out handling.",
                        })}
                      </p>
                    </div>

                    {requiresQuietHoursException && (
                      <div
                        className="rounded-lg p-3"
                        style={{
                          background: "oklch(0.96 0.04 80)",
                          border: "1px solid oklch(0.80 0.18 80 / 0.55)",
                        }}
                      >
                        <p className="text-xs font-black rr-text-navy">
                          {t("quietHours.exceptionTitle", {
                            defaultValue:
                              "A shorter quiet period needs support permission",
                          })}
                        </p>
                        <p className="text-xs mt-1 rr-text-navy-muted">
                          {t("quietHours.exceptionDescription", {
                            defaultValue:
                              "Tell support why your business needs this exception. Your current protection remains active until it is approved.",
                          })}
                        </p>
                        <label htmlFor="quiet-hours-reason" className="sr-only">
                          Reason for quiet-hours exception
                        </label>
                        <textarea
                          id="quiet-hours-reason"
                          value={quietHoursReason}
                          onChange={event =>
                            setQuietHoursReason(event.target.value)
                          }
                          placeholder={t("quietHours.exceptionPlaceholder", {
                            defaultValue:
                              "Explain the operational need for a shorter local quiet period.",
                          })}
                          rows={3}
                          className="rr-form-field w-full mt-2 px-3 py-2 rounded-xl text-sm outline-none resize-y"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                        />
                      </div>
                    )}

                    {quietHoursStatus?.queuedCount ? (
                      <div
                        className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                        style={{
                          background: "oklch(0.22 0.09 260)",
                          color: "var(--text-on-dark-secondary)",
                        }}
                        aria-live="polite"
                      >
                        <Clock
                          size={15}
                          className="mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <p>
                          {quietHoursStatus.nextQueuedAt
                            ? t("quietHours.queuedWithDate", {
                                defaultValue:
                                  "{{count}} review request is queued for delivery after quiet hours, beginning {{date}}.",
                                count: quietHoursStatus.queuedCount,
                                date: new Date(
                                  quietHoursStatus.nextQueuedAt
                                ).toLocaleString(i18n.language),
                              })
                            : t("quietHours.queued", {
                                defaultValue:
                                  "{{count}} review request is queued for delivery after quiet hours.",
                                count: quietHoursStatus.queuedCount,
                              })}
                        </p>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleSaveQuietHours}
                      disabled={
                        updateQuietHours.isPending ||
                        requestQuietHoursShortening.isPending
                      }
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                      style={{
                        background: requiresQuietHoursException
                          ? "oklch(0.22 0.09 260)"
                          : "oklch(0.80 0.18 80)",
                        color: requiresQuietHoursException
                          ? "white"
                          : "oklch(0.22 0.09 260)",
                        fontFamily: "'Poppins', sans-serif",
                        opacity:
                          updateQuietHours.isPending ||
                          requestQuietHoursShortening.isPending
                            ? 0.7
                            : 1,
                      }}
                    >
                      {updateQuietHours.isPending ||
                      requestQuietHoursShortening.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      {requiresQuietHoursException
                        ? t("quietHours.requestPermission", {
                            defaultValue: "Request support permission",
                          })
                        : t("quietHours.save", {
                            defaultValue: "Save quiet hours",
                          })}
                    </button>
                  </section>

                  <button
                    onClick={handleSaveProfile}
                    disabled={upsertProfile.isPending}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                    style={{
                      background: "oklch(0.22 0.09 260)",
                      color: "white",
                      fontFamily: "'Poppins', sans-serif",
                      opacity: upsertProfile.isPending ? 0.7 : 1,
                    }}
                  >
                    {upsertProfile.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {t("profile.saveProfile")}
                  </button>
                </div>
              )}
            </div>
            {/* ── Review Platforms ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="rr-text-navy" />
                  <h2 className="text-base font-black rr-text-navy">
                    {t("reviewPlatforms.title", {
                      defaultValue: "Review Platforms",
                    })}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowAddPlatform(true);
                    setEditingPlatformId(null);
                  }}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors rr-bg-gold rr-text-navy"
                >
                  <Plus size={12} />
                  {t("reviewPlatforms.add")}
                </button>
              </div>
              <p className="text-xs mb-4 rr-text-navy-muted">
                Add your review page URLs for Google, TripAdvisor, Bing,
                Facebook, and more. For Yelp, enter a plain-text search
                instruction — this text will appear in the email body instead of
                a link, keeping you compliant with Yelp's review solicitation
                policy.
              </p>

              {platformsLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="animate-spin rr-text-navy" size={18} />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(platforms ?? []).map(p => (
                    <div key={p.id}>
                      {editingPlatformId === p.id ? (
                        /* Edit form inline */
                        <div
                          className="rounded-xl p-3 flex flex-col gap-2"
                          style={{
                            border: "2px solid oklch(0.80 0.18 80)",
                            background: "oklch(0.98 0.01 80)",
                          }}
                        >
                          {p.platform === "yelp" && (
                            <div className="flex items-start gap-1.5 mb-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="cursor-help inline-flex items-center mt-0.5 shrink-0"
                                    style={{ color: "oklch(0.55 0.04 260)" }}
                                  >
                                    <Info size={13} />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs text-xs leading-relaxed"
                                >
                                  <strong>
                                    {t("reviewPlatforms.whyNoLinkTitle", {
                                      defaultValue: "Why no link?",
                                    })}
                                  </strong>{" "}
                                  {t("reviewPlatforms.yelpNoLinkEdit", {
                                    defaultValue:
                                      "Yelp's Terms of Service prohibit directly soliciting reviews via a link. A plain-text search instruction keeps your emails compliant — customers find your listing themselves.",
                                  })}
                                </TooltipContent>
                              </Tooltip>
                              <p className="text-sm font-semibold rr-text-navy-mid">
                                {t("reviewPlatforms.yelpEditHelp", {
                                  defaultValue:
                                    "Enter a plain-text search instruction. This text appears in the email — no link is generated, keeping you Yelp-compliant.",
                                })}
                              </p>
                            </div>
                          )}
                          <input
                            type={p.platform === "yelp" ? "text" : "url"}
                            defaultValue={p.url}
                            id={`edit-url-${p.id}`}
                            placeholder={
                              PLATFORM_PLACEHOLDERS[p.platform] ?? "https://..."
                            }
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                            style={{
                              border: "2px solid oklch(0.90 0.02 260)",
                              fontSize: "16px",
                            }}
                          />
                          {p.platform === "other" && (
                            <input
                              type="text"
                              defaultValue={p.label ?? ""}
                              id={`edit-label-${p.id}`}
                              placeholder={t(
                                "reviewPlatforms.customLabelPlaceholder",
                                { defaultValue: "Custom label (e.g. Houzz)" }
                              )}
                              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                              style={{
                                border: "2px solid oklch(0.90 0.02 260)",
                                fontSize: "16px",
                              }}
                            />
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const urlEl = document.getElementById(
                                  `edit-url-${p.id}`
                                ) as HTMLInputElement | null;
                                const labelEl = document.getElementById(
                                  `edit-label-${p.id}`
                                ) as HTMLInputElement | null;
                                if (!urlEl?.value?.trim()) {
                                  toast.error(
                                    p.platform === "yelp"
                                      ? t(
                                          "reviewPlatforms.searchInstructionRequired",
                                          {
                                            defaultValue:
                                              "Search instruction is required",
                                          }
                                        )
                                      : t("reviewPlatforms.urlRequired", {
                                          defaultValue: "URL is required",
                                        })
                                  );
                                  return;
                                }
                                const promise = updatePlatform.mutateAsync({
                                  id: p.id,
                                  url: urlEl.value.trim(),
                                  label: labelEl?.value?.trim() || undefined,
                                });
                                toast.promise(promise, {
                                  loading: t("reviewPlatforms.saving", {
                                    defaultValue: "Saving...",
                                  }),
                                  success: t("reviewPlatforms.updateSuccess", {
                                    defaultValue: "Platform updated!",
                                  }),
                                  error: err =>
                                    err?.message ??
                                    t("reviewPlatforms.updateError", {
                                      defaultValue: "Failed to update platform",
                                    }),
                                });
                              }}
                              disabled={updatePlatform.isPending}
                              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold rr-bg-navy text-white"
                            >
                              {updatePlatform.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Save size={12} />
                              )}
                              {t("reviewPlatforms.save", {
                                defaultValue: "Save",
                              })}
                            </button>
                            <button
                              onClick={() => setEditingPlatformId(null)}
                              aria-label={t("reviewPlatforms.cancel", {
                                defaultValue: "Cancel",
                              })}
                              title={t("reviewPlatforms.cancel", {
                                defaultValue: "Cancel",
                              })}
                              className="px-3 py-2 rounded-lg text-xs font-bold rr-text-navy-mid"
                              style={{ background: "oklch(0.93 0.02 260)" }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Platform row */
                        <div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                          style={{
                            background: p.isDefault
                              ? "oklch(0.96 0.04 145)"
                              : "oklch(0.97 0.01 260)",
                            border: p.isDefault
                              ? "1px solid oklch(0.80 0.15 145)"
                              : "1px solid oklch(0.92 0.02 260)",
                          }}
                        >
                          <PlatformIcon
                            platform={p.platform}
                            size={22}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black rr-text-navy">
                                {p.label ||
                                  PLATFORM_LABELS[p.platform] ||
                                  p.platform}
                              </span>
                              {p.isDefault === 1 && (
                                <span
                                  className="text-xs font-bold px-1.5 py-0.5 rounded-full rr-bg-gold rr-text-navy"
                                  style={{ fontSize: "9px" }}
                                >
                                  {t("reviewPlatforms.default", {
                                    defaultValue: "DEFAULT",
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs truncate rr-text-navy-muted">
                              {p.url}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {p.isDefault !== 1 && (
                              <button
                                onClick={() =>
                                  setDefaultPlatform.mutate({ id: p.id })
                                }
                                title={t("reviewPlatforms.setAsDefault", {
                                  defaultValue: "Set as default",
                                })}
                                aria-label={t("reviewPlatforms.setAsDefault", {
                                  defaultValue: "Set as default",
                                })}
                                className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50"
                                style={{ color: "oklch(0.65 0.18 80)" }}
                              >
                                <Star size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingPlatformId(p.id)}
                              title={t("reviewPlatforms.editUrl", {
                                defaultValue: "Edit URL",
                              })}
                              aria-label={t("reviewPlatforms.editUrl", {
                                defaultValue: "Edit URL",
                              })}
                              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 rr-text-navy-mid"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={async () => {
                                // Snapshot before delete for undo
                                const snapshot = {
                                  platform: p.platform as
                                    | "google"
                                    | "yelp"
                                    | "tripadvisor"
                                    | "bing"
                                    | "facebook"
                                    | "apple"
                                    | "other",
                                  url: p.url,
                                  label: p.label ?? undefined,
                                  isDefault: p.isDefault,
                                };
                                try {
                                  await removePlatform.mutateAsync({
                                    id: p.id,
                                  });
                                } catch {
                                  return; // onError already shows toast
                                }
                                toast.custom(
                                  toastId => (
                                    <div
                                      className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg rr-bg-navy text-white"
                                      style={{ minWidth: "260px" }}
                                    >
                                      <Trash2
                                        size={14}
                                        style={{ opacity: 0.7, flexShrink: 0 }}
                                      />
                                      <span className="text-sm flex-1">
                                        {t("reviewPlatforms.removedToast", {
                                          defaultValue: "{{platform}} removed",
                                          platform:
                                            PLATFORM_LABELS[
                                              snapshot.platform
                                            ] ?? snapshot.platform,
                                        })}
                                      </span>
                                      <button
                                        onClick={() => {
                                          restorePlatform.mutate(snapshot);
                                          toast.dismiss(toastId);
                                        }}
                                        className="text-xs font-black px-2 py-1 rounded-lg shrink-0 rr-bg-gold rr-text-navy"
                                      >
                                        {t("reviewPlatforms.undo", {
                                          defaultValue: "Undo",
                                        })}
                                      </button>
                                    </div>
                                  ),
                                  { duration: 5000 }
                                );
                              }}
                              title={t("reviewPlatforms.remove", {
                                defaultValue: "Remove",
                              })}
                              aria-label={t("reviewPlatforms.remove", {
                                defaultValue: "Remove",
                              })}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: "oklch(0.55 0.22 27)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {(platforms ?? []).length === 0 && !showAddPlatform && (
                    <div
                      className="text-center py-4 rounded-xl rr-bg-white-card"
                      style={{ border: "1px dashed oklch(0.85 0.03 260)" }}
                    >
                      <p className="text-sm font-semibold rr-text-navy-mid">
                        {t("reviewPlatforms.emptyState", {
                          defaultValue:
                            "No review platforms added yet. Click Add to get started.",
                        })}
                      </p>
                    </div>
                  )}

                  {/* Add new platform form */}
                  {showAddPlatform && (
                    <div
                      className="rounded-xl p-3 flex flex-col gap-2 mt-1"
                      style={{
                        border: "2px solid oklch(0.80 0.18 80)",
                        background: "oklch(0.98 0.01 80)",
                      }}
                    >
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                          {t("reviewPlatforms.platformType", {
                            defaultValue: "Platform",
                          })}
                        </label>
                        <select
                          value={newPlatformType}
                          onChange={e => setNewPlatformType(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-new-platform-type-2342"
                        >
                          {Object.entries(PLATFORM_LABELS).map(
                            ([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid flex items-center gap-1">
                          {newPlatformType === "yelp"
                            ? t("reviewPlatforms.yelpSearchInstruction", {
                                defaultValue: "Yelp Search Instruction *",
                              })
                            : t("reviewPlatforms.platformUrlRequired", {
                                defaultValue: "Review Page URL *",
                              })}
                          {newPlatformType === "yelp" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="cursor-help inline-flex items-center"
                                  style={{ color: "oklch(0.55 0.04 260)" }}
                                >
                                  <Info size={13} />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-xs leading-relaxed"
                              >
                                <strong>
                                  {t("reviewPlatforms.whyNoLinkTitle", {
                                    defaultValue: "Why no link?",
                                  })}
                                </strong>{" "}
                                {t("reviewPlatforms.yelpNoLinkAdd", {
                                  defaultValue:
                                    "Yelp's Terms of Service prohibit directly soliciting reviews via a link. Entering a plain-text search instruction keeps your emails compliant — customers find your listing themselves.",
                                })}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </label>
                        <input
                          type={newPlatformType === "yelp" ? "text" : "url"}
                          value={newPlatformUrl}
                          onChange={e => setNewPlatformUrl(e.target.value)}
                          placeholder={
                            PLATFORM_PLACEHOLDERS[newPlatformType] ??
                            "https://..."
                          }
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-new-platform-url-2371"
                        />
                        <p className="text-xs mt-1 rr-text-navy-muted">
                          {newPlatformType === "yelp"
                            ? t("reviewPlatforms.yelpSearchHelp", {
                                defaultValue:
                                  "Enter a plain-text search instruction (for example: Search for [Your Business] on Yelp in [City, State]). This text appears in the email body — no link is created, keeping you Yelp-compliant.",
                              })
                            : t("reviewPlatforms.reviewUrlHelp", {
                                defaultValue:
                                  "Paste the public URL customers use to leave a review on this platform.",
                              })}
                        </p>
                      </div>
                      {newPlatformType === "other" && (
                        <div>
                          <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                            {t("reviewPlatforms.customLabel", {
                              defaultValue: "Custom Label",
                            })}
                          </label>
                          <input
                            type="text"
                            value={newPlatformLabel}
                            onChange={e => setNewPlatformLabel(e.target.value)}
                            placeholder={t(
                              "reviewPlatforms.customLabelExample",
                              { defaultValue: "e.g. Houzz, Angi, Thumbtack" }
                            )}
                            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                            style={{
                              border: "2px solid oklch(0.90 0.02 260)",
                              fontSize: "16px",
                            }}
                            name="rr-pages-settings-new-platform-label-2390"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!newPlatformUrl.trim()) {
                              toast.error(
                                newPlatformType === "yelp"
                                  ? t(
                                      "reviewPlatforms.searchInstructionRequired",
                                      {
                                        defaultValue:
                                          "Search instruction is required",
                                      }
                                    )
                                  : t("reviewPlatforms.urlRequired", {
                                      defaultValue: "URL is required",
                                    })
                              );
                              return;
                            }
                            const promise = addPlatform.mutateAsync({
                              platform: newPlatformType as
                                | "google"
                                | "yelp"
                                | "tripadvisor"
                                | "bing"
                                | "facebook"
                                | "apple"
                                | "other",
                              url: newPlatformUrl.trim(),
                              label: newPlatformLabel.trim() || undefined,
                            });
                            toast.promise(promise, {
                              loading: t("reviewPlatforms.addingPlatform", {
                                defaultValue: "Adding platform...",
                              }),
                              success: t("reviewPlatforms.addSuccess", {
                                defaultValue: "Review platform added!",
                              }),
                              error: err =>
                                err?.message ??
                                t("reviewPlatforms.addError", {
                                  defaultValue: "Failed to add platform",
                                }),
                            });
                          }}
                          disabled={addPlatform.isPending}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-black rr-bg-navy text-white"
                        >
                          {addPlatform.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Plus size={12} />
                          )}
                          {t("reviewPlatforms.addPlatform", {
                            defaultValue: "Add Platform",
                          })}
                        </button>
                        <button
                          onClick={() => {
                            setShowAddPlatform(false);
                            setNewPlatformUrl("");
                            setNewPlatformLabel("");
                          }}
                          aria-label={t("reviewPlatforms.cancel", {
                            defaultValue: "Cancel",
                          })}
                          title={t("reviewPlatforms.cancel", {
                            defaultValue: "Cancel",
                          })}
                          className="px-3 py-2 rounded-lg text-xs font-bold rr-text-navy-mid"
                          style={{ background: "oklch(0.93 0.02 260)" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* ── Email Connection (SMTP) ───────────────────────────────────────────── */}
            <div
              id="smtp-settings"
              className="bg-white rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Mail size={18} className="rr-text-navy" />
                <h2 className="text-base font-black rr-text-navy">
                  {t("smtp.title")}
                </h2>
              </div>
              <p className="text-xs mb-4 rr-text-navy-muted">
                {t("smtp.description")}
              </p>

              {smtpLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin rr-text-navy" />
                </div>
              ) : smtpStatus?.connected && !showSmtpForm ? (
                <div className="flex flex-col gap-3">
                  {/* Health badge row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: smtpStatus.verified
                        ? "oklch(0.96 0.04 145)"
                        : "oklch(0.97 0.03 27)",
                    }}
                  >
                    {smtpStatus.verified ? (
                      <CheckCircle2 size={18} className="rr-text-green" />
                    ) : (
                      <AlertCircle
                        size={18}
                        style={{ color: "oklch(0.55 0.18 27)" }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-bold"
                          style={{
                            color: smtpStatus.verified
                              ? "oklch(0.30 0.12 145)"
                              : "oklch(0.40 0.15 27)",
                          }}
                        >
                          {smtpStatus.verified
                            ? t("smtp.emailConnected", {
                                defaultValue: "Email Connected",
                              })
                            : t("smtp.emailNotConnectedTitle", {
                                defaultValue: "Connection Unverified",
                              })}
                        </p>
                        {/* Live status dot */}
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{
                            background: smtpStatus.verified
                              ? "oklch(0.55 0.18 145)"
                              : "oklch(0.65 0.18 27)",
                          }}
                        />
                      </div>
                      <p
                        className="text-xs truncate"
                        style={{
                          color: smtpStatus.verified
                            ? "oklch(0.45 0.10 145)"
                            : "oklch(0.50 0.12 27)",
                        }}
                      >
                        {smtpStatus.email}
                        {smtpStatus.fromName && ` · ${smtpStatus.fromName}`}
                      </p>
                      <SettingsPersonalMailConnectionStatus
                        status={smtpStatus}
                        translate={t}
                      />
                      {smtpConnectionSavedNotice && (
                        <ConnectionSavedNotice
                          message={t("smtp.connectionSavedMessage", {
                            defaultValue:
                              "Your email server is connected and ready for customer outreach.",
                          })}
                        />
                      )}
                    </div>
                    {/* Test connection button */}
                    <button
                      onClick={() => testSmtp.mutate()}
                      disabled={testSmtp.isPending}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 rr-bg-navy text-white"
                      title="Test connection"
                    >
                      {testSmtp.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      {t("smtp.testConnection")}
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSmtpEmail(smtpStatus.email ?? "");
                        setSmtpFromName(smtpStatus.fromName ?? "");
                        setSmtpConnectionSavedNotice(false);
                        setShowSmtpForm(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-bg-surface rr-text-navy-mid"
                    >
                      <Pencil size={13} />
                      {t("smtp.update", { defaultValue: "Change" })}
                    </button>
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-bg-gold rr-text-navy"
                      title="Preview the email your customers will receive"
                    >
                      <Eye size={13} />
                      {t("smtp.previewEmail")}
                    </button>
                    <button
                      onClick={() => resendWelcome.mutate()}
                      disabled={resendWelcome.isPending}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-text-navy"
                      style={{ background: "oklch(0.96 0.04 260)" }}
                      title="Resend confirmation email to your inbox"
                    >
                      {resendWelcome.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      {t("smtp.resendVerification")}
                    </button>
                    <button
                      onClick={() => setDisconnectConfirmOpen(true)}
                      disabled={
                        disconnectSmtp.isPending || sendSmtpTestEmail.isPending
                      }
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                      style={{
                        background: "oklch(0.97 0.02 27)",
                        color: "oklch(0.50 0.18 27)",
                      }}
                    >
                      {disconnectSmtp.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <LogOut size={13} />
                      )}
                      {t("smtp.disconnect", {
                        defaultValue: "Disconnect / reset",
                      })}
                    </button>
                  </div>

                  <div
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: "oklch(0.90 0.02 260)",
                      background: "oklch(0.985 0.01 260)",
                    }}
                  >
                    <label
                      className="block text-xs font-bold rr-text-navy-mid"
                      htmlFor="smtp-test-email-recipient"
                    >
                      {t("smtp.testEmailRecipient", {
                        defaultValue: "Send a test email to",
                      })}
                    </label>
                    <p className="mt-1 text-xs rr-text-navy-muted">
                      {t("smtp.testEmailHint", {
                        defaultValue:
                          "Use an address you control. This uses your saved mail server and does not save a new recipient.",
                      })}
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input
                        id="smtp-test-email-recipient"
                        type="email"
                        value={testEmailRecipient}
                        onChange={event => {
                          setTestEmailRecipient(event.target.value);
                          setTestEmailSentNotice(false);
                        }}
                        placeholder={smtpStatus.email ?? "you@example.com"}
                        className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "oklch(0.86 0.02 260)" }}
                        autoComplete="email"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!testEmailRecipient.trim()) {
                            toast.error(
                              t("smtp.testEmailRecipientRequired", {
                                defaultValue:
                                  "Enter the address that should receive the test email.",
                              })
                            );
                            return;
                          }
                          sendSmtpTestEmail.mutate({
                            to: testEmailRecipient.trim(),
                          });
                        }}
                        disabled={
                          sendSmtpTestEmail.isPending ||
                          disconnectSmtp.isPending
                        }
                        aria-busy={sendSmtpTestEmail.isPending}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold rr-bg-navy text-white"
                      >
                        {sendSmtpTestEmail.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        {sendSmtpTestEmail.isPending
                          ? t("smtp.sendingTestEmail", {
                              defaultValue: "Sending test email…",
                            })
                          : t("smtp.sendTestEmail", {
                              defaultValue: "Send test email",
                            })}
                      </button>
                    </div>
                    {testEmailSentNotice && (
                      <ConnectionSavedNotice
                        message={t("smtp.testEmailSent", {
                          defaultValue:
                            "Test email sent. Check the recipient inbox to confirm delivery.",
                        })}
                      />
                    )}
                  </div>

                  <SmtpTestEmailHistory
                    attempts={smtpTestEmailHistory}
                    isLoading={smtpTestEmailHistoryLoading}
                    translate={t}
                    onRetryFailedAttempt={retryFailedSmtpTestEmail}
                  />

                  {/* Inline From Name edit */}
                  <InlineFromNameEdit
                    current={smtpStatus?.fromName ?? ""}
                    onSaved={() => utils.smtp.status.invalidate()}
                  />
                  {/* Inline Reply-To edit */}
                  <InlineReplyToEdit
                    current={smtpStatus?.replyTo ?? ""}
                    onSaved={() => utils.smtp.status.invalidate()}
                  />
                  {/* Last health check timestamp */}
                  {smtpStatus?.lastHealthCheck && (
                    <p className="text-xs rr-text-navy-faint">
                      {t("smtp.lastAutoCheck", {
                        defaultValue: "Last auto-check: {{date}}",
                        date: new Date(
                          smtpStatus.lastHealthCheck
                        ).toLocaleString(),
                      })}
                      {" · "}
                      <span
                        style={{
                          color:
                            smtpStatus.lastHealthStatus === "ok"
                              ? "oklch(0.50 0.18 145)"
                              : "oklch(0.50 0.18 27)",
                          fontWeight: 600,
                        }}
                      >
                        {smtpStatus.lastHealthStatus === "ok"
                          ? t("smtp.healthy", { defaultValue: "✓ Healthy" })
                          : t("smtp.failed", { defaultValue: "✗ Failed" })}
                      </span>
                    </p>
                  )}
                  <AlertDialog
                    open={disconnectConfirmOpen}
                    onOpenChange={open => {
                      setDisconnectConfirmOpen(open);
                      if (!open) setDisconnectAcknowledged(false);
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t("smtp.disconnectConfirmTitle", {
                            defaultValue: "Disconnect this mail server?",
                          })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("smtp.disconnectConfirmDescription", {
                            defaultValue:
                              "This permanently removes your saved mail-server credentials and stops future outreach until you connect a new verified server.",
                          })}
                        </AlertDialogDescription>
                        <p
                          className="mt-3 rounded-lg border px-3 py-2 text-sm font-medium"
                          style={{
                            borderColor: "oklch(0.88 0.08 27)",
                            background: "oklch(0.97 0.02 27)",
                            color: "oklch(0.42 0.12 27)",
                          }}
                        >
                          {t("smtp.disconnectAutomationPauseWarning", {
                            defaultValue:
                              "Disconnecting pauses any active automated review requests. They stay paused until you configure and select a new verified mail server.",
                          })}
                        </p>
                        <label
                          className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm rr-text-navy"
                          style={{ borderColor: "oklch(0.90 0.02 260)" }}
                        >
                          <Checkbox
                            checked={disconnectAcknowledged}
                            onCheckedChange={checked =>
                              setDisconnectAcknowledged(checked === true)
                            }
                            aria-label={t("smtp.disconnectAcknowledgement", {
                              defaultValue:
                                "I understand that this removes my saved mail-server credentials.",
                            })}
                          />
                          <span>
                            {t("smtp.disconnectAcknowledgement", {
                              defaultValue:
                                "I understand that this removes my saved mail-server credentials.",
                            })}
                          </span>
                        </label>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={disconnectSmtp.isPending}>
                          {t("common.cancel", { defaultValue: "Cancel" })}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={event => {
                            event.preventDefault();
                            disconnectSmtp.mutate();
                          }}
                          disabled={
                            !disconnectAcknowledged || disconnectSmtp.isPending
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {disconnectSmtp.isPending
                            ? t("smtp.disconnecting", {
                                defaultValue: "Disconnecting…",
                              })
                            : t("smtp.disconnectConfirmAction", {
                                defaultValue: "Disconnect and reset",
                              })}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Not connected — grey health badge */}
                  {!smtpStatus?.connected && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl rr-bg-surface">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: "oklch(0.70 0.02 260)" }}
                      />
                      <p className="text-xs rr-text-navy-mid">
                        {t("smtp.notConnectedDescription", {
                          defaultValue:
                            "No email connected. Enter your details below to start sending review requests.",
                        })}
                      </p>
                    </div>
                  )}
                  <PausedAutomationQueue
                    queue={pausedAutomationQueue}
                    translate={t}
                  />

                  {/* Email field */}
                  <div>
                    <label
                      htmlFor="smtp-email"
                      className="block text-xs font-bold mb-1 rr-text-navy-mid"
                    >
                      {t("smtp.emailAddressLabel", {
                        defaultValue: "Your Email Address *",
                      })}
                    </label>
                    <input
                      id="smtp-email"
                      type="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={smtpEmail}
                      onChange={e => {
                        setSmtpEmail(e.target.value);
                        setSmtpEmailTouched(true);
                      }}
                      onBlur={() => setSmtpEmailTouched(true)}
                      placeholder="you@yourbusiness.com"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      aria-invalid={smtpEmailValidation === "invalid"}
                      aria-describedby={
                        smtpEmailValidation === "idle"
                          ? undefined
                          : "smtp-email-validation"
                      }
                      style={{
                        border:
                          smtpEmailValidation === "valid"
                            ? "2px solid oklch(0.70 0.15 160)"
                            : smtpEmailValidation === "invalid"
                              ? "2px solid oklch(0.62 0.20 27)"
                              : "2px solid oklch(0.90 0.02 260)",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-smtp-email-2624"
                    />
                    {smtpEmailValidation !== "idle" && (
                      <p
                        id="smtp-email-validation"
                        data-testid="smtp-email-validation"
                        role="status"
                        aria-live="polite"
                        className={`mt-1.5 flex items-center gap-1.5 text-xs font-semibold ${smtpEmailValidation === "valid" ? "text-emerald-700" : "text-red-700"}`}
                      >
                        {smtpEmailValidation === "valid" ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <span aria-hidden="true">⚠</span>
                        )}
                        {smtpEmailValidation === "valid"
                          ? t("common.emailFormatValid", {
                              defaultValue: "Email format looks good.",
                            })
                          : t("login.invalidEmail", {
                              defaultValue: "Enter a valid email address.",
                            })}
                      </p>
                    )}
                  </div>

                  {/* Password field — smart provider-aware */}
                  {(() => {
                    const emailDomain =
                      smtpEmail.split("@")[1]?.toLowerCase() ?? "";
                    // Provider detection
                    const isGmail =
                      emailDomain === "gmail.com" ||
                      emailDomain === "googlemail.com";
                    const isGoogleWorkspace =
                      smtpHost === "smtp.gmail.com" && !isGmail;
                    const isOutlook =
                      ["outlook.com", "hotmail.com", "live.com"].includes(
                        emailDomain
                      ) || smtpHost === "smtp-mail.outlook.com";
                    const isYahoo =
                      emailDomain === "yahoo.com" ||
                      emailDomain === "yahoo.co.uk" ||
                      emailDomain === "ymail.com" ||
                      smtpHost === "smtp.mail.yahoo.com";
                    const isZoho =
                      emailDomain === "zoho.com" ||
                      emailDomain === "zohomail.com" ||
                      smtpHost === "smtp.zoho.com";
                    const isIcloud =
                      emailDomain === "icloud.com" ||
                      emailDomain === "me.com" ||
                      smtpHost === "smtp.mail.me.com";
                    const isAol =
                      emailDomain === "aol.com" ||
                      emailDomain === "aim.com" ||
                      smtpHost === "smtp.aol.com";
                    const isProtonMail =
                      emailDomain === "proton.me" ||
                      emailDomain === "protonmail.com" ||
                      emailDomain === "pm.me" ||
                      smtpHost === "smtp.protonmail.ch";
                    const isFastmail =
                      emailDomain === "fastmail.com" ||
                      emailDomain === "fastmail.fm" ||
                      emailDomain === "fastmail.org" ||
                      smtpHost === "smtp.fastmail.com";
                    const isKnownProvider =
                      isGmail ||
                      isGoogleWorkspace ||
                      isOutlook ||
                      isYahoo ||
                      isZoho ||
                      isIcloud ||
                      isAol ||
                      isProtonMail ||
                      isFastmail;
                    const isCustom = emailDomain.length > 0 && !isKnownProvider;

                    // Smart label
                    const passwordLabel = isGmail
                      ? t("smtp.passwordLabels.gmail", {
                          defaultValue: "Gmail App Password *",
                        })
                      : isGoogleWorkspace
                        ? t("smtp.passwordLabels.workspace", {
                            defaultValue: "Google Workspace App Password *",
                          })
                        : isOutlook
                          ? t("smtp.passwordLabels.microsoft", {
                              defaultValue: "Microsoft App Password *",
                            })
                          : isYahoo
                            ? t("smtp.passwordLabels.yahoo", {
                                defaultValue: "Yahoo App Password *",
                              })
                            : isZoho
                              ? t("smtp.passwordLabels.zoho", {
                                  defaultValue: "Zoho Mail Password *",
                                })
                              : isIcloud
                                ? t("smtp.passwordLabels.icloud", {
                                    defaultValue:
                                      "Apple App-Specific Password *",
                                  })
                                : isAol
                                  ? t("smtp.passwordLabels.aol", {
                                      defaultValue: "AOL App Password *",
                                    })
                                  : isProtonMail
                                    ? t("smtp.passwordLabels.proton", {
                                        defaultValue:
                                          "ProtonMail SMTP Password *",
                                      })
                                    : isFastmail
                                      ? t("smtp.passwordLabels.fastmail", {
                                          defaultValue:
                                            "Fastmail App Password *",
                                        })
                                      : t("smtp.passwordLabels.email", {
                                          defaultValue: "Email Password *",
                                        });

                    // Smart placeholder
                    const passwordPlaceholder = smtpStatus?.connected
                      ? t("smtp.passwordPlaceholders.update", {
                          defaultValue: "Enter new password to update",
                        })
                      : isGmail || isGoogleWorkspace
                        ? t("smtp.passwordPlaceholders.google", {
                            defaultValue:
                              "16-character App Password (no spaces)",
                          })
                        : isIcloud
                          ? "xxxx-xxxx-xxxx-xxxx"
                          : t("smtp.passwordPlaceholders.default", {
                              defaultValue: "Your email password",
                            });

                    const showGuide = showPasswordGuide;
                    const setShowGuide = setShowPasswordGuide;
                    const hasGuide =
                      isGmail ||
                      isGoogleWorkspace ||
                      isOutlook ||
                      isYahoo ||
                      isZoho ||
                      isIcloud ||
                      isAol ||
                      isProtonMail ||
                      isFastmail;
                    const guideProvider = isGmail
                      ? "gmail"
                      : isGoogleWorkspace
                        ? "workspace"
                        : isOutlook
                          ? "microsoft"
                          : isYahoo
                            ? "yahoo"
                            : isZoho
                              ? "zoho"
                              : isIcloud
                                ? "icloud"
                                : isAol
                                  ? "aol"
                                  : isProtonMail
                                    ? "proton"
                                    : "fastmail";
                    const guideDefaults: Record<
                      string,
                      { title: string; steps: string[]; tip: string }
                    > = {
                      gmail: {
                        title: t("smtp.gmailGuideTitle", {
                          defaultValue: "Gmail App Password — 4 steps",
                        }),
                        steps: [
                          t("smtp.gmailGuideStep1", {
                            defaultValue:
                              "Go to myaccount.google.com → Security",
                          }),
                          t("smtp.gmailGuideStep2", {
                            defaultValue:
                              "Turn on 2-Step Verification if not already on",
                          }),
                          t("smtp.gmailGuideStep3", {
                            defaultValue:
                              "Go to myaccount.google.com/apppasswords → name it Get Phame → click Create",
                          }),
                          t("smtp.gmailGuideStep4", {
                            defaultValue:
                              "Copy the 16-character code and paste it here — remove all spaces",
                          }),
                        ],
                        tip: t("smtp.gmailGuideTip", {
                          defaultValue:
                            "Google shows the code once. Create a new App Password after changing your Google password, and revoke it when you disconnect Get Phame.",
                        }),
                      },
                      workspace: {
                        title: t("smtp.googleWorkspaceGuideTitle", {
                          defaultValue:
                            "Google Workspace App Password — 4 steps",
                        }),
                        steps: [
                          t("smtp.googleWorkspaceGuideStep1", {
                            defaultValue:
                              "Sign in to myaccount.google.com with your work account → Security",
                          }),
                          t("smtp.googleWorkspaceGuideStep2", {
                            defaultValue:
                              "Turn on 2-Step Verification if it is available for your account",
                          }),
                          t("smtp.googleWorkspaceGuideStep3", {
                            defaultValue:
                              "Go to myaccount.google.com/apppasswords → name it Get Phame → click Create",
                          }),
                          t("smtp.googleWorkspaceGuideStep4", {
                            defaultValue:
                              "Copy the 16-character code and paste it here — remove all spaces",
                          }),
                        ],
                        tip: t("smtp.googleWorkspaceGuideTip", {
                          defaultValue:
                            "If App Passwords is unavailable, your organisation may restrict it, require security-key-only verification, or use Advanced Protection. Ask your Workspace administrator for the approved SMTP or OAuth connection method.",
                        }),
                      },
                      microsoft: {
                        title: "Microsoft App Password — 4 steps",
                        steps: [
                          "Go to account.microsoft.com, then Security.",
                          "Open Advanced security options.",
                          "Under App passwords, create a new app password.",
                          "Copy and paste the generated password here.",
                        ],
                        tip: "Microsoft 365 work accounts may require your IT administrator to allow SMTP AUTH.",
                      },
                      yahoo: {
                        title: "Yahoo App Password — 4 steps",
                        steps: [
                          "Go to account.yahoo.com, then Security.",
                          "Choose Generate app password.",
                          "Select Other app and name it Get Phame.",
                          "Copy and paste the generated password here.",
                        ],
                        tip: "Use the generated app password, not your regular Yahoo password.",
                      },
                      zoho: {
                        title: "Zoho Mail — Enable SMTP Access",
                        steps: [
                          "Sign in at mail.zoho.com.",
                          "Open Settings, then Mail Accounts.",
                          "Choose your email address and scroll to SMTP.",
                          "Turn on Allow SMTP Access, then use your regular Zoho password here.",
                        ],
                        tip: "No app password is needed after SMTP access is enabled.",
                      },
                      aol: {
                        title: "AOL Mail App Password — 4 steps",
                        steps: [
                          "Go to account.aol.com, then Security.",
                          "Choose Generate app password.",
                          "Select Other app and name it Get Phame.",
                          "Copy and paste the generated password here, not your regular AOL password.",
                        ],
                        tip: "AOL requires two-step verification before you can generate an app password.",
                      },
                      proton: {
                        title: "ProtonMail — SMTP Bridge Password",
                        steps: [
                          "Download Proton Mail Bridge from proton.me/mail/bridge.",
                          "Sign in to Bridge with your Proton account.",
                          "Open your account in Bridge and copy the SMTP password shown.",
                          "Paste that SMTP password here, not your regular Proton password.",
                        ],
                        tip: "Proton Mail Bridge must be running for SMTP to work.",
                      },
                      fastmail: {
                        title: "Fastmail App Password — 4 steps",
                        steps: [
                          "Go to app.fastmail.com, then Settings, Privacy & Security.",
                          "Under Third-party apps, choose New app password.",
                          "Name it Get Phame and allow Mail (SMTP) access.",
                          "Copy and paste the generated password here.",
                        ],
                        tip: "Use the provider-specific app password, not your regular Fastmail password.",
                      },
                      icloud: {
                        title: "Apple iCloud — App-Specific Password",
                        steps: [
                          "Go to appleid.apple.com, then Sign-In and Security.",
                          "Open App-Specific Passwords and generate a new password.",
                          "Name it Get Phame and choose Create.",
                          "Copy the generated password and paste it here.",
                        ],
                        tip: "Two-factor authentication must be enabled on your Apple ID.",
                      },
                    };
                    const activeGuide = guideDefaults[guideProvider];

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <label className="text-xs font-bold rr-text-navy-mid">
                              {passwordLabel}
                            </label>
                            {(isGmail || isGoogleWorkspace) && (
                              <SmtpAppPasswordHelpTooltip
                                provider={isGmail ? "gmail" : "workspace"}
                                translate={t}
                              />
                            )}
                          </div>
                          {hasGuide && (
                            <button
                              type="button"
                              onClick={() => setShowGuide(v => !v)}
                              className="flex items-center gap-1 text-xs font-bold"
                              style={{ color: "oklch(0.45 0.18 260)" }}
                            >
                              <span
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-black"
                                style={{ background: "oklch(0.45 0.18 260)" }}
                              >
                                ?
                              </span>
                              {t("smtp.howToGetIt", {
                                defaultValue: "How to get it",
                              })}
                            </button>
                          )}
                        </div>

                        {showGuide && hasGuide && activeGuide && (
                          <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                            <p className="font-black text-sm rr-text-gold">
                              {activeGuide.title}
                            </p>
                            <ol
                              className="flex flex-col gap-1.5 pl-4"
                              style={{ listStyle: "decimal" }}
                            >
                              {activeGuide.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                            <p className="text-[10px] mt-1 rr-text-navy-faint">
                              {activeGuide.tip}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowPasswordGuide(false)}
                              className="self-end text-xs font-bold mt-1 rr-text-gold"
                            >
                              {t("common.gotIt", { defaultValue: "Got it ✓" })}
                            </button>
                          </div>
                        )}

                        <div className="relative">
                          <input
                            id="smtp-password"
                            type={showSmtpPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={smtpPassword}
                            onChange={e => {
                              setSmtpPassword(e.target.value);
                              setSmtpPasswordTouched(true);
                            }}
                            onBlur={() => setSmtpPasswordTouched(true)}
                            placeholder={passwordPlaceholder}
                            aria-invalid={smtpPasswordValidation === "invalid"}
                            aria-describedby={
                              smtpPasswordValidation === "idle"
                                ? undefined
                                : "smtp-password-feedback"
                            }
                            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-10"
                            style={{
                              border:
                                smtpPasswordValidation === "invalid"
                                  ? "2px solid oklch(0.62 0.20 27)"
                                  : smtpPasswordValidation === "valid"
                                    ? "2px solid oklch(0.56 0.14 145)"
                                    : "2px solid oklch(0.90 0.02 260)",
                              fontSize: "16px",
                            }}
                            name="rr-pages-settings-smtp-password-2751"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmtpPassword(v => !v)}
                            aria-label={
                              showSmtpPassword
                                ? t("common.hide", {
                                    defaultValue: "Hide password",
                                  })
                                : t("common.show", {
                                    defaultValue: "Show password",
                                  })
                            }
                            aria-pressed={showSmtpPassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold rr-text-navy-mid"
                          >
                            {showSmtpPassword
                              ? t("common.hide", { defaultValue: "Hide" })
                              : t("common.show", { defaultValue: "Show" })}
                          </button>
                        </div>
                        {smtpPasswordValidation !== "idle" && (
                          <p
                            id="smtp-password-feedback"
                            role="status"
                            aria-live="polite"
                            className="mt-1 text-xs font-semibold"
                            style={{
                              color:
                                smtpPasswordValidation === "valid"
                                  ? "oklch(0.40 0.12 145)"
                                  : "oklch(0.48 0.16 27)",
                            }}
                          >
                            {t(
                              smtpPasswordValidation === "valid"
                                ? "smtp.credentialReady"
                                : "smtp.credentialRequired",
                              {
                                defaultValue:
                                  smtpPasswordValidation === "valid"
                                    ? "Password entered. Test before saving."
                                    : "Password is required.",
                              }
                            )}
                          </p>
                        )}

                        {/* Inline hint for known providers that need app passwords */}
                        {(isGmail || isGoogleWorkspace) &&
                          !smtpStatus?.connected &&
                          !showGuide && (
                            <p
                              className="text-xs mt-1.5"
                              style={{ color: "oklch(0.55 0.10 260)" }}
                            >
                              {t("smtp.inlineHints.google", {
                                defaultValue:
                                  "Not your regular account password — use an App Password. Tap How to get it above.",
                              })}
                            </p>
                          )}
                        {isIcloud && !smtpStatus?.connected && !showGuide && (
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: "oklch(0.55 0.10 260)" }}
                          >
                            {t("smtp.inlineHints.icloud", {
                              defaultValue:
                                "Use an App-Specific Password, not your Apple ID password. Tap How to get it above.",
                            })}
                          </p>
                        )}
                        {isZoho && !smtpStatus?.connected && !showGuide && (
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: "oklch(0.55 0.10 260)" }}
                          >
                            {t("smtp.inlineHints.zoho", {
                              defaultValue:
                                "Enable SMTP access in Zoho first, then use your regular Zoho password. Tap How to get it above.",
                            })}
                          </p>
                        )}
                        {isAol && !smtpStatus?.connected && !showGuide && (
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: "oklch(0.55 0.10 260)" }}
                          >
                            {t("smtp.inlineHints.aol", {
                              defaultValue:
                                "Not your regular AOL password — use an App Password. Tap How to get it above.",
                            })}
                          </p>
                        )}
                        {isProtonMail &&
                          !smtpStatus?.connected &&
                          !showGuide && (
                            <p
                              className="text-xs mt-1.5"
                              style={{ color: "oklch(0.55 0.10 260)" }}
                            >
                              {t("smtp.inlineHints.proton", {
                                defaultValue:
                                  "ProtonMail requires the Proton Bridge app — use its SMTP password, not your Proton login. Tap How to get it above.",
                              })}
                            </p>
                          )}
                        {isFastmail && !smtpStatus?.connected && !showGuide && (
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: "oklch(0.55 0.10 260)" }}
                          >
                            {t("smtp.inlineHints.fastmail", {
                              defaultValue:
                                "Not your regular Fastmail password — use an App Password. Tap How to get it above.",
                            })}
                          </p>
                        )}

                        {/* Custom SMTP notice */}
                        {isCustom && !smtpStatus?.connected && (
                          <p
                            className="text-xs mt-1.5"
                            style={{ color: "oklch(0.55 0.10 260)" }}
                          >
                            {t("smtp.inlineHints.custom", {
                              defaultValue:
                                "Custom domain detected — SMTP settings auto-filled below. Check Advanced settings to verify or adjust host and port.",
                            })}
                          </p>
                        )}

                        {/* Fallback hint from server for unrecognised providers */}
                        {!isKnownProvider && !isCustom && smtpHint && (
                          <div
                            className="mt-2 px-3 py-2 rounded-lg text-xs"
                            style={{
                              background: "oklch(0.97 0.03 80)",
                              color: "oklch(0.45 0.10 80)",
                            }}
                          >
                            💡 {smtpHint}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Display name */}
                  <div>
                    <label
                      htmlFor="smtp-from-name"
                      className="block text-xs font-bold mb-1 rr-text-navy-mid"
                    >
                      {t("smtp.displayNameLabel", {
                        defaultValue: "Display Name (optional)",
                      })}
                    </label>
                    <input
                      id="smtp-from-name"
                      type="text"
                      autoComplete="name"
                      value={smtpFromName}
                      onChange={e => setSmtpFromName(e.target.value)}
                      placeholder={t("smtp.displayNamePlaceholder", {
                        defaultValue: "e.g. Steve at Acme Plumbing",
                      })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-smtp-from-name-2820"
                    />
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      {t("smtp.displayNameHelp", {
                        defaultValue:
                          "Shown as the sender name in your customer's inbox.",
                      })}
                    </p>
                  </div>

                  {/* ── Deliverability guidance callout ───────────────────────────────────────── */}
                  <div
                    className="flex items-start gap-3 px-3 py-3 rounded-xl text-xs"
                    style={{
                      background: "oklch(0.97 0.02 260)",
                      border: "1px solid oklch(0.90 0.03 260)",
                    }}
                  >
                    <AlertCircle
                      size={15}
                      className="shrink-0 mt-0.5"
                      style={{ color: "oklch(0.50 0.12 260)" }}
                    />
                    <div className="rr-text-navy-mid">
                      <p className="font-bold mb-1">
                        {t("smtp.sendingLimits.title", {
                          defaultValue: "Sending limits by provider",
                        })}
                      </p>
                      <ul
                        className="flex flex-col gap-0.5"
                        style={{ listStyle: "disc", paddingLeft: "1rem" }}
                      >
                        <li>
                          {t("smtp.sendingLimits.gmail", {
                            defaultValue:
                              "Gmail / Google Workspace — 500 emails/day (free), 2,000/day (Workspace)",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.microsoft", {
                            defaultValue:
                              "Outlook / Microsoft 365 — 300 emails/day",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.yahoo", {
                            defaultValue: "Yahoo Mail — 500 emails/day",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.zoho", {
                            defaultValue:
                              "Zoho Mail — 500 emails/day (free), 1,000/day (paid)",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.aol", {
                            defaultValue: "AOL Mail — 500 emails/day",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.fastmail", {
                            defaultValue: "Fastmail — 1,000 emails/day",
                          })}
                        </li>
                        <li>
                          {t("smtp.sendingLimits.proton", {
                            defaultValue:
                              "ProtonMail — 150 emails/day (free), 1,000/day (paid) via Bridge",
                          })}
                        </li>
                      </ul>
                      <p className="mt-1.5">
                        {t("smtp.sendingLimits.tip", {
                          defaultValue:
                            "For high-volume sending, use a dedicated reviews@yourdomain.com address to keep your main inbox clean and avoid hitting personal limits.",
                        })}
                      </p>
                    </div>
                  </div>

                  <div id="email-connection" className="scroll-mt-24">
                    <AdaptiveSendLimitStatus status={adaptiveSendStatus} />
                  </div>

                  <AdaptiveSendBurstCapSettings
                    isAdmin={user?.role === "admin"}
                  />

                  {/* ── Follow-up Reminder Settings ────────────────────────────────────────── */}
                  <div
                    className="rounded-xl p-3.5 rr-bg-white-card"
                    style={{ border: "1px solid oklch(0.91 0.02 260)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Bell
                          size={14}
                          style={{ color: "oklch(0.45 0.10 260)" }}
                        />
                        <span
                          className="text-xs font-black"
                          style={{
                            color: "oklch(0.30 0.04 260)",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Automatic Follow-ups
                        </span>
                      </div>
                      <Switch
                        checked={(reminderSettings?.followUpEnabled ?? 1) === 1}
                        onCheckedChange={v =>
                          updateReminderSettings.mutate({
                            followUpEnabled: v ? 1 : 0,
                            followUpFirstEnabled: followUpFirstEnabled ? 1 : 0,
                            followUpSecondEnabled: followUpSecondEnabled
                              ? 1
                              : 0,
                            followUpDelayDays: editedFollowUpDelayDays,
                            followUpSecondDelayDays:
                              editedFollowUpSecondDelayDays,
                          })
                        }
                        disabled={updateReminderSettings.isPending}
                      />
                    </div>
                    <p className="text-xs mb-3 rr-text-navy-muted">
                      Automatically send up to two follow-up emails to customers
                      who haven&apos;t clicked your review link. Configure or
                      skip each stage independently.
                    </p>
                    {(reminderSettings?.followUpEnabled ?? 1) === 1 && (
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div
                            className="rounded-xl p-3"
                            style={{ border: "1px solid oklch(0.90 0.02 260)" }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label
                                htmlFor="follow-up-delay-days"
                                className="block text-xs font-bold rr-text-navy-mid"
                              >
                                First follow-up
                              </label>
                              <Switch
                                checked={followUpFirstEnabled}
                                onCheckedChange={setFollowUpFirstEnabled}
                                aria-label="Enable first follow-up"
                                disabled={updateReminderSettings.isPending}
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                id="follow-up-delay-days"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={14}
                                step={1}
                                value={followUpDelayInput}
                                onChange={e =>
                                  setFollowUpDelayInput(e.target.value)
                                }
                                disabled={!followUpFirstEnabled}
                                aria-invalid={!followUpDelayIsValid}
                                aria-describedby="follow-up-delay-help"
                                className="w-16 px-2 py-2 rounded-lg text-sm outline-none text-center"
                                style={{
                                  border: `2px solid ${followUpDelayIsValid ? "oklch(0.88 0.02 260)" : "oklch(0.58 0.19 25)"}`,
                                  fontSize: "16px",
                                }}
                              />
                              <span className="text-xs font-semibold rr-text-navy-mid">
                                days after original send
                              </span>
                            </div>
                            <div
                              className="mt-2 flex flex-wrap gap-2"
                              aria-label="First follow-up quick presets"
                            >
                              {FOLLOW_UP_DELAY_PRESETS.map(days => (
                                <button
                                  key={`first-${days}`}
                                  type="button"
                                  onClick={() =>
                                    setFollowUpDelayInput(String(days))
                                  }
                                  disabled={!followUpFirstEnabled}
                                  aria-pressed={
                                    editedFollowUpDelayDays === days
                                  }
                                  className="min-h-9 min-w-11 rounded-lg px-3 text-xs font-bold transition-colors"
                                  style={
                                    editedFollowUpDelayDays === days
                                      ? {
                                          background: "oklch(0.22 0.09 260)",
                                          color: "oklch(0.80 0.18 80)",
                                        }
                                      : {
                                          background: "oklch(0.96 0.02 260)",
                                          color: "oklch(0.34 0.06 260)",
                                        }
                                  }
                                >
                                  {days}d
                                </button>
                              ))}
                            </div>
                            <div
                              className="mt-3 rounded-lg p-2.5"
                              style={{ background: "oklch(0.97 0.02 260)" }}
                            >
                              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide rr-text-navy-muted">
                                <Clock size={12} /> Projected send
                              </p>
                              <p className="mt-1 text-xs font-black rr-text-navy">
                                {followUpFirstEnabled
                                  ? formatProjectedDate(
                                      projectedFollowUpDates.first
                                    )
                                  : "Skipped — stage disabled"}
                              </p>
                              <p className="mt-0.5 text-[11px] rr-text-navy-muted">
                                If the original request were sent now
                              </p>
                            </div>
                          </div>

                          <div
                            className="rounded-xl p-3"
                            style={{ border: "1px solid oklch(0.90 0.02 260)" }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <label
                                htmlFor="follow-up-second-delay-days"
                                className="block text-xs font-bold rr-text-navy-mid"
                              >
                                Second follow-up
                              </label>
                              <Switch
                                checked={followUpSecondEnabled}
                                onCheckedChange={setFollowUpSecondEnabled}
                                aria-label="Enable second follow-up"
                                disabled={updateReminderSettings.isPending}
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                id="follow-up-second-delay-days"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={14}
                                step={1}
                                value={followUpSecondDelayInput}
                                onChange={e =>
                                  setFollowUpSecondDelayInput(e.target.value)
                                }
                                disabled={!followUpSecondEnabled}
                                aria-invalid={!followUpSecondDelayIsValid}
                                aria-describedby="follow-up-delay-help"
                                className="w-16 px-2 py-2 rounded-lg text-sm outline-none text-center"
                                style={{
                                  border: `2px solid ${followUpSecondDelayIsValid ? "oklch(0.88 0.02 260)" : "oklch(0.58 0.19 25)"}`,
                                  fontSize: "16px",
                                }}
                              />
                              <span className="text-xs font-semibold rr-text-navy-mid">
                                days after first follow-up
                              </span>
                            </div>
                            <div
                              className="mt-2 flex flex-wrap gap-2"
                              aria-label="Second follow-up quick presets"
                            >
                              {FOLLOW_UP_DELAY_PRESETS.map(days => (
                                <button
                                  key={`second-${days}`}
                                  type="button"
                                  onClick={() =>
                                    setFollowUpSecondDelayInput(String(days))
                                  }
                                  disabled={!followUpSecondEnabled}
                                  aria-pressed={
                                    editedFollowUpSecondDelayDays === days
                                  }
                                  className="min-h-9 min-w-11 rounded-lg px-3 text-xs font-bold transition-colors"
                                  style={
                                    editedFollowUpSecondDelayDays === days
                                      ? {
                                          background: "oklch(0.22 0.09 260)",
                                          color: "oklch(0.80 0.18 80)",
                                        }
                                      : {
                                          background: "oklch(0.96 0.02 260)",
                                          color: "oklch(0.34 0.06 260)",
                                        }
                                  }
                                >
                                  {days}d
                                </button>
                              ))}
                            </div>
                            <div
                              className="mt-3 rounded-lg p-2.5"
                              style={{ background: "oklch(0.97 0.02 260)" }}
                            >
                              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide rr-text-navy-muted">
                                <Clock size={12} /> Projected send
                              </p>
                              <p className="mt-1 text-xs font-black rr-text-navy">
                                {followUpSecondEnabled
                                  ? formatProjectedDate(
                                      projectedFollowUpDates.second
                                    )
                                  : "Skipped — stage disabled"}
                              </p>
                              <p className="mt-0.5 text-[11px] rr-text-navy-muted">
                                Cumulative from the original request
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p
                            id="follow-up-delay-help"
                            className="text-xs rr-text-navy-muted"
                          >
                            {followUpTimingIsValid
                              ? `Schedule: day ${editedFollowUpDelayDays}, then day ${editedFollowUpDelayDays + editedFollowUpSecondDelayDays} after the original request.`
                              : "Enter a whole number from 1 to 14 days for both follow-ups."}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              updateReminderSettings.mutate({
                                followUpEnabled:
                                  reminderSettings?.followUpEnabled ?? 1,
                                followUpFirstEnabled: followUpFirstEnabled
                                  ? 1
                                  : 0,
                                followUpSecondEnabled: followUpSecondEnabled
                                  ? 1
                                  : 0,
                                followUpDelayDays: editedFollowUpDelayDays,
                                followUpSecondDelayDays:
                                  editedFollowUpSecondDelayDays,
                              })
                            }
                            disabled={
                              updateReminderSettings.isPending ||
                              !followUpTimingHasChanges
                            }
                            className="min-h-10 w-full rounded-lg px-4 py-2 text-xs font-bold transition-opacity disabled:opacity-40 rr-bg-navy rr-text-gold sm:w-auto"
                          >
                            {updateReminderSettings.isPending
                              ? "Saving…"
                              : "Save follow-ups"}
                          </button>
                        </div>

                        <div
                          className="border-t pt-3"
                          style={{ borderColor: "oklch(0.91 0.02 260)" }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-1.5 text-xs font-black rr-text-navy">
                                <TrendingUp
                                  size={14}
                                  className="rr-text-gold"
                                />{" "}
                                Timing performance
                              </p>
                              <p className="mt-1 text-[11px] rr-text-navy-muted">
                                Last-touch success after a reminder was sent,
                                grouped by its saved timing configuration.
                              </p>
                            </div>
                          </div>

                          {reminderPerformanceLoading ? (
                            <div
                              className="mt-3 rounded-xl p-4 text-xs font-semibold rr-text-navy-muted"
                              style={{ background: "oklch(0.97 0.01 260)" }}
                            >
                              Loading reminder performance…
                            </div>
                          ) : reminderPerformance &&
                            reminderPerformance.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {reminderPerformance
                                .slice(0, 6)
                                .map((row, index) => {
                                  const totalDay =
                                    row.stage === 1
                                      ? row.firstDelayDays
                                      : row.firstDelayDays +
                                        row.secondDelayDays;
                                  return (
                                    <div
                                      key={`${row.stage}-${row.firstDelayDays}-${row.secondDelayDays}-${row.firstStageEnabled}-${row.secondStageEnabled}-${index}`}
                                      className="flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"
                                      style={{
                                        background: "oklch(0.97 0.01 260)",
                                        border:
                                          "1px solid oklch(0.91 0.02 260)",
                                      }}
                                    >
                                      <div>
                                        <p className="text-xs font-black rr-text-navy">
                                          Stage {row.stage} · day {totalDay}
                                        </p>
                                        <p className="mt-0.5 text-[11px] rr-text-navy-muted">
                                          {row.stage === 2
                                            ? `${row.firstDelayDays}d + ${row.secondDelayDays}d cumulative · `
                                            : ""}
                                          {row.sentCount} sent ·{" "}
                                          {row.successCount} successful
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 sm:justify-end">
                                        {row.isLowSample && (
                                          <span
                                            className="rounded-full px-2 py-1 text-[10px] font-bold rr-text-navy-mid"
                                            style={{
                                              background: "oklch(0.92 0.04 80)",
                                            }}
                                          >
                                            Low sample
                                          </span>
                                        )}
                                        <span className="text-lg font-black rr-text-navy">
                                          {row.successRate == null
                                            ? "—"
                                            : `${row.successRate}%`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div
                              className="mt-3 rounded-xl p-4"
                              style={{
                                background: "oklch(0.97 0.01 260)",
                                border: "1px dashed oklch(0.85 0.03 260)",
                              }}
                            >
                              <p className="text-xs font-bold rr-text-navy">
                                No timing data yet
                              </p>
                              <p className="mt-1 text-[11px] rr-text-navy-muted">
                                Reporting starts after reminders with saved
                                timing snapshots are sent. Legacy reminders are
                                not guessed.
                              </p>
                            </div>
                          )}
                          <p className="mt-2 text-[10px] leading-relaxed rr-text-navy-muted">
                            Success means the linked request was marked
                            responded after this reminder was sent. This is
                            directional last-touch attribution, not proof that
                            timing caused the result.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Re-engagement Win-back Settings ────────────────────────────────── */}
                  <div
                    className="rounded-xl p-3.5 rr-bg-white-card"
                    style={{ border: "1px solid oklch(0.91 0.02 260)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw
                          size={14}
                          style={{ color: "oklch(0.45 0.10 260)" }}
                        />
                        <span
                          className="text-xs font-black"
                          style={{
                            color: "oklch(0.30 0.04 260)",
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          Re-engagement Win-back
                        </span>
                      </div>
                      <Switch
                        checked={
                          (reEngagementSettings?.reEngagementEnabled ?? 1) === 1
                        }
                        onCheckedChange={v =>
                          updateReEngagementSettings.mutate({
                            reEngagementEnabled: v ? 1 : 0,
                          })
                        }
                      />
                    </div>
                    <p className="text-sm font-semibold rr-text-navy-mid">
                      Send a single win-back email to churned users 3 days after
                      they cancel. Includes an unsubscribe link.
                    </p>
                  </div>

                  {/* Advanced: host/port — collapsed by default, auto-expanded for custom domains */}
                  <details
                    className="text-sm font-semibold rr-text-navy-mid"
                    open={showAdvanced}
                    onToggle={e =>
                      setShowAdvanced((e.target as HTMLDetailsElement).open)
                    }
                  >
                    <summary className="cursor-pointer font-semibold py-1">
                      Advanced settings (auto-detected)
                    </summary>
                    <div className="flex flex-col gap-2 mt-2">
                      {/* Provider preset quick-fill buttons */}
                      <div>
                        <p className="text-xs font-bold mb-1.5 rr-text-navy-mid">
                          Quick-fill by provider
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              {
                                label: "Google Workspace",
                                host: "smtp.gmail.com",
                                port: 587,
                              },
                              {
                                label: "Outlook / M365",
                                host: "smtp-mail.outlook.com",
                                port: 587,
                              },
                              {
                                label: "Zoho Mail",
                                host: "smtp.zoho.com",
                                port: 587,
                              },
                              {
                                label: "Yahoo Mail",
                                host: "smtp.mail.yahoo.com",
                                port: 587,
                              },
                            ] as const
                          ).map(preset => (
                            <button
                              key={preset.host}
                              type="button"
                              onClick={() => {
                                setSmtpHost(preset.host);
                                setSmtpPort(preset.port);
                                setSmtpSecure(0);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors"
                              style={{
                                background:
                                  smtpHost === preset.host
                                    ? "oklch(0.22 0.09 260)"
                                    : "oklch(0.96 0.01 260)",
                                color:
                                  smtpHost === preset.host
                                    ? "oklch(0.80 0.18 80)"
                                    : "oklch(0.40 0.04 260)",
                                borderColor:
                                  smtpHost === preset.host
                                    ? "oklch(0.22 0.09 260)"
                                    : "oklch(0.88 0.02 260)",
                              }}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={e => setSmtpHost(e.target.value)}
                          placeholder="smtp.yourdomain.com"
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{
                            border: "2px solid oklch(0.90 0.02 260)",
                            fontSize: "16px",
                          }}
                          name="rr-pages-settings-smtp-host-3108"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                            Port
                          </label>
                          <input
                            type="number"
                            value={smtpPort}
                            onChange={e => setSmtpPort(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                            style={{
                              border: "2px solid oklch(0.90 0.02 260)",
                              fontSize: "16px",
                            }}
                            name="rr-pages-settings-smtp-port-3120"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                            Security
                          </label>
                          <select
                            value={smtpSecure}
                            onChange={e =>
                              setSmtpSecure(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-white"
                            style={{
                              border: "2px solid oklch(0.90 0.02 260)",
                              fontSize: "16px",
                            }}
                            name="rr-pages-settings-smtp-secure-3130"
                          >
                            <option value={0}>STARTTLS (587)</option>
                            <option value={1}>SSL/TLS (465)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </details>

                  <SmtpCandidateConnectionActions
                    result={smtpTestResult}
                    testing={testCredentials.isPending}
                    connecting={connectSmtp.isPending}
                    translate={t}
                    onTest={() => {
                      if (!smtpEmail.trim()) {
                        toast.error("Email address is required");
                        return;
                      }
                      if (!smtpPassword.trim()) {
                        toast.error("Password is required");
                        return;
                      }
                      if (!smtpHost.trim()) {
                        toast.error(
                          "SMTP host is required — check Advanced settings"
                        );
                        return;
                      }
                      setSmtpTestResult(null);
                      testCredentials.mutate({
                        email: smtpEmail.trim(),
                        password: smtpPassword,
                        host: smtpHost.trim(),
                        port: smtpPort,
                        secure: smtpSecure,
                      });
                    }}
                    onConnect={() => {
                      if (!smtpEmail.trim()) {
                        toast.error("Email address is required");
                        return;
                      }
                      if (!smtpPassword.trim()) {
                        toast.error("Password is required");
                        return;
                      }
                      if (!smtpHost.trim()) {
                        toast.error(
                          "SMTP host is required — check Advanced settings"
                        );
                        return;
                      }
                      const promise = connectSmtp.mutateAsync({
                        email: smtpEmail.trim(),
                        password: smtpPassword,
                        host: smtpHost.trim(),
                        port: smtpPort,
                        secure: smtpSecure,
                        fromName: smtpFromName.trim() || undefined,
                      });
                      toast.promise(promise, {
                        loading: "Testing connection...",
                        success: "Email account connected!",
                        error: err => err?.message ?? "Connection failed",
                      });
                    }}
                    onCancel={
                      showSmtpForm ? () => setShowSmtpForm(false) : undefined
                    }
                  />
                </div>
              )}
            </div>
            {/* ── Billing ──────────────────────────────────────────────────────── */}
            <BillingSection profile={profile} />
            {/* ── Bulk Sender ──────────────────────────────────────────────────── */}
            <BulkSenderSection profile={profile} />
            {/* ── WooCommerce ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={18} className="rr-text-navy" />
                <h2 className="text-base font-black rr-text-navy">
                  {t("wooCommerce.title")}
                </h2>
              </div>
              <p className="text-xs mb-4 rr-text-navy-muted">
                {t("wooCommerce.description")}
              </p>

              {wooCreds ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl rr-bg-green-pale">
                    <CheckCircle2 size={18} className="rr-text-green" />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: "oklch(0.30 0.12 145)" }}
                      >
                        {t("wooCommerce.storeConnected")}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{ color: "oklch(0.45 0.10 145)" }}
                      >
                        {wooCreds.storeUrl}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {wooCreds.lastSyncedAt ? (
                          <p
                            className="text-xs flex items-center gap-1"
                            style={{ color: "oklch(0.50 0.10 145)" }}
                          >
                            <Clock size={10} />
                            Last synced{" "}
                            {new Date(wooCreds.lastSyncedAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                            {(wooCreds.lastSyncCount ?? 0) > 0 && (
                              <span style={{ color: "oklch(0.40 0.12 145)" }}>
                                · {wooCreds.lastSyncCount} staged
                              </span>
                            )}
                          </p>
                        ) : (
                          <p
                            className="text-xs"
                            style={{ color: "oklch(0.55 0.08 80)" }}
                          >
                            Not yet synced
                          </p>
                        )}
                        <button
                          onClick={() => quickSync.mutate({ days: 30 })}
                          disabled={quickSync.isPending}
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full transition-opacity disabled:opacity-60"
                          style={{
                            background: "oklch(0.88 0.06 145)",
                            color: "oklch(0.30 0.12 145)",
                          }}
                        >
                          {quickSync.isPending ? (
                            <Loader2 size={9} className="animate-spin" />
                          ) : (
                            <RefreshCw size={9} />
                          )}
                          {quickSync.isPending
                            ? t("wooCommerce.syncing")
                            : t("wooCommerce.sync")}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Pending Imports Banner */}
                  {wooPending && wooPending.count > 0 && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{
                        background: "oklch(0.97 0.04 80)",
                        border: "1px solid oklch(0.88 0.08 80)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock
                          size={14}
                          style={{ color: "oklch(0.55 0.12 80)" }}
                        />
                        <p
                          className="text-sm font-bold"
                          style={{ color: "oklch(0.35 0.10 80)" }}
                        >
                          {wooPending.count} pending import
                          {wooPending.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <p
                        className="text-xs mb-3"
                        style={{ color: "oklch(0.45 0.06 80)" }}
                      >
                        These WooCommerce orders are staged and waiting. Import
                        them now, or they'll be auto-imported on Monday at 03:00
                        GMT if they're older than 7 days.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => importPending.mutate()}
                          disabled={importPending.isPending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-opacity disabled:opacity-60 rr-bg-navy text-white"
                        >
                          {importPending.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Download size={12} />
                          )}
                          Import Now
                        </button>
                        <button
                          onClick={() => dismissPending.mutate()}
                          disabled={dismissPending.isPending}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-60 rr-text-navy-mid"
                          style={{ background: "oklch(0.93 0.02 260)" }}
                        >
                          {dismissPending.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : null}
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Sync History Chart */}
                  {syncHistory && syncHistory.length > 1 && (
                    <div className="rounded-xl px-4 py-3 rr-bg-white-card">
                      <p className="text-xs font-bold mb-2 rr-text-navy-mid">
                        Sync History (last {syncHistory.length} syncs)
                      </p>
                      <ResponsiveContainer width="100%" height={64}>
                        <BarChart
                          data={[...syncHistory].reverse().map((s, i) => ({
                            i,
                            added: s.added,
                            total: s.total,
                          }))}
                          barSize={8}
                        >
                          <XAxis dataKey="i" hide />
                          <RechartsTooltip
                            formatter={(value, name) => [
                              value,
                              (name as string) === "added"
                                ? "Staged"
                                : "Fetched",
                            ]}
                            labelFormatter={() => ""}
                            contentStyle={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 6,
                            }}
                          />
                          <Bar
                            dataKey="total"
                            fill="oklch(0.85 0.04 260)"
                            radius={[3, 3, 0, 0]}
                          />
                          <Bar
                            dataKey="added"
                            fill="oklch(0.50 0.15 145)"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs rr-text-navy-mid">
                          <span
                            className="inline-block w-2 h-2 rounded-sm"
                            style={{ background: "oklch(0.85 0.04 260)" }}
                          />{" "}
                          Fetched
                        </span>
                        <span
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "oklch(0.40 0.12 145)" }}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-sm"
                            style={{ background: "oklch(0.50 0.15 145)" }}
                          />{" "}
                          Staged
                        </span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => navigate("/woo-customers")}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-navy text-white"
                  >
                    <ShoppingBag size={16} />
                    {t("wooCommerce.viewCustomers")}
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setWooUrl(wooCreds.storeUrl);
                      setWooFormOpen(true);
                    }}
                    className="text-xs text-center py-2 rr-text-navy-muted"
                  >
                    {t("wooCommerce.updateCredentials")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {!wooFormOpen ? (
                    <button
                      onClick={() => setWooFormOpen(true)}
                      className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
                    >
                      <ShoppingBag size={16} />
                      Connect WooCommerce Store
                    </button>
                  ) : null}
                </div>
              )}

              {wooFormOpen && (
                <div className="flex flex-col gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      Store URL *
                    </label>
                    <input
                      type="url"
                      value={wooUrl}
                      onChange={e => setWooUrl(e.target.value)}
                      placeholder="https://yourstore.com"
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-woo-url-3319"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      Consumer Key *
                    </label>
                    <input
                      type="text"
                      value={wooKey}
                      onChange={e => setWooKey(e.target.value)}
                      placeholder="ck_xxxxxxxxxxxxxxxx"
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontSize: "16px",
                      }}
                      name="rr-pages-settings-woo-key-3330"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      Consumer Secret *
                    </label>
                    <div className="relative">
                      <input
                        id="woo-consumer-secret"
                        type={showWooSecret ? "text" : "password"}
                        value={wooSecret}
                        onChange={e => {
                          setWooSecret(e.target.value);
                          setWooSecretTouched(true);
                        }}
                        onBlur={() => setWooSecretTouched(true)}
                        placeholder="cs_xxxxxxxxxxxxxxxx"
                        autoComplete="new-password"
                        aria-invalid={wooSecretTouched && !wooSecret.trim()}
                        aria-describedby={
                          wooSecretTouched
                            ? "woo-consumer-secret-feedback"
                            : undefined
                        }
                        className="w-full px-3 py-3 pr-12 rounded-xl text-sm outline-none"
                        style={{
                          border:
                            wooSecretTouched && !wooSecret.trim()
                              ? "2px solid oklch(0.62 0.20 27)"
                              : wooSecretTouched
                                ? "2px solid oklch(0.56 0.14 145)"
                                : "2px solid oklch(0.90 0.02 260)",
                          fontSize: "16px",
                        }}
                        name="rr-pages-settings-woo-secret-3341"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWooSecret(value => !value)}
                        aria-label={
                          showWooSecret
                            ? "Hide consumer secret"
                            : "Show consumer secret"
                        }
                        aria-pressed={showWooSecret}
                        className="absolute right-1 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg rr-text-navy-muted"
                      >
                        {showWooSecret ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {wooSecretTouched && (
                      <p
                        id="woo-consumer-secret-feedback"
                        role="status"
                        aria-live="polite"
                        className="mt-1 text-xs font-semibold"
                        style={{
                          color: wooSecret.trim()
                            ? "oklch(0.40 0.12 145)"
                            : "oklch(0.48 0.16 27)",
                        }}
                      >
                        {t(
                          wooSecret.trim()
                            ? "smtp.credentialReady"
                            : "smtp.credentialRequired",
                          {
                            defaultValue: wooSecret.trim()
                              ? "Secret entered."
                              : "Consumer secret is required.",
                          }
                        )}
                      </p>
                    )}
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      WooCommerce → Settings → Advanced → REST API → Add key
                      (Read permission)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveWoo}
                      disabled={saveWooCreds.isPending}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm rr-bg-navy text-white"
                    >
                      {saveWooCreds.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => setWooFormOpen(false)}
                      className="px-4 py-3 rounded-xl text-sm font-bold rr-text-navy-mid"
                      style={{ background: "oklch(0.93 0.02 260)" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* ── Koalendar ───────────────────────────────────────────────────── */}
            <KoalendarSettingsCard
              hasPaidAccess={
                user?.role === "admin" ||
                ["pro", "annual", "lifetime"].includes(profile?.tier ?? "free")
              }
            />
            {/* ── Tools ──────────────────────────────────────────────────────────────────────── */}
            <div
              className="rounded-2xl p-4 shadow-sm bg-white"
              style={{ border: "1px solid oklch(0.92 0.02 260)" }}
            >
              <h2 className="text-xs font-black uppercase tracking-widest mb-3 rr-text-navy-muted">
                Tools
              </h2>
              <div className="flex flex-col gap-1">
                {[
                  {
                    label: "Saved Contacts",
                    icon: <Mail size={15} />,
                    path: "/contacts",
                  },
                  {
                    label: "Email Templates",
                    icon: <Settings size={15} />,
                    path: "/templates",
                  },
                  {
                    label: "Follow-up Reminders",
                    icon: <Clock size={15} />,
                    path: "/reminders",
                  },
                ].map(({ label, icon, path }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
                    style={{ color: "oklch(0.30 0.04 260)" }}
                  >
                    <span className="flex items-center gap-2">
                      {icon}
                      {label}
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </button>
                ))}

                {/* Redo Setup */}
                <button
                  onClick={() => resetOnboarding.mutate()}
                  disabled={resetOnboarding.isPending}
                  className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
                  style={{ color: "oklch(0.30 0.04 260)" }}
                >
                  <span className="flex items-center gap-2">
                    {resetOnboarding.isPending ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    Redo Setup Wizard
                  </span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
              </div>
            </div>{" "}
            {/* ── Sign Out ─────────────────────────────────────────────────────── */}
            {/* ── Install App ──────────────────────────────────────────────── */}
            <button
              onClick={() => {
                localStorage.removeItem("pwa-prompt-dismissed");
                window.location.reload();
              }}
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent"
              style={{ color: "oklch(0.45 0.10 260)" }}
              aria-label="Show app install instructions"
            >
              <Smartphone size={14} aria-hidden="true" />
              Install App on Your Phone
            </button>
            {/* ── Developer integrations ─────────────────────────────────────────── */}
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
                  <Key size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black rr-text-navy">
                    {t("developerIntegrations.title", {
                      defaultValue: "Developer integrations",
                    })}
                  </h2>
                  <p className="mt-1 text-xs leading-5 rr-text-navy-mid">
                    {t("developerIntegrations.settingsCard", {
                      defaultValue:
                        "Create scoped API keys, connect website forms, and review privacy-safe import history in one workspace.",
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/developer")}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold transition active:scale-[0.97]"
              >
                {t("developerIntegrations.open", {
                  defaultValue: "Open developer workspace",
                })}
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
            {/* ── Outbound Webhooks ────────────────────────────────────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe size={18} className="rr-text-navy" />
                  <h2 className="text-base font-black rr-text-navy">
                    Outbound Webhooks
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddWebhook(!showAddWebhook)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold rr-bg-navy text-white"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <p className="text-xs mb-4 rr-text-navy-muted">
                Fire a POST request to your URL whenever a new contact is
                created. Use this to push contacts into a CRM, Slack, or Google
                Sheets.
              </p>
              {showAddWebhook && (
                <div className="rounded-xl p-4 mb-4 space-y-3 rr-bg-white-card">
                  <input
                    type="text"
                    value={newWebhookLabel}
                    onChange={e => setNewWebhookLabel(e.target.value)}
                    placeholder="Label (e.g. Zapier CRM)"
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white"
                    style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
                    name="rr-pages-settings-new-webhook-label-3465"
                  />
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={e => setNewWebhookUrl(e.target.value)}
                    placeholder="https://hooks.zapier.com/..."
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white"
                    style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
                    name="rr-pages-settings-new-webhook-url-3472"
                  />
                  <input
                    type="text"
                    value={newWebhookSecret}
                    onChange={e => setNewWebhookSecret(e.target.value)}
                    placeholder="Signing secret (optional — HMAC-SHA256)"
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white"
                    style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
                    name="rr-pages-settings-new-webhook-secret-3479"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddWebhook(false)}
                      className="px-3 py-1.5 rounded-xl text-sm font-black rr-text-navy"
                      style={{ background: "oklch(0.90 0.01 260)" }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={
                        !newWebhookUrl.trim() || createWebhook.isPending
                      }
                      onClick={() =>
                        createWebhook.mutate({
                          url: newWebhookUrl.trim(),
                          label: newWebhookLabel.trim() || "My Webhook",
                          secret: newWebhookSecret.trim() || undefined,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1 rr-bg-navy text-white"
                    >
                      {createWebhook.isPending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}{" "}
                      Save
                    </button>
                  </div>
                </div>
              )}
              {(!webhookList || webhookList.length === 0) &&
                !showAddWebhook && (
                  <p
                    className="text-xs text-center py-4"
                    style={{ color: "oklch(0.35 0.04 260)" }}
                  >
                    No webhooks yet. Click Add to create one.
                  </p>
                )}
              <div className="space-y-2">
                {(webhookList ?? []).map(wh => (
                  <div key={wh.id} className="rounded-xl p-3 rr-bg-white-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate rr-text-navy">
                          {wh.label}
                        </p>
                        <p className="text-xs truncate rr-text-navy-muted">
                          {wh.url}
                        </p>
                        {wh.lastFiredAt && (
                          <p
                            className="text-xs mt-0.5"
                            style={{
                              color:
                                wh.lastStatus &&
                                wh.lastStatus >= 200 &&
                                wh.lastStatus < 300
                                  ? "oklch(0.50 0.15 145)"
                                  : "oklch(0.55 0.15 25)",
                            }}
                          >
                            Last: HTTP {wh.lastStatus} ·{" "}
                            {new Date(wh.lastFiredAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() =>
                            testWebhook.mutate({ id: wh.id, url: wh.url })
                          }
                          disabled={testWebhook.isPending}
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background: "oklch(0.93 0.02 260)",
                            color: "oklch(0.30 0.08 260)",
                          }}
                        >
                          Test
                        </button>
                        <button
                          onClick={() =>
                            setExpandedWebhookId(
                              expandedWebhookId === wh.id ? null : wh.id
                            )
                          }
                          className="px-2 py-1 rounded-lg text-xs font-bold"
                          style={{
                            background:
                              expandedWebhookId === wh.id
                                ? "oklch(0.22 0.09 260)"
                                : "oklch(0.93 0.02 260)",
                            color:
                              expandedWebhookId === wh.id
                                ? "white"
                                : "oklch(0.30 0.08 260)",
                          }}
                        >
                          Logs
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete webhook "${wh.label}"?`))
                              deleteWebhook.mutate({ id: wh.id });
                          }}
                          className="p-1.5 rounded-lg"
                          style={{
                            background: "oklch(0.96 0.01 25)",
                            color: "oklch(0.55 0.15 25)",
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {/* Delivery logs panel */}
                    {expandedWebhookId === wh.id && (
                      <div
                        className="mt-2 rounded-xl p-3"
                        style={{ background: "oklch(0.94 0.01 260)" }}
                      >
                        <p
                          className="text-xs font-bold mb-2"
                          style={{ color: "oklch(0.30 0.08 260)" }}
                        >
                          Last 5 Deliveries
                        </p>
                        {!webhookLogs || webhookLogs.length === 0 ? (
                          <p
                            className="text-xs"
                            style={{ color: "oklch(0.60 0.04 260)" }}
                          >
                            No deliveries yet — fire a test ping to see logs
                            here.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {webhookLogs.map((log: any) => (
                              <div
                                key={log.id}
                                className="rounded-lg px-2.5 py-2"
                                style={{
                                  background: log.success
                                    ? "oklch(0.96 0.04 145)"
                                    : "oklch(0.97 0.03 25)",
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className="text-xs font-bold"
                                    style={{
                                      color: log.success
                                        ? "oklch(0.40 0.15 145)"
                                        : "oklch(0.50 0.18 25)",
                                    }}
                                  >
                                    {log.success ? "✓" : "✗"} HTTP{" "}
                                    {log.statusCode ?? "ERR"} · {log.durationMs}
                                    ms
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {!log.success && (
                                      <button
                                        onClick={() =>
                                          retryDelivery.mutate({
                                            webhookId: wh.id,
                                            logId: log.id,
                                          })
                                        }
                                        disabled={retryDelivery.isPending}
                                        className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-opacity disabled:opacity-60 rr-bg-navy text-white"
                                      >
                                        {retryDelivery.isPending ? (
                                          <Loader2
                                            size={9}
                                            className="animate-spin"
                                          />
                                        ) : (
                                          <RotateCcw size={9} />
                                        )}
                                        Retry
                                      </button>
                                    )}
                                    <span className="text-sm font-semibold rr-text-navy-mid">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                {log.errorMessage && (
                                  <p
                                    className="text-xs mt-0.5 truncate"
                                    style={{ color: "oklch(0.50 0.18 25)" }}
                                  >
                                    {log.errorMessage}
                                  </p>
                                )}
                                {log.responseBody && (
                                  <p
                                    className="text-xs mt-0.5 truncate"
                                    style={{ color: "oklch(0.30 0.05 260)" }}
                                  >
                                    {log.responseBody}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* ── Notification Preferences ─────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Bell size={18} className="rr-text-navy" />
                <h2 className="text-base font-black rr-text-navy">
                  {t("tabs.notifications", {
                    defaultValue: "Notification Preferences",
                  })}
                </h2>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rr-bg-white-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold rr-text-navy">
                    WooCommerce auto-import notification
                  </p>
                  <p className="text-xs mt-0.5 rr-text-navy-muted">
                    Receive an in-app notification when the Monday auto-import
                    runs and contacts are added.
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateNotifPrefs.mutate({
                      wooAutoImportNotify: !notifPrefs?.wooAutoImportNotify,
                    })
                  }
                  disabled={updateNotifPrefs.isPending}
                  className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
                  style={{
                    background: notifPrefs?.wooAutoImportNotify
                      ? "oklch(0.50 0.15 145)"
                      : "oklch(0.80 0.02 260)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: notifPrefs?.wooAutoImportNotify
                        ? "calc(100% - 1.35rem)"
                        : "0.1rem",
                    }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2 rr-bg-white-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold rr-text-navy">
                    Email open notifications
                  </p>
                  <p className="text-xs mt-0.5 rr-text-navy-muted">
                    Receive an in-app notification each time a customer opens
                    your review request email.
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateNotifPrefs.mutate({
                      notifyOnEmailOpen: !notifPrefs?.notifyOnEmailOpen,
                    })
                  }
                  disabled={updateNotifPrefs.isPending}
                  className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
                  style={{
                    background: notifPrefs?.notifyOnEmailOpen
                      ? "oklch(0.50 0.15 145)"
                      : "oklch(0.80 0.02 260)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: notifPrefs?.notifyOnEmailOpen
                        ? "calc(100% - 1.35rem)"
                        : "0.1rem",
                    }}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2 rr-bg-white-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold rr-text-navy">
                    {t("settings.onboardingTips.title", {
                      defaultValue: "Onboarding tips",
                    })}
                  </p>
                  <p className="text-xs mt-0.5 rr-text-navy-muted">
                    {t("settings.onboardingTips.description", {
                      defaultValue:
                        "Show contextual setup tips the next time you open onboarding. You can also change this inside the setup wizard.",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleOnboardingTips}
                  disabled={updateNotifPrefs.isPending}
                  aria-pressed={notifPrefs?.onboardingTipsEnabled ?? true}
                  aria-label={
                    (notifPrefs?.onboardingTipsEnabled ?? true)
                      ? t("settings.onboardingTips.disable", {
                          defaultValue: "Disable onboarding tips",
                        })
                      : t("settings.onboardingTips.enable", {
                          defaultValue: "Enable onboarding tips",
                        })
                  }
                  className="shrink-0 w-10 h-6 rounded-full transition-colors relative disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background:
                      (notifPrefs?.onboardingTipsEnabled ?? true)
                        ? "oklch(0.50 0.15 145)"
                        : "oklch(0.80 0.02 260)",
                  }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left:
                        (notifPrefs?.onboardingTipsEnabled ?? true)
                          ? "calc(100% - 1.35rem)"
                          : "0.1rem",
                    }}
                  />
                </button>
              </div>
              {/* ── Haptic Feedback toggle ────────────────────────────────── */}
              <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2 rr-bg-white-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold rr-text-navy">
                    {t("settings.hapticFeedback.title", {
                      defaultValue: "Haptic feedback",
                    })}
                  </p>
                  <p className="text-xs mt-0.5 rr-text-navy-muted">
                    {t("settings.hapticFeedback.description", {
                      defaultValue:
                        "Use vibration on supported devices for taps and reconnection confirmations. Reduced-motion preferences are always respected.",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHapticEnabled(!hapticEnabled)}
                  className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
                  style={{
                    background: hapticEnabled
                      ? "oklch(0.50 0.15 145)"
                      : "oklch(0.80 0.02 260)",
                  }}
                  aria-pressed={hapticEnabled}
                  aria-label={
                    hapticEnabled
                      ? t("settings.hapticFeedback.disable", {
                          defaultValue: "Disable haptic feedback",
                        })
                      : t("settings.hapticFeedback.enable", {
                          defaultValue: "Enable haptic feedback",
                        })
                  }
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                    style={{
                      left: hapticEnabled ? "calc(100% - 1.35rem)" : "0.1rem",
                    }}
                  />
                </button>
              </div>
            </div>
            <SendFeedbackSection />
            {user?.role === "admin" && <ApplicationVersionDiagnosticsCard />}
            {/* ── Admin: OAuth & Auth Integrations ────────────────────────────── */}
            {user?.role === "admin" && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Settings size={18} className="rr-text-navy" />
                  <h2 className="text-base font-black rr-text-navy">
                    Auth Integrations
                  </h2>
                </div>

                {/* Google OAuth redirect URI reminder */}
                <div className="rounded-xl p-4 mb-4 rr-bg-white-card">
                  <div className="flex items-start gap-3">
                    <Info
                      size={16}
                      className="mt-0.5 shrink-0"
                      style={{ color: "oklch(0.50 0.15 260)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold mb-1 rr-text-navy">
                        Google OAuth — Redirect URI Required
                      </p>
                      <p
                        className="text-xs mb-2"
                        style={{ color: "oklch(0.30 0.05 260)" }}
                      >
                        Add these two URIs to your Google Cloud Console OAuth
                        client before Google login will work on the live domain.
                      </p>
                      <div className="space-y-1">
                        {[
                          "https://getphame.app/api/auth/google/callback",
                          "https://revrocket-j5ynazte.manus.space/api/auth/google/callback",
                        ].map(uri => (
                          <div
                            key={uri}
                            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                            style={{ background: "oklch(0.93 0.02 260)" }}
                          >
                            <code
                              className="text-xs truncate"
                              style={{ color: "oklch(0.30 0.08 260)" }}
                            >
                              {uri}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(uri);
                                toast.success("Copied!");
                              }}
                              className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                              style={{
                                color: "oklch(0.50 0.15 260)",
                                background: "oklch(0.88 0.03 260)",
                              }}
                            >
                              Copy
                            </button>
                          </div>
                        ))}
                      </div>
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold mt-3"
                        style={{ color: "oklch(0.50 0.15 260)" }}
                      >
                        Open Google Cloud Console <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Apple Sign In setup */}
                <div className="rounded-xl p-4 rr-bg-white-card">
                  <div className="flex items-start gap-3">
                    <Apple size={16} className="mt-0.5 shrink-0 rr-text-navy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold mb-1 rr-text-navy">
                        Sign in with Apple — 4 Secrets Required
                      </p>
                      <p
                        className="text-xs mb-3"
                        style={{ color: "oklch(0.30 0.05 260)" }}
                      >
                        Add these secrets in Settings → Secrets to enable Apple
                        Sign In.
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            key: "APPLE_CLIENT_ID",
                            hint: "Services ID identifier, e.g. app.phame.signin",
                          },
                          {
                            key: "APPLE_TEAM_ID",
                            hint: "10-char string, top-right of developer.apple.com",
                          },
                          {
                            key: "APPLE_KEY_ID",
                            hint: "Key ID shown after creating a Sign in with Apple key",
                          },
                          {
                            key: "APPLE_PRIVATE_KEY",
                            hint: "Full contents of the .p8 file including header/footer",
                          },
                        ].map(({ key, hint }) => (
                          <div key={key}>
                            <p className="text-xs font-bold rr-text-navy">
                              {key}
                            </p>
                            <p className="text-sm font-semibold rr-text-navy-mid">
                              {hint}
                            </p>
                          </div>
                        ))}
                      </div>
                      <a
                        href="https://developer.apple.com/account/resources/identifiers/list"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold mt-3 rr-text-navy"
                      >
                        Open Apple Developer Console <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* ── Share & Earn ─────────────────────────────────────────────────── */}
            <ShareAndEarnCard profile={profile} />
            {/* ── Compliance Guide ─────────────────────────────────────────────── */}
            <button
              onClick={() => navigate("/compliance")}
              className="w-full flex items-center justify-between bg-white rounded-2xl px-5 py-4 shadow-sm"
              style={{ border: "1px solid oklch(0.91 0.02 260)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "oklch(0.96 0.08 150)" }}
                >
                  <ShieldCheck
                    size={18}
                    style={{ color: "oklch(0.40 0.14 150)" }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold rr-text-navy">
                    Compliance Guide
                  </p>
                  <p className="text-sm font-semibold rr-text-navy-mid">
                    Platform rules, legal notes &amp; best practices
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="rr-text-navy-faint" />
            </button>
            {/* ── Delete Account ───────────────────────────────────────────────── */}
            <DeleteAccountSection />
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-transparent rr-text-navy-muted"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
          {/* end max-width wrapper */}
        </div>
        {/* end outer padding */}
      </div>

      {/* ── Email Preview Modal ─────────────────────────────────────────────── */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(10,16,40,0.75)" }}
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-lg mx-auto mt-12 mb-4 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: "oklch(0.22 0.09 260)",
              maxHeight: "calc(100vh - 80px)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div>
                <p className="text-xs font-bold tracking-widest uppercase rr-text-gold">
                  Email Preview
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  What your customers will see
                </p>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-full p-2 hover:bg-white/10 transition-colors"
                aria-label="Close preview"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Dummy sender row */}
            <div
              className="px-5 py-3 shrink-0 rr-bg-navy-darker"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p
                className="text-sm font-bold"
                style={{ color: "oklch(0.15 0.05 260)" }}
              >
                <span className="font-semibold text-white">From:</span>{" "}
                {smtpStatus?.fromName
                  ? `${smtpStatus.fromName} <${smtpStatus.email}>`
                  : (smtpStatus?.email ?? "your@email.com")}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(0.70 0.05 260)" }}
              >
                <span className="font-semibold text-white">To:</span> Alex
                Johnson &lt;customer@example.com&gt;
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "oklch(0.70 0.05 260)" }}
              >
                <span className="font-semibold text-white">Subject:</span> We'd
                love your feedback! ⭐
              </p>
            </div>

            {/* Email iframe */}
            <div className="flex-1 overflow-auto bg-white">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 size={28} className="animate-spin rr-text-navy" />
                </div>
              ) : previewData?.html ? (
                <iframe
                  srcDoc={previewData.html}
                  title="Email preview"
                  className="w-full border-0"
                  style={{ height: "520px" }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-sm rr-text-navy-mid">
                  Could not load preview.
                </div>
              )}
            </div>

            {/* Footer note */}
            <div
              className="px-5 py-3 shrink-0 text-center rr-bg-navy-darker"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <p className="text-xs" style={{ color: "oklch(0.60 0.04 260)" }}>
                Preview uses{" "}
                <strong className="text-white">Alex Johnson</strong> as a sample
                customer name.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
