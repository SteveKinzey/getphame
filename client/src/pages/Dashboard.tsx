// ReviewLink — Dashboard / Analytics Screen
// Shows: total requests, monthly count, weekly breakdown chart, full activity log

import { trpc } from "@/lib/trpc";
import { BarChart2, Send, TrendingUp, Star, Loader2, Calendar, Zap, CheckCircle2, Circle, CheckSquare, Square, X, Search, Eye, MousePointerClick } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
  const { data: emailPerf } = trpc.tracking.overallStats.useQuery();
  const utils = trpc.useUtils();

  // Single-row toggle
  const markRespondedMutation = trpc.requests.markResponded.useMutation({
    onSuccess: () => utils.requests.list.invalidate(),
  });

  // Bulk selection state
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = (allRequests?.length ?? 0) > 0 && allRequests!.every((r) => selected.has(r.id));

  const toggleSelectAll = () => {
    if (!allRequests) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allRequests.map((r) => r.id)));
    }
  };

  // Search + status filter state
  const [activitySearch, setActivitySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reviewed">("all");

  // Bulk mark-as-responded mutation with optimistic update
  const bulkMarkRespondedMutation = trpc.requests.bulkMarkResponded.useMutation({
    onMutate: async ({ ids, responded }) => {
      await utils.requests.list.cancel();
      const prev = utils.requests.list.getData();
      utils.requests.list.setData(undefined, (old) =>
        old?.map((r) => ids.includes(r.id) ? { ...r, respondedAt: responded ? Date.now() : null } : r)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.requests.list.setData(undefined, ctx.prev);
      toast.error("Failed to update requests.");
    },
    onSuccess: (result) => {
      utils.requests.list.invalidate();
      utils.requests.stats.invalidate();
      toast.success(`${result.updated} request${result.updated !== 1 ? "s" : ""} updated.`);
      setSelected(new Set());
    },
  });

  // Filtered requests for activity feed
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    return allRequests.filter((r) => {
      const q = activitySearch.toLowerCase();
      const matchesSearch = !q ||
        r.customerName.toLowerCase().includes(q) ||
        (r.customerEmail ?? "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "reviewed" && !!r.respondedAt) ||
        (statusFilter === "pending" && !r.respondedAt);
      return matchesSearch && matchesStatus;
    });
  }, [allRequests, activitySearch, statusFilter]);

  // Keep Select All in sync with filtered list
  const allFilteredSelected = filteredRequests.length > 0 && filteredRequests.every((r) => selected.has(r.id));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredRequests.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredRequests.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };



  // Fetch open/click tracking stats for all loaded requests
  const requestIds = useMemo(() => allRequests?.map((r) => r.id) ?? [], [allRequests]);
  const { data: trackingStats } = trpc.tracking.requestStats.useQuery(
    { requestIds },
    { enabled: requestIds.length > 0 }
  );
  const trackingMap = useMemo(() => {
    const m = new Map<number, { opens: number; clicks: number }>();
    trackingStats?.forEach((s) => m.set(s.requestId, { opens: s.opens, clicks: s.clicks }));
    return m;
  }, [trackingStats]);

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
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
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


        {/* Email Performance Card */}
        {emailPerf && emailPerf.totalSent > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3
              className="text-sm font-black mb-3"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              Email Performance
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>Sent</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  {emailPerf.totalSent}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>Open Rate</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.55 0.20 145)", fontFamily: "'Poppins', sans-serif" }}>
                  {emailPerf.openRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1" style={{ color: "oklch(0.55 0.03 260)" }}>Click Rate</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.75 0.18 80)", fontFamily: "'Poppins', sans-serif" }}>
                  {emailPerf.clickRate}%
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 flex gap-4" style={{ borderTop: "1px solid oklch(0.94 0.01 260)" }}>
              <div className="flex items-center gap-1.5">
                <Eye size={13} style={{ color: "oklch(0.55 0.20 145)" }} />
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                  {emailPerf.uniqueOpens} unique opens
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MousePointerClick size={13} style={{ color: "oklch(0.75 0.18 80)" }} />
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                  {emailPerf.uniqueClicks} unique clicks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-black"
              style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
            >
              All Activity
              {(allRequests?.length ?? 0) > 0 && (
                <span className="ml-1.5 text-xs font-normal" style={{ color: "oklch(0.60 0.03 260)" }}>
                  {filteredRequests.length !== allRequests!.length
                    ? `${filteredRequests.length} of ${allRequests!.length}`
                    : allRequests!.length}
                </span>
              )}
            </h3>
            {(allRequests?.length ?? 0) > 0 && (
              <button
                onClick={toggleSelectAllFiltered}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors"
                style={{
                  background: allFilteredSelected ? "oklch(0.22 0.09 260)" : "oklch(0.96 0.01 260)",
                  color: allFilteredSelected ? "oklch(0.80 0.18 80)" : "oklch(0.45 0.05 260)",
                }}
              >
                {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                {allFilteredSelected ? "Deselect All" : "Select All"}
              </button>
            )}
          </div>

          {/* Search + status filter */}
          {(allRequests?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "oklch(0.65 0.03 260)" }} />
                <Input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Search by name or email…"
                  className="pl-8 pr-8 text-sm h-9 bg-gray-50 border-gray-200"
                />
                {activitySearch && (
                  <button
                    onClick={() => setActivitySearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {(["all", "pending", "reviewed"] as const).map((opt) => {
                  const labels = { all: "All", pending: "Pending", reviewed: "Reviewed" };
                  const active = statusFilter === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setStatusFilter(opt)}
                      className="px-3 py-1 rounded-full text-xs font-bold transition-colors"
                      style={{
                        background: active
                          ? opt === "reviewed" ? "oklch(0.88 0.10 80)" : opt === "pending" ? "oklch(0.96 0.04 145)" : "oklch(0.22 0.09 260)"
                          : "oklch(0.96 0.01 260)",
                        color: active
                          ? opt === "reviewed" ? "oklch(0.35 0.12 80)" : opt === "pending" ? "oklch(0.45 0.12 145)" : "oklch(0.80 0.18 80)"
                          : "oklch(0.45 0.05 260)",
                      }}
                    >
                      {labels[opt]}
                    </button>
                  );
                })}
                {(activitySearch || statusFilter !== "all") && (
                  <button
                    onClick={() => { setActivitySearch(""); setStatusFilter("all"); }}
                    className="ml-auto text-xs px-2 py-1 rounded-lg"
                    style={{ color: "oklch(0.55 0.03 260)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

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
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <Search size={28} style={{ color: "oklch(0.80 0.03 260)" }} />
              <p className="text-sm" style={{ color: "oklch(0.60 0.03 260)" }}>No matching requests</p>
              <button
                onClick={() => { setActivitySearch(""); setStatusFilter("all"); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg mt-1"
                style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.45 0.05 260)" }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {filteredRequests.map((req, idx) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: idx < filteredRequests.length - 1 ? "1px solid oklch(0.94 0.01 260)" : "none",
                    background: selected.has(req.id) ? "oklch(0.97 0.02 260)" : "transparent",
                    borderRadius: selected.has(req.id) ? "8px" : undefined,
                    paddingLeft: selected.has(req.id) ? "6px" : undefined,
                    paddingRight: selected.has(req.id) ? "6px" : undefined,
                    marginLeft: selected.has(req.id) ? "-6px" : undefined,
                    marginRight: selected.has(req.id) ? "-6px" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(req.id)}
                      className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                      style={{ color: selected.has(req.id) ? "oklch(0.45 0.12 280)" : undefined }}
                      title={selected.has(req.id) ? "Deselect" : "Select"}
                    >
                      {selected.has(req.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
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
                  <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                    <button
                      onClick={() => markRespondedMutation.mutate({ id: req.id, responded: !req.respondedAt })}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors"
                      title={req.respondedAt ? "Mark as not responded" : "Mark as left a review"}
                      style={req.respondedAt ? {
                        background: "oklch(0.88 0.10 80)",
                        color: "oklch(0.35 0.12 80)",
                      } : {
                        background: "oklch(0.96 0.04 145)",
                        color: "oklch(0.45 0.12 145)",
                      }}
                    >
                      {req.respondedAt
                        ? <><CheckCircle2 size={11} className="mr-0.5" /> Reviewed</>
                        : <><Circle size={11} className="mr-0.5" /> Sent</>
                      }
                    </button>
                    <p className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>
                      {formatDate(new Date(req.sentAt))}
                    </p>
                    {/* Open / click badges */}
                    {trackingMap.has(req.id) && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {(trackingMap.get(req.id)!.opens > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: "oklch(0.93 0.04 260)", color: "oklch(0.40 0.08 260)" }}
                            title="Email opened"
                          >
                            <Eye size={10} />
                            {trackingMap.get(req.id)!.opens}
                          </span>
                        )}
                        {(trackingMap.get(req.id)!.clicks > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: "oklch(0.92 0.08 80)", color: "oklch(0.40 0.12 80)" }}
                            title="Review link clicked"
                          >
                            <MousePointerClick size={10} />
                            {trackingMap.get(req.id)!.clicks}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl"
          style={{ background: "oklch(0.22 0.09 260)", minWidth: "280px" }}
        >
          <span className="text-xs font-bold flex-1" style={{ color: "oklch(0.80 0.18 80)" }}>
            {selected.size} selected
          </span>
          <button
            onClick={() => bulkMarkRespondedMutation.mutate({ ids: Array.from(selected), responded: true })}
            disabled={bulkMarkRespondedMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-colors"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
          >
            {bulkMarkRespondedMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Mark Reviewed
          </button>
          <button
            onClick={() => bulkMarkRespondedMutation.mutate({ ids: Array.from(selected), responded: false })}
            disabled={bulkMarkRespondedMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-colors"
            style={{ background: "oklch(0.32 0.07 260)", color: "rgba(255,255,255,0.8)" }}
          >
            <Circle size={12} />
            Mark Sent
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
