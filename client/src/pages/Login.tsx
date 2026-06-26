/**
 * Login.tsx — GetPhame authentication page (Magic Link)
 *
 * Displays three auth options:
 *   1. Continue with Google  (hidden if GOOGLE_CLIENT_ID not configured)
 *   2. Continue with Apple
 *   3. Email magic link — enter email, receive login link
 *
 * Design: navy (#0F1B2D) + gold (#C9A84C) theme, mobile-first, responsive.
 */
import React, { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleStatusResponse {
  enabled: boolean;
}

interface MagicLinkResponse {
  ok?: boolean;
  error?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// SVG Icons (inline — no extra icon package needed)
// ---------------------------------------------------------------------------

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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

const OrDivider = () => (
  <div className="relative my-6">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-white/10" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-3 bg-[#0F1B2D] text-white/40 font-medium tracking-wide">or</span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Login() {
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null); // shows success state

  // Check if Google OAuth is configured on the server
  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((r) => r.json() as Promise<GoogleStatusResponse>)
      .then((data) => setGoogleEnabled(data.enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  // Check for auth errors in the URL (e.g. /login?auth_error=link_expired)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      const messages: Record<string, string> = {
        google_denied: "Google sign-in was cancelled.",
        google_failed: "Google sign-in failed. Please try again.",
        google_state_mismatch: "Security check failed. Please try again.",
        apple_failed: "Apple sign-in failed. Please try again.",
        apple_missing_token: "Apple sign-in failed. Please try again.",
        invalid_link: "Invalid login link. Please request a new one.",
        link_expired: "This login link has expired. Please request a new one.",
        service_unavailable: "Service temporarily unavailable. Please try again.",
        verification_failed: "Verification failed. Please request a new link.",
      };
      setFormError(messages[authError] ?? "Sign-in failed. Please try again.");
      // Clean the URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleMagicLinkSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setSentTo(null);

      if (!email.trim()) {
        setFormError("Email is required.");
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = (await res.json()) as MagicLinkResponse;

        if (!res.ok) {
          setFormError(data.error ?? "Something went wrong. Please try again.");
          return;
        }

        // Success — show confirmation
        setSentTo(data.email ?? email.trim());
      } catch {
        setFormError("Network error. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0F1B2D] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Wordmark */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Get<span className="text-[#C9A84C]">Phame</span>
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Sign in to your account
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* ── OAuth Buttons ─────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Google — only rendered when configured */}
          {googleEnabled === true && (
            <a
              href="/api/auth/google"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold text-sm transition-colors duration-150 shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </a>
          )}

          {/* Google placeholder while loading */}
          {googleEnabled === null && (
            <div className="h-12 w-full rounded-xl bg-white/5 animate-pulse" />
          )}

          {/* Apple */}
          <a
            href="/api/auth/apple"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-black hover:bg-gray-900 active:bg-gray-800 text-white font-semibold text-sm transition-colors duration-150 shadow-sm border border-white/10"
          >
            <AppleIcon />
            Continue with Apple
          </a>
        </div>

        <OrDivider />

        {/* ── Magic Link Form ──────────────────────────────────────────── */}
        {sentTo ? (
          /* Success state — email sent */
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#C9A84C]/10 mb-4">
              <MailIcon />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Check your inbox</h2>
            <p className="text-sm text-white/50 mb-4">
              We sent a login link to
            </p>
            <p className="text-sm font-medium text-[#C9A84C] mb-6">{sentTo}</p>
            <p className="text-xs text-white/30 mb-4">
              The link expires in 15 minutes. Check your spam folder if you don't see it.
            </p>
            <button
              type="button"
              onClick={() => { setSentTo(null); setEmail(""); }}
              className="text-sm text-white/40 hover:text-white/60 underline transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Email input form */
          <form onSubmit={handleMagicLinkSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-white/60 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/60 focus:border-[#C9A84C]/60 transition"
              />
            </div>

            {/* Error message */}
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{formError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#C9A84C] hover:bg-[#b8943d] active:bg-[#a8843a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0F1B2D] font-bold text-sm transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Sending link…
                </>
              ) : (
                "Send Magic Link"
              )}
            </button>

            <p className="text-center text-xs text-white/30">
              No password needed — we'll email you a secure login link.
            </p>
          </form>
        )}

        {/* ── Legal ─────────────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-white/25 leading-relaxed">
          By continuing, you agree to our{" "}
          <a href="/terms-of-service" className="underline hover:text-white/50 transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="underline hover:text-white/50 transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
