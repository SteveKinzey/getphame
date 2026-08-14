export const DEPLOYMENT_VERSION_URL = "/__manus__/version.json";
export const APP_WORKER_CACHE_NAME = "getphame-v29";
export const VERSION_POLL_INTERVAL_MS = 60_000;
export const DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS = 10_000;
export const UPDATE_DEFER_DURATION_MS = 15 * 60_000;
export const UPDATE_RELOAD_GUARD_PREFIX = "getphame:update-reload:";
export const UPDATE_RELOAD_TARGET_STORAGE_KEY = "getphame:update-reload-target";

type VersionPayload = {
  version: string;
};

export type DeploymentVersionFetchOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidDeploymentVersionPayload(
  value: unknown
): value is VersionPayload {
  if (!isRecord(value) || typeof value.version !== "string") return false;

  const version = value.version.trim();
  return version.length > 0 && version.length <= 160;
}

export function buildDeploymentVersionUrl(now = Date.now()): string {
  return `${DEPLOYMENT_VERSION_URL}?_t=${encodeURIComponent(String(now))}`;
}

/**
 * Fetch the deployment version without relying on an HTTP or service-worker
 * cache. Failures intentionally return null so transient connectivity never
 * becomes a customer-facing update notice.
 */
export async function fetchDeploymentVersion(
  options: DeploymentVersionFetchOptions = {}
): Promise<string | null> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const timeoutController =
    options.signal || typeof AbortController === "undefined"
      ? null
      : new AbortController();
  const timeoutId = timeoutController
    ? globalThis.setTimeout(
        () => timeoutController.abort(),
        DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS
      )
    : null;

  try {
    const response = await fetchImpl(buildDeploymentVersionUrl(now()), {
      cache: "no-store",
      signal: options.signal ?? timeoutController?.signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isValidDeploymentVersionPayload(payload)) return null;
    return payload.version.trim();
  } catch {
    return null;
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
}

export function isNewDeploymentVersion(
  baselineVersion: string | null,
  candidateVersion: string | null
): boolean {
  return Boolean(
    baselineVersion &&
      candidateVersion &&
      baselineVersion !== candidateVersion
  );
}

export function reloadGuardStorageKey(version: string): string {
  return `${UPDATE_RELOAD_GUARD_PREFIX}${version}`;
}

export function hasReloadGuard(
  storage: Pick<Storage, "getItem">,
  version: string
): boolean {
  try {
    return storage.getItem(reloadGuardStorageKey(version)) !== null;
  } catch {
    return false;
  }
}

export function setReloadGuard(
  storage: Pick<Storage, "setItem">,
  version: string,
  attemptedAt = Date.now()
): boolean {
  try {
    storage.setItem(reloadGuardStorageKey(version), String(attemptedAt));
    return true;
  } catch {
    return false;
  }
}

export function clearReloadGuard(
  storage: Pick<Storage, "removeItem">,
  version: string
): void {
  try {
    storage.removeItem(reloadGuardStorageKey(version));
  } catch {
    // Private mode or storage policy should never break normal app use.
  }
}

export function getReloadTarget(
  storage: Pick<Storage, "getItem">
): string | null {
  try {
    const target = storage.getItem(UPDATE_RELOAD_TARGET_STORAGE_KEY);
    return target && target.trim().length > 0 ? target : null;
  } catch {
    return null;
  }
}

export function setReloadTarget(
  storage: Pick<Storage, "setItem">,
  version: string
): boolean {
  try {
    storage.setItem(UPDATE_RELOAD_TARGET_STORAGE_KEY, version);
    return true;
  } catch {
    return false;
  }
}

export function clearReloadTarget(
  storage: Pick<Storage, "removeItem">
): void {
  try {
    storage.removeItem(UPDATE_RELOAD_TARGET_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browsing modes.
  }
}
