import { useAuth } from "@/_core/hooks/useAuth";
import AutomationAcknowledgementHistory from "@/components/AutomationAcknowledgementHistory";
import AutomationRunDetailsDialog, {
  type AutomationRunSelection,
} from "@/components/AutomationRunDetailsDialog";
import { trpc } from "@/lib/trpc";
import type { TFunction } from "i18next";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GitMerge,
  Loader2,
  MousePointer2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import { useLocation } from "wouter";

type RangePreset = 7 | 30 | 90 | "custom";
type KindFilter = "all" | "drift_audit" | "dependabot_merge";
type ResultFilter = "all" | "success" | "failure";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_MS = 366 * DAY_MS;

function toInputDate(value: number) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(value - offset).toISOString().slice(0, 10);
}

function startOfInputDate(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfInputDate(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime();
}

function formatDuration(value: number | null, notAvailable: string) {
  if (value === null) return notAvailable;
  const minutes = Math.max(1, Math.round(value / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${remainingMinutes}m`;
  return `${remainingMinutes}m`;
}

export default function AdminAutomationHealth() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const now = useMemo(() => Date.now(), []);
  const [preset, setPreset] = useState<RangePreset>(90);
  const [fromDate, setFromDate] = useState(() =>
    toInputDate(now - 89 * DAY_MS)
  );
  const [toDate, setToDate] = useState(() => toInputDate(now));
  const [kind, setKind] = useState<KindFilter>("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [runSelection, setRunSelection] =
    useState<AutomationRunSelection>(null);

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [navigate, user]);

  const selectedRange = useMemo(() => {
    if (preset === "custom") {
      return {
        fromMs: startOfInputDate(fromDate),
        toMs: Math.min(endOfInputDate(toDate), now),
      };
    }
    return {
      fromMs: now - (preset - 1) * DAY_MS,
      toMs: now,
    };
  }, [fromDate, now, preset, toDate]);

  const rangeError =
    selectedRange.fromMs > selectedRange.toMs
      ? t("automationHealth.filters.invalidOrder", {
          defaultValue: "The end date must be on or after the start date.",
        })
      : selectedRange.toMs - selectedRange.fromMs > MAX_RANGE_MS
        ? t("automationHealth.filters.rangeTooLong", {
            defaultValue: "Choose a range of 366 days or fewer.",
          })
        : null;

  const queryInput = useMemo(
    () => ({
      fromMs: selectedRange.fromMs,
      toMs: selectedRange.toMs,
      kind: kind === "all" ? undefined : kind,
      result: result === "all" ? undefined : result,
      limit: 75,
    }),
    [kind, result, selectedRange.fromMs, selectedRange.toMs]
  );

  const dashboard = trpc.automationHealth.dashboard.useQuery(queryInput, {
    enabled: user?.role === "admin" && !rangeError,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const locale = i18n.resolvedLanguage || i18n.language || undefined;
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }),
    [locale]
  );
  const shortDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }),
    [locale]
  );
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  const chartData = useMemo(
    () =>
      (dashboard.data?.daily ?? []).map(point => ({
        ...point,
        label: shortDate.format(new Date(`${point.date}T00:00:00Z`)),
      })),
    [dashboard.data?.daily, shortDate]
  );

  if (!isAuthenticated || !user) return null;
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm">
        <div className="px-6 text-center">
          <ShieldAlert size={48} className="mx-auto mb-3 text-red-700" />
          <h1 className="text-xl font-black rr-text-navy">
            {t("automationHealth.accessDenied", {
              defaultValue: "Access denied",
            })}
          </h1>
          <p className="mt-1 text-sm rr-text-navy-muted">
            {t("automationHealth.adminOnly", {
              defaultValue: "Administrator access is required.",
            })}
          </p>
        </div>
      </div>
    );
  }

  const latest = dashboard.data?.drift.latest;
  const successRate = dashboard.data?.drift.successRate;

  return (
    <div
      className="min-h-screen pb-40 rr-bg-cream-warm"
      data-testid="automation-health-page"
    >
      <header className="px-5 pb-7 pt-14 rr-bg-navy">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("automationHealth.back", {
            defaultValue: "Back to administration",
          })}
        </button>
        <div className="flex items-center gap-2">
          <Star size={16} className="rr-text-gold" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] rr-text-gold">
            Get Phame
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {t("automationHealth.title", {
                defaultValue: "Automation health",
              })}
            </h1>
            <p className="mt-1 max-w-3xl text-base text-white/85">
              {t("automationHealth.subtitle", {
                defaultValue:
                  "Dependabot merge performance and workflow drift-audit history from verified GitHub Actions events.",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dashboard.refetch()}
            disabled={dashboard.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              className={dashboard.isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {t("automationHealth.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5">
        <section
          aria-labelledby="automation-filters-title"
          className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
              {t("automationHealth.filters.eyebrow", {
                defaultValue: "Reporting window",
              })}
            </p>
            <h2
              id="automation-filters-title"
              className="text-xl font-semibold rr-text-navy"
            >
              {t("automationHealth.filters.title", {
                defaultValue: "Filter operational history",
              })}
            </h2>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr]">
            <fieldset>
              <legend className="mb-2 text-sm font-black rr-text-navy">
                {t("automationHealth.filters.range", {
                  defaultValue: "Date range",
                })}
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([7, 30, 90] as const).map(days => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={preset === days}
                    onClick={() => setPreset(days)}
                    className={`min-h-11 rounded-xl px-3 text-sm font-black transition active:scale-[0.97] ${preset === days ? "rr-bg-navy text-white" : "bg-slate-100 rr-text-navy"}`}
                  >
                    {t("automationHealth.filters.days", {
                      count: days,
                      defaultValue: `${days} days`,
                    })}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={preset === "custom"}
                  onClick={() => setPreset("custom")}
                  className={`min-h-11 rounded-xl px-3 text-sm font-black transition active:scale-[0.97] ${preset === "custom" ? "rr-bg-navy text-white" : "bg-slate-100 rr-text-navy"}`}
                >
                  {t("automationHealth.filters.custom", {
                    defaultValue: "Custom",
                  })}
                </button>
              </div>
              {preset === "custom" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-bold rr-text-navy">
                    {t("automationHealth.filters.from", {
                      defaultValue: "From",
                    })}
                    <input
                      type="date"
                      value={fromDate}
                      max={toDate}
                      onChange={event => setFromDate(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                     name="rr-pages-admin-automation-health-from-date-303" />
                  </label>
                  <label className="text-sm font-bold rr-text-navy">
                    {t("automationHealth.filters.to", { defaultValue: "To" })}
                    <input
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={toInputDate(now)}
                      onChange={event => setToDate(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                     name="rr-pages-admin-automation-health-to-date-313" />
                  </label>
                </div>
              )}
              {rangeError && (
                <p role="alert" className="mt-2 text-sm font-bold text-red-700">
                  {rangeError}
                </p>
              )}
            </fieldset>

            <label className="text-sm font-black rr-text-navy">
              {t("automationHealth.filters.eventType", {
                defaultValue: "Event type",
              })}
              <select
                value={kind}
                onChange={event => setKind(event.target.value as KindFilter)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
               name="rr-pages-admin-automation-health-kind-335">
                <option value="all">
                  {t("automationHealth.filters.allEvents", {
                    defaultValue: "All events",
                  })}
                </option>
                <option value="drift_audit">
                  {t("automationHealth.kind.driftAudit", {
                    defaultValue: "Drift audit",
                  })}
                </option>
                <option value="dependabot_merge">
                  {t("automationHealth.kind.dependabotMerge", {
                    defaultValue: "Dependabot merge",
                  })}
                </option>
              </select>
            </label>

            <label className="text-sm font-black rr-text-navy">
              {t("automationHealth.filters.result", { defaultValue: "Result" })}
              <select
                value={result}
                onChange={event =>
                  setResult(event.target.value as ResultFilter)
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
               name="rr-pages-admin-automation-health-result-360">
                <option value="all">
                  {t("automationHealth.filters.allResults", {
                    defaultValue: "All results",
                  })}
                </option>
                <option value="success">
                  {t("automationHealth.result.success", {
                    defaultValue: "Successful",
                  })}
                </option>
                <option value="failure">
                  {t("automationHealth.result.failure", {
                    defaultValue: "Failed",
                  })}
                </option>
              </select>
            </label>
          </div>
        </section>

        {dashboard.isLoading && (
          <div className="flex min-h-48 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Loader2
              className="animate-spin rr-text-navy"
              size={32}
              aria-label={t("automationHealth.loading", {
                defaultValue: "Loading automation health",
              })}
            />
          </div>
        )}

        {dashboard.error && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800"
          >
            {t("automationHealth.loadError", {
              defaultValue: "Automation health data could not be loaded.",
            })}{" "}
            {dashboard.error.message}
          </div>
        )}

        {dashboard.data && (
          <>
            <section
              aria-label={t("automationHealth.metrics.title", {
                defaultValue: "Key automation metrics",
              })}
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              <MetricCard
                icon={<GitMerge size={20} aria-hidden="true" />}
                label={t("automationHealth.metrics.merges", {
                  defaultValue: "Dependabot merges",
                })}
                value={number.format(dashboard.data.dependabot.mergedCount)}
                detail={t("automationHealth.metrics.mergesDetail", {
                  defaultValue: "Merged dependency pull requests",
                })}
              />
              <MetricCard
                icon={<Clock3 size={20} aria-hidden="true" />}
                label={t("automationHealth.metrics.averageMerge", {
                  defaultValue: "Average merge time",
                })}
                value={formatDuration(
                  dashboard.data.dependabot.averageMergeDurationMs,
                  t("automationHealth.notAvailable", { defaultValue: "N/A" })
                )}
                detail={t("automationHealth.metrics.medianMerge", {
                  value: formatDuration(
                    dashboard.data.dependabot.medianMergeDurationMs,
                    t("automationHealth.notAvailable", { defaultValue: "N/A" })
                  ),
                  defaultValue: `Median ${formatDuration(dashboard.data.dependabot.medianMergeDurationMs, "N/A")}`,
                })}
              />
              <MetricCard
                icon={<ShieldCheck size={20} aria-hidden="true" />}
                label={t("automationHealth.metrics.driftSuccess", {
                  defaultValue: "Drift success rate",
                })}
                value={
                  successRate == null
                    ? t("automationHealth.notAvailable", {
                        defaultValue: "N/A",
                      })
                    : percent.format(successRate)
                }
                detail={t("automationHealth.metrics.auditCount", {
                  count: dashboard.data.drift.auditCount,
                  defaultValue: `${number.format(dashboard.data.drift.auditCount)} audits in range`,
                })}
                alert={dashboard.data.drift.failureCount > 0}
              />
              <MetricCard
                icon={
                  latest?.result === "failure" ? (
                    <AlertTriangle size={20} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={20} aria-hidden="true" />
                  )
                }
                label={t("automationHealth.metrics.latestDrift", {
                  defaultValue: "Latest drift audit",
                })}
                value={
                  latest
                    ? latest.result === "success"
                      ? t("automationHealth.result.success", {
                          defaultValue: "Successful",
                        })
                      : t("automationHealth.result.failure", {
                          defaultValue: "Failed",
                        })
                    : t("automationHealth.noData", { defaultValue: "No data" })
                }
                detail={
                  latest
                    ? dateTime.format(new Date(latest.eventAt))
                    : t("automationHealth.metrics.awaiting", {
                        defaultValue: "Awaiting the first verified event",
                      })
                }
                alert={latest?.result === "failure"}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <ChartPanel
                title={t("automationHealth.charts.driftTitle", {
                  defaultValue: "Drift-audit outcomes",
                })}
                description={t("automationHealth.charts.driftDescription", {
                  defaultValue: "Daily verified successes and failures",
                })}
                interactionHint={t("automationHealth.charts.interactionHint", {
                  defaultValue:
                    "Hover over a point, or focus the chart and use the arrow keys, to inspect daily values.",
                })}
                summary={t("automationHealth.charts.driftSummary", {
                  audits: number.format(dashboard.data.drift.auditCount),
                  failures: number.format(dashboard.data.drift.failureCount),
                  rate:
                    successRate == null
                      ? t("automationHealth.notAvailable", {
                          defaultValue: "N/A",
                        })
                      : percent.format(successRate),
                  defaultValue: `${number.format(dashboard.data.drift.auditCount)} audits · ${number.format(dashboard.data.drift.failureCount)} failed · ${successRate == null ? "N/A" : percent.format(successRate)} pass rate`,
                })}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7dde6" />
                    <XAxis
                      dataKey="label"
                      minTickGap={24}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      isAnimationActive="auto"
                      cursor={{ fill: "#f1f5f9" }}
                      wrapperStyle={{ pointerEvents: "auto" }}
                      content={props => (
                        <DriftChartTooltip
                          {...props}
                          t={t}
                          numberFormatter={number}
                          percentFormatter={percent}
                          onOpen={date =>
                            setRunSelection({ date, kind: "drift_audit" })
                          }
                        />
                      )}
                    />
                    <Legend />
                    <Bar
                      dataKey="driftSuccesses"
                      stackId="drift"
                      name={t("automationHealth.result.success", {
                        defaultValue: "Successful",
                      })}
                      fill="#15803d"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="driftFailures"
                      stackId="drift"
                      name={t("automationHealth.result.failure", {
                        defaultValue: "Failed",
                      })}
                      fill="#b91c1c"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                title={t("automationHealth.charts.mergesTitle", {
                  defaultValue: "Dependabot merges",
                })}
                description={t("automationHealth.charts.mergesDescription", {
                  defaultValue: "Successfully merged dependency updates by day",
                })}
                interactionHint={t("automationHealth.charts.interactionHint", {
                  defaultValue:
                    "Hover over a point, or focus the chart and use the arrow keys, to inspect daily values.",
                })}
                summary={t("automationHealth.charts.mergeSummary", {
                  count: number.format(dashboard.data.dependabot.mergedCount),
                  duration: formatDuration(
                    dashboard.data.dependabot.averageMergeDurationMs,
                    t("automationHealth.notAvailable", { defaultValue: "N/A" })
                  ),
                  defaultValue: `${number.format(dashboard.data.dependabot.mergedCount)} merges · ${formatDuration(dashboard.data.dependabot.averageMergeDurationMs, "N/A")} average merge time`,
                })}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    accessibilityLayer
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d7dde6" />
                    <XAxis
                      dataKey="label"
                      minTickGap={24}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      isAnimationActive="auto"
                      cursor={{ stroke: "#64748b", strokeDasharray: "4 4" }}
                      wrapperStyle={{ pointerEvents: "auto" }}
                      content={props => (
                        <MergeChartTooltip
                          {...props}
                          t={t}
                          numberFormatter={number}
                          percentFormatter={percent}
                          rangeTotal={dashboard.data.dependabot.mergedCount}
                          onOpen={date =>
                            setRunSelection({
                              date,
                              kind: "dependabot_merge",
                            })
                          }
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="dependabotMerges"
                      name={t("automationHealth.metrics.merges", {
                        defaultValue: "Dependabot merges",
                      })}
                      stroke="#9a6a05"
                      strokeWidth={3}
                      dot={{ r: 2, fill: "#9a6a05" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartPanel>
            </section>

            <AutomationAcknowledgementHistory />

            <section
              aria-labelledby="automation-history-title"
              className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                    {t("automationHealth.history.eyebrow", {
                      defaultValue: "Audit trail",
                    })}
                  </p>
                  <h2
                    id="automation-history-title"
                    className="mt-1 text-xl font-semibold rr-text-navy"
                  >
                    {t("automationHealth.history.title", {
                      defaultValue: "Verified event history",
                    })}
                  </h2>
                </div>
                <p className="text-xs font-medium rr-text-navy-muted">
                  {t("automationHealth.history.source", {
                    defaultValue:
                      "Source: GitHub Actions OIDC · SteveKinzey/getphame",
                  })}
                </p>
              </div>

              {dashboard.data.history.length === 0 ? (
                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-10 text-center">
                  <Activity
                    size={32}
                    className="mx-auto rr-text-navy-muted"
                    aria-hidden="true"
                  />
                  <p className="mt-2 font-black rr-text-navy">
                    {t("automationHealth.history.empty", {
                      defaultValue: "No verified events match these filters.",
                    })}
                  </p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.1em] rr-text-navy-muted">
                        <th
                          scope="col"
                          className="border-b border-slate-200 px-3 py-3"
                        >
                          {t("automationHealth.history.event", {
                            defaultValue: "Event",
                          })}
                        </th>
                        <th
                          scope="col"
                          className="border-b border-slate-200 px-3 py-3"
                        >
                          {t("automationHealth.history.result", {
                            defaultValue: "Result",
                          })}
                        </th>
                        <th
                          scope="col"
                          className="border-b border-slate-200 px-3 py-3"
                        >
                          {t("automationHealth.history.detected", {
                            defaultValue: "Detected",
                          })}
                        </th>
                        <th
                          scope="col"
                          className="border-b border-slate-200 px-3 py-3"
                        >
                          {t("automationHealth.history.details", {
                            defaultValue: "Details",
                          })}
                        </th>
                        <th
                          scope="col"
                          className="border-b border-slate-200 px-3 py-3"
                        >
                          {t("automationHealth.history.run", {
                            defaultValue: "Run",
                          })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.history.map(event => (
                        <tr key={event.id} className="align-top">
                          <td className="border-b border-slate-100 px-3 py-3 font-black rr-text-navy">
                            {event.kind === "drift_audit"
                              ? t("automationHealth.kind.driftAudit", {
                                  defaultValue: "Drift audit",
                                })
                              : t("automationHealth.kind.dependabotMerge", {
                                  defaultValue: "Dependabot merge",
                                })}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${event.result === "success" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                            >
                              {event.result === "success"
                                ? t("automationHealth.result.success", {
                                    defaultValue: "Successful",
                                  })
                                : t("automationHealth.result.failure", {
                                    defaultValue: "Failed",
                                  })}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3 font-medium rr-text-navy-muted">
                            {dateTime.format(new Date(event.eventAt))}
                          </td>
                          <td className="max-w-xs border-b border-slate-100 px-3 py-3 font-medium rr-text-navy-muted">
                            {event.failureSummary ||
                              (event.pullRequestNumber
                                ? t("automationHealth.history.pullRequest", {
                                    number: event.pullRequestNumber,
                                    defaultValue: `Pull request #${event.pullRequestNumber}`,
                                  })
                                : t("automationHealth.history.completed", {
                                    defaultValue: "Workflow completed",
                                  }))}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <a
                              href={event.runUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex min-h-11 items-center font-black rr-text-gold underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              #{event.runNumber}
                              <span className="sr-only">
                                {" "}
                                {t("automationHealth.history.opensNewTab", {
                                  defaultValue: "opens in a new tab",
                                })}
                              </span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <AutomationRunDetailsDialog
        selection={runSelection}
        onClose={() => setRunSelection(null)}
      />
    </div>
  );
}

type NumberTooltipProps = TooltipContentProps & {
  t: TFunction;
  numberFormatter: Intl.NumberFormat;
  percentFormatter: Intl.NumberFormat;
  onOpen: (date: string) => void;
};

function DriftChartTooltip({
  active,
  label,
  payload,
  t,
  numberFormatter,
  percentFormatter,
  onOpen,
}: NumberTooltipProps) {
  if (!active || !payload?.length) return null;
  const successes = Number(
    payload.find(entry => entry.dataKey === "driftSuccesses")?.value ?? 0
  );
  const failures = Number(
    payload.find(entry => entry.dataKey === "driftFailures")?.value ?? 0
  );
  const total = successes + failures;
  const point = payload[0]?.payload as { date?: string } | undefined;

  return (
    <div
      data-testid="automation-drift-chart-tooltip"
      role="status"
      aria-live="polite"
      className="min-w-52 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl"
    >
      <p className="font-black rr-text-navy">
        {t("automationHealth.charts.tooltipDate", {
          date: String(label ?? ""),
          defaultValue: "{{date}}",
        })}
      </p>
      <dl className="mt-2 space-y-1.5">
        <TooltipRow
          label={t("automationHealth.result.success", {
            defaultValue: "Successful",
          })}
          value={numberFormatter.format(successes)}
          tone="success"
        />
        <TooltipRow
          label={t("automationHealth.result.failure", {
            defaultValue: "Failed",
          })}
          value={numberFormatter.format(failures)}
          tone="failure"
        />
        <TooltipRow
          label={t("automationHealth.charts.dailyTotal", {
            defaultValue: "Daily total",
          })}
          value={numberFormatter.format(total)}
          bordered
        />
        <TooltipRow
          label={t("automationHealth.charts.passRate", {
            defaultValue: "Pass rate",
          })}
          value={
            total > 0
              ? percentFormatter.format(successes / total)
              : t("automationHealth.notAvailable", { defaultValue: "N/A" })
          }
        />
      </dl>
      <button
        type="button"
        disabled={!point?.date}
        onClick={() => point?.date && onOpen(point.date)}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg rr-bg-navy px-3 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
      >
        {t("automationHealth.drilldown.viewRuns", {
          defaultValue: "View daily runs",
        })}
      </button>
    </div>
  );
}

function MergeChartTooltip({
  active,
  label,
  payload,
  t,
  numberFormatter,
  percentFormatter,
  rangeTotal,
  onOpen,
}: NumberTooltipProps & { rangeTotal: number }) {
  if (!active || !payload?.length) return null;
  const merges = Number(payload[0]?.value ?? 0);
  const point = payload[0]?.payload as { date?: string } | undefined;

  return (
    <div
      data-testid="automation-merge-chart-tooltip"
      role="status"
      aria-live="polite"
      className="min-w-52 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl"
    >
      <p className="font-black rr-text-navy">
        {t("automationHealth.charts.tooltipDate", {
          date: String(label ?? ""),
          defaultValue: "{{date}}",
        })}
      </p>
      <dl className="mt-2 space-y-1.5">
        <TooltipRow
          label={t("automationHealth.metrics.merges", {
            defaultValue: "Dependabot merges",
          })}
          value={numberFormatter.format(merges)}
          tone="merge"
        />
        <TooltipRow
          label={t("automationHealth.charts.rangeShare", {
            defaultValue: "Share of selected range",
          })}
          value={
            rangeTotal > 0
              ? percentFormatter.format(merges / rangeTotal)
              : t("automationHealth.notAvailable", { defaultValue: "N/A" })
          }
          bordered
        />
      </dl>
      <button
        type="button"
        disabled={!point?.date}
        onClick={() => point?.date && onOpen(point.date)}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg rr-bg-navy px-3 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
      >
        {t("automationHealth.drilldown.viewRuns", {
          defaultValue: "View daily runs",
        })}
      </button>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  tone,
  bordered = false,
}: {
  label: string;
  value: string;
  tone?: "success" | "failure" | "merge";
  bordered?: boolean;
}) {
  const toneClasses = {
    success: "bg-emerald-700",
    failure: "bg-red-700",
    merge: "bg-amber-700",
  };

  return (
    <div
      className={`flex items-center justify-between gap-5 ${bordered ? "border-t border-slate-200 pt-1.5" : ""}`}
    >
      <dt className="inline-flex items-center gap-2 font-bold rr-text-navy-muted">
        {tone && (
          <span
            className={`size-2 rounded-full ${toneClasses[tone]}`}
            aria-hidden="true"
          />
        )}
        {label}
      </dt>
      <dd className="font-black rr-text-navy">{value}</dd>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 shadow-sm ${alert ? "border-red-300 bg-red-50" : "border-transparent bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] rr-text-navy-muted">
            {label}
          </p>
          <p
            className={`mt-1 truncate text-3xl font-black ${alert ? "text-red-800" : "rr-text-navy"}`}
          >
            {value}
          </p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${alert ? "bg-red-700" : "rr-bg-navy"}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium rr-text-navy-muted">{detail}</p>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  interactionHint,
  summary,
  children,
}: {
  title: string;
  description: string;
  interactionHint: string;
  summary: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <section
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
    >
      <h2 id={titleId} className="text-xl font-semibold rr-text-navy">
        {title}
      </h2>
      <p
        id={descriptionId}
        className="mt-1 text-sm font-medium rr-text-navy-muted"
      >
        {description}
      </p>
      <div className="mt-4 h-[300px] w-full">{children}</div>
      <p className="mt-3 flex items-start gap-2 text-xs font-semibold rr-text-navy-muted">
        <MousePointer2
          size={14}
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        {interactionHint}
      </p>
      <p className="mt-2 border-t border-slate-200 pt-2 text-sm font-bold rr-text-navy">
        {summary}
      </p>
    </section>
  );
}
