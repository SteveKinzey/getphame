// AdminChurn — churn survey analytics for admin
// Route: /admin/churn
// Shows reason breakdown bar chart + last 10 free-text responses

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2, ArrowLeft, Frown, ShieldAlert } from "lucide-react";
import { Rocket } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  too_expensive:    "Too expensive",
  not_using:        "Not using it enough",
  switching_tools:  "Switching to another tool",
  missing_feature:  "Missing a feature",
  other:            "Something else",
};

const REASON_COLORS: Record<string, string> = {
  too_expensive:    "oklch(0.65 0.18 25)",
  not_using:        "oklch(0.65 0.12 260)",
  switching_tools:  "oklch(0.65 0.18 200)",
  missing_feature:  "oklch(0.65 0.18 80)",
  other:            "oklch(0.65 0.06 260)",
};

export default function AdminChurnPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.admin.churnSurveys.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  if (!user) return null;

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

  const maxCount = data
    ? Math.max(1, ...Object.values(data.counts as Record<string, number>))
    : 1;

  return (
    <div className="min-h-screen pb-32" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 mb-4 text-xs font-bold"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ArrowLeft size={14} /> Back to Admin
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
          Churn Surveys
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          Why users cancel
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
            Failed to load churn data: {error.message}
          </div>
        )}

        {data && (
          <>
            {/* Total count */}
            <div
              className="rounded-2xl px-4 py-4 flex items-center gap-3"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.95 0.02 260)" }}
              >
                <Frown size={20} style={{ color: "oklch(0.55 0.04 260)" }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
                  {data.total}
                </p>
                <p className="text-xs" style={{ color: "oklch(0.55 0.04 260)" }}>Total cancellation surveys submitted</p>
              </div>
            </div>

            {/* Reason breakdown bar chart */}
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-4 uppercase tracking-widest"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Cancellation Reasons
              </h3>
              {data.total === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "oklch(0.65 0.03 260)" }}>
                  No survey responses yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {Object.entries(REASON_LABELS).map(([key, label]) => {
                    const count = (data.counts as Record<string, number>)[key] ?? 0;
                    const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold" style={{ color: "oklch(0.30 0.06 260)" }}>
                            {label}
                          </span>
                          <span className="text-xs font-black" style={{ color: REASON_COLORS[key] }}>
                            {count} <span className="font-normal" style={{ color: "oklch(0.65 0.03 260)" }}>({pct}%)</span>
                          </span>
                        </div>
                        <div
                          className="w-full rounded-full overflow-hidden"
                          style={{ height: "8px", background: "oklch(0.94 0.01 260)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              background: REASON_COLORS[key],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Last 10 free-text responses */}
            <div
              className="rounded-2xl px-4 py-4"
              style={{ background: "white", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
            >
              <h3
                className="text-sm font-black mb-3 uppercase tracking-widest"
                style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}
              >
                Recent Responses
              </h3>
              {data.recent.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "oklch(0.65 0.03 260)" }}>
                  No responses yet.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(data.recent as Array<{ id: number; reason: string; comment: string | null; email: string | null; createdAt: Date }>).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl px-3 py-3"
                      style={{ background: "oklch(0.975 0.003 100)", border: "1px solid oklch(0.93 0.01 260)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{
                            background: `${REASON_COLORS[r.reason]}22`,
                            color: REASON_COLORS[r.reason],
                          }}
                        >
                          {REASON_LABELS[r.reason] ?? r.reason}
                        </span>
                        <span className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment ? (
                        <p className="text-sm mt-1.5" style={{ color: "oklch(0.35 0.05 260)" }}>
                          "{r.comment}"
                        </p>
                      ) : (
                        <p className="text-xs italic mt-1" style={{ color: "oklch(0.65 0.03 260)" }}>
                          No comment provided.
                        </p>
                      )}
                      {r.email && (
                        <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 260)" }}>
                          {r.email}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
