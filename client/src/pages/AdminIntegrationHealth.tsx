import { useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  Loader2,
  Mail,
  Radio,
  RefreshCw,
  ServerCog,
  Settings2,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

type HealthStatus = "healthy" | "degraded" | "unavailable" | "not_configured";

function HealthStatusPill({ status }: { status: HealthStatus }) {
  const { t } = useTranslation();
  const configuration = {
    healthy: {
      className: "bg-emerald-100 text-emerald-800",
      Icon: CheckCircle2,
      label: t("integrationHealth.status.healthy", { defaultValue: "Healthy" }),
    },
    degraded: {
      className: "bg-amber-100 text-amber-900",
      Icon: AlertTriangle,
      label: t("integrationHealth.status.degraded", {
        defaultValue: "Needs attention",
      }),
    },
    unavailable: {
      className: "bg-red-100 text-red-800",
      Icon: ShieldAlert,
      label: t("integrationHealth.status.unavailable", {
        defaultValue: "Unavailable",
      }),
    },
    not_configured: {
      className: "bg-slate-100 text-slate-700",
      Icon: Settings2,
      label: t("integrationHealth.status.notConfigured", {
        defaultValue: "Not configured",
      }),
    },
  }[status];
  const Icon = configuration.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${configuration.className}`}
    >
      <Icon size={13} aria-hidden="true" />
      {configuration.label}
    </span>
  );
}

function HealthCard({
  icon: Icon,
  title,
  component,
  footer,
}: {
  icon: typeof Database;
  title: string;
  component: { status: HealthStatus; latencyMs: number | null; detail: string };
  footer?: string;
}) {
  const { t } = useTranslation();

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label={`${title}: ${component.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
          <Icon size={21} aria-hidden="true" />
        </span>
        <HealthStatusPill status={component.status} />
      </div>
      <h2 className="mt-4 text-lg font-black rr-text-navy">{title}</h2>
      <p className="mt-1 min-h-10 text-sm font-medium rr-text-navy-muted">
        {component.detail}
      </p>
      <dl className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div>
          <dt className="sr-only">
            {t("integrationHealth.card.latency", { defaultValue: "Latency" })}
          </dt>
          <dd className="inline-flex items-center gap-1 font-bold rr-text-navy-muted">
            <Clock3 size={13} aria-hidden="true" />
            {component.latencyMs === null
              ? t("integrationHealth.card.notMeasured", {
                  defaultValue: "Not measured",
                })
              : t("integrationHealth.card.latencyValue", {
                  defaultValue: "{{value}} ms",
                  value: component.latencyMs,
                })}
          </dd>
        </div>
        {footer && <dd className="font-bold rr-text-navy-muted">{footer}</dd>}
      </dl>
    </article>
  );
}

export default function AdminIntegrationHealthPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const snapshot = trpc.integrationHealth.snapshot.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, navigate, user?.role]);

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [i18n.language, i18n.resolvedLanguage]
  );

  if (loading || snapshot.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm">
        <Loader2 size={28} className="animate-spin rr-text-navy-muted" />
      </div>
    );
  }
  if (user?.role !== "admin") return null;

  const data = snapshot.data;
  const summary = data
    ? data.overallStatus === "healthy"
      ? t("integrationHealth.summary.healthy", {
          defaultValue: "All configured services are responding normally.",
        })
      : data.overallStatus === "degraded"
        ? t("integrationHealth.summary.degraded", {
            defaultValue:
              "At least one configured service needs attention. Review the affected card below.",
          })
        : t("integrationHealth.summary.unavailable", {
            defaultValue:
              "At least one required service is unavailable. Retry after resolving the underlying connection issue.",
          })
    : t("integrationHealth.summary.unavailable", {
        defaultValue:
          "At least one required service is unavailable. Retry after resolving the underlying connection issue.",
      });

  return (
    <div
      className="min-h-screen pb-40 rr-bg-cream-warm"
      data-testid="integration-health-page"
    >
      <header className="px-5 pb-7 pt-14 rr-bg-navy">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("integrationHealth.back", {
            defaultValue: "Back to administration",
          })}
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="rr-text-gold" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] rr-text-gold">
                {t("integrationHealth.eyebrow", {
                  defaultValue: "Live operations",
                })}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {t("integrationHealth.title", {
                defaultValue: "Integration health",
              })}
            </h1>
            <p className="mt-1 max-w-3xl text-base text-white/85">
              {t("integrationHealth.subtitle", {
                defaultValue:
                  "Bounded, read-only checks for the database and connected delivery services. Refreshes every 15 seconds while this page is open.",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => snapshot.refetch()}
            disabled={snapshot.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              className={snapshot.isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {t("integrationHealth.refresh", { defaultValue: "Refresh now" })}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
        {snapshot.error || !data ? (
          <section
            role="alert"
            className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-900"
          >
            <h2 className="text-lg font-black">
              {t("integrationHealth.loadError.title", {
                defaultValue: "Health data is unavailable",
              })}
            </h2>
            <p className="mt-1 text-sm font-medium">
              {t("integrationHealth.loadError.body", {
                defaultValue:
                  "No status is inferred from missing data. Use Refresh now to retry the bounded checks.",
              })}
            </p>
          </section>
        ) : (
          <>
            <section
              aria-live="polite"
              aria-labelledby="integration-health-summary-title"
              className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderColor:
                  data.overallStatus === "healthy"
                    ? "oklch(0.76 0.12 145)"
                    : data.overallStatus === "degraded"
                      ? "oklch(0.83 0.10 80)"
                      : "oklch(0.78 0.14 27)",
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
                    data.overallStatus === "healthy"
                      ? "bg-emerald-700"
                      : data.overallStatus === "degraded"
                        ? "bg-amber-700"
                        : "bg-red-700"
                  }`}
                >
                  {data.overallStatus === "healthy" ? (
                    <CheckCircle2 size={22} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={22} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <h2
                    id="integration-health-summary-title"
                    className="text-lg font-black rr-text-navy"
                  >
                    {t("integrationHealth.summary.title", {
                      defaultValue: "Current system status",
                    })}
                  </h2>
                  <p className="mt-0.5 text-sm rr-text-navy-muted">{summary}</p>
                </div>
              </div>
              <div className="text-sm sm:text-right">
                <HealthStatusPill status={data.overallStatus} />
                <p className="mt-1 font-medium rr-text-navy-muted">
                  {t("integrationHealth.summary.checked", {
                    defaultValue: "Checked {{time}} · {{duration}} ms",
                    time: dateTime.format(new Date(data.checkedAt)),
                    duration: data.durationMs,
                  })}
                </p>
              </div>
            </section>

            <section
              aria-label={t("integrationHealth.cards.label", {
                defaultValue: "Integration health checks",
              })}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <HealthCard
                icon={Database}
                title={t("integrationHealth.cards.database", {
                  defaultValue: "Database connection",
                })}
                component={data.database}
              />
              <HealthCard
                icon={Radio}
                title={t("integrationHealth.cards.heartbeat", {
                  defaultValue: "Background heartbeats",
                })}
                component={data.heartbeat}
              />
              <HealthCard
                icon={WalletCards}
                title={t("integrationHealth.cards.stripe", {
                  defaultValue: "Stripe API",
                })}
                component={data.stripe}
              />
              <HealthCard
                icon={Mail}
                title={t("integrationHealth.cards.emailRelay", {
                  defaultValue: "Email relay",
                })}
                component={data.emailRelay}
              />
              <HealthCard
                icon={ServerCog}
                title={t("integrationHealth.cards.sources", {
                  defaultValue: "Inbound sources",
                })}
                component={data.sources}
                footer={t("integrationHealth.cards.sourcesFooter", {
                  defaultValue: "{{healthy}} healthy · {{attention}} attention",
                  healthy: data.sources.healthy,
                  attention: data.sources.delayed + data.sources.failing,
                })}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
