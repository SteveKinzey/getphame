import { useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface ActivityTrendCardProps {
  total: number;
  velocity: { last7: number; prior7: number; delta: number } | null;
}

export default function ActivityTrendCard({ total, velocity }: ActivityTrendCardProps) {
  const [trendDays, setTrendDays] = useState<30 | 60 | 90>(30);
  const { data: dailyTrend, isLoading: trendLoading } = trpc.tracking.dailyTrend.useQuery({ days: trendDays });

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black rr-text-navy">
          <TrendingUp size={14} className="inline mr-1.5 mb-0.5" />
          Activity Trend
        </h3>
        <div className="flex items-center gap-1">
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setTrendDays(days)}
              className="text-xs px-2 py-0.5 rounded-full font-bold transition-colors"
              style={{
                background: trendDays === days ? "oklch(0.22 0.09 260)" : "oklch(0.94 0.01 260)",
                color: trendDays === days ? "white" : "oklch(0.40 0.06 260)",
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {trendLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin rr-text-navy" />
        </div>
      ) : !dailyTrend || dailyTrend.every((day) => day.sends === 0 && day.opens === 0 && day.clicks === 0) ? (
        <div className="text-center py-8">
          <p className="text-sm rr-text-navy-muted">No activity in the last {trendDays} days. Send your first request to see trends here.</p>
        </div>
      ) : (
        <div style={{ height: "200px" }}>
          <Line
            data={{
              labels: dailyTrend.map((day) => format(new Date(day.date + "T00:00:00"), "MMM d")),
              datasets: [
                { label: "Sent", data: dailyTrend.map((day) => day.sends), borderColor: "#1a2a5e", backgroundColor: "rgba(26, 42, 94, 0.08)", fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
                { label: "Opens", data: dailyTrend.map((day) => day.opens), borderColor: "#22c55e", backgroundColor: "transparent", fill: false, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
                { label: "Clicks", data: dailyTrend.map((day) => day.clicks), borderColor: "#d4a017", backgroundColor: "transparent", fill: false, tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2 },
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
                      const sent = data.find((item) => item.dataset.label === "Sent")?.parsed.y ?? 0;
                      const opens = data.find((item) => item.dataset.label === "Opens")?.parsed.y ?? 0;
                      const clicks = data.find((item) => item.dataset.label === "Clicks")?.parsed.y ?? 0;
                      if (sent === 0) return [];
                      return ["", `  Open rate: ${Math.round((opens / sent) * 100)}%`, `  Click rate: ${Math.round((clicks / sent) * 100)}%`];
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
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">This Week</p><p className="text-base font-black rr-text-navy">{velocity.last7}</p></div>
          <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">Prior Week</p><p className="text-base font-black rr-text-navy">{velocity.prior7}</p></div>
          <div className="w-px h-8" style={{ background: "oklch(0.90 0.01 260)" }} />
          <div className="text-center flex-1"><p className="text-xs rr-text-navy-muted">All Time</p><p className="text-base font-black rr-text-navy">{total}</p></div>
        </div>
      )}
    </div>
  );
}
