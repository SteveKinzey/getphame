import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  Loader2,
  Mail,
  Radio,
  RefreshCw,
  Save,
  ServerCog,
  Settings2,
  ShieldAlert,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HealthStatus = "healthy" | "degraded" | "unavailable" | "not_configured";
type HealthHistoryPoint = {
  checkedAt: number;
  status: string;
  latencyMs: number | null;
};
type HealthComponent = {
  status: HealthStatus;
  latencyMs: number | null;
  detail: string;
  reauthRequired?: boolean;
  reauthTarget?: "stripe";
};

function HealthStatusPill({ status }: { status: HealthStatus }) {
  const { t } = useTranslation();
  const configuration = {
    healthy: {
      className: "bg-emerald-100 text-emerald-800",
      Icon: CheckCircle2,
      label: t("integrationHealth.status.healthy", { defaultValue: "Healthy" }),
    },
    degraded: {
      className: "bg-amber-100 text-amber-900",
      Icon: AlertTriangle,
      label: t("integrationHealth.status.degraded", {
        defaultValue: "Needs attention",
      }),
    },
    unavailable: {
      className: "bg-red-100 text-red-800",
      Icon: ShieldAlert,
      label: t("integrationHealth.status.unavailable", {
        defaultValue: "Unavailable",
      }),
    },
    not_configured: {
      className: "bg-slate-100 text-slate-700",
      Icon: Settings2,
      label: t("integrationHealth.status.notConfigured", {
        defaultValue: "Not configured",
      }),
    },
  }[status];
  const Icon = configuration.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${configuration.className}`}
    >
      <Icon size={13} aria-hidden="true" />
      {configuration.label}
    </span>
  );
}

function HealthLatencySparkline({
  title,
  points,
}: {
  title: string;
  points: HealthHistoryPoint[];
}) {
  const { t } = useTranslation();
  const measured = points.filter(
    point => point.latencyMs !== null && Number.isFinite(point.latencyMs)
  );
  if (measured.length < 2) {
    return (
      <p className="mt-3 text-xs font-semibold rr-text-navy-muted">
        {t("integrationHealth.sparkline.empty", {
          defaultValue:
            "24-hour history will appear after scheduled checks run.",
        })}
      </p>
    );
  }
  const maximum = Math.max(...measured.map(point => point.latencyMs ?? 0), 1);
  const width = 220;
  const height = 42;
  const pointsAttribute = measured
    .map((point, index) => {
      const x = (index / (measured.length - 1)) * width;
      const y = height - ((point.latencyMs ?? 0) / maximum) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const hasAttention = points.some(point => point.status !== "healthy");

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between gap-3 text-[11px] font-bold rr-text-navy-muted">
        <span>
          {t("integrationHealth.sparkline.title", {
            defaultValue: "Latency · last 24 hours",
          })}
        </span>
        <span>
          {t("integrationHealth.sparkline.max", {
            defaultValue: "Peak {{value}} ms",
            value: maximum,
          })}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 h-11 w-full overflow-visible"
        role="img"
        aria-label={t("integrationHealth.sparkline.label", {
          defaultValue:
            "{{title}} latency history. Peak {{value}} milliseconds.",
          title,
          value: maximum,
        })}
      >
        <line
          x1="0"
          y1={height - 3}
          x2={width}
          y2={height - 3}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <polyline
          points={pointsAttribute}
          fill="none"
          stroke={hasAttention ? "#d97706" : "#059669"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  component,
  footer,
  history = [],
  onReauthenticate,
}: {
  icon: typeof Database;
  title: string;
  component: HealthComponent;
  footer?: string;
  history?: HealthHistoryPoint[];
  onReauthenticate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      aria-label={`${title}: ${component.status}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl rr-bg-navy text-white">
          <Icon size={21} aria-hidden="true" />
        </span>
        <HealthStatusPill status={component.status} />
      </div>
      <h2 className="mt-4 text-lg font-black rr-text-navy">{title}</h2>
      <p className="mt-1 min-h-10 text-sm font-medium rr-text-navy-muted">
        {component.detail}
      </p>
      <dl className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div>
          <dt className="sr-only">
            {t("integrationHealth.card.latency", { defaultValue: "Latency" })}
          </dt>
          <dd className="inline-flex items-center gap-1 font-bold rr-text-navy-muted">
            <Clock3 size={13} aria-hidden="true" />
            {component.latencyMs === null
              ? t("integrationHealth.card.notMeasured", {
                  defaultValue: "Not measured",
                })
              : t("integrationHealth.card.latencyValue", {
                  defaultValue: "{{value}} ms",
                  value: component.latencyMs,
                })}
          </dd>
        </div>
        {footer && <dd className="font-bold rr-text-navy-muted">{footer}</dd>}
      </dl>
      <HealthLatencySparkline title={title} points={history} />
      {component.reauthRequired && onReauthenticate && (
        <button
          type="button"
          onClick={onReauthenticate}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-950 transition active:scale-[0.97]"
        >
          <KeyRound size={14} aria-hidden="true" />
          {t("integrationHealth.card.reauthenticate", {
            defaultValue: "Re-authenticate securely",
          })}
        </button>
      )}
    </article>
  );
}

function HealthAlertSettingsPanel() {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.integrationHealth.alertSettings.useQuery();
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<"slack" | "discord">("slack");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [latencyThresholdMs, setLatencyThresholdMs] = useState("2500");
  const [alertOnFailure, setAlertOnFailure] = useState(true);
  const [alertOnHighLatency, setAlertOnHighLatency] = useState(true);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    setEnabled(settings.enabled);
    setProvider(settings.provider ?? "slack");
    setLatencyThresholdMs(String(settings.latencyThresholdMs));
    setAlertOnFailure(settings.alertOnFailure);
    setAlertOnHighLatency(settings.alertOnHighLatency);
  }, [settingsQuery.data]);

  const refreshSettings = () =>
    utils.integrationHealth.alertSettings.invalidate();
  const saveSettings = trpc.integrationHealth.saveAlertSettings.useMutation({
    onSuccess: async () => {
      setWebhookUrl("");
      await refreshSettings();
      toast.success(
        t("integrationHealth.alerts.saved", {
          defaultValue: "Health alert settings saved.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });
  const testAlert = trpc.integrationHealth.testAlert.useMutation({
    onSuccess: () =>
      toast.success(
        t("integrationHealth.alerts.testSuccess", {
          defaultValue: "Test alert delivered.",
        })
      ),
    onError: error => toast.error(error.message),
  });
  const deleteSettings = trpc.integrationHealth.deleteAlertSettings.useMutation(
    {
      onSuccess: async () => {
        setEnabled(false);
        setWebhookUrl("");
        await refreshSettings();
        toast.success(
          t("integrationHealth.alerts.removed", {
            defaultValue: "Health alert destination removed.",
          })
        );
      },
      onError: error => toast.error(error.message),
    }
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const threshold = Number(latencyThresholdMs);
    if (!Number.isInteger(threshold) || threshold < 100 || threshold > 60_000) {
      toast.error(
        t("integrationHealth.alerts.invalidThreshold", {
          defaultValue: "Choose a latency threshold between 100 and 60,000 ms.",
        })
      );
      return;
    }
    saveSettings.mutate({
      enabled,
      provider,
      webhookUrl: webhookUrl.trim() || null,
      latencyThresholdMs: threshold,
      alertOnFailure,
      alertOnHighLatency,
    });
  };

  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="integration-health-alerts-title"
      data-testid="integration-health-alert-settings"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 rr-text-navy">
            <Bell size={18} aria-hidden="true" />
            <h2
              id="integration-health-alerts-title"
              className="text-lg font-black"
            >
              {t("integrationHealth.alerts.title", {
                defaultValue: "Operational alert webhooks",
              })}
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm rr-text-navy-muted">
            {t("integrationHealth.alerts.description", {
              defaultValue:
                "Send a bounded operational alert to Slack or Discord when a checked service is unavailable or exceeds your latency threshold. Webhook URLs are encrypted at rest and never shown again.",
            })}
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${settingsQuery.data?.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}
        >
          <BellRing size={13} aria-hidden="true" />
          {settingsQuery.data?.enabled
            ? t("integrationHealth.alerts.active", { defaultValue: "Active" })
            : t("integrationHealth.alerts.inactive", {
                defaultValue: "Not active",
              })}
        </span>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-black rr-text-navy">
            {t("integrationHealth.alerts.provider", {
              defaultValue: "Alert destination",
            })}
            <select
              value={provider}
              onChange={event =>
                setProvider(event.target.value as "slack" | "discord")
              }
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
              name="integration-health-alert-provider"
            >
              <option value="slack">
                {t("integrationHealth.alerts.providerSlack", {
                  defaultValue: "Slack incoming webhook",
                })}
              </option>
              <option value="discord">
                {t("integrationHealth.alerts.providerDiscord", {
                  defaultValue: "Discord incoming webhook",
                })}
              </option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-black rr-text-navy">
            {t("integrationHealth.alerts.latencyThreshold", {
              defaultValue: "High-latency threshold (ms)",
            })}
            <input
              type="number"
              min={100}
              max={60000}
              step={100}
              value={latencyThresholdMs}
              onChange={event => setLatencyThresholdMs(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
              name="integration-health-alert-latency-threshold"
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-black rr-text-navy">
          {t("integrationHealth.alerts.webhookUrl", {
            defaultValue: "Incoming webhook URL",
          })}
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            value={webhookUrl}
            onChange={event => setWebhookUrl(event.target.value)}
            placeholder={
              settingsQuery.data?.configured
                ? t("integrationHealth.alerts.webhookPlaceholderSaved", {
                    defaultValue:
                      "Saved securely — enter a replacement only to change it",
                  })
                : t("integrationHealth.alerts.webhookPlaceholder", {
                    defaultValue: "https://…",
                  })
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
            name="integration-health-alert-webhook-url"
          />
          <span className="text-xs font-medium rr-text-navy-muted">
            {t("integrationHealth.alerts.webhookHelp", {
              defaultValue:
                "Use the official incoming-webhook URL for the selected provider. Do not use browser automation or append credentials.",
            })}
          </span>
        </label>
        <fieldset className="grid gap-2 rounded-xl bg-slate-50 p-3">
          <legend className="px-1 text-xs font-black rr-text-navy">
            {t("integrationHealth.alerts.conditions", {
              defaultValue: "Alert conditions",
            })}
          </legend>
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold rr-text-navy">
            <input
              type="checkbox"
              id="integration-health-alert-enable"
              name="integration-health-alert-enable"
              checked={enabled}
              onChange={event => setEnabled(event.target.checked)}
              className="size-4 accent-[oklch(0.68_0.18_75)]"
            />
            {t("integrationHealth.alerts.enable", {
              defaultValue: "Enable this alert destination",
            })}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold rr-text-navy">
            <input
              type="checkbox"
              id="integration-health-alert-on-failure"
              name="integration-health-alert-on-failure"
              checked={alertOnFailure}
              onChange={event => setAlertOnFailure(event.target.checked)}
              className="size-4 accent-[oklch(0.68_0.18_75)]"
            />
            {t("integrationHealth.alerts.failure", {
              defaultValue: "Service unavailable or credentials rejected",
            })}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-bold rr-text-navy">
            <input
              type="checkbox"
              id="integration-health-alert-on-high-latency"
              name="integration-health-alert-on-high-latency"
              checked={alertOnHighLatency}
              onChange={event => setAlertOnHighLatency(event.target.checked)}
              className="size-4 accent-[oklch(0.68_0.18_75)]"
            />
            {t("integrationHealth.alerts.highLatency", {
              defaultValue: "Measured latency reaches the threshold",
            })}
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saveSettings.isPending || settingsQuery.isLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black rr-text-gold transition active:scale-[0.97] disabled:opacity-50"
          >
            <Save size={15} aria-hidden="true" />
            {saveSettings.isPending
              ? t("integrationHealth.alerts.saving", {
                  defaultValue: "Saving…",
                })
              : t("integrationHealth.alerts.save", {
                  defaultValue: "Save alert settings",
                })}
          </button>
          <button
            type="button"
            disabled={
              testAlert.isPending ||
              !settingsQuery.data?.enabled ||
              saveSettings.isPending
            }
            onClick={() => testAlert.mutate()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-50"
          >
            <BellRing size={15} aria-hidden="true" />
            {testAlert.isPending
              ? t("integrationHealth.alerts.testing", {
                  defaultValue: "Testing…",
                })
              : t("integrationHealth.alerts.test", {
                  defaultValue: "Send test alert",
                })}
          </button>
          {settingsQuery.data?.configured && (
            <button
              type="button"
              disabled={deleteSettings.isPending}
              onClick={() => deleteSettings.mutate()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-800 transition active:scale-[0.97] disabled:opacity-50"
            >
              <Trash2 size={15} aria-hidden="true" />
              {t("integrationHealth.alerts.remove", {
                defaultValue: "Remove destination",
              })}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default function AdminIntegrationHealthPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const snapshot = trpc.integrationHealth.snapshot.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const history = trpc.integrationHealth.history.useQuery(
    { hours: 24 },
    {
      enabled: user?.role === "admin",
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
    }
  );
  const [reauthenticationDialogOpen, setReauthenticationDialogOpen] =
    useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "admin") navigate("/");
  }, [loading, navigate, user?.role]);

  const dateTime = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
        dateStyle: "medium",
        timeStyle: "medium",
      }),
    [i18n.language, i18n.resolvedLanguage]
  );

  if (loading || snapshot.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center rr-bg-cream-warm">
        <Loader2 size={28} className="animate-spin rr-text-navy-muted" />
      </div>
    );
  }
  if (user?.role !== "admin") return null;

  const data = snapshot.data;
  const historyData = history.data;
  const summary = data
    ? data.overallStatus === "healthy"
      ? t("integrationHealth.summary.healthy", {
          defaultValue: "All configured services are responding normally.",
        })
      : data.overallStatus === "degraded"
        ? t("integrationHealth.summary.degraded", {
            defaultValue:
              "At least one configured service needs attention. Review the affected card below.",
          })
        : t("integrationHealth.summary.unavailable", {
            defaultValue:
              "At least one required service is unavailable. Retry after resolving the underlying connection issue.",
          })
    : t("integrationHealth.summary.unavailable", {
        defaultValue:
          "At least one required service is unavailable. Retry after resolving the underlying connection issue.",
      });

  return (
    <div
      className="min-h-screen pb-40 rr-bg-cream-warm"
      data-testid="integration-health-page"
    >
      <header className="px-5 pb-7 pt-14 rr-bg-navy">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold rr-text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("integrationHealth.back", {
            defaultValue: "Back to administration",
          })}
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="rr-text-gold" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] rr-text-gold">
                {t("integrationHealth.eyebrow", {
                  defaultValue: "Live operations",
                })}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              {t("integrationHealth.title", {
                defaultValue: "Integration health",
              })}
            </h1>
            <p className="mt-1 max-w-3xl text-base text-white/85">
              {t("integrationHealth.subtitle", {
                defaultValue:
                  "Bounded, read-only checks for the database and connected delivery services. Refreshes every 15 seconds while this page is open.",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => snapshot.refetch()}
            disabled={snapshot.isFetching}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              className={snapshot.isFetching ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {t("integrationHealth.refresh", { defaultValue: "Refresh now" })}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
        {snapshot.error || !data ? (
          <section
            role="alert"
            className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-900"
          >
            <h2 className="text-lg font-black">
              {t("integrationHealth.loadError.title", {
                defaultValue: "Health data is unavailable",
              })}
            </h2>
            <p className="mt-1 text-sm font-medium">
              {t("integrationHealth.loadError.body", {
                defaultValue:
                  "No status is inferred from missing data. Use Refresh now to retry the bounded checks.",
              })}
            </p>
          </section>
        ) : (
          <>
            <section
              aria-live="polite"
              aria-labelledby="integration-health-summary-title"
              className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              style={{
                borderColor:
                  data.overallStatus === "healthy"
                    ? "oklch(0.76 0.12 145)"
                    : data.overallStatus === "degraded"
                      ? "oklch(0.83 0.10 80)"
                      : "oklch(0.78 0.14 27)",
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
                    data.overallStatus === "healthy"
                      ? "bg-emerald-700"
                      : data.overallStatus === "degraded"
                        ? "bg-amber-700"
                        : "bg-red-700"
                  }`}
                >
                  {data.overallStatus === "healthy" ? (
                    <CheckCircle2 size={22} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={22} aria-hidden="true" />
                  )}
                </span>
                <div>
                  <h2
                    id="integration-health-summary-title"
                    className="text-lg font-black rr-text-navy"
                  >
                    {t("integrationHealth.summary.title", {
                      defaultValue: "Current system status",
                    })}
                  </h2>
                  <p className="mt-0.5 text-sm rr-text-navy-muted">{summary}</p>
                </div>
              </div>
              <div className="text-sm sm:text-right">
                <HealthStatusPill status={data.overallStatus} />
                <p className="mt-1 font-medium rr-text-navy-muted">
                  {t("integrationHealth.summary.checked", {
                    defaultValue: "Checked {{time}} · {{duration}} ms",
                    time: dateTime.format(new Date(data.checkedAt)),
                    duration: data.durationMs,
                  })}
                </p>
              </div>
            </section>

            <section
              aria-label={t("integrationHealth.cards.label", {
                defaultValue: "Integration health checks",
              })}
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <HealthCard
                icon={Database}
                title={t("integrationHealth.cards.database", {
                  defaultValue: "Database connection",
                })}
                component={data.database}
                history={historyData?.database}
              />
              <HealthCard
                icon={Radio}
                title={t("integrationHealth.cards.heartbeat", {
                  defaultValue: "Background heartbeats",
                })}
                component={data.heartbeat}
                history={historyData?.heartbeat}
              />
              <HealthCard
                icon={WalletCards}
                title={t("integrationHealth.cards.stripe", {
                  defaultValue: "Stripe API",
                })}
                component={data.stripe}
                history={historyData?.stripe}
                onReauthenticate={() => setReauthenticationDialogOpen(true)}
              />
              <HealthCard
                icon={Mail}
                title={t("integrationHealth.cards.emailRelay", {
                  defaultValue: "Email relay",
                })}
                component={data.emailRelay}
                history={historyData?.emailRelay}
              />
              <HealthCard
                icon={ServerCog}
                title={t("integrationHealth.cards.sources", {
                  defaultValue: "Inbound sources",
                })}
                component={data.sources}
                history={historyData?.sources}
                footer={t("integrationHealth.cards.sourcesFooter", {
                  defaultValue: "{{healthy}} healthy · {{attention}} attention",
                  healthy: data.sources.healthy,
                  attention: data.sources.delayed + data.sources.failing,
                })}
              />
            </section>
            <HealthAlertSettingsPanel />
          </>
        )}
      </main>
      <Dialog
        open={reauthenticationDialogOpen}
        onOpenChange={setReauthenticationDialogOpen}
      >
        <DialogContent className="rounded-2xl border-slate-200 p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="rr-text-navy">
              {t("integrationHealth.reauth.title", {
                defaultValue: "Stripe authorization needs attention",
              })}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium rr-text-navy-muted">
              {t("integrationHealth.reauth.description", {
                defaultValue:
                  "Get Phame does not expose billing credentials in the browser. Update the managed Stripe payment configuration through the secure payment controls, then run a fresh credential check here.",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            {t("integrationHealth.reauth.notice", {
              defaultValue:
                "No secret, endpoint, customer, or billing record is shown in this dialog.",
            })}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setReauthenticationDialogOpen(false)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold rr-text-navy transition active:scale-[0.97]"
            >
              {t("integrationHealth.reauth.close", { defaultValue: "Close" })}
            </button>
            <button
              type="button"
              onClick={() => {
                setReauthenticationDialogOpen(false);
                navigate("/settings");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold rr-text-navy transition active:scale-[0.97]"
            >
              {t("integrationHealth.reauth.openSettings", {
                defaultValue: "Open payment settings",
              })}
            </button>
            <button
              type="button"
              onClick={async () => {
                await snapshot.refetch();
                setReauthenticationDialogOpen(false);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-sm font-black rr-text-gold transition active:scale-[0.97]"
            >
              <RefreshCw size={15} aria-hidden="true" />
              {t("integrationHealth.reauth.recheck", {
                defaultValue: "Recheck secure connection",
              })}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
