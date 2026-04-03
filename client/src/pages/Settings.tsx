// ReviewRocket — Settings Page
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
} from "lucide-react";
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
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
          >
            Settings
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Account & Profile
        </h1>
        {user && (
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            {user.name ?? user.email ?? "Signed in"}
          </p>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Business Profile ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} style={{ color: "oklch(0.22 0.09 260)" }} />
            <h2
              className="text-base font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
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
                  fontFamily: "'Syne', sans-serif",
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
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
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
                  fontFamily: "'Syne', sans-serif",
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
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
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
                  fontFamily: "'Syne', sans-serif",
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
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Upgrade to Pro — Unlimited Requests
            </button>
          )}
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
