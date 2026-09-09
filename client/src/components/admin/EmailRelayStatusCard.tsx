import { trpc } from "@/lib/trpc";
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, Clock } from "lucide-react";
import { toast } from "sonner";

export function EmailRelayStatusCard() {
  const { data: relayStatus, isLoading, refetch } = trpc.admin.relayHealthStatus.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const triggerHeartbeat = trpc.admin.triggerRelayHeartbeat.useMutation({
    onSuccess: (res) => {
      if (res.status === "healthy") {
        toast.success("Primary SMTP relay is healthy.");
      } else if (res.status === "failover") {
        toast.warning("Primary SMTP unreachable; operating on SendGrid backup.");
      } else {
        toast.error(`Relay status: ${res.status}`);
      }
      refetch();
    },
    onError: (err) => {
      toast.error(`Diagnostic check failed: ${err.message}`);
    },
  });

  const hasChecked = Boolean(relayStatus?.lastCheckedAt);
  const isHealthy = hasChecked && relayStatus?.lastKnownStatus === "healthy";
  const isFailover = relayStatus?.lastKnownStatus === "failover" || relayStatus?.activeFailoverIncident;
  const isUnconfigured = relayStatus?.lastKnownStatus === "unconfigured";

  const borderColor = isHealthy
    ? "border-emerald-200 bg-emerald-50/50"
    : isFailover
    ? "border-amber-300 bg-amber-50/60"
    : isUnconfigured
    ? "border-red-200 bg-red-50/50"
    : "border-slate-200 bg-white";

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
            <div className="flex items-center gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
                System email relay
              </p>
              {isHealthy && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={12} /> Primary active
                </span>
              )}
              {isFailover && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  <AlertTriangle size={12} /> Failover active
                </span>
              )}
            </div>
            <h2
              id="email-relay-status-title"
              className="mt-0.5 text-lg font-black rr-text-navy"
            >
              Operational Delivery & Failover
            </h2>
            <p className="mt-0.5 text-xs font-semibold rr-text-navy-muted">
              Auto-fails over to Twilio SendGrid backup if primary SYSTEM_SMTP experiences an outage.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => triggerHeartbeat.mutate()}
          disabled={triggerHeartbeat.isPending || isLoading}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={triggerHeartbeat.isPending ? "animate-spin" : ""} />
          {triggerHeartbeat.isPending ? "Testing relay…" : "Check relay health"}
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center justify-center py-6 text-xs text-slate-500">
          Loading email relay status…
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
                  <p className="text-xs font-bold rr-text-navy">Primary: SYSTEM_SMTP</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {relayStatus?.primaryHost ? `Host: ${relayStatus.primaryHost}` : "Not configured in env"}
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
                {relayStatus?.primaryConfigured ? (isFailover ? "Offline" : "Healthy") : "Missing"}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`size-2.5 rounded-full ${
                    relayStatus?.backupConfigured ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <div>
                  <p className="text-xs font-bold rr-text-navy">Backup: Twilio SendGrid</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {relayStatus?.backupConfigured ? "SENDGRID_API_KEY bound (failover ready)" : "API key not set"}
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
                {relayStatus?.backupConfigured ? (isFailover ? "Serving traffic" : "Standby") : "Missing"}
              </span>
            </div>
          </div>

          {/* Recent failover event log */}
          <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Failover Events
              </p>
              {relayStatus?.lastCheckedAt && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Clock size={11} /> Last checked {new Date(relayStatus.lastCheckedAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {(!relayStatus?.recentEvents || relayStatus.recentEvents.length === 0) ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                No failover events recorded. All operational traffic has dispatched normally through the primary relay.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-slate-100">
                {relayStatus.recentEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start justify-between py-1.5 text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span>{evt.fromProvider.toUpperCase()}</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="text-amber-800">{evt.toProvider.toUpperCase()}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">
                          {evt.source}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{evt.reason}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
