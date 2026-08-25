import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  MailWarning,
  RefreshCw,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 20;

function formatTimestamp(value: number | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function Pager({
  page,
  pageCount,
  total,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
}) {
  const { t } = useTranslation("translation");
  if (total === 0) return null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "oklch(0.91 0.02 260)" }} aria-label={label}>
      <span className="text-xs font-bold rr-text-navy-muted">{total} {t("adminAuditLog.records", { defaultValue: "records" })} · {page} / {pageCount}</span>
      <span className="flex gap-2">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="inline-flex min-h-9 items-center gap-1 rounded-lg border bg-white px-3 text-xs font-black rr-text-navy disabled:opacity-40" style={{ borderColor: "oklch(0.86 0.04 260)" }}><ChevronLeft size={14} />{t("adminAuditLog.previous", { defaultValue: "Previous" })}</button>
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className="inline-flex min-h-9 items-center gap-1 rounded-lg border bg-white px-3 text-xs font-black rr-text-navy disabled:opacity-40" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuditLog.next", { defaultValue: "Next" })}<ChevronRight size={14} /></button>
      </span>
    </nav>
  );
}

function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copyTextWithFallback(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("clipboard_unavailable");
}

export default function AdminAuditLog() {
  const { t } = useTranslation("translation");
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [routePage, setRoutePage] = useState(1);
  const [rendererPage, setRendererPage] = useState(1);
  const [releasePage, setReleasePage] = useState(1);
  const [releaseStatus, setReleaseStatus] = useState<"all" | "matched" | "needs_review">("all");
  const [releaseSortBy, setReleaseSortBy] = useState<"recordedAt" | "checkpointId">("recordedAt");
  const [releaseSortDirection, setReleaseSortDirection] = useState<"asc" | "desc">("desc");
  const [releaseExport, setReleaseExport] = useState<any>(null);
  const [releaseCopyStatus, setReleaseCopyStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const enabled = user?.role === "admin";
  const routeAudits = trpc.admin.listRouteAuditRuns.useQuery(
    { page: routePage, pageSize: PAGE_SIZE },
    { enabled }
  );
  const rendererErrors = trpc.admin.listEmailPreviewRendererErrors.useQuery(
    { page: rendererPage, pageSize: PAGE_SIZE },
    { enabled }
  );
  const releaseHistory = trpc.admin.listReleaseParityRecords.useQuery(
    { page: releasePage, pageSize: PAGE_SIZE, status: releaseStatus, sortBy: releaseSortBy, sortDirection: releaseSortDirection },
    { enabled }
  );
  const scheduledExports = trpc.admin.listReleaseHistoryExportRuns.useQuery({ limit: 1 }, { enabled });
  const prepareReleaseExport = trpc.admin.prepareReleaseParityExport.useMutation({
    onSuccess: (snapshot) => { setReleaseExport(snapshot); setReleaseCopyStatus("idle"); },
    onError: (error) => toast.error(error.message || t("adminAuditLog.releaseExportFailed", { defaultValue: "Release-history export could not be prepared." })),
  });

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, navigate, user?.role]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm"><Loader2 size={28} className="animate-spin rr-text-navy" /></div>;
  }

  if (user.role !== "admin") return null;

  const refresh = () => {
    void routeAudits.refetch();
    void rendererErrors.refetch();
    void releaseHistory.refetch();
    void scheduledExports.refetch();
  };

  return (
    <div className="min-h-screen pb-32 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pb-7 pt-14">
        <button type="button" onClick={() => navigate("/admin")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold rr-text-gold"><ArrowLeft size={14} />{t("adminAuditLog.back", { defaultValue: "Admin dashboard" })}</button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 rr-text-gold"><Activity size={17} /><span className="text-xs font-bold uppercase tracking-[0.18em]">GET PHAME</span></div>
            <h1 className="text-2xl rr-fw-black text-white sm:text-3xl">{t("adminAuditLog.title", { defaultValue: "Audit and renderer history" })}</h1>
            <p className="mt-1 max-w-3xl text-sm font-bold text-white/90">{t("adminAuditLog.description", { defaultValue: "Administrator-only operational history. Stored records contain sanitized audit signals, never customer content, email HTML, cookies, or browser logs." })}</p>
          </div>
          <button type="button" onClick={refresh} disabled={routeAudits.isFetching || rendererErrors.isFetching || releaseHistory.isFetching} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black rr-text-navy disabled:opacity-60">
            {routeAudits.isFetching || rendererErrors.isFetching || releaseHistory.isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t("adminAuditLog.refresh", { defaultValue: "Refresh history" })}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5 sm:px-5">
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="release-history-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><FileSpreadsheet size={19} /></span><div><h2 id="release-history-title" className="text-lg rr-fw-black rr-text-navy">{t("adminAuditLog.releaseTitle", { defaultValue: "Release history" })}</h2><p className="mt-1 text-sm font-bold rr-text-navy-muted">{t("adminAuditLog.releaseDescription", { defaultValue: "Sanitized release-lineage records with matching status, sorting, and a bounded export preview." })}</p></div></div>
            <button type="button" onClick={() => navigate("/admin/audit-retention")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border bg-white px-3 text-xs font-black rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }}><Settings2 size={14} />{t("adminAuditLog.retention", { defaultValue: "Retention settings" })}</button>
          </div>
          <div className="mb-4 grid gap-3 rounded-xl p-3 rr-bg-surface sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>{t("adminAuditLog.releaseStatus", { defaultValue: "Parity status" })}</span><select value={releaseStatus} onChange={(event) => { setReleaseStatus(event.target.value as typeof releaseStatus); setReleasePage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }} name="rr-pages-admin-audit-log-release-status-163"><option value="all">{t("adminAuditLog.allStatuses", { defaultValue: "All statuses" })}</option><option value="matched">{t("adminAuditLog.matched", { defaultValue: "Matched" })}</option><option value="needs_review">{t("adminAuditLog.needsReview", { defaultValue: "Needs review" })}</option></select></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>{t("adminAuditLog.releaseSort", { defaultValue: "Sort by" })}</span><select value={releaseSortBy} onChange={(event) => { setReleaseSortBy(event.target.value as typeof releaseSortBy); setReleasePage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }} name="rr-pages-admin-audit-log-release-sort-by-164"><option value="recordedAt">{t("adminAuditLog.releaseSortDate", { defaultValue: "Release time" })}</option><option value="checkpointId">{t("adminAuditLog.releaseSortCheckpoint", { defaultValue: "Checkpoint" })}</option></select></label>
            <label className="flex flex-col gap-1.5 text-xs font-bold rr-text-navy-muted"><span>{t("adminAuditLog.releaseDirection", { defaultValue: "Direction" })}</span><select value={releaseSortDirection} onChange={(event) => { setReleaseSortDirection(event.target.value as typeof releaseSortDirection); setReleasePage(1); }} className="h-10 rounded-lg border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }} name="rr-pages-admin-audit-log-release-sort-direction-165"><option value="desc">{t("adminAuditLog.newestFirst", { defaultValue: "Newest first" })}</option><option value="asc">{t("adminAuditLog.oldestFirst", { defaultValue: "Oldest first" })}</option></select></label>
            <button type="button" disabled={prepareReleaseExport.isPending || !releaseHistory.data?.total} onClick={() => prepareReleaseExport.mutate({ status: releaseStatus, sortBy: releaseSortBy, sortDirection: releaseSortDirection })} className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black rr-bg-navy text-white disabled:opacity-50">{prepareReleaseExport.isPending ? <Loader2 size={15} className="animate-spin" /> : <Filter size={15} />}{t("adminAuditLog.releaseExport", { defaultValue: "Preview export" })}</button>
          </div>
          {scheduledExports.data?.[0]?.status === "ok" && scheduledExports.data[0].csv && scheduledExports.data[0].filename ? <div className="mb-4 flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "oklch(0.82 0.10 145)" }}><div><p className="text-sm rr-fw-black rr-text-navy">{t("adminExportSchedule.recentRuns", { defaultValue: "Recent automated reports" })}</p><p className="mt-0.5 text-xs font-bold rr-text-navy-muted">{formatTimestamp(scheduledExports.data[0].generatedAt)} · {scheduledExports.data[0].rowCount} {t("adminExportSchedule.rows", { defaultValue: "rows" })}</p></div><button type="button" onClick={() => downloadCsv(scheduledExports.data![0].csv!, scheduledExports.data![0].filename!)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black rr-bg-gold rr-text-navy"><Download size={14} />{t("adminAuditLog.download", { defaultValue: "Download CSV" })}</button></div> : null}
          {releaseHistory.error && <div role="alert" className="rounded-xl px-3 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{t("adminAuditLog.releaseError", { defaultValue: "Release history could not be loaded." })} {releaseHistory.error.message}</div>}
          {releaseHistory.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 size={22} className="animate-spin rr-text-navy-muted" /></div> : releaseHistory.data?.rows.length ? <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "oklch(0.91 0.02 260)" }}><table className="w-full min-w-[680px] text-left text-sm"><thead className="rr-bg-surface text-xs font-black uppercase tracking-wide rr-text-navy-muted"><tr><th className="px-4 py-3">{t("adminAuditLog.time", { defaultValue: "Time" })}</th><th className="px-4 py-3">{t("adminAuditLog.checkpoint", { defaultValue: "Checkpoint" })}</th><th className="px-4 py-3">{t("adminAuditLog.mainCommit", { defaultValue: "Main commit" })}</th><th className="px-4 py-3">{t("adminAuditLog.parity", { defaultValue: "Parity" })}</th></tr></thead><tbody className="divide-y" style={{ borderColor: "oklch(0.92 0.02 260)" }}>{releaseHistory.data.rows.map((row) => <tr key={row.id}><td className="px-4 py-3 text-xs font-bold rr-text-navy">{formatTimestamp(row.recordedAt)}</td><td className="px-4 py-3 font-mono text-xs rr-text-navy">{row.checkpointId}</td><td className="px-4 py-3 font-mono text-xs rr-text-navy-mid">{row.protectedMainCommit.slice(0, 12)}</td><td className="px-4 py-3"><span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ background: row.parityStatus === "matched" ? "oklch(0.94 0.05 145)" : "oklch(0.97 0.03 27)", color: row.parityStatus === "matched" ? "oklch(0.40 0.14 145)" : "oklch(0.46 0.12 27)" }}>{row.parityStatus === "matched" ? t("adminAuditLog.matched", { defaultValue: "Matched" }) : t("adminAuditLog.needsReview", { defaultValue: "Needs review" })}</span></td></tr>)}</tbody></table></div> : <p className="rounded-xl px-4 py-8 text-center text-sm font-bold rr-bg-surface rr-text-navy-muted">{t("adminAuditLog.releaseEmpty", { defaultValue: "No verified release records have been saved yet." })}</p>}
          <Pager page={releaseHistory.data?.page ?? releasePage} pageCount={releaseHistory.data?.pageCount ?? 1} total={releaseHistory.data?.total ?? 0} onPageChange={setReleasePage} label={t("adminAuditLog.releasePagination", { defaultValue: "Release history pagination" })} />
        </section>
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="route-audit-history-title">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><Activity size={19} /></span><div><h2 id="route-audit-history-title" className="text-lg rr-fw-black rr-text-navy">{t("adminAuditLog.routeTitle", { defaultValue: "Production route audits" })}</h2><p className="mt-1 text-sm font-bold rr-text-navy-muted">{t("adminAuditLog.routeDescription", { defaultValue: "Manual browser checks of sitemap-discovered public routes, newest first." })}</p></div></div>
            <button type="button" onClick={() => navigate("/admin")} className="text-xs font-black rr-text-gold">{t("adminAuditLog.runAnother", { defaultValue: "Run another audit →" })}</button>
          </div>
          {routeAudits.error && <div role="alert" className="rounded-xl px-3 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{t("adminAuditLog.routeError", { defaultValue: "Route-audit history could not be loaded." })} {routeAudits.error.message}</div>}
          {routeAudits.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 size={22} className="animate-spin rr-text-navy-muted" /></div> : routeAudits.data?.rows.length ? <div className="space-y-3">{routeAudits.data.rows.map(run => {
            const failed = run.failureCount > 0;
            return <article key={run.id} className="rounded-xl border p-3 rr-bg-surface sm:p-4" style={{ borderColor: failed ? "oklch(0.84 0.08 27)" : "oklch(0.88 0.03 260)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm rr-fw-black rr-text-navy">{formatTimestamp(run.auditedAt)}</p><p className="mt-1 text-xs font-bold rr-text-navy-muted">{run.routesAudited} {t("adminAuditLog.routes", { defaultValue: "routes" })} · {run.durationMs.toLocaleString()} ms</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black" style={{ background: failed ? "oklch(0.97 0.03 27)" : "oklch(0.94 0.05 145)", color: failed ? "oklch(0.46 0.12 27)" : "oklch(0.40 0.14 145)" }}>{failed ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{run.runnerErrorCode ?? (failed ? t("adminAuditLog.issuesFound", { defaultValue: "{{count}} issues", count: run.failureCount }) : t("adminAuditLog.passed", { defaultValue: "Passed" }))}</span></div>
              {run.findings.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-2">{run.findings.map((finding: any, index: number) => <div key={`${run.id}-${finding.route ?? index}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 text-xs font-bold rr-text-navy"><span className="truncate">{finding.route ?? "—"}</span><span className="rr-text-navy-muted">{finding.status ?? "error"} · {finding.rendered?.textLength ?? 0} chars</span></div>)}</div>}
            </article>;
          })}</div> : <p className="rounded-xl px-4 py-8 text-center text-sm font-bold rr-bg-surface rr-text-navy-muted">{t("adminAuditLog.routeEmpty", { defaultValue: "No production route audits have been recorded yet." })}</p>}
          <Pager page={routeAudits.data?.page ?? routePage} pageCount={routeAudits.data?.pageCount ?? 1} total={routeAudits.data?.total ?? 0} onPageChange={setRoutePage} label={t("adminAuditLog.routePagination", { defaultValue: "Route audit history pagination" })} />
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="renderer-history-title">
          <div className="mb-4 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}><MailWarning size={19} /></span><div><h2 id="renderer-history-title" className="text-lg rr-fw-black rr-text-navy">{t("adminAuditLog.rendererTitle", { defaultValue: "Email-preview renderer errors" })}</h2><p className="mt-1 text-sm font-bold rr-text-navy-muted">{t("adminAuditLog.rendererDescription", { defaultValue: "Sanitized signals captured only if an administrator preview cannot render verified content." })}</p></div></div>
          {rendererErrors.error && <div role="alert" className="rounded-xl px-3 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{t("adminAuditLog.rendererError", { defaultValue: "Renderer-error history could not be loaded." })} {rendererErrors.error.message}</div>}
          {rendererErrors.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 size={22} className="animate-spin rr-text-navy-muted" /></div> : rendererErrors.data?.rows.length ? <div className="overflow-hidden rounded-xl border" style={{ borderColor: "oklch(0.91 0.02 260)" }}><div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_150px] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide rr-text-navy-muted md:grid"><span>Time</span><span>Template</span><span>Viewport</span><span>Signal</span></div><div className="divide-y" style={{ borderColor: "oklch(0.92 0.02 260)" }}>{rendererErrors.data.rows.map(row => <div key={row.id} className="grid gap-2 px-4 py-4 text-sm font-bold md:grid-cols-[minmax(0,1fr)_120px_110px_150px] md:items-center md:gap-3"><span className="rr-text-navy">{formatTimestamp(row.occurredAt)}</span><span className="rr-text-navy-mid">{row.templateKey}</span><span className="rr-text-navy-mid">{row.viewportMode}{row.darkMode ? " · dark" : ""}</span><span className="text-amber-800">{row.errorCode}</span></div>)}</div></div> : <p className="rounded-xl px-4 py-8 text-center text-sm font-bold rr-bg-surface rr-text-navy-muted">{t("adminAuditLog.rendererEmpty", { defaultValue: "No renderer errors have been recorded." })}</p>}
          <Pager page={rendererErrors.data?.page ?? rendererPage} pageCount={rendererErrors.data?.pageCount ?? 1} total={rendererErrors.data?.total ?? 0} onPageChange={setRendererPage} label={t("adminAuditLog.rendererPagination", { defaultValue: "Renderer-error history pagination" })} />
        </section>
      </main>
      <Dialog open={Boolean(releaseExport)} onOpenChange={(open) => {
        if (!open) {
          setReleaseExport(null);
          setReleaseCopyStatus("idle");
          prepareReleaseExport.reset();
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rr-text-navy"><FileSpreadsheet size={18} className="rr-text-gold" />{t("adminAuditLog.releaseExportTitle", { defaultValue: "Preview release-history export" })}</DialogTitle>
            <DialogDescription>{t("adminAuditLog.releaseExportDescription", { defaultValue: "Review the exact bounded, sanitized snapshot before copying or downloading it." })}</DialogDescription>
          </DialogHeader>
          {releaseExport && <div className="space-y-3">
            <div className="rounded-xl rr-bg-surface p-3 text-xs font-bold rr-text-navy-muted">{t("adminAuditLog.releaseExportSummary", { defaultValue: "Previewing {{previewed}} of {{exported}} export rows · {{matched}} matched", previewed: releaseExport.preview.rowCount, exported: releaseExport.rowCount, matched: releaseExport.totalMatching })}</div>
            <div className="max-h-80 overflow-auto rounded-xl border" style={{ borderColor: "oklch(0.88 0.03 260)" }}>
              <table className="w-max min-w-full text-left text-xs"><thead className="sticky top-0 rr-bg-navy text-white"><tr>{releaseExport.preview.columns.map((column: any) => <th key={column.key} className="px-3 py-2.5 font-black">{column.csvHeader}</th>)}</tr></thead><tbody className="divide-y">{releaseExport.preview.rows.map((row: any, index: number) => <tr key={`${row.checkpointId}-${index}`}>{releaseExport.preview.columns.map((column: any) => <td key={column.key} className="whitespace-nowrap px-3 py-2 font-bold rr-text-navy-muted">{row[column.key] || "—"}</td>)}</tr>)}</tbody></table>
            </div>
            {releaseExport.truncated && <p role="status" className="rounded-lg px-3 py-2 text-xs font-bold" style={{ background: "oklch(0.96 0.04 80)", color: "oklch(0.42 0.12 80)" }}>{t("adminAuditLog.releaseExportTruncated", { defaultValue: "The export cap includes {{exported}} of {{matched}} matching records.", exported: releaseExport.rowCount, matched: releaseExport.totalMatching })}</p>}
          </div>}
          <DialogFooter>
            <button type="button" onClick={() => setReleaseExport(null)} className="min-h-10 rounded-lg border bg-white px-4 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuditLog.close", { defaultValue: "Close" })}</button>
            <button type="button" disabled={!releaseExport || releaseCopyStatus === "copying"} onClick={async () => { try { setReleaseCopyStatus("copying"); await copyTextWithFallback(releaseExport.clipboardText); setReleaseCopyStatus("copied"); } catch { setReleaseCopyStatus("error"); } }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-4 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }}><Copy size={15} />{releaseCopyStatus === "copied" ? t("adminAuditLog.copied", { defaultValue: "Copied" }) : releaseCopyStatus === "error" ? t("adminAuditLog.copyFailed", { defaultValue: "Copy failed — retry" }) : t("adminAuditLog.copy", { defaultValue: "Copy CSV" })}</button>
            <button type="button" disabled={!releaseExport} onClick={() => releaseExport && downloadCsv(releaseExport.csv, releaseExport.filename)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black rr-bg-gold rr-text-navy"><Download size={15} />{t("adminAuditLog.download", { defaultValue: "Download CSV" })}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
