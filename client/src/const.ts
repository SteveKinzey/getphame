export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Direct Google OAuth login — no Manus portal.
// All "login" redirects go to /onboarding which shows the Google + Apple sign-in buttons.
export const getLoginUrl = (_returnPath?: string) => '/onboarding';
