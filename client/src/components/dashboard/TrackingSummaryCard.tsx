import { Eye, MousePointerClick, Send, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function TrackingSummaryCard() {
  const { t } = useTranslation("translation");
  const { isAuthenticated } = useAuth();
  const { data: overallStats, isLoading } = trpc.tracking.overallStats.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

  if (isLoading || !overallStats || overallStats.totalSent === 0) return null;

  const { totalSent, uniqueOpens, uniqueClicks, openRate, clickRate } =
    overallStats;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={16} className="rr-text-navy" />
        <h3 className="text-sm font-black rr-text-navy">
          {t("trackingSummaryCard.title")}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl py-3 px-2 rr-bg-white-card">
          <Send
            size={14}
            style={{ color: "oklch(0.50 0.10 260)", marginBottom: 4 }}
          />
          <span className="text-xl font-black rr-text-navy">{totalSent}</span>
          <span className="text-sm font-semibold rr-text-navy-mid">
            {t("trackingSummaryCard.sent")}
          </span>
        </div>
        <div
          className="flex flex-col items-center rounded-xl py-3 px-2"
          style={{ background: "oklch(0.95 0.05 220)" }}
        >
          <Eye
            size={14}
            style={{ color: "oklch(0.45 0.15 220)", marginBottom: 4 }}
          />
          <span className="text-xl font-black rr-text-navy">{openRate}%</span>
          <span className="text-xs" style={{ color: "oklch(0.50 0.08 220)" }}>
            {t("trackingSummaryCard.openRate")}
          </span>
        </div>
        <div
          className="flex flex-col items-center rounded-xl py-3 px-2"
          style={{ background: "oklch(0.96 0.06 80)" }}
        >
          <MousePointerClick
            size={14}
            style={{ color: "oklch(0.55 0.18 80)", marginBottom: 4 }}
          />
          <span className="text-xl font-black rr-text-navy">{clickRate}%</span>
          <span className="text-xs" style={{ color: "oklch(0.55 0.12 80)" }}>
            {t("trackingSummaryCard.clickRate")}
          </span>
        </div>
      </div>
      <p className="text-xs mt-2.5 text-center rr-text-navy-faint">
        {t("trackingSummaryCard.summary", {
          uniqueOpens,
          uniqueClicks,
          totalSent,
        })}
      </p>
    </div>
  );
}
