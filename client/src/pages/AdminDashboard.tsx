// AdminDashboard — platform-wide stats for the app owner
// Only accessible to users with role=admin

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  Users,
  Send,
  Wifi,
  Crown,
  TrendingUp,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Star,
  Zap,
  Infinity,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import { Rocket } from "lucide-react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading, error } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: upsellStats } = trpc.admin.upsellStats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const utils = trpc.useUtils();
  const { data: searchResults, isFetching: isSearching } = trpc.admin.searchUsers.useQuery(
    { query: debouncedSearch },
    { enabled: !!user && debouncedSearch.trim().length >= 2 }
  );

  const setTier = trpc.admin.setTier.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(`Tier updated to ${vars.tier}`);
      utils.admin.searchUsers.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update tier"),
  });

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!isAuthenticated || !user) return null;

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.975 0.003 100)" }}>
        <div className="text-center px-6">
          <ShieldAlert size={48} className="mx-auto mb-3" style={{ color: "oklch(0.55 0.18 25)" }} />
          <h2 className="text-xl font-black" style={{ fontFamily: "'Poppins', sans-serif" }}>Access Denied</h2>
          <p className="text-sm mt-1 text-gray-500">Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 mb-4 text-xs font-bold"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ArrowLeft size={14} /> Back to Home
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Rocket size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
          >
            ReviewLink
          </span>
        </div>
        <h1
          className="text-2xl"
          style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}
        >
          Admin Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          Platform-wide stats
        </p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin" size={32} style={{ color: "oklch(0.22 0.09 260)" }} />
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl px-4 py-4 text-sm"
            style={{ background: "oklch(0.95 0.03 25)", color: "oklch(0.45 0.18 25)" }}
          >
            Failed to load stats: {error.message}
          </div>
        )}

        {stats && (
          <>
            {/* Top KPI row */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={<Users size={20} style={{ color: "oklch(0.80 0.18 80)" }} />}
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
              />
              <KpiCard
                icon={<Send size={20} style={{ color: "oklch(0.80 0.18 80)" }} />}
                label="Total Sends"
                value={stats.totalSends.toLocaleString()}
              />
              <KpiCard
                icon={<TrendingUp size={20} style={{ color: "oklch(0.80 0.18 80)" }} />}
                label="Sends (30d)"
                value={stats.sendsLast30.toLocaleString()}
              />
              <KpiCard
                icon={<Wifi size={20} style={{ color: "oklch(0.80 0.18 80)" }} />}
                label="Active SMTP"
                value={`${stats.activeSmtp} / ${stats.totalSmtp}`}
              />
              <KpiCard
                icon={<TrendingUp size={20} style={{ color: "oklch(0.55 0.18 150)" }} />}
                label="Upsell Clicks (30d)"
                value={upsellStats ? upsellStats.last30.toLocaleString() : "—"}
              />
              <KpiCard
                icon={<CheckCircle2 size={20} style={{ color: "oklch(0.55 0.18 150)" }} />}
                label="Upsell Clicks (all)"
                value={upsellStats ? upsellStats.total.toLocaleString() : "—"}
              />
            </div>

            {/* Tier breakdown */}
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Tier Breakdown
              </h3>
              <div className="flex flex-col gap-2">
                <TierRow
                  icon={<Users size={14} style={{ color: "oklch(0.55 0.04 260)" }} />}
                  label="Free"
                  count={stats.tierCounts.free}
                  total={stats.totalUsers}
                  color="oklch(0.75 0.04 260)"
                />
                <TierRow
                  icon={<Star size={14} style={{ color: "oklch(0.55 0.18 80)" }} />}
                  label="Pro Monthly"
                  count={stats.tierCounts.pro}
                  total={stats.totalUsers}
                  color="oklch(0.80 0.18 80)"
                />
                <TierRow
                  icon={<Zap size={14} style={{ color: "oklch(0.55 0.18 80)" }} />}
                  label="Pro Annual"
                  count={stats.tierCounts.annual}
                  total={stats.totalUsers}
                  color="oklch(0.70 0.18 80)"
                />
                <TierRow
                  icon={<Infinity size={14} style={{ color: "oklch(0.55 0.22 150)" }} />}
                  label="Lifetime"
                  count={stats.tierCounts.lifetime}
                  total={stats.totalUsers}
                  color="oklch(0.60 0.22 150)"
                />
              </div>

              {/* Conversion rate */}
              <div
                className="mt-3 pt-3 flex items-center justify-between text-xs"
                style={{ borderTop: "1px solid oklch(0.92 0.01 260)" }}
              >
                <span style={{ color: "oklch(0.55 0.04 260)" }}>Paid conversion rate</span>
                <span className="font-black" style={{ color: "oklch(0.22 0.09 260)" }}>
                  {stats.totalUsers > 0
                    ? (
                        ((stats.tierCounts.pro + stats.tierCounts.annual + stats.tierCounts.lifetime) /
                          stats.totalUsers) *
                        100
                      ).toFixed(1)
                    : "0"}
                  %
                </span>
              </div>
            </div>

            {/* Recent signups */}
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Recent Signups
              </h3>
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No users yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...stats.recentUsers].reverse().map((u) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>
                          {u.name || "(no name)"}
                        </p>
                        <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>
                          {u.email}
                        </p>
                      </div>
                      <p className="text-xs" style={{ color: "oklch(0.65 0.04 260)" }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User search */}
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                User Search
              </h3>
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "oklch(0.55 0.04 260)" }}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl pl-8 pr-8 py-2.5 text-sm outline-none"
                  style={{
                    background: "oklch(0.97 0.003 260)",
                    border: "1px solid oklch(0.88 0.02 260)",
                    color: "oklch(0.22 0.09 260)",
                  }}
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: "oklch(0.55 0.04 260)" }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {isSearching && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className="animate-spin" style={{ color: "oklch(0.55 0.04 260)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>Searching…</span>
                </div>
              )}
              {!isSearching && searchResults && searchResults.length === 0 && debouncedSearch.length >= 2 && (
                <p className="text-xs py-2" style={{ color: "oklch(0.55 0.04 260)" }}>No users found.</p>
              )}
              {!isSearching && searchResults && searchResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: "1px solid oklch(0.94 0.01 260)" }}
                    >
                      <div>
                        <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>
                          {u.name || "(no name)"}
                        </p>
                        <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>{u.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={u.tier ?? "free"}
                          disabled={setTier.isPending}
                          onChange={e => setTier.mutate({ userId: u.id, tier: e.target.value as "free" | "pro" | "annual" | "lifetime" })}
                          className="text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
                          style={{
                            background: u.tier === "lifetime"
                              ? "oklch(0.92 0.08 150)"
                              : u.tier === "annual" || u.tier === "pro"
                                ? "oklch(0.95 0.08 80)"
                                : "oklch(0.93 0.02 260)",
                            color: u.tier === "lifetime"
                              ? "oklch(0.35 0.15 150)"
                              : u.tier === "annual" || u.tier === "pro"
                                ? "oklch(0.45 0.15 80)"
                                : "oklch(0.45 0.04 260)",
                            border: "none",
                          }}
                        >
                          <option value="free">free</option>
                          <option value="pro">pro</option>
                          <option value="annual">annual</option>
                          <option value="lifetime">lifetime</option>
                        </select>
                        {setTier.isPending && <Loader2 size={10} className="animate-spin" style={{ color: "oklch(0.55 0.04 260)" }} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {debouncedSearch.length < 2 && (
                <p className="text-xs" style={{ color: "oklch(0.70 0.03 260)" }}>Type at least 2 characters to search.</p>
              )}
            </div>

            {/* Quick links */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/admin/codes")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold"
                style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
              >
                <span className="flex items-center gap-2">
                  <Crown size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
                  Access Codes
                </span>
                <span style={{ color: "oklch(0.80 0.18 80)" }}>→</span>
              </button>
              <button
                onClick={() => navigate("/admin/smtp-stats")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold"
                style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
              >
                <span className="flex items-center gap-2">
                  <Wifi size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
                  SMTP Health
                </span>
                <span style={{ color: "oklch(0.80 0.18 80)" }}>→</span>
              </button>
              <button
                onClick={() => navigate("/admin/churn")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold"
                style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
              >
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
                  Churn Surveys
                </span>
                <span style={{ color: "oklch(0.80 0.18 80)" }}>→</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-4 flex flex-col gap-2"
      style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      {icon}
      <p className="text-2xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>
        {label}
      </p>
    </div>
  );
}

function TierRow({
  icon,
  label,
  count,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.04 260)" }}>
            {label}
          </span>
          <span className="text-xs font-black" style={{ color: "oklch(0.22 0.09 260)" }}>
            {count}
          </span>
        </div>
        <div className="h-1.5 rounded-full w-full" style={{ background: "oklch(0.92 0.01 260)" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}
