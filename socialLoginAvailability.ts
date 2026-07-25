const STAGING_HOST_SUFFIX = ".manus.computer";
const PRODUCTION_SOCIAL_LOGIN_HOSTS = new Set(["getphame.app", "www.getphame.app"]);

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase();
}

/**
 * Local and preview environments remain available for both social providers.
 */
export function isStagingSocialLoginHost(hostname: string): boolean {
  const normalizedHost = normalizeHost(hostname);

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "::1" ||
    normalizedHost.endsWith(STAGING_HOST_SUFFIX)
  );
}

/**
 * Google OAuth is available in local/preview environments and on the approved
 * Get Phame custom domains. Other published hosts continue to use magic links.
 */
export function isGoogleSignInHost(hostname: string): boolean {
  const normalizedHost = normalizeHost(hostname);

  return isStagingSocialLoginHost(normalizedHost) || PRODUCTION_SOCIAL_LOGIN_HOSTS.has(normalizedHost);
}

/**
 * Apple Sign-In is enabled on the same approved local, preview, and custom
 * production hosts as Google OAuth. The server remains responsible for
 * validating the Apple OAuth callback and client configuration.
 */
export function isAppleSignInHost(hostname: string): boolean {
  const normalizedHost = normalizeHost(hostname);

  return isStagingSocialLoginHost(normalizedHost) || PRODUCTION_SOCIAL_LOGIN_HOSTS.has(normalizedHost);
}
