// ReviewLink — Admin: SMTP Provider Failure Stats
// Only accessible to users with role === "admin"
// Shows breakdown of SMTP health check results per provider/host across all users

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  BarChart2,
  ChevronLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
} from "lucide-react";
import { toast } from "sonner";

function HealthBar({ ok, fail, neverChecked }: { ok: number; fail: number; neverChecked: number }) {
  const total = ok + fail + neverChecked;
  if (total === 0) return null;
  const okPct = (ok / total) * 100;
  const failPct = (fail / total) * 100;
  const neverPct = (neverChecked / total) * 100;
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full" style={{ background: "oklch(0.93 0.02 260)" }}>
      {okPct > 0 && (
        <div style={{ width: `${okPct}%`, background: "oklch(0.55 0.18 145)" }} />
      )}
      {failPct > 0 && (
        <div style={{ width: `${failPct}%`, background: "oklch(0.60 0.20 27)" }} />
      )}
      {neverPct > 0 && (
        <div style={{ width: `${neverPct}%`, background: "oklch(0.80 0.02 260)" }} />
      )}
    </div>
  );
}

export default function AdminSmtpStatsPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, refetch, isFetching } = trpc.admin.smtpStats.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const runHealthCheck = trpc.admin.runHealthCheck.useMutation({
    onSuccess: (result) => {
      toast.success(`Health check complete — ran at ${new Date(result.ranAt).toLocaleTimeString()}`);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Health check failed."),
  });

  // Redirect non-admins
  if (!loading && user?.role !== "admin") {
    navigate("/");
    return null;
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center rr-bg-cream-warm">
        <Loader2 size={24} className="animate-spin rr-text-navy-muted" />
      </div>
    );
  }

  const { summary = [], totals } = data ?? {};
  const failRate = totals && totals.total > 0
    ? Math.round((totals.fail / totals.total) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/admin/codes")}
          className="flex items-center gap-1 mb-4 text-xs font-bold rr-text-gold"
        >
          <ChevronLeft size={14} />
          Admin
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={16} className="rr-text-gold" />
              <span
                className="text-xs font-bold tracking-widest uppercase rr-text-gold"
              >
                Admin
              </span>
            </div>
            <h1
              className="text-2xl text-white rr-fw-black"
            >
              SMTP Provider Stats
            </h1>
            <p className="text-xs mt-1" style={{ color: "oklch(0.70 0.04 260)" }}>
              Health check results across all connected accounts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => runHealthCheck.mutate()}
              disabled={runHealthCheck.isPending || isFetching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold rr-bg-gold rr-text-navy"
              title="Run health check now across all connected accounts"
            >
              {runHealthCheck.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {runHealthCheck.isPending ? "Running..." : "Run Now"}
            </button>
            <button
              onClick={() => { refetch(); toast.success("Refreshed"); }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "oklch(0.30 0.07 260)" }}
            >
              {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">
        {/* Totals summary cards */}
        {totals && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold mb-1 rr-text-navy-muted">Connected Accounts</p>
              <p className="text-3xl font-black rr-text-navy">
                {totals.total}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold mb-1 rr-text-navy-muted">Failure Rate</p>
              <p
                className="text-3xl font-black"
                style={{
                  color: failRate > 20 ? "oklch(0.50 0.18 27)" : failRate > 5 ? "oklch(0.55 0.18 80)" : "oklch(0.45 0.18 145)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {failRate}%
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <CheckCircle2 size={18} className="rr-text-green" />
              <div>
                <p className="text-xs font-bold rr-text-navy-muted">Healthy</p>
                <p className="text-xl font-black rr-text-navy">{totals.ok}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <AlertCircle size={18} style={{ color: "oklch(0.60 0.20 27)" }} />
              <div>
                <p className="text-xs font-bold rr-text-navy-muted">Failing</p>
                <p className="text-xl font-black rr-text-navy">{totals.fail}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last run timestamp */}
        {totals?.lastRunAt ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl rr-bg-surface">
            <Clock size={12} className="rr-text-navy-muted" />
            <p className="text-xs rr-text-navy-muted">
              Last health check run: <span className="font-bold">{new Date(totals.lastRunAt).toLocaleString()}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl rr-bg-surface">
            <Clock size={12} className="rr-text-navy-muted" />
            <p className="text-xs rr-text-navy-muted">No health checks have run yet.</p>
          </div>
        )}

        {/* Provider breakdown */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.93 0.02 260)" }}>
            <div className="flex items-center gap-2">
              <Server size={16} className="rr-text-navy-muted" />
              <h2 className="text-sm font-black rr-text-navy">
                By Provider
              </h2>
            </div>
          </div>

          {summary.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm rr-text-navy-muted">No SMTP accounts connected yet.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(0.95 0.01 260)" }}>
              {summary.map((row) => (
                <div key={row.host} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate rr-text-navy">
                        {row.host}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs rr-text-navy-muted">
                        <span>{row.total} account{row.total !== 1 ? "s" : ""}</span>
                        {row.ok > 0 && <span style={{ color: "oklch(0.45 0.18 145)" }}>✓ {row.ok} ok</span>}
                        {row.fail > 0 && <span style={{ color: "oklch(0.50 0.18 27)" }}>✗ {row.fail} failing</span>}
                        {row.neverChecked > 0 && <span className="rr-text-navy-faint">— {row.neverChecked} unchecked</span>}
                      </div>
                    </div>
                    {row.fail > 0 && (
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: "oklch(0.97 0.03 27)", color: "oklch(0.50 0.18 27)" }}
                      >
                        {Math.round((row.fail / row.total) * 100)}% fail
                      </span>
                    )}
                    {row.fail === 0 && row.ok > 0 && (
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold rr-bg-green-pale" style={{ color: "oklch(0.40 0.12 145)" }}
                      >
                        All healthy
                      </span>
                    )}
                  </div>
                  <HealthBar ok={row.ok} fail={row.fail} neverChecked={row.neverChecked} />
                  {/* Recent error samples */}
                  {row.recentErrors.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {row.recentErrors.map((err, i) => (
                        <p
                          key={i}
                          className="text-xs font-mono px-2 py-1 rounded-lg truncate"
                          style={{ background: "oklch(0.97 0.02 27)", color: "oklch(0.45 0.10 27)" }}
                          title={err}
                        >
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Never-checked note */}
        {totals && totals.neverChecked > 0 && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl text-xs"
            style={{ background: "oklch(0.97 0.03 80)", color: "oklch(0.45 0.10 80)" }}
          >
            <Clock size={14} className="shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">{totals.neverChecked} account{totals.neverChecked !== 1 ? "s" : ""}</span> have never been checked — the daily cron runs at midnight and will check them automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
