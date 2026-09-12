export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = "Please login (10001)";
export const NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
export const UNPAID_ERR_MSG =
  "An active subscription is required to access this feature (10003)";
export const FREE_INITIAL_REQUESTS = 10;
export const FREE_ROLLING_REQUESTS = 5;
export const FREE_ROLLING_WINDOW_DAYS = 30;
// Backward-compatible alias for older UI code while the allowance has two phases.
export const FREE_LIMIT = FREE_INITIAL_REQUESTS;
export const FREE_LIMIT_ERR_MSG =
  "You have used your 5 free requests for this 30-day period. Upgrade to Pro now or send again when your rolling allowance refreshes. (10004)";

export const OAUTH_STATE_COOKIE = "__Host-oauth_state";

export type OAuthStatePayload = {
  redirectUri: string;
  nonce?: string;
};

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return btoa(JSON.stringify(payload));
}

/**
 * Decode attacker-controlled OAuth state without ever throwing. Invalid or
 * structurally malformed input fails closed by returning an empty redirect.
 */
export function decodeOAuthState(value: string): OAuthStatePayload {
  try {
    const parsed = JSON.parse(atob(value)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { redirectUri: "" };
    }

    const record = parsed as Record<string, unknown>;
    const redirectUri =
      typeof record.redirectUri === "string" ? record.redirectUri : "";
    const nonce = typeof record.nonce === "string" ? record.nonce : undefined;
    return nonce ? { redirectUri, nonce } : { redirectUri };
  } catch {
    return { redirectUri: "" };
  }
}
