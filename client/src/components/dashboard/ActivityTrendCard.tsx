import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  CalendarRange,
  Download,
  Filter,
  ImageDown,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  ACTIVITY_TREND_EXPORT_SERIES,
  buildActivityTrendExportFilename,
  hasActivityTrendData,
  serializeActivityTrendCsv,
  type ActivityTrendExportSeries,
} from "@/lib/activityTrendExport";
import {
  createDefaultActivityTrendRange,
  MAX_ACTIVITY_TREND_CUSTOM_DAYS,
  resolveActivityTrendCustomRange,
  type ActivityTrendCustomQuery,
  type ActivityTrendRangeError,
} from "@/lib/activityTrendRange";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ActivityTrendCardProps {
  total: number;
  velocity: { last7: number; prior7: number; delta: number } | null;
}

type ActivityTrendRangeMode = 30 | 60 | 90 | "custom";

function requireInitialCustomQuery(
  startDate: string,
  endDate: string
): ActivityTrendCustomQuery {
  const resolved = resolveActivityTrendCustomRange(startDate, endDate);
  if (!resolved.query) {
    throw new Error("Unable to initialize the Activity Trend date range.");
  }
  return resolved.query;
}

export default function ActivityTrendCard({
  total,
  velocity,
}: ActivityTrendCardProps) {
  const { t, i18n } = useTranslation("translation");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [selectedExportSeries, setSelectedExportSeries] = useState<
    ActivityTrendExportSeries[]
  >(() => [...ACTIVITY_TREND_EXPORT_SERIES]);
  const [initialCustomDates] = useState(() =>
    createDefaultActivityTrendRange()
  );
  const [rangeMode, setRangeMode] = useState<ActivityTrendRangeMode>(30);
  const [customStartDate, setCustomStartDate] = useState(
    initialCustomDates.startDate
  );
  const [customEndDate, setCustomEndDate] = useState(
    initialCustomDates.endDate
  );
  const [appliedCustomRange, setAppliedCustomRange] =
    useState<ActivityTrendCustomQuery>(() =>
      requireInitialCustomQuery(
        initialCustomDates.startDate,
        initialCustomDates.endDate
      )
    );
  const chartRef = useRef<ChartJS<"line"> | null>(null);
  const today = useMemo(() => createDefaultActivityTrendRange().endDate, []);
  const customRange = useMemo(
    () => resolveActivityTrendCustomRange(customStartDate, customEndDate),
    [customEndDate, customStartDate]
  );
  const queryInput = useMemo(
    () => (rangeMode === "custom" ? appliedCustomRange : { days: rangeMode }),
    [appliedCustomRange, rangeMode]
  );
  const {
    data: dailyTrend,
    isLoading: trendLoading,
    isFetching: trendFetching,
  } = trpc.tracking.dailyTrend.useQuery(queryInput);
  const hasTrendData = hasActivityTrendData(dailyTrend);
  const hasSelectedExportData = hasActivityTrendData(
    dailyTrend,
    selectedExportSeries
  );
  const activeDays =
    rangeMode === "custom" ? (customRange.days ?? 30) : rangeMode;
  const isCustomRangeDirty =
    customStartDate !== appliedCustomRange.startDate ||
    customEndDate !== appliedCustomRange.endDate;
  const labels = {
    sent: t("activityTrend.sent", { defaultValue: "Sent" }),
    opens: t("activityTrend.opens", { defaultValue: "Opens" }),
    clicks: t("activityTrend.clicks", { defaultValue: "Clicks" }),
  };
  const exportSeriesLabels: Record<ActivityTrendExportSeries, string> = {
    sends: t("activityTrend.exportTypeSent", {
      defaultValue: "Sent requests",
    }),
    opens: t("activityTrend.exportTypeOpens", {
      defaultValue: "Email opens",
    }),
    clicks: t("activityTrend.exportTypeClicks", {
      defaultValue: "Review-link clicks",
    }),
  };
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
        month: "short",
        day: "numeric",
      }),
    [i18n.language, i18n.resolvedLanguage]
  );

  const rangeErrorCopy: Record<ActivityTrendRangeError, string> = {
    missing: t("activityTrend.rangeMissing", {
      defaultValue: "Choose both a start and end date.",
    }),
    invalidDate: t("activityTrend.rangeInvalidDate", {
      defaultValue: "Choose valid calendar dates.",
    }),
    invalidOrder: t("activityTrend.rangeInvalidOrder", {
      defaultValue: "The end date must be on or after the start date.",
    }),
    futureEnd: t("activityTrend.rangeFutureEnd", {
      defaultValue: "The end date cannot be in the future.",
    }),
    rangeTooLong: t("activityTrend.rangeTooLong", {
      count: MAX_ACTIVITY_TREND_CUSTOM_DAYS,
      defaultValue: "Choose a range of {{count}} days or fewer.",
    }),
  };

  const downloadUrl = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrl(url, filename);
    URL.revokeObjectURL(url);
  };

  const applyCustomRange = () => {
    if (!customRange.query) return;
    setAppliedCustomRange(customRange.query);
    toast.success(
      t("activityTrend.rangeApplied", {
        start: customRange.query.startDate,
        end: customRange.query.endDate,
        defaultValue: "Activity Trend updated for {{start}} to {{end}}.",
      })
    );
  };

  const toggleExportSeries = (series: ActivityTrendExportSeries) => {
    setSelectedExportSeries(current => {
      if (current.includes(series)) {
        if (current.length === 1) {
          toast.error(
            t("activityTrend.exportSelectAtLeastOne", {
              defaultValue: "Keep at least one automation type selected.",
            })
          );
          return current;
        }
        return current.filter(item => item !== series);
      }

      return ACTIVITY_TREND_EXPORT_SERIES.filter(
        item => item === series || current.includes(item)
      );
    });
  };

  const exportTrend = (format: "csv" | "png") => {
    if (!dailyTrend || !hasSelectedExportData) {
      toast.error(
        t("activityTrend.exportSelectionEmpty", {
          defaultValue:
            "The selected automation types have no activity in this date range.",
        })
      );
      return;
    }
    const filename = buildActivityTrendExportFilename(
      dailyTrend,
      format,
      selectedExportSeries
    );
    if (!filename) return;

    if (format === "csv") {
      downloadBlob(
        new Blob(
          [
            "\uFEFF",
            serializeActivityTrendCsv(dailyTrend, selectedExportSeries),
          ],
          {
            type: "text/csv;charset=utf-8",
          }
        ),
        filename
      );
    } else {
      const chart = chartRef.current;
      if (!chart) {
        toast.error(
          t("activityTrend.exportUnavailable", {
            defaultValue: "No chart activity is available to export yet.",
          })
        );
        return;
      }
      const previousVisibility = chart.data.datasets.map((_, index) =>
        chart.isDatasetVisible(index)
      );

      try {
        ACTIVITY_TREND_EXPORT_SERIES.forEach((series, index) => {
          chart.setDatasetVisibility(
            index,
            selectedExportSeries.includes(series)
          );
        });
        chart.update("none");
        downloadUrl(chart.toBase64Image("image/png", 1), filename);
      } finally {
        previousVisibility.forEach((visible, index) => {
          chart.setDatasetVisibility(index, visible);
        });
        chart.update("none");
      }
    }

    toast.success(
      format === "csv"
        ? t("activityTrend.csvDownloaded", {
            defaultValue: "Activity Trend CSV downloaded.",
          })
        : t("activityTrend.pngDownloaded", {
            defaultValue: "Activity Trend PNG downloaded.",
          })
    );
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-sm font-black rr-text-navy">
          <TrendingUp size={14} className="mr-1.5 mb-0.5 inline" />
          {t("activityTrend.title", { defaultValue: "Activity Trend" })}
        </h3>
        <div className="flex flex-wrap items-center gap-1 sm:justify-end">
          {([30, 60, 90] as const).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setRangeMode(days)}
              aria-pressed={rangeMode === days}
              aria-label={t("activityTrend.rangeAria", {
                days,
                defaultValue: "Show {{days}} day trend",
              })}
              className="min-h-8 rounded-full px-2.5 text-xs font-bold transition-colors active:scale-[0.97]"
              style={{
                background:
                  rangeMode === days
                    ? "oklch(0.22 0.09 260)"
                    : "oklch(0.94 0.01 260)",
                color: rangeMode === days ? "white" : "oklch(0.40 0.06 260)",
              }}
            >
              {t("activityTrend.range", {
                days,
                defaultValue: "{{days}}d",
              })}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRangeMode("custom")}
            aria-pressed={rangeMode === "custom"}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition-colors active:scale-[0.97]"
            style={{
              background:
                rangeMode === "custom"
                  ? "oklch(0.22 0.09 260)"
                  : "oklch(0.94 0.01 260)",
              color: rangeMode === "custom" ? "white" : "oklch(0.40 0.06 260)",
            }}
          >
            <CalendarRange size={12} aria-hidden="true" />
            {t("activityTrend.customRange", { defaultValue: "Custom" })}
          </button>
          <span
            className="mx-0.5 h-4 w-px"
            style={{ background: "oklch(0.86 0.01 260)" }}
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={() => exportTrend("csv")}
            disabled={!hasSelectedExportData || trendLoading || trendFetching}
            aria-label={t("activityTrend.exportCsvAria", {
              defaultValue: "Export filtered activity trend data as CSV",
            })}
            title={t("activityTrend.exportCsvAria", {
              defaultValue: "Export filtered activity trend data as CSV",
            })}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition-colors active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: "oklch(0.94 0.01 260)",
              color: "oklch(0.40 0.06 260)",
            }}
          >
            <Download size={12} aria-hidden="true" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => exportTrend("png")}
            disabled={!hasSelectedExportData || trendLoading || trendFetching}
            aria-label={t("activityTrend.exportPngAria", {
              defaultValue: "Export filtered activity trend chart as PNG",
            })}
            title={t("activityTrend.exportPngAria", {
              defaultValue: "Export filtered activity trend chart as PNG",
            })}
            className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 rr-bg-gold rr-text-navy"
          >
            <ImageDown size={12} aria-hidden="true" />
            PNG
          </button>
        </div>
      </div>

      {rangeMode === "custom" ? (
        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-bold rr-text-navy">
              {t("activityTrend.rangeFrom", { defaultValue: "From" })}
              <input
                type="date"
                value={customStartDate}
                max={today}
                onChange={event => setCustomStartDate(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold rr-text-navy">
              {t("activityTrend.rangeTo", { defaultValue: "To" })}
              <input
                type="date"
                value={customEndDate}
                max={today}
                onChange={event => setCustomEndDate(event.target.value)}
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomRange}
              disabled={
                !customRange.query || !isCustomRangeDirty || trendFetching
              }
              className="min-h-11 rounded-lg px-4 text-sm font-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 rr-bg-navy rr-text-gold"
            >
              {trendFetching
                ? t("activityTrend.applyingRange", {
                    defaultValue: "Applying…",
                  })
                : t("activityTrend.applyRange", {
                    defaultValue: "Apply range",
                  })}
            </button>
          </div>
          {customRange.error ? (
            <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
              {rangeErrorCopy[customRange.error]}
            </p>
          ) : (
            <p className="mt-2 text-xs font-medium rr-text-navy-muted">
              {t("activityTrend.activeRange", {
                start: appliedCustomRange.startDate,
                end: appliedCustomRange.endDate,
                count: customRange.days,
                defaultValue:
                  "Exporting {{start}} through {{end}} ({{count}} days).",
              })}
            </p>
          )}
        </div>
      ) : null}

      {isAdmin ? (
        <fieldset
          className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
          aria-describedby="activity-trend-export-filter-help activity-trend-export-filter-status"
        >
          <legend className="flex items-center gap-1.5 px-1 text-xs font-black rr-text-navy">
            <Filter size={13} aria-hidden="true" />
            {t("activityTrend.exportFilterLabel", {
              defaultValue: "Export automation types",
            })}
          </legend>
          <p
            id="activity-trend-export-filter-help"
            className="mt-1 text-xs rr-text-navy-muted"
          >
            {t("activityTrend.exportFilterHelp", {
              defaultValue:
                "Select which activity series to include. The dashboard chart stays unchanged.",
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACTIVITY_TREND_EXPORT_SERIES.map(series => {
              const checked = selectedExportSeries.includes(series);
              return (
                <label
                  key={series}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-xs font-bold rr-text-navy focus-within:ring-2 focus-within:ring-amber-500"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleExportSeries(series)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  {exportSeriesLabels[series]}
                </label>
              );
            })}
          </div>
          <div
            id="activity-trend-export-filter-status"
            className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold"
            aria-live="polite"
          >
            <span className="rr-text-navy-muted">
              {t("activityTrend.exportSelection", {
                count: selectedExportSeries.length,
                defaultValue: "{{count}} of 3 selected",
              })}
            </span>
            {!trendLoading && !trendFetching && !hasSelectedExportData ? (
              <span className="text-red-700">
                {t("activityTrend.exportSelectionEmpty", {
                  defaultValue:
                    "The selected automation types have no activity in this date range.",
                })}
              </span>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {trendLoading || trendFetching ? (
        <div className="flex justify-center py-8">
          <Loader2
            className="animate-spin rr-text-navy"
            aria-label={t("activityTrend.loading", {
              defaultValue: "Loading activity trend",
            })}
          />
        </div>
      ) : !hasTrendData ? (
        <div className="py-8 text-center">
          <p className="text-sm rr-text-navy-muted">
            {rangeMode === "custom"
              ? t("activityTrend.emptyRange", {
                  start: appliedCustomRange.startDate,
                  end: appliedCustomRange.endDate,
                  defaultValue: "No activity from {{start}} through {{end}}.",
                })
              : t("activityTrend.empty", {
                  days: rangeMode,
                  defaultValue:
                    "No activity in the last {{days}} days. Send your first request to see trends here.",
                })}
          </p>
        </div>
      ) : (
        <div className="h-[220px]">
          <Line
            ref={chartRef}
            data={{
              labels: dailyTrend.map(day =>
                dateFormatter.format(new Date(`${day.date}T00:00:00`))
              ),
              datasets: [
                {
                  label: labels.sent,
                  data: dailyTrend.map(day => day.sends),
                  borderColor: "#1a2a5e",
                  backgroundColor: "rgba(26, 42, 94, 0.08)",
                  fill: true,
                  tension: 0.4,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                },
                {
                  label: labels.opens,
                  data: dailyTrend.map(day => day.opens),
                  borderColor: "#22c55e",
                  backgroundColor: "transparent",
                  fill: false,
                  tension: 0.4,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                },
                {
                  label: labels.clicks,
                  data: dailyTrend.map(day => day.clicks),
                  borderColor: "#d4a017",
                  backgroundColor: "transparent",
                  fill: false,
                  tension: 0.4,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: {
                  position: "top",
                  labels: {
                    boxWidth: 10,
                    padding: 12,
                    font: { size: 11, family: "Poppins" },
                  },
                },
                tooltip: {
                  backgroundColor: "#0f1e4a",
                  titleColor: "#ffffff",
                  bodyColor: "#c8d0e8",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  padding: 10,
                  cornerRadius: 8,
                  titleFont: {
                    size: 12,
                    family: "Poppins",
                    weight: "bold" as const,
                  },
                  bodyFont: { size: 11, family: "Poppins" },
                  callbacks: {
                    title: items => items[0]?.label ?? "",
                    label: item =>
                      `  ${item.dataset.label}: ${item.parsed.y as number}`,
                    afterBody: items => {
                      const data = items as {
                        dataset: { label: string };
                        parsed: { y: number };
                      }[];
                      const sent =
                        data.find(item => item.dataset.label === labels.sent)
                          ?.parsed.y ?? 0;
                      const opens =
                        data.find(item => item.dataset.label === labels.opens)
                          ?.parsed.y ?? 0;
                      const clicks =
                        data.find(item => item.dataset.label === labels.clicks)
                          ?.parsed.y ?? 0;
                      if (sent === 0) return [];
                      return [
                        "",
                        `  ${t("activityTrend.openRate", { defaultValue: "Open rate" })}: ${Math.round((opens / sent) * 100)}%`,
                        `  ${t("activityTrend.clickRate", { defaultValue: "Click rate" })}: ${Math.round((clicks / sent) * 100)}%`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: {
                    font: { size: 10, family: "Poppins" },
                    maxTicksLimit:
                      activeDays <= 30 ? 10 : activeDays <= 90 ? 8 : 12,
                    color: "oklch(0.55 0.05 260)",
                  },
                },
                y: {
                  beginAtZero: true,
                  grid: { color: "oklch(0.95 0.01 260)" },
                  ticks: {
                    font: { size: 10, family: "Poppins" },
                    stepSize: 1,
                    color: "oklch(0.55 0.05 260)",
                  },
                },
              },
            }}
          />
        </div>
      )}

      {velocity && total > 0 ? (
        <div
          className="mt-3 flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid oklch(0.94 0.01 260)" }}
        >
          <div className="flex-1 text-center">
            <p className="text-xs rr-text-navy-muted">
              {t("activityTrend.thisWeek", { defaultValue: "This Week" })}
            </p>
            <p className="text-base font-black rr-text-navy">
              {velocity.last7}
            </p>
          </div>
          <div
            className="h-8 w-px"
            style={{ background: "oklch(0.90 0.01 260)" }}
          />
          <div className="flex-1 text-center">
            <p className="text-xs rr-text-navy-muted">
              {t("activityTrend.priorWeek", {
                defaultValue: "Prior Week",
              })}
            </p>
            <p className="text-base font-black rr-text-navy">
              {velocity.prior7}
            </p>
          </div>
          <div
            className="h-8 w-px"
            style={{ background: "oklch(0.90 0.01 260)" }}
          />
          <div className="flex-1 text-center">
            <p className="text-xs rr-text-navy-muted">
              {t("activityTrend.allTime", { defaultValue: "All Time" })}
            </p>
            <p className="text-base font-black rr-text-navy">{total}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
