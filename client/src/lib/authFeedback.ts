export const GOOGLE_SIGN_IN_PENDING_KEY = "getphame:google-sign-in-pending";
export const GOOGLE_SIGN_IN_TOAST_ID = "getphame-google-sign-in";

export type MagicLinkRecoveryKind = "expired" | "invalid" | "failed" | null;

export function getMagicLinkRecoveryKind(code: string): MagicLinkRecoveryKind {
  if (code === "link_expired" || code === "magic_link_expired") return "expired";
  if (code === "invalid_link" || code === "invalid_magic_link") return "invalid";
  if (code === "verification_failed") return "failed";
  return null;
}

const AUTH_ERROR_TRANSLATION_KEYS: Record<string, string> = {
  denied: "login.signInCancelled",
  google_denied: "authFeedback.errors.googleDenied",
  google_failed: "authFeedback.errors.googleFailed",
  google_missing_code: "authFeedback.errors.googleMissingCode",
  google_state_mismatch: "authFeedback.errors.googleStateMismatch",
  google_no_id: "authFeedback.errors.googleNoId",
  apple_authorization_failed: "login.appleSignInFailed",
  apple_failed: "login.appleSignInFailed",
  apple_missing_code: "login.appleSignInFailed",
  apple_missing_token: "login.appleSignInFailed",
  apple_token_exchange_failed: "login.appleSignInFailed",
  apple_state_mismatch: "login.appleSignInFailed",
  invalid_link: "login.invalidMagicLink",
  link_expired: "login.magicLinkExpired",
  magic_link_expired: "login.magicLinkExpired",
  invalid_magic_link: "login.invalidMagicLink",
  service_unavailable: "login.serviceUnavailable",
  verification_failed: "login.verificationFailed",
  disposable_email: "authFeedback.errors.disposableEmail",
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: "Sign-in was cancelled. Please try again.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  google_missing_code: "Google did not return the information needed to sign you in. Please try again.",
  google_state_mismatch: "Google sign-in security check failed. Please try again.",
  google_no_id: "Google sign-in could not verify your account. Please try again.",
  apple_authorization_failed: "Apple sign-in was cancelled or could not be completed.",
  apple_failed: "Apple sign-in failed. Please try again.",
  apple_missing_code: "Apple did not return the information needed to sign you in. Please try again.",
  apple_missing_token: "Apple sign-in failed. Please try again.",
  apple_token_exchange_failed: "Apple sign-in could not be completed. Please try again.",
  apple_state_mismatch: "Apple sign-in security check failed. Please try again.",
  invalid_link: "Invalid login link. Please request a new one.",
  link_expired: "This login link has expired. Please request a new one.",
  magic_link_expired: "That sign-in link has expired. Please request a new one.",
  invalid_magic_link: "Invalid or already-used sign-in link. Please request a new one.",
  service_unavailable: "Service temporarily unavailable. Please try again.",
  verification_failed: "Verification failed. Please request a new link.",
  disposable_email: "Please use a non-disposable email address to create your account.",
};

export function getAuthErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again or contact support.";
}

export function getLocalizedAuthErrorMessage(
  code: string,
  translate: (key: string, options: { defaultValue: string }) => unknown,
): string {
  const fallback = getAuthErrorMessage(code);
  const translationKey = AUTH_ERROR_TRANSLATION_KEYS[code];

  return translationKey
    ? String(translate(translationKey, { defaultValue: fallback }))
    : fallback;
}

export function rememberGoogleSignInPending(): void {
  try {
    window.sessionStorage.setItem(GOOGLE_SIGN_IN_PENDING_KEY, "1");
  } catch {
    // The in-memory loading state still prevents duplicate clicks when storage is blocked.
  }
}

export function clearGoogleSignInPending(): void {
  try {
    window.sessionStorage.removeItem(GOOGLE_SIGN_IN_PENDING_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function hasGoogleSignInPending(): boolean {
  try {
    return window.sessionStorage.getItem(GOOGLE_SIGN_IN_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}
