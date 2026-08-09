// RecentActivityCard — lightweight "last 5 interactions" summary card
// Sits above the full activity feed on the dashboard for quick at-a-glance status.

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, CheckCircle2, Circle, Eye, MousePointerClick, Zap, CheckCheck, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, isToday, isYesterday } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useTouchDevice } from "@/hooks/useTouchDevice";

interface Request {
  id: number;
  customerName: string;
  customerEmail?: string | null;
  sentAt?: string | Date | null;
  respondedAt?: number | string | null;
}

interface TrackingEntry {
  opens: number;
  clicks: number;
}

interface RecentActivityCardProps {
  requests: Request[];
  trackingMap: Map<number, TrackingEntry>;
  isLoading: boolean;
  onSelectRequest: (id: number) => void;
  onRefresh?: () => void;
}

function formatRelative(value: string | Date | number | null | undefined): string {
  if (!value) return "";
  const d = new Date(value as string | number | Date);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

// Skeleton row for loading state
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-gray-200 rounded w-28" />
        <div className="h-2.5 bg-gray-100 rounded w-20" />
      </div>
      <div className="h-5 bg-gray-100 rounded-full w-14" />
    </div>
  );
}

export default function RecentActivityCard({
  requests,
  trackingMap,
  isLoading,
  onSelectRequest,
  onRefresh,
}: RecentActivityCardProps) {
  const { t } = useTranslation();
  const isTouch = useTouchDevice();

  // Bulk mark-all state
  const [markingAll, setMarkingAll] = useState(false);
  // Bulk undo state (replaces non-undoable success banner)
  const [bulkUndoIds, setBulkUndoIds] = useState<number[]>([]);
  const [bulkUndoCount, setBulkUndoCount] = useState(0);

  // Single-item mark state
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [undoId, setUndoId] = useState<number | null>(null);

  // Shared undo timer — cleared before each new timer is set
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Helper — start/restart the shared undo timer
  const startUndoTimer = (cb: () => void, ms = 4000) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(cb, ms);
  };

  const utils = trpc.useUtils();

  // Bulk mark mutation
  const bulkMark = trpc.requests.bulkMarkResponded.useMutation({
    onSuccess: (_data, vars) => {
      utils.requests.invalidate();
      onRefresh?.();
      setMarkingAll(false);
      setBulkUndoIds(vars.ids);
      setBulkUndoCount(vars.ids.length);
      startUndoTimer(() => setBulkUndoIds([]));
    },
    onError: () => setMarkingAll(false),
  });

  // Bulk undo mutation — separate instance to avoid shared loading state with bulkMark
  const bulkUndo = trpc.requests.bulkMarkResponded.useMutation({
    onSuccess: () => {
      utils.requests.invalidate();
      onRefresh?.();
      setBulkUndoIds([]);
    },
    onError: () => setBulkUndoIds([]),
  });

  // Single-item mark mutation — separate instance to avoid shared loading state
  const singleMark = trpc.requests.bulkMarkResponded.useMutation({
    onSuccess: (_data, vars) => {
      utils.requests.invalidate();
      onRefresh?.();
      setMarkingId(null);
      setUndoId(vars.ids[0]);
      startUndoTimer(() => setUndoId(null));
    },
    onError: () => setMarkingId(null),
  });

  // Undo mutation for single-item — separate instance
  const undoMark = trpc.requests.bulkMarkResponded.useMutation({
    onSuccess: () => {
      utils.requests.invalidate();
      onRefresh?.();
      setUndoId(null);
    },
    onError: () => setUndoId(null),
  });

  const handleMarkAllReviewed = () => {
    const unreviewedIds = recent
      .filter((r) => !r.respondedAt)
      .map((r) => r.id);
    if (unreviewedIds.length === 0) return;
    setMarkingAll(true);
    bulkMark.mutate({ ids: unreviewedIds, responded: true });
  };

  const handleMarkSingle = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // prevent row click from opening the detail panel
    setMarkingId(id);
    singleMark.mutate({ ids: [id], responded: true });
  };

  const handleUndo = (id: number) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoId(null);
    undoMark.mutate({ ids: [id], responded: false });
  };

  const handleBulkUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const ids = bulkUndoIds;
    setBulkUndoIds([]);
    bulkUndo.mutate({ ids, responded: false });
  };

  // Last 5 requests sorted by sentAt descending
  const recent = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt as string | Date).getTime() : 0;
        const tb = b.sentAt ? new Date(b.sentAt as string | Date).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);
  }, [requests]);

  // Count how many have opens or clicks in last 5
  const engagedCount = useMemo(
    () =>
      recent.filter((r) => {
        const tr = trackingMap.get(r.id);
        return tr && (tr.opens > 0 || tr.clicks > 0);
      }).length,
    [recent, trackingMap]
  );

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: "oklch(0.80 0.18 80)" }} />
          <h3 className="text-sm font-black rr-text-navy">
            {t("dashboard.recentActivity.title", { defaultValue: "Recent Activity" })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && engagedCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "oklch(0.92 0.08 80)", color: "oklch(0.40 0.12 80)" }}
            >
              {t("dashboard.recentActivity.engagedBadge", {
                defaultValue: "{{count}} engaged",
                count: engagedCount,
              })}
            </span>
          )}
          {!isLoading && recent.some((r) => !r.respondedAt) && (
            <button
              onClick={handleMarkAllReviewed}
              disabled={markingAll}
              className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-150 disabled:opacity-50"
              style={{
                background: "oklch(0.88 0.10 80)",
                color: "oklch(0.35 0.12 80)",
              }}
              onMouseEnter={(e) => {
                if (!markingAll)
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.82 0.14 80)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.88 0.10 80)";
              }}
              title={t("dashboard.recentActivity.markAllReviewed", {
                defaultValue: "Mark all as reviewed",
              })}
            >
              <CheckCheck size={11} />
              {markingAll
                ? t("dashboard.recentActivity.markingAll", { defaultValue: "Marking…" })
                : t("dashboard.recentActivity.markAllShort", { defaultValue: "Mark all" })}
            </button>
          )}
          <a
            href="#activity-feed"
            className="text-xs font-bold transition-colors"
            style={{ color: "oklch(0.55 0.12 260)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.80 0.18 80)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.55 0.12 260)")}
          >
            {t("dashboard.recentActivity.viewAll", { defaultValue: "View all →" })}
          </a>
        </div>
      </div>

      {/* Bulk undo toast — 4-second window, replaces the old non-undoable success banner */}
      {bulkUndoIds.length > 0 && (
        <div
          className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg text-xs font-bold animate-toast-in"
          style={{ background: "oklch(0.92 0.10 145)", color: "oklch(0.30 0.12 145)" }}
        >
          <span className="flex items-center gap-1.5">
            <CheckCheck size={13} />
            {t("dashboard.recentActivity.markAllSuccess", {
              defaultValue: "{{count}} items marked as reviewed",
              count: bulkUndoCount,
            })}
          </span>
          <button
            onClick={handleBulkUndo}
            className="text-xs font-black underline underline-offset-2 shrink-0"
            style={{ color: "oklch(0.25 0.10 145)" }}
          >
            {t("common.undo", { defaultValue: "Undo" })}
          </button>
        </div>
      )}

      {/* Single-item undo toast — 4-second window */}
      {undoId !== null && (
        <div
          className="flex items-center justify-between gap-3 mb-3 px-3 py-2 rounded-lg text-xs font-bold animate-toast-in"
          style={{ background: "oklch(0.92 0.10 145)", color: "oklch(0.30 0.12 145)" }}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            {t("dashboard.recentActivity.markReviewed", { defaultValue: "Mark as reviewed" })}
          </span>
          <button
            onClick={() => handleUndo(undoId)}
            className="text-xs font-black underline underline-offset-2 shrink-0"
            style={{ color: "oklch(0.25 0.10 145)" }}
          >
            {t("common.undo", { defaultValue: "Undo" })}
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="flex flex-col divide-y divide-gray-50">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && recent.length === 0 && (
        <div className="flex flex-col items-center py-6 gap-2 text-center">
          <Clock size={28} style={{ color: "oklch(0.80 0.03 260)" }} />
          <p className="text-sm rr-text-navy-muted">
            {t("dashboard.recentActivity.noActivity", {
              defaultValue: "No recent activity yet",
            })}
          </p>
        </div>
      )}

      {/* Activity rows */}
      {!isLoading && recent.length > 0 && (
        <div className="flex flex-col">
          {recent.map((req, idx) => {
            const tracking = trackingMap.get(req.id);
            const hasOpens = (tracking?.opens ?? 0) > 0;
            const hasClicks = (tracking?.clicks ?? 0) > 0;
            const isReviewed = !!req.respondedAt;
            const isMarkingThis = markingId === req.id;

            return (
              <button
                key={req.id}
                onClick={() => onSelectRequest(req.id)}
                className="flex items-center gap-3 py-2.5 text-left rounded-lg px-2 -mx-2 transition-all duration-150 cursor-pointer group"
                style={{
                  borderBottom:
                    idx < recent.length - 1
                      ? "1px solid oklch(0.96 0.005 260)"
                      : "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.975 0.008 260)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 1px 4px oklch(0.22 0.09 260 / 0.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "";
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "oklch(0.96 0.015 260)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.99)";
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                }}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 rr-bg-navy rr-text-gold">
                  {req.customerName[0].toUpperCase()}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold rr-text-navy truncate">
                    {req.customerName}
                  </p>
                  <p className="text-xs rr-text-navy-muted truncate">
                    {req.customerEmail}
                  </p>
                </div>

                {/* Badges + time + single-item mark button */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    {/* Single-item mark-as-reviewed button
                        - Desktop (hover-capable): hidden by default, revealed on row hover via useTouchDevice
                        - Touch devices: always visible */}
                    {!isReviewed && (
                      <button
                        onClick={(e) => handleMarkSingle(e, req.id)}
                        disabled={isMarkingThis}
                        className={[
                          "flex items-center justify-center w-6 h-6 rounded-full",
                          "transition-all duration-150 disabled:opacity-40",
                          isTouch
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100",
                        ].join(" ")}
                        style={{
                          background: "oklch(0.92 0.10 145)",
                          color: "oklch(0.35 0.14 145)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "oklch(0.82 0.16 145)";
                          (e.currentTarget as HTMLButtonElement).style.transform =
                            "scale(1.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "oklch(0.92 0.10 145)";
                          (e.currentTarget as HTMLButtonElement).style.transform = "";
                        }}
                        title={t("dashboard.recentActivity.markReviewed", {
                          defaultValue: "Mark as reviewed",
                        })}
                        aria-label={t("dashboard.recentActivity.markReviewed", {
                          defaultValue: "Mark as reviewed",
                        })}
                      >
                        {isMarkingThis ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check size={12} strokeWidth={3} />
                        )}
                      </button>
                    )}

                    {/* Reviewed / sent status badge */}
                    <span
                      className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={
                        isReviewed
                          ? {
                              background: "oklch(0.88 0.10 80)",
                              color: "oklch(0.35 0.12 80)",
                            }
                          : {
                              background: "oklch(0.96 0.04 145)",
                              color: "oklch(0.45 0.12 145)",
                            }
                      }
                    >
                      {isReviewed ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Circle size={10} />
                      )}
                      {isReviewed
                        ? t("dashboard.activityFeed.statusReviewed", {
                            defaultValue: "Reviewed",
                          })
                        : t("dashboard.activityFeed.statusSent", {
                            defaultValue: "Sent",
                          })}
                    </span>

                    {/* Open badge */}
                    {hasOpens && (
                      <span
                        className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: "oklch(0.93 0.04 260)",
                          color: "oklch(0.40 0.08 260)",
                        }}
                        title={t("dashboard.activityFeed.emailOpenedTooltip", {
                          defaultValue: "Email opened",
                        })}
                      >
                        <Eye size={9} />
                        {tracking!.opens}
                      </span>
                    )}

                    {/* Click badge */}
                    {hasClicks && (
                      <span
                        className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          background: "oklch(0.92 0.08 80)",
                          color: "oklch(0.40 0.12 80)",
                        }}
                        title={t("dashboard.activityFeed.reviewLinkClickedTooltip", {
                          defaultValue: "Review link clicked",
                        })}
                      >
                        <MousePointerClick size={9} />
                        {tracking!.clicks}
                      </span>
                    )}
                  </div>

                  {/* Time */}
                  <p className="text-xs rr-text-navy-faint">
                    {formatRelative(req.sentAt)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
