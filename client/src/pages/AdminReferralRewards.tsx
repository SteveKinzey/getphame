// Phame — Admin: Deferred Referral Rewards
// Lists referrals where convertedAt is set but rewardedAt is null.
// Admin can process individual rewards or bulk-process all eligible ones.
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Gift,
  Loader2,
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Zap,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TIER_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  pro: { label: "Pro", bg: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" },
  annual: { label: "Annual", bg: "oklch(0.72 0.16 150)", color: "white" },
  free: { label: "Free", bg: "oklch(0.91 0.02 260)", color: "oklch(0.40 0.06 260)" },
  unknown: { label: "?", bg: "oklch(0.91 0.02 260)", color: "oklch(0.40 0.06 260)" },
};

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_BADGE[tier] ?? TIER_BADGE.unknown;
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
}

export default function AdminReferralRewardsPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const { data: rows, isLoading } = trpc.adminReferrals.listDeferred.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const processOne = trpc.adminReferrals.processOne.useMutation({
    onSuccess: (res) => {
      toast.success(`Reward applied for referral #${res.referralId}`);
      utils.adminReferrals.listDeferred.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to apply reward."),
  });

  const processAll = trpc.adminReferrals.processAll.useMutation({
    onSuccess: ({ processed, skipped }) => {
      toast.success(`Done — ${processed} rewarded, ${skipped} skipped (not on paid plan).`);
      utils.adminReferrals.listDeferred.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to process rewards."),
  });

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.975 0.003 100)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const eligibleCount = rows?.filter(r => r.isNowEligible).length ?? 0;
  const ineligibleCount = (rows?.length ?? 0) - eligibleCount;

  return (
    <div className="min-h-screen pb-24" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1 text-xs mb-4"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ChevronLeft size={14} />
          Admin Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "oklch(0.80 0.18 80)" }}
            >
              <Gift size={20} style={{ color: "oklch(0.22 0.09 260)" }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Deferred Referral Rewards</h1>
              <p className="text-xs" style={{ color: "oklch(0.70 0.05 260)" }}>
                Referrers who converted a paid user but were on free tier at the time
              </p>
            </div>
          </div>
          <button
            onClick={() => utils.adminReferrals.listDeferred.invalidate()}
            className="p-2 rounded-xl"
            style={{ background: "oklch(0.28 0.09 260)" }}
          >
            <RefreshCw size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: Users, label: "Total Deferred", value: rows?.length ?? 0, color: "oklch(0.80 0.18 80)" },
            { icon: CheckCircle2, label: "Now Eligible", value: eligibleCount, color: "oklch(0.72 0.16 150)" },
            { icon: Clock, label: "Still Ineligible", value: ineligibleCount, color: "oklch(0.65 0.08 260)" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: "oklch(0.28 0.09 260)" }}
            >
              <Icon size={14} className="mx-auto mb-1" style={{ color }} />
              <p className="text-base font-black text-white">{value}</p>
              <p className="text-xs" style={{ color: "oklch(0.70 0.05 260)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* Bulk action */}
        {eligibleCount > 0 && (
          <button
            onClick={() => processAll.mutate()}
            disabled={processAll.isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm"
            style={{
              background: processAll.isPending ? "oklch(0.75 0.12 80)" : "oklch(0.80 0.18 80)",
              color: "oklch(0.22 0.09 260)",
            }}
          >
            {processAll.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {processAll.isPending
              ? "Processing..."
              : `Process All ${eligibleCount} Eligible Reward${eligibleCount !== 1 ? "s" : ""}`}
          </button>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin" style={{ color: "oklch(0.22 0.09 260)" }} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && rows?.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "white", border: "1px solid oklch(0.91 0.02 260)" }}
          >
            <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "oklch(0.72 0.16 150)" }} />
            <p className="font-black rr-text-navy text-sm">All caught up!</p>
            <p className="text-xs rr-text-navy-muted mt-1">No deferred rewards pending.</p>
          </div>
        )}

        {/* Rows */}
        {!isLoading && rows && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
                style={{ border: `1.5px solid ${row.isNowEligible ? "oklch(0.72 0.16 150)" : "oklch(0.91 0.02 260)"}` }}
              >
                {/* Eligibility banner */}
                {row.isNowEligible ? (
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold mb-3 px-2 py-1 rounded-lg w-fit"
                    style={{ background: "oklch(0.93 0.06 150)", color: "oklch(0.40 0.14 150)" }}
                  >
                    <CheckCircle2 size={12} />
                    Eligible — referrer is now on paid plan
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold mb-3 px-2 py-1 rounded-lg w-fit"
                    style={{ background: "oklch(0.94 0.02 260)", color: "oklch(0.50 0.06 260)" }}
                  >
                    <AlertCircle size={12} />
                    Ineligible — referrer still on {row.referrerTier} plan
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Referrer */}
                  <div>
                    <p className="text-xs rr-text-navy-muted mb-0.5">Referrer</p>
                    <p className="text-sm font-bold rr-text-navy truncate">{row.referrerName}</p>
                    {row.referrerEmail && (
                      <p className="text-xs rr-text-navy-muted truncate">{row.referrerEmail}</p>
                    )}
                    <div className="mt-1 flex items-center gap-1.5">
                      <TierBadge tier={row.referrerTier} />
                      {row.referrerPlanExpiresAt && (
                        <span className="text-xs rr-text-navy-muted">
                          exp {format(new Date(row.referrerPlanExpiresAt), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Referred */}
                  <div>
                    <p className="text-xs rr-text-navy-muted mb-0.5">Referred User</p>
                    <p className="text-sm font-bold rr-text-navy truncate">{row.referredName}</p>
                    <p className="text-xs rr-text-navy-muted mt-1">
                      Converted {row.convertedAt ? format(new Date(row.convertedAt), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => processOne.mutate({ referralId: row.id })}
                  disabled={!row.isNowEligible || processOne.isPending}
                  className="w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                  style={{
                    background: row.isNowEligible
                      ? "oklch(0.22 0.09 260)"
                      : "oklch(0.91 0.02 260)",
                    color: row.isNowEligible
                      ? "oklch(0.80 0.18 80)"
                      : "oklch(0.60 0.04 260)",
                    cursor: row.isNowEligible ? "pointer" : "not-allowed",
                  }}
                >
                  {processOne.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Gift size={12} />
                  )}
                  {row.isNowEligible ? "Apply +1 Month Reward" : "Cannot reward — not on paid plan"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <div
          className="rounded-xl p-3 flex gap-2"
          style={{ background: "oklch(0.94 0.02 260)" }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: "oklch(0.50 0.06 260)" }} />
          <p className="text-xs" style={{ color: "oklch(0.45 0.06 260)" }}>
            Rewards extend the referrer's <strong>planExpiresAt</strong> by 30 days from their current expiry.
            Lifetime subscribers are automatically excluded. Processing is idempotent — already-rewarded rows
            are filtered out before this page loads.
          </p>
        </div>
      </div>
    </div>
  );
}
