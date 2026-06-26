// AdminRevenue — revenue dashboard for the app owner
// Shows MRR, ARR, tier breakdown, monthly subscriber growth chart, and churn rate
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Infinity,
  AlertTriangle,
  Mail,
  MousePointerClick,
  Eye,
  QrCode,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const GOLD = "oklch(0.80 0.18 80)";
const NAVY = "oklch(0.22 0.09 260)";

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function AdminRevenuePage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.admin.revenue.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: NAVY }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <ArrowLeft size={16} color="white" />
          </button>
          <div>
            <p className="text-sm font-bold tracking-widest uppercase" style={{ color: GOLD }}>
              Admin
            </p>
            <h1 className="text-xl font-black text-white">Revenue Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 flex flex-col gap-5">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: GOLD }} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-700 text-sm">
            <AlertTriangle size={16} />
            Failed to load revenue data.
          </div>
        )}

        {data && (
          <>
            {/* MRR / ARR / Lifetime KPI row */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard
                icon={<DollarSign size={18} style={{ color: GOLD }} />}
                label="MRR"
                value={fmt(data.mrrCents)}
              />
              <KpiCard
                icon={<TrendingUp size={18} style={{ color: GOLD }} />}
                label="ARR"
                value={fmt(data.arrCents)}
              />
              <KpiCard
                icon={<Infinity size={18} style={{ color: GOLD }} />}
                label="Lifetime Rev"
                value={fmt(data.lifetimeRevenueCents)}
              />
            </div>

            {/* Subscriber breakdown */}
            <div
              className="rounded-2xl p-4"
              style={{ background: NAVY }}
            >
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
                Subscribers by Tier
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Free", count: data.tierCounts.free, color: "rgba(255,255,255,0.3)" },
                  { label: "Monthly Pro", count: data.tierCounts.pro, color: GOLD },
                  { label: "Annual", count: data.tierCounts.annual, color: "oklch(0.70 0.15 160)" },
                  { label: "Lifetime", count: data.tierCounts.lifetime, color: "oklch(0.75 0.15 300)" },
                ].map(t => (
                  <div key={t.label} className="flex items-center justify-between">
                    <span className="text-base font-bold text-white/90">{t.label}</span>
                    <span className="text-lg font-black" style={{ color: t.color }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Churn rate */}
            <div className="flex items-center justify-between rounded-2xl p-4" style={{ background: NAVY }}>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: GOLD }}>
                  30-Day Churn Rate
                </p>
                <p className="text-base font-bold text-white/80">
                  {data.recentCancels} cancellation{data.recentCancels !== 1 ? "s" : ""} / {data.activeSubs} active
                </p>
              </div>
              <span
                className="text-3xl font-black"
                style={{ color: data.churnRate > 5 ? "#f87171" : GOLD }}
              >
                {data.churnRate}%
              </span>
            </div>

            {/* Monthly subscriber growth chart */}
            <div className="rounded-2xl p-4" style={{ background: NAVY }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: GOLD }}>
                New Subscribers (Last 6 Months)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.growthChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1a2744", border: "none", borderRadius: 10, color: "white" }}
                    labelStyle={{ color: GOLD, fontWeight: 700 }}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  />
                  <Bar dataKey="newSubs" name="New Subs" fill={GOLD} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Email engagement KPIs */}
            <div className="rounded-2xl p-4" style={{ background: NAVY }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
                Platform Email Engagement
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <KpiCard
                  icon={<Mail size={16} style={{ color: GOLD }} />}
                  label="Total Sent"
                  value={data.platformTotalSent.toLocaleString()}
                />
                <KpiCard
                  icon={<Eye size={16} style={{ color: GOLD }} />}
                  label="Unique Opens"
                  value={data.platformUniqueOpens.toLocaleString()}
                />
                <KpiCard
                  icon={<MousePointerClick size={16} style={{ color: GOLD }} />}
                  label="Unique Clicks"
                  value={data.platformUniqueClicks.toLocaleString()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <span className="text-sm font-bold text-white/70">Open Rate</span>
                  <span
                    className="text-2xl font-black"
                    style={{ color: data.platformOpenRate >= 30 ? "oklch(0.70 0.18 145)" : data.platformOpenRate >= 15 ? GOLD : "#f87171" }}
                  >
                    {data.platformOpenRate}%
                  </span>
                  <span className="text-sm font-bold text-white/50">Industry avg: 20–30%</span>
                </div>
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <span className="text-sm font-bold text-white/70">Click Rate</span>
                  <span
                    className="text-2xl font-black"
                    style={{ color: data.platformClickRate >= 5 ? "oklch(0.70 0.18 145)" : data.platformClickRate >= 2 ? GOLD : "#f87171" }}
                  >
                    {data.platformClickRate}%
                  </span>
                  <span className="text-sm font-bold text-white/50">Industry avg: 2–5%</span>
                </div>
              </div>
            </div>

            {/* PromptPay reveal funnel */}
            <div className="rounded-2xl p-4" style={{ background: NAVY }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
                PromptPay Upgrade Funnel (Thai Users)
              </p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <KpiCard
                  icon={<QrCode size={16} style={{ color: GOLD }} />}
                  label="Total Reveals"
                  value={data.promptpayRevealTotal.toLocaleString()}
                />
                <KpiCard
                  icon={<QrCode size={16} style={{ color: GOLD }} />}
                  label="Last 30 Days"
                  value={data.promptpayRevealLast30.toLocaleString()}
                />
                <KpiCard
                  icon={<TrendingUp size={16} style={{ color: GOLD }} />}
                  label="Reveal→Paid"
                  value={`${data.promptpayConversionRate}%`}
                />
              </div>
              <p className="text-sm font-bold text-white/50">
                Reveals = users who tapped "Show PromptPay QR" on the upgrade page. Reveal→Paid = total paid users ÷ total reveals (all-time approximation).
              </p>
            </div>

            {/* Pricing reference */}
            <div className="rounded-2xl p-4 border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-2 text-white/40">
                Pricing Reference
              </p>
              <div className="flex flex-col gap-1 text-sm text-white/50">
                <span>Monthly Pro: $29/mo</span>
                <span>Annual: $290/yr ($24.17/mo)</span>
                <span>Lifetime: $1,247 one-time</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: NAVY }}>
      <div className="flex items-center gap-1 mb-1">{icon}</div>
      <span className="text-sm font-bold text-white/70">{label}</span>
      <span className="text-lg font-black text-white leading-tight">{value}</span>
    </div>
  );
}
