import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  HeartPulse,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Webhook,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SourceProvider = "zapier" | "make" | "jotform" | "custom";
type AnalyticsDays = 7 | 30 | 90;

const INTERVALS = [
  { minutes: 15, fallback: "Every 15 minutes" },
  { minutes: 60, fallback: "Hourly" },
  { minutes: 360, fallback: "Every 6 hours" },
  { minutes: 1_440, fallback: "Daily" },
  { minutes: 10_080, fallback: "Weekly" },
] as const;

const PROVIDER_DEFAULTS: Record<
  SourceProvider,
  { label: string; sourceApp: string }
> = {
  zapier: { label: "Zapier customer import", sourceApp: "zapier" },
  make: { label: "Make customer import", sourceApp: "make" },
  jotform: {
    label: "Jotform secure bridge import",
    sourceApp: "jotform",
  },
  custom: { label: "Custom customer import", sourceApp: "custom-source" },
};

const PROVIDER_STEPS: Record<SourceProvider, string[]> = {
  zapier: [
    "Choose the app and event that produces an eligible customer record.",
    "Add Webhooks by Zapier and select Custom Request.",
    "Set Method to POST and paste the Get Phame endpoint.",
    "Add the protected headers exactly as shown below.",
    "Map the JSON fields, using one stable provider ID for externalId and Idempotency-Key.",
    "Test the action with one permitted record, then refresh health here.",
  ],
  make: [
    "Choose the trigger module that produces an eligible customer record.",
    "Add HTTP and select Make a request.",
    "Set Method to POST, Body type to Raw, and Content type to application/json.",
    "Add the protected headers exactly as shown below.",
    "Map the JSON fields, using one stable bundle ID for externalId and Idempotency-Key.",
    "Run the scenario once with one permitted record, then refresh health here.",
  ],
  jotform: [
    "Add Jotform Webhooks and send form submissions to a server-side bridge you control.",
    "Do not place a Get Phame API key in Jotform, a public URL, or a browser script.",
    "Validate the expected form and affirmative consent in the bridge, then parse rawRequest.",
    "Forward the normalized JSON to Get Phame with the protected headers shown below.",
    "Reuse Jotform submissionID for externalId and Idempotency-Key on every retry.",
    "Submit one permitted record, then refresh health here.",
  ],
  custom: [
    "Use a trusted server-side workflow that supports POST and protected headers.",
    "Store the API key in the workflow secret store, never in browser code or a URL.",
    "Send JSON to the Get Phame endpoint with the headers shown below.",
    "Use one immutable source record ID for externalId and Idempotency-Key.",
    "Send one permitted record, then refresh health here.",
  ],
};

function healthClasses(status: string) {
  if (status === "healthy") return "bg-emerald-50 text-emerald-800";
  if (status === "setup") return "bg-sky-50 text-sky-800";
  if (status === "delayed") return "bg-amber-50 text-amber-900";
  if (status === "failing") return "bg-rose-50 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function formatDate(
  value: number | Date | string | null | undefined,
  language: string,
  fallback: string
) {
  if (value == null) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function SourceOperationsPanel() {
  const { t, i18n } = useTranslation();
  const utils = trpc.useUtils();
  const [provider, setProvider] = useState<SourceProvider>("zapier");
  const [label, setLabel] = useState(() =>
    t("developerIntegrations.sourceOps.labels.zapier", {
      defaultValue: PROVIDER_DEFAULTS.zapier.label,
    })
  );
  const [apiKeyId, setApiKeyId] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState("1440");
  const [analyticsDays, setAnalyticsDays] = useState<AnalyticsDays>(30);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [pendingArchiveId, setPendingArchiveId] = useState<number | null>(null);

  const analyticsInput = useMemo(
    () => ({ days: analyticsDays }),
    [analyticsDays]
  );
  const historyInput = useMemo(() => ({ limit: 100 }), []);
  const manifestQuery = trpc.sources.setupManifest.useQuery();
  const sourcesQuery = trpc.sources.list.useQuery();
  const analyticsQuery = trpc.sources.analytics.useQuery(analyticsInput);
  const historyQuery = trpc.sources.healthHistory.useQuery(historyInput);

  const invalidateSources = async () => {
    await Promise.all([
      utils.sources.list.invalidate(),
      utils.sources.analytics.invalidate(),
      utils.sources.healthHistory.invalidate(),
      utils.sources.setupManifest.invalidate(),
    ]);
  };

  const createSource = trpc.sources.create.useMutation({
    onSuccess: async source => {
      setSelectedSourceId(source.id);
      await invalidateSources();
      toast.success(
        t("developerIntegrations.sourceOps.created", {
          defaultValue:
            "Source connection created. Add its source ID to your automation before testing.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });
  const updateSource = trpc.sources.update.useMutation({
    onSuccess: async () => {
      await invalidateSources();
      toast.success(
        t("developerIntegrations.sourceOps.updated", {
          defaultValue: "Source settings updated.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });
  const archiveSource = trpc.sources.archive.useMutation({
    onSuccess: async () => {
      setPendingArchiveId(null);
      setSelectedSourceId(null);
      await invalidateSources();
      toast.success(
        t("developerIntegrations.sourceOps.archived", {
          defaultValue:
            "Source connection archived. Its source ID can no longer authorize imports.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });
  const refreshHealth = trpc.sources.refreshHealth.useMutation({
    onSuccess: async () => {
      await invalidateSources();
      toast.success(
        t("developerIntegrations.sourceOps.healthRefreshed", {
          defaultValue: "Source health refreshed from recent import activity.",
        })
      );
    },
    onError: error => toast.error(error.message),
  });

  const sources = sourcesQuery.data ?? [];
  const selectedSource =
    sources.find(source => source.id === selectedSourceId) ??
    sources[0] ??
    null;
  const analyticsById = useMemo(
    () => new Map((analyticsQuery.data ?? []).map(row => [row.sourceId, row])),
    [analyticsQuery.data]
  );
  const selectedHistory = useMemo(
    () =>
      (historyQuery.data ?? [])
        .filter(row => row.sourceConnectionId === selectedSource?.id)
        .slice(0, 8),
    [historyQuery.data, selectedSource?.id]
  );
  const selectedProviderRecipe =
    selectedSource?.provider === "zapier" ||
    selectedSource?.provider === "make" ||
    selectedSource?.provider === "jotform"
      ? manifestQuery.data?.providerRecipes[selectedSource.provider]
      : undefined;
  const totals = useMemo(
    () =>
      (analyticsQuery.data ?? []).reduce(
        (sum, row) => ({
          attempts: sum.attempts + row.attempts,
          successfulImports: sum.successfulImports + row.successfulImports,
          contactsCreated: sum.contactsCreated + row.contactsCreated,
          contactsDeduplicated:
            sum.contactsDeduplicated + row.contactsDeduplicated,
          failures: sum.failures + row.failures,
        }),
        {
          attempts: 0,
          successfulImports: 0,
          contactsCreated: 0,
          contactsDeduplicated: 0,
          failures: 0,
        }
      ),
    [analyticsQuery.data]
  );

  const activeKeys = manifestQuery.data?.apiKeys ?? [];
  const effectiveApiKeyId = apiKeyId || String(activeKeys[0]?.id ?? "");
  const endpoint = `${typeof window === "undefined" ? "https://getphame.app" : window.location.origin}${manifestQuery.data?.endpointPath ?? "/api/v1/contacts"}`;

  const setProviderWithLabel = (nextProvider: SourceProvider) => {
    const previousDefault = PROVIDER_DEFAULTS[provider].label;
    setProvider(nextProvider);
    const localizedPreviousDefault = t(
      `developerIntegrations.sourceOps.labels.${provider}`,
      { defaultValue: previousDefault }
    );
    if (
      !label.trim() ||
      label === previousDefault ||
      label === localizedPreviousDefault
    ) {
      setLabel(
        t(`developerIntegrations.sourceOps.labels.${nextProvider}`, {
          defaultValue: PROVIDER_DEFAULTS[nextProvider].label,
        })
      );
    }
  };

  const submitSource = (event: React.FormEvent) => {
    event.preventDefault();
    if (!effectiveApiKeyId) {
      document
        .getElementById("create-key-title")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast.error(
        t("developerIntegrations.sourceOps.keyRequired", {
          defaultValue:
            "Create or choose an active contacts:write API key first.",
        })
      );
    }
    createSource.mutate({
      provider,
      label: label.trim(),
      apiKeyId: Number(effectiveApiKeyId),
      expectedIntervalMinutes: Number(intervalMinutes),
      monitoringEnabled: true,
    });
  };

  const copyText = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error(
        t("developerIntegrations.copyFailed", {
          defaultValue:
            "Could not copy automatically. Select and copy the value manually.",
        })
      );
    }
  };

  const recipe = selectedSource
    ? `POST ${endpoint}
Authorization: Bearer <YOUR_GET_PHAME_API_KEY>
Content-Type: application/json
X-Get-Phame-Source: ${selectedSource.publicId}
Idempotency-Key: <stable-provider-event-id>

{
  "name": "<customer name>",
  "email": "<customer email>",
  "phone": "<optional phone>",
  "externalId": "<stable-provider-event-id>",
  "sourceApp": "${PROVIDER_DEFAULTS[selectedSource.provider as SourceProvider]?.sourceApp ?? "custom-source"}",
  "consentConfirmed": true,
  "consentBasis": "customer_relationship",
  "consentSource": "<where permission was captured>"
}`
    : "";

  const number = new Intl.NumberFormat(i18n.language);
  const loading =
    manifestQuery.isLoading ||
    sourcesQuery.isLoading ||
    analyticsQuery.isLoading;

  return (
    <section
      id="source-operations"
      aria-labelledby="source-operations-title"
      className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6"
      data-testid="source-operations"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 rr-text-navy">
            <HeartPulse size={21} aria-hidden="true" />
            <h2 id="source-operations-title" className="rr-h3">
              {t("developerIntegrations.sourceOps.title", {
                defaultValue: "Managed source connections",
              })}
            </h2>
          </div>
          <p className="mt-1 rr-b2 rr-text-navy-muted">
            {t("developerIntegrations.sourceOps.description", {
              defaultValue:
                "Create one observable connection per Zap, Make scenario, or custom workflow. Each source gets its own identifier, analytics, and health signal.",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => manifestQuery.refetch()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 rr-l2 rr-text-navy transition active:scale-[0.97]"
        >
          <RefreshCw size={15} aria-hidden="true" />
          {t("developerIntegrations.sourceOps.refreshKeys", {
            defaultValue: "Refresh API keys",
          })}
        </button>
      </div>

      <form
        onSubmit={submitSource}
        className="mt-6 rounded-2xl bg-slate-50 p-4 sm:p-5"
        aria-labelledby="create-source-title"
      >
        <div className="flex items-center gap-2 rr-text-navy">
          <Plus size={18} aria-hidden="true" />
          <h3 id="create-source-title" className="rr-h5">
            {t("developerIntegrations.sourceOps.createTitle", {
              defaultValue: "Create a connection",
            })}
          </h3>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 rr-l2 rr-text-navy">
            {t("developerIntegrations.sourceOps.provider", {
              defaultValue: "Automation provider",
            })}
            <select
              value={provider}
              onChange={event =>
                setProviderWithLabel(event.target.value as SourceProvider)
              }
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
              name="rr-components-source-operations-panel-provider-259"
            >
              <option value="zapier">Zapier</option>
              <option value="make">Make</option>
              <option value="jotform">Jotform secure bridge</option>
              <option value="custom">
                {t("developerIntegrations.sourceOps.custom", {
                  defaultValue: "Custom webhook",
                })}
              </option>
            </select>
          </label>
          <label className="grid gap-1.5 rr-l2 rr-text-navy">
            {t("developerIntegrations.sourceOps.label", {
              defaultValue: "Connection name",
            })}
            <input
              value={label}
              onChange={event => setLabel(event.target.value)}
              maxLength={100}
              required
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
              name="rr-components-source-operations-panel-label-267"
            />
          </label>
          <label className="grid gap-1.5 rr-l2 rr-text-navy">
            {t("developerIntegrations.sourceOps.apiKey", {
              defaultValue: "Import API key",
            })}
            <select
              value={effectiveApiKeyId}
              onChange={event => setApiKeyId(event.target.value)}
              disabled={activeKeys.length === 0}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              name="rr-components-source-operations-panel-effective-api-key-id-271"
            >
              {activeKeys.length === 0 ? (
                <option value="">
                  {t("developerIntegrations.sourceOps.noKeys", {
                    defaultValue: "No active import key",
                  })}
                </option>
              ) : (
                activeKeys.map(key => (
                  <option key={key.id} value={key.id}>
                    {key.label} · {key.keyHint}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="grid gap-1.5 rr-l2 rr-text-navy">
            {t("developerIntegrations.sourceOps.expected", {
              defaultValue: "Expected activity",
            })}
            <select
              value={intervalMinutes}
              onChange={event => setIntervalMinutes(event.target.value)}
              className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring"
              name="rr-components-source-operations-panel-interval-minutes-277"
            >
              {INTERVALS.map(interval => (
                <option key={interval.minutes} value={interval.minutes}>
                  {t(
                    `developerIntegrations.sourceOps.intervals.${interval.minutes}`,
                    { defaultValue: interval.fallback }
                  )}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-600">
            {t("developerIntegrations.sourceOps.createHelp", {
              defaultValue:
                "The connection stores only an API-key reference and source identifier. Get Phame never displays or duplicates your raw API key.",
            })}
          </p>
          <button
            type="submit"
            disabled={createSource.isPending || !label.trim()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 rr-bg-navy rr-l1 rr-text-gold transition active:scale-[0.97] disabled:opacity-50"
          >
            {createSource.isPending ? (
              <Loader2 size={17} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={17} aria-hidden="true" />
            )}
            {t("developerIntegrations.sourceOps.create", {
              defaultValue: "Create connection",
            })}
          </button>
        </div>
      </form>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="rr-h5 rr-text-navy">
            {t("developerIntegrations.sourceOps.analyticsTitle", {
              defaultValue: "Import flow by source",
            })}
          </h3>
          <p className="mt-1 rr-l2 rr-text-navy-muted">
            {t("developerIntegrations.sourceOps.analyticsDescription", {
              defaultValue:
                "Attempts, outcomes, deduplication, and failures are calculated from attributed import events.",
            })}
          </p>
        </div>
        <div
          className="inline-flex w-fit rounded-xl bg-slate-100 p-1"
          aria-label={t("developerIntegrations.sourceOps.range", {
            defaultValue: "Analytics range",
          })}
        >
          {([7, 30, 90] as AnalyticsDays[]).map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setAnalyticsDays(days)}
              aria-pressed={analyticsDays === days}
              className={`min-h-10 rounded-lg px-3 text-xs font-black transition active:scale-[0.97] ${analyticsDays === days ? "bg-white rr-text-navy shadow-sm" : "text-slate-500"}`}
            >
              {days}
              {t("developerIntegrations.sourceOps.daysShort", {
                defaultValue: "d",
              })}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-busy={loading}
      >
        <div className="rounded-2xl bg-slate-50 p-4">
          <Activity size={18} className="rr-text-navy" aria-hidden="true" />
          <p className="mt-3 rr-stat-number text-2xl">
            {number.format(totals.attempts)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {t("developerIntegrations.sourceOps.metrics.attempts", {
              defaultValue: "Attempts",
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <CheckCircle2 size={18} className="rr-text-navy" aria-hidden="true" />
          <p className="mt-3 rr-stat-number text-2xl">
            {number.format(totals.successfulImports)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {t("developerIntegrations.sourceOps.metrics.successful", {
              defaultValue: "Successful",
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <Plus size={18} className="rr-text-navy" aria-hidden="true" />
          <p className="mt-3 rr-stat-number text-2xl">
            {number.format(totals.contactsCreated)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {t("developerIntegrations.sourceOps.metrics.createdContacts", {
              defaultValue: "Contacts created",
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <Webhook size={18} className="rr-text-navy" aria-hidden="true" />
          <p className="mt-3 rr-stat-number text-2xl">
            {number.format(totals.contactsDeduplicated)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {t("developerIntegrations.sourceOps.metrics.deduplicated", {
              defaultValue: "Deduplicated",
            })}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <AlertTriangle
            size={18}
            className={totals.failures > 0 ? "text-rose-700" : "rr-text-navy"}
            aria-hidden="true"
          />
          <p className="mt-3 rr-stat-number text-2xl">
            {number.format(totals.failures)}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-600">
            {t("developerIntegrations.sourceOps.metrics.failures", {
              defaultValue: "Failures",
            })}
          </p>
        </div>
      </div>

      {sourcesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2
            size={24}
            className="animate-spin rr-text-navy"
            aria-label={t("developerIntegrations.loading", {
              defaultValue: "Loading",
            })}
          />
        </div>
      ) : sources.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-7 text-center">
          <Webhook
            size={24}
            className="mx-auto rr-text-navy"
            aria-hidden="true"
          />
          <p className="mt-3 rr-h5 rr-text-navy">
            {t("developerIntegrations.sourceOps.emptyTitle", {
              defaultValue: "No managed sources yet",
            })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {t("developerIntegrations.sourceOps.emptyDescription", {
              defaultValue:
                "Create one connection for each Zap, Make scenario, or custom workflow you want to observe.",
            })}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {sources.map(source => {
            const analytics = analyticsById.get(source.id);
            return (
              <article
                key={source.id}
                className={`rounded-2xl border p-4 sm:p-5 ${selectedSource?.id === source.id ? "border-[oklch(0.68_0.18_75)] bg-[oklch(0.985_0.015_80)]" : "border-slate-200 bg-white"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="rr-h5 rr-text-navy">{source.label}</h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${healthClasses(source.status)}`}
                      >
                        {t(
                          `developerIntegrations.sourceOps.status.${source.status}`,
                          { defaultValue: source.status }
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {source.provider === "make"
                        ? "Make"
                        : source.provider === "zapier"
                          ? "Zapier"
                          : source.provider === "jotform"
                            ? "Jotform secure bridge"
                            : t("developerIntegrations.sourceOps.custom", {
                                defaultValue: "Custom webhook",
                              })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSourceId(source.id)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black rr-text-navy transition active:scale-[0.97]"
                  >
                    <Settings2 size={14} aria-hidden="true" />
                    {t("developerIntegrations.sourceOps.openSetup", {
                      defaultValue: "Open setup",
                    })}
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-black rr-text-navy">
                      {number.format(analytics?.attempts ?? 0)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {t("developerIntegrations.sourceOps.metrics.attempts", {
                        defaultValue: "Attempts",
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-black text-emerald-700">
                      {analytics?.successRate == null
                        ? "—"
                        : `${number.format(analytics.successRate)}%`}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {t("developerIntegrations.sourceOps.successRate", {
                        defaultValue: "Success rate",
                      })}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p
                      className={`text-lg font-black ${(analytics?.failures ?? 0) > 0 ? "text-rose-700" : "rr-text-navy"}`}
                    >
                      {number.format(analytics?.failures ?? 0)}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500">
                      {t("developerIntegrations.sourceOps.metrics.failures", {
                        defaultValue: "Failures",
                      })}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <dt className="font-black rr-text-navy">
                      {t("developerIntegrations.sourceOps.lastActivity", {
                        defaultValue: "Last activity",
                      })}
                    </dt>
                    <dd className="mt-0.5">
                      {formatDate(
                        source.lastEventAt,
                        i18n.language,
                        t("developerIntegrations.sourceOps.never", {
                          defaultValue: "Never",
                        })
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-black rr-text-navy">
                      {t("developerIntegrations.sourceOps.expected", {
                        defaultValue: "Expected activity",
                      })}
                    </dt>
                    <dd className="mt-0.5">
                      {(() => {
                        const interval = INTERVALS.find(
                          item =>
                            item.minutes === source.expectedIntervalMinutes
                        );
                        return interval
                          ? t(
                              `developerIntegrations.sourceOps.intervals.${interval.minutes}`,
                              { defaultValue: interval.fallback }
                            )
                          : t("developerIntegrations.sourceOps.minutes", {
                              defaultValue: "{{count}} minutes",
                              count: source.expectedIntervalMinutes,
                            });
                      })()}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => refreshHealth.mutate({ id: source.id })}
                    disabled={
                      !source.monitoringEnabled || refreshHealth.isPending
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-50"
                  >
                    <RefreshCw size={14} aria-hidden="true" />
                    {t("developerIntegrations.sourceOps.refreshHealth", {
                      defaultValue: "Refresh health",
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSource.mutate({
                        id: source.id,
                        monitoringEnabled: !source.monitoringEnabled,
                      })
                    }
                    disabled={updateSource.isPending}
                    aria-pressed={source.monitoringEnabled}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-50"
                  >
                    {source.monitoringEnabled ? (
                      <PauseCircle size={14} aria-hidden="true" />
                    ) : (
                      <PlayCircle size={14} aria-hidden="true" />
                    )}
                    {source.monitoringEnabled
                      ? t("developerIntegrations.sourceOps.pause", {
                          defaultValue: "Pause monitoring",
                        })
                      : t("developerIntegrations.sourceOps.resume", {
                          defaultValue: "Resume monitoring",
                        })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingArchiveId(source.id)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-800 transition active:scale-[0.97]"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t("developerIntegrations.sourceOps.archive", {
                      defaultValue: "Archive",
                    })}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedSource && (
        <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section
            className="min-w-0 rounded-2xl rr-bg-navy p-4 text-white sm:p-5"
            aria-labelledby="source-template-title"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 rr-text-gold">
                  <Zap size={18} aria-hidden="true" />
                  <h3 id="source-template-title" className="rr-h5">
                    {selectedSource.provider === "make"
                      ? "Make"
                      : selectedSource.provider === "zapier"
                        ? "Zapier"
                        : selectedSource.provider === "jotform"
                          ? "Jotform secure bridge"
                          : t("developerIntegrations.sourceOps.custom", {
                              defaultValue: "Custom webhook",
                            })}{" "}
                    {t("developerIntegrations.sourceOps.template", {
                      defaultValue: "guided template",
                    })}
                  </h3>
                </div>
                <p className="mt-1 rr-l2 rr-on-dark-muted">
                  {t("developerIntegrations.sourceOps.templateDescription", {
                    defaultValue:
                      "Copy this exact request into the automation’s protected HTTP or webhook action.",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    recipe,
                    t("developerIntegrations.sourceOps.recipeCopied", {
                      defaultValue: "Connection recipe copied.",
                    })
                  )
                }
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-black rr-text-gold transition active:scale-[0.97]"
              >
                <Copy size={14} aria-hidden="true" />
                {t("developerIntegrations.sourceOps.copyRecipe", {
                  defaultValue: "Copy recipe",
                })}
              </button>
            </div>
            <ol className="mt-5 space-y-2">
              {PROVIDER_STEPS[selectedSource.provider as SourceProvider].map(
                (step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 text-xs leading-5 rr-on-dark-secondary"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-black rr-text-gold">
                      {index + 1}
                    </span>
                    <span>
                      {t(
                        `developerIntegrations.sourceOps.steps.${selectedSource.provider}.${index + 1}`,
                        { defaultValue: step }
                      )}
                    </span>
                  </li>
                )
              )}
            </ol>
            <pre className="mt-5 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/20 p-4 font-mono text-xs leading-6 text-slate-100">
              {recipe}
            </pre>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs rr-on-dark-muted">
                {t("developerIntegrations.sourceOps.secretReminder", {
                  defaultValue:
                    "Use the raw API key only inside the provider’s protected secret field. The source ID is safe to copy but works only with its linked key.",
                })}
              </p>
              {selectedProviderRecipe && (
                <a
                  href={selectedProviderRecipe.documentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-black rr-text-gold"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  {t("developerIntegrations.sourceOps.providerDocs", {
                    defaultValue: "Provider docs",
                  })}
                </a>
              )}
            </div>
          </section>

          <section
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
            aria-labelledby="source-health-history-title"
          >
            <div className="flex items-center gap-2 rr-text-navy">
              <Clock3 size={18} aria-hidden="true" />
              <h3 id="source-health-history-title" className="rr-h5">
                {t("developerIntegrations.sourceOps.healthHistory", {
                  defaultValue: "Health history",
                })}
              </h3>
            </div>
            <p className="mt-1 rr-l2 rr-text-navy-muted">
              {selectedSource.label}
            </p>
            {selectedHistory.length === 0 ? (
              <p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-600">
                {t("developerIntegrations.sourceOps.noHealthHistory", {
                  defaultValue:
                    "No health checks yet. Send one permitted import, then refresh health.",
                })}
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {selectedHistory.map(row => {
                  const reasonKey = row.reasonCode.startsWith("error_")
                    ? "recent_import_error"
                    : row.reasonCode;
                  return (
                    <li key={row.id} className="rounded-xl bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ${healthClasses(row.status)}`}
                        >
                          {t(
                            `developerIntegrations.sourceOps.status.${row.status}`,
                            { defaultValue: row.status }
                          )}
                        </span>
                        <time className="text-[11px] font-bold text-slate-500">
                          {formatDate(row.checkedAt, i18n.language, "")}
                        </time>
                      </div>
                      <p className="mt-2 text-xs font-bold rr-text-navy">
                        {t(
                          `developerIntegrations.sourceOps.reasons.${reasonKey}`,
                          { defaultValue: reasonKey.replaceAll("_", " ") }
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {t("developerIntegrations.sourceOps.historyCounts", {
                          defaultValue:
                            "{{attempts}} attempts · {{failures}} failures",
                          attempts: row.attemptsInWindow,
                          failures: row.failuresInWindow,
                        })}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}

      <AlertDialog
        open={pendingArchiveId !== null}
        onOpenChange={open => {
          if (!open) setPendingArchiveId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("developerIntegrations.sourceOps.archiveTitle", {
                defaultValue: "Archive this source connection?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("developerIntegrations.sourceOps.archiveDescription", {
                defaultValue:
                  "Imports using this source ID will be rejected. Existing contacts and privacy-safe analytics remain available in their original records.",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingArchiveId &&
                archiveSource.mutate({ id: pendingArchiveId })
              }
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t("developerIntegrations.sourceOps.archive", {
                defaultValue: "Archive",
              })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
