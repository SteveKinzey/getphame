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
  Sparkles,
  Smartphone,
  ShieldCheck,
  ShieldOff,
  Mail,
  Share2,
  Languages,
  MousePointerClick,
  RotateCcw,
  Inbox,
  Clock3,
  GitBranch,
  BadgePercent,
} from "lucide-react";
import { CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CartesianGrid,
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useDebounce } from "use-debounce";

const CAPTION_LANGUAGE_LABELS = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "it", label: "Italian" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
] as const;
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SubscriptionPlan = "monthly" | "annual" | "lifetime";

/** Shows a warning if less than 50% of contacts have given explicit consent */
function ConsentHealthBanner() {
  const { data: stats } = trpc.contacts.consentStats.useQuery();
  if (!stats || stats.total < 5) return null; // Don't show for tiny contact lists
  const pct = stats.total > 0 ? (stats.consented / stats.total) * 100 : 0;
  if (pct >= 50) return null; // All good
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-4"
      style={{ background: "oklch(0.97 0.04 80)", border: "1px solid oklch(0.80 0.18 80)" }}
      role="alert"
    >
      <AlertTriangle size={18} style={{ color: "oklch(0.55 0.18 60)", flexShrink: 0, marginTop: 2 }} />
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: "oklch(0.35 0.10 60)" }}>
          Low consent coverage — {Math.round(pct)}% of contacts have consented
        </p>
        <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.08 60)" }}>
          {stats.consented} of {stats.total} contacts have given explicit consent.
          Consider sending a bulk consent request to the remaining {stats.total - stats.consented} contacts.
        </p>
      </div>
    </div>
  );
}

function ReleaseParityCard() {
  const { data, isLoading } = trpc.admin.releaseParity.useQuery();
  const matched = data?.parityStatus === "matched" && data.protectedMainTree === data.managedTree;
  return (
    <section data-testid="release-parity-card" className="mb-4 rounded-2xl border p-4" style={{ borderColor: matched ? "oklch(0.76 0.12 145)" : "oklch(0.83 0.10 80)", background: matched ? "oklch(0.97 0.02 145)" : "oklch(0.98 0.02 80)" }}>
      <div className="flex items-start gap-3">
        <GitBranch size={20} className={matched ? "rr-text-green" : "rr-text-gold"} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black rr-text-navy">Release parity</p>
          <p className="text-xs rr-text-navy-mid">{isLoading ? "Checking the latest release record…" : data ? matched ? "Main and live release match" : "Release record needs review" : "No verified release record yet"}</p>
          {data && <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2"><span className="font-mono rr-text-navy">Live: {data.checkpointId}</span><span className="font-mono rr-text-navy">Main: {data.protectedMainCommit.slice(0, 12)}</span></div>}
        </div>
      </div>
    </section>
  );
}


function LeadsSection() {
  const { data: leads, isLoading } = trpc.admin.listLeads.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "consented" | "no-consent" | "unsubscribed">("all");

  const total = leads?.length ?? 0;
  const consented = leads?.filter((l) => l.consentGivenAt).length ?? 0;

  const filtered = (leads ?? []).filter((l) => {
    const matchesSearch = !search || l.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "consented" ? !!l.consentGivenAt :
      statusFilter === "no-consent" ? !l.consentGivenAt && !l.unsubscribedAt :
      statusFilter === "unsubscribed" ? !!l.unsubscribedAt : true;
    return matchesSearch && matchesStatus;
  });

  const handleExportCsv = () => {
    const rows = [
      ["Email", "Consent Given", "Consent Date", "Unsubscribed", "Unsubscribed Date", "Unsub Reason", "Joined"],
      ...filtered.map((l) => [
        l.email,
        l.consentGivenAt ? "Yes" : "No",
        l.consentGivenAt ? new Date(l.consentGivenAt).toLocaleDateString() : "",
        l.unsubscribedAt ? "Yes" : "No",
        l.unsubscribedAt ? new Date(l.unsubscribedAt).toLocaleDateString() : "",
        (l as any).unsubscribeReason ?? "",
        new Date(l.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `getphame-leads-${statusFilter}-${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm" aria-labelledby="leads-section-title">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
            <Mail size={21} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">Lead Capture</p>
            <h2 id="leads-section-title" className="text-base font-black rr-text-navy">Email Subscribers</h2>
            <p className="text-xs rr-text-navy-muted mt-0.5">{total} total · {consented} with consent · {filtered.length} shown</p>
          </div>
        </div>
        {/* Export CSV button */}
        {filtered.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "oklch(0.22 0.09 260)", color: "white" }}
            title="Download filtered leads as CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
        )}
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 rr-text-navy-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-xs font-medium outline-none"
            style={{ border: "1.5px solid oklch(0.88 0.02 260)", background: "oklch(0.975 0.003 100)" }}
            onFocus={(e) => (e.target.style.borderColor = "oklch(0.22 0.09 260)")}
            onBlur={(e) => (e.target.style.borderColor = "oklch(0.88 0.02 260)")}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 rounded-xl text-xs font-bold outline-none cursor-pointer"
          style={{ border: "1.5px solid oklch(0.88 0.02 260)", background: "oklch(0.975 0.003 100)", color: "oklch(0.22 0.09 260)" }}
        >
          <option value="all">All statuses</option>
          <option value="consented">Consented</option>
          <option value="no-consent">No consent</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin rr-text-navy-muted" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm rr-text-navy-muted text-center py-6">{total === 0 ? "No leads yet." : "No leads match your filter."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Email</th>
                <th className="text-left py-2 pr-4 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Consent</th>
                <th className="text-left py-2 pr-4 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Status</th>
                <th className="text-left py-2 pr-4 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Reason</th>
                <th className="text-left py-2 text-xs font-black uppercase tracking-wide rr-text-navy-muted">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2 pr-4 font-medium rr-text-navy truncate max-w-[200px]">{lead.email}</td>
                  <td className="py-2 pr-4">
                    {lead.consentGivenAt ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "oklch(0.94 0.08 145)", color: "oklch(0.35 0.12 145)" }} title={`Consent given on ${new Date(lead.consentGivenAt).toLocaleString()}`}>
                        <ShieldCheck size={11} /> Consented
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "oklch(0.94 0.02 260)", color: "oklch(0.55 0.04 260)" }}>
                        <ShieldOff size={11} /> No consent
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {lead.unsubscribedAt ? (
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.55 0.12 30)" }}>Unsubscribed</span>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.45 0.15 145)" }}>Active</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs rr-text-navy-muted">
                    {(lead as any).unsubscribeReason
                      ? <span className="italic">{String((lead as any).unsubscribeReason).replace(/_/g, ' ')}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-2 text-xs rr-text-navy-muted">{new Date(lead.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation("translation");
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [smtpRetestResults, setSmtpRetestResults] = useState<
    Record<number, { ok: boolean; checkedAt: number; error: string | null }>
  >({});
  const [supportReportingPeriod, setSupportReportingPeriod] = useState<
    "7" | "30" | "90"
  >("30");
  const [supportReportStartDate, setSupportReportStartDate] = useState("");
  const [supportReportEndDate, setSupportReportEndDate] = useState("");
  const [onboardingFunnelPeriod, setOnboardingFunnelPeriod] = useState<
    "7" | "30" | "90" | "custom"
  >("30");
  const [onboardingFunnelStartDate, setOnboardingFunnelStartDate] =
    useState("");
  const [onboardingFunnelEndDate, setOnboardingFunnelEndDate] = useState("");
  const [grantTarget, setGrantTarget] = useState<{
    email: string;
    name: string | null;
  } | null>(null);
  const [grantPlan, setGrantPlan] = useState<SubscriptionPlan>("monthly");
  const [revokeTarget, setRevokeTarget] = useState<{
    email: string;
    name: string | null;
  } | null>(null);
  const supportMetricsInput = useMemo(
    () =>
      supportReportStartDate && supportReportEndDate
        ? { startDate: supportReportStartDate, endDate: supportReportEndDate }
        : { periodDays: supportReportingPeriod },
    [supportReportEndDate, supportReportStartDate, supportReportingPeriod]
  );
  const onboardingFunnelInput = useMemo(() => {
    if (onboardingFunnelPeriod !== "custom")
      return { periodDays: onboardingFunnelPeriod } as const;
    if (!onboardingFunnelStartDate || !onboardingFunnelEndDate)
      return undefined;
    return {
      startDate: onboardingFunnelStartDate,
      endDate: onboardingFunnelEndDate,
    };
  }, [
    onboardingFunnelEndDate,
    onboardingFunnelPeriod,
    onboardingFunnelStartDate,
  ]);
  const onboardingFunnelRangeValid =
    onboardingFunnelPeriod !== "custom" ||
    (Boolean(onboardingFunnelStartDate) &&
      Boolean(onboardingFunnelEndDate) &&
      onboardingFunnelEndDate >= onboardingFunnelStartDate);

  const {
    data: stats,
    isLoading,
    error,
  } = trpc.admin.stats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: upsellStats } = trpc.admin.upsellStats.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: pwaConversionStats } = trpc.admin.pwaConversionStats.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
      refetchInterval: 60_000,
    }
  );

  const { data: pwaUpdateTelemetry } =
    trpc.admin.pwaUpdateTelemetryStats.useQuery(undefined, {
      enabled: user?.role === "admin",
      refetchInterval: 60_000,
    });

  const { data: captionLanguageStats } =
    trpc.admin.captionLanguageStats.useQuery(undefined, {
      enabled: user?.role === "admin",
      refetchInterval: 60_000,
    });

  const { data: onboardingChecklistFunnel } =
    trpc.admin.onboardingChecklistFunnel.useQuery(onboardingFunnelInput, {
      enabled:
        user?.role === "admin" &&
        onboardingFunnelRangeValid &&
        Boolean(onboardingFunnelInput),
      refetchInterval: 60_000,
    });

  const { data: failingSmtpUsers, isLoading: failingSmtpLoading } =
    trpc.admin.failingSmtpUsers.useQuery(undefined, {
      enabled: user?.role === "admin",
      refetchInterval: 30_000,
    });

  const { data: stripeStatus } = trpc.admin.stripeStatus.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 5 * 60_000,
  });

  const { data: systemHealthTrend, isLoading: systemHealthLoading } =
    trpc.admin.systemHealthTrend.useQuery(
      { hours: 24 },
      { enabled: user?.role === "admin", refetchInterval: 5 * 60_000 }
    );

  const { data: operationsAlerts } = trpc.admin.operationsAlerts.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
      refetchInterval: 5 * 60_000,
    }
  );

  const { data: supportMetrics, isLoading: supportMetricsLoading } =
    trpc.support.adminMetrics.useQuery(supportMetricsInput, {
      enabled: user?.role === "admin",
      refetchInterval: 60_000,
    });

  const operationsExport = trpc.admin.operationsAnalyticsExport.useQuery(
    undefined,
    { enabled: false }
  );
  const supportMetricsExport = trpc.support.exportMetricsCsv.useQuery(
    supportMetricsInput,
    { enabled: false }
  );
  const onboardingFunnelExport =
    trpc.admin.onboardingChecklistFunnelExport.useQuery(onboardingFunnelInput, {
      enabled: false,
    });
  const {
    data: onboardingFunnelInsight,
    isFetching: onboardingFunnelInsightLoading,
  } = trpc.admin.onboardingChecklistFunnelInsight.useQuery(
    onboardingFunnelInput,
    {
      enabled:
        user?.role === "admin" &&
        onboardingFunnelRangeValid &&
        Boolean(onboardingFunnelInput),
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const onboardingFunnelComparisonData = useMemo(() => {
    const steps = [
      ["email", "Email"],
      ["platform", "Platform"],
      ["contacts", "Contacts"],
      ["send", "First send"],
    ] as const;
    return steps.map(([step, label]) => {
      const currentRate = Math.max(
        0,
        100 - (onboardingChecklistFunnel?.steps[step]?.continuationRate ?? 0)
      );
      const previousRate = Math.max(
        0,
        100 -
          (onboardingChecklistFunnel?.comparison.previous.steps[step]
            ?.continuationRate ?? 0)
      );
      return { label, currentRate, previousRate };
    });
  }, [onboardingChecklistFunnel]);

  const healthTrendData = useMemo(() => {
    if (!systemHealthTrend) return [];
    return [
      ...systemHealthTrend.smtp.map(point => ({
        timestamp: point.checkedAt,
        smtp: point.successRate,
        authentication: null as number | null,
      })),
      ...systemHealthTrend.authentication.map(point => ({
        timestamp: point.checkedAt,
        smtp: null as number | null,
        authentication: point.successRate,
      })),
    ]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(point => ({
        ...point,
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      }));
  }, [systemHealthTrend]);

  // Pre-fill search from ?search= URL param (e.g., deep-link from /admin/churn)
  const searchString = useSearch();
  const initialSearch = new URLSearchParams(searchString).get("search") ?? "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const utils = trpc.useUtils();
  const { data: searchResults, isFetching: isSearching } =
    trpc.admin.searchUsers.useQuery(
      { query: debouncedSearch },
      { enabled: !!user && debouncedSearch.trim().length >= 2 }
    );

  const grantSubscription = trpc.admin.grantSubscription.useMutation({
    onSuccess: result => {
      toast.success(
        t("adminSubscription.grantSuccess", {
          defaultValue: "{{plan}} access granted to {{email}}.",
          plan: t(`adminSubscription.${result.plan}`),
          email: result.email,
        })
      );
      setGrantTarget(null);
      utils.admin.searchUsers.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const revokeSubscription = trpc.admin.revokeSubscription.useMutation({
    onSuccess: result => {
      toast.success(
        t("adminSubscription.revokeSuccess", {
          defaultValue: "Paid access revoked for {{email}}.",
          email: result.email,
        })
      );
      setRevokeTarget(null);
      utils.admin.searchUsers.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const retestSmtp = trpc.admin.retestUserSmtp.useMutation({
    onSuccess: (result, variables) => {
      setSmtpRetestResults(current => ({
        ...current,
        [variables.userId]: result,
      }));
      result.ok
        ? toast.success("SMTP connection passed its re-test.")
        : toast.error(result.error || "SMTP connection failed its re-test.");
      utils.admin.failingSmtpUsers.invalidate();
    },
    onError: (error, variables) => {
      setSmtpRetestResults(current => ({
        ...current,
        [variables.userId]: {
          ok: false,
          checkedAt: Date.now(),
          error: error.message || "SMTP re-test failed.",
        },
      }));
      toast.error(error.message || "SMTP re-test failed.");
    },
  });

  const downloadOperationsAnalytics = async () => {
    try {
      const result = await operationsExport.refetch();
      if (!result.data)
        throw new Error("The analytics export could not be generated.");
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
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Analytics export failed."
      );
    }
  };

  const downloadSupportMetricsCsv = async () => {
    if (
      (supportReportStartDate || supportReportEndDate) &&
      (!supportReportStartDate || !supportReportEndDate)
    ) {
      toast.error("Choose both a start and end date for a custom SLA export.");
      return;
    }
    if (
      supportReportStartDate &&
      supportReportEndDate &&
      supportReportEndDate < supportReportStartDate
    ) {
      toast.error(
        "The SLA report end date must be on or after the start date."
      );
      return;
    }
    try {
      const result = await supportMetricsExport.refetch();
      if (!result.data)
        throw new Error("The support SLA export could not be generated.");
      const blob = new Blob([result.data.csv], { type: result.data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${result.data.rowCount} support SLA metrics.`);
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Support SLA export failed."
      );
    }
  };

  const downloadOnboardingFunnelCsv = async () => {
    if (!onboardingFunnelRangeValid || !onboardingFunnelInput) {
      toast.error(
        "Choose a valid onboarding funnel date range before exporting."
      );
      return;
    }
    try {
      const result = await onboardingFunnelExport.refetch();
      if (!result.data)
        throw new Error("The onboarding funnel export could not be generated.");
      const blob = new Blob([result.data.csv], { type: result.data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(
        `Downloaded ${result.data.rowCount} aggregate onboarding funnel metrics.`
      );
    } catch (exportError) {
      toast.error(
        exportError instanceof Error
          ? exportError.message
          : "Onboarding funnel export failed."
      );
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
          <ShieldAlert
            size={48}
            className="mx-auto mb-3"
            style={{ color: "oklch(0.55 0.18 25)" }}
          />
          <h2
            className="text-xl font-black"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Access Denied
          </h2>
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
          <span className="text-xs font-bold tracking-widest uppercase rr-text-gold">
            Get Phame
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Administration hub
        </h1>
        <p className="mt-1 text-base font-normal text-white/90">
          Platform operations, account controls, diagnostics, and business
          analytics
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
            style={{
              background: "oklch(0.95 0.03 25)",
              color: "oklch(0.45 0.18 25)",
            }}
          >
            Failed to load stats: {error.message}
          </div>
        )}

        {stats && (
          <>
            <section
              data-testid="admin-operations-hub"
              aria-labelledby="admin-operations-title"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                    Operations
                  </p>
                  <h2
                    id="admin-operations-title"
                    className="mt-1 text-xl font-semibold rr-text-navy"
                  >
                    System control center
                  </h2>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <span className="hidden text-xs font-normal rr-text-navy-muted sm:block">
                    Live summaries refresh automatically
                  </span>
                  <button
                    type="button"
                    data-testid="admin-operations-csv-export"
                    onClick={downloadOperationsAnalytics}
                    disabled={operationsExport.isFetching}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                  >
                    {operationsExport.isFetching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    {operationsExport.isFetching
                      ? "Preparing CSV…"
                      : "Export analytics CSV"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  {
                    path: "/admin/users",
                    label: "User management",
                    detail: `${stats.totalUsers} accounts`,
                    Icon: Users,
                  },
                  {
                    path: "/admin/auth-diagnostics",
                    label: "Authentication health",
                    detail: "24-hour checks and magic links",
                    Icon: ShieldAlert,
                  },
                  {
                    path: "/admin/automation-health",
                    label: t("automationHealth.dashboardCardTitle", {
                      defaultValue: "Automation health",
                    }),
                    detail: t("automationHealth.dashboardCardBody", {
                      defaultValue:
                        "Dependabot merge metrics, drift audits, and active warnings",
                    }),
                    Icon: Activity,
                  },
                  {
                    path: "/admin/security-audits",
                    label: t("securityAudits.dashboardCardTitle", {
                      defaultValue: "Security audit history",
                    }),
                    detail: t("securityAudits.dashboardCardBody", {
                      defaultValue:
                        "Monthly dependency findings and validation outcomes from verified workflow runs",
                    }),
                    Icon: CheckCircle2,
                  },
                  {
                    path: "/admin/security-audit-release",
                    label: t(
                      "securityAuditReleaseVerification.dashboardCardTitle",
                      {
                        defaultValue: "Security Audit internal dossier",
                      }
                    ),
                    detail: t(
                      "securityAuditReleaseVerification.dashboardCardBody",
                      {
                        defaultValue:
                          "Administrator-only release evidence, production controls, and scheduled-audit status",
                      }
                    ),
                    Icon: CheckCircle2,
                  },
                  {
                    path: "/admin/reminder-performance",
                    label: "Reminder operations",
                    detail: `${stats.pendingReminders} pending · ${stats.dueReminders} due`,
                    Icon: TrendingUp,
                  },
                  {
                   path: "/admin/smtp-stats",
                   label: "SMTP health",
                   detail: `${failingSmtpUsers?.length ?? 0} failing · ${stats.activeSmtp}/${stats.totalSmtp} healthy`,
                   Icon: Wifi,
                 },
                 {
                   path: "/admin/stripe-status",
                   label: "Stripe status",
                   detail: stripeStatus?.configured
                     ? `${stripeStatus.mode?.toUpperCase() ?? "?"} mode · webhook ${stripeStatus.webhookStatus ?? "unknown"}`
                     : "Not configured",
                   Icon: CreditCard,
                 },
                  {
                    path: "/admin/codes",
                    label: "System access codes",
                    detail: "Create, review, and revoke codes",
                    Icon: KeyRound,
                  },
                  {
                    path: "/admin/support",
                    label: "Support inbox",
                    detail: "Prioritize, assign, and resolve customer tickets",
                    Icon: Inbox,
                  },
                  {
                    path: "/admin/revenue-controls",
                    label: "Revenue controls",
                    detail:
                      "Create Stripe promotions and temporary access grants",
                    Icon: BadgePercent,
                  },
                  {
                    path: "/admin/revenue",
                    label: "Revenue analytics",
                    detail: "MRR, ARR, conversion, and growth",
                    Icon: DollarSign,
                  },
                  {
                    path: "/admin/churn",
                    label: "Churn analytics",
                    detail: "Cancellation reasons and retention signals",
                    Icon: AlertTriangle,
                  },
                  {
                    path: "/admin/referral-rewards",
                    label: "Referral operations",
                    detail: "Review deferred rewards",
                    Icon: Gift,
                  },
                  {
                    path: "/admin/koalendar-retry",
                    label: "Koalendar recovery",
                    detail: "Inspect and retry failed contact imports",
                    Icon: RotateCcw,
                  },
                  {
                    path: "/admin/github-cleanup",
                    label: t("adminGithubCleanup.dashboardCardTitle", {
                      defaultValue: "GitHub cleanup skill",
                    }),
                    detail: t("adminGithubCleanup.dashboardCardBody", {
                      defaultValue:
                        "Review ancestry, unique work, safety gates, and the presentation script",
                    }),
                    Icon: GitBranch,
                  },
                  {
                    path: "/admin/email-preview",
                    label: "Email template preview",
                    detail: "Preview magic link, welcome, and receipt emails",
                    Icon: Mail,
                  },
                ].map(({ path, label, detail, Icon }) => (
                  <button
                    key={path}
                    type="button"
                    onClick={() => navigate(path)}
                    className="group flex min-h-28 items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
                      <Icon size={21} strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold rr-text-navy">
                        {label}
                      </span>
                      <span className="mt-1 block text-sm font-normal leading-5 rr-text-navy-muted">
                        {detail}
                      </span>
                      <span className="mt-2 block text-xs font-medium rr-text-gold">
                        Open operations →
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section
              data-testid="admin-pwa-conversion"
              aria-labelledby="admin-pwa-conversion-title"
            >
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                  Install conversion
                </p>
                <h2
                  id="admin-pwa-conversion-title"
                  className="mt-1 text-xl font-semibold rr-text-navy"
                >
                  PWA guide and sharing funnel
                </h2>
                <p className="mt-1 text-sm rr-text-navy-muted">
                  Aggregate first-party events only. No raw device or visitor
                  records are shown.
                </p>
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
                  value={
                    (pwaConversionStats?.allTime.share_completed ?? 0) +
                    (pwaConversionStats?.allTime.share_copied ?? 0)
                  }
                  detail={`${pwaConversionStats?.rates.shareConversion ?? 0}% of guide views`}
                  Icon={Share2}
                />
              </div>
            </section>

            <section
              data-testid="admin-pwa-update-telemetry"
              aria-labelledby="admin-pwa-update-telemetry-title"
            >
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                  Update resilience
                </p>
                <h2
                  id="admin-pwa-update-telemetry-title"
                  className="mt-1 text-xl font-semibold rr-text-navy"
                >
                  PWA update notice interactions
                </h2>
                <p className="mt-1 text-sm rr-text-navy-muted">
                  Daily aggregate counters only. No account, visitor, device,
                  network, route, version, or raw event record is collected.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <ConversionMetricCard
                  testId="pwa-update-notices"
                  label="Notices shown"
                  value={pwaUpdateTelemetry?.allTime.notice_shown ?? 0}
                  detail={`${pwaUpdateTelemetry?.last30Days.notice_shown ?? 0} in the last 30 days`}
                  Icon={MousePointerClick}
                />
                <ConversionMetricCard
                  testId="pwa-update-requests"
                  label="Update requests"
                  value={pwaUpdateTelemetry?.allTime.update_requested ?? 0}
                  detail={`${pwaUpdateTelemetry?.rates.requestRate ?? 0}% of notices`}
                  Icon={Activity}
                />
                <ConversionMetricCard
                  testId="pwa-update-applying"
                  label="Safe updates applying"
                  value={pwaUpdateTelemetry?.allTime.update_applying ?? 0}
                  detail={`${pwaUpdateTelemetry?.rates.applyingRate ?? 0}% of requests`}
                  Icon={RotateCcw}
                />
                <ConversionMetricCard
                  testId="pwa-update-deferrals"
                  label="Later selected"
                  value={pwaUpdateTelemetry?.allTime.update_deferred ?? 0}
                  detail={`${pwaUpdateTelemetry?.rates.deferralRate ?? 0}% of notices`}
                  Icon={Clock3}
                />
              </div>
            </section>

            <section
              data-testid="admin-caption-language-analytics"
              aria-labelledby="admin-caption-language-title"
            >
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                  Walkthrough accessibility
                </p>
                <h2
                  id="admin-caption-language-title"
                  className="mt-1 text-xl font-semibold rr-text-navy"
                >
                  Caption language selections
                </h2>
                <p className="mt-1 text-sm rr-text-navy-muted">
                  Explicit language choices only. No visitor identity, referrer,
                  user agent, or free-text payload is collected.
                  {captionLanguageStats?.topAllTime.language
                    ? ` Most selected: ${CAPTION_LANGUAGE_LABELS.find(item => item.code === captionLanguageStats.topAllTime.language)?.label ?? captionLanguageStats.topAllTime.language}.`
                    : " No selections recorded yet."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAPTION_LANGUAGE_LABELS.map(({ code, label }) => (
                  <ConversionMetricCard
                    key={code}
                    testId={`caption-language-${code}`}
                    label={label}
                    value={captionLanguageStats?.allTime[code] ?? 0}
                    detail={`${captionLanguageStats?.last30Days[code] ?? 0} in the last 30 days`}
                    Icon={Languages}
                  />
                ))}
              </div>
            </section>

            <section
              data-testid="admin-setup-funnel"
              aria-labelledby="admin-setup-funnel-title"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                    Onboarding analytics
                  </p>
                  <h2
                    id="admin-setup-funnel-title"
                    className="mt-1 text-xl font-semibold rr-text-navy"
                  >
                    Setup checklist drop-off
                  </h2>
                  <p className="mt-1 text-sm rr-text-navy-muted">
                    Aggregate account-level events only. Each account is counted
                    once per funnel step.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadOnboardingFunnelCsv}
                  disabled={
                    !onboardingFunnelRangeValid ||
                    !onboardingFunnelInput ||
                    onboardingFunnelExport.isFetching
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold rr-bg-navy text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {onboardingFunnelExport.isFetching ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  Export CSV
                </button>
              </div>
              <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Onboarding funnel date range"
                >
                  {(
                    [
                      ["7", "Last 7 Days"],
                      ["30", "Last 30 Days"],
                      ["90", "Last 90 Days"],
                    ] as const
                  ).map(([period, label]) => (
                    <button
                      key={period}
                      type="button"
                      data-testid={`setup-funnel-preset-${period}`}
                      onClick={() => {
                        setOnboardingFunnelPeriod(period);
                        setOnboardingFunnelStartDate("");
                        setOnboardingFunnelEndDate("");
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${onboardingFunnelPeriod === period ? "rr-bg-gold text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOnboardingFunnelPeriod("custom")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${onboardingFunnelPeriod === "custom" ? "rr-bg-gold text-slate-950" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                  >
                    Custom range
                  </button>
                </div>
                {onboardingFunnelPeriod === "custom" && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Start date
                      <input
                        type="date"
                        value={onboardingFunnelStartDate}
                        onChange={event =>
                          setOnboardingFunnelStartDate(event.target.value)
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">
                      End date
                      <input
                        type="date"
                        value={onboardingFunnelEndDate}
                        onChange={event =>
                          setOnboardingFunnelEndDate(event.target.value)
                        }
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                      />
                    </label>
                    {!onboardingFunnelRangeValid && (
                      <p className="sm:col-span-2 text-xs font-semibold text-rose-700">
                        Choose both dates, with an end date on or after the
                        start date.
                      </p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {onboardingChecklistFunnel
                    ? `${onboardingChecklistFunnel.range.periodDays}-day reporting window · ${onboardingChecklistFunnel.range.isCustomRange ? "Custom range" : "Rolling period"}`
                    : "Loading selected reporting window…"}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["email", "Connect email"],
                    ["platform", "Add platform"],
                    ["contacts", "Import contacts"],
                    ["send", "First send"],
                  ] as const
                ).map(([step, label]) => {
                  const metric = onboardingChecklistFunnel?.steps[step];
                  return (
                    <ConversionMetricCard
                      key={step}
                      testId={`setup-funnel-${step}`}
                      label={`${label} drop-off`}
                      value={metric?.dropOff ?? 0}
                      detail={
                        metric
                          ? `${metric.shown} saw step · ${metric.actioned} continued · ${metric.continuationRate}% continued`
                          : "Waiting for setup activity"
                      }
                      Icon={MousePointerClick}
                    />
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ConversionMetricCard
                  testId="setup-funnel-views"
                  label="Checklist views"
                  value={
                    onboardingChecklistFunnel?.allTime.checklist_viewed ?? 0
                  }
                  detail={`Unique viewers in the selected ${onboardingChecklistFunnel?.range.periodDays ?? 30}-day window`}
                  Icon={Users}
                />
                <ConversionMetricCard
                  testId="setup-funnel-completed"
                  label="Checklist completion"
                  value={
                    onboardingChecklistFunnel?.allTime.checklist_completed ?? 0
                  }
                  detail={`${onboardingChecklistFunnel?.rates.completion ?? 0}% of checklist viewers completed all setup steps`}
                  Icon={CheckCircle2}
                />
              </div>
              <div
                className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                data-testid="setup-funnel-comparison-chart"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
                      Drop-off trend
                    </p>
                    <h3 className="mt-0.5 text-sm font-black rr-text-navy">
                      Current period vs. previous period
                    </h3>
                  </div>
                  <p className="text-xs font-semibold rr-text-navy-muted">
                    Percentage points of accounts that viewed a step but did not
                    continue.
                  </p>
                </div>
                <div
                  className="mt-3 h-48"
                  aria-label="Current and previous onboarding step drop-off rate comparison"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={onboardingFunnelComparisonData}
                      margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#dbe3ef"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#53627a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={value => `${value}%`}
                        tick={{ fontSize: 11, fill: "#53627a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          name === "currentRate"
                            ? "Current period"
                            : "Previous period",
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #dbe3ef",
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
                        }}
                      />
                      <Legend
                        formatter={value =>
                          value === "currentRate"
                            ? "Current period"
                            : "Previous period"
                        }
                        wrapperStyle={{ fontSize: 12, fontWeight: 700 }}
                      />
                      <Bar
                        dataKey="currentRate"
                        fill="#d4a017"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="previousRate"
                        fill="#94a3b8"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div
                className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3"
                data-testid="setup-funnel-ai-insight"
                aria-live="polite"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
                    <Sparkles size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
                      AI insight
                    </p>
                    {onboardingFunnelInsightLoading ? (
                      <div className="mt-1 flex items-center gap-2 text-sm font-semibold rr-text-navy-muted">
                        <Loader2 size={14} className="animate-spin" /> Reviewing
                        aggregate funnel data…
                      </div>
                    ) : onboardingFunnelInsight ? (
                      <>
                        <h3 className="mt-0.5 text-sm font-black rr-text-navy">
                          Highest drop-off:{" "}
                          {onboardingFunnelInsight.highestDropOff.label} (
                          {onboardingFunnelInsight.highestDropOff.rate}%)
                        </h3>
                        <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
                          {onboardingFunnelInsight.observation}
                        </p>
                        <p className="mt-2 text-sm font-bold rr-text-navy">
                          <span className="rr-text-gold">
                            Potential improvement:
                          </span>{" "}
                          {onboardingFunnelInsight.recommendation}
                        </p>
                        <p className="mt-2 text-xs font-semibold rr-text-navy-muted">
                          {onboardingFunnelInsight.source === "ai"
                            ? "AI phrasing grounded in the aggregate metrics shown above."
                            : "Aggregate-data fallback shown while AI phrasing is unavailable."}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
                        A data-grounded setup insight will appear when the
                        selected funnel range is available.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="operations-alerts-title">
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                  Alert thresholds
                </p>
                <h2
                  id="operations-alerts-title"
                  className="mt-1 text-xl font-semibold rr-text-navy"
                >
                  Performance guardrails
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <AlertMetricCard
                  testId="smtp-alert-metric"
                  label="SMTP fleet health"
                  value={
                    operationsAlerts?.smtp.value == null
                      ? "No data"
                      : `${operationsAlerts.smtp.value.toFixed(1)}%`
                  }
                  threshold={`Acceptable: ${operationsAlerts?.smtp.threshold ?? 95}% or higher`}
                  isAlert={operationsAlerts?.smtp.status === "alert"}
                  hasData={operationsAlerts?.smtp.hasData ?? false}
                  detail={
                    operationsAlerts?.smtp.checkedAt
                      ? `Checked ${new Date(operationsAlerts.smtp.checkedAt).toLocaleString()}`
                      : "Waiting for the first managed fleet check"
                  }
                />
                <AlertMetricCard
                  testId="reminder-alert-metric"
                  label="Reminder performance"
                  value={
                    operationsAlerts?.reminders.value == null
                      ? "No data"
                      : `${operationsAlerts.reminders.value.toFixed(1)}%`
                  }
                  threshold={`Acceptable: ${operationsAlerts?.reminders.threshold ?? 20}% or higher`}
                  isAlert={operationsAlerts?.reminders.status === "alert"}
                  hasData={operationsAlerts?.reminders.hasData ?? false}
                  detail={
                    operationsAlerts
                      ? `${operationsAlerts.reminders.sampleSize} attributed sends · alerting starts at ${operationsAlerts.reminders.minimumSample}`
                      : "Loading attributed reminder outcomes"
                  }
                />
              </div>
            </section>

            {/* MRR highlight card */}
            {(() => {
              const MONTHLY_PRICE = 29;
              const ANNUAL_MONTHLY_EQUIV = Math.round((290 / 12) * 100) / 100;
              const mrr =
                stats.tierCounts.pro * MONTHLY_PRICE +
                stats.tierCounts.annual * ANNUAL_MONTHLY_EQUIV;
              const arr = mrr * 12;
              return (
                <div
                  className="rounded-2xl px-4 py-4 rr-bg-navy"
                  style={{ border: "2px solid oklch(0.80 0.18 80)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} className="rr-text-gold" />
                    <span className="text-xs font-black uppercase tracking-widest rr-text-gold">
                      Revenue
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold mb-0.5 text-white/70">
                        MRR
                      </p>
                      <p className="text-2xl font-black text-white">
                        $
                        {mrr.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-0.5 text-white/70">
                        ARR
                      </p>
                      <p className="text-2xl font-black rr-text-gold">
                        $
                        {arr.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
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
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${failingSmtpUsers?.length ? "bg-red-700 text-white" : "bg-emerald-700 text-white"}`}
                  >
                    <AlertTriangle size={22} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-black uppercase tracking-[0.14em] ${failingSmtpUsers?.length ? "text-red-700" : "text-emerald-800"}`}
                    >
                      SMTP credential health
                    </p>
                    <h2
                      id="failing-smtp-title"
                      className="mt-0.5 text-xl font-black rr-text-navy"
                    >
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
                  {failingSmtpUsers.slice(0, 4).map(credential => (
                    <div
                      key={credential.userId}
                      className="rounded-xl bg-white/80 p-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black rr-text-navy">
                            {credential.userName ||
                              credential.userEmail ||
                              `User #${credential.userId}`}
                          </p>
                          <p className="truncate text-xs font-bold text-red-700">
                            {credential.host}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            data-testid={`retest-failing-smtp-${credential.userId}`}
                            disabled={
                              retestSmtp.isPending &&
                              retestSmtp.variables?.userId === credential.userId
                            }
                            onClick={() =>
                              retestSmtp.mutate({ userId: credential.userId })
                            }
                            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60"
                          >
                            {retestSmtp.isPending &&
                            retestSmtp.variables?.userId === credential.userId
                              ? "Re-testing…"
                              : "Re-test SMTP"}
                          </button>
                          <button
                            type="button"
                            data-testid={`manage-failing-smtp-${credential.userId}`}
                            onClick={() => {
                              const accountQuery =
                                credential.userEmail ||
                                credential.smtpUser ||
                                credential.userName ||
                                String(credential.userId);
                              navigate(
                                `/admin/users?smtpStatus=failing&search=${encodeURIComponent(accountQuery)}`
                              );
                            }}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-red-700 px-3 text-xs font-black text-white transition active:scale-[0.97]"
                          >
                            Manage user →
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold rr-text-navy-muted">
                        {credential.userEmail || credential.smtpUser}
                      </p>
                      <p
                        data-testid={`smtp-health-${credential.userId}`}
                        className="mt-1 text-xs font-bold rr-text-navy-muted"
                      >
                        Latest health: failed
                        {credential.lastHealthCheck
                          ? ` · ${new Date(credential.lastHealthCheck).toLocaleString()}`
                          : " · not yet timestamped"}
                      </p>
                      {credential.lastHealthError && (
                        <p className="mt-1 line-clamp-2 text-xs font-bold text-red-700">
                          {credential.lastHealthError}
                        </p>
                      )}
                      {smtpRetestResults[credential.userId] && (
                        <p
                          data-testid={`smtp-retest-result-${credential.userId}`}
                          className={`mt-2 rounded-lg px-2 py-1.5 text-xs font-black ${smtpRetestResults[credential.userId].ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                        >
                          {smtpRetestResults[credential.userId].ok
                            ? "Re-test passed"
                            : `Re-test failed: ${smtpRetestResults[credential.userId].error || "Connection rejected"}`}
                          {` · ${new Date(smtpRetestResults[credential.userId].checkedAt).toLocaleString()}`}
                        </p>
                      )}
                    </div>
                  ))}
                  {failingSmtpUsers.length > 4 && (
                    <p className="text-xs font-black text-red-700">
                      +{failingSmtpUsers.length - 4} more failing connections
                    </p>
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

            {/* Stripe status widget */}
            <section
              data-testid="stripe-status-widget"
              className={`rounded-2xl border-2 p-4 shadow-sm ${
                !stripeStatus?.configured
                  ? "border-gray-200 bg-gray-50"
                  : stripeStatus.webhookStatus === "enabled"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
              aria-labelledby="stripe-status-title"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
                    !stripeStatus?.configured
                      ? "bg-gray-400"
                      : stripeStatus.webhookStatus === "enabled"
                      ? "bg-emerald-700"
                      : "bg-amber-600"
                  }`}
                >
                  <CreditCard size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    id="stripe-status-title"
                    className={`text-xs font-black uppercase tracking-[0.14em] ${
                      !stripeStatus?.configured
                        ? "text-gray-500"
                        : stripeStatus.webhookStatus === "enabled"
                        ? "text-emerald-800"
                        : "text-amber-700"
                    }`}
                  >
                    Stripe payment integration
                  </p>
                  {!stripeStatus ? (
                    <p className="mt-1 text-sm text-gray-400">Loading…</p>
                  ) : !stripeStatus.configured ? (
                    <p className="mt-1 text-sm font-semibold text-gray-600">
                      No Stripe key configured. Add <code className="rounded bg-gray-200 px-1 text-xs">STRIPE_SECRET_KEY</code> to activate payments.
                    </p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                        <span>
                          Mode:{" "}
                          <span className={`font-black ${stripeStatus.mode === "live" ? "text-emerald-700" : "text-amber-700"}`}>
                            {stripeStatus.mode?.toUpperCase() ?? "—"}
                          </span>
                        </span>
                        <span>
                          Webhook:{" "}
                          <span className={`font-black ${stripeStatus.webhookStatus === "enabled" ? "text-emerald-700" : "text-red-600"}`}>
                            {stripeStatus.webhookStatus ?? "unknown"}
                          </span>
                        </span>
                        <span>
                          Secret:{" "}
                          <span className={`font-black ${stripeStatus.webhookSecretSet ? "text-emerald-700" : "text-red-600"}`}>
                            {stripeStatus.webhookSecretSet ? "set" : "missing"}
                          </span>
                        </span>
                      </div>
                      {stripeStatus.webhookUrl && (
                        <p className="truncate text-xs text-gray-500">{stripeStatus.webhookUrl}</p>
                      )}
                      {stripeStatus.events.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {stripeStatus.events.length} event{stripeStatus.events.length !== 1 ? "s" : ""} subscribed
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Lead Capture List ─────────────────────────────────────────── */}
            <ConsentHealthBanner />
            <ReleaseParityCard />
            <LeadsSection />

            <section
              data-testid="system-health-trend-chart"
              className="rounded-2xl bg-white p-4 shadow-sm"
              aria-labelledby="system-health-trend-title"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
                    <Activity size={21} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-gold">
                      System health
                    </p>
                    <h2
                      id="system-health-trend-title"
                      className="mt-0.5 text-xl font-black rr-text-navy"
                    >
                      24-hour health trend
                    </h2>
                    <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
                      Managed SMTP fleet checks and authentication diagnostics.
                      Missing observations are not inferred.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs font-black rr-text-navy-muted sm:justify-end">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-blue-700" />
                    SMTP
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-600" />
                    Authentication
                  </span>
                </div>
              </div>
              {systemHealthLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 size={24} className="animate-spin rr-text-navy" />
                </div>
              ) : healthTrendData.length === 0 ? (
                <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
                  <div>
                    <p className="text-sm font-black rr-text-navy">
                      Monitoring data unavailable
                    </p>
                    <p className="mt-1 text-sm font-semibold rr-text-navy-muted">
                      No health status is being inferred from missing data. The
                      chart will populate after managed checks run.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="mt-4 h-64 w-full"
                  aria-label="SMTP and authentication success rates over the last 24 hours"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={healthTrendData}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#dbe3ef"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 11, fill: "#53627a" }}
                        minTickGap={28}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 50, 95, 100]}
                        tickFormatter={value => `${value}%`}
                        tick={{ fontSize: 11, fill: "#53627a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          name === "smtp" ? "SMTP" : "Authentication",
                        ]}
                        labelFormatter={label => `Observed at ${label}`}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #dbe3ef",
                          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.10)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="smtp"
                        stroke="#1d4ed8"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="authentication"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section
              data-testid="admin-support-reporting"
              aria-labelledby="admin-support-reporting-title"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] rr-text-navy-muted">
                    Support operations
                  </p>
                  <h2
                    id="admin-support-reporting-title"
                    className="mt-1 text-xl font-semibold rr-text-navy"
                  >
                    Response and resolution reporting
                  </h2>
                  <p className="mt-1 text-sm rr-text-navy-muted">
                    First response begins at the first administrator update or
                    private resolution note.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <label className="flex items-center gap-2 text-sm font-black rr-text-navy">
                    <span className="sr-only">Reporting period</span>
                    <select
                      value={supportReportingPeriod}
                      onChange={event => {
                        setSupportReportingPeriod(
                          event.target.value as "7" | "30" | "90"
                        );
                        setSupportReportStartDate("");
                        setSupportReportEndDate("");
                      }}
                      className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                    </select>
                  </label>
                  <div
                    className="grid grid-cols-2 gap-2"
                    aria-label="Custom SLA reporting date range"
                  >
                    <label className="text-xs font-black rr-text-navy">
                      <span className="mb-1 block">From</span>
                      <input
                        type="date"
                        value={supportReportStartDate}
                        max={supportReportEndDate || undefined}
                        onChange={event =>
                          setSupportReportStartDate(event.target.value)
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                    <label className="text-xs font-black rr-text-navy">
                      <span className="mb-1 block">To</span>
                      <input
                        type="date"
                        value={supportReportEndDate}
                        min={supportReportStartDate || undefined}
                        onChange={event =>
                          setSupportReportEndDate(event.target.value)
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold rr-text-navy outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                  </div>
                  <p className="max-w-xs text-xs font-medium rr-text-navy-muted">
                    Optional custom range: up to 366 days. Choosing a preset
                    clears custom dates.
                  </p>
                  <button
                    type="button"
                    data-testid="admin-support-sla-csv-export"
                    onClick={downloadSupportMetricsCsv}
                    disabled={supportMetricsExport.isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl rr-bg-navy px-3 text-sm font-black text-white transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                  >
                    {supportMetricsExport.isFetching ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    {supportMetricsExport.isFetching
                      ? "Preparing CSV…"
                      : "Export SLA CSV"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SupportMetricCard
                  label="Average first response"
                  value={
                    supportMetricsLoading
                      ? "Loading…"
                      : formatSupportMetricDuration(
                          supportMetrics?.avgFirstResponseMs
                        )
                  }
                  detail={
                    supportMetrics
                      ? `${supportMetrics.firstResponseCount} ticket${supportMetrics.firstResponseCount === 1 ? "" : "s"} with a recorded first response`
                      : "Waiting for support data"
                  }
                  Icon={Clock3}
                />
                <SupportMetricCard
                  label="Average resolution"
                  value={
                    supportMetricsLoading
                      ? "Loading…"
                      : formatSupportMetricDuration(
                          supportMetrics?.avgResolutionMs
                        )
                  }
                  detail={
                    supportMetrics
                      ? `${supportMetrics.resolvedTickets} resolved ticket${supportMetrics.resolvedTickets === 1 ? "" : "s"}`
                      : "Waiting for resolution data"
                  }
                  Icon={CheckCircle2}
                />
                <SupportMetricCard
                  label="Tickets created"
                  value={
                    supportMetricsLoading
                      ? "Loading…"
                      : String(supportMetrics?.ticketsCreated ?? 0)
                  }
                  detail={
                    supportMetrics
                      ? `${supportMetrics.openTickets} currently open`
                      : "Waiting for support data"
                  }
                  Icon={Inbox}
                />
                <SupportMetricCard
                  label="SLA overdue"
                  value={
                    supportMetricsLoading
                      ? "Loading…"
                      : String(supportMetrics?.overdueTickets ?? 0)
                  }
                  detail={
                    supportMetrics?.overdueTickets
                      ? "Review the overdue-SLA queue"
                      : "No unresolved overdue SLA targets"
                  }
                  Icon={AlertTriangle}
                  alert={Boolean(supportMetrics?.overdueTickets)}
                />
              </div>
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
                icon={
                  <TrendingUp
                    size={20}
                    style={{ color: "oklch(0.55 0.18 150)" }}
                  />
                }
                label="Upsell Clicks (30d)"
                value={upsellStats ? upsellStats.last30.toLocaleString() : "—"}
              />
              <KpiCard
                icon={
                  <CheckCircle2
                    size={20}
                    style={{ color: "oklch(0.55 0.18 150)" }}
                  />
                }
                label="Upsell Clicks (all)"
                value={upsellStats ? upsellStats.total.toLocaleString() : "—"}
              />
            </div>

            {/* Tier breakdown */}
            <div
              className="rounded-2xl px-4 py-4 bg-white"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3 className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy">
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
                  icon={
                    <Star size={14} style={{ color: "oklch(0.55 0.18 80)" }} />
                  }
                  label="Pro Monthly"
                  count={stats.tierCounts.pro}
                  total={stats.totalUsers}
                  color="oklch(0.80 0.18 80)"
                />
                <TierRow
                  icon={
                    <Zap size={14} style={{ color: "oklch(0.55 0.18 80)" }} />
                  }
                  label="Pro Annual"
                  count={stats.tierCounts.annual}
                  total={stats.totalUsers}
                  color="oklch(0.70 0.18 80)"
                />
                <TierRow
                  icon={
                    <Infinity
                      size={14}
                      style={{ color: "oklch(0.55 0.22 150)" }}
                    />
                  }
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
                        ((stats.tierCounts.pro +
                          stats.tierCounts.annual +
                          stats.tierCounts.lifetime) /
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
              className="rounded-2xl px-4 py-4 bg-white"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3 className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy">
                Recent Signups
              </h3>
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No users yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {[...stats.recentUsers].reverse().map(u => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold rr-text-navy">
                          {u.name || "(no name)"}
                        </p>
                        <p className="text-sm font-bold rr-text-navy-mid">
                          {u.email}
                        </p>
                      </div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "oklch(0.35 0.04 260)" }}
                      >
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User search */}
            <div
              className="rounded-2xl px-4 py-4 bg-white"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3 className="text-sm font-black mb-3 uppercase tracking-widest rr-text-navy">
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
                  className="w-full rounded-xl pl-8 pr-8 py-2.5 text-sm outline-none rr-text-navy"
                  style={{
                    background: "oklch(0.97 0.003 260)",
                    border: "1px solid oklch(0.88 0.02 260)",
                  }}
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
                  <Loader2
                    size={14}
                    className="animate-spin rr-text-navy-muted"
                  />
                  <span className="text-sm font-bold rr-text-navy-mid">
                    Searching…
                  </span>
                </div>
              )}
              {!isSearching &&
                searchResults &&
                searchResults.length === 0 &&
                debouncedSearch.length >= 2 && (
                  <p className="text-xs py-2 rr-text-navy-muted">
                    No users found.
                  </p>
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
                        <p className="text-sm font-bold rr-text-navy-mid">
                          {u.email}
                        </p>
                        {u.churnReason && (
                          <span
                            className="inline-block text-xs font-bold rounded-full px-2 py-0.5 mt-0.5"
                            style={{
                              background: "oklch(0.95 0.04 20)",
                              color: "oklch(0.45 0.15 20)",
                            }}
                          >
                            Churned: {u.churnReason.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <span className="rounded-lg bg-[oklch(0.93_0.02_260)] px-2 py-1 text-xs font-bold rr-text-navy-mid">
                          {u.tier ?? "free"}
                        </span>
                        {u.email && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setGrantPlan("monthly");
                                setGrantTarget({
                                  email: u.email!,
                                  name: u.name,
                                });
                              }}
                              className="rounded-lg bg-[oklch(0.80_0.18_80)] px-2.5 py-1.5 text-xs font-black text-[#061a3a] transition-transform active:scale-[0.97]"
                            >
                              {t("adminSubscription.grant", {
                                defaultValue: "Grant Subscription",
                              })}
                            </button>
                            {u.tier !== "free" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRevokeTarget({
                                    email: u.email!,
                                    name: u.name,
                                  })
                                }
                                className="rounded-lg border border-red-300/60 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 transition-transform active:scale-[0.97]"
                              >
                                {t("adminSubscription.revoke", {
                                  defaultValue: "Revoke Access",
                                })}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {debouncedSearch.length < 2 && (
                <p className="text-xs rr-text-navy-faint">
                  Type at least 2 characters to search.
                </p>
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

      <Dialog
        open={grantTarget !== null}
        onOpenChange={open => !open && setGrantTarget(null)}
      >
        <DialogContent className="border-white/15 rr-bg-navy text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t("adminSubscription.grantTitle", {
                defaultValue: "Grant Subscription",
              })}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {t("adminSubscription.grantDescription", {
                defaultValue: "Choose the access period for {{email}}.",
                email: grantTarget?.email ?? "",
              })}
            </DialogDescription>
          </DialogHeader>

          <div
            className="grid gap-2"
            role="group"
            aria-label={t("adminSubscription.durationLabel", {
              defaultValue: "Subscription period",
            })}
          >
            {(["monthly", "annual", "lifetime"] as const).map(plan => (
              <button
                key={plan}
                type="button"
                aria-pressed={grantPlan === plan}
                onClick={() => setGrantPlan(plan)}
                className={`flex min-h-12 items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
                  grantPlan === plan
                    ? "border-[oklch(0.80_0.18_80)] bg-[oklch(0.27_0.10_260)] rr-text-gold"
                    : "border-white/15 bg-white/5 text-white hover:border-white/35"
                }`}
              >
                <span>{t(`adminSubscription.${plan}`)}</span>
                <span className="text-right text-xs font-semibold text-white/60">
                  {t(`adminSubscription.${plan}Description`)}
                </span>
              </button>
            ))}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setGrantTarget(null)}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white"
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              type="button"
              disabled={!grantTarget || grantSubscription.isPending}
              onClick={() =>
                grantTarget &&
                grantSubscription.mutate({
                  email: grantTarget.email,
                  plan: grantPlan,
                })
              }
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-60 rr-bg-gold rr-text-navy"
            >
              {grantSubscription.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("adminSubscription.confirmGrant", {
                defaultValue: "Grant Access",
              })}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={open => !open && setRevokeTarget(null)}
      >
        <AlertDialogContent className="border-white/15 rr-bg-navy text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {t("adminSubscription.revokeTitle", {
                defaultValue: "Revoke paid access?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              {t("adminSubscription.revokeDescription", {
                defaultValue:
                  "{{email}} will return to the Free tier immediately. This does not issue a refund or cancel billing in Stripe.",
                email: revokeTarget?.email ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white">
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!revokeTarget || revokeSubscription.isPending}
              onClick={() =>
                revokeTarget &&
                revokeSubscription.mutate({ email: revokeTarget.email })
              }
              className="bg-red-600 font-black text-white hover:bg-red-700"
            >
              {revokeSubscription.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              {t("adminSubscription.confirmRevoke", {
                defaultValue: "Revoke Access",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      className="rounded-2xl px-4 py-4 flex flex-col gap-2 bg-white"
      style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
    >
      {icon}
      <p className="text-2xl font-black rr-text-navy">{value}</p>
      <p className="text-sm font-bold rr-text-navy-mid">{label}</p>
    </div>
  );
}

function formatSupportMetricDuration(milliseconds: number | null | undefined) {
  if (milliseconds === null || milliseconds === undefined) return "No data";
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function SupportMetricCard({
  label,
  value,
  detail,
  Icon,
  alert = false,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ${alert ? "bg-red-50" : "bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] rr-text-navy-muted">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black rr-text-navy">{value}</p>
        </div>
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white ${alert ? "bg-red-700" : "rr-bg-navy"}`}
        >
          <Icon size={19} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-sm font-medium rr-text-navy-muted">{detail}</p>
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
          <p className="text-xs font-medium uppercase tracking-[0.14em] rr-text-navy-muted">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black rr-text-navy">
            {value.toLocaleString()}
          </p>
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
    <div
      data-testid={testId}
      role={isAlert ? "alert" : undefined}
      className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-black uppercase tracking-[0.14em] ${isAlert ? "text-red-700" : "rr-text-navy-muted"}`}
          >
            {label}
          </p>
          <p
            className={`mt-1 text-3xl font-black ${isAlert ? "text-red-700" : "rr-text-navy"}`}
          >
            {value}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${isAlert ? "bg-red-700 text-white" : hasData ? "bg-emerald-700 text-white" : "bg-slate-200 text-slate-700"}`}
        >
          {isAlert ? "Below threshold" : hasData ? "Healthy" : "No data"}
        </span>
      </div>
      <p
        className={`mt-2 text-sm font-black ${isAlert ? "text-red-700" : "rr-text-navy"}`}
      >
        {threshold}
      </p>
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
          <span
            className="text-xs font-bold"
            style={{ color: "oklch(0.35 0.04 260)" }}
          >
            {label}
          </span>
          <span className="text-xs font-black rr-text-navy">{count}</span>
        </div>
        <div
          className="h-1.5 rounded-full w-full"
          style={{ background: "oklch(0.92 0.01 260)" }}
        >
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}
