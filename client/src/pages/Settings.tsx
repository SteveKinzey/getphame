// ReviewLink — Settings Page
// Sections: Business Profile, Email Connection, Plan

import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  Building2,
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
} from "lucide-react";
import OnboardingGuide from "@/components/OnboardingGuide";

import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";

// ── Inline From Name editor (shown in connected SMTP card) ─────────────────────
function InlineFromNameEdit({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  useEffect(() => { setValue(current); }, [current]);

  const updateFromName = trpc.smtp.updateFromName.useMutation({
    onSuccess: () => { onSaved(); setEditing(false); toast.success("Sender name updated!"); },
    onError: (err) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs flex-1" style={{ color: "oklch(0.55 0.04 260)" }}>
          <span style={{ color: "oklch(0.40 0.04 260)", fontWeight: 600 }}>Sender name:</span>{" "}
          {current || <span style={{ color: "oklch(0.65 0.02 260)" }}>Not set</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded-lg font-bold"
          style={{ color: "oklch(0.45 0.04 260)", background: "oklch(0.96 0.01 260)" }}
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
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Steve at Acme Plumbing"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
      />
      <button
        onClick={() => setEditing(false)}
        className="text-xs px-2 py-1 rounded-lg font-bold"
        style={{ color: "oklch(0.55 0.04 260)", background: "oklch(0.96 0.01 260)" }}
      >
        Cancel
      </button>
      <button
        disabled={updateFromName.isPending}
        onClick={() => updateFromName.mutate({ fromName: value.trim() })}
        className="text-xs px-2 py-1 rounded-lg font-bold"
        style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
      >
        {updateFromName.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
      </button>
    </div>
  );
}

function InlineReplyToEdit({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);

  useEffect(() => { setValue(current); }, [current]);

  const updateReplyTo = trpc.smtp.updateReplyTo.useMutation({
    onSuccess: () => { onSaved(); setEditing(false); toast.success("Reply-To address updated!"); },
    onError: (err) => toast.error(err.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-xs flex-1" style={{ color: "oklch(0.55 0.04 260)" }}>
          <span style={{ color: "oklch(0.40 0.04 260)", fontWeight: 600 }}>Reply-To:</span>{" "}
          {current || <span style={{ color: "oklch(0.65 0.02 260)" }}>Same as sending address</span>}
        </p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded-lg font-bold"
          style={{ color: "oklch(0.45 0.04 260)", background: "oklch(0.96 0.01 260)" }}
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
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. support@mycompany.com"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
      />
      <button
        onClick={() => setEditing(false)}
        className="text-xs px-2 py-1 rounded-lg font-bold"
        style={{ color: "oklch(0.55 0.04 260)", background: "oklch(0.96 0.01 260)" }}
      >
        Cancel
      </button>
      <button
        disabled={updateReplyTo.isPending}
        onClick={() => updateReplyTo.mutate({ replyTo: value.trim() })}
        className="text-xs px-2 py-1 rounded-lg font-bold"
        style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
      >
        {updateReplyTo.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
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
      const subject = encodeURIComponent("ReviewLink Feedback");
      const body = encodeURIComponent(message.trim());
      window.location.href = `mailto:support@reviewlink.app?subject=${subject}&body=${body}`;
      toast.success("Opening your email client to send feedback");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Could not open email client. Please email support@reviewlink.app directly.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full"
        style={{ color: "oklch(0.45 0.10 260)", background: "transparent" }}
        aria-label="Send feedback to ReviewLink support"
      >
        <Send size={14} aria-hidden="true" />
        Send Feedback
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: "oklch(0.97 0.01 260)", border: "1.5px solid oklch(0.88 0.04 260)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
          Send Feedback
        </p>
        <button
          onClick={() => { setOpen(false); setMessage(""); }}
          aria-label="Close feedback form"
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <X size={14} style={{ color: "oklch(0.55 0.05 260)" }} />
        </button>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.50 0.05 260)" }}>
        Found a bug? Have a suggestion? We read every message.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe what you found or what you'd love to see…"
        rows={4}
        maxLength={1000}
        className="w-full rounded-xl px-3 py-2.5 text-xs resize-none outline-none"
        style={{
          background: "white",
          border: "1.5px solid oklch(0.88 0.04 260)",
          color: "oklch(0.22 0.09 260)",
          fontFamily: "'Nunito', sans-serif",
        }}
        aria-label="Feedback message"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: "oklch(0.65 0.04 260)" }}>
          {message.length}/1000
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpen(false); setMessage(""); }}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "oklch(0.94 0.01 260)", color: "oklch(0.40 0.04 260)" }}
          >
            Cancel
          </button>
          <button
            disabled={!message.trim() || sending}
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1"
            style={{
              background: message.trim() ? "oklch(0.22 0.09 260)" : "oklch(0.70 0.04 260)",
              color: "oklch(0.80 0.18 80)",
              cursor: message.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Nunito', sans-serif",
            }}
            aria-label="Send feedback"
          >
            {sending ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Send size={12} aria-hidden="true" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Account Section ────────────────────────────────────────────────────
function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => {
      toast.success("Account deleted. Goodbye!");
      logout();
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full"
        style={{ color: "oklch(0.55 0.15 25)", background: "transparent" }}
      >
        <Trash2 size={14} />
        Delete Account
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: "oklch(0.99 0.005 25)", border: "1.5px solid oklch(0.80 0.12 25)" }}
    >
      <p className="text-sm font-bold" style={{ color: "oklch(0.40 0.15 25)", fontFamily: "'Poppins', sans-serif" }}>
        Delete your account?
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.45 0.05 260)" }}>
        This will permanently delete your account, all contacts, email templates, review requests, tracking data, and SMTP credentials. This action cannot be undone.
      </p>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs" style={{ color: "oklch(0.45 0.05 260)" }}>
          I understand this is permanent and cannot be reversed.
        </span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setConfirmed(false); }}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{ background: "oklch(0.94 0.01 260)", color: "oklch(0.40 0.04 260)" }}
        >
          Cancel
        </button>
        <button
          disabled={!confirmed || deleteAccount.isPending}
          onClick={() => deleteAccount.mutate()}
          className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
          style={{
            background: confirmed ? "oklch(0.50 0.18 25)" : "oklch(0.80 0.05 25)",
            color: "white",
            cursor: confirmed ? "pointer" : "not-allowed",
          }}
        >
          {deleteAccount.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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

function BillingSection({ profile }: { profile: ProfileData | null | undefined }) {
  const [, navigate] = useLocation();
  const [showRetention, setShowRetention] = useState(false);
  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => window.open(url, '_blank'),
    onError: (err) => toast.error(err.message),
  });

  const tier = profile?.tier ?? 'free';
  const planExpiresAt = profile?.planExpiresAt;
  const hasStripe = !!profile?.stripeCustomerId;

  const TIER_LABELS: Record<string, string> = {
    free: 'Free',
    pro: 'Pro Monthly',
    annual: 'Pro Annual',
    lifetime: 'Lifetime',
  };
  const TIER_COLORS: Record<string, { bg: string; text: string }> = {
    free:     { bg: 'oklch(0.94 0.01 260)', text: 'oklch(0.45 0.04 260)' },
    pro:      { bg: 'oklch(0.80 0.18 80)', text: 'oklch(0.22 0.09 260)' },
    annual:   { bg: 'oklch(0.80 0.18 80)', text: 'oklch(0.22 0.09 260)' },
    lifetime: { bg: 'oklch(0.22 0.09 260)', text: 'oklch(0.80 0.18 80)' },
  };
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.free;

  const renewalLabel = (() => {
    if (tier === 'lifetime') return 'Never renews — yours forever';
    if (tier === 'free') return null;
    if (planExpiresAt) {
      const d = new Date(planExpiresAt);
      return `Renews ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
    return null;
  })();

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={18} style={{ color: 'oklch(0.80 0.18 80)' }} />
          <h2
            className="text-base font-black"
            style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}
          >
            Billing
          </h2>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: colors.bg, color: colors.text }}
        >
          {TIER_LABELS[tier] ?? tier.toUpperCase()}
        </span>
      </div>

      {renewalLabel && (
        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'oklch(0.50 0.04 260)' }}>
          <Clock size={12} />
          {renewalLabel}
        </p>
      )}

      {tier === 'free' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: 'oklch(0.55 0.03 260)' }}>
            Upgrade to Pro for unlimited sends, follow-up reminders, and priority support.
          </p>
          <button
            onClick={() => navigate('/upgrade')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
            style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}
          >
            <Crown size={16} />
            Upgrade to Pro
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {hasStripe ? (
            showRetention ? (
              /* ── Retention prompt ─────────────────────────────────────── */
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: 'oklch(0.97 0.005 260)', border: '1.5px solid oklch(0.88 0.03 260)' }}
              >
                <p className="text-sm font-black" style={{ color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}>
                  Before you go...
                </p>
                <div className="space-y-1.5">
                  {[
                    tier === 'annual' ? '2 months free vs monthly — already paid' : null,
                    'Automated follow-up reminders (day 3 + day 10)',
                    'Unlimited review requests',
                    'Priority support',
                  ].filter(Boolean).map((perk) => (
                    <div key={perk as string} className="flex items-center gap-2">
                      <CheckCircle2 size={13} style={{ color: 'oklch(0.55 0.18 145)', flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: 'oklch(0.40 0.04 260)' }}>{perk}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'oklch(0.55 0.03 260)' }}>
                  Cancelling will downgrade your account to Free at the end of the billing period.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRetention(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95"
                    style={{ background: 'oklch(0.80 0.18 80)', color: 'oklch(0.22 0.09 260)', fontFamily: "'Poppins', sans-serif" }}
                  >
                    Keep My Plan
                  </button>
                  <button
                    onClick={() => { setShowRetention(false); navigate('/cancel'); }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: 'oklch(0.94 0.01 260)', color: 'oklch(0.45 0.04 260)' }}
                  >
                    Continue to Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRetention(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                style={{ background: 'oklch(0.22 0.09 260)', color: 'white', fontFamily: "'Poppins', sans-serif" }}
              >
                <ExternalLink size={16} />
                Manage Billing
              </button>
            )
          ) : (
            <p className="text-xs" style={{ color: 'oklch(0.55 0.03 260)' }}>
              Your plan is active. Contact support to manage billing.
            </p>
          )}
          {tier !== 'lifetime' && (
            <button
              onClick={() => navigate('/upgrade')}
              className="text-xs text-center py-1.5"
              style={{ color: 'oklch(0.55 0.03 260)' }}
            >
              View all plans
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const { track } = useAnalytics();

  // ── Profile form state ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const [dailySendLimit, setDailySendLimit] = useState(50);

  // Populate form once profile loads (useEffect avoids render-phase setState)
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName);
      setReviewLink(profile.reviewLink);
      setFromName(profile.fromName ?? "");
      setReplyTo(profile.replyTo ?? "");
      setDailySendLimit(profile.dailySendLimit ?? 50);
    }
  }, [profile?.id]);

  const utils = trpc.useUtils();
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Business profile saved!");
    },
    onError: (err) => toast.error(err.message),
  });

  const setDailySendLimitMutation = trpc.profile.setDailySendLimit.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Daily send limit saved!");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Onboarding status ──────────────────────────────────────────────────────
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery();

  // ── Onboarding reset ─────────────────────────────────────────────────────
  const resetOnboarding = trpc.onboarding.reset.useMutation({
    onSuccess: () => {
      utils.onboarding.status.invalidate();
      toast.success("Setup wizard reopened! Check the home screen.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── WooCommerce credentials ───────────────────────────────────────────────
  const { data: wooCreds } = trpc.woo.getCredentials.useQuery();
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");
  const [wooFormOpen, setWooFormOpen] = useState(false);

  const saveWooCreds = trpc.woo.saveCredentials.useMutation({
    onSuccess: () => {
      utils.woo.getCredentials.invalidate();
      toast.success("WooCommerce store connected!");
      setWooFormOpen(false);
      setWooKey("");
      setWooSecret("");
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: syncHistory } = trpc.woo.syncHistory.useQuery(undefined, { enabled: !!wooCreds });
  const quickSync = trpc.woo.sync.useMutation({
    onSuccess: (result) => {
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
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  // ── WooCommerce pending imports ────────────────────────────────────────────
  const { data: wooPending } = trpc.woo.pendingCount.useQuery(undefined, { enabled: !!wooCreds });
  const importPending = trpc.woo.importPending.useMutation({
    onSuccess: (result) => {
      utils.woo.pendingCount.invalidate();
      utils.woo.listPending.invalidate();
      toast.success(`Imported ${result.imported} customer${result.imported !== 1 ? "s" : ""} from WooCommerce.`);
    },
    onError: (err) => toast.error(err.message),
  });
  const dismissPending = trpc.woo.dismissPending.useMutation({
    onSuccess: () => {
      utils.woo.pendingCount.invalidate();
      toast.success("Pending imports dismissed.");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSaveWoo() {
    if (!wooUrl.trim()) { toast.error("Store URL is required"); return; }
    if (!wooKey.trim()) { toast.error("Consumer Key is required"); return; }
    if (!wooSecret.trim()) { toast.error("Consumer Secret is required"); return; }
    saveWooCreds.mutate({ storeUrl: wooUrl.trim(), consumerKey: wooKey.trim(), consumerSecret: wooSecret.trim() });
  }

  // ── API Keys ──────────────────────────────────────────────────────────────
  const { data: apiKeyList, isLoading: apiKeysLoading } = trpc.apiKey.list.useQuery();
  const [newKeyLabel, setNewKeyLabel] = useState("My API Key");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showSnippet, setShowSnippet] = useState(false);
  const generateKey = trpc.apiKey.generate.useMutation({
    onSuccess: (data) => {
      utils.apiKey.list.invalidate();
      setRevealedKey(data.raw);
      toast.success("API key generated! Copy it now — it won't be shown again.");
    },
    onError: (err) => toast.error(err.message),
  });
  const revokeKey = trpc.apiKey.revoke.useMutation({
    onSuccess: () => {
      utils.apiKey.list.invalidate();
      toast.success("API key revoked.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Recent API Imports & Webhooks ─────────────────────────────────────────
  const { data: recentImports } = trpc.apiKey.recentImports.useQuery({ limit: 10 });
  const { data: webhookList } = trpc.webhook.list.useQuery();
  const { data: notifPrefs } = trpc.notificationPrefs.get.useQuery();
  const updateNotifPrefs = trpc.notificationPrefs.update.useMutation({
    onSuccess: () => { utils.notificationPrefs.get.invalidate(); toast.success("Notification preference saved."); },
    onError: (err) => toast.error(err.message),
  });
  const [expandedWebhookId, setExpandedWebhookId] = useState<number | null>(null);
  const { data: webhookLogs } = trpc.webhook.deliveryLogs.useQuery(
    { webhookId: expandedWebhookId ?? 0, limit: 5 },
    { enabled: expandedWebhookId !== null }
  );
  const handleExportImportsCsv = () => {
    if (!recentImports || recentImports.length === 0) { toast.error("No imports to export."); return; }
    const header = "Date,Email,Key Label,Action";
    const rows = recentImports.map((ev: any) =>
      `"${new Date(ev.createdAt).toLocaleString()}","${ev.email}","${ev.keyLabel}","${ev.created ? 'Created' : 'Updated'}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `reviewlink-api-imports-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
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
    onError: (err) => toast.error(err.message),
  });
  const deleteWebhook = trpc.webhook.delete.useMutation({
    onSuccess: () => { utils.webhook.list.invalidate(); toast.success("Webhook deleted."); },
    onError: (err) => toast.error(err.message),
  });
  const testWebhook = trpc.webhook.test.useMutation({
    onSuccess: (data) => {
      if (data.success) toast.success(`Test ping sent — got HTTP ${data.status}`);
      else toast.error(`Webhook test failed (HTTP ${data.status})`);
    },
    onError: (err) => toast.error(err.message),
  });
  const retryDelivery = trpc.webhook.retryDelivery.useMutation({
    onSuccess: (data) => {
      utils.webhook.deliveryLogs.invalidate();
      if (data.success) toast.success(`Retry succeeded — HTTP ${data.status}`);
      else toast.error(`Retry failed (HTTP ${data.status ?? "ERR"})`);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Review Platforms ─────────────────────────────────────────────────────
  const { data: platforms, isLoading: platformsLoading } = trpc.reviewPlatforms.list.useQuery();
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [editingPlatformId, setEditingPlatformId] = useState<number | null>(null);
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
    onError: (err) => toast.error(err.message),
  });

  const updatePlatform = trpc.reviewPlatforms.update.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      setEditingPlatformId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const restorePlatform = trpc.reviewPlatforms.restore.useMutation({
    onSuccess: () => utils.reviewPlatforms.list.invalidate(),
    onError: (err) => toast.error(`Restore failed: ${err.message}`),
  });

  const removePlatform = trpc.reviewPlatforms.remove.useMutation({
    onSuccess: (_, _variables) => {
      utils.reviewPlatforms.list.invalidate();
    },
    onError: (err) => {
      utils.reviewPlatforms.list.invalidate(); // re-sync in case of partial state
      toast.error(`Could not remove platform: ${err.message}`);
    },
  });

  const setDefaultPlatform = trpc.reviewPlatforms.setDefault.useMutation({
    onSuccess: () => {
      utils.reviewPlatforms.list.invalidate();
      toast.success("Default platform updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const PLATFORM_LABELS: Record<string, string> = {
    google: "Google",
    yelp: "Yelp",
    tripadvisor: "TripAdvisor",
    bing: "Bing",
    facebook: "Facebook",
    other: "Other",
  };

  const PLATFORM_ICONS: Record<string, string> = {
    google: "🔴",   // Google red circle
    yelp: "🍔",      // Yelp red brand
    tripadvisor: "🦉", // TripAdvisor owl
    bing: "🔵",      // Bing blue circle
    facebook: "🔷", // Facebook blue diamond
    other: "🔗",    // generic link
  };

  const PLATFORM_PLACEHOLDERS: Record<string, string> = {
    google: "https://g.page/r/your-business/review",
    yelp: "https://www.yelp.com/biz/your-business",
    tripadvisor: "https://www.tripadvisor.com/Restaurant_Review-...",
    bing: "https://www.bingplaces.com/...",
    facebook: "https://www.facebook.com/your-page/reviews",
    other: "https://...",
  };

  // ── SMTP email connection ──────────────────────────────────────────────────
  const { data: smtpStatus, isLoading: smtpLoading } = trpc.smtp.status.useQuery();
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(0);
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpHint, setSmtpHint] = useState<string | null>(null);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showPasswordGuide, setShowPasswordGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ ok: boolean; error?: string | null } | null>(null);

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
      track("smtp_connect");
      toast.success("Email account connected!");
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectSmtp = trpc.smtp.disconnect.useMutation({
    onSuccess: () => {
      utils.smtp.status.invalidate();
      toast.success("Email account disconnected.");
    },
    onError: (err) => toast.error(err.message),
  });

  const testSmtp = trpc.smtp.test.useMutation({
    onSuccess: (result) => {
      utils.smtp.status.invalidate();
      if (result.ok) {
        toast.success("Connection verified — your email is working correctly.");
      } else {
        toast.error(`Connection failed: ${result.error ?? "Unknown error"}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const testCredentials = trpc.smtp.testCredentials.useMutation({
    onSuccess: (result) => {
      setSmtpTestResult(result);
    },
    onError: (err) => {
      setSmtpTestResult({ ok: false, error: err.message });
    },
  });

  // ── Email preview ─────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: previewData, isLoading: previewLoading } = trpc.smtp.previewEmail.useQuery(
    undefined,
    { enabled: previewOpen }
  );

  const resendWelcome = trpc.smtp.sendWelcome.useMutation({
    onSuccess: () => {
      toast.success(`Confirmation email sent! Check your inbox at ${smtpStatus?.email ?? "your email"}.`, { duration: 5000 });
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSaveProfile() {
    if (!businessName.trim()) { toast.error("Business name is required"); return; }
    if (!reviewLink.trim()) { toast.error("Google review link is required"); return; }
    upsertProfile.mutate({
      businessName: businessName.trim(),
      reviewLink: reviewLink.trim(),
      fromName: fromName.trim() || undefined,
      replyTo: replyTo.trim() || undefined,
    });
  }

  return (
    <>
    <div className="min-h-screen pb-40" style={{ background: "oklch(0.975 0.003 100)" }}>
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
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Settings size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
            >
              Settings
            </span>
          </div>
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: "oklch(0.32 0.08 260)", color: "oklch(0.80 0.18 80)" }}
          >
            <BookOpen size={13} />
            Setup Guide
          </button>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Account & Profile
        </h1>
        {user && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
              {user.name ?? user.email ?? "Signed in"}
            </p>

          </div>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Business Profile ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2
              className="text-base font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Business Profile
            </h2>
          </div>

          {profileLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Maria's Hair Salon"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none border-2 transition-all"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: "16px",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                  <Link2 size={12} className="inline mr-1" />
                  Google Review Link *
                </label>
                <input
                  type="url"
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                  placeholder="https://g.page/r/your-business/review"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: "16px",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                  Find this in Google Business Profile → "Get more reviews"
                </p>
              </div>

              {/* ── Email Sender Settings ───────────────────────────────── */}
              <div
                className="rounded-xl p-3 mt-1"
                style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}
              >
                <p className="text-xs font-black mb-3" style={{ color: "oklch(0.40 0.04 260)", fontFamily: "'Poppins', sans-serif" }}>
                  Email Sender Settings
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                      From Name
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder={businessName || "e.g. Maria's Hair Salon"}
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: "16px",
                        background: "white",
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                      How your name appears in the customer's inbox. Defaults to your business name.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                      Reply-To Email
                    </label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="e.g. steve@sk-america.com"
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                      style={{
                        border: "2px solid oklch(0.90 0.02 260)",
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: "16px",
                        background: "white",
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                      When a customer replies to the email, it goes here. Leave blank to use your connected email address.
                    </p>
                  </div>
                </div>
              </div>

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
                Save Profile
              </button>
            </div>
          )}
        </div>

        {/* ── Review Platforms ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Globe size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
              <h2
                className="text-base font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Review Platforms
              </h2>
            </div>
            <button
              onClick={() => { setShowAddPlatform(true); setEditingPlatformId(null); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
            >
              <Plus size={12} />
              Add
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 260)" }}>
            Add your review page URLs for Google, Yelp, TripAdvisor, Bing, Facebook, and more. Paste the public link customers use to leave a review.
          </p>

          {platformsLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="animate-spin" size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(platforms ?? []).map((p) => (
                <div key={p.id}>
                  {editingPlatformId === p.id ? (
                    /* Edit form inline */
                    <div
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ border: "2px solid oklch(0.80 0.18 80)", background: "oklch(0.98 0.01 80)" }}
                    >
                      <input
                        type="url"
                        defaultValue={p.url}
                        id={`edit-url-${p.id}`}
                        placeholder={PLATFORM_PLACEHOLDERS[p.platform] ?? "https://..."}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                      />
                      {p.platform === "other" && (
                        <input
                          type="text"
                          defaultValue={p.label ?? ""}
                          id={`edit-label-${p.id}`}
                          placeholder="Custom label (e.g. Houzz)"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const urlEl = document.getElementById(`edit-url-${p.id}`) as HTMLInputElement | null;
                            const labelEl = document.getElementById(`edit-label-${p.id}`) as HTMLInputElement | null;
                            if (!urlEl?.value?.trim()) { toast.error("URL is required"); return; }
                            const promise = updatePlatform.mutateAsync({ id: p.id, url: urlEl.value.trim(), label: labelEl?.value?.trim() || undefined });
                            toast.promise(promise, {
                              loading: "Saving...",
                              success: "Platform updated!",
                              error: (err) => err?.message ?? "Failed to update platform",
                            });
                          }}
                          disabled={updatePlatform.isPending}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold"
                          style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
                        >
                          {updatePlatform.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlatformId(null)}
                          className="px-3 py-2 rounded-lg text-xs font-bold"
                          style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
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
                        background: p.isDefault ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.01 260)",
                        border: p.isDefault ? "1px solid oklch(0.80 0.15 145)" : "1px solid oklch(0.92 0.02 260)",
                      }}
                    >
                      <span className="text-lg shrink-0">{PLATFORM_ICONS[p.platform] ?? "🔗"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)" }}>
                            {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                          </span>
                          {p.isDefault === 1 && (
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontSize: "9px" }}
                            >
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate" style={{ color: "oklch(0.55 0.03 260)" }}>{p.url}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.isDefault !== 1 && (
                          <button
                            onClick={() => setDefaultPlatform.mutate({ id: p.id })}
                            title="Set as default"
                            className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50"
                            style={{ color: "oklch(0.65 0.18 80)" }}
                          >
                            <Star size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingPlatformId(p.id)}
                          title="Edit URL"
                          className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                          style={{ color: "oklch(0.45 0.04 260)" }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            // Snapshot before delete for undo
                            const snapshot = { platform: p.platform as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "other", url: p.url, label: p.label ?? undefined, isDefault: p.isDefault };
                            try {
                              await removePlatform.mutateAsync({ id: p.id });
                            } catch {
                              return; // onError already shows toast
                            }
                            toast.custom(
                              (toastId) => (
                                <div
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
                                  style={{ background: "oklch(0.22 0.09 260)", color: "white", minWidth: "260px" }}
                                >
                                  <Trash2 size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
                                  <span className="text-sm flex-1">{PLATFORM_LABELS[snapshot.platform] ?? snapshot.platform} removed</span>
                                  <button
                                    onClick={() => {
                                      restorePlatform.mutate(snapshot);
                                      toast.dismiss(toastId);
                                    }}
                                    className="text-xs font-black px-2 py-1 rounded-lg shrink-0"
                                    style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
                                  >
                                    Undo
                                  </button>
                                </div>
                              ),
                              { duration: 5000 }
                            );
                          }}
                          title="Remove"
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
                  className="text-center py-4 rounded-xl"
                  style={{ background: "oklch(0.97 0.01 260)", border: "1px dashed oklch(0.85 0.03 260)" }}
                >
                  <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                    No review platforms added yet. Click <strong>Add</strong> to get started.
                  </p>
                </div>
              )}

              {/* Add new platform form */}
              {showAddPlatform && (
                <div
                  className="rounded-xl p-3 flex flex-col gap-2 mt-1"
                  style={{ border: "2px solid oklch(0.80 0.18 80)", background: "oklch(0.98 0.01 80)" }}
                >
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Platform</label>
                    <select
                      value={newPlatformType}
                      onChange={(e) => setNewPlatformType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: "2px solid oklch(0.90 0.02 260)", background: "white", fontSize: "16px" }}
                    >
                      {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{PLATFORM_ICONS[val]} {label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Review Page URL *</label>
                    <input
                      type="url"
                      value={newPlatformUrl}
                      onChange={(e) => setNewPlatformUrl(e.target.value)}
                      placeholder={PLATFORM_PLACEHOLDERS[newPlatformType] ?? "https://..."}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    />
                    <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                      Paste the public URL customers use to leave a review on this platform.
                    </p>
                  </div>
                  {newPlatformType === "other" && (
                    <div>
                      <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Custom Label</label>
                      <input
                        type="text"
                        value={newPlatformLabel}
                        onChange={(e) => setNewPlatformLabel(e.target.value)}
                        placeholder="e.g. Houzz, Angi, Thumbtack"
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!newPlatformUrl.trim()) { toast.error("URL is required"); return; }
                        const promise = addPlatform.mutateAsync({
                          platform: newPlatformType as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "other",
                          url: newPlatformUrl.trim(),
                          label: newPlatformLabel.trim() || undefined,
                        });
                        toast.promise(promise, {
                          loading: "Adding platform...",
                          success: "Review platform added!",
                          error: (err) => err?.message ?? "Failed to add platform",
                        });
                      }}
                      disabled={addPlatform.isPending}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-black"
                      style={{ background: "oklch(0.22 0.09 260)", color: "white", fontFamily: "'Poppins', sans-serif" }}
                    >
                      {addPlatform.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add Platform
                    </button>
                    <button
                      onClick={() => { setShowAddPlatform(false); setNewPlatformUrl(""); setNewPlatformLabel(""); }}
                      className="px-3 py-2 rounded-lg text-xs font-bold"
                      style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
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
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2
              className="text-base font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Email Account
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 260)" }}>
            Connect your email so review requests are sent from your own address. Works with Gmail, Outlook, Yahoo, Zoho, and any business email.
          </p>

          {smtpLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : smtpStatus?.connected && !showSmtpForm ? (
            <div className="flex flex-col gap-3">
              {/* Health badge row */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: smtpStatus.verified ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.03 27)" }}
              >
                {smtpStatus.verified
                  ? <CheckCircle2 size={18} style={{ color: "oklch(0.55 0.18 145)" }} />
                  : <AlertCircle size={18} style={{ color: "oklch(0.55 0.18 27)" }} />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: smtpStatus.verified ? "oklch(0.30 0.12 145)" : "oklch(0.40 0.15 27)" }}>
                      {smtpStatus.verified ? "Email Connected" : "Connection Unverified"}
                    </p>
                    {/* Live status dot */}
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: smtpStatus.verified ? "oklch(0.55 0.18 145)" : "oklch(0.65 0.18 27)" }}
                    />
                  </div>
                  <p className="text-xs truncate" style={{ color: smtpStatus.verified ? "oklch(0.45 0.10 145)" : "oklch(0.50 0.12 27)" }}>
                    {smtpStatus.email}
                    {smtpStatus.fromName && ` · ${smtpStatus.fromName}`}
                  </p>
                </div>
                {/* Test connection button */}
                <button
                  onClick={() => testSmtp.mutate()}
                  disabled={testSmtp.isPending}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95"
                  style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
                  title="Test connection"
                >
                  {testSmtp.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />}
                  Test
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSmtpEmail(smtpStatus.email ?? ""); setSmtpFromName(smtpStatus.fromName ?? ""); setShowSmtpForm(true); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                  style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.45 0.04 260)" }}
                >
                  <Pencil size={13} />
                  Change
                </button>
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
                  title="Preview the email your customers will receive"
                >
                  <Eye size={13} />
                  Preview
                </button>
                <button
                  onClick={() => resendWelcome.mutate()}
                  disabled={resendWelcome.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                  style={{ background: "oklch(0.96 0.04 260)", color: "oklch(0.22 0.09 260)" }}
                  title="Resend confirmation email to your inbox"
                >
                  {resendWelcome.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Resend
                </button>
                <button
                  onClick={() => disconnectSmtp.mutate()}
                  disabled={disconnectSmtp.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                  style={{ background: "oklch(0.97 0.02 27)", color: "oklch(0.50 0.18 27)" }}
                >
                  {disconnectSmtp.isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                  Disconnect
                </button>
              </div>

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
                <p className="text-xs" style={{ color: "oklch(0.65 0.02 260)" }}>
                  Last auto-check: {new Date(smtpStatus.lastHealthCheck).toLocaleString()}
                  {" · "}
                  <span style={{ color: smtpStatus.lastHealthStatus === "ok" ? "oklch(0.50 0.18 145)" : "oklch(0.50 0.18 27)", fontWeight: 600 }}>
                    {smtpStatus.lastHealthStatus === "ok" ? "✓ Healthy" : "✗ Failed"}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Not connected — grey health badge */}
              {!smtpStatus?.connected && (
                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: "oklch(0.96 0.01 260)" }}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "oklch(0.70 0.02 260)" }}
                  />
                  <p className="text-xs" style={{ color: "oklch(0.45 0.04 260)" }}>
                    No email connected. Enter your details below to start sending review requests.
                  </p>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Your Email Address *</label>
                <input
                  type="email"
                  value={smtpEmail}
                  onChange={(e) => setSmtpEmail(e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
              </div>

              {/* Password field — smart provider-aware */}
              {(() => {
                const emailDomain = smtpEmail.split('@')[1]?.toLowerCase() ?? '';
                // Provider detection
                const isGmail = emailDomain === 'gmail.com' || emailDomain === 'googlemail.com' || smtpHost === 'smtp.gmail.com';
                const isGoogleWorkspace = smtpHost === 'smtp.gmail.com' && !isGmail;
                const isOutlook = ['outlook.com','hotmail.com','live.com'].includes(emailDomain) || smtpHost === 'smtp-mail.outlook.com';
                const isYahoo = emailDomain === 'yahoo.com' || emailDomain === 'yahoo.co.uk' || emailDomain === 'ymail.com' || smtpHost === 'smtp.mail.yahoo.com';
                const isZoho = emailDomain === 'zoho.com' || emailDomain === 'zohomail.com' || smtpHost === 'smtp.zoho.com';
                const isIcloud = emailDomain === 'icloud.com' || emailDomain === 'me.com' || smtpHost === 'smtp.mail.me.com';
                const isAol = emailDomain === 'aol.com' || emailDomain === 'aim.com' || smtpHost === 'smtp.aol.com';
                const isProtonMail = emailDomain === 'proton.me' || emailDomain === 'protonmail.com' || emailDomain === 'pm.me' || smtpHost === 'smtp.protonmail.ch';
                const isFastmail = emailDomain === 'fastmail.com' || emailDomain === 'fastmail.fm' || emailDomain === 'fastmail.org' || smtpHost === 'smtp.fastmail.com';
                const isKnownProvider = isGmail || isGoogleWorkspace || isOutlook || isYahoo || isZoho || isIcloud || isAol || isProtonMail || isFastmail;
                const isCustom = emailDomain.length > 0 && !isKnownProvider;

                // Smart label
                const passwordLabel = isGmail
                  ? 'Gmail App Password *'
                  : isGoogleWorkspace
                  ? 'Google Workspace App Password *'
                  : isOutlook
                  ? 'Microsoft App Password *'
                  : isYahoo
                  ? 'Yahoo App Password *'
                  : isZoho
                  ? 'Zoho Mail Password *'
                  : isIcloud
                  ? 'Apple App-Specific Password *'
                  : isAol
                  ? 'AOL App Password *'
                  : isProtonMail
                  ? 'ProtonMail SMTP Password *'
                  : isFastmail
                  ? 'Fastmail App Password *'
                  : 'Email Password *';

                // Smart placeholder
                const passwordPlaceholder = smtpStatus?.connected
                  ? 'Enter new password to update'
                  : isGmail || isGoogleWorkspace
                  ? '16-character App Password (no spaces)'
                  : isIcloud
                  ? 'xxxx-xxxx-xxxx-xxxx'
                  : 'Your email password';

                const showGuide = showPasswordGuide;
                const setShowGuide = setShowPasswordGuide;
                const hasGuide = isGmail || isGoogleWorkspace || isOutlook || isYahoo || isZoho || isIcloud || isAol || isProtonMail || isFastmail;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold" style={{ color: 'oklch(0.40 0.04 260)' }}>{passwordLabel}</label>
                      {hasGuide && (
                        <button
                          type="button"
                          onClick={() => setShowGuide((v) => !v)}
                          className="flex items-center gap-1 text-xs font-bold"
                          style={{ color: 'oklch(0.45 0.18 260)' }}
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[10px] font-black" style={{ background: 'oklch(0.45 0.18 260)' }}>?</span>
                          How to get it
                        </button>
                      )}
                    </div>

                    {/* Gmail guide */}
                    {showGuide && isGmail && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Gmail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>myaccount.google.com</span> → Security</li>
                          <li>Turn on <span className="font-bold">2-Step Verification</span> if not already on</li>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>myaccount.google.com/apppasswords</span> → name it <span className="font-bold">ReviewLink</span> → click Create</li>
                          <li>Copy the <span className="font-bold">16-character code</span> and paste it here — <span className="font-bold">remove all spaces</span></li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>Tip: use a dedicated <span className="font-bold">reviews@gmail.com</span> account to keep your main inbox separate.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* Google Workspace guide */}
                    {showGuide && isGoogleWorkspace && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Google Workspace App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Ask your Workspace admin to enable 2-Step Verification in <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>admin.google.com</span></li>
                          <li>Sign in to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>myaccount.google.com</span> with your work account → Security</li>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>myaccount.google.com/apppasswords</span> → name it <span className="font-bold">ReviewLink</span> → click Create</li>
                          <li>Copy the <span className="font-bold">16-character code</span> and paste it here — <span className="font-bold">remove all spaces</span></li>
                        </ol>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* Microsoft / Outlook guide */}
                    {showGuide && isOutlook && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Microsoft App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>account.microsoft.com</span> → Security</li>
                          <li>Click <span className="font-bold">Advanced security options</span></li>
                          <li>Under <span className="font-bold">App passwords</span>, click <span className="font-bold">Create a new app password</span></li>
                          <li>Copy and paste the generated password here</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>Microsoft 365 (work accounts): contact your IT admin to allow SMTP AUTH for your mailbox.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* Yahoo guide */}
                    {showGuide && isYahoo && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Yahoo App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>account.yahoo.com</span> → Security</li>
                          <li>Click <span className="font-bold">Generate app password</span></li>
                          <li>Select <span className="font-bold">Other app</span>, name it <span className="font-bold">ReviewLink</span></li>
                          <li>Copy and paste the password here</li>
                        </ol>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* Zoho guide */}
                    {showGuide && isZoho && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Zoho Mail — Enable SMTP Access</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Log in to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>mail.zoho.com</span></li>
                          <li>Go to <span className="font-bold">Settings</span> → <span className="font-bold">Mail Accounts</span></li>
                          <li>Click your email address → scroll to <span className="font-bold">SMTP</span></li>
                          <li>Toggle <span className="font-bold">Allow SMTP Access</span> to ON, then use your <span className="font-bold">regular Zoho password</span> here</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>No app password needed — just enable SMTP and use your normal Zoho login password.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* AOL guide */}
                    {showGuide && isAol && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>AOL Mail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>account.aol.com</span> → Security</li>
                          <li>Click <span className="font-bold">Generate app password</span></li>
                          <li>Select <span className="font-bold">Other app</span>, name it <span className="font-bold">ReviewLink</span></li>
                          <li>Copy and paste the password here — do <span className="font-bold">not</span> use your regular AOL password</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>AOL requires 2-step verification to be enabled before generating app passwords.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* ProtonMail guide */}
                    {showGuide && isProtonMail && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>ProtonMail — SMTP Bridge Password</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Download and install <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>Proton Mail Bridge</span> from proton.me/mail/bridge</li>
                          <li>Sign in to Bridge with your Proton account</li>
                          <li>In Bridge, click your account → copy the <span className="font-bold">SMTP password</span> shown</li>
                          <li>Paste that SMTP password here — <span className="font-bold">not</span> your regular Proton login password</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>ProtonMail Bridge must be running on your computer for SMTP to work. Use port 1025 (localhost) or 587 via Bridge.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* Fastmail guide */}
                    {showGuide && isFastmail && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Fastmail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>app.fastmail.com</span> → Settings → Privacy & Security</li>
                          <li>Scroll to <span className="font-bold">Third-party apps</span> → click <span className="font-bold">New app password</span></li>
                          <li>Name it <span className="font-bold">ReviewLink</span>, set access to <span className="font-bold">Mail (SMTP)</span></li>
                          <li>Copy and paste the generated password here</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>Fastmail app passwords are provider-specific — do not use your regular Fastmail login password.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    {/* iCloud guide */}
                    {showGuide && isIcloud && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2" style={{ background: 'oklch(0.22 0.09 260)', color: 'white' }}>
                        <p className="font-black text-sm" style={{ color: 'oklch(0.80 0.18 80)' }}>Apple iCloud — App-Specific Password</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold" style={{ color: 'oklch(0.80 0.18 80)' }}>appleid.apple.com</span> → Sign In & Security</li>
                          <li>Click <span className="font-bold">App-Specific Passwords</span> → <span className="font-bold">Generate an App-Specific Password</span></li>
                          <li>Name it <span className="font-bold">ReviewLink</span> and click Create</li>
                          <li>Copy the <span className="font-bold">xxxx-xxxx-xxxx-xxxx</span> password and paste it here</li>
                        </ol>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.70 0.03 260)' }}>Requires two-factor authentication to be enabled on your Apple ID.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1" style={{ color: 'oklch(0.80 0.18 80)' }}>Got it ✓</button>
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        placeholder={passwordPlaceholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-10"
                        style={{ border: '2px solid oklch(0.90 0.02 260)', fontSize: '16px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                        style={{ color: 'oklch(0.55 0.03 260)' }}
                      >
                        {showSmtpPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    {/* Inline hint for known providers that need app passwords */}
                    {(isGmail || isGoogleWorkspace) && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Not your regular Gmail password — use an <span className="font-bold">App Password</span>. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}
                    {isIcloud && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Use an <span className="font-bold">App-Specific Password</span>, not your Apple ID password. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}
                    {isZoho && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Enable SMTP access in Zoho first, then use your regular Zoho password. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}
                    {isAol && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Not your regular AOL password — use an <span className="font-bold">App Password</span>. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}
                    {isProtonMail && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        ProtonMail requires the <span className="font-bold">Proton Bridge</span> app — use its SMTP password, not your Proton login. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}
                    {isFastmail && !smtpStatus?.connected && !showGuide && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Not your regular Fastmail password — use an <span className="font-bold">App Password</span>. Tap <span className="font-bold">? How to get it</span> above.
                      </p>
                    )}

                    {/* Custom SMTP notice */}
                    {isCustom && !smtpStatus?.connected && (
                      <p className="text-xs mt-1.5" style={{ color: 'oklch(0.55 0.10 260)' }}>
                        Custom domain detected — SMTP settings auto-filled below. Check <span className="font-bold">Advanced settings</span> to verify or adjust host/port.
                      </p>
                    )}

                    {/* Fallback hint from server for unrecognised providers */}
                    {!isKnownProvider && !isCustom && smtpHint && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'oklch(0.97 0.03 80)', color: 'oklch(0.45 0.10 80)' }}>
                        💡 {smtpHint}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Display name */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Display Name (optional)</label>
                <input
                  type="text"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder="e.g. Steve at Acme Plumbing"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
                <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>Shown as the sender name in your customer's inbox.</p>
              </div>

              {/* ── Deliverability guidance callout ───────────────────────────────────────── */}
              <div
                className="flex items-start gap-3 px-3 py-3 rounded-xl text-xs"
                style={{ background: "oklch(0.97 0.02 260)", border: "1px solid oklch(0.90 0.03 260)" }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: "oklch(0.50 0.12 260)" }} />
                <div style={{ color: "oklch(0.40 0.04 260)" }}>
                  <p className="font-bold mb-1">Sending limits by provider</p>
                  <ul className="flex flex-col gap-0.5" style={{ listStyle: "disc", paddingLeft: "1rem" }}>
                    <li><span className="font-semibold">Gmail / Google Workspace</span> — 500 emails/day (free), 2,000/day (Workspace)</li>
                    <li><span className="font-semibold">Outlook / Microsoft 365</span> — 300 emails/day</li>
                    <li><span className="font-semibold">Yahoo Mail</span> — 500 emails/day</li>
                    <li><span className="font-semibold">Zoho Mail</span> — 500 emails/day (free), 1,000/day (paid)</li>
                    <li><span className="font-semibold">AOL Mail</span> — 500 emails/day</li>
                    <li><span className="font-semibold">Fastmail</span> — 1,000 emails/day</li>
                    <li><span className="font-semibold">ProtonMail</span> — 150 emails/day (free), 1,000/day (paid) via Bridge</li>
                  </ul>
                  <p className="mt-1.5">For high-volume sending, use a dedicated <span className="font-semibold">reviews@yourdomain.com</span> address to keep your main inbox clean and avoid hitting personal limits.</p>
                </div>
              </div>

              {/* ── Daily send limit ───────────────────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Daily Send Limit</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={dailySendLimit}
                    onChange={(e) => setDailySendLimit(Math.min(500, Math.max(1, Number(e.target.value))))}
                    className="w-24 px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                  />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>emails per day (max 500)</span>
                  <button
                    type="button"
                    onClick={() => setDailySendLimitMutation.mutate({ limit: dailySendLimit })}
                    disabled={setDailySendLimitMutation.isPending || dailySendLimit === (profile?.dailySendLimit ?? 50)}
                    className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40"
                    style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                  >
                    {setDailySendLimitMutation.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
                <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>Bulk sends will stop after this many emails per day. Resets at midnight UTC. Default: 50.</p>
              </div>

              {/* Advanced: host/port — collapsed by default, auto-expanded for custom domains */}
              <details className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }} open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer font-semibold py-1">Advanced settings (auto-detected)</summary>
                <div className="flex flex-col gap-2 mt-2">
                  {/* Provider preset quick-fill buttons */}
                  <div>
                    <p className="text-xs font-bold mb-1.5" style={{ color: "oklch(0.40 0.04 260)" }}>Quick-fill by provider</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { label: "Google Workspace", host: "smtp.gmail.com", port: 587 },
                        { label: "Outlook / M365", host: "smtp-mail.outlook.com", port: 587 },
                        { label: "Zoho Mail", host: "smtp.zoho.com", port: 587 },
                        { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 587 },
                      ] as const).map((preset) => (
                        <button
                          key={preset.host}
                          type="button"
                          onClick={() => { setSmtpHost(preset.host); setSmtpPort(preset.port); setSmtpSecure(0); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors"
                          style={{
                            background: smtpHost === preset.host ? "oklch(0.22 0.09 260)" : "oklch(0.96 0.01 260)",
                            color: smtpHost === preset.host ? "oklch(0.80 0.18 80)" : "oklch(0.40 0.04 260)",
                            borderColor: smtpHost === preset.host ? "oklch(0.22 0.09 260)" : "oklch(0.88 0.02 260)",
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>SMTP Host</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.yourdomain.com"
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Security</label>
                      <select
                        value={smtpSecure}
                        onChange={(e) => setSmtpSecure(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: "2px solid oklch(0.90 0.02 260)", background: "white", fontSize: "16px" }}
                      >
                        <option value={0}>STARTTLS (587)</option>
                        <option value={1}>SSL/TLS (465)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </details>

              {/* Test result inline feedback */}
              {smtpTestResult && (
                <div
                  className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: smtpTestResult.ok ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.03 27)",
                    color: smtpTestResult.ok ? "oklch(0.40 0.12 145)" : "oklch(0.45 0.12 27)",
                  }}
                >
                  <span className="font-black shrink-0">{smtpTestResult.ok ? "✓ Connection OK" : "✗ Connection failed"}</span>
                  {!smtpTestResult.ok && smtpTestResult.error && (
                    <span className="font-mono" style={{ wordBreak: "break-word" }}>— {smtpTestResult.error}</span>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                {/* Test Connection button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!smtpEmail.trim()) { toast.error("Email address is required"); return; }
                    if (!smtpPassword.trim()) { toast.error("Password is required"); return; }
                    if (!smtpHost.trim()) { toast.error("SMTP host is required — check Advanced settings"); return; }
                    setSmtpTestResult(null);
                    testCredentials.mutate({
                      email: smtpEmail.trim(),
                      password: smtpPassword,
                      host: smtpHost.trim(),
                      port: smtpPort,
                      secure: smtpSecure,
                    });
                  }}
                  disabled={testCredentials.isPending || connectSmtp.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-transform active:scale-95"
                  style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.35 0.04 260)" }}
                >
                  {testCredentials.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Test
                </button>
                <button
                  onClick={() => {
                    if (!smtpEmail.trim()) { toast.error("Email address is required"); return; }
                    if (!smtpPassword.trim()) { toast.error("Password is required"); return; }
                    if (!smtpHost.trim()) { toast.error("SMTP host is required — check Advanced settings"); return; }
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
                      error: (err) => err?.message ?? "Connection failed",
                    });
                  }}
                  disabled={connectSmtp.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
                >
                  {connectSmtp.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Connect Email
                </button>
                {showSmtpForm && (
                  <button
                    onClick={() => setShowSmtpForm(false)}
                    className="px-4 py-3 rounded-xl text-sm font-bold"
                    style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Billing ──────────────────────────────────────────────────────── */}
        <BillingSection profile={profile} />

        {/* ── WooCommerce ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2
              className="text-base font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              WooCommerce
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 260)" }}>
            Connect your store to import customers from completed orders.
          </p>

          {wooCreds ? (
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.96 0.04 145)" }}
              >
                <CheckCircle2 size={18} style={{ color: "oklch(0.55 0.18 145)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.12 145)" }}>Store Connected</p>
                  <p className="text-xs truncate" style={{ color: "oklch(0.45 0.10 145)" }}>{wooCreds.storeUrl}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {wooCreds.lastSyncedAt ? (
                      <p className="text-xs flex items-center gap-1" style={{ color: "oklch(0.50 0.10 145)" }}>
                        <Clock size={10} />
                        Last synced {new Date(wooCreds.lastSyncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        {(wooCreds.lastSyncCount ?? 0) > 0 && (
                          <span style={{ color: "oklch(0.40 0.12 145)" }}>· {wooCreds.lastSyncCount} staged</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: "oklch(0.55 0.08 80)" }}>Not yet synced</p>
                    )}
                    <button
                      onClick={() => quickSync.mutate({ days: 30 })}
                      disabled={quickSync.isPending}
                      className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full transition-opacity disabled:opacity-60"
                      style={{ background: "oklch(0.88 0.06 145)", color: "oklch(0.30 0.12 145)" }}
                    >
                      {quickSync.isPending ? (
                        <Loader2 size={9} className="animate-spin" />
                      ) : (
                        <RefreshCw size={9} />
                      )}
                      {quickSync.isPending ? "Syncing…" : "Sync"}
                    </button>
                  </div>
                </div>
              </div>
              {/* Pending Imports Banner */}
              {wooPending && wooPending.count > 0 && (
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: "oklch(0.97 0.04 80)", border: "1px solid oklch(0.88 0.08 80)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} style={{ color: "oklch(0.55 0.12 80)" }} />
                    <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.10 80)" }}>
                      {wooPending.count} pending import{wooPending.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-xs mb-3" style={{ color: "oklch(0.45 0.06 80)" }}>
                    These WooCommerce orders are staged and waiting. Import them now, or they'll be auto-imported on Monday at 03:00 GMT if they're older than 7 days.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => importPending.mutate()}
                      disabled={importPending.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-opacity disabled:opacity-60"
                      style={{ background: "oklch(0.22 0.09 260)", color: "white", fontFamily: "'Poppins', sans-serif" }}
                    >
                      {importPending.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Import Now
                    </button>
                    <button
                      onClick={() => dismissPending.mutate()}
                      disabled={dismissPending.isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-60"
                      style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
                    >
                      {dismissPending.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {/* Sync History Chart */}
              {syncHistory && syncHistory.length > 1 && (
                <div className="rounded-xl px-4 py-3" style={{ background: "oklch(0.97 0.01 260)" }}>
                  <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.40 0.04 260)" }}>Sync History (last {syncHistory.length} syncs)</p>
                  <ResponsiveContainer width="100%" height={64}>
                    <BarChart data={[...syncHistory].reverse().map((s, i) => ({ i, added: s.added, total: s.total }))} barSize={8}>
                      <XAxis dataKey="i" hide />
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name === "added" ? "Staged" : "Fetched"]}
                        labelFormatter={() => ""}
                        contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                      />
                      <Bar dataKey="total" fill="oklch(0.85 0.04 260)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="added" fill="oklch(0.50 0.15 145)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.50 0.04 260)" }}>
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "oklch(0.85 0.04 260)" }} /> Fetched
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "oklch(0.40 0.12 145)" }}>
                      <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "oklch(0.50 0.15 145)" }} /> Staged
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate("/woo-customers")}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                style={{ background: "oklch(0.22 0.09 260)", color: "white", fontFamily: "'Poppins', sans-serif" }}
              >
                <ShoppingBag size={16} />
                View Customers
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => { setWooUrl(wooCreds.storeUrl); setWooFormOpen(true); }}
                className="text-xs text-center py-2"
                style={{ color: "oklch(0.55 0.03 260)" }}
              >
                Update credentials
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {!wooFormOpen ? (
                <button
                  onClick={() => setWooFormOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
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
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Store URL *</label>
                <input
                  type="url"
                  value={wooUrl}
                  onChange={(e) => setWooUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Consumer Key *</label>
                <input
                  type="text"
                  value={wooKey}
                  onChange={(e) => setWooKey(e.target.value)}
                  placeholder="ck_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Consumer Secret *</label>
                <input
                  type="password"
                  value={wooSecret}
                  onChange={(e) => setWooSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
                <p className="text-xs mt-1" style={{ color: "oklch(0.60 0.03 260)" }}>
                  WooCommerce → Settings → Advanced → REST API → Add key (Read permission)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveWoo}
                  disabled={saveWooCreds.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm"
                  style={{ background: "oklch(0.22 0.09 260)", color: "white", fontFamily: "'Poppins', sans-serif" }}
                >
                  {saveWooCreds.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button
                  onClick={() => setWooFormOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-bold"
                  style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.45 0.04 260)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tools ──────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'white', border: '1px solid oklch(0.92 0.02 260)' }}>
          <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'oklch(0.55 0.03 260)', fontFamily: "'Poppins', sans-serif" }}>Tools</h2>
          <div className="flex flex-col gap-1">
            {[{ label: 'Saved Contacts', icon: <Mail size={15} />, path: '/contacts' }, { label: 'Email Templates', icon: <Settings size={15} />, path: '/templates' }, { label: 'Follow-up Reminders', icon: <Clock size={15} />, path: '/reminders' }].map(({ label, icon, path }) => (
              <button key={path} onClick={() => navigate(path)}
                className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
                style={{ color: 'oklch(0.30 0.04 260)' }}>
                <span className="flex items-center gap-2">{icon}{label}</span>
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            ))}

            {/* Redo Setup */}
            <button
              onClick={() => resetOnboarding.mutate()}
              disabled={resetOnboarding.isPending}
              className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
              style={{ color: 'oklch(0.30 0.04 260)' }}
            >
              <span className="flex items-center gap-2">
                {resetOnboarding.isPending
                  ? <Loader2 size={15} className="animate-spin" />
                  : <RotateCcw size={15} />}
                Redo Setup Wizard
              </span>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
          </div>
        </div>     {/* ── Sign Out ─────────────────────────────────────────────────────── */}
          {/* ── Install App ──────────────────────────────────────────────── */}
        <button
          onClick={() => {
            localStorage.removeItem('pwa-prompt-dismissed');
            window.location.reload();
          }}
          className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full"
          style={{ color: "oklch(0.45 0.10 260)", background: "transparent" }}
          aria-label="Show app install instructions"
        >
          <Smartphone size={14} aria-hidden="true" />
          Install App on Your Phone
        </button>
        {/* ── API Keys ───────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Key size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2 className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
              API Keys
            </h2>
          </div>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: "oklch(0.50 0.04 260)" }}>
            Use an API key to import contacts from your website forms.
            Each key is shown <strong>once</strong> at creation — copy it immediately.
          </p>

          {/* Revealed key banner */}
          {revealedKey && (
            <div
              className="rounded-xl p-3 mb-4 flex items-start gap-2"
              style={{ background: "oklch(0.96 0.06 145)", border: "1.5px solid oklch(0.80 0.12 145)" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.30 0.10 145)" }}>Your new API key — copy now!</p>
                <code
                  className="text-xs break-all select-all"
                  style={{ color: "oklch(0.22 0.09 260)", fontFamily: "monospace" }}
                >
                  {revealedKey}
                </code>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(revealedKey); toast.success("Copied!"); }}
                className="shrink-0 p-1.5 rounded-lg"
                style={{ background: "oklch(0.80 0.12 145)" }}
                title="Copy to clipboard"
              >
                <Copy size={14} style={{ color: "oklch(0.22 0.09 260)" }} />
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="shrink-0 p-1.5 rounded-lg"
                style={{ background: "oklch(0.80 0.12 145)" }}
                title="Dismiss"
              >
                <X size={14} style={{ color: "oklch(0.22 0.09 260)" }} />
              </button>
            </div>
          )}

          {/* Existing keys list */}
          {apiKeysLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin" style={{ color: "oklch(0.55 0.04 260)" }} />
            </div>
          ) : apiKeyList && apiKeyList.length > 0 ? (
            <div className="space-y-2 mb-4">
              {apiKeyList.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}
                >
                  <Key size={14} style={{ color: "oklch(0.55 0.04 260)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "oklch(0.22 0.09 260)" }}>{k.label}</p>
                    <p className="text-xs" style={{ color: "oklch(0.60 0.04 260)" }}>
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Revoke "${k.label}"? This cannot be undone.`)) revokeKey.mutate({ id: k.id }); }}
                    className="shrink-0 p-1.5 rounded-lg"
                    style={{ background: "oklch(0.96 0.01 260)" }}
                    title="Revoke key"
                  >
                    <Trash2 size={14} style={{ color: "oklch(0.55 0.15 25)" }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs mb-4" style={{ color: "oklch(0.65 0.04 260)" }}>No API keys yet.</p>
          )}

          {/* Generate new key */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              placeholder="Key label (e.g. Website Form)"
              maxLength={100}
              className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
              style={{ border: "1.5px solid oklch(0.88 0.04 260)", fontSize: "13px" }}
            />
            <button
              disabled={generateKey.isPending || !newKeyLabel.trim()}
              onClick={() => generateKey.mutate({ label: newKeyLabel.trim() })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0"
              style={{
                background: newKeyLabel.trim() ? "oklch(0.22 0.09 260)" : "oklch(0.80 0.04 260)",
                color: newKeyLabel.trim() ? "oklch(0.80 0.18 80)" : "oklch(0.60 0.04 260)",
              }}
            >
              {generateKey.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Generate
            </button>
          </div>

          {/* Endpoint reference + snippet */}
          <div
            className="mt-4 rounded-xl p-3 space-y-2"
            style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.02 260)" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>Website Integration</p>
              <button
                onClick={() => setShowSnippet(!showSnippet)}
                className="text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1"
                style={{ background: "oklch(0.92 0.02 260)", color: "oklch(0.40 0.06 260)" }}
              >
                <Copy size={11} />
                {showSnippet ? "Hide snippet" : "Show snippet"}
              </button>
            </div>
            <code className="text-xs break-all block" style={{ color: "oklch(0.40 0.08 260)", fontFamily: "monospace" }}>
              POST https://reviewlink.app/api/public/contacts
            </code>
            <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>
              Send <code style={{ fontFamily: "monospace" }}>name</code>, <code style={{ fontFamily: "monospace" }}>email</code>, and optionally <code style={{ fontFamily: "monospace" }}>phone</code>, <code style={{ fontFamily: "monospace" }}>notes</code>, <code style={{ fontFamily: "monospace" }}>tags[]</code>.
              Include your key as <code style={{ fontFamily: "monospace" }}>Authorization: Bearer rl_...</code>.
            </p>
            {showSnippet && (() => {
              const firstKey = apiKeyList?.[0];
              const keyPlaceholder = firstKey ? `rl_YOUR_KEY_HERE` : `rl_YOUR_KEY_HERE`;
              const snippet = `<form id="rl-form">
  <input name="name" placeholder="Your name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="phone" placeholder="Phone (optional)" />
  <button type="submit">Submit</button>
</form>
<script>
document.getElementById('rl-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const res = await fetch('https://reviewlink.app/api/public/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${keyPlaceholder}'
    },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (json.success) alert('Thank you!');
});
<\/script>`;
              return (
                <div className="relative">
                  <pre
                    className="text-xs rounded-xl p-3 overflow-x-auto"
                    style={{
                      background: "oklch(0.18 0.06 260)",
                      color: "oklch(0.85 0.04 260)",
                      fontFamily: "monospace",
                      fontSize: "11px",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {snippet}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(snippet);
                      toast.success("Snippet copied to clipboard!");
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: "oklch(0.30 0.08 260)", color: "oklch(0.80 0.18 80)" }}
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
            {/* ── Recent API Imports ────────────────────────────────────────────────────────────────────────────── */}
        {recentImports && recentImports.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
                <h2 className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  Recent API Imports
                </h2>
              </div>
              <button
                onClick={handleExportImportsCsv}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: "oklch(0.97 0.01 260)", color: "oklch(0.40 0.08 260)", border: "1.5px solid oklch(0.88 0.04 260)" }}
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="space-y-2">
              {recentImports.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "oklch(0.97 0.01 260)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "oklch(0.22 0.09 260)" }}>{ev.email}</p>
                    <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>
                      via <span className="font-medium">{ev.keyLabel}</span> · {ev.created ? "✨ new contact" : "updated"}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "oklch(0.65 0.04 260)" }}>
                    {new Date(ev.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Outbound Webhooks ────────────────────────────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
              <h2 className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                Outbound Webhooks
              </h2>
            </div>
            <button
              onClick={() => setShowAddWebhook(!showAddWebhook)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.04 260)" }}>
            Fire a POST request to your URL whenever a new contact is created. Use this to push contacts into a CRM, Slack, or Google Sheets.
          </p>
          {showAddWebhook && (
            <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "oklch(0.97 0.01 260)" }}>
              <input
                type="text"
                value={newWebhookLabel}
                onChange={(e) => setNewWebhookLabel(e.target.value)}
                placeholder="Label (e.g. Zapier CRM)"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.04 260)", background: "white" }}
              />
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.04 260)", background: "white" }}
              />
              <input
                type="text"
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                placeholder="Signing secret (optional — HMAC-SHA256)"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ border: "1.5px solid oklch(0.88 0.04 260)", background: "white" }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddWebhook(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: "oklch(0.94 0.01 260)", color: "oklch(0.40 0.04 260)" }}>Cancel</button>
                <button
                  disabled={!newWebhookUrl.trim() || createWebhook.isPending}
                  onClick={() => createWebhook.mutate({ url: newWebhookUrl.trim(), label: newWebhookLabel.trim() || "My Webhook", secret: newWebhookSecret.trim() || undefined })}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                  style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
                >
                  {createWebhook.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Save
                </button>
              </div>
            </div>
          )}
          {(!webhookList || webhookList.length === 0) && !showAddWebhook && (
            <p className="text-xs text-center py-4" style={{ color: "oklch(0.65 0.04 260)" }}>No webhooks yet. Click Add to create one.</p>
          )}
          <div className="space-y-2">
            {(webhookList ?? []).map((wh) => (
              <div key={wh.id} className="rounded-xl p-3" style={{ background: "oklch(0.97 0.01 260)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: "oklch(0.22 0.09 260)" }}>{wh.label}</p>
                    <p className="text-xs truncate" style={{ color: "oklch(0.55 0.04 260)" }}>{wh.url}</p>
                    {wh.lastFiredAt && (
                      <p className="text-xs mt-0.5" style={{ color: wh.lastStatus && wh.lastStatus >= 200 && wh.lastStatus < 300 ? "oklch(0.50 0.15 145)" : "oklch(0.55 0.15 25)" }}>
                        Last: HTTP {wh.lastStatus} · {new Date(wh.lastFiredAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => testWebhook.mutate({ id: wh.id, url: wh.url })}
                      disabled={testWebhook.isPending}
                      className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.30 0.08 260)" }}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => setExpandedWebhookId(expandedWebhookId === wh.id ? null : wh.id)}
                      className="px-2 py-1 rounded-lg text-xs font-bold"
                      style={{ background: expandedWebhookId === wh.id ? "oklch(0.22 0.09 260)" : "oklch(0.93 0.02 260)", color: expandedWebhookId === wh.id ? "white" : "oklch(0.30 0.08 260)" }}
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => { if (confirm(`Delete webhook "${wh.label}"?`)) deleteWebhook.mutate({ id: wh.id }); }}
                      className="p-1.5 rounded-lg"
                      style={{ background: "oklch(0.96 0.01 25)", color: "oklch(0.55 0.15 25)" }}
                    >
                      <Trash2 size={12} />
                    </button>
                   </div>
                </div>
                {/* Delivery logs panel */}
                {expandedWebhookId === wh.id && (
                  <div className="mt-2 rounded-xl p-3" style={{ background: "oklch(0.94 0.01 260)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "oklch(0.30 0.08 260)" }}>Last 5 Deliveries</p>
                    {!webhookLogs || webhookLogs.length === 0 ? (
                      <p className="text-xs" style={{ color: "oklch(0.60 0.04 260)" }}>No deliveries yet — fire a test ping to see logs here.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {webhookLogs.map((log: any) => (
                          <div key={log.id} className="rounded-lg px-2.5 py-2" style={{ background: log.success ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.03 25)" }}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold" style={{ color: log.success ? "oklch(0.40 0.15 145)" : "oklch(0.50 0.18 25)" }}>
                                {log.success ? "✓" : "✗"} HTTP {log.statusCode ?? "ERR"} · {log.durationMs}ms
                              </span>
                              <div className="flex items-center gap-1.5">
                                {!log.success && (
                                  <button
                                    onClick={() => retryDelivery.mutate({ webhookId: wh.id, logId: log.id })}
                                    disabled={retryDelivery.isPending}
                                    className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-opacity disabled:opacity-60"
                                    style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
                                  >
                                    {retryDelivery.isPending ? <Loader2 size={9} className="animate-spin" /> : <RotateCcw size={9} />}
                                    Retry
                                  </button>
                                )}
                                <span className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            {log.errorMessage && <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.50 0.18 25)" }}>{log.errorMessage}</p>}
                            {log.responseBody && <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.45 0.05 260)" }}>{log.responseBody}</p>}
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
            <Bell size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2 className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>Notification Preferences</h2>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.97 0.01 260)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>WooCommerce auto-import notification</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 260)" }}>Receive an in-app notification when the Monday auto-import runs and contacts are added.</p>
            </div>
            <button
              onClick={() => updateNotifPrefs.mutate({ wooAutoImportNotify: !notifPrefs?.wooAutoImportNotify })}
              disabled={updateNotifPrefs.isPending}
              className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
              style={{ background: notifPrefs?.wooAutoImportNotify ? "oklch(0.50 0.15 145)" : "oklch(0.80 0.02 260)" }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: notifPrefs?.wooAutoImportNotify ? "calc(100% - 1.35rem)" : "0.1rem" }} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2" style={{ background: "oklch(0.97 0.01 260)" }}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>Email open notifications</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.04 260)" }}>Receive an in-app notification each time a customer opens your review request email.</p>
            </div>
            <button
              onClick={() => updateNotifPrefs.mutate({ notifyOnEmailOpen: !notifPrefs?.notifyOnEmailOpen })}
              disabled={updateNotifPrefs.isPending}
              className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
              style={{ background: notifPrefs?.notifyOnEmailOpen ? "oklch(0.50 0.15 145)" : "oklch(0.80 0.02 260)" }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: notifPrefs?.notifyOnEmailOpen ? "calc(100% - 1.35rem)" : "0.1rem" }} />
            </button>
          </div>
        </div>
        <SendFeedbackSection />
        {/* ── Admin: OAuth & Auth Integrations ────────────────────────────── */}
        {user?.role === "admin" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
              <h2
                className="text-base font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Auth Integrations
              </h2>
            </div>

            {/* Google OAuth redirect URI reminder */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: "oklch(0.97 0.01 260)" }}
            >
              <div className="flex items-start gap-3">
                <Info size={16} className="mt-0.5 shrink-0" style={{ color: "oklch(0.50 0.15 260)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
                    Google OAuth — Redirect URI Required
                  </p>
                  <p className="text-xs mb-2" style={{ color: "oklch(0.45 0.05 260)" }}>
                    Add these two URIs to your Google Cloud Console OAuth client before Google login will work on the live domain.
                  </p>
                  <div className="space-y-1">
                    {[
                      "https://reviewlink.app/api/auth/google/callback",
                      "https://revrocket-j5ynazte.manus.space/api/auth/google/callback",
                    ].map((uri) => (
                      <div
                        key={uri}
                        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                        style={{ background: "oklch(0.93 0.02 260)" }}
                      >
                        <code className="text-xs truncate" style={{ color: "oklch(0.30 0.08 260)" }}>
                          {uri}
                        </code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(uri); toast.success("Copied!"); }}
                          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                          style={{ color: "oklch(0.50 0.15 260)", background: "oklch(0.88 0.03 260)" }}
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
            <div
              className="rounded-xl p-4"
              style={{ background: "oklch(0.97 0.01 260)" }}
            >
              <div className="flex items-start gap-3">
                <Apple size={16} className="mt-0.5 shrink-0" style={{ color: "oklch(0.22 0.09 260)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
                    Sign in with Apple — 4 Secrets Required
                  </p>
                  <p className="text-xs mb-3" style={{ color: "oklch(0.45 0.05 260)" }}>
                    Add these secrets in Settings → Secrets to enable Apple Sign In.
                  </p>
                  <div className="space-y-2">
                    {[
                      { key: "APPLE_CLIENT_ID", hint: "Services ID identifier, e.g. app.reviewlink.signin" },
                      { key: "APPLE_TEAM_ID", hint: "10-char string, top-right of developer.apple.com" },
                      { key: "APPLE_KEY_ID", hint: "Key ID shown after creating a Sign in with Apple key" },
                      { key: "APPLE_PRIVATE_KEY", hint: "Full contents of the .p8 file including header/footer" },
                    ].map(({ key, hint }) => (
                      <div key={key}>
                        <p className="text-xs font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{key}</p>
                        <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>{hint}</p>
                      </div>
                    ))}
                  </div>
                  <a
                    href="https://developer.apple.com/account/resources/identifiers/list"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold mt-3"
                    style={{ color: "oklch(0.22 0.09 260)" }}
                  >
                    Open Apple Developer Console <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Delete Account ───────────────────────────────────────────────── */}
        <DeleteAccountSection />

        <button
          onClick={() => logout()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
          style={{
            background: "transparent",
            color: "oklch(0.55 0.03 260)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>

      </div>
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
          style={{ background: "oklch(0.22 0.09 260)", maxHeight: "calc(100vh - 80px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.18 80)" }}>Email Preview</p>
              <p className="text-sm font-bold text-white mt-0.5">What your customers will see</p>
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
          <div className="px-5 py-3 shrink-0" style={{ background: "oklch(0.18 0.08 260)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs" style={{ color: "oklch(0.70 0.05 260)" }}>
              <span className="font-semibold text-white">From:</span>{" "}
              {smtpStatus?.fromName ? `${smtpStatus.fromName} <${smtpStatus.email}>` : smtpStatus?.email ?? "your@email.com"}
            </p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.70 0.05 260)" }}>
              <span className="font-semibold text-white">To:</span> Alex Johnson &lt;customer@example.com&gt;
            </p>
            <p className="text-xs mt-1" style={{ color: "oklch(0.70 0.05 260)" }}>
              <span className="font-semibold text-white">Subject:</span> We'd love your feedback! ⭐
            </p>
          </div>

          {/* Email iframe */}
          <div className="flex-1 overflow-auto bg-white">
            {previewLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 size={28} className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
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
              <div className="flex items-center justify-center h-64 text-sm" style={{ color: "oklch(0.50 0.04 260)" }}>
                Could not load preview.
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-5 py-3 shrink-0 text-center" style={{ background: "oklch(0.18 0.08 260)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-xs" style={{ color: "oklch(0.60 0.04 260)" }}>
              Preview uses <strong className="text-white">Alex Johnson</strong> as a sample customer name.
            </p>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
