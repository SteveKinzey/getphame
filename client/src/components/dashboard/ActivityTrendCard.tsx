import { useMemo, useRef, useState } from "react";
import { TrendingUp, Loader2, Download, ImageDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  buildActivityTrendExportFilename,
  hasActivityTrendData,
  serializeActivityTrendCsv,
} from "@/lib/activityTrendExport";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ActivityTrendCardProps {
  total: number;
  velocity: { last7: number; prior7: number; delta: number } | null;
}

export default function ActivityTrendCard({ total, velocity }: ActivityTrendCardProps) {
  const { t, i18n } = useTranslation("translation");
  const [trendDays, setTrendDays] = useState<30 | 60 | 90>(30);
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const { data: dailyTrend, isLoading: trendLoading } = trpc.tracking.dailyTrend.useQuery({ days: trendDays });
  const hasTrendData = hasActivityTrendData(dailyTrend);
  const labels = {
    sent: t("activityTrend.sent", { defaultValue: "Sent" }),
    opens: t("activityTrend.opens", { defaultValue: "Opens" }),
    clicks: t("activityTrend.clicks", { defaultValue: "Clicks" }),
  };
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { month: "short", day: "numeric" }),
    [i18n.language, i18n.resolvedLanguage],
  );

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrl(url, filename);
    URL.revokeObjectURL(url);
  };

  const downloadUrl = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const exportTrend = (format: "csv" | "png") => {
    if (!dailyTrend || !hasTrendData) {
      toast.error(t("activityTrend.exportUnavailable", { defaultValue: "No chart activity is available to export yet." }));
      return;
    }
    const filename = buildActivityTrendExportFilename(dailyTrend, format);
    if (!filename) return;

    if (format === "csv") {
      downloadBlob(
        new Blob(["\uFEFF", serializeActivityTrendCsv(dailyTrend)], { type: "text/csv;charset=utf-8" }),
        filename,
      );
    } else {
      const chart = chartRef.current;
      if (!chart) {
        toast.error(t("activityTrend.exportUnavailable", { defaultValue: "No chart activity is available to export yet." }));
        return;
      }
      downloadUrl(chart.toBase64Image("image/png", 1), filename);
    }

    toast.success(
      format === "csv"
        ? t("activityTrend.csvDownloaded", { defaultValue: "Activity Trend CSV downloaded." })
        : t("activityTrend.pngDownloaded", { defaultValue: "Activity Trend PNG downloaded." }),
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-black rr-text-navy">
          <TrendingUp size={14} className="inline mr-1.5 mb-0.5" />
          {t("activityTrend.title", { defaultValue: "Activity Trend" })}
        </h3>
        <div className="flex flex-wrap items-center justify-end gap-1">
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTrendDays(days)}
              aria-label={t("activityTrend.rangeAria", { days, defaultValue: "Show {{days}} day trend" })}
              className="text-xs px-2 py-0.5 rounded-full font-bold transition-colors"
              style={{
                background: trendDays === days ? "oklch(0.22 0.09 260)" : "oklch(0.94 0.01 260)",
                color: trendDays === days ? "white" : "oklch(0.40 0.06 260)",
              }}
            >
              {t("activityTrend.range", { days, defaultValue: "{{days}}d" })}
            </button>
          ))}
          <span className="mx-0.5 h-4 w-px" style={{ background: "oklch(0.86 0.01 260)" }} aria-hidden="true" />
          <button
            type="button"
            onClick={() => exportTrend("csv")}
            disabled={!hasTrendData || trendLoading}
            aria-label={t("activityTrend.exportCsvAria", { defaultValue: "Export activity trend data as CSV" })}
            title={t("activityTrend.exportCsvAria", { defaultValue: "Export activity trend data as CSV" })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "oklch(0.94 0.01 260)", color: "oklch(0.40 0.06 260)" }}
          >
            <Download size={12} aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportTrend("png")}
            disabled={!hasTrendData || trendLoading}
            aria-label={t("activityTrend.exportPngAria", { defaultValue: "Export activity trend chart as PNG" })}
            title={t("activityTrend.exportPngAria", { defaultValue: "Export activity trend chart as PNG" })}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 rr-bg-gold rr-text-navy"
          >
            <ImageDown size={12} aria-hidden="true" />
            PNG
          </button>
        </div>
      </div>

      {trendLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin rr-text-navy" aria-label={t("activityTrend.loading", { defaultValue: "Loading activity trend" })} />
        </div>
      ) : !hasTrendData ? (
        <div className="text-center py-8">
          <p className="text-sm rr-text-navy-muted">{t("activityTrend.empty", { days: trendDays, defaultValue: "No activity in the last {{days}} days. Send your first request to see trends here." })}</p>
        </div>
      ) : (
        <div style={{ height: "200px" }}>
          <Line
            ref={chartRef}
            data={{
              labels: dailyTrend.map((day) => dateFormatter.format(new Date(day.date + "T00:00:00"))),
              datasets: [
                { label: labels.sent, data: dailyTrend.map((day) => day.sends), borderColor: "#1a2a5e", backgroundColor: "rgba(26, 42, 94, 0.08)", fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
                { label: labels.opens, data: dailyTrend.map((day) => day.opens), borderColor: "#22c55e", backgroundColor: "transparent", fill: false, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
                { label: labels.clicks, data: dailyTrend.map((day) => day.clicks), borderColor: "#d4a017", backgroundColor: "transparent", fill: false, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { position: "top", labels: { boxWidth: 10, padding: 12, font: { size: 11, family: "Poppins" } } },
                tooltip: {
                  backgroundColor: "#0f1e4a",
                  titleColor: "#ffffff",
                  bodyColor: "#c8d0e8",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  padding: 10,
                  cornerRadius: 8,
                  titleFont: { size: 12, family: "Poppins", weight: "bold" as const },
                  bodyFont: { size: 11, family: "Poppins" },
                  callbacks: {
                    title: (items) => items[0]?.label ?? "",
                    label: (item) => `  ${item.dataset.label}: ${item.parsed.y as number}`,
                    afterBody: (items) => {
                      const data = items as { dataset: { label: string }; parsed: { y: number } }[];
                      const sent = data.find((item) => item.dataset.label === labels.sent)?.parsed.y ?? 0;
                      const opens = data.find((item) => item.dataset.label === labels.opens)?.parsed.y ?? 0;
                      const clicks = data.find((item) => item.dataset.label === labels.clicks)?.parsed.y ?? 0;
                      if (sent === 0) return [];
                      return ["", `  ${t("activityTrend.openRate", { defaultValue: "Open rate" })}: ${Math.round((opens / sent) * 100)}%`, `  ${t("activityTrend.clickRate", { defaultValue: "Click rate" })}: ${Math.round((clicks / sent) * 100)}%`];
                    },
                  },
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10, family: "Poppins" }, maxTicksLimit: trendDays === 30 ? 10 : trendDays === 60 ? 8 : 6, color: "oklch(0.55 0.05 260)" } },
                y: { beginAtZero: true, grid: { color: "oklch(0.95 0.01 260)" }, ticks: { font: { size: 10, family: "Poppins" }, stepSize: 1, color: "oklch(0.55 0.05 260)" } },
              },
            }}
          />
        </div>
      )}

      {velocity && total > 0 && (
        <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid oklch(0.94 0.01 260)" }}>
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">{t("activityTrend.thisWeek", { defaultValue: "This Week" })}</p><p className="text-base font-black rr-text-navy">{velocity.last7}</p></div>
          <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">{t("activityTrend.priorWeek", { defaultValue: "Prior Week" })}</p><p className="text-base font-black rr-text-navy">{velocity.prior7}</p></div>
          <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">{t("activityTrend.allTime", { defaultValue: "All Time" })}</p><p className="text-base font-black rr-text-navy">{total}</p></div>
        </div>
      )}
    </div>
  );
}
