// Phame — Dashboard / Analytics Screen
// Shows: total requests, monthly count, weekly breakdown chart, full activity log

import { useTranslation } from 'react-i18next';
import { trpc } from "@/lib/trpc";
import { BarChart2, Send, TrendingUp, ShieldCheck, Star, Loader2, Calendar, Zap, CheckCircle2, Circle, CheckSquare, Square, X, Search, Eye, MousePointerClick, RotateCcw, Share2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, subDays, startOfDay } from "date-fns";
import { useLocation } from "wouter";
import { lazy, useMemo, useRef, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import LanguageFlyout from "@/components/LanguageFlyout";
import ClientDetailSheet from "@/components/ClientDetailSheet";
import DeferredDashboardSection from "@/components/dashboard/DeferredDashboardSection";
import RecentActivityCard from "@/components/dashboard/RecentActivityCard";
import MailServerHealthBadge from "@/components/dashboard/MailServerHealthBadge";

const ActivityTrendCard = lazy(() => import("@/components/dashboard/ActivityTrendCard"));

function formatDate(date: Date): string {
  try {
    return format(date, "MMM d, h:mm a");
  } catch {
    return String(date);
  }
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const { data: stats, isLoading } = trpc.requests.stats.useQuery();
  const { data: consentStats } = trpc.contacts.consentStats.useQuery();
  const { data: allRequests, isLoading: listLoading } = trpc.requests.list.useQuery();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: emailPerf } = trpc.tracking.overallStats.useQuery();
  const { data: smtpStatus } = trpc.smtp.status.useQuery();
  const { data: bulkSenderStatus } = trpc.bulkSender.status.useQuery();
  const utils = trpc.useUtils();
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);

  const showDashboardApiError = () => {
    toast.error(
      t("apiRecovery.unavailableTitle", {
        defaultValue: "We’re reconnecting Get Phame.",
      }),
      {
        description: t("apiRecovery.unavailableDescription", {
          defaultValue:
            "The service is taking a little longer than expected. Your work is safe; try again when you’re ready.",
        }),
        duration: 8_000,
      }
    );
  };

  const handleShareProfile = async () => {
    const profileLink = profile?.reviewLink;
    if (!profileLink) return;

    try {
      await copyTextToClipboard(profileLink);
      setProfileLinkCopied(true);
      toast.success(
        t("dashboard.shareProfile.copySuccess", {
          defaultValue: "Profile link copied.",
        })
      );
      window.setTimeout(() => setProfileLinkCopied(false), 3_000);
    } catch {
      toast.error(
        t("dashboard.shareProfile.copyError", {
          defaultValue: "Could not copy the profile link. Please try again.",
        })
      );
    }
  };

  // Undo toast state for single-row mark in the activity feed
  const [feedUndoId, setFeedUndoId] = useState<number | null>(null);
  const feedUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (feedUndoTimerRef.current) clearTimeout(feedUndoTimerRef.current); }, []);

  const startFeedUndoTimer = (cb: () => void, ms = 4000) => {
    if (feedUndoTimerRef.current) clearTimeout(feedUndoTimerRef.current);
    feedUndoTimerRef.current = setTimeout(cb, ms);
  };

  // Single-row mark mutation — with undo toast when marking as reviewed
  const markRespondedMutation = trpc.requests.markResponded.useMutation({
    onSuccess: (_data, vars) => {
      utils.requests.list.invalidate();
      if (vars.responded) {
        setFeedUndoId(vars.id);
        startFeedUndoTimer(() => setFeedUndoId(null));
      }
    },
    onError: showDashboardApiError,
  });

  // Undo mutation for single-row feed mark — separate instance
  const feedUndoMutation = trpc.requests.markResponded.useMutation({
    onSuccess: () => { utils.requests.list.invalidate(); setFeedUndoId(null); },
    onError: () => {
      setFeedUndoId(null);
      showDashboardApiError();
    },
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

  // Bulk restart campaign mutation
  const [bulkRestartConfirmOpen, setBulkRestartConfirmOpen] = useState(false);
  const bulkRestartMutation = trpc.requests.bulkRestart.useMutation({
    onSuccess: ({ sent, errors }) => {
      utils.requests.list.invalidate();
      utils.requests.stats.invalidate();
      if (errors.length > 0) {
        toast.warning(`Restarted ${sent} campaign(s). ${errors.length} failed.`);
      } else {
        toast.success(`Restarted ${sent} campaign(s) successfully.`);
      }
      setSelected(new Set());
    },
    onError: showDashboardApiError,
  });

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
      showDashboardApiError();
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
        if (!r.sentAt) return false;
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
    const last7 = allRequests.filter((r) => r.sentAt && new Date(r.sentAt).getTime() > now - 7 * 86400000).length;
    const prior7 = allRequests.filter((r) => {
      if (!r.sentAt) return false;
      const t = new Date(r.sentAt).getTime();
      return t > now - 14 * 86400000 && t <= now - 7 * 86400000;
    }).length;
    const delta = last7 - prior7;
    return { last7, prior7, delta };
  }, [allRequests]);

  if (isLoading || listLoading) {
    return (
      <main
        data-testid="dashboard-loading"
        role="status"
        aria-live="polite"
        aria-label={t("dashboard.loading.ariaLabel", {
          defaultValue: "Loading your dashboard",
        })}
        className="flex min-h-screen items-center justify-center px-4"
        style={{ background: "var(--background)" }}
      >
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl rr-bg-navy">
            <Loader2 className="animate-spin rr-text-gold" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-black rr-text-navy">
              {t("dashboard.loading.title", { defaultValue: "Loading your dashboard…" })}
            </p>
            <p className="mt-1 text-sm rr-text-navy-muted">
              {t("dashboard.loading.description", {
                defaultValue: "Getting your latest review-request activity ready.",
              })}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--background)" }}>
      {/* Navy Header */}
      <div className="px-5 pt-14 md:pt-6 pb-8" style={{ background: "var(--navy)" }}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="rr-text-gold" />
            <span
              className="text-xs font-bold tracking-widest uppercase rr-text-gold"
            >
              {t('dashboard.header.label')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="dashboard-share-profile"
              onClick={() => void handleShareProfile()}
              disabled={!profile?.reviewLink}
              aria-label={
                profile?.reviewLink
                  ? t("dashboard.shareProfile.button", { defaultValue: "Share Profile" })
                  : t("dashboard.shareProfile.unavailable", {
                      defaultValue: "Add your profile link in Settings to share it.",
                    })
              }
              title={
                profile?.reviewLink
                  ? t("dashboard.shareProfile.button", { defaultValue: "Share Profile" })
                  : t("dashboard.shareProfile.unavailable", {
                      defaultValue: "Add your profile link in Settings to share it.",
                    })
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/20 px-2.5 text-xs font-bold text-white transition-all hover:bg-white/10 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {profileLinkCopied ? (
                <CheckCircle2 size={14} className="rr-text-gold" aria-hidden="true" />
              ) : (
                <Share2 size={14} className="rr-text-gold" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">
                {profileLinkCopied
                  ? t("dashboard.shareProfile.copied", { defaultValue: "Copied" })
                  : t("dashboard.shareProfile.button", { defaultValue: "Share Profile" })}
              </span>
            </button>
            <LanguageFlyout />
          </div>
        </div>
        <h1
          className="text-2xl mb-6 text-white rr-fw-black"
        >
          {t('dashboard.header.title')}
        </h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('dashboard.stats.thisMonth'), value: stats?.thisMonth ?? 0, icon: <Send size={14} /> },
            { label: t('dashboard.stats.allTime'), value: stats?.total ?? 0, icon: <TrendingUp size={14} /> },
            { label: t('dashboard.stats.last7Days'), value: velocity?.last7 ?? 0, icon: <Star size={14} /> },
            { label: t('dashboard.stats.consented', 'Consented'), value: consentStats?.consented ?? 0, icon: <ShieldCheck size={14} />, subtitle: consentStats ? `of ${consentStats.total}` : undefined, href: '/contacts?consent=consented' },
          ].map((s) => {
            const inner = (
              <>
                <div className="flex items-center justify-center gap-1 mb-1 rr-text-gold">{s.icon}</div>
                <div className="text-2xl font-black text-white">
                  {isLoading ? <div className="h-7 w-10 mx-auto rounded-md animate-pulse" style={{ background: "oklch(1 0 0 / 0.15)" }} /> : s.value}
                </div>
                <div className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>{s.label}</div>
                {(s as any).subtitle && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-on-dark-secondary)", opacity: 0.7 }}>{(s as any).subtitle}</div>
                )}
              </>
            );
            return (s as any).href ? (
              <a key={s.label} href={(s as any).href} title="View consented contacts"
                className="rounded-xl px-3 py-3 text-center rr-bg-navy-mid block hover:opacity-80 transition-opacity focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none">
                {inner}
              </a>
            ) : (
              <div key={s.label} className="rounded-xl px-3 py-3 text-center rr-bg-navy-mid">{inner}</div>
            );
          })}
        </div>
        <MailServerHealthBadge smtp={smtpStatus} bulk={bulkSenderStatus} translate={t} />
      </div>

      <div className="px-4 py-4 lg:px-8 lg:py-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* ── Analytics Card: deferred Chart.js module and data query ─────── */}
        <DeferredDashboardSection loadingLabel="Loading analytics" minHeightClassName="min-h-[324px]">
          <ActivityTrendCard total={stats?.total ?? 0} velocity={velocity} />
        </DeferredDashboardSection>


        {/* Email Performance Card */}
        {emailPerf && emailPerf.totalSent > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3
              className="text-sm font-black mb-3 rr-text-navy"
            >
              {t('dashboard.emailPerformance.title')}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs mb-1 rr-text-navy-muted">{t('dashboard.emailPerformance.sent')}</p>
                <p className="text-xl font-black rr-text-navy">
                  {emailPerf.totalSent}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1 rr-text-navy-muted">{t('dashboard.emailPerformance.openRate')}</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.55 0.20 145)", fontFamily: "'Poppins', sans-serif" }}>
                  {emailPerf.openRate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs mb-1 rr-text-navy-muted">{t('dashboard.emailPerformance.clickRate')}</p>
                <p className="text-xl font-black" style={{ color: "oklch(0.75 0.18 80)", fontFamily: "'Poppins', sans-serif" }}>
                  {emailPerf.clickRate}%
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 flex gap-4" style={{ borderTop: "1px solid oklch(0.94 0.01 260)" }}>
              <div className="flex items-center gap-1.5">
                <Eye size={13} style={{ color: "oklch(0.55 0.20 145)" }} />
                <span className="text-xs rr-text-navy-muted">
                  {t('dashboard.emailPerformance.uniqueOpens', { count: emailPerf.uniqueOpens })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MousePointerClick size={13} style={{ color: "oklch(0.75 0.18 80)" }} />
                <span className="text-xs rr-text-navy-muted">
                  {t('dashboard.emailPerformance.uniqueClicks', { count: emailPerf.uniqueClicks })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Summary Card */}
        {(allRequests?.length ?? 0) > 0 && (
          <RecentActivityCard
            requests={allRequests ?? []}
            trackingMap={trackingMap}
            isLoading={listLoading}
            onSelectRequest={setSelectedRequestId}
          />
        )}

        {/* Activity Feed */}
        <div id="activity-feed" className="bg-white rounded-2xl p-4 shadow-sm">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
@@ {/* Search + status filter */}
          {/* Feed undo toast — 4-second window, shown after marking a row as reviewed */}
          {feedUndoId !== null && (
            <div
              className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg text-xs font-bold animate-toast-in"
              style={{ background: "oklch(0.92 0.10 145)", color: "oklch(0.30 0.12 145)" }}
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                {t("dashboard.activityFeed.markAsReviewed", { defaultValue: "Marked as reviewed" })}
              </span>
              <button
                onClick={() => {
                  if (feedUndoTimerRef.current) clearTimeout(feedUndoTimerRef.current);
                  const id = feedUndoId;
                  setFeedUndoId(null);
                  feedUndoMutation.mutate({ id, responded: false });
                }}
                className="text-xs font-black underline underline-offset-2 shrink-0"
                style={{ color: "oklch(0.25 0.10 145)" }}
              >
                {t("common.undo", { defaultValue: "Undo" })}
              </button>
            </div>
          )}
            <h3
              className="text-sm font-black rr-text-navy"
            >
              {t('dashboard.activityFeed.title')}
              {(allRequests?.length ?? 0) > 0 && (
                <span className="ml-1.5 text-xs font-normal rr-text-navy-muted">
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
                {allFilteredSelected ? t('dashboard.activityFeed.deselectAll') : t('dashboard.activityFeed.selectAll')}
              </button>
            )}
          </div>

          {/* Search + status filter */}
          {(allRequests?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none rr-text-navy-faint" />
                <Input
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder={t('dashboard.activityFeed.searchPlaceholder')}
                  className="pl-8 pr-8 text-sm h-9 bg-gray-50 border-gray-200"
                />
                {activitySearch && (
                  <button
                    onClick={() => setActivitySearch("")}
                    aria-label={t('dashboard.activityFeed.clearSearchAriaLabel')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {(["all", "pending", "reviewed"] as const).map((opt) => {
                  const labels = { all: t('dashboard.activityFeed.filterAll'), pending: t('dashboard.activityFeed.filterPending'), reviewed: t('dashboard.activityFeed.filterReviewed') };
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
                    className="ml-auto text-xs px-2 py-1 rounded-lg rr-text-navy-muted"
                  >
                    {t('dashboard.activityFeed.clearFilters')}
                  </button>
                )}
              </div>
            </div>
          )}

          {(isLoading || listLoading) ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin rr-text-navy" />
            </div>
          ) : !allRequests || allRequests.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Send size={32} style={{ color: "oklch(0.80 0.03 260)" }} />
              <p className="text-sm text-center rr-text-navy-muted">
                {t('dashboard.activityFeed.noRequestsYet')}
              </p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <Search size={28} style={{ color: "oklch(0.80 0.03 260)" }} />
              <p className="text-sm rr-text-navy-muted">{t('dashboard.activityFeed.noMatchingRequests')}</p>
              <button
                onClick={() => { setActivitySearch(""); setStatusFilter("all"); }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg mt-1 rr-bg-surface" style={{ color: "oklch(0.45 0.05 260)" }}
              >
                {t('dashboard.activityFeed.clearFiltersButton')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {filteredRequests.map((req, idx) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3 animate-fade-up"
                  style={{
                    animationDelay: `${Math.min(idx * 40, 400)}ms`,
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
                      aria-label={selected.has(req.id) ? `Deselect ${req.customerName}` : `Select ${req.customerName}`}
                      aria-pressed={selected.has(req.id)}
                      className="shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
                      style={{ color: selected.has(req.id) ? "oklch(0.45 0.12 280)" : undefined }}
                    >
                      {selected.has(req.id) ? <CheckSquare size={16} aria-hidden="true" /> : <Square size={16} aria-hidden="true" />}
                    </button>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 rr-bg-navy rr-text-gold"
                    >
                      {req.customerName[0].toUpperCase()}
                    </div>
                    <button
                      onClick={() => setSelectedRequestId(req.id)}
                      className="text-left hover:opacity-80 transition-opacity"
                    >
                      <p className="text-sm font-bold rr-text-navy underline decoration-dotted underline-offset-2">
                        {req.customerName}
                      </p>
                      <p className="text-xs rr-text-navy-muted">
                        {req.customerEmail}
                      </p>
                    </button>
                  </div>
                  <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
                    <button
                      onClick={() => markRespondedMutation.mutate({ id: req.id, responded: !req.respondedAt })}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold transition-colors"
                      title={req.respondedAt ? t('dashboard.activityFeed.markAsNotReviewed') : t('dashboard.activityFeed.markAsReviewed')}
                      style={req.respondedAt ? {
                        background: "oklch(0.88 0.10 80)",
                        color: "oklch(0.35 0.12 80)",
                      } : {
                        background: "oklch(0.96 0.04 145)",
                        color: "oklch(0.45 0.12 145)",
                      }}
                    >
                      {req.respondedAt
                        ? <><CheckCircle2 size={11} className="mr-0.5" /> {t('dashboard.activityFeed.statusReviewed')}</>
                        : <><Circle size={11} className="mr-0.5" /> {t('dashboard.activityFeed.statusSent')}</>
                      }
                    </button>
                    <p className="text-xs rr-text-navy-faint">
                      {req.sentAt
                        ? formatDate(new Date(req.sentAt))
                        : t("quietHours.queuedForDelivery", "Queued for delivery")}
                    </p>
                    {/* Open / click badges */}
                    {trackingMap.has(req.id) && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {(trackingMap.get(req.id)!.opens > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: "oklch(0.93 0.04 260)", color: "oklch(0.40 0.08 260)" }}
                            title={t('dashboard.activityFeed.emailOpenedTooltip')}
                          >
                            <Eye size={10} />
                            {trackingMap.get(req.id)!.opens}
                          </span>
                        )}
                        {(trackingMap.get(req.id)!.clicks > 0) && (
                          <span
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: "oklch(0.92 0.08 80)", color: "oklch(0.40 0.12 80)" }}
                            title={t('dashboard.activityFeed.reviewLinkClickedTooltip')}
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
      </div>{/* end max-width wrapper */}
      </div>{/* end outer padding */}

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl rr-bg-navy" style={{ minWidth: "280px" }}
        >
          <span className="text-xs font-bold flex-1 rr-text-gold">
            {t('dashboard.bulkActions.selectedCount', { count: selected.size })}
          </span>
          <button
            onClick={() => bulkMarkRespondedMutation.mutate({ ids: Array.from(selected), responded: true })}
            disabled={bulkMarkRespondedMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-colors rr-bg-gold rr-text-navy"
          >
            {bulkMarkRespondedMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            {t('dashboard.bulkActions.markReviewed')}
          </button>
          <button
            onClick={() => bulkMarkRespondedMutation.mutate({ ids: Array.from(selected), responded: false })}
            disabled={bulkMarkRespondedMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-colors"
            style={{ background: "oklch(0.32 0.07 260)", color: "rgba(255,255,255,0.8)" }}
          >
            <Circle size={12} />
            {t('dashboard.bulkActions.markSent')}
          </button>
          <button
            onClick={() => {
              const nonResponded = Array.from(selected).filter(id => {
                const req = allRequests?.find(r => r.id === id);
                return req && !req.respondedAt;
              });
              if (nonResponded.length === 0) {
                toast.info("All selected clients have already responded.");
                return;
              }
              setBulkRestartConfirmOpen(true);
            }}
            disabled={bulkRestartMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition-colors"
            style={{ background: "oklch(0.38 0.10 30)", color: "rgba(255,255,255,0.9)" }}
          >
            {bulkRestartMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Restart
          </button>
          <button
            onClick={() => setSelected(new Set())}
            aria-label={t('dashboard.activityFeed.clearSelectionAriaLabel')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-on-dark-secondary)" }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Bulk Restart Campaign confirmation modal */}
      {bulkRestartConfirmOpen && (() => {
        const nonResponded = Array.from(selected).filter(id => {
          const req = allRequests?.find(r => r.id === id);
          return req && !req.respondedAt;
        });
        return (
          <AlertDialog open={bulkRestartConfirmOpen} onOpenChange={setBulkRestartConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restart {nonResponded.length} campaign{nonResponded.length !== 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cancels pending reminders and resends the original email to each selected client who has not yet responded. The campaign clock resets for each.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setBulkRestartConfirmOpen(false);
                    bulkRestartMutation.mutate({ ids: nonResponded });
                  }}
                >
                  Yes, restart {nonResponded.length}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}

      {/* Client detail sheet — opens when tapping a client name */}
      <ClientDetailSheet
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
      />
    </div>
  );
}
