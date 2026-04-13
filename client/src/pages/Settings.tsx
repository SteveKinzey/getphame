// ReviewLink — Settings Page
// Sections: Business Profile, Gmail Connection, Plan

import { useState, useEffect } from "react";
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
} from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { toast } from "sonner";
import { useLocation } from "wouter";

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

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  // ── Profile form state ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  // Populate form once profile loads (useEffect avoids render-phase setState)
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName);
      setReviewLink(profile.reviewLink);
      setFromName(profile.fromName ?? "");
      setReplyTo(profile.replyTo ?? "");
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

  // ── Onboarding reset ─────────────────────────────────────────────────────
  const resetOnboarding = trpc.onboarding.reset.useMutation({
    onSuccess: () => {
      utils.onboarding.status.invalidate();
      toast.success("Setup wizard reopened! Check the home screen.");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Stripe subscription status ────────────────────────────────────────────
  const { data: subStatus } = trpc.stripe.subscriptionStatus.useQuery();

  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => {
      toast.info("Opening billing portal...");
      window.open(url, "_blank");
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

  const quickSync = trpc.woo.sync.useMutation({
    onSuccess: (result) => {
      utils.woo.getCredentials.invalidate();
      utils.woo.listPending.invalidate();
      if (result.added > 0) {
        toast.success(
          `Synced — ${result.added} new customer${result.added !== 1 ? "s" : ""} added.`,
          {
            action: {
              label: "View new customers",
              onClick: () => navigate("/woo-customers"),
            },
            duration: 6000,
          }
        );
      } else {
        toast.success("Sync complete — no new customers found.");
      }
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  function handleSaveWoo() {
    if (!wooUrl.trim()) { toast.error("Store URL is required"); return; }
    if (!wooKey.trim()) { toast.error("Consumer Key is required"); return; }
    if (!wooSecret.trim()) { toast.error("Consumer Secret is required"); return; }
    saveWooCreds.mutate({ storeUrl: wooUrl.trim(), consumerKey: wooKey.trim(), consumerSecret: wooSecret.trim() });
  }

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
    google: "🔍",
    yelp: "⭐",
    tripadvisor: "🦉",
    bing: "🌐",
    facebook: "👍",
    other: "🔗",
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

  // Auto-detect SMTP settings when email changes
  const { data: smtpDetect } = trpc.smtp.detect.useQuery(
    { email: smtpEmail },
    { enabled: smtpEmail.includes("@") && smtpEmail.includes(".") }
  );
  useEffect(() => {
    if (smtpDetect?.detected) {
      setSmtpHost(smtpDetect.detected.host);
      setSmtpPort(smtpDetect.detected.port);
      setSmtpSecure(smtpDetect.detected.secure);
    }
    setSmtpHint(smtpDetect?.hint ?? null);
  }, [smtpDetect]);

  const connectSmtp = trpc.smtp.connect.useMutation({
    onSuccess: () => {
      utils.smtp.status.invalidate();
      setShowSmtpForm(false);
      setSmtpPassword("");
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
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Settings size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            Settings
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Account & Profile
        </h1>
        {user && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {user.name ?? user.email ?? "Signed in"}
            </p>
            {profile?.tier === "pro" && <ProBadge size="sm" />}
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
                      When a customer replies to the email, it goes here. Leave blank to use your connected Gmail.
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
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                  style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.45 0.04 260)" }}
                >
                  <Pencil size={14} />
                  Change Email
                </button>
                <button
                  onClick={() => resendWelcome.mutate()}
                  disabled={resendWelcome.isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                  style={{ background: "oklch(0.96 0.04 260)", color: "oklch(0.22 0.09 260)" }}
                  title="Resend confirmation email to your inbox"
                >
                  {resendWelcome.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Resend Email
                </button>
                <button
                  onClick={() => disconnectSmtp.mutate()}
                  disabled={disconnectSmtp.isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-transform active:scale-95"
                  style={{ background: "oklch(0.97 0.02 27)", color: "oklch(0.50 0.18 27)" }}
                >
                  {disconnectSmtp.isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
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

              {/* Password field */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>Password *</label>
                <div className="relative">
                  <input
                    type={showSmtpPassword ? "text" : "password"}
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={smtpStatus?.connected ? "Enter new password to update" : "Your email password or app password"}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-10"
                    style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                    style={{ color: "oklch(0.55 0.03 260)" }}
                  >
                    {showSmtpPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {smtpHint && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: "oklch(0.97 0.03 80)", color: "oklch(0.45 0.10 80)" }}
                  >
                    💡 {smtpHint}
                  </div>
                )}
              </div>

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

              {/* Advanced: host/port — collapsed by default, auto-filled */}
              <details className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                <summary className="cursor-pointer font-semibold py-1">Advanced settings (auto-detected)</summary>
                <div className="flex flex-col gap-2 mt-2">
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

              <div className="flex gap-2">
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

        {/* ── Plan ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown size={18} style={{ color: "oklch(0.80 0.18 80)" }} />
              <h2
                className="text-base font-black"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Your Plan
              </h2>
            </div>
            <span
              className="text-xs font-bold px-2 py-1 rounded-full"
              style={{
                background: (profile?.tier && profile.tier !== "free") ? "oklch(0.80 0.18 80)" : "oklch(0.93 0.02 260)",
                color: (profile?.tier && profile.tier !== "free") ? "oklch(0.22 0.09 260)" : "oklch(0.45 0.04 260)",
              }}
            >
              {profile?.tier === "lifetime" ? "LIFETIME" : profile?.tier === "annual" ? "ANNUAL PRO" : profile?.tier === "pro" ? "MONTHLY PRO" : "FREE"}
            </span>
          </div>

          {(profile?.tier === "pro" || profile?.tier === "annual" || profile?.tier === "lifetime") ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                {profile?.tier === "lifetime"
                  ? "Unlimited requests · Lifetime license — no renewals"
                  : profile?.tier === "annual"
                  ? "Unlimited requests · Annual subscription"
                  : "Unlimited requests · Monthly subscription"}
              </p>
              <button
                onClick={() => createPortal.mutate({ origin: window.location.origin })}
                disabled={createPortal.isPending}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 disabled:opacity-70"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "oklch(0.80 0.18 80)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {createPortal.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CreditCard size={14} />
                )}
                Manage Billing
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/upgrade")}
              className="w-full py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
              style={{
                background: "oklch(0.22 0.09 260)",
                color: "oklch(0.80 0.18 80)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Upgrade to Pro — Unlimited Requests
            </button>
          )}
        </div>

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
  );
}
