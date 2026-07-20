const STAGING_HOST_SUFFIX = ".manus.computer";

/**
 * Social OAuth remains available only in local development and Manus preview
 * environments. Published custom and manus.space domains intentionally fall
 * back to email magic-link authentication while Apple and Google are refined.
 */
export function isStagingSocialLoginHost(hostname: string): boolean {
  const normalizedHost = hostname.trim().toLowerCase();

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost === "::1" ||
    normalizedHost.endsWith(STAGING_HOST_SUFFIX)
  );
}
