import { useSyncExternalStore } from "react";

const NETWORK_STATUS_RECHECK_EVENT = "getphame:network-status-recheck";

export function getNetworkSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function subscribeToNetworkStatus(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  window.addEventListener(NETWORK_STATUS_RECHECK_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
    window.removeEventListener(NETWORK_STATUS_RECHECK_EVENT, onStoreChange);
  };
}

/**
 * Read the browser's current network signal and notify every mounted consumer
 * to refresh its snapshot. The readiness probe remains the source of truth for
 * service availability; navigator.onLine only controls network-specific copy.
 */
export function recheckNetworkStatus(): boolean {
  const isOnline = getNetworkSnapshot();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NETWORK_STATUS_RECHECK_EVENT));
  }
  return isOnline;
}

export function useNetworkStatus(): boolean {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkSnapshot,
    () => true
  );
}
