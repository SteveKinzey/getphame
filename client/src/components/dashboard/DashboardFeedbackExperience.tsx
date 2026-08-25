import { Loader2 } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function useDashboardApiErrorToast() {
  const { t } = useTranslation();

  return useCallback(() => {
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
      }
    );
  }, [t]);
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

  return (
    <div data-testid="dashboard-feedback-preview">
      <DashboardLoadingState />
      <div className="fixed right-4 bottom-4 z-50">
        <button
          type="button"
          data-testid="dashboard-feedback-preview-trigger"
          onClick={showApiError}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md"
        >
          Show recovery message
        </button>
      </div>
    </div>
  );
}
