import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useUpdateCriticalActivity,
  useUpdateDirtySource,
} from "@/contexts/UpdateSafetyContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAGIC_LINK_RESEND_COOLDOWN_SECONDS = 60;

type RequestState = "idle" | "sending" | "sent" | "resending";

interface MagicLinkResponse {
  ok?: boolean;
  email?: string;
}

type MagicLinkRequestResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

interface MagicLinkFormProps {
  idPrefix: string;
  autoFocus?: boolean;
  onCancel?: () => void;
  initialEmail?: string;
  lockEmail?: boolean;
  intent?: "enroll_passkey";
  humanVerificationToken?: string | null;
  returnPath?: string | null;
}

export default function MagicLinkForm({
  idPrefix,
  autoFocus = false,
  onCancel,
  initialEmail = "",
  lockEmail = false,
  intent,
  humanVerificationToken,
  returnPath = null,
}: MagicLinkFormProps) {
  const { t } = useTranslation("translation");
  const [email, setEmail] = useState(() => initialEmail.trim().toLowerCase());
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  const isSending = requestState === "sending";
  const isResending = requestState === "resending";
  const initialEmailValue = initialEmail.trim().toLowerCase();
  useUpdateDirtySource(
    `${idPrefix}-magic-link-email`,
    !lockEmail && !sentTo && email !== initialEmailValue,
  );
  useUpdateCriticalActivity(
    `${idPrefix}-magic-link-request`,
    isSending || isResending || Boolean(sentTo),
  );
  const canResend = Boolean(sentTo) && resendSeconds === 0 && !isResending;
  const timerId = `${idPrefix}-magic-link-resend-timer`;
  const sendingStatusId = `${idPrefix}-magic-link-sending-status`;

  useEffect(() => {
    if (!sentTo || resendSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearTimeout(timer);
  }, [resendSeconds, sentTo]);

  const requestMagicLink = useCallback(async (candidateEmail: string): Promise<MagicLinkRequestResult> => {
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: candidateEmail,
          origin: window.location.origin,
          ...(returnPath ? { returnTo: returnPath } : {}),
          ...(intent ? { intent } : {}),
          ...(humanVerificationToken ? { humanVerificationToken } : {}),
        }),
      });

      const data = (await response.json()) as MagicLinkResponse;
      if (!response.ok || !data.ok) {
        const fallback = response.status === 429
          ? t("login.rateLimited", { defaultValue: "Too many attempts. Please wait a few minutes and try again." })
          : response.status === 503
            ? t("login.serviceUnavailable", { defaultValue: "Service is temporarily unavailable. Please try again." })
            : response.status === 400
              ? t("login.invalidEmail", { defaultValue: "Enter a valid email address." })
              : t("login.magicLinkFailed", { defaultValue: "We could not send your magic link. Please try again." });

        return { ok: false, error: fallback };
      }

      return { ok: true, email: data.email ?? candidateEmail };
    } catch {
      return {
        ok: false,
        error: t("login.networkError", {
          defaultValue: "Network error. Please check your connection and try again.",
        }),
      };
    }
  }, [humanVerificationToken, intent, returnPath, t]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSending || isResending) return;

    setError(null);
    setResendNotice(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t("login.emailRequired", { defaultValue: "Email is required." }));
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(t("login.invalidEmail", { defaultValue: "Enter a valid email address." }));
      return;
    }

    setRequestState("sending");
    const result = await requestMagicLink(normalizedEmail);

    if (!result.ok) {
      setError(result.error);
      setRequestState("idle");
      return;
    }

    setEmail(result.email);
    setSentTo(result.email);
    setResendSeconds(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);
    setRequestState("sent");
  }, [email, isResending, isSending, requestMagicLink, t]);

  const handleResend = useCallback(async () => {
    if (!sentTo || !canResend) return;

    setError(null);
    setResendNotice(null);
    setRequestState("resending");
    const result = await requestMagicLink(sentTo);

    if (!result.ok) {
      setError(result.error);
      setRequestState("sent");
      return;
    }

    setEmail(result.email);
    setSentTo(result.email);
    setResendSeconds(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);
    setResendNotice(t("login.resendSuccess", { defaultValue: "A fresh sign-in link is on its way." }));
    setRequestState("sent");
  }, [canResend, requestMagicLink, sentTo, t]);

  const handleDifferentEmail = useCallback(() => {
    setEmail("");
    setSentTo(null);
    setRequestState("idle");
    setError(null);
    setResendNotice(null);
    setResendSeconds(0);
  }, []);

  if (sentTo) {
    return (
      <section data-testid="magic-link-confirmation" className="text-center py-4">
        <div role="status" aria-live="polite" aria-atomic="true">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] mb-4">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            {t("login.checkInbox", { defaultValue: "Check your inbox" })}
          </h2>
          <p className="text-sm text-white/60 mb-2">
            {t("login.sentTo", { defaultValue: "We sent a login link to" })}
          </p>
          <p className="text-sm font-semibold text-[#C9A84C] break-all mb-5">{sentTo}</p>
          <p className="text-xs text-white/50 mb-5">
            {t("login.expiresNotice", {
              defaultValue: "The link expires in 15 minutes. Check your spam folder if you don't see it.",
            })}
          </p>
        </div>

        <p id={timerId} role="timer" aria-atomic="true" className="text-xs font-medium text-white/60 mb-3">
          {resendSeconds > 0
            ? t("login.resendCountdown", {
                defaultValue: "Resend available in {{seconds}} seconds.",
                seconds: resendSeconds,
              })
            : t("login.resendReady", { defaultValue: "You can request another link now." })}
        </p>
        <span className="sr-only" role="status" aria-live="polite">
          {resendSeconds === 0
            ? t("login.resendReady", { defaultValue: "You can request another link now." })
            : ""}
        </span>

        {resendNotice && (
          <p role="status" aria-live="polite" className="mb-3 text-sm font-semibold text-emerald-300">
            {resendNotice}
          </p>
        )}
        {error && (
          <div role="alert" className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          data-testid="magic-link-resend"
          onClick={handleResend}
          disabled={!canResend}
          aria-busy={isResending}
          aria-describedby={timerId}
          className="w-full min-h-11 rounded-xl border border-[#C9A84C]/40 px-4 py-2.5 text-sm font-bold text-[#C9A84C] transition-[background-color,color,transform] duration-150 hover:bg-[#C9A84C]/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/35 disabled:hover:bg-transparent"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isResending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isResending
              ? t("login.resendingLink", { defaultValue: "Resending link…" })
              : t("login.resendLink", { defaultValue: "Resend Link" })}
          </span>
        </button>

        <button
          type="button"
          onClick={handleDifferentEmail}
          className="mt-4 min-h-11 px-3 text-sm font-semibold text-white/60 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
        >
          {t("login.useDifferentEmail", { defaultValue: "Use a different email" })}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" data-testid="magic-link-form">
      <div>
        <label htmlFor={`${idPrefix}-email`} className="block text-xs font-semibold text-white/70 mb-1.5">
          {t("login.emailLabel", { defaultValue: "Email address" })}
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          autoComplete="email"
          autoFocus={autoFocus}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("login.emailPlaceholder", { defaultValue: "you@example.com" })}
          required
          disabled={isSending || lockEmail}
          readOnly={lockEmail}
          className="w-full min-h-12 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-base font-medium text-white placeholder:text-white/40 focus:border-[#C9A84C]/60 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/60 disabled:cursor-wait disabled:opacity-70"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSending}
        aria-busy={isSending}
        aria-describedby={isSending ? sendingStatusId : undefined}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-3 text-sm font-bold text-[#0F1B2D] transition-[background-color,transform] duration-150 hover:bg-[#b8943d] active:scale-[0.98] active:bg-[#a8843a] disabled:cursor-wait disabled:opacity-65"
      >
        {isSending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t("login.sendingMagicLink", { defaultValue: "Sending link…" })}
          </>
        ) : (
          <>
            <Mail className="h-5 w-5" aria-hidden="true" />
            {t("login.sendMagicLink", { defaultValue: "Send Magic Link" })}
          </>
        )}
      </button>

      {isSending && (
        <p id={sendingStatusId} role="status" aria-live="polite" className="text-center text-xs font-semibold text-white/70">
          {t("login.sendingMagicLinkStatus", {
            defaultValue: "Sending a secure sign-in link. Keep this page open.",
          })}
        </p>
      )}

      <p className="text-center text-xs text-white/45">
        {t("login.noPassword", { defaultValue: "No password needed — we'll email you a secure login link." })}
      </p>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full min-h-11 text-center text-sm font-semibold text-white/60 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
        >
          {t("common.cancel", { defaultValue: "Cancel" })}
        </button>
      )}
    </form>
  );
}
