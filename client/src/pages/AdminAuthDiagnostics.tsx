import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Activity, AlertCircle, ArrowLeft, BellRing, CheckCircle2, Clock3, Filter, Gauge, KeyRound, Loader2, MailCheck, RefreshCw, Search, ShieldCheck } from "lucide-react";

type HealthValue = "ok" | "fail";

const eventLabels: Record<string, string> = {
  token_created: "Token created",
  provider_accepted: "Provider accepted",
  provider_failed: "Provider failed",
  verification_success: "Verification succeeded",
  verification_failed: "Verification failed",
};

function StatusPill({ value }: { value: HealthValue | string }) {
  const ok = value === "ok";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold" style={{ background: ok ? "oklch(0.94 0.05 145)" : "oklch(0.96 0.04 27)", color: ok ? "oklch(0.40 0.14 145)" : "oklch(0.48 0.17 27)" }}>
      {ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {ok ? "Healthy" : "Needs attention"}
    </span>
  );
}

function formatDate(value: number | Date | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function AdminAuthDiagnosticsPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [emailInput, setEmailInput] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [outcome, setOutcome] = useState<"all" | "ok" | "fail">("all");
  const [days, setDays] = useState(7);
  const [manualHealthResult, setManualHealthResult] = useState<{
    overallStatus: string;
    checkedAt: number;
    durationMs: number;
    failureCode?: string | null;
    failureDetail?: string | null;
  } | null>(null);
  const [manualHealthError, setManualHealthError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, user, navigate]);

  const queryInput = useMemo(() => ({
    email: emailFilter || undefined,
    outcome: outcome === "all" ? undefined : outcome,
    days,
    limit: 75,
  }), [emailFilter, outcome, days]);

  const { data, error, isLoading, isFetching, refetch } = trpc.authDiagnostics.dashboard.useQuery(queryInput, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
  });

  const runHealthCheck = trpc.authDiagnostics.runHealthCheck.useMutation({
    onMutate: () => {
      setManualHealthResult(null);
      setManualHealthError(null);
    },
    onSuccess: (result) => {
      setManualHealthResult(result);
      const message = result.overallStatus === "ok" ? "Production auth health check passed." : `Auth health check failed: ${result.failureCode ?? "unknown failure"}`;
      if (result.overallStatus === "ok") toast.success(message); else toast.error(message);
      refetch();
    },
    onError: (error) => {
      const message = error.message || "Health check could not run.";
      setManualHealthError(message);
      toast.error(message);
    },
  });

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center rr-bg-cream-warm"><Loader2 size={26} className="animate-spin rr-text-navy-muted" /></div>;
  }
  if (user?.role !== "admin") return null;
  if (error) {
    return <div className="min-h-screen flex items-center justify-center px-4 rr-bg-cream-warm"><div role="alert" className="w-full max-w-lg rounded-2xl bg-white p-6 text-center shadow-sm"><div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "oklch(0.96 0.04 27)", color: "oklch(0.48 0.17 27)" }}><AlertCircle size={22} /></div><h1 className="text-xl rr-fw-black rr-text-navy">Monitoring data unavailable</h1><p className="mt-2 text-sm font-bold rr-text-navy-muted">Authentication diagnostics could not be loaded. No health status is being inferred from missing data.</p><p className="mt-2 text-xs font-bold rr-text-navy-faint">{error.message}</p><div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center"><button onClick={() => refetch()} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold rr-bg-gold rr-text-navy"><RefreshCw size={14} /> Try again</button><button onClick={() => navigate("/admin")} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold rr-bg-navy text-white"><ArrowLeft size={14} /> Admin dashboard</button></div></div></div>;
  }

  const latestHealth = data?.healthChecks?.[0];
  const uptime = data?.uptime;
  const summary = data?.summary ?? [];
  const events = data?.events ?? [];
  const healthHistory = data?.healthChecks ?? [];
  const failedHealthChecks = healthHistory.filter((row) => row.overallStatus === "fail");
  const totalFor = (eventType: string, eventOutcome?: string) => summary
    .filter((row) => row.eventType === eventType && (!eventOutcome || row.outcome === eventOutcome))
    .reduce((total, row) => total + Number(row.total ?? 0), 0);
  const signals = latestHealth ? [
    ["Configuration", latestHealth.configStatus],
    ["Database", latestHealth.databaseStatus],
    ["User schema", latestHealth.userSchemaStatus],
    ["Magic-link table", latestHealth.magicLinkSchemaStatus],
    ["Session signing", latestHealth.sessionStatus],
    ["Email provider", latestHealth.emailProviderStatus],
  ] as const : [];

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pt-14 pb-7">
        <button onClick={() => navigate("/admin")} className="mb-4 flex items-center gap-1.5 text-sm font-bold rr-text-gold"><ArrowLeft size={14} /> Admin dashboard</button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 rr-text-gold"><ShieldCheck size={17} /><span className="text-xs font-bold uppercase tracking-[0.18em]">Get Phame operations</span></div>
            <h1 className="text-2xl text-white rr-fw-black sm:text-3xl">Authentication Diagnostics</h1>
            <p className="mt-1 max-w-2xl text-sm font-bold text-white/90">Monitor production readiness, email-provider acceptance, and magic-link verification without exposing full recipients or tokens.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => runHealthCheck.mutate()} disabled={runHealthCheck.isPending} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold rr-bg-gold rr-text-navy disabled:opacity-60" title="Run a non-destructive production authentication health check now">
              {runHealthCheck.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} {runHealthCheck.isPending ? "Checking auth dependencies…" : "Run immediate health check"}
            </button>
            <button onClick={() => { refetch(); toast.success("Diagnostics refreshed."); }} disabled={isFetching} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: "oklch(0.30 0.07 260)" }}>
              {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-5 sm:px-5">
        {(runHealthCheck.isPending || manualHealthResult || manualHealthError) && <section aria-live="polite" role={manualHealthError ? "alert" : "status"} className="overflow-hidden rounded-2xl border bg-white shadow-sm" style={{ borderColor: runHealthCheck.isPending ? "oklch(0.80 0.18 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.72 0.15 27)" : "oklch(0.61 0.15 145)" }}>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: runHealthCheck.isPending ? "oklch(0.96 0.04 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.97 0.03 27)" : "oklch(0.94 0.05 145)", color: runHealthCheck.isPending ? "oklch(0.46 0.12 80)" : manualHealthError || manualHealthResult?.overallStatus === "fail" ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}>
                {runHealthCheck.isPending ? <Loader2 size={20} className="animate-spin" /> : manualHealthError || manualHealthResult?.overallStatus === "fail" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm rr-fw-black rr-text-navy">{runHealthCheck.isPending ? "Checking auth dependencies" : manualHealthError ? "Immediate health check unavailable" : manualHealthResult?.overallStatus === "ok" ? "Immediate health check passed" : "Immediate health check found an issue"}</p>
                <p className="mt-1 text-xs font-bold rr-text-navy-muted">{runHealthCheck.isPending ? "Testing configuration, database, schema, session signing, and email-provider reachability. No user, token, session, or email is created." : manualHealthError ?? (manualHealthResult?.overallStatus === "ok" ? `Completed ${formatDate(manualHealthResult.checkedAt)} in ${manualHealthResult.durationMs} ms.` : `${manualHealthResult?.failureCode ?? "health_check_failed"}: ${manualHealthResult?.failureDetail ?? "Review the detailed failure event below."}`)}</p>
              </div>
            </div>
            {runHealthCheck.isPending && <div className="flex items-center gap-1.5 self-start sm:self-auto" aria-label="Health check in progress"><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold" /><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold [animation-delay:150ms]" /><span className="h-2 w-2 animate-pulse rounded-full rr-bg-gold [animation-delay:300ms]" /></div>}
          </div>
        </section>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric title="Latest health" icon={<ShieldCheck size={15} />}><div>{latestHealth ? <StatusPill value={latestHealth.overallStatus} /> : <span className="text-sm font-bold rr-text-navy-faint">No run yet</span>}</div><p className="mt-2 text-xs font-bold rr-text-navy-faint">{formatDate(latestHealth?.checkedAt)}</p></Metric>
          <Metric title="Provider accepted" icon={<MailCheck size={15} />} value={totalFor("provider_accepted", "ok")} note={`Last ${days} days`} />
          <Metric title="Verified links" icon={<KeyRound size={15} />} value={totalFor("verification_success", "ok")} note={`Last ${days} days`} />
          <Metric title="Verification failures" icon={<AlertCircle size={15} />} value={totalFor("verification_failed", "fail")} note={`Last ${days} days`} danger />
        </section>

        <section aria-labelledby="uptime-heading" className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" style={{ borderColor: "oklch(0.91 0.02 260)" }}>
            <div>
              <div className="mb-1 flex items-center gap-2 rr-text-gold"><Activity size={16} /><span className="text-xs font-bold uppercase tracking-[0.16em]">24-hour observation</span></div>
              <h2 id="uptime-heading" className="text-base rr-fw-black rr-text-navy">Scheduled authentication uptime</h2>
              <p className="text-sm font-bold rr-text-navy-muted">Measured from real 15-minute production Heartbeat runs.</p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full px-3 py-2 text-xs font-bold sm:self-auto" style={{ background: !uptime ? "oklch(0.96 0.04 80)" : uptime.currentIncidentOpen ? "oklch(0.96 0.04 27)" : "oklch(0.94 0.05 145)", color: !uptime ? "oklch(0.46 0.12 80)" : uptime.currentIncidentOpen ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}>
              {!uptime ? <Clock3 size={13} /> : uptime.currentIncidentOpen ? <AlertCircle size={13} /> : <BellRing size={13} />}
              {!uptime ? "Monitoring unavailable" : uptime.currentIncidentOpen ? "Active incident" : "Failure alerts armed"}
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl p-4 rr-bg-surface sm:p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <UptimeMetric label="Uptime" value={uptime?.uptimePercent === null || uptime?.uptimePercent === undefined ? "—" : `${uptime.uptimePercent}%`} icon={<Gauge size={14} />} />
                <UptimeMetric label="Observed runs" value={`${uptime?.runCount ?? 0}/${uptime?.expectedRuns ?? 96}`} icon={<Activity size={14} />} />
                <UptimeMetric label="Incidents" value={String(uptime?.incidentCount ?? 0)} icon={<AlertCircle size={14} />} danger={Boolean(uptime?.incidentCount)} />
                <UptimeMetric label="Avg. latency" value={uptime?.averageDurationMs === null || uptime?.averageDurationMs === undefined ? "—" : `${uptime.averageDurationMs} ms`} icon={<Clock3 size={14} />} />
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold rr-text-navy-muted"><span>{uptime?.observationComplete ? "Rolling window complete" : "Collecting first 24 hours"}</span><span>{uptime?.coveragePercent ?? 0}% coverage</span></div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "oklch(0.88 0.03 260)" }}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${uptime?.coveragePercent ?? 0}%`, background: "oklch(0.80 0.18 80)" }} /></div>
                <div className="mt-3 flex flex-col gap-1 text-xs font-bold rr-text-navy-faint sm:flex-row sm:justify-between"><span>Latest: {formatDate(uptime?.latestCheckedAt)}</span><span>{uptime?.remainingRuns ?? 96} scheduled runs remaining</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {(uptime?.components ?? []).map((component) => <div key={component.key} className="rounded-xl border p-3" style={{ borderColor: "oklch(0.91 0.02 260)" }}><div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-bold rr-text-navy-mid">{component.label}</p><StatusPill value={component.latestStatus ?? "fail"} /></div><p className="text-xl rr-fw-black rr-text-navy">{component.uptimePercent === null ? "—" : `${component.uptimePercent}%`}</p><p className="text-[11px] font-bold rr-text-navy-faint">{component.successfulRuns} healthy · {component.failedRuns} failed</p></div>)}
              {!uptime?.components?.length && <div className="col-span-2 flex min-h-28 items-center justify-center rounded-xl border border-dashed p-4 text-center text-sm font-bold rr-text-navy-muted sm:col-span-3 lg:col-span-2" style={{ borderColor: "oklch(0.86 0.03 260)" }}>The first scheduled run will populate component uptime.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base rr-fw-black rr-text-navy">Production auth signals</h2><p className="text-sm font-bold rr-text-navy-muted">Non-destructive checks; no user, token, cookie, or email is created.</p></div>
            {latestHealth && <p className="text-xs font-bold rr-text-navy-faint">Completed in {latestHealth.durationMs} ms</p>}
          </div>
          {signals.length ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">{signals.map(([label, value]) => <div key={label} className="rounded-xl p-3 rr-bg-surface"><p className="mb-2 text-xs font-bold rr-text-navy-mid">{label}</p><StatusPill value={value} /></div>)}</div> : <p className="rounded-xl p-4 text-sm font-bold rr-bg-surface rr-text-navy-muted">Run the first health check to establish a baseline.</p>}
          {latestHealth?.failureDetail && <div className="mt-3 rounded-xl px-4 py-3 text-sm font-bold" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}>{latestHealth.failureCode}: {latestHealth.failureDetail}</div>}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2"><Filter size={16} className="rr-text-gold" /><h2 className="text-base rr-fw-black rr-text-navy">Magic-link delivery trail</h2></div>
          <form className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_130px_auto]" onSubmit={(event) => { event.preventDefault(); setEmailFilter(emailInput.trim().toLowerCase()); }}>
            <label className="relative"><span className="sr-only">Filter by exact email</span><Search size={15} className="absolute left-3 top-3.5 rr-text-navy-faint" /><input type="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="Exact customer email" className="h-11 w-full rounded-xl border bg-white pl-9 pr-3 text-sm font-bold rr-text-navy outline-none focus:ring-2" style={{ borderColor: "oklch(0.88 0.03 260)" }} /></label>
            <select value={outcome} onChange={(event) => setOutcome(event.target.value as "all" | "ok" | "fail")} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value="all">All outcomes</option><option value="ok">Successful</option><option value="fail">Failed</option></select>
            <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold rr-text-navy" style={{ borderColor: "oklch(0.88 0.03 260)" }}><option value={1}>24 hours</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select>
            <button type="submit" className="h-11 rounded-xl px-4 text-sm font-bold rr-bg-navy text-white">Apply</button>
          </form>
          {emailFilter && <button onClick={() => { setEmailInput(""); setEmailFilter(""); }} className="mb-3 text-xs font-bold rr-text-gold">Clear exact-email filter</button>}
          {events.length === 0 ? <div className="rounded-xl px-4 py-8 text-center rr-bg-surface"><p className="text-sm font-bold rr-text-navy-muted">No matching lifecycle events.</p></div> : (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "oklch(0.91 0.02 260)" }}>
              <div className="hidden grid-cols-[160px_130px_110px_1fr_110px] gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide rr-bg-surface rr-text-navy-muted md:grid"><span>Time</span><span>Event</span><span>Recipient</span><span>Detail</span><span>Outcome</span></div>
              <div className="divide-y" style={{ borderColor: "oklch(0.92 0.02 260)" }}>{events.map((row) => <div key={row.id} className="grid gap-2 px-4 py-4 md:grid-cols-[160px_130px_110px_1fr_110px] md:items-center md:gap-3">
                <div className="flex items-center gap-2 text-xs font-bold rr-text-navy-faint"><Clock3 size={13} />{formatDate(row.occurredAt)}</div><p className="text-sm font-black rr-text-navy">{eventLabels[row.eventType] ?? row.eventType}</p><p className="text-sm font-bold rr-text-navy-mid">{row.emailMasked ?? "—"}</p>
                <div className="min-w-0 text-xs font-bold rr-text-navy-muted"><p className="truncate" title={row.detailMessage ?? row.providerMessageId ?? row.requestId}>{row.detailMessage ?? (row.providerMessageId ? `Provider ID ${row.providerMessageId}` : `Request ${row.requestId.slice(0, 8)}…`)}</p>{row.durationMs !== null && <p className="rr-text-navy-faint">{row.durationMs} ms</p>}</div><StatusPill value={row.outcome} />
              </div>)}</div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-base rr-fw-black rr-text-navy">Health check history &amp; failure events</h2><p className="text-sm font-bold rr-text-navy-muted">Every persisted scheduled or manual check, with sanitized failure detail when a dependency fails.</p></div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: failedHealthChecks.length ? "oklch(0.97 0.03 27)" : "oklch(0.94 0.05 145)", color: failedHealthChecks.length ? "oklch(0.48 0.17 27)" : "oklch(0.40 0.14 145)" }}><AlertCircle size={13} />{failedHealthChecks.length} failure event{failedHealthChecks.length === 1 ? "" : "s"}</div>
          </div>
          <div className="flex flex-col gap-3">
            {healthHistory.slice(0, 20).map((row) => <article key={row.id} className="rounded-xl border p-3 rr-bg-surface sm:p-4" style={{ borderColor: row.overallStatus === "fail" ? "oklch(0.84 0.08 27)" : "oklch(0.88 0.03 260)" }}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm rr-fw-black rr-text-navy">{formatDate(row.checkedAt)}</p><p className="mt-1 text-xs font-bold rr-text-navy-faint">{row.triggerSource === "manual" ? "Administrator-triggered" : "Scheduled Heartbeat"} · {row.durationMs} ms{row.providerName ? ` · ${row.providerName}` : ""}</p></div><StatusPill value={row.overallStatus} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold sm:grid-cols-3 lg:grid-cols-6"><HealthComponent label="Config" value={row.configStatus} /><HealthComponent label="Database" value={row.databaseStatus} /><HealthComponent label="User schema" value={row.userSchemaStatus} /><HealthComponent label="Magic links" value={row.magicLinkSchemaStatus} /><HealthComponent label="Sessions" value={row.sessionStatus} /><HealthComponent label="Email" value={row.emailProviderStatus} /></div>
              {row.overallStatus === "fail" && <div className="mt-3 rounded-lg px-3 py-2" style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.46 0.12 27)" }}><p className="text-xs font-black">{row.failureCode ?? "health_check_failed"}</p><p className="mt-1 text-xs font-bold">Sanitized failure detail: {row.failureDetail ?? "No additional detail was recorded."}</p></div>}
            </article>)}
            {!healthHistory.length && <p className="rounded-xl p-4 text-sm font-bold rr-bg-surface rr-text-navy-muted">No health-check history yet. Use the administrator-only immediate check to establish a baseline.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ title, icon, value, note, danger, children }: { title: string; icon: React.ReactNode; value?: number; note?: string; danger?: boolean; children?: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="mb-1 flex items-center gap-2 text-sm font-bold rr-text-navy-mid">{icon}{title}</p>{value !== undefined && <p className="text-3xl rr-fw-black" style={{ color: danger ? "oklch(0.50 0.18 27)" : "oklch(0.22 0.09 260)" }}>{value}</p>}{note && <p className="text-xs font-bold rr-text-navy-faint">{note}</p>}{children}</div>;
}

function UptimeMetric({ label, value, icon, danger = false }: { label: string; value: string; icon: React.ReactNode; danger?: boolean }) {
  return <div><p className="mb-1 flex items-center gap-1.5 text-xs font-bold rr-text-navy-muted">{icon}{label}</p><p className="text-xl rr-fw-black" style={{ color: danger ? "oklch(0.50 0.18 27)" : "oklch(0.22 0.09 260)" }}>{value}</p></div>;
}

function HealthComponent({ label, value }: { label: string; value: HealthValue | string }) {
  const ok = value === "ok";
  return <div className="rounded-lg bg-white px-2.5 py-2"><p className="truncate rr-text-navy-faint">{label}</p><p className="mt-0.5" style={{ color: ok ? "oklch(0.40 0.14 145)" : "oklch(0.48 0.17 27)" }}>{ok ? "Healthy" : "Failed"}</p></div>;
}
