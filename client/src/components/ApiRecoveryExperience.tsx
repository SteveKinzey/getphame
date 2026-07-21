import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useActiveTransientQueryRetries } from "@/hooks/useActiveTransientQueryRetries";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/queryRetry";

const API_READINESS_QUERY_KEY = ["system", "api-readiness"] as const;

export type ApiReadiness = {
  ok: true;
  status: "ready";
};

type ApiReadinessError = Error & {
  data?: { code: "INTERNAL_SERVER_ERROR"; httpStatus: number };
};

function createTransientReadinessError(httpStatus = 503): ApiReadinessError {
  return Object.assign(new Error("The API is temporarily unavailable. Please try again."), {
    data: { code: "INTERNAL_SERVER_ERROR", httpStatus },
  }) as ApiReadinessError;
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
    payload = await response.json() as Partial<ApiReadiness>;
  } catch {
    throw createTransientReadinessError();
  }

  if (payload.ok !== true || payload.status !== "ready") {
    throw createTransientReadinessError();
  }

  return payload as ApiReadiness;
}

export function useDashboardReadiness(enabled: boolean): UseQueryResult<ApiReadiness, Error> {
  return useQuery<ApiReadiness, Error>({
    queryKey: API_READINESS_QUERY_KEY,
    queryFn: fetchApiReadiness,
    enabled,
    retry: shouldRetryQuery,
    retryDelay: queryRetryDelay,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function ApiReconnectingIndicator() {
  const activeRetryCount = useActiveTransientQueryRetries();
  if (activeRetryCount === 0) return null;

  return (
    <div
      data-testid="api-reconnecting-indicator"
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full border border-[#D4A017]/30 bg-[#08172b]/95 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur"
    >
      <span className="flex items-center gap-2">
        <Loader2 size={14} aria-hidden="true" className="animate-spin text-[#D4A017]" />
        Reconnecting…
      </span>
    </div>
  );
}

type DashboardReadinessGateProps = {
  readiness: UseQueryResult<ApiReadiness, Error>;
  children: ReactNode;
};

/**
 * Avoid mounting the authenticated dashboard query tree while a managed restart
 * is still returning a non-ready response. Exhausted automatic retries receive
 * a manual retry action rather than an opaque query error.
 */
export function DashboardReadinessGate({ readiness, children }: DashboardReadinessGateProps) {
  if (readiness.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-navy px-6" role="status" aria-live="polite">
        <div className="flex max-w-sm flex-col items-center text-center">
          <Loader2 size={28} className="animate-spin text-[#D4A017]" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-white">Preparing your workspace…</p>
          <p className="mt-1 text-xs text-white/65">We’ll reconnect automatically when the service is ready.</p>
        </div>
      </div>
    );
  }

  if (readiness.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-navy px-6" role="alert">
        <div className="w-full max-w-md rounded-2xl border border-[#D4A017]/30 bg-white/[0.06] p-7 text-center shadow-2xl">
          <WifiOff size={32} className="mx-auto text-[#D4A017]" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-black text-white">We’re reconnecting Get Phame.</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            The service is taking a little longer than expected. Your work is safe; try again when you’re ready.
          </p>
          <button
            type="button"
            data-testid="api-recovery-retry"
            onClick={() => void readiness.refetch()}
            disabled={readiness.isFetching}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D4A017] px-4 py-2.5 text-sm font-black text-[#08172b] transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            {readiness.isFetching ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
