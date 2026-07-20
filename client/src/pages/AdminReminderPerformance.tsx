import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminReminderPerformancePage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const performance = trpc.admin.reminderPerformance.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/", { replace: true });
  }, [loading, navigate, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm"><Loader2 className="animate-spin rr-text-navy" size={28} /></div>;
  }
  if (user?.role !== "admin") return null;

  const rows = performance.data ?? [];

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="rr-bg-navy px-5 pb-7 pt-14">
        <button onClick={() => navigate("/admin")} className="mb-4 flex items-center gap-1.5 text-sm font-semibold rr-text-gold">
          <ArrowLeft size={15} /> Administration hub
        </button>
        <div className="flex items-center gap-2 text-white">
          <Activity size={18} />
          <span className="text-xs font-medium uppercase tracking-[0.18em]">Get Phame operations</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Reminder performance</h1>
        <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-white/90">
          Platform-wide last-touch timing attribution using sent reminders with immutable timing snapshots. Legacy rows without snapshots are excluded rather than estimated.
        </p>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {performance.isLoading ? (
          <div className="flex items-center justify-center rounded-2xl bg-white py-16 shadow-sm"><Loader2 className="animate-spin rr-text-navy" size={28} /></div>
        ) : performance.error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 text-red-700" size={20} /><div><h2 className="font-semibold rr-text-navy">Performance data unavailable</h2><p className="mt-1 text-sm font-normal rr-text-navy-muted">No result is inferred while the operational query is unavailable.</p></div></div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-7 text-center shadow-sm">
            <BarChart3 className="mx-auto rr-text-navy-muted" size={34} />
            <h2 className="mt-3 text-lg font-semibold rr-text-navy">No attributable reminder data yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-normal leading-6 rr-text-navy-muted">Reporting begins after reminders with timing snapshots are sent. No reviews, outcomes, or conversion rates are fabricated for this empty state.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row, index) => (
              <article key={`${row.stage}-${row.firstDelayDays}-${row.secondDelayDays}-${index}`} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] rr-text-navy-muted">Stage {row.stage}</p>
                    <h2 className="mt-1 text-lg font-semibold rr-text-navy">Day {row.stage === 1 ? row.firstDelayDays : row.firstDelayDays + row.secondDelayDays}</h2>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.isLowSample ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{row.isLowSample ? "Low sample" : "Established"}</span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl rr-bg-cream-warm p-3"><dt className="text-xs font-normal rr-text-navy-muted">Sent</dt><dd className="mt-1 text-xl font-semibold rr-text-navy">{row.sentCount}</dd></div>
                  <div className="rounded-xl rr-bg-cream-warm p-3"><dt className="text-xs font-normal rr-text-navy-muted">Success rate</dt><dd className="mt-1 text-xl font-semibold rr-text-navy">{row.successRate == null ? "—" : `${row.successRate}%`}</dd></div>
                </dl>
                <p className="mt-4 text-xs font-normal leading-5 rr-text-navy-muted">Configuration: first {row.firstStageEnabled ? "on" : "off"} at {row.firstDelayDays}d; second {row.secondStageEnabled ? "on" : "off"} +{row.secondDelayDays}d.</p>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
