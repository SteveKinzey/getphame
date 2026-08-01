import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearReloadGuard,
  clearReloadTarget,
  fetchDeploymentVersion,
  getReloadTarget,
  hasReloadGuard,
  isNewDeploymentVersion,
  setReloadGuard,
  setReloadTarget,
  UPDATE_DEFER_DURATION_MS,
  UPDATE_RELOAD_GUARD_PREFIX,
  VERSION_POLL_INTERVAL_MS,
} from "@/lib/appVersion";
import { useUpdateSafety } from "@/contexts/UpdateSafetyContext";

export type AppUpdateState =
  | "current"
  | "available"
  | "blocked"
  | "confirm-loss"
  | "reloading"
  | "failed";

export type AppUpdateBlocker =
  | "pending-mutation"
  | "critical-activity"
  | "sensitive-flow"
  | null;

export type AppVersionDiagnostics = {
  baselineVersion: string | null;
  detectedVersion: string | null;
  activeWorkerScript: string | null;
  waitingWorker: boolean;
  lastSuccessfulCheckAt: number | null;
  state: AppUpdateState;
  failure: "reload-guard" | "version-mismatch" | "worker-timeout" | null;
};

const NOTIFIED_PREFIX = "getphame:update-notified:";
const DEFERRED_PREFIX = "getphame:update-deferred:";
const WAITING_WORKER_TIMEOUT_MS = 1_500;

function isSensitiveUpdateRoute(pathname: string, search: string): boolean {
  const normalized = pathname.toLowerCase();
  if (
    normalized.startsWith("/login") ||
    normalized.startsWith("/auth") ||
    normalized.startsWith("/payment-success") ||
    normalized.startsWith("/checkout")
  ) {
    return true;
  }

  const params = new URLSearchParams(search);
  return Boolean(params.get("token") || params.get("magic") || params.get("code"));
}

function readDeferredUntil(version: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(`${DEFERRED_PREFIX}${version}`);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value > Date.now() ? value : null;
  } catch {
    return null;
  }
}

function markNoticeShown(version: string): void {
  try {
    window.sessionStorage.setItem(`${NOTIFIED_PREFIX}${version}`, "1");
  } catch {
    // The in-memory coordinator state still prevents duplicate notifications.
  }
}

function wasNoticeShown(version: string): boolean {
  try {
    return window.sessionStorage.getItem(`${NOTIFIED_PREFIX}${version}`) === "1";
  } catch {
    return false;
  }
}

async function getWorkerDiagnostics(): Promise<{
  activeWorkerScript: string | null;
  waitingWorker: boolean;
}> {
  if (!("serviceWorker" in navigator)) {
    return { activeWorkerScript: null, waitingWorker: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      activeWorkerScript: registration?.active?.scriptURL ?? null,
      waitingWorker: Boolean(registration?.waiting),
    };
  } catch {
    return { activeWorkerScript: null, waitingWorker: false };
  }
}

export function useAppVersionCheck() {
  const {
    pendingMutationCount,
    getCriticalActivityCount,
    getDirtySourceCount,
  } = useUpdateSafety();
  const [state, setState] = useState<AppUpdateState>("current");
  const [blocker, setBlocker] = useState<AppUpdateBlocker>(null);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AppVersionDiagnostics>({
    baselineVersion: null,
    detectedVersion: null,
    activeWorkerScript: null,
    waitingWorker: false,
    lastSuccessfulCheckAt: null,
    state: "current",
    failure: null,
  });

  const baselineVersionRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const deferredTimerRef = useRef<number | null>(null);
  const reloadingRef = useRef(false);
  const availableVersionRef = useRef<string | null>(null);

  const refreshWorkerDiagnostics = useCallback(async () => {
    if (typeof navigator === "undefined") return;
    const worker = await getWorkerDiagnostics();
    setDiagnostics(current => ({ ...current, ...worker }));
  }, []);

  const recordState = useCallback(
    (
      nextState: AppUpdateState,
      extras: Partial<Pick<AppVersionDiagnostics, "failure">> = {}
    ) => {
      setState(nextState);
      setDiagnostics(current => ({ ...current, state: nextState, ...extras }));
    },
    []
  );

  const showAvailableNotice = useCallback(
    (version: string) => {
      const deferredUntil = readDeferredUntil(version);
      if (deferredUntil) {
        if (deferredTimerRef.current !== null) {
          window.clearTimeout(deferredTimerRef.current);
        }
        deferredTimerRef.current = window.setTimeout(() => {
          deferredTimerRef.current = null;
          setNoticeVisible(true);
        }, Math.max(0, deferredUntil - Date.now()));
        return;
      }

      // A notice can return after an explicit Later decision, but passive timer,
      // focus, and worker events must never stack multiple copies of it.
      if (!wasNoticeShown(version) || !noticeVisible) {
        markNoticeShown(version);
        setNoticeVisible(true);
      }
    },
    [noticeVisible]
  );

  const checkForUpdate = useCallback(
    async (source: "initial" | "timer" | "focus" | "visibility" | "worker" | "manual" = "manual") => {
      if (typeof window === "undefined" || inFlightRef.current) return null;
      if (source === "timer" && document.visibilityState !== "visible") return null;

      inFlightRef.current = true;
      try {
        const version = await fetchDeploymentVersion();
        if (!version) return null;

        const worker = await getWorkerDiagnostics();
        setDiagnostics(current => ({
          ...current,
          ...worker,
          detectedVersion: version,
          lastSuccessfulCheckAt: Date.now(),
        }));

        if (baselineVersionRef.current === null) {
          baselineVersionRef.current = version;
          const reloadTarget = getReloadTarget(window.sessionStorage);
          if (reloadTarget) {
            if (reloadTarget === version) {
              clearReloadGuard(window.sessionStorage, reloadTarget);
              clearReloadTarget(window.sessionStorage);
            } else {
              recordState("failed", { failure: "version-mismatch" });
              return version;
            }
          }

          setDiagnostics(current => ({ ...current, baselineVersion: version }));
          return version;
        }

        if (isNewDeploymentVersion(baselineVersionRef.current, version)) {
          availableVersionRef.current = version;
          setAvailableVersion(version);
          recordState("available");
          if (!isSensitiveUpdateRoute(window.location.pathname, window.location.search)) {
            showAvailableNotice(version);
          }
        }

        return version;
      } finally {
        inFlightRef.current = false;
      }
    },
    [recordState, showAvailableNotice]
  );

  const completeReload = useCallback(() => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    window.location.reload();
  }, []);

  const reloadCurrentTab = useCallback(async () => {
    const version = availableVersionRef.current;
    if (!version || typeof window === "undefined") return;

    if (hasReloadGuard(window.sessionStorage, version)) {
      recordState("failed", { failure: "reload-guard" });
      return;
    }

    if (
      !setReloadGuard(window.sessionStorage, version) ||
      !setReloadTarget(window.sessionStorage, version)
    ) {
      recordState("failed", { failure: "reload-guard" });
      return;
    }

    recordState("reloading");
    setNoticeVisible(false);

    if (!("serviceWorker" in navigator)) {
      completeReload();
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.waiting) {
        completeReload();
        return;
      }

      let completed = false;
      const finish = () => {
        if (completed) return;
        completed = true;
        navigator.serviceWorker.removeEventListener("controllerchange", finish);
        window.clearTimeout(timeout);
        completeReload();
      };
      const timeout = window.setTimeout(() => {
        if (!completed) {
          navigator.serviceWorker.removeEventListener("controllerchange", finish);
          completed = true;
          completeReload();
        }
      }, WAITING_WORKER_TIMEOUT_MS);

      // Listener first; message only the actual waiting worker. The worker
      // independently refuses activation if another window client is present.
      navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } catch {
      // A worker diagnostic failure must not block a deliberate safe reload.
      completeReload();
    }
  }, [completeReload, recordState]);

  const requestUpdate = useCallback(() => {
    if (!availableVersionRef.current || typeof window === "undefined") return;

    if (isSensitiveUpdateRoute(window.location.pathname, window.location.search)) {
      setBlocker("sensitive-flow");
      recordState("blocked");
      return;
    }

    if (pendingMutationCount > 0) {
      setBlocker("pending-mutation");
      recordState("blocked");
      return;
    }

    if (getCriticalActivityCount() > 0) {
      setBlocker("critical-activity");
      recordState("blocked");
      return;
    }

    if (getDirtySourceCount() > 0) {
      setBlocker(null);
      recordState("confirm-loss");
      return;
    }

    void reloadCurrentTab();
  }, [
    getCriticalActivityCount,
    getDirtySourceCount,
    pendingMutationCount,
    recordState,
    reloadCurrentTab,
  ]);

  const confirmDiscardAndUpdate = useCallback(() => {
    if (isSensitiveUpdateRoute(window.location.pathname, window.location.search)) {
      setBlocker("sensitive-flow");
      recordState("blocked");
      return;
    }

    if (pendingMutationCount > 0) {
      setBlocker("pending-mutation");
      recordState("blocked");
      return;
    }

    if (getCriticalActivityCount() > 0) {
      setBlocker("critical-activity");
      recordState("blocked");
      return;
    }

    void reloadCurrentTab();
  }, [getCriticalActivityCount, pendingMutationCount, recordState, reloadCurrentTab]);

  const cancelDiscard = useCallback(() => {
    setBlocker(null);
    recordState("available");
    setNoticeVisible(true);
  }, [recordState]);

  const deferUpdate = useCallback(() => {
    const version = availableVersionRef.current;
    if (!version || typeof window === "undefined") return;

    const until = Date.now() + UPDATE_DEFER_DURATION_MS;
    try {
      window.sessionStorage.setItem(`${DEFERRED_PREFIX}${version}`, String(until));
    } catch {
      // In-memory hiding still prevents a repeated toast in the current render.
    }
    setNoticeVisible(false);
    recordState("available");
  }, [recordState]);

  useEffect(() => {
    void checkForUpdate("initial");
    void refreshWorkerDiagnostics();

    const onFocus = () => void checkForUpdate("focus");
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkForUpdate("visibility");
    };
    const onWorkerMessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        (data as { type?: unknown }).type === "VERSION_AVAILABLE"
      ) {
        void checkForUpdate("worker");
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    }

    const timer = window.setInterval(() => {
      void checkForUpdate("timer");
    }, VERSION_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      if (deferredTimerRef.current !== null) {
        window.clearTimeout(deferredTimerRef.current);
      }
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
      }
    };
  }, [checkForUpdate, refreshWorkerDiagnostics]);

  return {
    availableVersion,
    blocker,
    diagnostics,
    noticeVisible,
    state,
    checkForUpdate,
    requestUpdate,
    deferUpdate,
    confirmDiscardAndUpdate,
    cancelDiscard,
  };
}

export function isPwaUpdateSessionKey(key: string): boolean {
  return key.startsWith(UPDATE_RELOAD_GUARD_PREFIX);
}
