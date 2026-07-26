// AdminDashboard — platform-wide stats for the app owner
// Only accessible to users with role=admin

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";
import {
  Users,
  Activity,
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
  UserCog,
  ShieldCheck,
} from "lucide-react";
import { Calendar, Clock, Table2, Ticket, Plus, Copy, RefreshCw, Ban } from "lucide-react";

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
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteLoading, setPromoteLoading] = useState(false);
  const promoteToAdmin = trpc.adminManagement.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success(`${promoteEmail} is now an admin with lifetime access`);
      setPromoteEmail("");
      setPromoteLoading(false);
    },
    onError: (err) => { toast.error(err.message || "Failed to promote user"); setPromoteLoading(false); },
  });
  const grantLifetime = trpc.adminManagement.grantLifetime.useMutation({
    onSuccess: () => {
      toast.success(`Lifetime access granted to ${promoteEmail}`);
      setPromoteEmail("");
      setPromoteLoading(false);
    },
    onError: (err) => { toast.error(err.message || "Failed to grant lifetime"); setPromoteLoading(false); },
  });

  // Grant Subscription (flexible: days / months / lifetime)
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDurationType, setGrantDurationType] = useState<"days" | "months" | "lifetime">("months");
  const [grantAmount, setGrantAmount] = useState(1);
  const [grantLoading, setGrantLoading] = useState(false);
  const grantSubscription = trpc.adminManagement.grantSubscription.useMutation({
    onSuccess: (data) => {
      const label = data.tier === "lifetime" ? "Lifetime" : data.planExpiresAt ? `until ${new Date(data.planExpiresAt).toLocaleDateString()}` : "granted";
      toast.success(`Subscription ${label} granted to ${grantEmail}`);
      setGrantEmail("");
      setGrantLoading(false);
      utils.adminManagement.listPrivilegedUsers.invalidate();
    },
    onError: (err) => { toast.error(err.message || "Failed to grant subscription"); setGrantLoading(false); },
  });

  // Privileged users list
  const { data: privilegedUsers, isLoading: isLoadingPrivileged } = trpc.adminManagement.listPrivilegedUsers.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Revoke Access
  const [revokeTarget, setRevokeTarget] = useState<{ email: string; name: string | null } | null>(null);
  const revokeAccess = trpc.adminManagement.revokeAccess.useMutation({
    onSuccess: () => {
      toast.success(`Access revoked for ${revokeTarget?.email}`);
      setRevokeTarget(null);
      utils.adminManagement.listPrivilegedUsers.invalidate();
    },
    onError: (err) => { toast.error(err.message || "Failed to revoke access"); setRevokeTarget(null); },
  });

  // Coupon Code Generation
  const [couponNote, setCouponNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponDurationType, setCouponDurationType] = useState<"days" | "months" | "lifetime">("lifetime");
  const [couponAmount, setCouponAmount] = useState(1);
  const [couponMaxUses, setCouponMaxUses] = useState<string>("");
  const [couponExpiryDays, setCouponExpiryDays] = useState<string>("");
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);

  const { data: couponPreview, refetch: refreshCouponPreview } = trpc.accessCodes.generatePreview.useQuery(
    undefined,
    { enabled: !!user }
  );
  // Coupon analytics — derived from the full codes list
  const { data: allCodes } = trpc.accessCodes.list.useQuery(undefined, { enabled: !!user });
  const couponStats = allCodes
    ? {
        total: allCodes.length,
        redemptions: allCodes.reduce((sum, c) => sum + c.usedCount, 0),
        active: allCodes.filter(
          (c) =>
            c.active === 1 &&
            (!c.expiresAt || c.expiresAt > Date.now()) &&
            (c.maxUses === null || c.usedCount < c.maxUses)
        ).length,
      }
    : null;

  const createCoupon = trpc.accessCodes.createCoupon.useMutation({
    onSuccess: ({ code }) => {
      setLastCreatedCode(code);
      toast.success(`Coupon created: ${code}`);
      setCouponNote("");
      setCouponCode("");
      setCouponMaxUses("");
      setCouponExpiryDays("");
      refreshCouponPreview();
    },
    onError: (err) => toast.error(err.message || "Failed to create coupon"),
  });

  function handleCreateCoupon() {
    const parsedMaxUses = couponMaxUses.trim() ? parseInt(couponMaxUses, 10) : null;
    const parsedExpiry = couponExpiryDays.trim()
      ? Date.now() + parseInt(couponExpiryDays, 10) * 24 * 60 * 60 * 1000
      : null;
    createCoupon.mutate({
      code: couponCode.trim() || undefined,
      note: couponNote.trim() || undefined,
      maxUses: parsedMaxUses,
      expiresAt: parsedExpiry,
      grantDurationType: couponDurationType,
      grantAmount: couponDurationType !== "lifetime" ? couponAmount : null,
    });
  }


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
              <button
                onClick={() => navigate("/admin/activity")}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white"
              >
                <span className="flex items-center gap-2">
                  <Activity size={16} className="rr-text-gold" />
                  Account Activity
                </span>
                <span className="rr-text-gold">→</span>
              </button>
            </div>

            {/* Promote User */}
            <div className="mt-2">
              <p className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy flex items-center gap-2">
                <UserCog size={15} className="rr-text-gold" />
                Promote User
              </p>
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}
              >
                <p className="text-xs rr-text-navy-muted leading-relaxed">
                  Enter a user's email to grant them admin privileges and/or lifetime access. The user must have already signed up.
                </p>
                <input
                  type="email"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none rr-text-navy"
                  style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }}
                />
                <div className="flex gap-2">
                  <button
                    disabled={!promoteEmail.includes("@") || promoteLoading}
                    onClick={() => {
                      setPromoteLoading(true);
                      promoteToAdmin.mutate({ email: promoteEmail });
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                  >
                    <ShieldCheck size={13} />
                    Admin + Lifetime
                  </button>
                  <button
                    disabled={!promoteEmail.includes("@") || promoteLoading}
                    onClick={() => {
                      setPromoteLoading(true);
                      grantLifetime.mutate({ email: promoteEmail });
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: "oklch(0.96 0.04 80)", color: "oklch(0.45 0.10 80)", border: "1px solid oklch(0.88 0.10 80)" }}
                  >
                    <Crown size={13} />
                    Lifetime Only
                  </button>
                </div>
              </div>
            </div>

            {/* Grant Subscription — flexible duration */}
            <div className="mt-2">
              <p className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy flex items-center gap-2">
                <Calendar size={15} className="rr-text-gold" />
                Grant Subscription
              </p>
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}
              >
                <p className="text-xs rr-text-navy-muted leading-relaxed">
                  Grant any user a free subscription for a custom duration — days, months, or lifetime. Extends from their current expiry if still active.
                </p>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none rr-text-navy"
                  style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }}
                />
                {/* Duration type selector */}
                <div className="flex gap-2">
                  {(["days", "months", "lifetime"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setGrantDurationType(type)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize"
                      style={grantDurationType === type
                        ? { background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }
                        : { background: "white", color: "oklch(0.45 0.04 260)", border: "1px solid oklch(0.88 0.02 260)" }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                {/* Amount input — hidden for lifetime */}
                {grantDurationType !== "lifetime" && (
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="rr-text-navy-muted flex-shrink-0" />
                    <input
                      type="number"
                      min={1}
                      max={grantDurationType === "days" ? 365 : 120}
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 rounded-xl px-3 py-2 text-sm outline-none rr-text-navy text-center font-bold"
                      style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }}
                    />
                    <span className="text-sm font-bold rr-text-navy-muted">{grantDurationType}</span>
                  </div>
                )}
                <button
                  disabled={!grantEmail.includes("@") || grantLoading}
                  onClick={() => {
                    setGrantLoading(true);
                    grantSubscription.mutate({
                      email: grantEmail,
                      durationType: grantDurationType,
                      ...(grantDurationType !== "lifetime" ? { amount: grantAmount } : {}),
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                >
                  {grantLoading ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                  {grantDurationType === "lifetime" ? "Grant Lifetime Access" : `Grant ${grantAmount} ${grantDurationType}`}
                </button>
              </div>
            </div>

            {/* Privileged Users Table */}
            <div className="mt-2">
              <p className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy flex items-center gap-2">
                <Table2 size={15} className="rr-text-gold" />
                Admin &amp; Paid Users
              </p>
              <div className="rounded-2xl bg-white overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                {isLoadingPrivileged ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin rr-text-navy-muted" />
                  </div>
                ) : !privilegedUsers || privilegedUsers.length === 0 ? (
                  <p className="text-sm rr-text-navy-muted text-center py-8">No privileged users yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: "oklch(0.97 0.01 260)", borderBottom: "1px solid oklch(0.90 0.01 260)" }}>
                          <th className="text-left px-3 py-2.5 font-black rr-text-navy uppercase tracking-wider">User</th>
                          <th className="text-left px-3 py-2.5 font-black rr-text-navy uppercase tracking-wider">Role</th>
                          <th className="text-left px-3 py-2.5 font-black rr-text-navy uppercase tracking-wider">Tier</th>
                          <th className="text-left px-3 py-2.5 font-black rr-text-navy uppercase tracking-wider">Expires</th>
                          <th className="text-left px-3 py-2.5 font-black rr-text-navy uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {privilegedUsers.map((u, i) => (
                          <tr
                            key={u.id}
                            style={{ borderBottom: i < privilegedUsers.length - 1 ? "1px solid oklch(0.94 0.01 260)" : "none" }}
                          >
                            <td className="px-3 py-2.5">
                              <p className="font-bold rr-text-navy truncate max-w-[120px]">{u.name || "(no name)"}</p>
                              <p className="rr-text-navy-muted truncate max-w-[120px]">{u.email}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              {u.role === "admin" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}>
                                  <ShieldCheck size={10} /> Admin
                                </span>
                              ) : (
                                <span className="text-xs rr-text-navy-muted">User</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {u.tier === "lifetime" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.96 0.04 80)", color: "oklch(0.45 0.10 80)" }}>
                                  <Crown size={10} /> Lifetime
                                </span>
                              ) : u.tier === "pro" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.95 0.05 150)", color: "oklch(0.40 0.18 150)" }}>
                                  <Star size={10} /> Pro
                                </span>
                              ) : u.tier === "annual" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.93 0.06 260)", color: "oklch(0.35 0.15 260)" }}>
                                  <Zap size={10} /> Annual
                                </span>
                              ) : (
                                <span className="text-xs rr-text-navy-muted">{u.tier ?? "free"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 rr-text-navy-muted">
                              {u.tier === "lifetime" ? "∞" : u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {u.role !== "admin" && (
                                <button
                                  onClick={() => setRevokeTarget({ email: u.email ?? "", name: u.name ?? null })}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
                                  style={{ background: "oklch(0.95 0.03 25)", color: "oklch(0.45 0.18 25)", border: "1px solid oklch(0.88 0.05 25)" }}
                                  title="Revoke paid access"
                                >
                                  <Ban size={10} /> Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Revoke Access confirm dialog */}
            {revokeTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
                <div className="rounded-2xl p-5 w-full max-w-sm bg-white" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                  <h3 className="text-base font-black rr-text-navy mb-1">Revoke Access?</h3>
                  <p className="text-sm rr-text-navy-muted mb-4">
                    This will downgrade <strong>{revokeTarget.name || revokeTarget.email}</strong> back to the free tier immediately.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setRevokeTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold rr-text-navy" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}>Cancel</button>
                    <button onClick={() => revokeAccess.mutate({ email: revokeTarget.email })} disabled={revokeAccess.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50" style={{ background: "oklch(0.45 0.18 25)" }}>
                      {revokeAccess.isPending ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                      Revoke Access
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Coupon Code Generation */}
            <div className="mt-2">
              {/* Coupon analytics stat row */}
              {couponStats && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}>
                    <p className="text-lg font-black rr-text-navy">{couponStats.total}</p>
                    <p className="text-xs rr-text-navy-muted font-bold mt-0.5">Created</p>
                  </div>
                  <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}>
                    <p className="text-lg font-black" style={{ color: "oklch(0.45 0.18 80)" }}>{couponStats.redemptions}</p>
                    <p className="text-xs rr-text-navy-muted font-bold mt-0.5">Redeemed</p>
                  </div>
                  <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}>
                    <p className="text-lg font-black" style={{ color: "oklch(0.45 0.18 150)" }}>{couponStats.active}</p>
                    <p className="text-xs rr-text-navy-muted font-bold mt-0.5">Active</p>
                  </div>
                </div>
              )}
              <p className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy flex items-center gap-2">
                <Ticket size={15} className="rr-text-gold" />
                Generate Coupon Code
              </p>
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(0.97 0.01 260)", border: "1px solid oklch(0.88 0.02 260)" }}>
                <p className="text-xs rr-text-navy-muted leading-relaxed">Create a shareable coupon that grants users free access for a set duration. Users redeem it on the Upgrade page.</p>
                {couponPreview && (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 px-3 py-2 rounded-xl text-sm font-mono tracking-wider text-center font-bold rr-text-navy" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }}>{couponPreview.code}</span>
                    <button onClick={() => refreshCouponPreview()} className="p-2 rounded-xl rr-text-navy-muted" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} title="Regenerate"><RefreshCw size={14} /></button>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold mb-1 block rr-text-navy-muted">Custom code (optional)</label>
                  <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="e.g. LAUNCH2026" className="w-full rounded-xl px-3 py-2.5 text-sm font-mono tracking-wider outline-none rr-text-navy" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block rr-text-navy-muted">Internal note</label>
                  <input type="text" value={couponNote} onChange={(e) => setCouponNote(e.target.value)} placeholder="e.g. Beta cohort — Jan 2026" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none rr-text-navy" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1.5 block rr-text-navy-muted">Grant duration</label>
                  <div className="flex gap-2">
                    {(["days", "months", "lifetime"] as const).map((type) => (
                      <button key={type} onClick={() => setCouponDurationType(type)} className="flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize" style={couponDurationType === type ? { background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" } : { background: "white", color: "oklch(0.45 0.04 260)", border: "1px solid oklch(0.88 0.02 260)" }}>{type}</button>
                    ))}
                  </div>
                </div>
                {couponDurationType !== "lifetime" && (
                  <div className="flex items-center gap-3">
                    <Clock size={14} className="rr-text-navy-muted flex-shrink-0" />
                    <input type="number" min={1} max={couponDurationType === "days" ? 365 : 120} value={couponAmount} onChange={(e) => setCouponAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 rounded-xl px-3 py-2 text-sm outline-none rr-text-navy text-center font-bold" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} />
                    <span className="text-sm font-bold rr-text-navy-muted">{couponDurationType}</span>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold mb-1 block rr-text-navy-muted">Max uses (blank = unlimited)</label>
                    <input type="number" min={1} value={couponMaxUses} onChange={(e) => setCouponMaxUses(e.target.value)} placeholder="∞" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none rr-text-navy" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold mb-1 block rr-text-navy-muted">Expires in days (blank = never)</label>
                    <input type="number" min={1} value={couponExpiryDays} onChange={(e) => setCouponExpiryDays(e.target.value)} placeholder="never" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none rr-text-navy" style={{ background: "white", border: "1px solid oklch(0.88 0.02 260)" }} />
                  </div>
                </div>
                <button onClick={handleCreateCoupon} disabled={createCoupon.isPending} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 rr-bg-navy text-white">
                  {createCoupon.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {createCoupon.isPending ? "Creating..." : couponDurationType === "lifetime" ? "Create Lifetime Coupon" : `Create ${couponAmount} ${couponDurationType} Coupon`}
                </button>
                {lastCreatedCode && (
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.96 0.04 80)", border: "1px solid oklch(0.88 0.10 80)" }}>
                    <span className="flex-1 font-mono text-sm font-black tracking-wider" style={{ color: "oklch(0.35 0.10 80)" }}>{lastCreatedCode}</span>
                    <button onClick={() => { navigator.clipboard.writeText(lastCreatedCode); toast.success(`Copied: ${lastCreatedCode}`); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}>
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick link to full Codes page */}
            <div className="mt-1">
              <button onClick={() => navigate("/admin/codes")} className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold rr-bg-navy text-white">
                <span className="flex items-center gap-2"><Ticket size={16} className="rr-text-gold" /> Manage All Codes</span>
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
