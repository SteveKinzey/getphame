import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

type Reason = "too_expensive" | "not_using" | "switching_tools" | "missing_feature" | "other";
type Stage = "survey" | "confirm" | "success";
type SuccessKind = "refund" | "already_refunded" | "renewal";

const REASONS: Array<{ value: Reason; translationKey: string }> = [
  { value: "too_expensive", translationKey: "reasonTooExpensive" },
  { value: "not_using", translationKey: "reasonNotUsing" },
  { value: "switching_tools", translationKey: "reasonSwitching" },
  { value: "missing_feature", translationKey: "reasonMissingFeature" },
  { value: "other", translationKey: "reasonOther" },
];

export default function ChurnSurveyPage() {
  const { t, i18n } = useTranslation("cancellation");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Reason | null>(null);
  const [comment, setComment] = useState("");
  const [stage, setStage] = useState<Stage>("survey");
  const [confirmed, setConfirmed] = useState(false);
  const [successKind, setSuccessKind] = useState<SuccessKind | null>(null);
  const [successAmount, setSuccessAmount] = useState<string | null>(null);
  const [accessEndsAt, setAccessEndsAt] = useState<number | null>(null);

  const guarantee = trpc.stripe.guaranteeStatus.useQuery(undefined, { retry: false });
  const submitSurvey = trpc.churn.submit.useMutation();
  const claimGuarantee = trpc.stripe.claimGuarantee.useMutation({
    onSuccess: async (data) => {
      setSuccessAmount(formatMoney(data.amount, data.currency));
      setSuccessKind(data.alreadyRefunded ? "already_refunded" : "refund");
      setStage("success");
      await Promise.all([
        utils.stripe.guaranteeStatus.invalidate(),
        utils.stripe.subscriptionStatus.invalidate(),
      ]);
    },
  });
  const cancelRenewal = trpc.stripe.cancelRenewal.useMutation({
    onSuccess: async (data) => {
      setAccessEndsAt(data.currentPeriodEnd);
      setSuccessKind("renewal");
      setStage("success");
      await utils.stripe.subscriptionStatus.invalidate();
    },
  });

  function formatMoney(amount: number | null, currency: string | null) {
    if (amount === null || !currency) return "";
    return new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language || "en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function formatDate(timestamp: number | null) {
    if (!timestamp) return "";
    return new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  }

  const amount = formatMoney(guarantee.data?.amount ?? null, guarantee.data?.currency ?? null);
  const deadline = formatDate(guarantee.data?.deadlineAt ?? null);
  const canRefund = guarantee.data?.eligible || guarantee.data?.reason === "already_refunded";
  const canCancelRenewal = guarantee.data?.reason === "expired";

  const statusCopy = useMemo(() => {
    const reason = guarantee.data?.reason;
    if (reason === "eligible") {
      return { badge: t("eligibleBadge"), body: t("eligibleText", { amount, deadline }), tone: "eligible" as const };
    }
    if (reason === "already_refunded") {
      return { badge: t("refundedBadge"), body: t("refundedText"), tone: "refunded" as const };
    }
    if (reason === "expired") {
      return { badge: t("expiredBadge"), body: t("expiredText", { deadline }), tone: "expired" as const };
    }
    if (reason === "lifetime") {
      return { badge: t("lifetimeBadge"), body: t("lifetimeText"), tone: "neutral" as const };
    }
    return { badge: t("unavailableBadge"), body: t("unavailableText"), tone: "neutral" as const };
  }, [amount, deadline, guarantee.data?.reason, t]);

  function continueToConfirmation() {
    if (selected) {
      submitSurvey.mutate({ reason: selected, comment: comment.trim() || undefined });
    }
    setConfirmed(false);
    setStage("confirm");
  }

  function submitFinalAction() {
    if (!confirmed) return;
    if (canRefund) {
      claimGuarantee.mutate({ confirmation: "REFUND_AND_CANCEL" });
    } else if (canCancelRenewal) {
      cancelRenewal.mutate({ confirmation: "CANCEL_RENEWAL" });
    }
  }

  const finalError = claimGuarantee.error?.message || cancelRenewal.error?.message;
  const isFinalPending = claimGuarantee.isPending || cancelRenewal.isPending;

  return (
    <main className="min-h-screen bg-[#f7f4ec] pb-24 text-[#061a3a]">
      <header className="relative overflow-hidden bg-[#061a3a] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_80%_15%,rgba(212,160,23,.45),transparent_28%),linear-gradient(120deg,transparent_35%,rgba(255,255,255,.06)_35%,rgba(255,255,255,.06)_36%,transparent_36%)]" />
        <div className="relative mx-auto max-w-5xl px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
          <div className="mb-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t("backToSettings")}</span>
            </button>
            <div className="flex items-center gap-2">
              <img src="https://assets.getphame.app/getphame-logo.svg" alt="" className="h-7 w-7 object-contain" aria-hidden="true" />
              <span className="font-['Syne'] text-sm font-black tracking-[0.14em] text-white">GET <span className="text-[#D4A017]">PHAME</span></span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="rounded-xl p-2 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
              aria-label={t("backToSettings")}
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#D4A017]">{t("eyebrow")}</p>
            <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-5xl">{t("title")}</h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-white/80 sm:text-base">{t("subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto -mt-5 grid max-w-5xl gap-5 px-5 sm:px-8 lg:grid-cols-[1.12fr_.88fr]">
        <div className="rounded-[1.75rem] border border-black/5 bg-white p-5 shadow-[0_18px_55px_rgba(6,26,58,.12)] sm:p-7">
          {guarantee.isLoading ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
              <Loader2 size={30} className="animate-spin text-[#D4A017]" />
              <p className="font-bold text-[#31415f]">{t("loading")}</p>
            </div>
          ) : guarantee.isError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <ShieldCheck size={34} className="text-[#D4A017]" />
              <p className="max-w-sm font-bold text-[#31415f]">{t("loadError")}</p>
              <button type="button" onClick={() => guarantee.refetch()} className="rounded-xl bg-[#061a3a] px-5 py-3 text-sm font-black text-white">{t("continue")}</button>
            </div>
          ) : stage === "success" ? (
            <SuccessPanel
              kind={successKind}
              amount={successAmount}
              accessEndsAt={formatDate(accessEndsAt)}
              onDone={() => navigate("/settings")}
              t={t}
            />
          ) : (
            <>
              <div className="mb-6 flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#061a3a] text-[#D4A017]">
                  {statusCopy.tone === "eligible" ? <CircleDollarSign size={23} /> : statusCopy.tone === "refunded" ? <BadgeCheck size={23} /> : <Clock3 size={23} />}
                </div>
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusCopy.tone === "eligible" ? "bg-emerald-100 text-emerald-800" : statusCopy.tone === "expired" ? "bg-amber-100 text-amber-900" : statusCopy.tone === "refunded" ? "bg-sky-100 text-sky-900" : "bg-slate-100 text-slate-700"}`}>{statusCopy.badge}</span>
                  <h2 className="mt-3 text-xl font-black">{t("guaranteeTitle")}</h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#52617b]">{statusCopy.body}</p>
                </div>
              </div>

              {stage === "survey" ? (
                <SurveyPanel selected={selected} setSelected={setSelected} comment={comment} setComment={setComment} onContinue={continueToConfirmation} t={t} />
              ) : (canRefund || canCancelRenewal) ? (
                <ConfirmationPanel
                  isRefund={Boolean(canRefund)}
                  alreadyRefunded={guarantee.data?.reason === "already_refunded"}
                  confirmed={confirmed}
                  setConfirmed={setConfirmed}
                  pending={isFinalPending}
                  error={finalError}
                  onSubmit={submitFinalAction}
                  onBack={() => setStage("survey")}
                  t={t}
                />
              ) : (
                <button type="button" onClick={() => navigate("/settings")} className="w-full rounded-2xl bg-[#061a3a] px-5 py-4 text-sm font-black text-white transition active:scale-[.98]">{t("settingsButton")}</button>
              )}
            </>
          )}
        </div>

        <aside className="rounded-[1.75rem] bg-[#061a3a] p-5 text-white shadow-[0_18px_55px_rgba(6,26,58,.18)] sm:p-7 lg:self-start">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4A017] text-[#061a3a]"><ShieldCheck size={22} /></div>
            <h2 className="text-lg font-black">{t("refundIncludesTitle")}</h2>
          </div>
          <div className="space-y-4">
            {[t("refundIncludesOne"), t("refundIncludesTwo"), t("refundIncludesThree")].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4A017] text-[#061a3a]"><Check size={13} strokeWidth={3} /></span>
                <p className="text-sm font-semibold leading-relaxed text-white/80">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-bold text-white/60"><LockKeyhole size={14} className="text-[#D4A017]" />{t("stripeVerified")}</div>
        </aside>
      </section>
    </main>
  );
}

function SurveyPanel({ selected, setSelected, comment, setComment, onContinue, t }: any) {
  return (
    <div className="border-t border-slate-100 pt-6">
      <h3 className="mb-4 text-base font-black">{t("surveyTitle")}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {REASONS.map((reason) => (
          <button
            type="button"
            key={reason.value}
            onClick={() => setSelected(reason.value)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${selected === reason.value ? "border-[#D4A017] bg-[#fff8df] text-[#061a3a]" : "border-slate-200 bg-white text-[#52617b] hover:border-slate-300"}`}
          >
            {t(reason.translationKey)}
            {selected === reason.value && <CheckCircle2 size={17} className="text-[#b8860b]" />}
          </button>
        ))}
      </div>
      <label className="mt-5 block text-xs font-black uppercase tracking-wider text-[#52617b]">{t("commentLabel")}</label>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("commentPlaceholder")} rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-[#061a3a] outline-none transition focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20" />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onContinue} className="rounded-xl bg-[#061a3a] px-5 py-3.5 text-sm font-black text-white transition active:scale-[.98]">{t("continue")}</button>
        <button type="button" onClick={onContinue} className="rounded-xl px-5 py-3.5 text-sm font-bold text-[#52617b] transition hover:bg-slate-50">{t("skipSurvey")}</button>
      </div>
    </div>
  );
}

function ConfirmationPanel({ isRefund, alreadyRefunded, confirmed, setConfirmed, pending, error, onSubmit, onBack, t }: any) {
  return (
    <div className="border-t border-slate-100 pt-6">
      <div className={`rounded-2xl border p-4 ${isRefund ? "border-[#D4A017]/45 bg-[#fff9e8]" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start gap-3">
          {isRefund ? <CircleDollarSign size={22} className="mt-0.5 shrink-0 text-[#9a7000]" /> : <CalendarClock size={22} className="mt-0.5 shrink-0 text-amber-700" />}
          <div>
            <h3 className="font-black">{isRefund ? t("confirmRefundTitle") : t("renewalTitle")}</h3>
            <p className="mt-1 text-sm font-medium leading-relaxed text-[#52617b]">{isRefund ? t("confirmRefundNotice") : t("renewalText")}</p>
          </div>
        </div>
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#061a3a]" />
        <span className="text-sm font-bold leading-relaxed text-[#31415f]">{isRefund ? t("confirmRefundCheckbox") : t("confirmRenewalCheckbox")}</span>
      </label>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{isRefund ? t("refundError") : t("cancelError")} <span className="font-medium">{error}</span></p>}
      <button type="button" disabled={!confirmed || pending} onClick={onSubmit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#061a3a] px-5 py-4 text-sm font-black text-white transition enabled:active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45">
        {pending && <Loader2 size={17} className="animate-spin" />}
        {pending ? (isRefund ? t("processingRefund") : t("processingCancellation")) : isRefund ? (alreadyRefunded ? t("finishCancellationButton") : t("refundButton")) : t("cancelRenewalButton")}
      </button>
      <button type="button" onClick={onBack} disabled={pending} className="mt-2 w-full rounded-xl px-5 py-3 text-sm font-bold text-[#52617b] transition hover:bg-slate-50">{t("stayButton")}</button>
    </div>
  );
}

function SuccessPanel({ kind, amount, accessEndsAt, onDone, t }: any) {
  const isRenewal = kind === "renewal";
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={34} /></div>
      <h2 className="mt-5 text-2xl font-black">{isRenewal ? t("renewalSuccessTitle") : t("refundSuccessTitle")}</h2>
      <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-[#52617b]">{isRenewal ? t("renewalSuccessBody", { date: accessEndsAt }) : kind === "already_refunded" ? t("alreadyRefundedSuccessBody") : t("refundSuccessBody", { amount })}</p>
      <button type="button" onClick={onDone} className="mt-7 rounded-xl bg-[#061a3a] px-6 py-3.5 text-sm font-black text-white transition active:scale-[.98]">{t("settingsButton")}</button>
    </div>
  );
}
