// ChurnSurvey — one-question cancellation survey
// Route: /cancel
// Shows before redirecting to Stripe billing portal to cancel
// Captures reason + optional comment, then opens the portal

import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, Frown, ArrowRight } from "lucide-react";

const REASONS: { value: string; label: string; emoji: string }[] = [
  { value: "too_expensive",    label: "It's too expensive",          emoji: "💸" },
  { value: "not_using",        label: "I'm not using it enough",     emoji: "😴" },
  { value: "switching_tools",  label: "Switching to another tool",   emoji: "🔀" },
  { value: "missing_feature",  label: "Missing a feature I need",    emoji: "🧩" },
  { value: "other",            label: "Something else",              emoji: "💬" },
];

type Reason = "too_expensive" | "not_using" | "switching_tools" | "missing_feature" | "other";

export default function ChurnSurveyPage() {
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<Reason | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [offerValidUntil, setOfferValidUntil] = useState<number | null>(null);

  // Offer is still valid if within 7 days of survey submission
  const offerActive = offerValidUntil !== null && Date.now() < offerValidUntil;

  const submitSurvey = trpc.churn.submit.useMutation({
    onSuccess: (data) => {
      if (data.offerValidUntil) setOfferValidUntil(data.offerValidUntil);
      setSubmitted(true);
    },
    onError: () => setSubmitted(true), // proceed even on error
  });

  const getPortalUrl = trpc.stripe.createPortal.useMutation({
    onSuccess: (data: { url: string }) => {
      window.open(data.url, "_blank");
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Could not open billing portal. Please try again.");
    },
  });

  function handleSubmit() {
    if (!selected) {
      toast.error("Please select a reason before continuing.");
      return;
    }
    submitSurvey.mutate({
      reason: selected,
      comment: comment.trim() || undefined,
    });
  }

  function handleProceedToCancel() {
    getPortalUrl.mutate({ origin: window.location.origin });
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div
        className="px-5 pt-14 pb-8"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-xl"
            style={{ background: "oklch(0.30 0.07 260)" }}
          >
            <ArrowRight size={16} style={{ color: "white", transform: "rotate(180deg)" }} />
          </button>
          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-0.5"
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}
            >
              ReviewLink
            </p>
            <h1
              className="text-xl font-black leading-tight"
              style={{ color: "white", fontFamily: "'Syne', sans-serif" }}
            >
              Before you go…
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Frown size={18} style={{ color: "oklch(0.80 0.18 80)" }} />
          <p className="text-sm" style={{ color: "oklch(0.80 0.90 80)" }}>
            Help us improve by telling us why you're leaving.
          </p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto">
        {!submitted ? (
          <>
            {/* Reason selector */}
            <div className="flex flex-col gap-3 mb-5">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setSelected(r.value as Reason)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all"
                  style={{
                    background: selected === r.value
                      ? "oklch(0.22 0.09 260)"
                      : "white",
                    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
                    border: selected === r.value
                      ? "2px solid oklch(0.80 0.18 80)"
                      : "2px solid transparent",
                  }}
                >
                  <span className="text-xl">{r.emoji}</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: selected === r.value ? "white" : "oklch(0.22 0.09 260)" }}
                  >
                    {r.label}
                  </span>
                  {selected === r.value && (
                    <span
                      className="ml-auto text-xs font-black"
                      style={{ color: "oklch(0.80 0.18 80)" }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Discount offer — shown only when too_expensive is selected AND offer hasn't expired */}
            {selected === "too_expensive" && offerActive !== false && (
              <div
                className="rounded-2xl px-4 py-4 mb-4 flex flex-col gap-3"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  border: "2px solid oklch(0.80 0.18 80)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <p
                    className="text-sm font-black"
                    style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
                  >
                    Wait — here's a deal for you
                  </p>
                </div>
                <p className="text-sm" style={{ color: "var(--text-on-dark-primary)" }}>
                  Stay on ReviewLink for <strong style={{ color: "oklch(0.80 0.18 80)" }}>40% off for 3 months</strong>. Use code at checkout:
                </p>
                <div
                  className="rounded-xl px-4 py-2.5 text-center font-black tracking-widest text-base select-all"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)", letterSpacing: "0.15em" }}
                >
                  STAY40
                </div>
                <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
                  Valid for 7 days. Apply at checkout when resubscribing.
                </p>
                <button
                  onClick={() => navigate("/upgrade")}
                  className="w-full rounded-xl py-3 text-sm font-black"
                  style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
                >
                  Claim Offer — Keep My Plan
                </button>
              </div>
            )}

            {/* Optional comment */}
            <div className="mb-6">
              <label
                className="block text-xs font-bold mb-2 uppercase tracking-widest"
                style={{ color: "oklch(0.45 0.04 260)" }}
              >
                Anything else? (optional)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Tell us more…"
                rows={3}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: "white",
                  border: "1px solid oklch(0.88 0.02 260)",
                  color: "oklch(0.22 0.09 260)",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selected || submitSurvey.isPending}
              className="w-full rounded-2xl py-4 text-sm font-black flex items-center justify-center gap-2"
              style={{
                background: selected ? "oklch(0.80 0.18 80)" : "oklch(0.88 0.02 260)",
                color: selected ? "oklch(0.22 0.09 260)" : "oklch(0.55 0.04 260)",
              }}
            >
              {submitSurvey.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Submit & Continue to Cancel</>
              )}
            </button>

            {/* Skip */}
            <button
              onClick={() => setSubmitted(true)}
              className="w-full mt-3 py-2 text-xs text-center"
              style={{ color: "oklch(0.60 0.04 260)" }}
            >
              Skip survey and cancel anyway
            </button>
          </>
        ) : (
          /* Post-submit: show proceed button */
          <div
            className="rounded-2xl px-6 py-8 text-center"
            style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
          >
            <p className="text-3xl mb-3">🙏</p>
            <h2
              className="text-lg font-black mb-2"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}
            >
              Thanks for the feedback
            </h2>
            <p className="text-sm mb-6" style={{ color: "oklch(0.55 0.04 260)" }}>
              Click below to open the billing portal and complete your cancellation.
            </p>
            <button
              onClick={handleProceedToCancel}
              disabled={getPortalUrl.isPending}
              className="w-full rounded-2xl py-4 text-sm font-black flex items-center justify-center gap-2"
              style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
            >
              {getPortalUrl.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Open Billing Portal <ArrowRight size={14} /></>
              )}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-full mt-3 py-2 text-xs text-center"
              style={{ color: "oklch(0.60 0.04 260)" }}
            >
              Actually, I'll stay — go back to Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
