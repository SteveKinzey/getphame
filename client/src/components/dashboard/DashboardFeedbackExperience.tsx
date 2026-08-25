import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type DashboardApiErrorToastOptions = {
  onRetry?: () => void | Promise<unknown>;
};

export function useDashboardApiErrorToast() {
  const { t } = useTranslation();

  return useCallback((options: DashboardApiErrorToastOptions = {}) => {
    toast.error(
      t("apiRecovery.unavailableTitle", {
        defaultValue: "We’re reconnecting Get Phame.",
      }),
      {
        description: t("apiRecovery.unavailableDescription", {
          defaultValue:
            "The service is taking a little longer than expected. Your work is safe; try again when you’re ready.",
        }),
        duration: 8_000,
        action: options.onRetry
          ? {
              label: t("apiRecovery.retry", { defaultValue: "Try again" }),
              onClick: () => {
                void options.onRetry?.();
              },
            }
          : undefined,
      }
    );
  }, [t]);
}

export function useRecoverableDashboardQueryError(
  hasError: boolean,
  onRetry: () => void | Promise<unknown>
) {
  const showApiError = useDashboardApiErrorToast();
  const wasErroredRef = useRef(false);

  useEffect(() => {
    if (!hasError) {
      wasErroredRef.current = false;
      return;
    }

    if (wasErroredRef.current) return;
    wasErroredRef.current = true;
    showApiError({ onRetry });
  }, [hasError, onRetry, showApiError]);
}

export function DashboardLoadingState() {
  const { t } = useTranslation();

  return (
    <main
      data-testid="dashboard-loading"
      role="status"
      aria-live="polite"
      aria-label={t("dashboard.loading.ariaLabel", {
        defaultValue: "Loading your dashboard",
      })}
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl rr-bg-navy">
          <Loader2 className="animate-spin rr-text-gold" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-black rr-text-navy">
            {t("dashboard.loading.title", { defaultValue: "Loading your dashboard…" })}
          </p>
          <p className="mt-1 text-sm rr-text-navy-muted">
            {t("dashboard.loading.description", {
              defaultValue: "Getting your latest review-request activity ready.",
            })}
          </p>
        </div>
      </div>
    </main>
  );
}

export function DashboardFeedbackPreviewHarness() {
  const showApiError = useDashboardApiErrorToast();
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div data-testid="dashboard-feedback-preview">
      <DashboardLoadingState />
      <div className="fixed right-4 bottom-4 z-50">
        <button
          type="button"
          data-testid="dashboard-feedback-preview-trigger"
          onClick={() => showApiError({ onRetry: () => setRetryCount(count => count + 1) })}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md"
        >
          Show recovery message
        </button>
      </div>
      {retryCount > 0 ? (
        <p data-testid="dashboard-feedback-preview-retried" role="status" className="sr-only">
          Retry requested
        </p>
      ) : null}
    </div>
  );
}

export function DashboardQueryRecoveryPreviewHarness() {
  const [hasQueryError, setHasQueryError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const showApiError = useDashboardApiErrorToast();
  const retrySafeReads = useCallback(() => {
    setRetryCount(count => count + 1);
    setHasQueryError(false);
  }, []);

  useRecoverableDashboardQueryError(hasQueryError, retrySafeReads);

  return (
    <div data-testid="dashboard-query-recovery-preview" className="p-6">
      <button
        type="button"
        data-testid="dashboard-query-recovery-trigger"
        onClick={() => setHasQueryError(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
      >
        Simulate dashboard data failure
      </button>
      <button
        type="button"
        data-testid="dashboard-mutation-recovery-trigger"
        onClick={() => showApiError()}
        className="ml-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
      >
        Simulate dashboard update failure
      </button>
      {retryCount > 0 ? (
        <p data-testid="dashboard-query-recovery-retried" role="status" className="mt-4">
          Safe dashboard reads refreshed
        </p>
      ) : null}
    </div>
  );
}
