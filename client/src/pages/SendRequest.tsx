// ReviewLink — Send Request Page
// Sends a review request email via the user's connected Gmail account

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Send, Rocket, Mail, User, Star, Crown, AlertCircle, Settings2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const SUCCESS_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663507659115/J5ynazTEDzwxyTMCadbnuz/rr-send-success-8kZtg3dvEuiCrR8DrxxgKA.webp";

type SendMethod = "email";

export default function SendRequestPage() {
  const [, navigate] = useLocation();

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: gmailStatus } = trpc.gmail.status.useQuery();
  const { data: stats } = trpc.requests.stats.useQuery();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const sendRequest = trpc.requests.send.useMutation({
    onSuccess: () => {
      setSending(false);
      setSent(true);
      toast.success("Review request sent!");
    },
    onError: (err) => {
      setSending(false);
      toast.error(err.message);
    },
  });

  const atFreeLimit =
    profile?.tier === "free" && (stats?.thisMonth ?? 0) >= 10;
  const gmailConnected = gmailStatus?.connected ?? false;
  const profileComplete = !!profile?.businessName && !!profile?.reviewLink;

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
    setSending(true);
    sendRequest.mutate({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      method: "email",
    });
  }

  function handleSendAnother() {
    setCustomerName("");
    setCustomerEmail("");
    setErrors({});
    setSent(false);
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 pb-28"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="w-40 h-40 mb-6">
          <img src={SUCCESS_IMG} alt="Sent!" className="w-full h-full object-contain" />
        </div>
        <h2
          className="text-3xl font-black text-center mb-2"
          style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
        >
          Request Sent! 🚀
        </h2>
        <p className="text-center mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
          Your review request was sent to{" "}
          <strong style={{ color: "oklch(0.80 0.18 80)" }}>{customerName}</strong> from your Gmail
          account.
        </p>
        <p className="text-sm text-center mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          The email comes from <strong>{gmailStatus?.gmailEmail}</strong> so it feels personal.
        </p>
        <div className="flex gap-1 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={28} fill="oklch(0.80 0.18 80)" style={{ color: "oklch(0.80 0.18 80)" }} />
          ))}
        </div>
        <button
          onClick={handleSendAnother}
          className="w-full max-w-xs py-4 rounded-2xl font-black text-lg"
          style={{
            background: "oklch(0.80 0.18 80)",
            color: "oklch(0.22 0.09 260)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Send Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Send size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
          >
            Send Request
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Syne', sans-serif", fontWeight: 900 }}
        >
          Request a Review
        </h1>
        {profile && (
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            From: {gmailStatus?.gmailEmail ?? "Gmail not connected"}
          </p>
        )}
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Gmail not connected warning ──────────────────────────────────── */}
        {!gmailConnected && (
          <div
            className="flex items-start gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "oklch(0.97 0.03 80)" }}
          >
            <AlertCircle size={20} style={{ color: "oklch(0.65 0.18 80)" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.40 0.10 80)" }}>
                Gmail not connected
              </p>
              <p className="text-xs mb-2" style={{ color: "oklch(0.50 0.08 80)" }}>
                Connect your Gmail account in Settings so emails are sent from your own address.
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

        {/* ── Free limit warning ───────────────────────────────────────────── */}
        {atFreeLimit && (
          <div
            className="flex items-start gap-3 px-4 py-4 rounded-2xl"
            style={{ background: "oklch(0.22 0.09 260)" }}
          >
            <Crown size={20} style={{ color: "oklch(0.80 0.18 80)" }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: "white" }}>
                Free plan limit reached
              </p>
              <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                You've used all 10 free requests this month.
              </p>
              <button
                onClick={() => navigate("/upgrade")}
                className="text-xs font-bold"
                style={{ color: "oklch(0.80 0.18 80)" }}
              >
                Upgrade to Pro →
              </button>
            </div>
          </div>
        )}

        {/* ── Customer form ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2
            className="text-base font-black mb-4"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
          >
            Customer Details
          </h2>

          <div className="flex flex-col gap-4">
            {/* Name */}
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

            {/* Preview */}
            {profile?.businessName && customerName && (
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: "oklch(0.97 0.01 260)" }}
              >
                <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.04 260)" }}>
                  Email Preview
                </p>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 260)" }}>
                  <strong>From:</strong> {gmailStatus?.gmailEmail ?? "your-gmail@gmail.com"}
                  <br />
                  <strong>Subject:</strong> {profile.businessName} would love your feedback!
                  <br />
                  <strong>Body:</strong> Hi {customerName}! Thank you for choosing {profile.businessName}...
                </p>
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || atFreeLimit || !gmailConnected || !profileComplete}
              className="flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg transition-transform active:scale-95"
              style={{
                background:
                  sending || atFreeLimit || !gmailConnected || !profileComplete
                    ? "oklch(0.80 0.03 260)"
                    : "oklch(0.80 0.18 80)",
                color:
                  sending || atFreeLimit || !gmailConnected || !profileComplete
                    ? "oklch(0.55 0.03 260)"
                    : "oklch(0.22 0.09 260)",
                fontFamily: "'Syne', sans-serif",
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

            {/* Monthly count */}
            {profile?.tier === "free" && (
              <p className="text-center text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>
                {stats?.thisMonth ?? 0} / 10 free requests used this month
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
