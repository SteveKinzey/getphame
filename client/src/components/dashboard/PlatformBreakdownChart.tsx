import { useTranslation } from "react-i18next";

export interface PlatformBreakdownItem {
  platform: string;
  platformId?: number | null;
  label?: string | null;
  count: number;
}

interface PlatformBreakdownChartProps {
  platformBreakdown: PlatformBreakdownItem[];
  total: number;
}

const platformColors: Record<string, string> = {
  google: "oklch(0.55 0.20 145)",
  yelp: "oklch(0.55 0.22 30)",
  tripadvisor: "oklch(0.50 0.18 155)",
  bing: "oklch(0.50 0.18 260)",
  facebook: "oklch(0.45 0.18 250)",
  other: "oklch(0.55 0.10 280)",
};

export default function PlatformBreakdownChart({ platformBreakdown, total }: PlatformBreakdownChartProps) {
  const { t } = useTranslation("translation");
  const visibleBreakdown = platformBreakdown.filter((platform) => platform.platform !== "unknown");

  if (visibleBreakdown.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm" aria-labelledby="platform-breakdown-title">
      <h3 id="platform-breakdown-title" className="text-sm font-black mb-3 rr-text-navy">
        {t("homePage.requestsByPlatform")}
      </h3>
      <div className="flex flex-col gap-2">
        {visibleBreakdown.map((platform) => {
          const percentage = Math.round((platform.count / Math.max(total, 1)) * 100);
          const label = platform.label ?? `${platform.platform.charAt(0).toUpperCase()}${platform.platform.slice(1)}`;
          const barColor = platformColors[platform.platform] ?? platformColors.other;

          return (
            <div key={String(platform.platformId ?? platform.platform)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold" style={{ color: "oklch(0.35 0.05 260)" }}>{label}</span>
                <span className="text-xs font-black rr-text-navy">{platform.count} ({percentage}%)</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ background: "oklch(0.94 0.01 260)" }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, background: barColor }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
