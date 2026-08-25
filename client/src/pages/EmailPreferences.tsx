// Public email preferences page — accessible without login
// Allows lead-capture subscribers to update consent or unsubscribe
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Mail, ShieldCheck, ShieldOff, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function EmailPreferences() {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState("");
  const [step, setStep] = useState<"enter" | "manage">("enter");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [unsubscribeReason, setUnsubscribeReason] = useState("");

  const prefsQuery = trpc.leadCapture.getPreferences.useQuery(
    { email: emailSubmitted },
    { enabled: !!emailSubmitted, retry: false }
  );

  const updateMutation = trpc.leadCapture.updatePreferences.useMutation({
    onSuccess: () => {
      prefsQuery.refetch();
    },
    onError: (err) => {
      setLookupError(err.message);
    },
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setLookupError("Please enter a valid email address.");
      return;
    }
    setLookupError(null);
    setEmailSubmitted(trimmed);
    setStep("manage");
  };

  const prefs = prefsQuery.data;
  const isLoading = prefsQuery.isLoading;
  const notFound = !isLoading && step === "manage" && prefs === null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="w-full max-w-md mb-8 flex items-center gap-3">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold rr-text-navy-muted hover:rr-text-navy transition-colors">
          <ArrowLeft size={15} />
          Back to Get Phame
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white shadow-lg p-8" style={{ border: "1px solid oklch(0.90 0.02 260)" }}>
          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "oklch(0.22 0.09 260 / 0.08)" }}>
              <Mail size={28} style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
            <h1 className="font-display font-bold text-2xl rr-text-navy mb-1">Email Preferences</h1>
            <p className="text-sm rr-text-navy-muted max-w-xs">
              Manage your Get Phame email subscription and consent settings.
            </p>
          </div>

          {step === "enter" ? (
            /* Step 1: Enter email */
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold rr-text-navy mb-1.5">Your email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLookupError(null); }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                  style={{ border: "1.5px solid oklch(0.88 0.02 260)", background: "oklch(0.975 0.003 100)" }}
                  onFocus={(e) => (e.target.style.borderColor = "oklch(0.22 0.09 260)")}
                  onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.02 260)")}
                 name="rr-pages-email-preferences-email-73" />
                {lookupError && <p className="mt-1.5 text-xs font-medium text-red-500">{lookupError}</p>}
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
              >
                View my preferences
              </button>
            </form>
          ) : isLoading ? (
            /* Loading */
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={24} className="animate-spin rr-text-navy-muted" />
              <p className="text-sm rr-text-navy-muted">Looking up your preferences…</p>
            </div>
          ) : notFound ? (
            /* Not found */
            <div className="text-center py-6">
              <p className="text-sm font-medium rr-text-navy mb-4">
                We couldn't find an account for <strong>{emailSubmitted}</strong>.
              </p>
              <p className="text-xs rr-text-navy-muted mb-5">
                If you subscribed with a different address, try that one instead.
              </p>
              <button
                onClick={() => { setStep("enter"); setEmailSubmitted(""); setLookupError(null); }}
                className="text-sm font-semibold underline rr-text-navy"
              >
                Try a different email
              </button>
            </div>
          ) : prefs ? (
            /* Manage preferences */
            <div className="space-y-5">
              <p className="text-sm rr-text-navy-muted text-center">
                Managing preferences for <strong className="rr-text-navy">{prefs.email}</strong>
              </p>

              {/* Consent status */}
              <div className="rounded-2xl p-4" style={{ background: "oklch(0.975 0.003 100)", border: "1px solid oklch(0.90 0.02 260)" }}>
                <div className="flex items-center gap-3 mb-1">
                  {prefs.consentGiven ? (
                    <ShieldCheck size={18} style={{ color: "oklch(0.45 0.15 145)" }} />
                  ) : (
                    <ShieldOff size={18} className="rr-text-navy-muted" />
                  )}
                  <p className="text-sm font-bold rr-text-navy">Email Consent</p>
                </div>
                <p className="text-xs rr-text-navy-muted ml-7">
                  {prefs.consentGiven
                    ? `Consent given on ${new Date(prefs.consentGivenAt!).toLocaleDateString()}`
                    : "No explicit consent recorded"}
                </p>
              </div>

              {/* Subscription status + toggle */}
              <div className="rounded-2xl p-4" style={{ background: "oklch(0.975 0.003 100)", border: "1px solid oklch(0.90 0.02 260)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} style={{ color: prefs.unsubscribed ? "oklch(0.55 0.04 260)" : "oklch(0.45 0.15 145)" }} />
                    <div>
                      <p className="text-sm font-bold rr-text-navy">
                        {prefs.unsubscribed ? "Unsubscribed" : "Subscribed"}
                      </p>
                      <p className="text-xs rr-text-navy-muted">
                        {prefs.unsubscribed
                          ? `Unsubscribed on ${new Date(prefs.unsubscribedAt!).toLocaleDateString()}`
                          : "You are receiving Get Phame emails"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({ email: prefs.email, unsubscribe: !prefs.unsubscribed, reason: !prefs.unsubscribed ? (unsubscribeReason || undefined) : undefined })}
                    disabled={updateMutation.isPending}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60"
                    style={prefs.unsubscribed
                      ? { background: "oklch(0.22 0.09 260)", color: "white" }
                      : { background: "oklch(0.94 0.02 260)", color: "oklch(0.40 0.06 260)", border: "1px solid oklch(0.85 0.02 260)" }
                    }
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : prefs.unsubscribed ? (
                      "Re-subscribe"
                    ) : (
                      "Unsubscribe"
                    )}
                  </button>
                </div>
              </div>

              {/* Unsubscribe feedback dropdown — shown only when not yet unsubscribed */}
              {!prefs.unsubscribed && (
                <div className="rounded-2xl p-4" style={{ background: "oklch(0.975 0.003 100)", border: "1px solid oklch(0.90 0.02 260)" }}>
                  <label className="block text-xs font-bold rr-text-navy mb-2">
                    Why are you unsubscribing? <span className="font-normal rr-text-navy-muted">(optional)</span>
                  </label>
                  <select
                    value={unsubscribeReason}
                    onChange={(e) => setUnsubscribeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium outline-none"
                    style={{ border: "1.5px solid oklch(0.88 0.02 260)", background: "white", color: "oklch(0.22 0.09 260)" }}
                   name="rr-pages-email-preferences-unsubscribe-reason-183">
                    <option value="">Select a reason…</option>
                    <option value="too_many_emails">Too many emails</option>
                    <option value="not_relevant">Content not relevant to me</option>
                    <option value="never_signed_up">I never signed up for this</option>
                    <option value="privacy_concerns">Privacy concerns</option>
                    <option value="using_competitor">Using a different service</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {updateMutation.isSuccess && (
                <p className="text-xs text-center font-medium" style={{ color: "oklch(0.45 0.15 145)" }}>
                  ✓ Your preferences have been updated.
                </p>
              )}

              <button
                onClick={() => { setStep("enter"); setEmailSubmitted(""); }}
                className="w-full text-xs rr-text-navy-muted hover:rr-text-navy transition-colors text-center"
              >
                Use a different email
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-xs rr-text-navy-muted text-center mt-6">
          Get Phame · <a href="https://getphame.app" className="underline">getphame.app</a>
        </p>
      </div>
    </div>
  );
}
