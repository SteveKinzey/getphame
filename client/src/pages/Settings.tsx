// Phame — Settings Page
// Sections: Business Profile, Email Connection, Plan

import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
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
  ShieldCheck,
  Moon,
  Sun,
  Zap,
  AlertTriangle,
  CheckCircle,
  Gift,
  Users,
  TrendingUp,
  CalendarDays,
} from "lucide-react";
import OnboardingGuide from "@/components/OnboardingGuide";
import PlatformIcon from "@/components/PlatformIcon";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import LanguageFlyout from "@/components/LanguageFlyout";
import { IntegrationGuide } from "@/components/IntegrationGuide";

// ── Share & Earn Card ────────────────────────────────────────────────────────
function ShareAndEarnCard({ profile }: { profile: ProfileData | null | undefined }) {
  const { data: codeData, isLoading: codeLoading } = trpc.referral.getCode.useQuery();
  const { data: stats } = trpc.referral.getStats.useQuery();
  const [copied, setCopied] = useState(false);

  const tier = profile?.tier ?? 'free';
  const isPaid = tier === 'pro' || tier === 'annual';

  const handleCopy = () => {
    if (!codeData?.shareUrl) return;
    navigator.clipboard.writeText(codeData.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Referral link copied!');
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid oklch(0.91 0.02 260)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'oklch(0.80 0.18 80)' }}>
          <Gift size={16} style={{ color: 'oklch(0.22 0.09 260)' }} />
        </div>
        <div>
          <h2 className="text-sm font-black rr-text-navy">Share &amp; Earn</h2>
          <p className="text-xs rr-text-navy-muted">Refer a friend — get 1 free month when they subscribe</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Users, label: 'Referred', value: stats?.totalReferrals ?? 0 },
          { icon: TrendingUp, label: 'Converted', value: stats?.convertedReferrals ?? 0 },
          { icon: Gift, label: 'Months Earned', value: stats?.monthsEarned ?? 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'oklch(0.97 0.01 260)' }}>
            <Icon size={14} className="mx-auto mb-1 rr-text-navy-muted" />
            <p className="text-base font-black rr-text-navy">{value}</p>
            <p className="text-xs rr-text-navy-muted">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      {codeLoading ? (
        <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin rr-text-navy-muted" /></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid oklch(0.88 0.04 260)' }}>
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: 'oklch(0.97 0.01 260)' }}>
            <p className="text-xs flex-1 truncate font-mono rr-text-navy" style={{ fontSize: '11px' }}>
              {codeData?.shareUrl ?? 'Loading...'}
            </p>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{
                background: copied ? 'oklch(0.55 0.15 150)' : 'oklch(0.22 0.09 260)',
                color: copied ? 'white' : 'oklch(0.80 0.18 80)',
              }}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Eligibility note */}
      {!isPaid && (
        <p className="text-xs mt-3 text-center" style={{ color: 'oklch(0.55 0.08 260)' }}>
          Upgrade to a paid plan to receive your free month reward when a referral converts.
        </p>
      )}
    </div>
  );
}

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
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Steve at Acme Plumbing"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
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
        <p className="text-base flex-1 rr-text-navy font-bold">
          <span className="rr-text-navy-mid rr-fw-semibold">Reply-To:</span>{" "}
          {current || <span className="rr-text-navy-faint">Same as sending address</span>}
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
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. support@mycompany.com"
        className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
        autoFocus
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
      const subject = encodeURIComponent("Get Phame Feedback");
      const body = encodeURIComponent(message.trim());
      window.location.href = `mailto:support@phame.app?subject=${subject}&body=${body}`;
      toast.success("Opening your email client to send feedback");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Could not open email client. Please email support@phame.app directly.");
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent" style={{ color: "oklch(0.45 0.10 260)" }}
        aria-label="Send feedback to Get Phame support"
      >
        <Send size={14} aria-hidden="true" />
        Send Feedback
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 space-y-3 rr-bg-white-card" style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold rr-text-navy">
          Send Feedback
        </p>
        <button
          onClick={() => { setOpen(false); setMessage(""); }}
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
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe what you found or what you'd love to see…"
        rows={4}
        maxLength={1000}
        className="w-full rounded-xl px-3 py-2.5 text-xs resize-none outline-none bg-white rr-text-navy" style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
        aria-label="Feedback message"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: "oklch(0.25 0.04 260)" }}>
          {message.length}/1000
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { setOpen(false); setMessage(""); }}
            className="px-4 py-2 rounded-xl text-sm font-black rr-text-navy" style={{ background: "oklch(0.90 0.01 260)" }}
          >
            Cancel
          </button>
          <button
            disabled={!message.trim() || sending}
            onClick={handleSend}
            className="px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1"
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
        className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent" style={{ color: "oklch(0.55 0.15 25)" }}
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
      <p className="text-sm font-bold leading-relaxed" style={{ color: "oklch(0.15 0.05 260)" }}>
        This will permanently delete your account, all contacts, email templates, review requests, tracking data, and SMTP credentials. This action cannot be undone.
      </p>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm font-bold" style={{ color: "oklch(0.15 0.05 260)" }}>
          I understand this is permanent and cannot be reversed.
        </span>
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => { setOpen(false); setConfirmed(false); }}
          className="flex-1 py-2 rounded-xl text-sm font-black rr-text-navy" style={{ background: "oklch(0.90 0.01 260)" }}
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

// ── Koalendar Integration ───────────────────────────────────────────────────
function KoalendarIntegrationCard({
  profile,
  isAdmin,
}: {
  profile: ProfileData | null | undefined;
  isAdmin: boolean;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [copied, setCopied] = useState(false);
  const tier = profile?.tier ?? "free";
  const isPaid = isAdmin || ["pro", "annual", "lifetime"].includes(tier);
  const { data: status, isLoading } = trpc.koalendar.status.useQuery(undefined, {
    enabled: isPaid,
    retry: false,
  });

  const connect = trpc.koalendar.connect.useMutation({
    onSuccess: () => {
      utils.koalendar.status.invalidate();
      toast.success("Koalendar connection created. Add the webhook URL to each booking page.");
    },
    onError: (err) => toast.error(err.message),
  });
  const rotateWebhook = trpc.koalendar.rotateWebhook.useMutation({
    onSuccess: () => {
      utils.koalendar.status.invalidate();
      setCopied(false);
      toast.success("Webhook URL replaced. Update every Koalendar booking page with the new URL.");
    },
    onError: (err) => toast.error(err.message),
  });
  const disconnect = trpc.koalendar.disconnect.useMutation({
    onSuccess: () => {
      utils.koalendar.status.invalidate();
      toast.success("Koalendar imports paused. Existing contacts were not changed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const copyWebhook = async () => {
    if (!status?.webhookUrl) return;
    await navigator.clipboard.writeText(status.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Koalendar webhook URL copied.");
  };

  const busy = connect.isPending || rotateWebhook.isPending || disconnect.isPending;

  if (!isPaid) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center rr-bg-navy">
              <CalendarDays size={18} className="rr-text-gold" />
            </div>
            <div>
              <h2 className="text-base font-black rr-text-navy">Koalendar Auto-Import</h2>
              <p className="text-xs rr-text-navy-muted">Turn completed meetings into Get Phame contacts</p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black rr-bg-gold rr-text-navy">
            <Crown size={11} /> PRO
          </span>
        </div>
        <p className="text-sm mb-4 rr-text-navy-mid">
          Paid subscribers can automatically import each non-canceled invitee after the meeting’s scheduled end time.
        </p>
        <button
          onClick={() => navigate("/upgrade")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
        >
          <Crown size={16} /> Upgrade to Connect Koalendar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center rr-bg-navy">
            <CalendarDays size={18} className="rr-text-gold" />
          </div>
          <div>
            <h2 className="text-base font-black rr-text-navy">Koalendar Auto-Import</h2>
            <p className="text-xs rr-text-navy-muted">Import invitees after meetings end</p>
          </div>
        </div>
        <span
          className="shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black"
          style={status?.enabled
            ? { background: "oklch(0.92 0.07 145)", color: "oklch(0.32 0.12 145)" }
            : { background: "oklch(0.94 0.01 260)", color: "oklch(0.45 0.04 260)" }}
        >
          {status?.enabled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {status?.enabled ? "ACTIVE" : "NOT CONNECTED"}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin rr-text-navy-muted" /></div>
      ) : !status?.connected ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm rr-text-navy-mid">
            Get Phame will queue each booking, ignore cancellations, and create or update the contact after the scheduled end time.
          </p>
          <button
            onClick={() => connect.mutate()}
            disabled={busy}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 disabled:opacity-60 rr-bg-gold rr-text-navy"
          >
            {connect.isPending ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Create Koalendar Connection
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl p-3" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.90 0.03 260)" }}>
            <p className="text-xs font-black uppercase tracking-wide mb-2 rr-text-navy-muted">Your private webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-xs rr-text-navy">{status.webhookUrl}</code>
              <button
                onClick={copyWebhook}
                className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-black rr-bg-navy rr-text-gold"
              >
                {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: "oklch(0.98 0.025 80)", border: "1px solid oklch(0.90 0.08 80)" }}>
            <p className="text-sm font-black mb-2 rr-text-navy">Add it to every Koalendar booking page</p>
            <ol className="space-y-1.5 text-xs rr-text-navy-mid list-decimal pl-4">
              <li>Open a booking page in Koalendar and choose <strong>Edit</strong>.</li>
              <li>Open <strong>After booking</strong>, enable <strong>Webhook</strong>, and paste this URL.</li>
              <li>Save, then repeat for every booking page that should feed Get Phame.</li>
            </ol>
            <p className="text-xs mt-3 font-bold rr-text-navy">Use the same URL on all of your booking pages.</p>
          </div>

          {status.lastEventAt && (
            <p className="text-xs flex items-center gap-1.5 rr-text-navy-muted">
              <RefreshCw size={11} /> Last Koalendar event received {new Date(status.lastEventAt).toLocaleString()}
            </p>
          )}

          {status.recentBookings.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-wide mb-2 rr-text-navy-muted">Recent meeting imports</p>
              <div className="flex flex-col gap-2">
                {status.recentBookings.slice(0, 5).map((booking) => {
                  const statusStyles: Record<string, { label: string; bg: string; color: string }> = {
                    pending: { label: "Waiting for meeting to end", bg: "oklch(0.96 0.04 80)", color: "oklch(0.42 0.10 80)" },
                    processing: { label: "Importing", bg: "oklch(0.94 0.04 250)", color: "oklch(0.40 0.12 250)" },
                    imported: { label: "Imported", bg: "oklch(0.92 0.07 145)", color: "oklch(0.32 0.12 145)" },
                    canceled: { label: "Canceled — excluded", bg: "oklch(0.94 0.01 260)", color: "oklch(0.48 0.04 260)" },
                    blocked: { label: "Paid plan required", bg: "oklch(0.96 0.04 30)", color: "oklch(0.46 0.15 30)" },
                    failed: { label: "Needs attention", bg: "oklch(0.96 0.04 30)", color: "oklch(0.46 0.15 30)" },
                  };
                  const badge = statusStyles[booking.status] ?? statusStyles.pending;
                  return (
                    <div key={booking.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ border: "1px solid oklch(0.92 0.02 260)" }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate rr-text-navy">{booking.inviteeName}</p>
                        <p className="text-xs truncate rr-text-navy-muted">{booking.inviteeEmail}</p>
                      </div>
                      <span className="shrink-0 rounded-full px-2 py-1 text-xs font-bold" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (window.confirm("Replace this webhook URL? You will need to update every Koalendar booking page.")) {
                  rotateWebhook.mutate();
                }
              }}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-60 rr-text-navy-mid"
              style={{ background: "oklch(0.94 0.01 260)" }}
            >
              <RotateCcw size={13} /> Replace URL
            </button>
            {status.enabled ? (
              <button
                onClick={() => {
                  if (window.confirm("Pause all new Koalendar imports? Existing contacts will remain in Get Phame.")) {
                    disconnect.mutate();
                  }
                }}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ background: "oklch(0.97 0.03 30)", color: "oklch(0.46 0.15 30)" }}
              >
                <X size={13} /> Pause Imports
              </button>
            ) : (
              <button
                onClick={() => connect.mutate()}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black disabled:opacity-60 rr-bg-gold rr-text-navy"
              >
                {connect.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Resume Imports
              </button>
            )}
          </div>
        </div>
      )}
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
          <CreditCard size={18} className="rr-text-gold" />
          <h2
            className="text-base font-black rr-text-navy"
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
        <p className="text-sm mb-3 flex items-center gap-1.5 rr-text-navy-mid font-bold">
          <Clock size={12} />
          {renewalLabel}
        </p>
      )}

      {tier === 'free' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold rr-text-navy-mid">
            Upgrade to Pro for unlimited sends, follow-up reminders, and priority support.
          </p>
          <button
            onClick={() => navigate('/upgrade')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
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
                <p className="text-sm font-black rr-text-navy">
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
                      <CheckCircle2 size={13} className="rr-text-green" style={{ flexShrink: "0" }} />
                      <span className="text-xs rr-text-navy-mid">{perk}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm font-semibold rr-text-navy-mid">
                  Cancelling will downgrade your account to Free at the end of the billing period.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRetention(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95 rr-bg-gold rr-text-navy"
                  >
                    Keep My Plan
                  </button>
                  <button
                    onClick={() => { setShowRetention(false); navigate('/cancel'); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black rr-text-navy" style={{ background: "oklch(0.90 0.01 260)" }}
                  >
                    Continue to Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRetention(true)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-navy text-white"
              >
                <ExternalLink size={16} />
                Manage Billing
              </button>
            )
          ) : (
            <p className="text-sm font-semibold rr-text-navy-mid">
              Your plan is active. Contact support to manage billing.
            </p>
          )}
          {tier !== 'lifetime' && (
            <button
              onClick={() => navigate('/upgrade')}
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
const PROVIDER_LABELS: Record<string, string> = {
  sendgrid: "SendGrid",
  mailgun: "Mailgun",
  postmark: "Postmark",
};
const PROVIDER_DOCS: Record<string, string> = {
  sendgrid: "https://app.sendgrid.com/settings/api_keys",
  mailgun: "https://app.mailgun.com/settings/api_security",
  postmark: "https://account.postmarkapp.com/servers",
};

function BulkSenderSection({ profile }: { profile: ProfileData | null | undefined }) {
  const tier = profile?.tier ?? "free";
  const isPro = tier !== "free";
  const { data: status, refetch } = trpc.bulkSender.status.useQuery();
  const [provider, setProvider] = useState<"sendgrid" | "mailgun" | "postmark">("sendgrid");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [mailgunDomain, setMailgunDomain] = useState("");
  const [mailgunRegion, setMailgunRegion] = useState<"us" | "eu">("us");
  const [showForm, setShowForm] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const connectMutation = trpc.bulkSender.connect.useMutation({
    onSuccess: () => {
      toast.success("Bulk sender connected!");
      setShowForm(false);
      setApiKey("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const disconnectMutation = trpc.bulkSender.disconnect.useMutation({
    onSuccess: () => { toast.success("Bulk sender disconnected."); refetch(); },
    onError: (err) => toast.error(err.message),
  });
  const testMutation = trpc.bulkSender.test.useMutation({
    onSuccess: (res) => {
      if (res.ok) toast.success("Connection healthy ✓");
      else toast.error(res.error ?? "Connection test failed");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Zap size={18} className="rr-text-gold" />
          <h2 className="text-base font-black rr-text-navy">Bulk Sender</h2>
          {!isPro && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}>Pro</span>
          )}
        </div>
        {isPro && status?.connected && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold rr-text-navy-mid hover:rr-text-navy"
          >
            Update
          </button>
        )}
      </div>
      <p className="text-xs mb-4 rr-text-navy-muted">
        Connect SendGrid, Mailgun, or Postmark to send at scale without hitting SMTP daily limits.
      </p>

      {!isPro ? (
        <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.03 260)" }}>
          <Crown size={16} className="mt-0.5 shrink-0 rr-text-gold" />
          <div>
            <p className="text-sm font-bold rr-text-navy mb-0.5">Pro feature</p>
            <p className="text-sm font-semibold rr-text-navy-mid">Upgrade to Pro to connect a bulk email service and remove daily send limits.</p>
          </div>
        </div>
      ) : status?.connected && !showForm ? (
        <div className="space-y-3">
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "oklch(0.97 0.02 150)", border: "1px solid oklch(0.85 0.08 150)" }}>
            <CheckCircle size={16} className="shrink-0" style={{ color: "oklch(0.45 0.15 150)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold rr-text-navy">{PROVIDER_LABELS[status.provider!]} connected</p>
              <p className="text-sm font-semibold rr-text-navy-mid truncate">{status.fromEmail}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="flex-1 py-2 rounded-xl text-xs font-bold border rr-text-navy-mid"
              style={{ border: "1.5px solid oklch(0.88 0.03 260)" }}
            >
              {testMutation.isPending ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              Test Connection
            </button>
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="flex-1 py-2 rounded-xl text-xs font-bold"
              style={{ background: "oklch(0.97 0.02 30)", border: "1.5px solid oklch(0.85 0.08 30)", color: "oklch(0.50 0.15 30)" }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Provider selector */}
          <div>
            <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Provider</label>
            <div className="flex gap-2">
              {(["sendgrid", "mailgun", "postmark"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors"
                  style={{
                    background: provider === p ? "oklch(0.22 0.09 260)" : "oklch(0.97 0.01 260)",
                    color: provider === p ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.04 260)",
                    border: "1.5px solid",
                    borderColor: provider === p ? "oklch(0.22 0.09 260)" : "oklch(0.88 0.03 260)",
                  }}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold rr-text-navy-mid">API Key</label>
              <a href={PROVIDER_DOCS[provider]} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-0.5" style={{ color: "oklch(0.40 0.14 150)" }}>
                Get key <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Paste your ${PROVIDER_LABELS[provider]} API key`}
                className="w-full px-3 py-2 pr-9 rounded-xl text-sm outline-none"
                style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rr-text-navy-muted"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* From Email */}
          <div>
            <label className="block text-xs font-bold mb-1 rr-text-navy-mid">From Email</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
            />
            <p className="text-xs mt-1 rr-text-navy-muted">Must be a verified sender in your {PROVIDER_LABELS[provider]} account.</p>
          </div>

          {/* From Name (optional) */}
          <div>
            <label className="block text-xs font-bold mb-1 rr-text-navy-mid">From Name <span className="font-normal">(optional)</span></label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your Business Name"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
            />
          </div>

          {/* Mailgun-specific fields */}
          {provider === "mailgun" && (
            <>
              <div>
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Mailgun Domain</label>
                <input
                  type="text"
                  value={mailgunDomain}
                  onChange={(e) => setMailgunDomain(e.target.value)}
                  placeholder="mg.yourdomain.com"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "14px" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Region</label>
                <div className="flex gap-2">
                  {(["us", "eu"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setMailgunRegion(r)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{
                        background: mailgunRegion === r ? "oklch(0.22 0.09 260)" : "oklch(0.97 0.01 260)",
                        color: mailgunRegion === r ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.04 260)",
                        border: "1.5px solid",
                        borderColor: mailgunRegion === r ? "oklch(0.22 0.09 260)" : "oklch(0.88 0.03 260)",
                      }}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Compliance note */}
          <div className="rounded-xl px-3 py-2 flex items-start gap-2" style={{ background: "oklch(0.97 0.02 80)", border: "1px solid oklch(0.88 0.08 80)" }}>
            <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.18 80)" }} />
            <p className="text-xs" style={{ color: "oklch(0.45 0.10 80)" }}>
              You are responsible for CAN-SPAM / GDPR compliance. Always include an unsubscribe link — Get Phame adds one automatically.
            </p>
          </div>

          <div className="flex gap-2">
            {status?.connected && (
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border rr-text-navy-mid"
                style={{ border: "1.5px solid oklch(0.88 0.03 260)" }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => connectMutation.mutate({ provider, apiKey, fromEmail, fromName: fromName || undefined, mailgunDomain: mailgunDomain || undefined, mailgunRegion })}
              disabled={connectMutation.isPending || !apiKey || !fromEmail}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold rr-bg-navy rr-text-gold"
            >
              {connectMutation.isPending ? <><Loader2 size={14} className="animate-spin inline mr-1" />Connecting…</> : "Connect & Test"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { hapticEnabled, setHapticEnabled } = useHaptics();
  const [, navigate] = useLocation();
  const [guideOpen, setGuideOpen] = useState(false);
  const { track } = useAnalytics();

  // ── Profile form state ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setPhame] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const [dailySendLimit, setDailySendLimit] = useState(50);

  // Reminder settings state
  const { data: reminderSettings } = trpc.reminders.getSettings.useQuery();
  const updateReminderSettings = trpc.reminders.updateSettings.useMutation({
    onSuccess: () => { toast.success("Follow-up reminder settings saved!"); },
    onError: (err) => toast.error(err.message),
  });

  const { data: reEngagementSettings } = trpc.profile.getReEngagementSettings.useQuery();
  const updateReEngagementSettings = trpc.profile.updateReEngagementSettings.useMutation({
    onSuccess: () => { toast.success("Re-engagement settings saved!"); },
    onError: (err) => toast.error(err.message),
  });

  // Populate form once profile loads (useEffect avoids render-phase setState)
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName);
      setPhame(profile.reviewLink);
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
    a.href = url; a.download = `phame-api-imports-${Date.now()}.csv`; a.click();
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
    apple: "Apple Maps",
    other: "Other",
  };
  // PLATFORM_ICONS kept for <select> option text only (SVG can't go inside <option>)
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
            <span
              className="text-xs font-bold tracking-widest uppercase rr-text-gold"
            >
              {t('nav.settings')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors rr-text-gold" style={{ background: "oklch(0.32 0.08 260)" }}
              aria-label={theme === "dark" ? t('theme.switchToLight', { defaultValue: 'Switch to light mode' }) : t('theme.switchToDark', { defaultValue: 'Switch to dark mode' })}
              title={theme === "dark" ? t('theme.light') : t('theme.dark')}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold rr-text-gold" style={{ background: "oklch(0.32 0.08 260)" }}
            >
              <BookOpen size={13} />
              {t('nav.guide')}
            </button>
            <LanguageFlyout />
          </div>
        </div>
        <h1
          className="text-2xl text-white rr-fw-black"
        >
              {t('tabs.account', { defaultValue: 'Account & Profile' })}
        </h1>
        {user && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "var(--text-on-dark-secondary)" }}>
              {user.name ?? user.email ?? "Signed in"}
            </p>

          </div>
        )}
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* ── Business Profile ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="rr-text-navy" />
            <h2
              className="text-base font-black rr-text-navy"
            >
              {t('profile.title')}
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
                  {t('profile.businessName')} *
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                  <Link2 size={12} className="inline mr-1" />
                  {t('profile.reviewLink')} *
                </label>
                <input
                  type="url"
                  value={reviewLink}
                  onChange={(e) => setPhame(e.target.value)}
                  placeholder="https://g.page/r/your-business/review"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: "2px solid oklch(0.90 0.02 260)",
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: "16px",
                  }}
                />
                <p className="text-xs mt-1 rr-text-navy-muted">
                  {t('profile.reviewLinkDescription')}
                </p>
              </div>

              {/* ── Email Sender Settings ───────────────────────────────── */}
              <div
                className="rounded-xl p-3 mt-1 rr-bg-white-card" style={{ border: "1px solid oklch(0.90 0.02 260)" }}
              >
                <p className="text-xs font-black mb-3 rr-text-navy-mid">
                  {t('profile.emailSenderSettings', { defaultValue: 'Email Sender Settings' })}
                </p>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      {t('profile.fromName')}
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder={businessName || "e.g. Maria's Hair Salon"}
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    />
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      {t('profile.fromNameDescription')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">
                      {t('profile.replyToEmail')}
                    </label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="e.g. steve@sk-america.com"
                      className="w-full px-3 py-3 rounded-xl text-sm outline-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    />
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      {t('profile.replyToEmailDescription')}
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
                {t('profile.saveProfile')}
              </button>
            </div>
          )}
        </div>

        {/* ── Review Platforms ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Globe size={18} className="rr-text-navy" />
              <h2
                className="text-base font-black rr-text-navy"
              >
              {t('reviewPlatforms.title', { defaultValue: 'Review Platforms' })}
            </h2>
            </div>
            <button
              onClick={() => { setShowAddPlatform(true); setEditingPlatformId(null); }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors rr-bg-gold rr-text-navy"
            >
              <Plus size={12} />
              {t('reviewPlatforms.add')}
            </button>
          </div>
          <p className="text-xs mb-4 rr-text-navy-muted">
            Add your review page URLs for Google, TripAdvisor, Bing, Facebook, and more. For Yelp, enter a plain-text search instruction — this text will appear in the email body instead of a link, keeping you compliant with Yelp's review solicitation policy.
          </p>

          {platformsLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="animate-spin rr-text-navy" size={18} />
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
                      {p.platform === "yelp" && (
                        <div className="flex items-start gap-1.5 mb-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center mt-0.5 shrink-0" style={{ color: "oklch(0.55 0.04 260)" }}>
                                <Info size={13} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                              <strong>Why no link?</strong> Yelp's Terms of Service prohibit directly soliciting reviews via a link. A plain-text search instruction keeps your emails compliant — customers find your listing themselves.
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-sm font-semibold rr-text-navy-mid">Enter a plain-text search instruction. This text appears in the email — no link is generated, keeping you Yelp-compliant.</p>
                        </div>
                      )}
                      <input
                        type={p.platform === "yelp" ? "text" : "url"}
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
                            if (!urlEl?.value?.trim()) { toast.error(p.platform === "yelp" ? "Search instruction is required" : "URL is required"); return; }
                            const promise = updatePlatform.mutateAsync({ id: p.id, url: urlEl.value.trim(), label: labelEl?.value?.trim() || undefined });
                            toast.promise(promise, {
                              loading: "Saving...",
                              success: "Platform updated!",
                              error: (err) => err?.message ?? "Failed to update platform",
                            });
                          }}
                          disabled={updatePlatform.isPending}
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold rr-bg-navy text-white"
                        >
                          {updatePlatform.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPlatformId(null)}
                          className="px-3 py-2 rounded-lg text-xs font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
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
                      <PlatformIcon platform={p.platform} size={22} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black rr-text-navy">
                            {p.label || PLATFORM_LABELS[p.platform] || p.platform}
                          </span>
                          {p.isDefault === 1 && (
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded-full rr-bg-gold rr-text-navy" style={{ fontSize: "9px" }}
                            >
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <p className="text-xs truncate rr-text-navy-muted">{p.url}</p>
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
                          className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 rr-text-navy-mid"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            // Snapshot before delete for undo
                            const snapshot = { platform: p.platform as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "apple" | "other", url: p.url, label: p.label ?? undefined, isDefault: p.isDefault };
                            try {
                              await removePlatform.mutateAsync({ id: p.id });
                            } catch {
                              return; // onError already shows toast
                            }
                            toast.custom(
                              (toastId) => (
                                <div
                                  className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg rr-bg-navy text-white" style={{ minWidth: "260px" }}
                                >
                                  <Trash2 size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
                                  <span className="text-sm flex-1">{PLATFORM_LABELS[snapshot.platform] ?? snapshot.platform} removed</span>
                                  <button
                                    onClick={() => {
                                      restorePlatform.mutate(snapshot);
                                      toast.dismiss(toastId);
                                    }}
                                    className="text-xs font-black px-2 py-1 rounded-lg shrink-0 rr-bg-gold rr-text-navy"
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
                  className="text-center py-4 rounded-xl rr-bg-white-card" style={{ border: "1px dashed oklch(0.85 0.03 260)" }}
                >
                  <p className="text-sm font-semibold rr-text-navy-mid">
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
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Platform</label>
                    <select
                      value={newPlatformType}
                      onChange={(e) => setNewPlatformType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    >
                      {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid flex items-center gap-1">
                      {newPlatformType === "yelp" ? "Yelp Search Instruction *" : "Review Page URL *"}
                      {newPlatformType === "yelp" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help inline-flex items-center" style={{ color: "oklch(0.55 0.04 260)" }}>
                              <Info size={13} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                            <strong>Why no link?</strong> Yelp's Terms of Service prohibit directly soliciting reviews via a link. Entering a plain-text search instruction (e.g. "Search for SK America on Yelp in San Bernardino, CA") keeps your emails compliant — customers find your listing themselves.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </label>
                    <input
                      type={newPlatformType === "yelp" ? "text" : "url"}
                      value={newPlatformUrl}
                      onChange={(e) => setNewPlatformUrl(e.target.value)}
                      placeholder={PLATFORM_PLACEHOLDERS[newPlatformType] ?? "https://..."}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                    />
                    <p className="text-xs mt-1 rr-text-navy-muted">
                      {newPlatformType === "yelp"
                        ? <>Enter a plain-text search instruction (e.g. <em>Search for [Your Business] on Yelp in [City, State]</em>). This text appears in the email body — no link is created, keeping you Yelp-compliant.</>
                        : "Paste the public URL customers use to leave a review on this platform."}
                    </p>
                  </div>
                  {newPlatformType === "other" && (
                    <div>
                      <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Custom Label</label>
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
                        if (!newPlatformUrl.trim()) { toast.error(newPlatformType === "yelp" ? "Search instruction is required" : "URL is required"); return; }
                        const promise = addPlatform.mutateAsync({
                          platform: newPlatformType as "google" | "yelp" | "tripadvisor" | "bing" | "facebook" | "apple" | "other",
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
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-black rr-bg-navy text-white"
                    >
                      {addPlatform.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      Add Platform
                    </button>
                    <button
                      onClick={() => { setShowAddPlatform(false); setNewPlatformUrl(""); setNewPlatformLabel(""); }}
                      className="px-3 py-2 rounded-lg text-xs font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
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
            <Mail size={18} className="rr-text-navy" />
            <h2
              className="text-base font-black rr-text-navy"
            >
              {t('smtp.title')}
            </h2>
          </div>
          <p className="text-xs mb-4 rr-text-navy-muted">
            {t('smtp.description')}
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
                style={{ background: smtpStatus.verified ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.03 27)" }}
              >
                {smtpStatus.verified
                  ? <CheckCircle2 size={18} className="rr-text-green" />
                  : <AlertCircle size={18} style={{ color: "oklch(0.55 0.18 27)" }} />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: smtpStatus.verified ? "oklch(0.30 0.12 145)" : "oklch(0.40 0.15 27)" }}>
                      {smtpStatus.verified ? t('smtp.emailConnected', { defaultValue: 'Email Connected' }) : t('smtp.emailNotConnectedTitle', { defaultValue: 'Connection Unverified' })}
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
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 rr-bg-navy text-white"
                  title="Test connection"
                >
                  {testSmtp.isPending
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />}
                  {t('smtp.testConnection')}
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSmtpEmail(smtpStatus.email ?? ""); setSmtpFromName(smtpStatus.fromName ?? ""); setShowSmtpForm(true); }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-bg-surface rr-text-navy-mid"
                >
                  <Pencil size={13} />
                  {t('smtp.update', { defaultValue: 'Change' })}
                </button>
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-bg-gold rr-text-navy"
                  title="Preview the email your customers will receive"
                >
                  <Eye size={13} />
                  {t('smtp.previewEmail')}
                </button>
                <button
                  onClick={() => resendWelcome.mutate()}
                  disabled={resendWelcome.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap rr-text-navy" style={{ background: "oklch(0.96 0.04 260)" }}
                  title="Resend confirmation email to your inbox"
                >
                  {resendWelcome.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {t('smtp.resendVerification')}
                </button>
                <button
                  onClick={() => disconnectSmtp.mutate()}
                  disabled={disconnectSmtp.isPending}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95 whitespace-nowrap"
                  style={{ background: "oklch(0.97 0.02 27)", color: "oklch(0.50 0.18 27)" }}
                >
                  {disconnectSmtp.isPending ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                  {t('smtp.disconnect')}
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
                <p className="text-xs rr-text-navy-faint">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-xl rr-bg-surface"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "oklch(0.70 0.02 260)" }}
                  />
                  <p className="text-xs rr-text-navy-mid">
                    No email connected. Enter your details below to start sending review requests.
                  </p>
                </div>
              )}

              {/* Email field */}
              <div>
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Your Email Address *</label>
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
                      <label className="text-xs font-bold rr-text-navy-mid">{passwordLabel}</label>
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
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Gmail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">myaccount.google.com</span> → Security</li>
                          <li>Turn on <span className="font-bold">2-Step Verification</span> if not already on</li>
                          <li>Go to <span className="font-bold rr-text-gold">myaccount.google.com/apppasswords</span> → name it <span className="font-bold">Get Phame</span> → click Create</li>
                          <li>Copy the <span className="font-bold">16-character code</span> and paste it here — <span className="font-bold">remove all spaces</span></li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">Tip: use a dedicated <span className="font-bold">reviews@gmail.com</span> account to keep your main inbox separate.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* Google Workspace guide */}
                    {showGuide && isGoogleWorkspace && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Google Workspace App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Ask your Workspace admin to enable 2-Step Verification in <span className="font-bold rr-text-gold">admin.google.com</span></li>
                          <li>Sign in to <span className="font-bold rr-text-gold">myaccount.google.com</span> with your work account → Security</li>
                          <li>Go to <span className="font-bold rr-text-gold">myaccount.google.com/apppasswords</span> → name it <span className="font-bold">Get Phame</span> → click Create</li>
                          <li>Copy the <span className="font-bold">16-character code</span> and paste it here — <span className="font-bold">remove all spaces</span></li>
                        </ol>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* Microsoft / Outlook guide */}
                    {showGuide && isOutlook && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Microsoft App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">account.microsoft.com</span> → Security</li>
                          <li>Click <span className="font-bold">Advanced security options</span></li>
                          <li>Under <span className="font-bold">App passwords</span>, click <span className="font-bold">Create a new app password</span></li>
                          <li>Copy and paste the generated password here</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">Microsoft 365 (work accounts): contact your IT admin to allow SMTP AUTH for your mailbox.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* Yahoo guide */}
                    {showGuide && isYahoo && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Yahoo App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">account.yahoo.com</span> → Security</li>
                          <li>Click <span className="font-bold">Generate app password</span></li>
                          <li>Select <span className="font-bold">Other app</span>, name it <span className="font-bold">Get Phame</span></li>
                          <li>Copy and paste the password here</li>
                        </ol>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* Zoho guide */}
                    {showGuide && isZoho && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Zoho Mail — Enable SMTP Access</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Log in to <span className="font-bold rr-text-gold">mail.zoho.com</span></li>
                          <li>Go to <span className="font-bold">Settings</span> → <span className="font-bold">Mail Accounts</span></li>
                          <li>Click your email address → scroll to <span className="font-bold">SMTP</span></li>
                          <li>Toggle <span className="font-bold">Allow SMTP Access</span> to ON, then use your <span className="font-bold">regular Zoho password</span> here</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">No app password needed — just enable SMTP and use your normal Zoho login password.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* AOL guide */}
                    {showGuide && isAol && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">AOL Mail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">account.aol.com</span> → Security</li>
                          <li>Click <span className="font-bold">Generate app password</span></li>
                          <li>Select <span className="font-bold">Other app</span>, name it <span className="font-bold">Get Phame</span></li>
                          <li>Copy and paste the password here — do <span className="font-bold">not</span> use your regular AOL password</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">AOL requires 2-step verification to be enabled before generating app passwords.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* ProtonMail guide */}
                    {showGuide && isProtonMail && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">ProtonMail — SMTP Bridge Password</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Download and install <span className="font-bold rr-text-gold">Proton Mail Bridge</span> from proton.me/mail/bridge</li>
                          <li>Sign in to Bridge with your Proton account</li>
                          <li>In Bridge, click your account → copy the <span className="font-bold">SMTP password</span> shown</li>
                          <li>Paste that SMTP password here — <span className="font-bold">not</span> your regular Proton login password</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">ProtonMail Bridge must be running on your computer for SMTP to work. Use port 1025 (localhost) or 587 via Bridge.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* Fastmail guide */}
                    {showGuide && isFastmail && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Fastmail App Password — 4 steps</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">app.fastmail.com</span> → Settings → Privacy & Security</li>
                          <li>Scroll to <span className="font-bold">Third-party apps</span> → click <span className="font-bold">New app password</span></li>
                          <li>Name it <span className="font-bold">Get Phame</span>, set access to <span className="font-bold">Mail (SMTP)</span></li>
                          <li>Copy and paste the generated password here</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">Fastmail app passwords are provider-specific — do not use your regular Fastmail login password.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
                      </div>
                    )}

                    {/* iCloud guide */}
                    {showGuide && isIcloud && (
                      <div className="mb-2 rounded-2xl p-4 text-xs flex flex-col gap-2 rr-bg-navy text-white">
                        <p className="font-black text-sm rr-text-gold">Apple iCloud — App-Specific Password</p>
                        <ol className="flex flex-col gap-1.5 pl-4" style={{ listStyle: 'decimal' }}>
                          <li>Go to <span className="font-bold rr-text-gold">appleid.apple.com</span> → Sign In & Security</li>
                          <li>Click <span className="font-bold">App-Specific Passwords</span> → <span className="font-bold">Generate an App-Specific Password</span></li>
                          <li>Name it <span className="font-bold">Get Phame</span> and click Create</li>
                          <li>Copy the <span className="font-bold">xxxx-xxxx-xxxx-xxxx</span> password and paste it here</li>
                        </ol>
                        <p className="text-[10px] mt-1 rr-text-navy-faint">Requires two-factor authentication to be enabled on your Apple ID.</p>
                        <button type="button" onClick={() => setShowPasswordGuide(false)} className="self-end text-xs font-bold mt-1 rr-text-gold">Got it ✓</button>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold rr-text-navy-mid"
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Display Name (optional)</label>
                <input
                  type="text"
                  value={smtpFromName}
                  onChange={(e) => setSmtpFromName(e.target.value)}
                  placeholder="e.g. Steve at Acme Plumbing"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
                <p className="text-xs mt-1 rr-text-navy-muted">Shown as the sender name in your customer's inbox.</p>
              </div>

              {/* ── Deliverability guidance callout ───────────────────────────────────────── */}
              <div
                className="flex items-start gap-3 px-3 py-3 rounded-xl text-xs"
                style={{ background: "oklch(0.97 0.02 260)", border: "1px solid oklch(0.90 0.03 260)" }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: "oklch(0.50 0.12 260)" }} />
                <div className="rr-text-navy-mid">
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Daily Send Limit</label>
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
                  <span className="text-sm font-semibold rr-text-navy-mid">emails per day (max 500)</span>
                  <button
                    type="button"
                    onClick={() => setDailySendLimitMutation.mutate({ limit: dailySendLimit })}
                    disabled={setDailySendLimitMutation.isPending || dailySendLimit === (profile?.dailySendLimit ?? 50)}
                    className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity disabled:opacity-40 rr-bg-navy rr-text-gold"
                  >
                    {setDailySendLimitMutation.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
                <p className="text-xs mt-1 rr-text-navy-muted">Bulk sends will stop after this many emails per day. Resets at midnight UTC. Default: 50.</p>
              </div>

              {/* ── Follow-up Reminder Settings ────────────────────────────────────────── */}
              <div className="rounded-xl p-3.5 rr-bg-white-card" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bell size={14} style={{ color: "oklch(0.45 0.10 260)" }} />
                    <span className="text-xs font-black" style={{ color: "oklch(0.30 0.04 260)", fontFamily: "'Poppins', sans-serif" }}>Automatic Follow-ups</span>
                  </div>
                  <Switch
                    checked={(reminderSettings?.followUpEnabled ?? 1) === 1}
                    onCheckedChange={(v) => updateReminderSettings.mutate({
                      followUpEnabled: v ? 1 : 0,
                      followUpDelayDays: reminderSettings?.followUpDelayDays ?? 3,
                    })}
                  />
                </div>
                <p className="text-xs mb-3 rr-text-navy-muted">Automatically send day-3 and day-10 follow-up emails to customers who haven&apos;t clicked your review link.</p>
                {(reminderSettings?.followUpEnabled ?? 1) === 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold rr-text-navy-mid">First follow-up after</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={reminderSettings?.followUpDelayDays ?? 3}
                      onChange={(e) => updateReminderSettings.mutate({
                        followUpEnabled: reminderSettings?.followUpEnabled ?? 1,
                        followUpDelayDays: Math.min(14, Math.max(1, Number(e.target.value))),
                      })}
                      className="w-16 px-2 py-1.5 rounded-lg text-sm outline-none text-center"
                      style={{ border: "2px solid oklch(0.88 0.02 260)", fontSize: "16px" }}
                    />
                    <span className="text-sm font-semibold rr-text-navy-mid">days (second follow-up 7 days later)</span>
                  </div>
                )}
              </div>

              {/* ── Re-engagement Win-back Settings ────────────────────────────────── */}
              <div className="rounded-xl p-3.5 rr-bg-white-card" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={14} style={{ color: "oklch(0.45 0.10 260)" }} />
                    <span className="text-xs font-black" style={{ color: "oklch(0.30 0.04 260)", fontFamily: "'Poppins', sans-serif" }}>Re-engagement Win-back</span>
                  </div>
                  <Switch
                    checked={(reEngagementSettings?.reEngagementEnabled ?? 1) === 1}
                    onCheckedChange={(v) => updateReEngagementSettings.mutate({ reEngagementEnabled: v ? 1 : 0 })}
                  />
                </div>
                <p className="text-sm font-semibold rr-text-navy-mid">Send a single win-back email to churned users 3 days after they cancel. Includes an unsubscribe link.</p>
              </div>

              {/* Advanced: host/port — collapsed by default, auto-expanded for custom domains */}
              <details className="text-sm font-semibold rr-text-navy-mid" open={showAdvanced} onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer font-semibold py-1">Advanced settings (auto-detected)</summary>
                <div className="flex flex-col gap-2 mt-2">
                  {/* Provider preset quick-fill buttons */}
                  <div>
                    <p className="text-xs font-bold mb-1.5 rr-text-navy-mid">Quick-fill by provider</p>
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
                    <label className="block text-xs font-bold mb-1 rr-text-navy-mid">SMTP Host</label>
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
                      <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Security</label>
                      <select
                        value={smtpSecure}
                        onChange={(e) => setSmtpSecure(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-white" style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
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
                  {t('smtp.testConnection')}
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy"
                >
                  {connectSmtp.isPending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Connect Email
                </button>
                {showSmtpForm && (
                  <button
                    onClick={() => setShowSmtpForm(false)}
                    className="px-4 py-3 rounded-xl text-sm font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
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

        {/* ── Bulk Sender ──────────────────────────────────────────────────── */}
        <BulkSenderSection profile={profile} />

        {/* ── Koalendar paid integration ───────────────────────────────────── */}
        <KoalendarIntegrationCard profile={profile} isAdmin={user?.role === "admin"} />

        {/* ── WooCommerce ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={18} className="rr-text-navy" />
            <h2
              className="text-base font-black rr-text-navy"
            >
              {t('wooCommerce.title')}
            </h2>
          </div>
          <p className="text-xs mb-4 rr-text-navy-muted">
            {t('wooCommerce.description')}
          </p>

          {wooCreds ? (
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl rr-bg-green-pale"
              >
                <CheckCircle2 size={18} className="rr-text-green" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.12 145)" }}>{t('wooCommerce.storeConnected')}</p>
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
                      {quickSync.isPending ? t('wooCommerce.syncing') : t('wooCommerce.sync')}
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-opacity disabled:opacity-60 rr-bg-navy text-white"
                    >
                      {importPending.isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Import Now
                    </button>
                    <button
                      onClick={() => dismissPending.mutate()}
                      disabled={dismissPending.isPending}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-60 rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
                    >
                      {dismissPending.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {/* Sync History Chart */}
              {syncHistory && syncHistory.length > 1 && (
                <div className="rounded-xl px-4 py-3 rr-bg-white-card">
                  <p className="text-xs font-bold mb-2 rr-text-navy-mid">Sync History (last {syncHistory.length} syncs)</p>
                  <ResponsiveContainer width="100%" height={64}>
                    <BarChart data={[...syncHistory].reverse().map((s, i) => ({ i, added: s.added, total: s.total }))} barSize={8}>
                      <XAxis dataKey="i" hide />
                      <RechartsTooltip
                        formatter={(value, name) => [value, (name as string) === "added" ? "Staged" : "Fetched"]}
                        labelFormatter={() => ""}
                        contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                      />
                      <Bar dataKey="total" fill="oklch(0.85 0.04 260)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="added" fill="oklch(0.50 0.15 145)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs rr-text-navy-mid">
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
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-navy text-white"
              >
                <ShoppingBag size={16} />
                  {t('wooCommerce.viewCustomers')}
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => { setWooUrl(wooCreds.storeUrl); setWooFormOpen(true); }}
                className="text-xs text-center py-2 rr-text-navy-muted"
              >
                {t('wooCommerce.updateCredentials')}
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Store URL *</label>
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Consumer Key *</label>
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
                <label className="block text-xs font-bold mb-1 rr-text-navy-mid">Consumer Secret *</label>
                <input
                  type="password"
                  value={wooSecret}
                  onChange={(e) => setWooSecret(e.target.value)}
                  placeholder="cs_xxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                />
                <p className="text-xs mt-1 rr-text-navy-muted">
                  WooCommerce → Settings → Advanced → REST API → Add key (Read permission)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveWoo}
                  disabled={saveWooCreds.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm rr-bg-navy text-white"
                >
                  {saveWooCreds.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button
                  onClick={() => setWooFormOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tools ──────────────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 shadow-sm bg-white" style={{ border: "1px solid oklch(0.92 0.02 260)" }}>
          <h2 className="text-xs font-black uppercase tracking-widest mb-3 rr-text-navy-muted">Tools</h2>
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
          className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold w-full bg-transparent" style={{ color: "oklch(0.45 0.10 260)" }}
          aria-label="Show app install instructions"
        >
          <Smartphone size={14} aria-hidden="true" />
          Install App on Your Phone
        </button>
        {/* ── API Keys ───────────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Key size={18} className="rr-text-navy" />
            <h2 className="text-base font-black rr-text-navy">
              {t('tools.title', { defaultValue: 'API Keys' })}
            </h2>
          </div>
          <p className="text-xs mb-4 leading-relaxed rr-text-navy-mid">
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
                  className="text-xs break-all select-all rr-text-navy rr-font-mono"
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
                <Copy size={14} className="rr-text-navy" />
              </button>
              <button
                onClick={() => setRevealedKey(null)}
                className="shrink-0 p-1.5 rounded-lg"
                style={{ background: "oklch(0.80 0.12 145)" }}
                title="Dismiss"
              >
                <X size={14} className="rr-text-navy" />
              </button>
            </div>
          )}

          {/* Existing keys list */}
          {apiKeysLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="animate-spin rr-text-navy-muted" />
            </div>
          ) : apiKeyList && apiKeyList.length > 0 ? (
            <div className="space-y-2 mb-4">
              {apiKeyList.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 rr-bg-white-card" style={{ border: "1px solid oklch(0.90 0.02 260)" }}
                >
                  <Key size={14} className="rr-text-navy-muted" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate rr-text-navy">{k.label}</p>
                    <p className="text-xs" style={{ color: "oklch(0.60 0.04 260)" }}>
                      Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm(`Revoke "${k.label}"? This cannot be undone.`)) revokeKey.mutate({ id: k.id }); }}
                    className="shrink-0 p-1.5 rounded-lg rr-bg-surface"
                    title="Revoke key"
                  >
                    <Trash2 size={14} style={{ color: "oklch(0.55 0.15 25)" }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs mb-4" style={{ color: "oklch(0.35 0.04 260)" }}>No API keys yet.</p>
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

          {/* Integration Guide */}
          <IntegrationGuide showSnippet={showSnippet} setShowSnippet={setShowSnippet} />
        </div>
            {/* ── Recent API Imports ────────────────────────────────────────────────────────────────────────────── */}
        {recentImports && recentImports.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="rr-text-navy" />
                <h2 className="text-base font-black rr-text-navy">
                  Recent API Imports
                </h2>
              </div>
              <button
                onClick={handleExportImportsCsv}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold rr-bg-white-card" style={{ color: "oklch(0.40 0.08 260)", border: "1.5px solid oklch(0.88 0.04 260)" }}
              >
                <Download size={12} /> Export CSV
              </button>
            </div>
            <div className="space-y-2">
              {recentImports.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 rr-bg-white-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate rr-text-navy">{ev.email}</p>
                    <p className="text-sm font-semibold rr-text-navy-mid">
                      via <span className="font-medium">{ev.keyLabel}</span> · {ev.created ? "✨ new contact" : "updated"}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "oklch(0.35 0.04 260)" }}>
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
            Fire a POST request to your URL whenever a new contact is created. Use this to push contacts into a CRM, Slack, or Google Sheets.
          </p>
          {showAddWebhook && (
            <div className="rounded-xl p-4 mb-4 space-y-3 rr-bg-white-card">
              <input
                type="text"
                value={newWebhookLabel}
                onChange={(e) => setNewWebhookLabel(e.target.value)}
                placeholder="Label (e.g. Zapier CRM)"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white" style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
              />
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/..."
                className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white" style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
              />
              <input
                type="text"
                value={newWebhookSecret}
                onChange={(e) => setNewWebhookSecret(e.target.value)}
                placeholder="Signing secret (optional — HMAC-SHA256)"
                className="w-full px-3 py-2 rounded-xl text-xs outline-none bg-white" style={{ border: "1.5px solid oklch(0.88 0.04 260)" }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddWebhook(false)} className="px-3 py-1.5 rounded-xl text-sm font-black rr-text-navy" style={{ background: "oklch(0.90 0.01 260)" }}>Cancel</button>
                <button
                  disabled={!newWebhookUrl.trim() || createWebhook.isPending}
                  onClick={() => createWebhook.mutate({ url: newWebhookUrl.trim(), label: newWebhookLabel.trim() || "My Webhook", secret: newWebhookSecret.trim() || undefined })}
                  className="px-3 py-1.5 rounded-xl text-sm font-black flex items-center gap-1 rr-bg-navy text-white"
                >
                  {createWebhook.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Save
                </button>
              </div>
            </div>
          )}
          {(!webhookList || webhookList.length === 0) && !showAddWebhook && (
            <p className="text-xs text-center py-4" style={{ color: "oklch(0.35 0.04 260)" }}>No webhooks yet. Click Add to create one.</p>
          )}
          <div className="space-y-2">
            {(webhookList ?? []).map((wh) => (
              <div key={wh.id} className="rounded-xl p-3 rr-bg-white-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate rr-text-navy">{wh.label}</p>
                    <p className="text-xs truncate rr-text-navy-muted">{wh.url}</p>
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
                                    className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-opacity disabled:opacity-60 rr-bg-navy text-white"
                                  >
                                    {retryDelivery.isPending ? <Loader2 size={9} className="animate-spin" /> : <RotateCcw size={9} />}
                                    Retry
                                  </button>
                                )}
                                <span className="text-sm font-semibold rr-text-navy-mid">{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            {log.errorMessage && <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.50 0.18 25)" }}>{log.errorMessage}</p>}
                            {log.responseBody && <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.30 0.05 260)" }}>{log.responseBody}</p>}
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
            <h2 className="text-base font-black rr-text-navy">{t('tabs.notifications', { defaultValue: 'Notification Preferences' })}</h2>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 rr-bg-white-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold rr-text-navy">WooCommerce auto-import notification</p>
              <p className="text-xs mt-0.5 rr-text-navy-muted">Receive an in-app notification when the Monday auto-import runs and contacts are added.</p>
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
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2 rr-bg-white-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold rr-text-navy">Email open notifications</p>
              <p className="text-xs mt-0.5 rr-text-navy-muted">Receive an in-app notification each time a customer opens your review request email.</p>
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
          {/* ── Haptic Feedback toggle ────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 mt-2 rr-bg-white-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold rr-text-navy">Haptic Feedback</p>
              <p className="text-xs mt-0.5 rr-text-navy-muted">Vibrate on key presses, button taps, and when a customer opens your email or posts a review. Requires a device with vibration support.</p>
            </div>
            <button
              onClick={() => setHapticEnabled(!hapticEnabled)}
              className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
              style={{ background: hapticEnabled ? "oklch(0.50 0.15 145)" : "oklch(0.80 0.02 260)" }}
              aria-label={hapticEnabled ? "Disable haptic feedback" : "Enable haptic feedback"}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: hapticEnabled ? "calc(100% - 1.35rem)" : "0.1rem" }} />
            </button>
          </div>
        </div>
        <SendFeedbackSection />
        {/* ── Admin: OAuth & Auth Integrations ────────────────────────────── */}
        {user?.role === "admin" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="rr-text-navy" />
              <h2
                className="text-base font-black rr-text-navy"
              >
                Auth Integrations
              </h2>
            </div>

            {/* Google OAuth redirect URI reminder */}
            <div
              className="rounded-xl p-4 mb-4 rr-bg-white-card"
            >
              <div className="flex items-start gap-3">
                <Info size={16} className="mt-0.5 shrink-0" style={{ color: "oklch(0.50 0.15 260)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-1 rr-text-navy">
                    Google OAuth — Redirect URI Required
                  </p>
                  <p className="text-xs mb-2" style={{ color: "oklch(0.30 0.05 260)" }}>
                    Add these two URIs to your Google Cloud Console OAuth client before Google login will work on the live domain.
                  </p>
                  <div className="space-y-1">
                    {[
                      "https://getphame.app/api/auth/google/callback",
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
              className="rounded-xl p-4 rr-bg-white-card"
            >
              <div className="flex items-start gap-3">
                <Apple size={16} className="mt-0.5 shrink-0 rr-text-navy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold mb-1 rr-text-navy">
                    Sign in with Apple — 4 Secrets Required
                  </p>
                  <p className="text-xs mb-3" style={{ color: "oklch(0.30 0.05 260)" }}>
                    Add these secrets in Settings → Secrets to enable Apple Sign In.
                  </p>
                  <div className="space-y-2">
                    {[
                      { key: "APPLE_CLIENT_ID", hint: "Services ID identifier, e.g. app.phame.signin" },
                      { key: "APPLE_TEAM_ID", hint: "10-char string, top-right of developer.apple.com" },
                      { key: "APPLE_KEY_ID", hint: "Key ID shown after creating a Sign in with Apple key" },
                      { key: "APPLE_PRIVATE_KEY", hint: "Full contents of the .p8 file including header/footer" },
                    ].map(({ key, hint }) => (
                      <div key={key}>
                        <p className="text-xs font-bold rr-text-navy">{key}</p>
                        <p className="text-sm font-semibold rr-text-navy-mid">{hint}</p>
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.96 0.08 150)" }}>
              <ShieldCheck size={18} style={{ color: "oklch(0.40 0.14 150)" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold rr-text-navy">Compliance Guide</p>
              <p className="text-sm font-semibold rr-text-navy-mid">Platform rules, legal notes &amp; best practices</p>
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

      </div>{/* end max-width wrapper */}
      </div>{/* end outer padding */}
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
              <p className="text-xs font-bold tracking-widest uppercase rr-text-gold">Email Preview</p>
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
          <div className="px-5 py-3 shrink-0 rr-bg-navy-darker" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm font-bold" style={{ color: "oklch(0.15 0.05 260)" }}>
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
          <div className="px-5 py-3 shrink-0 text-center rr-bg-navy-darker" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
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
