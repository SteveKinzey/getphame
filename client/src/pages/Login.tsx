/**
 * Login.tsx — GetPhame authentication page (Magic Link)
 *
 * Production displays email magic-link authentication alongside Google on the
 * approved Get Phame custom domains. Apple remains staged to preview hosts.
 *
 * Design: navy (#0F1B2D) + gold (#C9A84C) theme, mobile-first, responsive.
 */
import React, { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import {
  isGoogleSignInHost,
  isStagingSocialLoginHost,
} from "@/lib/socialLoginAvailability";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  GOOGLE_SIGN_IN_TOAST_ID,
  clearGoogleSignInPending,
  getMagicLinkRecoveryKind,
  getLocalizedAuthErrorMessage,
  type MagicLinkRecoveryKind,
  rememberGoogleSignInPending,
} from "@/lib/authFeedback";
import PasskeySignIn from "@/components/security/PasskeySignIn";
import MagicLinkForm from "@/components/auth/MagicLinkForm";
import HumanVerification from "@/components/auth/HumanVerification";
import { AlertTriangle } from "lucide-react";
import { isPasskeyEnrollmentReturnError } from "@/lib/passkeyEnrollment";
import { useUpdateCriticalActivity } from "@/contexts/UpdateSafetyContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  appendAuthReturnPath,
  getSafeAuthReturnPath,
} from "@shared/authReturnPath";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleStatusResponse {
  enabled: boolean;
}

const GOOGLE_REDIRECT_FEEDBACK_MS = 420;
const GOOGLE_REDIRECT_STATUS_MS = 140;

// ---------------------------------------------------------------------------
// SVG Icons (inline — no extra icon package needed)
// ---------------------------------------------------------------------------

const GoogleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const MailIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

const OrDivider = ({ label }: { label: string }) => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-white/10" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-3 bg-[#0F1B2D] text-white/40 font-medium tracking-wide">
        {label}
      </span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Login() {
  const { t } = useTranslation("translation");
  const { user, loading: authLoading } = useAuth();
  const returnPath = getSafeAuthReturnPath(
    new URLSearchParams(window.location.search).get("returnTo")
  );
  const googleLoginEnabled = isGoogleSignInHost(window.location.hostname);
  const appleLoginEnabled = isStagingSocialLoginHost(window.location.hostname);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const shouldShowSocialSection =
    appleLoginEnabled || (googleLoginEnabled && googleEnabled !== false);

  // Form state
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [magicLinkRecovery, setMagicLinkRecovery] =
    useState<MagicLinkRecoveryKind>(null);
  const [humanVerificationToken, setHumanVerificationToken] = useState<
    string | null
  >(null);
  useUpdateCriticalActivity(
    "login-provider-redirect",
    isGoogleSubmitting || isAppleSubmitting,
  );

  // Check if Google OAuth is configured on the server
  useEffect(() => {
    if (!googleLoginEnabled) {
      setGoogleEnabled(false);
      return;
    }

    fetch("/api/auth/google/status")
      .then(r => r.json() as Promise<GoogleStatusResponse>)
      .then(data => setGoogleEnabled(data.enabled))
      .catch(() => setGoogleEnabled(false));
  }, [googleLoginEnabled]);

  // Check for auth errors in the URL (e.g. /login?auth_error=link_expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      clearGoogleSignInPending();
      if (isPasskeyEnrollmentReturnError(authError)) {
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      const recoveryKind = getMagicLinkRecoveryKind(authError);

      if (recoveryKind) {
        setMagicLinkRecovery(recoveryKind);
        setFormError(null);
      } else {
        const message = getLocalizedAuthErrorMessage(authError, t);
        setFormError(message);
        toast.error(message, { id: GOOGLE_SIGN_IN_TOAST_ID });
      }
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading || !user) return;
    window.location.replace(returnPath ?? "/");
  }, [authLoading, returnPath, user]);

  const createVerifiedProviderUrl = useCallback(
    async (provider: "google" | "apple") => {
      const authPath = `/api/auth/${provider}`;
      if (!humanVerificationToken) {
        return appendAuthReturnPath(authPath, returnPath);
      }
      const response = await fetch(
        appendAuthReturnPath(`${authPath}/start`, returnPath),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: humanVerificationToken }),
        }
      );
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(
          data.error ?? "Secure sign-in could not be started. Please try again."
        );
      }
      return data.url;
    },
    [humanVerificationToken, returnPath]
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (isGoogleSubmitting) return;

    flushSync(() => {
      setFormError(null);
      setIsGoogleSubmitting(true);
      setGoogleStatus(
        t("authFeedback.preparingGoogle", {
          defaultValue: "Preparing a secure Google sign-in…",
        })
      );
    });
    rememberGoogleSignInPending();
    toast.loading(
      t("authFeedback.openingGoogle", {
        defaultValue: "Opening Google sign-in…",
      }),
      {
        id: GOOGLE_SIGN_IN_TOAST_ID,
      }
    );

    try {
      const destination = await createVerifiedProviderUrl("google");
      window.setTimeout(() => {
        setGoogleStatus(
          t("authFeedback.redirectingGoogle", {
            defaultValue: "Redirecting to Google. Keep this tab open.",
          })
        );
      }, GOOGLE_REDIRECT_STATUS_MS);
      window.setTimeout(() => {
        window.location.assign(destination);
      }, GOOGLE_REDIRECT_FEEDBACK_MS);
    } catch {
      clearGoogleSignInPending();
      setIsGoogleSubmitting(false);
      setGoogleStatus(null);
      toast.error(
        t("authFeedback.googleOpenFailed", {
          defaultValue: "Google sign-in could not be opened. Please try again.",
        }),
        {
          id: GOOGLE_SIGN_IN_TOAST_ID,
        }
      );
    }
  }, [createVerifiedProviderUrl, isGoogleSubmitting, t]);

  const handleAppleSignIn = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (isAppleSubmitting) return;
      setFormError(null);
      setIsAppleSubmitting(true);
      try {
        window.location.assign(await createVerifiedProviderUrl("apple"));
      } catch {
        setIsAppleSubmitting(false);
        setFormError(
          t("login.appleSignInFailed", {
            defaultValue: "Apple sign-in failed. Please try again.",
          })
        );
      }
    },
    [createVerifiedProviderUrl, isAppleSubmitting, t]
  );

  const recoveryCopy =
    magicLinkRecovery === "expired"
      ? {
          title: t("login.expiredMagicLinkTitle", {
            defaultValue: "This sign-in link has expired",
          }),
          description: t("login.expiredMagicLinkDescription", {
            defaultValue:
              "For your security, sign-in links are valid for 15 minutes.",
          }),
        }
      : magicLinkRecovery === "invalid"
        ? {
            title: t("login.invalidMagicLinkTitle", {
              defaultValue: "This sign-in link is no longer valid",
            }),
            description: t("login.invalidMagicLinkDescription", {
              defaultValue:
                "The link may have already been used or may be incomplete.",
            }),
          }
        : magicLinkRecovery === "failed"
          ? {
              title: t("login.verificationProblemTitle", {
                defaultValue: "We couldn't verify this link",
              }),
              description: t("login.verificationProblemDescription", {
                defaultValue:
                  "Something interrupted verification. Request a fresh link to continue.",
              }),
            }
          : null;

  if (authLoading || user) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-[#0F1B2D] text-white"
        role="status"
        aria-live="polite"
      >
        {t("login.subtitle", { defaultValue: "Sign in to your account" })}
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Wordmark */}
      <div className="mb-8 text-center">
        <h1
          className="text-3xl font-black tracking-tight text-white"
          aria-label="Get Phame"
        >
          GET <span className="text-[#C9A84C]">PHAME</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {t("login.subtitle", { defaultValue: "Sign in to your account" })}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {recoveryCopy ? (
          <section
            data-testid="magic-link-recovery"
            role="alert"
            aria-labelledby="magic-link-recovery-title"
            className="rounded-2xl border border-amber-300/25 bg-white/[0.04] p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-300/10 text-[#C9A84C]">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2
              id="magic-link-recovery-title"
              className="mb-3 text-xl font-bold text-white"
            >
              {recoveryCopy.title}
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-white/70">
              {recoveryCopy.description}
            </p>
            <p className="mb-6 text-sm leading-relaxed text-white/55">
              {t("login.magicLinkRecoveryHelp", {
                defaultValue:
                  "Use the same email address and we'll send you a fresh secure link.",
              })}
            </p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setMagicLinkRecovery(null);
                setFormError(null);
              }}
              className="min-h-12 w-full rounded-xl bg-[#C9A84C] px-4 py-3 text-sm font-bold text-[#0F1B2D] transition-[background-color,transform] duration-150 hover:bg-[#b8943d] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {t("login.requestNewLink", {
                defaultValue: "Request a New Link",
              })}
            </button>
            <a
              href="mailto:support@getphame.app"
              className="mt-4 inline-flex min-h-11 items-center px-3 text-sm font-semibold text-white/60 underline underline-offset-4 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]"
            >
              {t("login.contactSupport", { defaultValue: "Contact support" })}
            </a>
          </section>
        ) : (
          <>
            {formError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{formError}</span>
              </div>
            )}
            <HumanVerification onTokenChange={setHumanVerificationToken} />
            <MagicLinkForm
              idPrefix="login"
              autoFocus
              humanVerificationToken={humanVerificationToken}
              returnPath={returnPath}
            />
            {shouldShowSocialSection && (
              <>
                <OrDivider label={t("login.or", { defaultValue: "or" })} />
                {/* ── Google + staged Apple OAuth Buttons ───────────────────── */}
                <div className="space-y-3" data-testid="social-login">
                  {/* Google — rendered only on an approved host when configured */}
                  {googleLoginEnabled && googleEnabled === true && (
                    <div>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleSubmitting}
                        aria-busy={isGoogleSubmitting}
                        aria-describedby={
                          isGoogleSubmitting ? "google-auth-status" : undefined
                        }
                        className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 disabled:cursor-wait disabled:bg-gray-100 disabled:text-gray-500 text-gray-800 font-semibold text-sm transition-[background-color,color,transform] duration-150 shadow-sm active:scale-[0.98]"
                      >
                        {isGoogleSubmitting ? <Spinner /> : <GoogleIcon />}
                        {isGoogleSubmitting
                          ? t("authFeedback.connectingGoogle", {
                              defaultValue: "Connecting to Google…",
                            })
                          : t("login.continueWithGoogle", {
                              defaultValue: "Continue with Google",
                            })}
                      </button>
                      {isGoogleSubmitting && googleStatus && (
                        <p
                          id="google-auth-status"
                          role="status"
                          aria-live="polite"
                          className="mt-2 text-center text-xs font-semibold text-white/70"
                        >
                          {googleStatus}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Google placeholder while loading */}
                  {googleLoginEnabled && googleEnabled === null && (
                    <div className="h-12 w-full rounded-xl bg-white/5 animate-pulse" />
                  )}

                  {appleLoginEnabled && (
                    <button
                      type="button"
                      onClick={handleAppleSignIn}
                      disabled={isAppleSubmitting}
                      aria-busy={isAppleSubmitting}
                      className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-black hover:bg-gray-900 active:bg-gray-800 disabled:cursor-wait disabled:text-white/60 text-white font-semibold text-sm transition-colors duration-150 shadow-sm border border-white/10"
                    >
                      {isAppleSubmitting ? <Spinner /> : <AppleIcon />}
                      {t("login.continueWithApple", {
                        defaultValue: "Continue with Apple",
                      })}
                    </button>
                  )}
                </div>
              </>
            )}
            <OrDivider
              label={t("passkeys.signIn.orAlternative", {
                defaultValue: "or use another sign-in method",
              })}
            />
            <PasskeySignIn />
          </>
        )}

        {/* ── Legal ─────────────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-white/25 leading-relaxed">
          {t("login.termsPrefix", {
            defaultValue: "By continuing, you agree to our",
          })}{" "}
          <a
            href="/terms-of-service"
            className="underline hover:text-white/50 transition-colors"
          >
            {t("login.terms", { defaultValue: "Terms of Service" })}
          </a>{" "}
          {t("login.consentAnd", { defaultValue: "and" })}{" "}
          <a
            href="/privacy-policy"
            className="underline hover:text-white/50 transition-colors"
          >
            {t("login.privacy", { defaultValue: "Privacy Policy" })}
          </a>
          {t("login.consentSuffix", { defaultValue: "." })}
        </p>
      </div>
    </div>
  );
}
