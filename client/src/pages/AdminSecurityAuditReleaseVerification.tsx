import BrandLockup from "@/components/BrandLockup";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileCheck2,
  GitBranch,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

const evidenceIcon = {
  "github-release": GitBranch,
  "ingestion-auth": ShieldCheck,
  "admin-reporting-auth": LockKeyhole,
  "schema-readiness": Database,
  "admin-ui": FileCheck2,
} as const;

export default function AdminSecurityAuditReleaseVerification() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin";

  const release = trpc.securityAuditReleaseVerification.dashboard.useQuery(
    undefined,
    {
      enabled: isAdmin,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  );
  const auditHistory = trpc.securityAudits.dashboard.useQuery(
    { limit: 10 },
    {
      enabled: isAdmin,
      retry: false,
      staleTime: 60_000,
    }
  );

  useEffect(() => {
    if (user && !isAdmin) navigate("/");
  }, [isAdmin, navigate, user]);

  if (!isAuthenticated || !user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm px-5">
        <div className="max-w-sm text-center">
          <ShieldAlert
            size={48}
            className="mx-auto mb-3 text-red-700"
            aria-hidden="true"
          />
          <h1 className="rr-h3 rr-text-navy">
            {t("securityAuditReleaseVerification.accessDenied", {
              defaultValue: "Access denied",
            })}
          </h1>
          <p className="mt-1 rr-b2 rr-text-navy-muted">
            {t("securityAuditReleaseVerification.adminOnly", {
              defaultValue: "Administrator access is required.",
            })}
          </p>
        </div>
      </div>
    );
  }

  if (release.isLoading) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center rr-bg-cream-warm"
        data-testid="security-audit-release-verification-loading"
      >
        <Loader2
          className="animate-spin rr-text-navy"
          size={34}
          aria-label={t("securityAuditReleaseVerification.loading", {
            defaultValue: "Loading release verification",
          })}
        />
      </div>
    );
  }

  if (release.error || !release.data) {
    return (
      <div className="min-h-screen rr-bg-cream-warm px-5 py-12">
        <div
          className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm"
          role="alert"
        >
          <AlertTriangle
            className="mx-auto text-rose-600"
            size={30}
            aria-hidden="true"
          />
          <h1 className="mt-3 text-xl font-bold rr-text-navy">
            {t("securityAuditReleaseVerification.errorTitle", {
              defaultValue: "Release verification is unavailable",
            })}
          </h1>
          <p className="mt-2 text-sm rr-text-navy-muted">
            {t("securityAuditReleaseVerification.errorBody", {
              defaultValue:
                "The administrator-only release evidence could not be loaded.",
            })}
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mt-5 min-h-11 rounded-xl rr-bg-navy px-5 text-sm font-bold text-white active:scale-[0.97]"
          >
            {t("securityAuditReleaseVerification.backToAdmin", {
              defaultValue: "Back to administration",
            })}
          </button>
        </div>
      </div>
    );
  }

  const data = release.data;
  const auditHistoryLoading = auditHistory.isLoading;
  const auditHistoryUnavailable = auditHistory.isError || !auditHistory.data;
  const firstReportRecorded = Boolean(auditHistory.data?.latest);

  return (
    <div
      className="min-h-screen overflow-x-hidden rr-bg-cream-warm pb-24"
      data-testid="security-audit-release-verification-page"
    >
      <header className="rr-bg-navy px-5 pb-8 pt-10 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t("securityAuditReleaseVerification.backToAdmin", {
              defaultValue: "Back to administration",
            })}
          </button>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="max-w-3xl">
              <BrandLockup
                tone="split"
                iconClassName="h-9 w-9"
                textClassName="text-base"
              />
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D4A017]/50 bg-[#D4A017]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
                <LockKeyhole size={14} aria-hidden="true" />
                {t("securityAuditReleaseVerification.adminOnly", {
                  defaultValue: "Administrator only",
                })}
              </div>
              <h1 className="rr-h1 mt-4 rr-on-dark">
                {t("securityAuditReleaseVerification.title", {
                  defaultValue: "Security Audit release verification",
                })}
              </h1>
              <p className="mt-3 max-w-2xl rr-b2 rr-on-dark-secondary">
                {t("securityAuditReleaseVerification.description", {
                  defaultValue:
                    "A protected evidence record for the Security Audit History release, its authorization controls, production schema, and the first scheduled-report confirmation.",
                })}
              </p>
            </div>

            <section
              className="rounded-2xl border border-[#D4A017]/50 bg-[#D4A017]/10 p-5"
              aria-label={t(
                "securityAuditReleaseVerification.releaseStatusLabel",
                { defaultValue: "Release status" }
              )}
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 rr-text-gold"
                  size={25}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/65">
                    {t("securityAuditReleaseVerification.statusEyebrow", {
                      defaultValue: "Release status",
                    })}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-white">
                    {t("securityAuditReleaseVerification.statusVerified", {
                      defaultValue: "Verified",
                    })}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/75">
                    {t("securityAuditReleaseVerification.statusBody", {
                      defaultValue:
                        "Reviewed release, protected routes, schema readiness, and authorized interface checks are complete.",
                    })}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
        <section
          className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]"
          aria-labelledby="release-evidence-title"
        >
          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <ClipboardCheck
                className="mt-1 shrink-0 rr-text-gold"
                size={25}
                aria-hidden="true"
              />
              <div>
                <p className="rr-h6 rr-text-navy-muted">
                  {t("securityAuditReleaseVerification.evidenceEyebrow", {
                    defaultValue: "Verified release evidence",
                  })}
                </p>
                <h2
                  id="release-evidence-title"
                  className="rr-h3 mt-1 rr-text-navy"
                >
                  {t("securityAuditReleaseVerification.evidenceTitle", {
                    defaultValue: "Production controls are in place",
                  })}
                </h2>
                <p className="mt-2 max-w-3xl rr-b2 rr-text-navy-muted">
                  {t("securityAuditReleaseVerification.evidenceDescription", {
                    defaultValue:
                      "This view holds a concise operational record. It deliberately excludes raw dependency logs, advisory details, customer data, and credentials.",
                  })}
                </p>
              </div>
            </div>

            <ul
              className="mt-6 grid gap-3 md:grid-cols-2"
              aria-label={t(
                "securityAuditReleaseVerification.evidenceListLabel",
                { defaultValue: "Verified release controls" }
              )}
            >
              {data.evidence.map(item => {
                const Icon =
                  evidenceIcon[item.id as keyof typeof evidenceIcon] ??
                  ShieldCheck;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl border border-[#0b2a52]/10 bg-[#fbfaf6] p-4"
                  >
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                        <Icon size={19} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold rr-text-navy">
                          {t(
                            `securityAuditReleaseVerification.evidence.${item.id}.title`,
                            { defaultValue: item.title }
                          )}
                        </p>
                        <p className="mt-1 text-sm leading-6 rr-text-navy-muted">
                          {t(
                            `securityAuditReleaseVerification.evidence.${item.id}.detail`,
                            { defaultValue: item.detail }
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          <aside
            className="rounded-2xl rr-bg-navy p-5 text-white sm:p-6"
            aria-labelledby="release-scope-title"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F3C549]">
              {t("securityAuditReleaseVerification.scopeEyebrow", {
                defaultValue: "Verified release",
              })}
            </p>
            <h2
              id="release-scope-title"
              className="mt-2 text-2xl font-extrabold"
            >
              {t("securityAuditReleaseVerification.scopeTitle", {
                defaultValue: "Security Audit History",
              })}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/75">
              {t("securityAuditReleaseVerification.scopeBody", {
                defaultValue: data.release.scope,
              })}
            </p>
            <dl className="mt-6 space-y-4 border-t border-white/10 pt-5">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">
                  {t("securityAuditReleaseVerification.repository", {
                    defaultValue: "Repository",
                  })}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-white">
                  {data.release.repository}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">
                  {t("securityAuditReleaseVerification.protectedBranch", {
                    defaultValue: "Protected branch",
                  })}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold text-white">
                  {data.release.protectedBranch}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">
                  {t("securityAuditReleaseVerification.verifiedAt", {
                    defaultValue: "Verified",
                  })}
                </dt>
                <dd className="mt-1 text-sm font-bold text-white">
                  {data.verifiedAt}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section
          className="overflow-hidden rounded-2xl border border-[#D4A017]/35 bg-white shadow-sm"
          aria-labelledby="next-confirmation-title"
        >
          <div className="border-b border-[#0b2a52]/10 bg-[#fff9e8] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-1 shrink-0 rr-text-gold"
                  size={25}
                  aria-hidden="true"
                />
                <div>
                  <p className="rr-h6 rr-text-navy-muted">
                    {t("securityAuditReleaseVerification.nextEyebrow", {
                      defaultValue: "Next operational confirmation",
                    })}
                  </p>
                  <h2
                    id="next-confirmation-title"
                    className="rr-h3 mt-1 rr-text-navy"
                  >
                    {t("securityAuditReleaseVerification.nextTitle", {
                      defaultValue: data.nextOperationalConfirmation.title,
                    })}
                  </h2>
                  <p
                    className="mt-2 max-w-3xl rr-b2 rr-text-navy-muted"
                    aria-live="polite"
                  >
                    {auditHistoryLoading
                      ? t("securityAuditReleaseVerification.reportChecking", {
                          defaultValue:
                            "The release evidence is loaded. Checking whether the first scheduled audit report has been recorded.",
                        })
                      : auditHistoryUnavailable
                        ? t(
                            "securityAuditReleaseVerification.reportUnavailable",
                            {
                              defaultValue:
                                "The release is verified, but the latest audit-report status could not be loaded. Open Security Audit History to retry safely.",
                            }
                          )
                        : firstReportRecorded
                          ? t(
                              "securityAuditReleaseVerification.reportRecorded",
                              {
                                defaultValue:
                                  "A verified audit report is now available. Review it in Security Audit History and preserve any failed-run evidence before retrying.",
                              }
                            )
                          : t(
                              "securityAuditReleaseVerification.reportPending",
                              {
                                defaultValue:
                                  "The release is ready. The first operational proof arrives when the next scheduled dependency-audit workflow records its sanitized summary.",
                              }
                            )}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                  auditHistoryLoading
                    ? "bg-sky-100 text-sky-900"
                    : auditHistoryUnavailable
                      ? "bg-rose-100 text-rose-800"
                      : firstReportRecorded
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                }`}
              >
                {auditHistoryLoading ? (
                  <Loader2
                    className="animate-spin"
                    size={14}
                    aria-hidden="true"
                  />
                ) : auditHistoryUnavailable ? (
                  <AlertTriangle size={14} aria-hidden="true" />
                ) : firstReportRecorded ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={14} aria-hidden="true" />
                )}
                {auditHistoryLoading
                  ? t("securityAuditReleaseVerification.checkingBadge", {
                      defaultValue: "Checking audit history",
                    })
                  : auditHistoryUnavailable
                    ? t("securityAuditReleaseVerification.unavailableBadge", {
                        defaultValue: "Audit status unavailable",
                      })
                    : firstReportRecorded
                      ? t("securityAuditReleaseVerification.recordedBadge", {
                          defaultValue: "Report recorded",
                        })
                      : t("securityAuditReleaseVerification.pendingBadge", {
                          defaultValue: "Awaiting scheduled audit",
                        })}
              </span>
            </div>
          </div>

          <ol className="grid gap-px bg-[#0b2a52]/10 md:grid-cols-2">
            {data.nextOperationalConfirmation.steps.map((step, index) => (
              <li key={step} className="flex gap-3 bg-white p-5 sm:p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full rr-bg-navy text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-6 rr-text-navy-muted">
                  {t(`securityAuditReleaseVerification.steps.${index + 1}`, {
                    defaultValue: step,
                  })}
                </p>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="max-w-3xl text-sm leading-6 rr-text-navy-muted">
              {t("securityAuditReleaseVerification.nextNote", {
                defaultValue:
                  "Do not create a duplicate workflow merely to populate this dashboard. A normal scheduled run confirms the whole production reporting loop.",
              })}
            </p>
            <button
              type="button"
              onClick={() => navigate("/admin/security-audits")}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("securityAuditReleaseVerification.openHistory", {
                defaultValue: "Open Security Audit History",
              })}
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section
          className="rounded-2xl border border-[#0b2a52]/10 bg-white p-5 shadow-sm sm:p-6"
          aria-labelledby="privacy-title"
        >
          <div className="flex items-start gap-3">
            <LockKeyhole
              className="mt-1 shrink-0 rr-text-gold"
              size={23}
              aria-hidden="true"
            />
            <div>
              <p className="rr-h6 rr-text-navy-muted">
                {t("securityAuditReleaseVerification.privacyEyebrow", {
                  defaultValue: "Data handling",
                })}
              </p>
              <h2 id="privacy-title" className="rr-h3 mt-1 rr-text-navy">
                {t("securityAuditReleaseVerification.privacyTitle", {
                  defaultValue: data.privacy.title,
                })}
              </h2>
              <p className="mt-2 max-w-4xl rr-b2 rr-text-navy-muted">
                {t("securityAuditReleaseVerification.privacyBody", {
                  defaultValue: data.privacy.detail,
                })}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
