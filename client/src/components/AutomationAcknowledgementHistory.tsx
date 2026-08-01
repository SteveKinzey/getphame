import { trpc } from "@/lib/trpc";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function AutomationAcknowledgementHistory() {
  const { t, i18n } = useTranslation();
  const input = useMemo(() => ({ limit: 50 }), []);
  const query = trpc.automationHealth.acknowledgementHistory.useQuery(input, {
    refetchOnWindowFocus: true,
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
    <section
      aria-labelledby="automation-acknowledgement-history-title"
      className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
    >
      <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
        {t("automationHealth.ackHistory.eyebrow", {
          defaultValue: "Alert audit trail",
        })}
      </p>
      <h2
        id="automation-acknowledgement-history-title"
        className="mt-1 text-xl font-semibold rr-text-navy"
      >
        {t("automationHealth.ackHistory.title", {
          defaultValue: "Drift-alert acknowledgement history",
        })}
      </h2>
      <p className="mt-1 max-w-3xl text-sm rr-text-navy-muted">
        {t("automationHealth.ackHistory.description", {
          defaultValue:
            "Acknowledgement records who reviewed an alert. Recovery is shown only after a later successful drift audit.",
        })}
      </p>
      {query.isLoading ? (
        <p role="status" className="py-8 text-center rr-text-navy-muted">
          {t("automationHealth.ackHistory.loading", {
            defaultValue: "Loading acknowledgement history…",
          })}
        </p>
      ) : query.isError ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">
          {t("automationHealth.ackHistory.error", {
            defaultValue: "Acknowledgement history could not be loaded.",
          })}
        </p>
      ) : query.data?.history.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center rr-text-navy-muted">
          {t("automationHealth.ackHistory.empty", {
            defaultValue: "No drift alerts have been acknowledged yet.",
          })}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {query.data?.history.map(entry => (
            <article
              key={entry.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black rr-text-navy">
                    {entry.actorName ||
                      t("automationHealth.ackHistory.actorFallback", {
                        id: entry.adminUserId,
                        defaultValue: `Administrator ${entry.adminUserId}`,
                      })}
                  </p>
                  <p className="mt-1 text-sm rr-text-navy-muted">
                    {t("automationHealth.ackHistory.acknowledgedAt", {
                      date: dateTime.format(new Date(entry.acknowledgedAt)),
                      defaultValue: `Acknowledged ${dateTime.format(new Date(entry.acknowledgedAt))}`,
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-black ${entry.recoveredAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
                >
                  {entry.recoveredAt
                    ? t("automationHealth.ackHistory.recovered", {
                        defaultValue: "Recovered",
                      })
                    : t("automationHealth.ackHistory.awaitingRecovery", {
                        defaultValue: "Awaiting recovery",
                      })}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium rr-text-navy-muted">
                {entry.failureSummary ||
                  entry.failureCode ||
                  t("automationHealth.ackHistory.noFailureSummary", {
                    defaultValue: "No failure summary was recorded.",
                  })}
              </p>
              {entry.recoveredAt && (
                <p className="mt-2 text-sm font-bold text-emerald-800">
                  {t("automationHealth.ackHistory.recoveredAt", {
                    date: dateTime.format(new Date(entry.recoveredAt)),
                    defaultValue: `Recovered ${dateTime.format(new Date(entry.recoveredAt))}`,
                  })}
                </p>
              )}
              <a
                href={entry.runUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex min-h-11 items-center font-black rr-text-gold underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {t("automationHealth.ackHistory.openAlertRun", {
                  number: entry.runNumber,
                  defaultValue: `Open alert run #${entry.runNumber}`,
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
    </section>
  );
}
