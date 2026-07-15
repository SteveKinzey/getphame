// AdminDashboard — platform-wide stats for the app owner
// Only accessible to users with role=admin

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
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
  DollarSign,
  Gift,
  KeyRound,
  AlertTriangle,
} from "lucide-react";

import { useDebounce } from "use-debounce";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [smtpRetestResults, setSmtpRetestResults] = useState<Record<number, { ok: boolean; checkedAt: number; error: string | null }>>({});

  const { data: stats, isLoading, error } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: upsellStats } = trpc.admin.upsellStats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: failingSmtpUsers, isLoading: failingSmtpLoading } = trpc.admin.failingSmtpUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 30_000,
  });

  // Pre-fill search from ?search= URL param (e.g., deep-link from /admin/churn)
  const searchString = useSearch();
  const initialSearch = new URLSearchParams(searchString).get("search") ?? "";
  const [searchInput, setSearchInput] = useState(initialSearch);
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

  const retestSmtp = trpc.admin.retestUserSmtp.useMutation({
    onSuccess: (result, variables) => {
      setSmtpRetestResults((current) => ({ ...current, [variables.userId]: result }));
      result.ok
        ? toast.success("SMTP connection passed its re-test.")
        : toast.error(result.error || "SMTP connection failed its re-test.");
      utils.admin.failingSmtpUsers.invalidate();
    },
    onError: (error, variables) => {
      setSmtpRetestResults((current) => ({
        ...current,
        [variables.userId]: { ok: false, checkedAt: Date.now(), error: error.message || "SMTP re-test failed." },
      }));
      toast.error(error.message || "SMTP re-test failed.");
    },
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
      <div className="min-h-screen flex items-center justify-center rr-bg-cream-warm">
        <div className="text-center px-6">
          <ShieldAlert size={48} className="mx-auto mb-3" style={{ color: "oklch(0.55 0.18 25)" }} />
          <h2 className="text-xl font-black" style={{ fontFamily: "'Poppins', sans-serif" }}>Access Denied</h2>
          <p className="text-sm mt-1 text-gray-500">Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 rr-bg-navy">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 mb-4 text-sm font-bold rr-text-gold"
        >
          <ArrowLeft size={14} /> Back to Home
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Star size={16} className="rr-text-gold" />
          <span
            className="text-xs font-bold tracking-widest uppercase rr-text-gold"
          >
            Get Phame
          </span>
        </div>
        <h1
          className="text-2xl text-white rr-fw-black"
        >
          Admin Dashboard
        </h1>
        <p className="text-base font-bold mt-1 text-white/90">
          Platform-wide stats
        </p>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin rr-text-navy" size={32} />
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
            {/* MRR highlight card */}
            {(() => {
              const MONTHLY_PRICE = 29;
              const ANNUAL_MONTHLY_EQUIV = Math.round(290 / 12 * 100) / 100;
              const mrr = (stats.tierCounts.pro * MONTHLY_PRICE) + (stats.tierCounts.annual * ANNUAL_MONTHLY_EQUIV);
              const arr = mrr * 12;
              return (
                <div
                  className="rounded-2xl px-4 py-4 rr-bg-navy" style={{ border: "2px solid oklch(0.80 0.18 80)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="rr-text-gold" />
                    <span
                      className="text-xs font-black uppercase tracking-widest rr-text-gold"
                    >
                      Revenue
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold mb-0.5 text-white/70">MRR</p>
                      <p
                        className="text-2xl font-black text-white"
                      >
                        ${mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-0.5 text-white/70">ARR</p>
                      <p
                        className="text-2xl font-black rr-text-gold"
                      >
                        ${arr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/admin/revenue")}
                    className="mt-3 text-sm font-bold rr-text-gold"
                  >
                    Full Revenue Dashboard →
                  </button>
                </div>
              );
            })()}

            {/* Immediate SMTP remediation widget */}
            <section
              data-testid="failing-smtp-widget"
              className={`rounded-2xl border-2 p-4 shadow-sm ${
                failingSmtpUsers?.length
                  ? "border-red-300 bg-red-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
              aria-labelledby="failing-smtp-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${failingSmtpUsers?.length ? "bg-red-700 text-white" : "bg-emerald-700 text-white"}`}>
                    <AlertTriangle size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-black uppercase tracking-[0.14em] ${failingSmtpUsers?.length ? "text-red-700" : "text-emerald-800"}`}>
                      SMTP credential health
                    </p>
                    <h2 id="failing-smtp-title" className="mt-0.5 text-xl font-black rr-text-navy">
                      {failingSmtpLoading
                        ? "Checking failures…"
                        : failingSmtpUsers?.length
                          ? `${failingSmtpUsers.length} failing SMTP ${failingSmtpUsers.length === 1 ? "credential" : "credentials"}`
                          : "No failing SMTP credentials"}
                    </h2>
                    <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
                      {failingSmtpUsers?.length
                        ? "These accounts cannot currently send review requests. Re-test or remove the stored credentials."
                        : "All checked SMTP connections are currently healthy."}
                    </p>
                  </div>
                </div>
              </div>

              {failingSmtpUsers && failingSmtpUsers.length > 0 && (
                <div className="mt-4 space-y-2">
                  {failingSmtpUsers.slice(0, 4).map((credential) => (
                    <div key={credential.userId} className="rounded-xl bg-white/80 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black rr-text-navy">{credential.userName || credential.userEmail || `User #${credential.userId}`}</p>
                          <p className="truncate text-xs font-bold text-red-700">{credential.host}</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            data-testid={`retest-failing-smtp-${credential.userId}`}
                            disabled={retestSmtp.isPending && retestSmtp.variables?.userId === credential.userId}
                            onClick={() => retestSmtp.mutate({ userId: credential.userId })}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                          >
                            {retestSmtp.isPending && retestSmtp.variables?.userId === credential.userId ? "Re-testing…" : "Re-test SMTP"}
                          </button>
                          <button
                            type="button"
                            data-testid={`manage-failing-smtp-${credential.userId}`}
                            onClick={() => {
                              const accountQuery = credential.userEmail || credential.smtpUser || credential.userName || String(credential.userId);
                              navigate(`/admin/users?smtpStatus=failing&search=${encodeURIComponent(accountQuery)}`);
                            }}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-red-700 px-3 text-xs font-black text-white transition active:scale-[0.97]"
                          >
                            Manage user →
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold rr-text-navy-muted">{credential.userEmail || credential.smtpUser}</p>
                      <p data-testid={`smtp-health-${credential.userId}`} className="mt-1 text-xs font-bold rr-text-navy-muted">
                        Latest health: failed{credential.lastHealthCheck ? ` · ${new Date(credential.lastHealthCheck).toLocaleString()}` : " · not yet timestamped"}
                      </p>
                      {credential.lastHealthError && <p className="mt-1 line-clamp-2 text-xs font-bold text-red-700">{credential.lastHealthError}</p>}
                      {smtpRetestResults[credential.userId] && (
                        <p
                          data-testid={`smtp-retest-result-${credential.userId}`}
                          className={`mt-2 rounded-lg px-2 py-1.5 text-xs font-black ${smtpRetestResults[credential.userId].ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        >
                          {smtpRetestResults[credential.userId].ok ? "Re-test passed" : `Re-test failed: ${smtpRetestResults[credential.userId].error || "Connection rejected"}`}
                          {` · ${new Date(smtpRetestResults[credential.userId].checkedAt).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  ))}
                  {failingSmtpUsers.length > 4 && (
                    <p className="text-xs font-black text-red-700">+{failingSmtpUsers.length - 4} more failing connections</p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate("/admin/users?smtpStatus=failing")}
                className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-black text-white transition active:scale-[0.97] sm:w-auto ${failingSmtpUsers?.length ? "bg-red-700" : "rr-bg-navy"}`}
              >
                Review SMTP accounts →
              </button>
            </section>

            {/* Top KPI row */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                icon={<Users size={20} className="rr-text-gold" />}
                label="Total Users"
                value={stats.totalUsers.toLocaleString()}
              />
              <KpiCard
                icon={<Send size={20} className="rr-text-gold" />}
                label="Total Sends"
                value={stats.totalSends.toLocaleString()}
              />
              <KpiCard
                icon={<TrendingUp size={20} className="rr-text-gold" />}
                label="Sends (30d)"
                value={stats.sendsLast30.toLocaleString()}
              />
              <KpiCard
                icon={<Wifi size={20} className="rr-text-gold" />}
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
              className="rounded-2xl px-4 py-4 bg-white" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy"
              >
                Tier Breakdown
              </h3>
              <div className="flex flex-col gap-2">
                <TierRow
                  icon={<Users size={14} className="rr-text-navy-muted" />}
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
                <span className="rr-text-navy-muted">Paid conversion rate</span>
                <span className="font-black rr-text-navy">
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
              className="rounded-2xl px-4 py-4 bg-white" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy"
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
                        <p className="text-sm font-bold rr-text-navy">
                          {u.name || "(no name)"}
                        </p>
                        <p className="text-sm font-bold rr-text-navy-mid">
                          {u.email}
                        </p>
                      </div>
                      <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.04 260)" }}>
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
              className="rounded-2xl px-4 py-4 bg-white" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy"
              >
                User Search
              </h3>
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none rr-text-navy-muted"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl pl-8 pr-8 py-2.5 text-sm outline-none rr-text-navy" style={{ background: "oklch(0.97 0.003 260)", border: "1px solid oklch(0.88 0.02 260)" }}
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rr-text-navy-muted"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {isSearching && (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 size={14} className="animate-spin rr-text-navy-muted" />
                  <span className="text-sm font-bold rr-text-navy-mid">Searching…</span>
                </div>
              )}
              {!isSearching && searchResults && searchResults.length === 0 && debouncedSearch.length >= 2 && (
                <p className="text-xs py-2 rr-text-navy-muted">No users found.</p>
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
                        <p className="text-sm font-bold rr-text-navy">
                          {u.name || "(no name)"}
                        </p>
                        <p className="text-sm font-bold rr-text-navy-mid">{u.email}</p>
                        {u.churnReason && (
                          <span
                            className="inline-block text-xs font-bold rounded-full px-2 py-0.5 mt-0.5"
                            style={{ background: "oklch(0.95 0.04 20)", color: "oklch(0.45 0.15 20)" }}
                          >
                            Churned: {u.churnReason.replace(/_/g, " ")}
                          </span>
                        )}
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
                        {setTier.isPending && <Loader2 size={10} className="animate-spin rr-text-navy-muted" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {debouncedSearch.length < 2 && (
                <p className="text-xs rr-text-navy-faint">Type at least 2 characters to search.</p>
              )}
            </div>

            {/* Quick links */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate("/admin/codes")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <Crown size={16} className="rr-text-gold" />
                  Access Codes
                </span>
                <span className="rr-text-gold">→</span>
              </button>
              <button
                onClick={() => navigate("/admin/smtp-stats")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <Wifi size={16} className="rr-text-gold" />
                  SMTP Health
                </span>
                <span className="rr-text-gold">→</span>
              </button>
              <button
                onClick={() => navigate("/admin/auth-diagnostics")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <KeyRound size={16} className="rr-text-gold" />
                  Authentication Diagnostics
                </span>
                <span className="rr-text-gold">→</span>
              </button>
              <button
                onClick={() => navigate("/admin/churn")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp size={16} className="rr-text-gold" />
                  Churn Surveys
                </span>
                <span className="rr-text-gold">→</span>
              </button>
              <button
                onClick={() => navigate("/admin/revenue")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <Star size={16} className="rr-text-gold" />
                  Revenue Dashboard
                </span>
                <span className="rr-text-gold">→</span>
              </button>
              <button
                onClick={() => navigate("/admin/referral-rewards")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <Gift size={16} className="rr-text-gold" />
                  Deferred Referral Rewards
                </span>
                <span className="rr-text-gold">→</span>
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
      className="rounded-2xl px-4 py-4 flex flex-col gap-2 bg-white" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      {icon}
      <p className="text-2xl font-black rr-text-navy">
        {value}
      </p>
      <p className="text-sm font-bold rr-text-navy-mid">
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
          <span className="text-xs font-black rr-text-navy">
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
