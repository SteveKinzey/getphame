import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Clock,
  Bell,
  BellRing,
  Activity,
  FileText,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts";

type RelayOutageCsvExport = {
  filename: string;
  mimeType: string;
  csv: string;
  rowCount: number;
  totalMatching: number;
  truncated: boolean;
  preview: {
    rows: Array<Record<string, string>>;
    rowCount: number;
    limit: number;
    truncated: boolean;
  };
};

function downloadCsvFile(csv: string, mimeType: string, filename: string) {
  const blob = new Blob([csv], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function EmailRelayStatusCard() {
  const { t } = useTranslation("translation");
  const [outageExport, setOutageExport] = useState<RelayOutageCsvExport | null>(
    null
  );
  const [outageExportOpen, setOutageExportOpen] = useState(false);
  const {
    data: relayStatus,
    isLoading,
    refetch,
  } = trpc.admin.relayHealthStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const triggerHeartbeat = trpc.admin.triggerRelayHeartbeat.useMutation({
    onSuccess: res => {
      if (res.status === "healthy") {
        toast.success(t("admin.emailRelay.primaryHealthyToast"));
      } else if (res.status === "failover") {
        toast.warning(t("admin.emailRelay.primaryUnreachableToast"));
      } else {
        toast.error(
          t("admin.emailRelay.diagnosticFailureToast", { message: res.status })
        );
      }
      refetch();
    },
    onError: err => {
      toast.error(
        t("admin.emailRelay.diagnosticFailureToast", { message: err.message })
      );
    },
  });

  const testSlackWebhook = trpc.admin.testRelaySlackWebhook.useMutation({
    onSuccess: res => {
      if (res.slackDelivered) {
        toast.success(t("admin.emailRelay.slackTestSuccess"));
      } else if (res.emailFallbackDelivered) {
        toast.warning(t("admin.emailRelay.slackTestFallback"));
      } else {
        toast.error(t("admin.emailRelay.slackTestFailure"));
      }
      refetch();
    },
    onError: err => {
      toast.error(
        t("admin.emailRelay.diagnosticFailureToast", { message: err.message })
      );
    },
  });

  const prepareOutageExport = trpc.admin.exportRelayOutageCsv.useMutation({
    onSuccess: result => {
      setOutageExport(result);
      setOutageExportOpen(true);
    },
    onError: error => {
      toast.error(
        t("admin.emailRelay.exportFailure", { message: error.message })
      );
    },
  });

  const downloadOutageExport = () => {
    if (!outageExport || outageExport.rowCount === 0) return;
    downloadCsvFile(
      outageExport.csv,
      outageExport.mimeType,
      outageExport.filename
    );
    toast.success(
      t("admin.emailRelay.exportDownloaded", { count: outageExport.rowCount })
    );
    setOutageExportOpen(false);
  };

  const isHealthy = relayStatus?.lastKnownStatus === "healthy";
  const isFailover =
    relayStatus?.lastKnownStatus === "failover" ||
    relayStatus?.activeFailoverIncident;
  const isUnconfigured = relayStatus?.lastKnownStatus === "unconfigured";

  const borderColor = isHealthy
    ? "border-emerald-200 bg-emerald-50/50"
    : isFailover
      ? "border-amber-300 bg-amber-50/60"
      : isUnconfigured
        ? "border-red-200 bg-red-50/50"
        : "border-slate-200 bg-white";

  // Prepare chart data for failover outages
  const outageChartData = useMemo(() => {
    if (!relayStatus?.outageHistory || relayStatus.outageHistory.length === 0) {
      return [];
    }
    return relayStatus.outageHistory
      .slice(0, 10)
      .reverse()
      .map((item, idx) => ({
        id: item.id,
        label: new Date(item.startedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        duration: item.durationMinutes,
        status: item.status,
        cause: item.cause,
      }));
  }, [relayStatus?.outageHistory]);

  return (
    <section
      data-testid="admin-email-relay-widget"
      className={`rounded-2xl border-2 p-5 shadow-sm transition ${borderColor}`}
      aria-labelledby="email-relay-status-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
              isHealthy
                ? "bg-emerald-600"
                : isFailover
                  ? "bg-amber-600"
                  : "bg-slate-600"
            }`}
          >
            <Mail size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
                {t("admin.emailRelay.eyebrow")}
              </p>
              {isHealthy && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={12} />{" "}
                  {t("admin.emailRelay.primaryActive")}
                </span>
              )}
              {isFailover && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  <AlertTriangle size={12} />{" "}
                  {t("admin.emailRelay.failoverActive")}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  relayStatus?.slackWebhookConfigured
                    ? "bg-purple-100 text-purple-800"
                    : "bg-slate-100 text-slate-600"
                }`}
                title={
                  relayStatus?.slackWebhookConfigured
                    ? t("admin.emailRelay.slackActiveHint")
                    : t("admin.emailRelay.slackStandbyHint")
                }
              >
                <Bell size={11} />
                {relayStatus?.slackWebhookConfigured
                  ? t("admin.emailRelay.slackConnected")
                  : t("admin.emailRelay.slackStandby")}
              </span>
            </div>
            <h2
              id="email-relay-status-title"
              className="mt-0.5 text-lg font-black rr-text-navy"
            >
              {t("admin.emailRelay.title")}
            </h2>
            <p className="mt-0.5 text-xs font-semibold rr-text-navy-muted">
              {t("admin.emailRelay.description")}
            </p>
            {relayStatus?.alertCooldownMinutes && (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {t("admin.emailRelay.alertCooldown", {
                  minutes: relayStatus.alertCooldownMinutes,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => prepareOutageExport.mutate()}
            disabled={prepareOutageExport.isPending || isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <Download
              size={14}
              className={prepareOutageExport.isPending ? "animate-pulse" : ""}
            />
            {prepareOutageExport.isPending
              ? t("admin.emailRelay.exportPreparing")
              : t("admin.emailRelay.exportOutages")}
          </button>
          <button
            type="button"
            onClick={() => testSlackWebhook.mutate()}
            disabled={testSlackWebhook.isPending || isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 shadow-sm transition hover:bg-purple-100 active:scale-95 disabled:opacity-50"
          >
            <BellRing
              size={14}
              className={testSlackWebhook.isPending ? "animate-pulse" : ""}
            />
            {testSlackWebhook.isPending
              ? t("admin.emailRelay.slackTesting")
              : t("admin.emailRelay.slackTest")}
          </button>
          <button
            type="button"
            onClick={() => triggerHeartbeat.mutate()}
            disabled={triggerHeartbeat.isPending || isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={triggerHeartbeat.isPending ? "animate-spin" : ""}
            />
            {triggerHeartbeat.isPending
              ? t("admin.emailRelay.testing")
              : t("admin.emailRelay.check")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center justify-center py-6 text-xs text-slate-500">
          {t("admin.emailRelay.loading")}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* Channel badges */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`size-2.5 rounded-full ${
                    relayStatus?.primaryConfigured
                      ? isFailover
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />
                <div>
                  <p className="text-xs font-bold rr-text-navy">
                    {t("admin.emailRelay.primary")}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {relayStatus?.primaryHost
                      ? t("admin.emailRelay.host", {
                          host: relayStatus.primaryHost,
                        })
                      : t("admin.emailRelay.notConfigured")}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  relayStatus?.primaryConfigured
                    ? isFailover
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {relayStatus?.primaryConfigured
                  ? isFailover
                    ? t("admin.emailRelay.offline")
                    : t("admin.emailRelay.healthy")
                  : t("admin.emailRelay.missing")}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`size-2.5 rounded-full ${
                    relayStatus?.backupConfigured
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }`}
                />
                <div>
                  <p className="text-xs font-bold rr-text-navy">
                    {t("admin.emailRelay.backup")}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {relayStatus?.backupConfigured
                      ? t("admin.emailRelay.backupReady")
                      : t("admin.emailRelay.backupMissing")}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  relayStatus?.backupConfigured
                    ? isFailover
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {relayStatus?.backupConfigured
                  ? isFailover
                    ? t("admin.emailRelay.servingTraffic")
                    : t("admin.emailRelay.standby")
                  : t("admin.emailRelay.missing")}
              </span>
            </div>
          </div>

          {/* Outage Duration Chart */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-slate-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t("admin.emailRelay.outageTitle")}
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                {t("admin.emailRelay.incidents", {
                  count: outageChartData.length,
                })}
              </span>
            </div>

            {outageChartData.length === 0 ? (
              <div className="mt-2.5 flex h-24 items-center justify-center rounded-lg bg-slate-50/70 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  {t("admin.emailRelay.noOutages")}
                </p>
              </div>
            ) : (
              <div className="mt-3 h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={outageChartData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      unit="m"
                    />
                    <Tooltip
                      formatter={(value: any, _name: any, item: any) => [
                        `${value} ${t(value === 1 ? "admin.emailRelay.minute" : "admin.emailRelay.minutes")}`,
                        item?.payload?.status === "ongoing"
                          ? t("admin.emailRelay.durationOngoing")
                          : t("admin.emailRelay.durationResolved"),
                      ]}
                      labelFormatter={(label, items) => {
                        const cause = items?.[0]?.payload?.cause;
                        return `${label}${cause ? ` · ${cause.slice(0, 40)}` : ""}`;
                      }}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                    />
                    <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
                      {outageChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.status === "ongoing" ? "#f59e0b" : "#64748b"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Recent failover event log */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("admin.emailRelay.recentEvents")}
              </p>
              {relayStatus?.lastCheckedAt && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Clock size={11} />{" "}
                  {t("admin.emailRelay.lastChecked", {
                    time: new Date(
                      relayStatus.lastCheckedAt
                    ).toLocaleTimeString(),
                  })}
                </span>
              )}
            </div>

            {!relayStatus?.recentEvents ||
            relayStatus.recentEvents.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {t("admin.emailRelay.noEvents")}
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100">
                {relayStatus.recentEvents.map(evt => (
                  <div
                    key={evt.id}
                    className="flex items-start justify-between py-1.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span>{evt.fromProvider.toUpperCase()}</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="text-amber-800">
                          {evt.toProvider.toUpperCase()}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">
                          {evt.source}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">
                        {evt.reason}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last ten sanitized heartbeat diagnostics. Never renders raw provider output. */}
          <details className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <span className="flex items-center gap-2">
                <FileText size={14} className="text-slate-500" />
                {t("admin.emailRelay.diagnosticsTitle")}
              </span>
              <span className="text-[11px] font-medium normal-case tracking-normal text-slate-400">
                {relayStatus?.recentDiagnostics?.length ?? 0}/10
              </span>
            </summary>
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {t("admin.emailRelay.diagnosticsCaption")}
            </p>

            {!relayStatus?.recentDiagnostics ||
            relayStatus.recentDiagnostics.length === 0 ? (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                {t("admin.emailRelay.diagnosticsEmpty")}
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
                {relayStatus.recentDiagnostics.map(item => {
                  const sourceLabel =
                    item.source === "scheduled_heartbeat"
                      ? t("admin.emailRelay.sourceScheduled")
                      : t("admin.emailRelay.sourceManual");
                  const statusLabel =
                    item.status === "healthy"
                      ? t("admin.emailRelay.statusHealthy")
                      : item.status === "failover"
                        ? t("admin.emailRelay.statusFailover")
                        : item.status === "degraded"
                          ? t("admin.emailRelay.statusDegraded")
                          : t("admin.emailRelay.statusUnconfigured");
                  const alertLabel = item.slackAlertSent
                    ? t("admin.emailRelay.alertDelivered")
                    : item.emailFallbackDelivered
                      ? t("admin.emailRelay.alertFallbackDelivered")
                      : t("admin.emailRelay.alertNotSent");
                  return (
                    <li key={item.id} className="p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span className="font-bold text-slate-800">
                          {statusLabel}
                        </span>
                        <time className="text-[11px] font-medium text-slate-400">
                          {new Date(item.checkedAt).toLocaleString()}
                        </time>
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:grid-cols-4">
                        <div>
                          <dt className="sr-only">
                            {t("admin.emailRelay.source")}
                          </dt>
                          <dd>{sourceLabel}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">
                            {t("admin.emailRelay.relay")}
                          </dt>
                          <dd>{item.activeRelay.toUpperCase()}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">
                            {t("admin.emailRelay.duration")}
                          </dt>
                          <dd>{item.durationMs} ms</dd>
                        </div>
                        <div>
                          <dt className="sr-only">
                            {t("admin.emailRelay.alertDelivery")}
                          </dt>
                          <dd>{alertLabel}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 break-words rounded-md bg-slate-50 px-2.5 py-2 font-mono text-[11px] leading-5 text-slate-600">
                        <span className="font-sans font-semibold text-slate-500">
                          {t("admin.emailRelay.sanitizedDiagnostic")}:{" "}
                        </span>
                        {item.diagnostic}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </details>
        </div>
      )}

      <Dialog open={outageExportOpen} onOpenChange={setOutageExportOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto rounded-2xl border-slate-200 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="rr-text-navy">
              {t("admin.emailRelay.exportDialogTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium rr-text-navy-muted">
              {t("admin.emailRelay.exportDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          {outageExport && (
            <div className="space-y-3">
              <div
                role="status"
                className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                {t("admin.emailRelay.exportSummary", {
                  count: outageExport.rowCount,
                  total: outageExport.totalMatching,
                })}
                {outageExport.truncated
                  ? ` ${t("admin.emailRelay.exportTruncated")}`
                  : ""}
              </div>
              {outageExport.rowCount === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
                  {t("admin.emailRelay.exportEmpty")}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">
                          {t("admin.emailRelay.exportStarted")}
                        </th>
                        <th className="px-3 py-2">
                          {t("admin.emailRelay.exportStatus")}
                        </th>
                        <th className="px-3 py-2">
                          {t("admin.emailRelay.exportDuration")}
                        </th>
                        <th className="px-3 py-2">
                          {t("admin.emailRelay.exportCause")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {outageExport.preview.rows.map(row => (
                        <tr key={row.outageId}>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {new Date(row.startedAtUtc).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 font-semibold">
                            {row.status}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.durationMinutes}{" "}
                            {t("admin.emailRelay.minutes")}
                          </td>
                          <td
                            className="max-w-80 truncate px-3 py-2.5 font-mono text-[11px]"
                            title={row.causeSanitized}
                          >
                            {row.causeSanitized}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOutageExportOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              {t("admin.emailRelay.exportCancel")}
            </button>
            <button
              type="button"
              onClick={downloadOutageExport}
              disabled={!outageExport || outageExport.rowCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl rr-bg-gold px-4 py-2 text-sm font-black rr-text-navy transition active:scale-95 disabled:opacity-50"
            >
              <Download size={15} /> {t("admin.emailRelay.exportDownload")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
