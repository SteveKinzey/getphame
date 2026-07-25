const STAGING_HOST_SUFFIX = ".manus.computer";
const PRODUCTION_GOOGLE_HOSTS = new Set(["getphame.app", "www.getphame.app"]);

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase();
}

/**
 * Apple OAuth remains limited to local development and Manus preview
 * environments until its production rollout is separately approved.
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

  return isStagingSocialLoginHost(normalizedHost) || PRODUCTION_GOOGLE_HOSTS.has(normalizedHost);
}
