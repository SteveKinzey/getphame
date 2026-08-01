import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export type AutomationRunSelection = {
  date: string;
  kind: "drift_audit" | "dependabot_merge";
} | null;

function formatDuration(value: number | null, notAvailable: string) {
  if (value === null) return notAvailable;
  const minutes = Math.max(1, Math.round(value / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

export default function AutomationRunDetailsDialog({
  selection,
  onClose,
}: {
  selection: AutomationRunSelection;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const input = useMemo(
    () => ({
      date: selection?.date ?? "1970-01-01",
      kind: selection?.kind ?? ("drift_audit" as const),
      limit: 50,
    }),
    [selection?.date, selection?.kind]
  );
  const query = trpc.automationHealth.runDetails.useQuery(input, {
    enabled: Boolean(selection),
  });
  const locale = i18n.resolvedLanguage || i18n.language || undefined;
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  return (
    <Dialog open={Boolean(selection)} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle>
            {t("automationHealth.drilldown.title", {
              defaultValue: "Daily automation runs",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("automationHealth.drilldown.description", {
              date: selection?.date ?? "",
              defaultValue: `Verified runs for ${selection?.date ?? ""}. Up to 50 newest records are shown.`,
            })}
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <p role="status" className="py-8 text-center rr-text-navy-muted">
            {t("automationHealth.drilldown.loading", {
              defaultValue: "Loading run details…",
            })}
          </p>
        ) : query.isError ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {t("automationHealth.drilldown.error", {
              defaultValue: "Run details could not be loaded.",
            })}
          </p>
        ) : query.data?.runs.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-6 text-center rr-text-navy-muted">
            {t("automationHealth.drilldown.empty", {
              defaultValue: "No verified runs were recorded for this day.",
            })}
          </p>
        ) : (
          <div className="space-y-3">
            {query.data?.runs.map(run => (
              <article
                key={run.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black rr-text-navy">
                      {run.workflow} · #{run.runNumber}
                    </p>
                    <p className="mt-1 text-sm rr-text-navy-muted">
                      {dateTime.format(new Date(run.eventAt))}
                      {run.durationMs === null
                        ? ""
                        : ` · ${formatDuration(
                            run.durationMs,
                            t("automationHealth.notAvailable", {
                              defaultValue: "N/A",
                            })
                          )}`}
                    </p>
                  </div>
                  <span
                    className={`inline-flex self-start rounded-full px-2.5 py-1 text-xs font-black ${run.result === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                  >
                    {run.result === "success"
                      ? t("automationHealth.result.success", {
                          defaultValue: "Successful",
                        })
                      : t("automationHealth.result.failure", {
                          defaultValue: "Failed",
                        })}
                  </span>
                </div>
                {(run.failureSummary || run.failureCode) && (
                  <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">
                    {run.failureSummary || run.failureCode}
                  </p>
                )}
                <a
                  href={run.runUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center font-black rr-text-gold underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {t("automationHealth.drilldown.openRun", {
                    defaultValue: "Open verified GitHub run",
                  })}
                  <span className="sr-only">
                    {t("automationHealth.history.opensNewTab", {
                      defaultValue: "opens in a new tab",
                    })}
                  </span>
                </a>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
