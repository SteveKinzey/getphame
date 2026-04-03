// ReviewLink — Settings Page
// Sections: Business Profile, Gmail Connection, Plan

import { useState } from "react";
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
} from "lucide-react";
import ProBadge from "@/components/ProBadge";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  // ── Profile form state ─────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [reviewLink, setReviewLink] = useState("");
  const [profileInitialized, setProfileInitialized] = useState(false);

  // Populate form once profile loads
  if (profile && !profileInitialized) {
    setBusinessName(profile.businessName);
    setReviewLink(profile.reviewLink);
    setProfileInitialized(true);
  }

  const utils = trpc.useUtils();
  const upsertProfile = trpc.profile.upsert.useMutation({
    onSuccess: () => {
      utils.profile.get.invalidate();
      toast.success("Business profile saved!");
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

  // ── Gmail status ───────────────────────────────────────────────────────────
  const { data: gmailStatus, isLoading: gmailLoading } = trpc.gmail.status.useQuery();
  const { data: authUrlData } = trpc.gmail.authUrl.useQuery(
    { origin: window.location.origin },
    { enabled: !!user }
  );

  const disconnectGmail = trpc.gmail.disconnect.useMutation({
    onSuccess: () => {
      utils.gmail.status.invalidate();
      toast.success("Gmail disconnected.");
    },
    onError: (err) => toast.error(err.message),
  });

  function handleSaveProfile() {
    if (!businessName.trim()) { toast.error("Business name is required"); return; }
    if (!reviewLink.trim()) { toast.error("Google review link is required"); return; }
    upsertProfile.mutate({ businessName: businessName.trim(), reviewLink: reviewLink.trim() });
  }

  function handleConnectGmail() {
    if (authUrlData?.url) {
      window.location.href = authUrlData.url;
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.975 0.003 100)" }}>
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

        {/* ── Gmail Connection ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2
              className="text-base font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Gmail Connection
            </h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 260)" }}>
            Connect your Gmail so review requests are sent from your own email address.
          </p>

          {gmailLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : gmailStatus?.connected ? (
            <div className="flex flex-col gap-3">
              {/* Connected state */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.96 0.04 145)" }}
              >
                <CheckCircle2 size={18} style={{ color: "oklch(0.55 0.18 145)" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.12 145)" }}>
                    Gmail Connected
                  </p>
                  <p className="text-xs" style={{ color: "oklch(0.45 0.10 145)" }}>
                    {gmailStatus.gmailEmail}
                  </p>
                </div>
              </div>

              <button
                onClick={() => disconnectGmail.mutate()}
                disabled={disconnectGmail.isPending}
                className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-transform active:scale-95"
                style={{
                  background: "oklch(0.96 0.01 260)",
                  color: "oklch(0.55 0.03 260)",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {disconnectGmail.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <LogOut size={14} />
                )}
                Disconnect Gmail
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Not connected state */}
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.97 0.03 80)" }}
              >
                <AlertCircle size={18} style={{ color: "oklch(0.65 0.18 80)" }} className="mt-0.5 shrink-0" />
                <p className="text-xs" style={{ color: "oklch(0.45 0.10 80)" }}>
                  Gmail is not connected. Review requests cannot be sent until you connect your Gmail account.
                </p>
              </div>

              <button
                onClick={handleConnectGmail}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95"
                style={{
                  background: "oklch(0.80 0.18 80)",
                  color: "oklch(0.22 0.09 260)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <Mail size={16} />
                Connect Gmail Account
                <ExternalLink size={14} />
              </button>

              <p className="text-xs text-center" style={{ color: "oklch(0.60 0.03 260)" }}>
                You'll be redirected to Google to authorize access. We only request permission to send emails — we cannot read your inbox.
              </p>
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
                background: profile?.tier === "pro" ? "oklch(0.80 0.18 80)" : "oklch(0.93 0.02 260)",
                color: profile?.tier === "pro" ? "oklch(0.22 0.09 260)" : "oklch(0.45 0.04 260)",
              }}
            >
              {profile?.tier === "pro" ? "PRO" : "FREE"}
            </span>
          </div>

          {profile?.tier === "pro" ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                Unlimited requests · Active subscription
                {subStatus?.status && (
                  <span className="ml-1" style={{ color: "oklch(0.55 0.18 145)" }}>
                    ({subStatus.status})
                  </span>
                )}
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

        {/* ── Tools ───────────────────────────────────────────────────────── */}
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
          </div>
        </div>

        {/* ── Sign Out ─────────────────────────────────────────────────────── */}
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
