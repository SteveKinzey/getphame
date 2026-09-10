const AUTH_RETURN_ORIGIN = "https://getphame.app";
const MAX_RETURN_PATH_LENGTH = 2_048;

/**
 * Accept only same-origin absolute paths. Authentication callbacks use this
 * value in Location headers, so external destinations must never be accepted.
 */
export function getSafeAuthReturnPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/")
  ) {
    return null;
  }

  try {
    const url = new URL(value, AUTH_RETURN_ORIGIN);
    if (url.origin !== AUTH_RETURN_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function appendAuthReturnPath(
  path: string,
  returnPath: string | null
): string {
  if (!returnPath) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}returnTo=${encodeURIComponent(returnPath)}`;
}
