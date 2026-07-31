import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

export default function AutomationDriftAlert() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";
  const alert = trpc.automationHealth.alert.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const acknowledge = trpc.automationHealth.acknowledgeAlert.useMutation({
    onSuccess: async () => {
      await utils.automationHealth.alert.invalidate();
    },
  });

  if (!isAdmin || !alert.data?.active || !alert.data.event) return null;

  const event = alert.data.event;
  return (
    <section
      data-testid="automation-drift-alert"
      role="alert"
      aria-live="assertive"
      className="border-b border-red-300 bg-red-50 px-4 py-3 text-red-950"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-red-700 text-white">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-black">
              {t("automationHealth.alert.title", {
                defaultValue: "Workflow drift detected",
              })}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-5 text-red-900">
              {event.failureSummary ||
                t("automationHealth.alert.body", {
                  defaultValue:
                    "The latest workflow drift audit failed. Review the run before changing repository automation.",
                })}
            </p>
            <p className="mt-1 text-xs font-medium text-red-800">
              {t("automationHealth.alert.recovery", {
                defaultValue:
                  "This warning remains until a verified successful audit is received.",
              })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 min-[420px]:flex-row">
          <button
            type="button"
            onClick={() => navigate("/admin/automation-health")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-800 px-4 text-sm font-black text-white transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-950 focus-visible:ring-offset-2"
          >
            {t("automationHealth.alert.viewDetails", {
              defaultValue: "View details",
            })}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => acknowledge.mutate({ eventId: event.id })}
            disabled={alert.data.acknowledged || acknowledge.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-red-800 bg-white px-4 text-sm font-black text-red-900 transition active:scale-[0.97] disabled:cursor-default disabled:border-red-300 disabled:text-red-700 disabled:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-950 focus-visible:ring-offset-2"
          >
            {acknowledge.isPending ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : alert.data.acknowledged ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : null}
            {alert.data.acknowledged
              ? t("automationHealth.alert.acknowledged", {
                  defaultValue: "Acknowledged",
                })
              : t("automationHealth.alert.acknowledge", {
                  defaultValue: "Acknowledge",
                })}
          </button>
        </div>
      </div>
    </section>
  );
}
