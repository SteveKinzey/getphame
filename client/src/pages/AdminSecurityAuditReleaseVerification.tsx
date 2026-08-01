/**
 * Internal evidence ledger: official Get Phame navy/gold, compact audit rows,
 * explicit authorization boundaries, and no public report or download surface.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import BrandLockup from "@/components/BrandLockup";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck2,
  GitBranch,
  KeyRound,
  Loader2,
  LockKeyhole,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRoundX,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";

const accessIcons = {
  unauthenticated: KeyRound,
  "non-admin": UserRoundX,
  administrator: UserCheck,
} as const;

const validationIcons = {
  "focused-tests": FileCheck2,
  "full-suite": BadgeCheck,
  typescript: CheckCircle2,
  "dependency-audit": ShieldCheck,
  "production-build": ServerCog,
  responsive: CheckCircle2,
} as const;

const productionIcons = {
  ingestion: ShieldCheck,
  "admin-reporting": LockKeyhole,
  schema: Database,
  interfaces: FileCheck2,
} as const;

export default function AdminSecurityAuditReleaseVerification() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const isAdmin = user?.role === "admin";
  const release = trpc.securityAuditReleaseVerification.dashboard.useQuery(
    undefined,
    { enabled: isAdmin, retry: false, staleTime: 5 * 60 * 1000 }
  );
  const auditHistory = trpc.securityAudits.dashboard.useQuery(
    { limit: 10 },
    { enabled: isAdmin, retry: false, staleTime: 60_000 }
  );

  useEffect(() => {
    if (user && !isAdmin) navigate("/");
  }, [isAdmin, navigate, user]);

  if (!isAuthenticated || !user) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm px-5 text-center">
        <div className="max-w-sm">
          <ShieldAlert className="mx-auto mb-3 text-rose-700" size={46} aria-hidden="true" />
          <h1 className="rr-h3 rr-text-navy">
            {t("securityAuditReleaseVerification.accessDenied", { defaultValue: "Access denied" })}
          </h1>
          <p className="mt-2 rr-b2 rr-text-navy-muted">
            {t("securityAuditReleaseVerification.adminOnly", { defaultValue: "Administrator access is required." })}
          </p>
        </div>
      </div>
    );
  }

  if (release.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rr-bg-cream-warm" data-testid="security-audit-release-verification-loading">
        <Loader2 className="animate-spin rr-text-navy" size={34} aria-label={t("securityAuditReleaseVerification.loading", { defaultValue: "Loading release verification" })} />
      </div>
    );
  }

  if (release.error || !release.data) {
    return (
      <div className="min-h-screen rr-bg-cream-warm px-5 py-12">
        <section className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm" role="alert">
          <AlertTriangle className="mx-auto text-rose-600" size={30} aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold rr-text-navy">
            {t("securityAuditReleaseVerification.errorTitle", { defaultValue: "Release verification is unavailable" })}
          </h1>
          <p className="mt-2 rr-b2 rr-text-navy-muted">
            {t("securityAuditReleaseVerification.errorBody", { defaultValue: "The administrator-only release evidence could not be loaded." })}
          </p>
          <button type="button" onClick={() => navigate("/admin")} className="mt-5 min-h-11 rounded-xl rr-bg-navy px-5 text-sm font-bold text-white active:scale-[0.97]">
            {t("securityAuditReleaseVerification.backToAdmin", { defaultValue: "Back to administration" })}
          </button>
        </section>
      </div>
    );
  }

  const data = release.data;
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const verifiedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${data.verifiedAt}T00:00:00Z`));
  const auditStatus = auditHistory.isLoading
    ? "checking"
    : auditHistory.isError || !auditHistory.data
      ? "unavailable"
      : auditHistory.data.latest
        ? "recorded"
        : "pending";
  const auditMessage =
    auditStatus === "checking"
      ? t("securityAuditReleaseVerification.reportChecking", { defaultValue: "The release evidence is loaded. Checking whether the first scheduled audit report has been recorded." })
      : auditStatus === "unavailable"
        ? t("securityAuditReleaseVerification.reportUnavailable", { defaultValue: "The release is verified, but the latest audit-report status could not be loaded. Open Security Audit History to retry safely." })
        : auditStatus === "recorded"
          ? t("securityAuditReleaseVerification.reportRecorded", { defaultValue: "A verified audit report is now available. Review it in Security Audit History and preserve any failed-run evidence before retrying." })
          : t("securityAuditReleaseVerification.reportPending", { defaultValue: "The release is verified. The first normal-cadence scheduled report remains pending by design." });

  return (
    <div className="min-h-screen overflow-x-hidden rr-bg-cream-warm pb-20" data-testid="security-audit-release-verification-page">
      <header className="rr-bg-navy px-5 pb-9 pt-8 text-white sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <button type="button" onClick={() => navigate("/admin")} className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("securityAuditReleaseVerification.backToAdmin", { defaultValue: "Back to administration" })}
          </button>
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div className="max-w-3xl">
              <BrandLockup tone="split" iconClassName="h-10 w-10" textClassName="text-base" />
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D4A017]/50 bg-[#D4A017]/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
                  <LockKeyhole size={14} aria-hidden="true" />
                  {t("securityAuditReleaseVerification.adminOnly", { defaultValue: "Administrator only" })}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white/80">
                  {t("securityAuditReleaseVerification.internalRecord", { defaultValue: "Internal evidence record" })}
                </span>
              </div>
              <h1 className="rr-h1 mt-4 rr-on-dark">
                {t("securityAuditReleaseVerification.title", { defaultValue: "Security Audit internal dossier" })}
              </h1>
              <p className="mt-3 rr-b2 rr-on-dark-secondary">
                {t("securityAuditReleaseVerification.description", { defaultValue: "A server-protected administrator dossier for the Security Audit History release, its exact validation gates, production controls, and pending normal-cadence confirmation." })}
              </p>
            </div>
            <section className="border-t-2 border-[#D4A017] bg-white/5 p-5" aria-label={t("securityAuditReleaseVerification.releaseStatusLabel", { defaultValue: "Release status" })}>
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={25} aria-hidden="true" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-white/60">{t("securityAuditReleaseVerification.statusEyebrow", { defaultValue: "Determination" })}</p>
                  <p className="mt-1 text-xl font-extrabold text-white">{t("securityAuditReleaseVerification.statusVerified", { defaultValue: "Release verified" })}</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{t("securityAuditReleaseVerification.statusBody", { defaultValue: "Reviewed source, exact-candidate gates, production boundaries, schema readiness, and protected-main lineage passed." })}</p>
                  <p className="mt-3 border-t border-white/10 pt-3 text-sm font-bold text-amber-200">{t("securityAuditReleaseVerification.pendingExpected", { defaultValue: "First scheduled report: pending — expected" })}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]" aria-labelledby="access-boundary-title">
          <article className="overflow-hidden bg-white shadow-sm">
            <div className="border-b border-[#0b2a52]/10 p-5 sm:p-6">
              <p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.accessEyebrow", { defaultValue: "Authorization boundary" })}</p>
              <h2 id="access-boundary-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.accessTitle", { defaultValue: "Only administrators receive the dossier payload" })}</h2>
              <p className="mt-2 rr-b2 rr-text-navy-muted">{t("securityAuditReleaseVerification.accessDescription", { defaultValue: "The browser guard improves navigation; centralized server middleware remains the enforcement point." })}</p>
            </div>
            <div className="divide-y divide-[#0b2a52]/10">
              {data.accessBoundary.map(item => {
                const Icon = accessIcons[item.id as keyof typeof accessIcons] ?? ShieldCheck;
                const allowed = item.status === "allowed";
                return (
                  <div key={item.id} className="grid gap-3 p-5 sm:grid-cols-[13rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center ${allowed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}><Icon size={19} aria-hidden="true" /></span>
                      <div><p className="text-sm font-extrabold rr-text-navy">{t(`securityAuditReleaseVerification.access.${item.id}.context`, { defaultValue: item.id })}</p><p className={`mt-0.5 text-xs font-black uppercase tracking-[0.12em] ${allowed ? "text-emerald-700" : "text-rose-700"}`}>{allowed ? t("securityAuditReleaseVerification.allowed", { defaultValue: "Allowed" }) : t("securityAuditReleaseVerification.blocked", { defaultValue: "Blocked" })}</p></div>
                    </div>
                    <div><p className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">{t("securityAuditReleaseVerification.pageOutcome", { defaultValue: "Page" })}</p><p className="mt-1 text-sm font-bold rr-text-navy">{t(`securityAuditReleaseVerification.access.${item.id}.page`, { defaultValue: item.pageOutcome })}</p></div>
                    <div><p className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">{t("securityAuditReleaseVerification.serverOutcome", { defaultValue: "Server payload" })}</p><p className="mt-1 font-mono text-sm font-bold rr-text-navy">{t(`securityAuditReleaseVerification.access.${item.id}.server`, { defaultValue: `${item.apiOutcome} · ${item.payloadOutcome}` })}</p></div>
                  </div>
                );
              })}
            </div>
          </article>

          <aside className="rr-bg-navy p-5 text-white sm:p-6" aria-labelledby="release-scope-title">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F3C549]">{t("securityAuditReleaseVerification.scopeEyebrow", { defaultValue: "Verified release" })}</p>
            <h2 id="release-scope-title" className="mt-2 text-2xl font-extrabold">{t("securityAuditReleaseVerification.scopeTitle", { defaultValue: data.release.title })}</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">{t("securityAuditReleaseVerification.scopeBody", { defaultValue: data.release.scope })}</p>
            <dl className="mt-6 space-y-4 border-t border-white/10 pt-5">
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{t("securityAuditReleaseVerification.repository", { defaultValue: "Repository" })}</dt><dd className="mt-1 font-mono text-sm font-bold text-white">{data.release.repository}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{t("securityAuditReleaseVerification.protectedBranch", { defaultValue: "Protected branch" })}</dt><dd className="mt-1 font-mono text-sm font-bold text-white">{data.release.protectedBranch}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-[0.12em] text-white/55">{t("securityAuditReleaseVerification.verifiedAt", { defaultValue: "Verified" })}</dt><dd className="mt-1 text-sm font-bold text-white">{verifiedAt}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="bg-white shadow-sm" aria-labelledby="validation-gates-title">
          <div className="border-b border-[#0b2a52]/10 p-5 sm:p-6">
            <p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.validationEyebrow", { defaultValue: "Exact-candidate validation" })}</p>
            <h2 id="validation-gates-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.validationTitle", { defaultValue: "Every release gate passed" })}</h2>
            <p className="mt-2 rr-b2 rr-text-navy-muted">{t("securityAuditReleaseVerification.validationDescription", { defaultValue: "The reviewed restoration merge was tested independently of later repository changes." })}</p>
          </div>
          <div className="grid gap-px bg-[#0b2a52]/10 sm:grid-cols-2 xl:grid-cols-3">
            {data.validationGates.map(item => {
              const Icon = validationIcons[item.id as keyof typeof validationIcons] ?? CheckCircle2;
              return (
                <div key={item.id} className="bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3"><Icon className="text-emerald-700" size={21} aria-hidden="true" /><span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{t("securityAuditReleaseVerification.passed", { defaultValue: "Passed" })}</span></div>
                  <p className="mt-5 text-sm font-extrabold rr-text-navy">{t(`securityAuditReleaseVerification.validation.${item.id}.label`, { defaultValue: item.id })}</p>
                  <p className="mt-1 font-mono text-lg font-black rr-text-navy">{t(`securityAuditReleaseVerification.validation.${item.id}.result`, { defaultValue: item.result })}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]" aria-labelledby="production-controls-title">
          <article className="bg-white shadow-sm">
            <div className="border-b border-[#0b2a52]/10 p-5 sm:p-6">
              <p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.productionEyebrow", { defaultValue: "Non-mutating production proof" })}</p>
              <h2 id="production-controls-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.productionTitle", { defaultValue: "Production failed closed and retained privacy" })}</h2>
            </div>
            <div className="divide-y divide-[#0b2a52]/10">
              {data.productionControls.map(item => {
                const Icon = productionIcons[item.id as keyof typeof productionIcons] ?? ShieldCheck;
                return (
                  <div key={item.id} className="flex gap-4 p-5 sm:p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-100 text-emerald-800"><Icon size={19} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><p className="text-sm font-extrabold rr-text-navy">{t(`securityAuditReleaseVerification.production.${item.id}.title`, { defaultValue: item.id })}</p><p className="font-mono text-sm font-black text-emerald-800">{t(`securityAuditReleaseVerification.production.${item.id}.result`, { defaultValue: item.result })}</p></div><p className="mt-1 text-sm leading-6 rr-text-navy-muted">{t(`securityAuditReleaseVerification.production.${item.id}.detail`, { defaultValue: item.result })}</p></div>
                  </div>
                );
              })}
            </div>
          </article>

          <div className="grid gap-4">
            <article className="border-t-2 border-[#D4A017] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="lineage-title">
              <div className="flex items-start gap-3"><GitBranch className="mt-1 shrink-0 rr-text-gold" size={23} aria-hidden="true" /><div className="min-w-0"><p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.lineageEyebrow", { defaultValue: "Protected lineage" })}</p><h2 id="lineage-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.lineageTitle", { defaultValue: "Reviewed release preserved in main" })}</h2></div></div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="border-l-2 border-[#D4A017] pl-3"><dt className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">{t("securityAuditReleaseVerification.pullRequest", { defaultValue: "Pull request" })}</dt><dd className="mt-1 font-mono text-sm font-black rr-text-navy">#{data.lineage.pullRequest}</dd></div>
                <div className="border-l-2 border-[#D4A017] pl-3"><dt className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">{t("securityAuditReleaseVerification.mergeCommit", { defaultValue: "Merge commit" })}</dt><dd className="mt-1 font-mono text-sm font-black rr-text-navy">{data.lineage.mergeCommit}</dd></div>
                <div className="border-l-2 border-[#D4A017] pl-3"><dt className="text-xs font-black uppercase tracking-[0.12em] rr-text-navy-muted">{t("securityAuditReleaseVerification.qualityGateRun", { defaultValue: "Quality-gate run" })}</dt><dd className="mt-1 font-mono text-sm font-black rr-text-navy">{data.lineage.qualityGateRun}</dd></div>
              </dl>
            </article>
            <article className="bg-white p-5 shadow-sm sm:p-6" aria-labelledby="schema-title">
              <div className="flex items-start gap-3"><Database className="mt-1 shrink-0 rr-text-gold" size={23} aria-hidden="true" /><div className="min-w-0"><p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.schemaEyebrow", { defaultValue: "Schema readiness" })}</p><h2 id="schema-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.schemaTitle", { defaultValue: "Additive reporting storage present" })}</h2></div></div>
              <p className="mt-5 break-all font-mono text-sm font-black rr-text-navy">{data.schema.table}</p>
              <ul className="mt-3 space-y-2">{data.schema.indexes.map(index => <li key={index} className="break-all font-mono text-xs rr-text-navy-muted">{index}</li>)}</ul>
              <p className="mt-4 text-sm font-bold text-emerald-800">{t("securityAuditReleaseVerification.noRowsOpened", { defaultValue: "No production row values were opened or copied." })}</p>
            </article>
          </div>
        </section>

        <section className="overflow-hidden border border-[#D4A017]/35 bg-white shadow-sm" aria-labelledby="next-confirmation-title">
          <div className="border-b border-[#0b2a52]/10 bg-[#fff9e8] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3"><ShieldCheck className="mt-1 shrink-0 rr-text-gold" size={25} aria-hidden="true" /><div><p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.nextEyebrow", { defaultValue: "Next operational confirmation" })}</p><h2 id="next-confirmation-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.nextTitle", { defaultValue: data.nextOperationalConfirmation.title })}</h2><p className="mt-2 rr-b2 rr-text-navy-muted" aria-live="polite">{auditMessage}</p></div></div>
              <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${auditStatus === "checking" ? "bg-sky-100 text-sky-900" : auditStatus === "unavailable" ? "bg-rose-100 text-rose-800" : auditStatus === "recorded" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                {auditStatus === "checking" ? <Loader2 className="animate-spin" size={14} aria-hidden="true" /> : auditStatus === "recorded" ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
                {auditStatus === "checking" ? t("securityAuditReleaseVerification.checkingBadge", { defaultValue: "Checking audit history" }) : auditStatus === "unavailable" ? t("securityAuditReleaseVerification.unavailableBadge", { defaultValue: "Audit status unavailable" }) : auditStatus === "recorded" ? t("securityAuditReleaseVerification.recordedBadge", { defaultValue: "Report recorded" }) : t("securityAuditReleaseVerification.pendingBadge", { defaultValue: "Awaiting scheduled audit" })}
              </span>
            </div>
          </div>
          <ol className="grid gap-px bg-[#0b2a52]/10 md:grid-cols-2">
            {data.nextOperationalConfirmation.steps.map((step, index) => <li key={`step-${index}`} className="flex gap-3 bg-white p-5 sm:p-6"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full rr-bg-navy text-sm font-black text-white">{index + 1}</span><p className="pt-1 text-sm leading-6 rr-text-navy-muted">{t(`securityAuditReleaseVerification.steps.${index + 1}`, { defaultValue: step })}</p></li>)}
          </ol>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="max-w-3xl text-sm leading-6 rr-text-navy-muted">{t("securityAuditReleaseVerification.nextNote", { defaultValue: "Do not create a duplicate workflow merely to populate this dashboard. A normal scheduled run confirms the whole production reporting loop." })}</p>
            <button type="button" onClick={() => navigate("/admin/security-audits")} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("securityAuditReleaseVerification.openHistory", { defaultValue: "Open Security Audit History" })}<ChevronRight size={16} aria-hidden="true" /></button>
          </div>
        </section>

        <section className="border border-[#0b2a52]/10 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="privacy-title">
          <div className="flex items-start gap-3"><LockKeyhole className="mt-1 shrink-0 rr-text-gold" size={23} aria-hidden="true" /><div><p className="rr-h6 rr-text-navy-muted">{t("securityAuditReleaseVerification.privacyEyebrow", { defaultValue: "Data handling" })}</p><h2 id="privacy-title" className="rr-h3 mt-1 rr-text-navy">{t("securityAuditReleaseVerification.privacyTitle", { defaultValue: data.privacy.title })}</h2><p className="mt-2 rr-b2 rr-text-navy-muted">{t("securityAuditReleaseVerification.privacyBody", { defaultValue: data.privacy.detail })}</p></div></div>
        </section>
      </main>
    </div>
  );
}
