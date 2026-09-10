import BrandLockup from "@/components/BrandLockup";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

const DAY_MS = 24 * 60 * 60 * 1000;
type OutcomeFilter = "all" | "clean" | "attention" | "failed";
type SecurityAuditOutcome = Exclude<OutcomeFilter, "all">;
type SecurityAuditValidationStatus = "passed" | "failed" | "not_run";
type Report = {
  id: number;
  outcome: SecurityAuditOutcome;
  productionInfoCount: number;
  productionLowCount: number;
  productionModerateCount: number;
  productionHighCount: number;
  productionCriticalCount: number;
  fullInfoCount: number;
  fullLowCount: number;
  fullModerateCount: number;
  fullHighCount: number;
  fullCriticalCount: number;
  updatedPackageCount: number;
  testStatus: SecurityAuditValidationStatus;
  buildStatus: SecurityAuditValidationStatus;
  failureSummary: string | null;
  runUrl: string;
  runNumber: number;
  eventAt: number;
};

function outcomeStyle(outcome: Report["outcome"]) {
  if (outcome === "clean") {
    return {
      icon: CheckCircle2,
      className: "bg-emerald-100 text-emerald-800",
    };
  }
  if (outcome === "attention") {
    return {
      icon: AlertTriangle,
      className: "bg-amber-100 text-amber-900",
    };
  }
  return { icon: XCircle, className: "bg-red-100 text-red-800" };
}

function validationStyle(status: Report["testStatus"]) {
  if (status === "passed") return "text-emerald-700";
  if (status === "failed") return "text-red-700";
  return "rr-text-navy-muted";
}

function devOnlyTotal(report: Report) {
  return Math.max(
    0,
    report.fullInfoCount +
      report.fullLowCount +
      report.fullModerateCount +
      report.fullHighCount +
      report.fullCriticalCount -
      report.productionInfoCount -
      report.productionLowCount -
      report.productionModerateCount -
      report.productionHighCount -
      report.productionCriticalCount
  );
}

function OutcomeBadge({
  outcome,
  label,
}: {
  outcome: Report["outcome"];
  label: string;
}) {
  const { icon: Icon, className } = outcomeStyle(outcome);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${className}`}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function AdminSecurityAudits() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const now = useMemo(() => Date.now(), []);
  const [days, setDays] = useState<30 | 90 | 365>(365);
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [navigate, user]);

  const queryInput = useMemo(
    () => ({
      fromMs: now - (days - 1) * DAY_MS,
      toMs: now,
      outcome: outcome === "all" ? undefined : outcome,
      limit: 100,
    }),
    [days, now, outcome]
  );

  const dashboard = trpc.securityAudits.dashboard.useQuery(queryInput, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const locale = i18n.resolvedLanguage || i18n.language || undefined;
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale]
  );

  const labelForOutcome = (value: Report["outcome"]) =>
    t(`securityAudits.outcome.${value}`, {
      defaultValue:
        value === "clean"
          ? "Clean"
          : value === "attention"
            ? "Attention needed"
            : "Report failed",
    });
  const labelForValidation = (value: Report["testStatus"]) =>
    t(`securityAudits.validation.${value}`, {
      defaultValue:
        value === "passed"
          ? "Passed"
          : value === "failed"
            ? "Failed"
            : "Not run",
    });

  if (!isAuthenticated || !user) return null;
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm">
        <div className="px-6 text-center">
          <ShieldAlert
            size={48}
            className="mx-auto mb-3 text-red-700"
            aria-hidden="true"
          />
          <h1 className="rr-h3 rr-text-navy">
            {t("securityAudits.accessDenied", {
              defaultValue: "Access denied",
            })}
          </h1>
          <p className="mt-1 rr-b2 rr-text-navy-muted">
            {t("securityAudits.adminOnly", {
              defaultValue: "Administrator access is required.",
            })}
          </p>
        </div>
      </div>
    );
  }

  const latest = (dashboard.data?.latest ?? null) as Report | null;
  const history = (dashboard.data?.history ?? []) as Report[];

  return (
    <div
      className="min-h-screen overflow-x-hidden pb-40 rr-bg-cream-warm"
      data-testid="security-audits-page"
    >
      <header className="px-5 pb-7 pt-12 rr-bg-navy sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("securityAudits.backToAdmin", {
            defaultValue: "Back to administration",
          })}
        </button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <BrandLockup
              tone="split"
              iconClassName="h-8 w-8"
              textClassName="text-sm"
            />
            <h1 className="rr-h1 mt-5 rr-on-dark">
              {t("securityAudits.title", {
                defaultValue: "Security audit history",
              })}
            </h1>
            <p className="mt-2 max-w-3xl rr-b2 rr-on-dark-secondary">
              {t("securityAudits.description", {
                defaultValue:
                  "Monthly production and full dependency audit summaries from verified GitHub Actions. Raw logs and advisory details are intentionally not retained here.",
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
            {t("securityAudits.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5">
        <section
          aria-labelledby="security-audit-filters"
          className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <p className="rr-h6 rr-text-navy-muted">
              {t("securityAudits.filterEyebrow", {
                defaultValue: "Reporting window",
              })}
            </p>
            <h2 id="security-audit-filters" className="rr-h3 rr-text-navy">
              {t("securityAudits.filterTitle", {
                defaultValue: "Filter audit history",
              })}
            </h2>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="rr-l2 rr-text-navy">
                {t("securityAudits.range", { defaultValue: "Date range" })}
              </span>
              <select
                value={days}
                onChange={event =>
                  setDays(Number(event.target.value) as 30 | 90 | 365)
                }
                className="min-h-11 rounded-lg border border-border bg-background px-3 rr-b2 rr-text-navy focus:outline-none focus:ring-2 focus:ring-ring"
                name="rr-pages-admin-security-audits-days-261"
              >
                <option value={30}>
                  {t("securityAudits.lastDays", {
                    count: 30,
                    defaultValue: "Last 30 days",
                  })}
                </option>
                <option value={90}>
                  {t("securityAudits.lastDays", {
                    count: 90,
                    defaultValue: "Last 90 days",
                  })}
                </option>
                <option value={365}>
                  {t("securityAudits.lastDays", {
                    count: 365,
                    defaultValue: "Last 365 days",
                  })}
                </option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="rr-l2 rr-text-navy">
                {t("securityAudits.outcomeFilter", { defaultValue: "Outcome" })}
              </span>
              <select
                value={outcome}
                onChange={event =>
                  setOutcome(event.target.value as OutcomeFilter)
                }
                className="min-h-11 rounded-lg border border-border bg-background px-3 rr-b2 rr-text-navy focus:outline-none focus:ring-2 focus:ring-ring"
                name="rr-pages-admin-security-audits-outcome-292"
              >
                <option value="all">
                  {t("securityAudits.outcome.all", {
                    defaultValue: "All outcomes",
                  })}
                </option>
                <option value="clean">{labelForOutcome("clean")}</option>
                <option value="attention">
                  {labelForOutcome("attention")}
                </option>
                <option value="failed">{labelForOutcome("failed")}</option>
              </select>
            </label>
          </div>
        </section>

        {dashboard.isLoading ? (
          <section
            className="flex min-h-48 items-center justify-center rounded-2xl bg-white p-6 shadow-sm"
            aria-live="polite"
          >
            <Loader2
              className="animate-spin rr-text-gold"
              size={28}
              aria-hidden="true"
            />
            <span className="sr-only">
              {t("securityAudits.loading", {
                defaultValue: "Loading audit history",
              })}
            </span>
          </section>
        ) : dashboard.isError ? (
          <section
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert size={22} aria-hidden="true" />
              <div>
                <h2 className="rr-h4">
                  {t("securityAudits.loadErrorTitle", {
                    defaultValue: "Audit history is temporarily unavailable",
                  })}
                </h2>
                <p className="mt-1 rr-b2">
                  {t("securityAudits.loadErrorDescription", {
                    defaultValue: "Refresh the page or try again shortly.",
                  })}
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section
              aria-labelledby="latest-security-audit"
              className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="rr-h6 rr-text-navy-muted">
                    {t("securityAudits.latestEyebrow", {
                      defaultValue: "Latest verified report",
                    })}
                  </p>
                  <h2
                    id="latest-security-audit"
                    className="rr-h3 mt-1 rr-text-navy"
                  >
                    {t("securityAudits.latestTitle", {
                      defaultValue: "Current dependency security posture",
                    })}
                  </h2>
                </div>
                {latest && (
                  <OutcomeBadge
                    outcome={latest.outcome}
                    label={labelForOutcome(latest.outcome)}
                  />
                )}
              </div>

              {!latest ? (
                <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
                  <ShieldCheck
                    className="mx-auto mb-3 rr-text-gold"
                    size={28}
                    aria-hidden="true"
                  />
                  <p className="rr-b1 rr-text-navy">
                    {t("securityAudits.emptyLatestTitle", {
                      defaultValue: "No verified audit reports yet",
                    })}
                  </p>
                  <p className="mt-1 rr-b2 rr-text-navy-muted">
                    {t("securityAudits.emptyLatestDescription", {
                      defaultValue:
                        "The first scheduled report will appear here after its workflow completes.",
                    })}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mt-2 rr-b2 rr-text-navy-muted">
                    {t("securityAudits.auditedAt", {
                      defaultValue: "Audited {{date}}",
                      date: dateTime.format(latest.eventAt),
                    })}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-xl border border-border bg-background p-4">
                      <p className="rr-h6 rr-text-navy-muted">
                        {t("securityAudits.productionHighCritical", {
                          defaultValue: "Production high / critical",
                        })}
                      </p>
                      <p className="rr-h2 mt-2 rr-text-navy">
                        {number.format(latest.productionHighCount)} /{" "}
                        {number.format(latest.productionCriticalCount)}
                      </p>
                    </article>
                    <article className="rounded-xl border border-border bg-background p-4">
                      <p className="rr-h6 rr-text-navy-muted">
                        {t("securityAudits.devOnlyFindings", {
                          defaultValue: "Development-only findings",
                        })}
                      </p>
                      <p className="rr-h2 mt-2 rr-text-navy">
                        {number.format(devOnlyTotal(latest))}
                      </p>
                    </article>
                    <article className="rounded-xl border border-border bg-background p-4">
                      <p className="rr-h6 rr-text-navy-muted">
                        {t("securityAudits.testsBuild", {
                          defaultValue: "Tests / build",
                        })}
                      </p>
                      <p
                        className={`rr-h4 mt-2 ${validationStyle(latest.testStatus)}`}
                      >
                        {labelForValidation(latest.testStatus)} /{" "}
                        {labelForValidation(latest.buildStatus)}
                      </p>
                    </article>
                    <article className="rounded-xl border border-border bg-background p-4">
                      <p className="rr-h6 rr-text-navy-muted">
                        {t("securityAudits.packageUpdates", {
                          defaultValue: "Packages updated",
                        })}
                      </p>
                      <p className="rr-h2 mt-2 rr-text-navy">
                        {number.format(latest.updatedPackageCount)}
                      </p>
                    </article>
                  </div>
                  {latest.failureSummary && (
                    <p
                      className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 rr-b2 text-red-900"
                      role="status"
                    >
                      {latest.failureSummary}
                    </p>
                  )}
                  <a
                    href={latest.runUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-secondary px-4 rr-l1 text-secondary-foreground transition hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    {t("securityAudits.openRun", {
                      defaultValue: "Open verified workflow run",
                    })}
                  </a>
                </>
              )}
            </section>

            <section
              aria-labelledby="security-audit-history"
              className="min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-1">
                <p className="rr-h6 rr-text-navy-muted">
                  {t("securityAudits.historyEyebrow", {
                    defaultValue: "Verified records",
                  })}
                </p>
                <h2 id="security-audit-history" className="rr-h3 rr-text-navy">
                  {t("securityAudits.historyTitle", {
                    defaultValue: "Audit history",
                  })}
                </h2>
              </div>
              {history.length === 0 ? (
                <p className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center rr-b2 rr-text-navy-muted">
                  {t("securityAudits.emptyHistory", {
                    defaultValue:
                      "No verified audit reports match these filters yet.",
                  })}
                </p>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 lg:hidden">
                    {history.map(report => (
                      <article
                        key={report.id}
                        className="rounded-xl border border-border bg-background p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="rr-h6 rr-text-navy-muted">
                              {t("securityAudits.table.audited", {
                                defaultValue: "Audited",
                              })}
                            </p>
                            <p className="mt-1 rr-b2 rr-text-navy">
                              {dateTime.format(report.eventAt)}
                            </p>
                          </div>
                          <OutcomeBadge
                            outcome={report.outcome}
                            label={labelForOutcome(report.outcome)}
                          />
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                          <div>
                            <dt className="rr-h6 rr-text-navy-muted">
                              {t("securityAudits.table.production", {
                                defaultValue: "Production H / C",
                              })}
                            </dt>
                            <dd className="mt-1 rr-b2 rr-text-navy">
                              {number.format(report.productionHighCount)} /{" "}
                              {number.format(report.productionCriticalCount)}
                            </dd>
                          </div>
                          <div>
                            <dt className="rr-h6 rr-text-navy-muted">
                              {t("securityAudits.table.devOnly", {
                                defaultValue: "Dev-only",
                              })}
                            </dt>
                            <dd className="mt-1 rr-b2 rr-text-navy">
                              {number.format(devOnlyTotal(report))}
                            </dd>
                          </div>
                          <div>
                            <dt className="rr-h6 rr-text-navy-muted">
                              {t("securityAudits.table.validation", {
                                defaultValue: "Tests / build",
                              })}
                            </dt>
                            <dd
                              className={`mt-1 rr-b2 font-bold ${validationStyle(report.testStatus)}`}
                            >
                              {labelForValidation(report.testStatus)} /{" "}
                              {labelForValidation(report.buildStatus)}
                            </dd>
                          </div>
                          <div>
                            <dt className="rr-h6 rr-text-navy-muted">
                              {t("securityAudits.table.updates", {
                                defaultValue: "Updates",
                              })}
                            </dt>
                            <dd className="mt-1 rr-b2 rr-text-navy">
                              {number.format(report.updatedPackageCount)}
                            </dd>
                          </div>
                        </dl>
                        <a
                          href={report.runUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 rr-l1 rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={t("securityAudits.openRunAria", {
                            defaultValue: "Open workflow run {{number}}",
                            number: report.runNumber,
                          })}
                        >
                          <ExternalLink size={17} aria-hidden="true" />
                          {t("securityAudits.openRun", {
                            defaultValue: "Open verified workflow run",
                          })}
                        </a>
                      </article>
                    ))}
                  </div>
                  <div className="mt-5 hidden lg:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border rr-h6 rr-text-navy-muted">
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.audited", {
                              defaultValue: "Audited",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.outcome", {
                              defaultValue: "Outcome",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.production", {
                              defaultValue: "Production H / C",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.devOnly", {
                              defaultValue: "Dev-only",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.validation", {
                              defaultValue: "Tests / build",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            {t("securityAudits.table.updates", {
                              defaultValue: "Updates",
                            })}
                          </th>
                          <th scope="col" className="px-3 py-3">
                            <span className="sr-only">
                              {t("securityAudits.table.run", {
                                defaultValue: "Run",
                              })}
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(report => (
                          <tr
                            key={report.id}
                            className="border-b border-border/70 last:border-0"
                          >
                            <td className="px-3 py-4 rr-b2 rr-text-navy">
                              {dateTime.format(report.eventAt)}
                            </td>
                            <td className="px-3 py-4">
                              <OutcomeBadge
                                outcome={report.outcome}
                                label={labelForOutcome(report.outcome)}
                              />
                            </td>
                            <td className="px-3 py-4 rr-b2 rr-text-navy">
                              {number.format(report.productionHighCount)} /{" "}
                              {number.format(report.productionCriticalCount)}
                            </td>
                            <td className="px-3 py-4 rr-b2 rr-text-navy">
                              {number.format(devOnlyTotal(report))}
                            </td>
                            <td
                              className={`px-3 py-4 rr-b2 font-bold ${validationStyle(report.testStatus)}`}
                            >
                              {labelForValidation(report.testStatus)} /{" "}
                              {labelForValidation(report.buildStatus)}
                            </td>
                            <td className="px-3 py-4 rr-b2 rr-text-navy">
                              {number.format(report.updatedPackageCount)}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <a
                                href={report.runUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={t("securityAudits.openRunAria", {
                                  defaultValue: "Open workflow run {{number}}",
                                  number: report.runNumber,
                                })}
                              >
                                <ExternalLink size={17} aria-hidden="true" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
