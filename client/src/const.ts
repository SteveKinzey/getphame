export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Direct Google OAuth login — no Manus portal.
// All "login" redirects go to /onboarding which shows the Google + Apple sign-in buttons.
// Preserve an internal deep link so authenticated users return to the protected page
// they intentionally opened (for example, /admin/email-preview).
export const getLoginUrl = (returnPath?: string) => {
  if (!returnPath || !returnPath.startsWith("/") || returnPath.startsWith("//")) {
    return "/onboarding";
  }

  return `/onboarding?returnTo=${encodeURIComponent(returnPath)}`;
};
