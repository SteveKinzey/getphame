import { useEffect, useRef, useState } from "react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
} from "@simplewebauthn/browser";
import { KeyRound, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import AddPasskeyModal from "@/components/security/AddPasskeyModal";
import {
  isPasskeyEnrollmentRequiredError,
  isPasskeyEnrollmentReturnError,
  readPasskeyEnrollmentEmail,
  rememberPasskeyEnrollmentEmail,
  type PasskeyEnrollmentReturnError,
} from "@/lib/passkeyEnrollment";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PasskeySignIn({
  redirectTo = "/",
}: {
  redirectTo?: string;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [enrollmentEmail, setEnrollmentEmail] = useState(() =>
    readPasskeyEnrollmentEmail()
  );
  const [enrollmentOpen, setEnrollmentOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("passkey_enroll") === "1" &&
      Boolean(readPasskeyEnrollmentEmail())
    );
  });
  const [verificationError] = useState<PasskeyEnrollmentReturnError | null>(
    () => {
      const value = new URLSearchParams(window.location.search).get(
        "auth_error"
      );
      return isPasskeyEnrollmentReturnError(value) ? value : null;
    }
  );
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const beginAuthentication = trpc.passkeys.beginAuthentication.useMutation();
  const finishAuthentication = trpc.passkeys.finishAuthentication.useMutation();
  const supported = browserSupportsWebAuthn();
  const pending =
    beginAuthentication.isPending || finishAuthentication.isPending;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passkey_enroll") !== "1") return;
    params.delete("passkey_enroll");
    params.delete("auth_error");
    const nextSearch = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`
    );
  }, []);

  function openEnrollment(normalizedEmail: string) {
    rememberPasskeyEnrollmentEmail(normalizedEmail);
    setEnrollmentEmail(normalizedEmail);
    setEnrollmentOpen(true);
    setStatus(null);
  }

  function handleEnrollmentOpenChange(nextOpen: boolean) {
    setEnrollmentOpen(nextOpen);
    if (!nextOpen)
      window.requestAnimationFrame(() => submitButtonRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setStatus(null);
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(
        t("passkeys.signIn.invalidEmail", {
          defaultValue: "Enter a valid email address.",
        })
      );
      return;
    }
    try {
      setStatus(
        t("passkeys.signIn.preparing", {
          defaultValue: "Preparing your secure passkey prompt…",
        })
      );
      const ceremony = await beginAuthentication.mutateAsync({
        email: normalizedEmail,
      });
      if (ceremony.state === "enrollment_required") {
        openEnrollment(normalizedEmail);
        return;
      }
      const response = await startAuthentication({
        optionsJSON: ceremony.options,
      });
      setStatus(
        t("passkeys.signIn.verifying", {
          defaultValue: "Verifying your passkey…",
        })
      );
      await finishAuthentication.mutateAsync({
        ceremonyId: ceremony.ceremonyId,
        response,
      });
      window.location.assign(redirectTo);
    } catch (caught) {
      if (isPasskeyEnrollmentRequiredError(caught)) {
        openEnrollment(normalizedEmail);
        return;
      }
      setStatus(null);
      setError(
        t("passkeys.signIn.unavailable", {
          defaultValue:
            "Passkey sign-in could not be completed. Try Magic Link or another available sign-in method, or try again.",
        })
      );
    }
  }

  return (
    <>
      <AddPasskeyModal
        open={enrollmentOpen}
        email={enrollmentEmail}
        onOpenChange={handleEnrollmentOpenChange}
        verificationError={verificationError}
      />
      {!supported ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          {t("passkeys.signIn.unsupported", {
            defaultValue:
              "Passkeys are not available in this browser. You can still sign in with a secure email link.",
          })}
        </div>
      ) : (
        <section aria-labelledby="passkey-sign-in-title">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound size={19} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="passkey-sign-in-title"
                className="text-sm font-bold text-white"
              >
                {t("passkeys.signIn.title", {
                  defaultValue: "Sign in with a passkey",
                })}
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">
                {t("passkeys.signIn.description", {
                  defaultValue:
                    "Use the fingerprint, face recognition, or screen lock already set up on your device.",
                })}
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <label
                htmlFor="passkey-email"
                className="mb-1.5 block text-xs font-medium text-white/70"
              >
                {t("passkeys.signIn.emailLabel", {
                  defaultValue: "Account email",
                })}
              </label>
              <input
                id="passkey-email"
                type="email"
                autoComplete="username webauthn"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder={t("passkeys.signIn.emailPlaceholder", {
                  defaultValue: "you@example.com",
                })}
                disabled={pending}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error
                    ? "passkey-sign-in-error"
                    : status
                      ? "passkey-sign-in-status"
                      : undefined
                }
                className="w-full rounded-xl border border-[#2a3a5c] bg-[#1a2744] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary/70 focus:ring-2 focus:ring-primary/25 disabled:opacity-60"
              />
            </div>
            {error && (
              <p
                id="passkey-sign-in-error"
                role="alert"
                className="text-sm font-semibold text-red-300"
              >
                {error}
              </p>
            )}
            {status && (
              <p
                id="passkey-sign-in-status"
                role="status"
                aria-live="polite"
                className="text-sm font-semibold text-white/70"
              >
                {status}
              </p>
            )}
            <button
              ref={submitButtonRef}
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <KeyRound size={18} aria-hidden="true" />
              )}
              {pending
                ? t("passkeys.signIn.inProgress", {
                    defaultValue: "Checking passkey…",
                  })
                : t("passkeys.signIn.button", {
                    defaultValue: "Continue with passkey",
                  })}
            </button>
          </form>
        </section>
      )}
    </>
  );
}
