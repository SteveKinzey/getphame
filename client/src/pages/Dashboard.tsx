// ReviewLink — Dashboard / Analytics Screen
// Shows: total requests, monthly count, weekly breakdown chart, full activity log

import { trpc } from "@/lib/trpc";
import { BarChart2, Send, TrendingUp, Star, Crown, Loader2, Calendar, Zap } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { useMemo } from "react";

function formatDate(date: Date): string {
  try {
    return format(date, "MMM d, h:mm a");
  } catch {
    return String(date);
  }
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.requests.stats.useQuery();
  const { data: allRequests, isLoading: listLoading } = trpc.requests.list.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();

  const isPro = profile?.tier === "pro";

  // Build last-7-days bar chart data
  const weeklyData = useMemo(() => {
    if (!allRequests) return [];
    const days: { label: string; count: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      const count = allRequests.filter((r) => {
        const sent = new Date(r.sentAt).getTime();
        return sent >= day.getTime() && sent < nextDay.getTime();
      }).length;
      days.push({ label: format(day, "EEE"), count, date: day });
    }
    return days;
  }, [allRequests]);

  const maxCount = useMemo(() => Math.max(...weeklyData.map((d) => d.count), 1), [weeklyData]);

  // Velocity: requests in last 7 days vs prior 7 days
  const velocity = useMemo(() => {
    if (!allRequests) return null;
    const now = Date.now();
    const last7 = allRequests.filter((r) => new Date(r.sentAt).getTime() > now - 7 * 86400000).length;
    const prior7 = allRequests.filter((r) => {
      const t = new Date(r.sentAt).getTime();
      return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
    }).length;
    const delta = last7 - prior7;
    return { last7, prior7, delta };
  }, [allRequests]);

  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 pb-8" style={{ background: "oklch(0.22 0.09 260)" }}>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            Dashboard
          </span>
        </div>
        <h1
          className="text-2xl mb-6"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Your Results
        </h1>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "This Month", value: stats?.thisMonth ?? 0, icon: <Send size={14} /> },
            { label: "All Time", value: stats?.total ?? 0, icon: <TrendingUp size={14} /> },
            { label: "Last 7 Days", value: velocity?.last7 ?? 0, icon: <Star size={14} /> },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl px-3 py-3 text-center"
              style={{ background: "oklch(0.30 0.08 260)" }}
            >
              <div
                className="flex items-center justify-center gap-1 mb-1"
                style={{ color: "oklch(0.80 0.18 80)" }}
              >
                {s.icon}
              </div>
              <div
                className="text-2xl font-black"
                style={{ color: "white", fontFamily: "'Poppins', sans-serif" }}
              >
                {isLoading ? "—" : s.value}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* ── Analytics Card: Weekly Breakdown ─────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              <Calendar size={14} className="inline mr-1.5 mb-0.5" />
              Last 7 Days
            </h3>
            {velocity && (
              <div className="flex items-center gap-1">
                <Zap size={12} style={{ color: velocity.delta >= 0 ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.18 27)" }} />
                <span
                  className="text-xs font-bold"
                  style={{ color: velocity.delta >= 0 ? "oklch(0.45 0.12 145)" : "oklch(0.55 0.18 27)" }}
                >
                  {velocity.delta >= 0 ? "+" : ""}{velocity.delta} vs prior week
                </span>
              </div>
            )}
          </div>

          {(isLoading || listLoading) ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : weeklyData.every((d) => d.count === 0) ? (
            <div className="text-center py-6">
              <p className="text-sm" style={{ color: "oklch(0.60 0.03 260)" }}>
                No requests in the last 7 days
              </p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {weeklyData.map((day) => (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{
                        height: `${Math.max(4, (day.count / maxCount) * 72)}px`,
                        background: day.count > 0 ? "oklch(0.22 0.09 260)" : "oklch(0.93 0.01 260)",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.55 0.03 260)" }}>
                    {day.label}
                  </span>
                  {day.count > 0 && (
                    <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)" }}>
                      {day.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Velocity summary */}
          {velocity && (stats?.total ?? 0) > 0 && (
            <div
              className="mt-3 pt-3 flex items-center justify-between"
              style={{ borderTop: "1px solid oklch(0.94 0.01 260)" }}
            >
              <div className="text-center flex-1">
                <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>This week</p>
                <p className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  {velocity.last7}
                </p>
              </div>
              <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
              <div className="text-center flex-1">
                <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>Prior week</p>
                <p className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  {velocity.prior7}
                </p>
              </div>
              <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
              <div className="text-center flex-1">
                <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>All time</p>
                <p className="text-base font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  {stats?.total ?? 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Free tier progress */}
        {!isPro && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                Free Plan Usage
              </p>
              <span className="text-xs font-bold" style={{ color: "oklch(0.50 0.04 260)" }}>
                {stats?.thisMonth ?? 0} / 10 this month
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.93 0.01 260)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((stats?.thisMonth ?? 0) / 10) * 100)}%`,
                  background: (stats?.thisMonth ?? 0) >= 10 ? "oklch(0.65 0.22 27)" : "oklch(0.80 0.18 80)",
                }}
              />
            </div>
            {(stats?.thisMonth ?? 0) >= 10 && (
              <button
                onClick={() => navigate("/upgrade")}
                className="mt-3 w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2"
                style={{
                  background: "oklch(0.22 0.09 260)",
                  color: "oklch(0.80 0.18 80)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <Crown size={14} />
                Upgrade to Pro — Unlimited Requests
              </button>
            )}
          </div>
        )}

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3
            className="text-sm font-black mb-4"
            style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
          >
            All Activity
          </h3>

          {(isLoading || listLoading) ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
          ) : !allRequests || allRequests.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Send size={32} style={{ color: "oklch(0.80 0.03 260)" }} />
              <p className="text-sm text-center" style={{ color: "oklch(0.60 0.03 260)" }}>
                No review requests yet.
                <br />
                Send your first one from the Send tab!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {allRequests.map((req, idx) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: idx < allRequests.length - 1 ? "1px solid oklch(0.94 0.01 260)" : "none",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                    >
                      {req.customerName[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>
                        {req.customerName}
                      </p>
                      <p className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>
                        {req.customerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: "oklch(0.96 0.04 145)",
                        color: "oklch(0.45 0.12 145)",
                      }}
                    >
                      Sent
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.65 0.03 260)" }}>
                      {formatDate(new Date(req.sentAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
