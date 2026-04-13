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

  // Redirect non-admins
  if (!loading && user?.role !== "admin") {
    navigate("/");
    return null;
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.975 0.003 100)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "oklch(0.55 0.04 260)" }} />
      </div>
    );
  }

  const { summary = [], totals } = data ?? {};
  const failRate = totals && totals.total > 0
    ? Math.round((totals.fail / totals.total) * 100)
    : 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/admin/codes")}
          className="flex items-center gap-1 mb-4 text-xs font-bold"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ChevronLeft size={14} />
          Admin
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
              >
                Admin
              </span>
            </div>
            <h1
              className="text-2xl"
              style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
            >
              SMTP Provider Stats
            </h1>
            <p className="text-xs mt-1" style={{ color: "oklch(0.70 0.04 260)" }}>
              Health check results across all connected accounts
            </p>
          </div>
          <button
            onClick={() => { refetch(); toast.success("Refreshed"); }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{ background: "oklch(0.30 0.07 260)", color: "white" }}
          >
            {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-4">
        {/* Totals summary cards */}
        {totals && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>Connected Accounts</p>
              <p className="text-3xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                {totals.total}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>Failure Rate</p>
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
              <CheckCircle2 size={18} style={{ color: "oklch(0.55 0.18 145)" }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "oklch(0.55 0.03 260)" }}>Healthy</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>{totals.ok}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <AlertCircle size={18} style={{ color: "oklch(0.60 0.20 27)" }} />
              <div>
                <p className="text-xs font-bold" style={{ color: "oklch(0.55 0.03 260)" }}>Failing</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>{totals.fail}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last run timestamp */}
        {totals?.lastRunAt ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "oklch(0.96 0.01 260)" }}>
            <Clock size={12} style={{ color: "oklch(0.55 0.03 260)" }} />
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
              Last health check run: <span className="font-bold">{new Date(totals.lastRunAt).toLocaleString()}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: "oklch(0.96 0.01 260)" }}>
            <Clock size={12} style={{ color: "oklch(0.55 0.03 260)" }} />
            <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>No health checks have run yet.</p>
          </div>
        )}

        {/* Provider breakdown */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(0.93 0.02 260)" }}>
            <div className="flex items-center gap-2">
              <Server size={16} style={{ color: "oklch(0.55 0.04 260)" }} />
              <h2 className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                By Provider
              </h2>
            </div>
          </div>

          {summary.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: "oklch(0.60 0.03 260)" }}>No SMTP accounts connected yet.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "oklch(0.95 0.01 260)" }}>
              {summary.map((row) => (
                <div key={row.host} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                        {row.host}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                        <span>{row.total} account{row.total !== 1 ? "s" : ""}</span>
                        {row.ok > 0 && <span style={{ color: "oklch(0.45 0.18 145)" }}>✓ {row.ok} ok</span>}
                        {row.fail > 0 && <span style={{ color: "oklch(0.50 0.18 27)" }}>✗ {row.fail} failing</span>}
                        {row.neverChecked > 0 && <span style={{ color: "oklch(0.65 0.02 260)" }}>— {row.neverChecked} unchecked</span>}
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
                        className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.40 0.12 145)" }}
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
