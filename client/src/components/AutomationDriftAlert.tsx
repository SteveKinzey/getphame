import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

export default function AutomationDriftAlert() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
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
  const eventTime = new Intl.DateTimeFormat(
    i18n.resolvedLanguage || i18n.language,
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(event.eventAt));

  return (
    <section
      data-testid="automation-drift-alert"
      data-state="critical"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="border-y-4 border-red-700 bg-[linear-gradient(100deg,#fff1f2_0%,#fffbeb_55%,#fff1f2_100%)] px-4 py-4 text-red-950 shadow-[inset_0_-1px_0_rgba(185,28,28,0.15)]"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="relative mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-red-800 text-white ring-4 ring-red-200">
            <AlertTriangle size={24} aria-hidden="true" />
            <span
              className="absolute -right-1 -top-1 size-3 rounded-full bg-amber-400 ring-2 ring-white motion-safe:animate-pulse"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-900 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white">
                <BellRing size={13} aria-hidden="true" />
                {t("automationHealth.alert.badge", {
                  defaultValue: "Action required",
                })}
              </span>
              <p className="text-base font-black">
                {t("automationHealth.alert.title", {
                  defaultValue: "Workflow drift detected",
                })}
              </p>
            </div>
            <p className="mt-0.5 text-sm font-semibold leading-5 text-red-900">
              {event.failureSummary ||
                t("automationHealth.alert.body", {
                  defaultValue:
                    "The latest workflow drift audit failed. Review the run before changing repository automation.",
                })}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-red-950">
              <span>
                {t("automationHealth.alert.workflow", {
                  workflow: event.workflow,
                  defaultValue: "Workflow: {{workflow}}",
                })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={13} aria-hidden="true" />
                {t("automationHealth.alert.observedAt", {
                  time: eventTime,
                  defaultValue: "Observed {{time}}",
                })}
              </span>
            </div>
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
