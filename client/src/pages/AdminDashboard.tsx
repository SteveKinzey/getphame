// AdminDashboard — platform-wide stats for the app owner
// Only accessible to users with role=admin

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { useEffect, useMemo, useState } from "react";
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
  Activity,
  Download,
  Smartphone,
  Share2,
  MousePointerClick,
  RotateCcw,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

  const { data: pwaConversionStats } = trpc.admin.pwaConversionStats.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 60_000,
  });

  const { data: failingSmtpUsers, isLoading: failingSmtpLoading } = trpc.admin.failingSmtpUsers.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 30_000,
  });

  const { data: systemHealthTrend, isLoading: systemHealthLoading } = trpc.admin.systemHealthTrend.useQuery(
    { hours: 24 },
    { enabled: user?.role === "admin", refetchInterval: 5 * 60_000 }
  );

  const { data: operationsAlerts } = trpc.admin.operationsAlerts.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 5 * 60_000,
  });

  const operationsExport = trpc.admin.operationsAnalyticsExport.useQuery(undefined, { enabled: false });

  const healthTrendData = useMemo(() => {
    if (!systemHealthTrend) return [];
    return [
      ...systemHealthTrend.smtp.map((point) => ({
        timestamp: point.checkedAt,
        smtp: point.successRate,
        authentication: null as number | null,
      })),
      ...systemHealthTrend.authentication.map((point) => ({
        timestamp: point.checkedAt,
        smtp: null as number | null,
        authentication: point.successRate,
      })),
    ]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((point) => ({
        ...point,
        time: new Date(point.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      }));
  }, [systemHealthTrend]);

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

  const downloadOperationsAnalytics = async () => {
    try {
      const result = await operationsExport.refetch();
      if (!result.data) throw new Error("The analytics export could not be generated.");
      const blob = new Blob([result.data.csv], { type: result.data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${result.data.rowCount} analytics rows.`);
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "Analytics export failed.");
    }
  };

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
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Administration hub
        </h1>
        <p className="mt-1 text-base font-normal text-white/90">
          Platform operations, account controls, diagnostics, and business analytics
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
            <section data-testid="admin-operations-hub" aria-labelledby="admin-operations-title">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">Operations</p>
                  <h2 id="admin-operations-title" className="mt-1 text-xl font-semibold rr-text-navy">System control center</h2>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <span className="hidden text-xs font-normal rr-text-navy-muted sm:block">Live summaries refresh automatically</span>
                  <button
                    type="button"
                    data-testid="admin-operations-csv-export"
                    onClick={downloadOperationsAnalytics}
                    disabled={operationsExport.isFetching}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  >
                    {operationsExport.isFetching ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {operationsExport.isFetching ? "Preparing CSV…" : "Export analytics CSV"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  { path: "/admin/users", label: "User management", detail: `${stats.totalUsers} accounts`, Icon: Users },
                  { path: "/admin/auth-diagnostics", label: "Authentication health", detail: "24-hour checks and magic links", Icon: ShieldAlert },
                  { path: "/admin/reminder-performance", label: "Reminder operations", detail: `${stats.pendingReminders} pending · ${stats.dueReminders} due`, Icon: TrendingUp },
                  { path: "/admin/smtp-stats", label: "SMTP health", detail: `${failingSmtpUsers?.length ?? 0} failing · ${stats.activeSmtp}/${stats.totalSmtp} healthy`, Icon: Wifi },
                  { path: "/admin/codes", label: "System access codes", detail: "Create, review, and revoke codes", Icon: KeyRound },
                  { path: "/admin/support", label: "Support inbox", detail: "Track customer messages and screenshots", Icon: Inbox },
                  { path: "/admin/revenue", label: "Revenue analytics", detail: "MRR, ARR, conversion, and growth", Icon: DollarSign },
                  { path: "/admin/churn", label: "Churn analytics", detail: "Cancellation reasons and retention signals", Icon: AlertTriangle },
                  { path: "/admin/referral-rewards", label: "Referral operations", detail: "Review deferred rewards", Icon: Gift },
                  { path: "/admin/koalendar-retry", label: "Koalendar recovery", detail: "Inspect and retry failed contact imports", Icon: RotateCcw },
                ].map(({ path, label, detail, Icon }) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className="group flex min-h-28 items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><Icon size={21} strokeWidth={2} /></span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold rr-text-navy">{label}</span>
                      <span className="mt-1 block text-sm font-normal leading-5 rr-text-navy-muted">{detail}</span>
                      <span className="mt-2 block text-xs font-medium rr-text-gold">Open operations →</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section data-testid="admin-pwa-conversion" aria-labelledby="admin-pwa-conversion-title">
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">Install conversion</p>
                <h2 id="admin-pwa-conversion-title" className="mt-1 text-xl font-semibold rr-text-navy">PWA guide and sharing funnel</h2>
                <p className="mt-1 text-sm rr-text-navy-muted">Aggregate first-party events only. No raw device or visitor records are shown.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <ConversionMetricCard
                  testId="pwa-guide-views"
                  label="Guide views"
                  value={pwaConversionStats?.allTime.install_guide_viewed ?? 0}
                  detail={`${pwaConversionStats?.last30Days.install_guide_viewed ?? 0} in the last 30 days`}
                  Icon={MousePointerClick}
                />
                <ConversionMetricCard
                  testId="pwa-installs"
                  label="Completed installs"
                  value={pwaConversionStats?.allTime.app_installed ?? 0}
                  detail={`${pwaConversionStats?.rates.installCompletion ?? 0}% of guide views`}
                  Icon={Smartphone}
                />
                <ConversionMetricCard
                  testId="pwa-shares"
                  label="Successful shares"
                  value={(pwaConversionStats?.allTime.share_completed ?? 0) + (pwaConversionStats?.allTime.share_copied ?? 0)}
                  detail={`${pwaConversionStats?.rates.shareConversion ?? 0}% of guide views`}
                  Icon={Share2}
                />
              </div>
            </section>

            <section aria-labelledby="operations-alerts-title">
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">Alert thresholds</p>
                <h2 id="operations-alerts-title" className="mt-1 text-xl font-semibold rr-text-navy">Performance guardrails</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AlertMetricCard
                  testId="smtp-alert-metric"
                  label="SMTP fleet health"
                  value={operationsAlerts?.smtp.value == null ? "No data" : `${operationsAlerts.smtp.value.toFixed(1)}%`}
                  threshold={`Acceptable: ${operationsAlerts?.smtp.threshold ?? 95}% or higher`}
                  isAlert={operationsAlerts?.smtp.status === "alert"}
                  hasData={operationsAlerts?.smtp.hasData ?? false}
                  detail={operationsAlerts?.smtp.checkedAt ? `Checked ${new Date(operationsAlerts.smtp.checkedAt).toLocaleString()}` : "Waiting for the first managed fleet check"}
                />
                <AlertMetricCard
                  testId="reminder-alert-metric"
                  label="Reminder performance"
                  value={operationsAlerts?.reminders.value == null ? "No data" : `${operationsAlerts.reminders.value.toFixed(1)}%`}
                  threshold={`Acceptable: ${operationsAlerts?.reminders.threshold ?? 20}% or higher`}
                  isAlert={operationsAlerts?.reminders.status === "alert"}
                  hasData={operationsAlerts?.reminders.hasData ?? false}
                  detail={operationsAlerts ? `${operationsAlerts.reminders.sampleSize} attributed sends · alerting starts at ${operationsAlerts.reminders.minimumSample}` : "Loading attributed reminder outcomes"}
                />
              </div>
            </section>

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

            <section
              data-testid="system-health-trend-chart"
              className="rounded-2xl bg-white p-4 shadow-sm"
              aria-labelledby="system-health-trend-title"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white"><Activity size={21} /></span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">System health</p>
                    <h2 id="system-health-trend-title" className="mt-0.5 text-xl font-black rr-text-navy">24-hour health trend</h2>
                    <p className="mt-1 text-sm font-semibold rr-text-navy-muted">Managed SMTP fleet checks and authentication diagnostics. Missing observations are not inferred.</p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-black rr-text-navy-muted sm:justify-end">
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-700" />SMTP</span>
                  <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-600" />Authentication</span>
                </div>
              </div>
              {systemHealthLoading ? (
                <div className="flex h-64 items-center justify-center"><Loader2 size={24} className="animate-spin rr-text-navy" /></div>
              ) : healthTrendData.length === 0 ? (
                <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
                  <div>
                    <p className="text-sm font-black rr-text-navy">Monitoring data unavailable</p>
                    <p className="mt-1 text-sm font-semibold rr-text-navy-muted">No health status is being inferred from missing data. The chart will populate after managed checks run.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 h-64 w-full" aria-label="SMTP and authentication success rates over the last 24 hours">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthTrendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#53627a" }} minTickGap={28} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} ticks={[0, 50, 95, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 11, fill: "#53627a" }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === "smtp" ? "SMTP" : "Authentication"]} labelFormatter={(label) => `Observed at ${label}`} contentStyle={{ borderRadius: 12, border: "1px solid #dbe3ef", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)" }} />
                      <Line type="monotone" dataKey="smtp" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                      <Line type="monotone" dataKey="authentication" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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

function ConversionMetricCard({
  testId,
  label,
  value,
  detail,
  Icon,
}: {
  testId: string;
  label: string;
  value: number;
  detail: string;
  Icon: LucideIcon;
}) {
  return (
    <div data-testid={testId} className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] rr-text-navy-muted">{label}</p>
          <p className="mt-1 text-3xl font-black rr-text-navy">{value.toLocaleString()}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
          <Icon size={19} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-sm font-medium rr-text-navy-muted">{detail}</p>
    </div>
  );
}

function AlertMetricCard({
  testId,
  label,
  value,
  threshold,
  isAlert,
  hasData,
  detail,
}: {
  testId: string;
  label: string;
  value: string;
  threshold: string;
  isAlert: boolean;
  hasData: boolean;
  detail: string;
}) {
  const tone = isAlert
    ? "border-red-400 bg-red-50"
    : hasData
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";
  return (
    <div data-testid={testId} role={isAlert ? "alert" : undefined} className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.14em] ${isAlert ? "text-red-700" : "rr-text-navy-muted"}`}>{label}</p>
          <p className={`mt-1 text-3xl font-black ${isAlert ? "text-red-700" : "rr-text-navy"}`}>{value}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isAlert ? "bg-red-700 text-white" : hasData ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"}`}>
          {isAlert ? "Below threshold" : hasData ? "Healthy" : "No data"}
        </span>
      </div>
      <p className={`mt-2 text-sm font-black ${isAlert ? "text-red-700" : "rr-text-navy"}`}>{threshold}</p>
      <p className="mt-1 text-xs font-semibold rr-text-navy-muted">{detail}</p>
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
