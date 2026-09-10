import { useEffect, useRef, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useActiveTransientQueryRetries } from "@/hooks/useActiveTransientQueryRetries";
import { useHaptics } from "@/hooks/useHaptics";
import {
  recheckNetworkStatus,
  useNetworkStatus,
} from "@/hooks/useNetworkStatus";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/queryRetry";

const API_READINESS_QUERY_KEY = ["system", "api-readiness"] as const;
const API_RECOVERY_TOAST_ID = "api-recovery-restored";

export type ApiReadiness = {
  ok: true;
  status: "ready";
};

type ApiReadinessError = Error & {
  data?: { code: "INTERNAL_SERVER_ERROR"; httpStatus: number };
};

function createTransientReadinessError(httpStatus = 503): ApiReadinessError {
  return Object.assign(
    new Error("The API is temporarily unavailable. Please try again."),
    {
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus },
    }
  ) as ApiReadinessError;
}

async function fetchApiReadiness(): Promise<ApiReadiness> {
  let response: Response;
  try {
    response = await fetch("/api/health", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw createTransientReadinessError();
  }

  if (!response.ok) {
    throw createTransientReadinessError(response.status);
  }

  let payload: Partial<ApiReadiness>;
  try {
    payload = (await response.json()) as Partial<ApiReadiness>;
  } catch {
    throw createTransientReadinessError();
  }

  if (payload.ok !== true || payload.status !== "ready") {
    throw createTransientReadinessError();
  }

  return payload as ApiReadiness;
}

type ReadinessOptions = {
  retry?: typeof shouldRetryQuery | false;
};

export function useDashboardReadiness(
  enabled: boolean,
  options: ReadinessOptions = {}
): UseQueryResult<ApiReadiness, Error> {
  return useQuery<ApiReadiness, Error>({
    queryKey: API_READINESS_QUERY_KEY,
    queryFn: fetchApiReadiness,
    enabled,
    retry: options.retry ?? shouldRetryQuery,
    retryDelay: queryRetryDelay,
    staleTime: 15_000,
    networkMode: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function ApiReconnectingIndicator() {
  const activeRetryCount = useActiveTransientQueryRetries();
  const { t } = useTranslation();
  if (activeRetryCount === 0) return null;

  return (
    <div
      data-testid="api-reconnecting-indicator"
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full border border-[#D4A017]/30 bg-[#08172b]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur"
    >
      <span className="flex items-center gap-2">
        <span className="api-recovery-signal" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {t("apiRecovery.reconnecting", { defaultValue: "Reconnecting…" })}
      </span>
    </div>
  );
}

type DashboardReadinessGateProps = {
  readiness: UseQueryResult<ApiReadiness, Error>;
  children: ReactNode;
};

function RecoveryToast({
  readiness,
}: Pick<DashboardReadinessGateProps, "readiness">) {
  const { t } = useTranslation();
  const { recoverySuccessHaptic } = useHaptics();
  const hadUnavailableState = useRef(false);
  const lastHandledSuccess = useRef(readiness.dataUpdatedAt);

  // Store the transition marker during render. Mutating a ref does not schedule
  // a React update, and this avoids missing a fast online event between paint
  // and the passive failure effect.
  if (readiness.isError || readiness.failureCount > 0) {
    hadUnavailableState.current = true;
  }

  useEffect(() => {
    if (
      !readiness.isSuccess ||
      readiness.dataUpdatedAt === lastHandledSuccess.current
    )
      return;

    lastHandledSuccess.current = readiness.dataUpdatedAt;
    if (!hadUnavailableState.current) return;

    hadUnavailableState.current = false;
    toast.success(
      t("apiRecovery.reconnected", { defaultValue: "You’re back online." }),
      {
        id: API_RECOVERY_TOAST_ID,
        duration: 8_000,
        className: "api-recovery-reconnect-toast",
        description: t("apiRecovery.reconnectedDescription", {
          defaultValue: "Get Phame is connected and ready to use.",
        }),
      }
    );
    recoverySuccessHaptic();
  }, [readiness.dataUpdatedAt, readiness.isSuccess, recoverySuccessHaptic, t]);

  return null;
}

function OfflineRecoveryIllustration() {
  return (
    <div
      data-testid="api-recovery-offline-illustration"
      aria-hidden="true"
      className="relative mx-auto flex h-24 w-24 items-center justify-center"
    >
      <span className="absolute inset-1 rounded-[2rem] border border-[#D4A017]/25 bg-[#D4A017]/10" />
      <span className="absolute inset-4 rounded-[1.4rem] border border-dashed border-white/20" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4A017] shadow-[0_12px_28px_rgba(212,160,23,0.24)]">
        <WifiOff size={24} className="text-[#08172b]" strokeWidth={2.4} />
      </span>
    </div>
  );
}

/**
 * Avoid mounting the authenticated dashboard query tree while a managed restart
 * is still returning a non-ready response. Exhausted automatic retries receive
 * a manual retry action rather than an opaque query error.
 */
export function DashboardReadinessGate({
  readiness,
  children,
}: DashboardReadinessGateProps) {
  const { t } = useTranslation();
  const isOnline = useNetworkStatus();
  const wasOnline = useRef(isOnline);
  const recoveryToast = <RecoveryToast readiness={readiness} />;
  const retryNow = () => {
    recheckNetworkStatus();
    void readiness.refetch({ cancelRefetch: false });
  };

  useEffect(() => {
    const recoveredNetwork = isOnline && !wasOnline.current;
    wasOnline.current = isOnline;

    if (recoveredNetwork && readiness.isError) {
      retryNow();
    }
  }, [isOnline, readiness.isError, readiness.refetch]);

  if (readiness.isPending) {
    return (
      <>
        {recoveryToast}
        <div
          className="flex min-h-screen items-center justify-center rr-bg-navy px-6"
          role="status"
          aria-live="polite"
        >
          <div className="flex max-w-sm flex-col items-center text-center">
            <Loader2
              size={28}
              className="animate-spin text-[#D4A017]"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-semibold text-white">
              {t("apiRecovery.preparing", {
                defaultValue: "Preparing your workspace…",
              })}
            </p>
            <p className="mt-1 text-xs text-white/65">
              {t("apiRecovery.preparingDescription", {
                defaultValue:
                  "We’ll reconnect automatically when the service is ready.",
              })}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (readiness.isError) {
    const title = isOnline
      ? t("apiRecovery.unavailableTitle", {
          defaultValue: "We’re reconnecting Get Phame.",
        })
      : t("apiRecovery.offlineTitle", {
          defaultValue: "You’re offline right now.",
        });
    const description = isOnline
      ? t("apiRecovery.unavailableDescription", {
          defaultValue:
            "The service is taking a little longer than expected. Your work is safe; try again when you’re ready.",
        })
      : t("apiRecovery.offlineDescription", {
          defaultValue:
            "Check your Wi-Fi or mobile data, then try again. Your work stays safe on this device.",
        });

    return (
      <>
        {recoveryToast}
        <div
          className="flex min-h-screen items-center justify-center rr-bg-navy px-6"
          role="alert"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#D4A017]/30 bg-white/[0.06] p-7 text-center shadow-2xl">
            <OfflineRecoveryIllustration />
            <h1 className="mt-4 text-xl font-black text-white">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-white/70">
              {description}
            </p>
            {!isOnline && (
              <>
                <ol
                  id="api-recovery-offline-guidance"
                  data-testid="api-recovery-offline-guidance"
                  className="mt-5 space-y-2 text-left text-xs leading-5 text-white/75"
                >
                  <li className="flex gap-2">
                    <span className="font-black text-[#D4A017]">1.</span>
                    {t("apiRecovery.offlineStepOne", {
                      defaultValue: "Turn on Wi-Fi or mobile data.",
                    })}
                  </li>
                  <li className="flex gap-2">
                    <span className="font-black text-[#D4A017]">2.</span>
                    {t("apiRecovery.offlineStepTwo", {
                      defaultValue: "Return here and tap Retry Connection.",
                    })}
                  </li>
                </ol>
                <button
                  type="button"
                  data-testid="api-recovery-retry-now"
                  onClick={retryNow}
                  disabled={readiness.isFetching}
                  aria-describedby="api-recovery-offline-guidance"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D4A017]/50 bg-white/[0.06] px-4 py-2.5 text-sm font-black text-white transition active:scale-[0.97] hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-70"
                >
                  {readiness.isFetching ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <RefreshCw size={16} aria-hidden="true" />
                  )}
                  {readiness.isFetching
                    ? t("apiRecovery.retrying", {
                        defaultValue: "Trying again…",
                      })
                    : t("apiRecovery.retryConnection", {
                        defaultValue: "Retry Connection",
                      })}
                </button>
              </>
            )}
            <button
              type="button"
              data-testid="api-recovery-retry"
              onClick={retryNow}
              disabled={readiness.isFetching}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D4A017] px-4 py-2.5 text-sm font-black text-[#08172b] transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
            >
              {readiness.isFetching ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw size={16} aria-hidden="true" />
              )}
              {readiness.isFetching
                ? t("apiRecovery.retrying", { defaultValue: "Trying again…" })
                : t("apiRecovery.retry", { defaultValue: "Try again" })}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {recoveryToast}
      {children}
    </>
  );
}
