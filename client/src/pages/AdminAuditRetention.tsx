import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, CalendarClock, Loader2, Settings2, ShieldCheck } from "lucide-react";
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

const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 3650;

export default function AdminAuditRetention() {
  const { t } = useTranslation("translation");
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const enabled = user?.role === "admin";
  const policy = trpc.admin.getAuditRetentionPolicy.useQuery(undefined, { enabled });
  const [routeDays, setRouteDays] = useState(180);
  const [rendererDays, setRendererDays] = useState(180);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exportSchedule = trpc.admin.getReleaseHistoryExportSchedule.useQuery(undefined, { enabled });
  const retentionChanges = trpc.admin.listAuditRetentionPolicyChanges.useQuery({ limit: 8 }, { enabled });
  const exportRuns = trpc.admin.listReleaseHistoryExportRuns.useQuery({ limit: 5 }, { enabled });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleCronExpression, setScheduleCronExpression] = useState("0 0 9 * * 1");

  useEffect(() => {
    if (policy.data) {
      setRouteDays(policy.data.routeAuditRetentionDays);
      setRendererDays(policy.data.rendererErrorRetentionDays);
    }
  }, [policy.data]);

  useEffect(() => {
    if (exportSchedule.data) {
      setScheduleEnabled(exportSchedule.data.enabled);
      setScheduleCronExpression(exportSchedule.data.cronExpression);
    }
  }, [exportSchedule.data]);

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, navigate, user?.role]);

  const updatePolicy = trpc.admin.updateAuditRetentionPolicy.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.getAuditRetentionPolicy.invalidate(),
        utils.admin.listRouteAuditRuns.invalidate(),
        utils.admin.listEmailPreviewRendererErrors.invalidate(),
      ]);
      toast.success(t("adminAuditRetention.saved", { defaultValue: "Retention controls saved and expired diagnostic records were pruned." }));
      setConfirmOpen(false);
    },
    onError: (error) => toast.error(error.message || t("adminAuditRetention.saveFailed", { defaultValue: "Retention controls could not be saved." })),
  });

  const invalid = routeDays < MIN_RETENTION_DAYS || routeDays > MAX_RETENTION_DAYS || rendererDays < MIN_RETENTION_DAYS || rendererDays > MAX_RETENTION_DAYS;
  const updateSchedule = trpc.admin.updateReleaseHistoryExportSchedule.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.getReleaseHistoryExportSchedule.invalidate(), utils.admin.listReleaseHistoryExportRuns.invalidate()]);
      toast.success(t("adminExportSchedule.saved", { defaultValue: "Automated release-history reporting updated." }));
    },
    onError: (error) => toast.error(error.message || t("adminExportSchedule.saveFailed", { defaultValue: "Automated report settings could not be saved." })),
  });

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm"><Loader2 size={28} className="animate-spin rr-text-navy" /></div>;
  if (user.role !== "admin") return null;

  return (
    <div className="min-h-screen pb-32 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pb-7 pt-14">
        <button type="button" onClick={() => navigate("/admin/audit-log")} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold rr-text-gold"><ArrowLeft size={14} />{t("adminAuditRetention.back", { defaultValue: "Audit history" })}</button>
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 rr-text-gold"><Settings2 size={21} /></span>
          <div><p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">GET PHAME</p><h1 className="mt-0.5 text-2xl rr-fw-black text-white sm:text-3xl">{t("adminAuditRetention.title", { defaultValue: "Audit retention controls" })}</h1><p className="mt-1 max-w-3xl text-sm font-bold text-white/90">{t("adminAuditRetention.description", { defaultValue: "Choose how long sanitized production-route and renderer-error diagnostics remain available to administrators." })}</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-5 sm:px-5">
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="retention-controls-title">
          <div className="mb-5 flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><ShieldCheck size={19} /></span><div><h2 id="retention-controls-title" className="text-lg rr-fw-black rr-text-navy">{t("adminAuditRetention.controlsTitle", { defaultValue: "Data lifecycle" })}</h2><p className="mt-1 text-sm font-bold rr-text-navy-muted">{t("adminAuditRetention.controlsDescription", { defaultValue: "Changing a window immediately removes only records older than the new limit. Records remain sanitized and administrator-only." })}</p></div></div>
          {policy.isLoading ? <div className="flex min-h-32 items-center justify-center"><Loader2 size={22} className="animate-spin rr-text-navy-muted" /></div> : <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: "oklch(0.88 0.03 260)" }}><span className="text-sm rr-fw-black rr-text-navy">{t("adminAuditRetention.routeDays", { defaultValue: "Route audit history" })}</span><span className="text-xs font-bold rr-text-navy-muted">{t("adminAuditRetention.routeDaysHelp", { defaultValue: "Days to retain sanitized public-route audit outcomes." })}</span><div className="flex items-center gap-2"><input aria-label={t("adminAuditRetention.routeDays", { defaultValue: "Route audit history" })} type="number" min={MIN_RETENTION_DAYS} max={MAX_RETENTION_DAYS} value={routeDays} onChange={(event) => setRouteDays(Number(event.target.value))} className="h-11 w-28 rounded-lg border bg-white px-3 text-sm font-black rr-text-navy" style={{ borderColor: "oklch(0.84 0.04 260)" }} /><span className="text-sm font-bold rr-text-navy-muted">{t("adminAuditRetention.days", { defaultValue: "days" })}</span></div></label>
            <label className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: "oklch(0.88 0.03 260)" }}><span className="text-sm rr-fw-black rr-text-navy">{t("adminAuditRetention.rendererDays", { defaultValue: "Renderer-error history" })}</span><span className="text-xs font-bold rr-text-navy-muted">{t("adminAuditRetention.rendererDaysHelp", { defaultValue: "Days to retain sanitized preview-renderer failure signals." })}</span><div className="flex items-center gap-2"><input aria-label={t("adminAuditRetention.rendererDays", { defaultValue: "Renderer-error history" })} type="number" min={MIN_RETENTION_DAYS} max={MAX_RETENTION_DAYS} value={rendererDays} onChange={(event) => setRendererDays(Number(event.target.value))} className="h-11 w-28 rounded-lg border bg-white px-3 text-sm font-black rr-text-navy" style={{ borderColor: "oklch(0.84 0.04 260)" }} /><span className="text-sm font-bold rr-text-navy-muted">{t("adminAuditRetention.days", { defaultValue: "days" })}</span></div></label>
          </div>}
          {invalid && <p role="alert" className="mt-4 rounded-xl px-3 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{t("adminAuditRetention.invalid", { defaultValue: "Choose a retention window from 7 to 3,650 days." })}</p>}
          <button type="button" disabled={policy.isLoading || invalid || updatePolicy.isPending} onClick={() => setConfirmOpen(true)} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:cursor-not-allowed disabled:opacity-50"><Settings2 size={16} />{t("adminAuditRetention.save", { defaultValue: "Save and apply retention" })}</button>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="release-export-schedule-title">
          <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><CalendarClock size={19} /></span><div><h2 id="release-export-schedule-title" className="text-lg rr-fw-black rr-text-navy">{t("adminExportSchedule.title", { defaultValue: "Automated release-history report" })}</h2><p className="mt-1 text-sm font-bold rr-text-navy-muted">{t("adminExportSchedule.description", { defaultValue: "Create a bounded sanitized CSV snapshot on a UTC schedule. The latest report remains available to administrators in Audit history." })}</p></div></div>
          <label className="mt-5 flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "oklch(0.88 0.03 260)" }}><input type="checkbox" checked={scheduleEnabled} onChange={(event) => setScheduleEnabled(event.target.checked)} className="size-4 accent-[oklch(0.80_0.18_80)]" /><span className="text-sm font-black rr-text-navy">{t("adminExportSchedule.enabled", { defaultValue: "Enable automated reports" })}</span></label>
          <label className="mt-4 flex flex-col gap-2"><span className="text-sm rr-fw-black rr-text-navy">{t("adminExportSchedule.cron", { defaultValue: "UTC schedule" })}</span><span className="text-xs font-bold rr-text-navy-muted">{t("adminExportSchedule.cronHelp", { defaultValue: "Use six fields: seconds, minutes, hours, day, month, weekday. Default: Monday at 09:00 UTC." })}</span><input value={scheduleCronExpression} onChange={(event) => setScheduleCronExpression(event.target.value)} disabled={!scheduleEnabled} className="h-11 max-w-md rounded-lg border bg-white px-3 font-mono text-sm font-bold rr-text-navy disabled:opacity-50" style={{ borderColor: "oklch(0.84 0.04 260)" }} /></label>
          <button type="button" disabled={updateSchedule.isPending} onClick={() => updateSchedule.mutate({ enabled: scheduleEnabled, cronExpression: scheduleCronExpression, statusFilter: "all", sortBy: "recordedAt", sortDirection: "desc", selectedColumns: ["recordedAtUtc", "checkpointId", "protectedMainCommit", "protectedMainTree", "managedTree", "parityStatus"] })} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:opacity-50">{updateSchedule.isPending && <Loader2 size={15} className="animate-spin" />}{t("adminExportSchedule.save", { defaultValue: "Save report schedule" })}</button>
          {exportSchedule.data?.lastRunAt && <p className="mt-3 text-xs font-bold rr-text-navy-muted">{t("adminExportSchedule.lastRun", { defaultValue: "Last report: {{date}} · {{count}} rows", date: new Date(exportSchedule.data.lastRunAt).toLocaleString(), count: exportSchedule.data.lastRunRowCount ?? 0 })}</p>}
          {exportRuns.data?.length ? <ul className="mt-4 space-y-2" aria-label={t("adminExportSchedule.recentRuns", { defaultValue: "Recent automated reports" })}>{exportRuns.data.map((run) => <li key={run.id} className="flex items-center justify-between gap-3 rounded-lg rr-bg-surface px-3 py-2 text-xs font-bold rr-text-navy"><span>{new Date(run.generatedAt).toLocaleString()}</span><span>{run.status === "ok" ? t("adminExportSchedule.ready", { defaultValue: "Ready" }) : t("adminExportSchedule.failed", { defaultValue: "Failed" })} · {run.rowCount} {t("adminExportSchedule.rows", { defaultValue: "rows" })}</span></li>)}</ul> : null}
        </section>

        {retentionChanges.data?.length ? <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5" aria-labelledby="retention-history-title"><h2 id="retention-history-title" className="text-lg rr-fw-black rr-text-navy">{t("adminRetentionHistory.title", { defaultValue: "Recent retention changes" })}</h2><ul className="mt-3 space-y-2">{retentionChanges.data.map((change) => <li key={change.id} className="rounded-lg rr-bg-surface px-3 py-2 text-xs font-bold rr-text-navy"><span>{new Date(change.changedAt).toLocaleString()}</span><span className="ml-2 rr-text-navy-muted">{t("adminRetentionHistory.summary", { defaultValue: "Route: {{fromRoute}} → {{toRoute}} days · Renderer: {{fromRenderer}} → {{toRenderer}} days", fromRoute: change.previousRouteAuditRetentionDays, toRoute: change.routeAuditRetentionDays, fromRenderer: change.previousRendererErrorRetentionDays, toRenderer: change.rendererErrorRetentionDays })}</span></li>)}</ul></section> : null}
      </main>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 rr-text-navy"><AlertTriangle size={18} className="text-amber-700" />{t("adminAuditRetention.confirmTitle", { defaultValue: "Apply retention limits?" })}</DialogTitle><DialogDescription>{t("adminAuditRetention.confirmDescription", { defaultValue: "Expired sanitized diagnostics will be permanently removed now. This cannot be undone." })}</DialogDescription></DialogHeader>
          <div className="rounded-xl rr-bg-surface p-3 text-sm font-bold rr-text-navy-muted">{t("adminAuditRetention.confirmSummary", { defaultValue: "Route audits: {{routeDays}} days · Renderer errors: {{rendererDays}} days", routeDays, rendererDays })}</div>
          <DialogFooter><button type="button" onClick={() => setConfirmOpen(false)} className="min-h-10 rounded-lg border bg-white px-4 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.86 0.04 260)" }}>{t("adminAuditRetention.cancel", { defaultValue: "Cancel" })}</button><button type="button" onClick={() => updatePolicy.mutate({ routeAuditRetentionDays: routeDays, rendererErrorRetentionDays: rendererDays })} disabled={updatePolicy.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-black rr-bg-gold rr-text-navy disabled:opacity-50">{updatePolicy.isPending && <Loader2 size={15} className="animate-spin" />}{t("adminAuditRetention.confirm", { defaultValue: "Apply and prune" })}</button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
