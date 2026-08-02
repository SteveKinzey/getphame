import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type SourceAutomationSource = {
  id: number;
  publicId: string;
  apiKeyId: number;
  label: string;
  automationEnabled: boolean;
  automationMode: string;
  dryRun: boolean;
  dryRunCompletedAt: number | null;
  sendDelayMinutes: number;
  templateId: number | null;
  platformId: number | null;
  preferredLocale: string;
  pausedAt: number | null;
  lastAutomationAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastErrorCode: string | null;
  failureAlertOpen: boolean;
};

type SourceApiKey = {
  id: number;
  label: string;
  keyHint: string;
  scopes: string[];
};

type SourceAutomationWorkspaceProps = {
  source: SourceAutomationSource;
  apiKeys: SourceApiKey[];
  endpoint: string;
};

const DELAY_OPTIONS = [0, 5, 15, 60, 1_440] as const;
const CHECK_KEYS = ["sourceBinding", "sendScope", "automationMode", "suppression", "delivery", "dryRun"] as const;

function formatDate(value: number | null, language: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function SourceAutomationWorkspace({ source, apiKeys, endpoint }: SourceAutomationWorkspaceProps) {
  const { t, i18n } = useTranslation();
  const utils = trpc.useUtils();
  const [preflightName, setPreflightName] = useState("");
  const [preflightEmail, setPreflightEmail] = useState("");
  const [preflightResult, setPreflightResult] = useState<null | {
    configurationReady: boolean;
    readyForDryRun: boolean;
    readyForLive: boolean;
    checks: Record<(typeof CHECK_KEYS)[number], "ready" | "blocked" | "required">;
    deliveryCode: string | null;
  }>(null);

  const templatesQuery = trpc.templates.list.useQuery();
  const platformsQuery = trpc.reviewPlatforms.list.useQuery();
  const key = useMemo(() => apiKeys.find(candidate => candidate.id === source.apiKeyId) ?? null, [apiKeys, source.apiKeyId]);
  const hasSendScope = Boolean(key?.scopes.includes("review_requests:send"));
  const reviewMode = source.automationMode === "review_request";
  const live = source.automationEnabled && reviewMode && !source.dryRun;
  const safeDryRun = source.automationEnabled && reviewMode && source.dryRun;

  const refreshWorkspace = async () => {
    await Promise.all([
      utils.sources.list.invalidate(),
      utils.sources.setupManifest.invalidate(),
      utils.sources.healthHistory.invalidate(),
    ]);
  };

  const updateSource = trpc.sources.update.useMutation({
    onSuccess: async () => {
      setPreflightResult(null);
      await refreshWorkspace();
      toast.success(t("developerIntegrations.sourceOps.automation.updated", { defaultValue: "Automation safeguards updated." }));
    },
    onError: error => toast.error(error.message),
  });

  const preflight = trpc.sources.preflight.useMutation({
    onSuccess: result => setPreflightResult(result),
    onError: error => {
      setPreflightResult(null);
      toast.error(error.message);
    },
  });

  const update = (changes: Parameters<typeof updateSource.mutate>[0]) => updateSource.mutate(changes);
  const templates = templatesQuery.data ?? [];
  const platforms = platformsQuery.data ?? [];
  const never = t("developerIntegrations.sourceOps.never", { defaultValue: "Never" });

  const preflightSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    preflight.mutate({ id: source.id, customerName: preflightName.trim(), customerEmail: preflightEmail.trim() });
  };

  return (
    <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-labelledby="source-automation-title" data-testid="source-automation-workspace">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 rr-text-navy">
            <ShieldCheck size={19} aria-hidden="true" />
            <h3 id="source-automation-title" className="rr-h5">
              {t("developerIntegrations.sourceOps.automation.title", { defaultValue: "Review-request automation safeguards" })}
            </h3>
          </div>
          <p className="mt-1 rr-l2 rr-text-navy-muted">
            {t("developerIntegrations.sourceOps.automation.description", { defaultValue: "Configure an approved destination and template, validate without importing, complete one safe provider dry run, then choose when to go live." })}
          </p>
        </div>
        <div className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-xs font-black ${live ? "bg-emerald-100 text-emerald-900" : safeDryRun ? "bg-sky-100 text-sky-900" : "bg-slate-200 text-slate-700"}`} role="status">
          {live ? <Send size={14} aria-hidden="true" /> : safeDryRun ? <ShieldCheck size={14} aria-hidden="true" /> : <CircleSlash2 size={14} aria-hidden="true" />}
          {live
            ? t("developerIntegrations.sourceOps.automation.states.live", { defaultValue: "Live delivery" })
            : safeDryRun
              ? t("developerIntegrations.sourceOps.automation.states.dryRun", { defaultValue: "Safe dry run" })
              : t("developerIntegrations.sourceOps.automation.states.paused", { defaultValue: "Paused" })}
        </div>
      </div>

      {!hasSendScope && (
        <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950" role="alert">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black">{t("developerIntegrations.sourceOps.automation.scopeTitle", { defaultValue: "A review-request API key is required" })}</p>
            <p className="mt-1 text-xs leading-5">{t("developerIntegrations.sourceOps.automation.scopeDescription", { defaultValue: "This source is linked to an import-only key. Create a key with contacts:write and review_requests:send scopes, then create a new source connection with that key." })}</p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1.5 rr-l2 rr-text-navy">
          {t("developerIntegrations.sourceOps.automation.mode", { defaultValue: "Workflow mode" })}
          <select
            value={reviewMode ? "review_request" : "import_only"}
            disabled={updateSource.isPending}
            onChange={event => update(event.target.value === "review_request"
              ? { id: source.id, automationMode: "review_request", dryRun: true }
              : { id: source.id, automationMode: "import_only", automationEnabled: false, dryRun: true, pauseReason: "Switched to import-only mode" })}
            className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <option value="import_only">{t("developerIntegrations.sourceOps.automation.modes.importOnly", { defaultValue: "Import only" })}</option>
            <option value="review_request">{t("developerIntegrations.sourceOps.automation.modes.reviewRequest", { defaultValue: "Review request" })}</option>
          </select>
        </label>

        <label className="grid gap-1.5 rr-l2 rr-text-navy">
          {t("developerIntegrations.sourceOps.automation.locale", { defaultValue: "Recipient language" })}
          <select value={source.preferredLocale} disabled={updateSource.isPending} onChange={event => update({ id: source.id, preferredLocale: event.target.value as "en" | "es" | "fr" | "it" | "th" | "zh-CN" | "zh-TW" })} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
            {["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"].map(locale => <option key={locale} value={locale}>{t(`languages.${locale}`, { defaultValue: locale })}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 rr-l2 rr-text-navy">
          {t("developerIntegrations.sourceOps.automation.template", { defaultValue: "Approved template" })}
          <select value={source.templateId ?? ""} disabled={updateSource.isPending || templatesQuery.isLoading} onChange={event => update({ id: source.id, templateId: event.target.value ? Number(event.target.value) : null })} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
            <option value="">{t("developerIntegrations.sourceOps.automation.defaultTemplate", { defaultValue: "Approved default template" })}</option>
            {templates.map(template => <option key={template.id} value={template.id}>{template.name}{template.isDefault ? ` · ${t("developerIntegrations.sourceOps.automation.default", { defaultValue: "default" })}` : ""}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 rr-l2 rr-text-navy">
          {t("developerIntegrations.sourceOps.automation.platform", { defaultValue: "Review destination" })}
          <select value={source.platformId ?? ""} disabled={updateSource.isPending || platformsQuery.isLoading} onChange={event => update({ id: source.id, platformId: event.target.value ? Number(event.target.value) : null })} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
            <option value="">{t("developerIntegrations.sourceOps.automation.defaultPlatform", { defaultValue: "Verified default destination" })}</option>
            {platforms.map(platform => <option key={platform.id} value={platform.id}>{platform.label || platform.platform}{platform.isDefault ? ` · ${t("developerIntegrations.sourceOps.automation.default", { defaultValue: "default" })}` : ""}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 rr-l2 rr-text-navy">
          {t("developerIntegrations.sourceOps.automation.delay", { defaultValue: "Send delay" })}
          <select value={source.sendDelayMinutes} disabled={updateSource.isPending} onChange={event => update({ id: source.id, sendDelayMinutes: Number(event.target.value) })} className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm rr-text-navy focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
            {DELAY_OPTIONS.map(minutes => <option key={minutes} value={minutes}>{minutes === 0 ? t("developerIntegrations.sourceOps.automation.delays.immediate", { defaultValue: "Immediately" }) : minutes === 1_440 ? t("developerIntegrations.sourceOps.automation.delays.day", { defaultValue: "24 hours" }) : t("developerIntegrations.sourceOps.automation.delays.minutes", { defaultValue: "{{count}} minutes", count: minutes })}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2 sm:gap-x-8">
          <p><span className="font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.dryRunCompleted", { defaultValue: "Provider dry run" })}:</span> {formatDate(source.dryRunCompletedAt, i18n.language, t("developerIntegrations.sourceOps.automation.notCompleted", { defaultValue: "Not completed" }))}</p>
          <p><span className="font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.lastSuccess", { defaultValue: "Last successful event" })}:</span> {formatDate(source.lastSuccessAt, i18n.language, never)}</p>
          <p><span className="font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.lastFailure", { defaultValue: "Last failure" })}:</span> {formatDate(source.lastFailureAt, i18n.language, never)}</p>
          <p><span className="font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.failureCode", { defaultValue: "Latest safe error code" })}:</span> {source.lastErrorCode || t("developerIntegrations.sourceOps.automation.none", { defaultValue: "None" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshWorkspace} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black rr-text-navy transition active:scale-[0.97]"><RefreshCw size={14} aria-hidden="true" />{t("developerIntegrations.sourceOps.automation.refresh", { defaultValue: "Refresh setup status" })}</button>
          {source.automationEnabled ? (
            <button type="button" onClick={() => update({ id: source.id, automationEnabled: false, pauseReason: "Paused from source automation controls" })} disabled={updateSource.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-800 transition active:scale-[0.97] disabled:opacity-50"><PauseCircle size={14} aria-hidden="true" />{t("developerIntegrations.sourceOps.automation.pause", { defaultValue: "Pause automated requests" })}</button>
          ) : (
            <button type="button" onClick={() => update({ id: source.id, automationEnabled: true, automationMode: "review_request", dryRun: source.dryRunCompletedAt ? source.dryRun : true })} disabled={updateSource.isPending || !hasSendScope} className="inline-flex min-h-11 items-center gap-2 rounded-xl rr-bg-navy px-3 text-xs font-black rr-text-gold transition active:scale-[0.97] disabled:opacity-50"><PlayCircle size={14} aria-hidden="true" />{t("developerIntegrations.sourceOps.automation.enableDryRun", { defaultValue: "Enable safe dry run" })}</button>
          )}
          {source.automationEnabled && source.dryRunCompletedAt && (
            <button type="button" onClick={() => update({ id: source.id, dryRun: !source.dryRun })} disabled={updateSource.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl rr-bg-gold px-3 text-xs font-black rr-text-navy transition active:scale-[0.97] disabled:opacity-50">
              {source.dryRun ? <Send size={14} aria-hidden="true" /> : <RotateCcw size={14} aria-hidden="true" />}
              {source.dryRun ? t("developerIntegrations.sourceOps.automation.goLive", { defaultValue: "Move to live delivery" }) : t("developerIntegrations.sourceOps.automation.returnDryRun", { defaultValue: "Return to dry run" })}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={preflightSubmit} className="min-w-0" aria-labelledby="source-preflight-title">
          <div className="flex items-center gap-2 rr-text-navy"><CheckCircle2 size={17} aria-hidden="true" /><h4 id="source-preflight-title" className="font-black">{t("developerIntegrations.sourceOps.automation.preflightTitle", { defaultValue: "Read-only preflight" })}</h4></div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("developerIntegrations.sourceOps.automation.preflightDescription", { defaultValue: "Check source binding, suppression, SMTP, quota, destination, and approved template readiness. This test does not import a contact or send email." })}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.testName", { defaultValue: "Permitted test name" })}<input value={preflightName} onChange={event => setPreflightName(event.target.value)} required maxLength={255} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal rr-text-navy focus-visible:ring-2 focus-visible:ring-ring" /></label>
            <label className="grid gap-1.5 text-xs font-black rr-text-navy">{t("developerIntegrations.sourceOps.automation.testEmail", { defaultValue: "Permitted test email" })}<input type="email" value={preflightEmail} onChange={event => setPreflightEmail(event.target.value)} required maxLength={320} autoComplete="off" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal rr-text-navy focus-visible:ring-2 focus-visible:ring-ring" /></label>
          </div>
          <button type="submit" disabled={preflight.isPending || !preflightName.trim() || !preflightEmail.trim()} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl rr-bg-navy px-4 text-xs font-black rr-text-gold transition active:scale-[0.97] disabled:opacity-50">{preflight.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}{t("developerIntegrations.sourceOps.automation.runPreflight", { defaultValue: "Run preflight" })}</button>
        </form>

        <div className="min-w-0" aria-live="polite">
          <div className="flex items-center gap-2 rr-text-navy"><Clock3 size={17} aria-hidden="true" /><h4 className="font-black">{t("developerIntegrations.sourceOps.automation.preflightResult", { defaultValue: "Preflight result" })}</h4></div>
          {!preflightResult ? <p className="mt-3 rounded-xl bg-white p-4 text-sm text-slate-600">{t("developerIntegrations.sourceOps.automation.preflightEmpty", { defaultValue: "Run a read-only check before enabling a provider dry run or live delivery." })}</p> : (
            <div className={`mt-3 rounded-xl p-4 ${preflightResult.configurationReady ? "bg-emerald-50" : "bg-amber-50"}`}>
              <p className={`text-sm font-black ${preflightResult.configurationReady ? "text-emerald-900" : "text-amber-950"}`}>{preflightResult.configurationReady ? t("developerIntegrations.sourceOps.automation.ready", { defaultValue: "Configuration is ready for a safe provider dry run." }) : t("developerIntegrations.sourceOps.automation.blocked", { defaultValue: "Resolve the blocked checks before testing this source." })}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {CHECK_KEYS.map(check => { const status = preflightResult.checks[check]; return <li key={check} className="flex items-center gap-2 text-xs font-bold rr-text-navy">{status === "ready" ? <CheckCircle2 size={14} className="text-emerald-700" aria-hidden="true" /> : <AlertTriangle size={14} className="text-amber-800" aria-hidden="true" />}<span>{t(`developerIntegrations.sourceOps.automation.checks.${check}`, { defaultValue: check })}: {t(`developerIntegrations.sourceOps.automation.checkStatuses.${status}`, { defaultValue: status })}</span></li>; })}
              </ul>
              {preflightResult.deliveryCode && <p className="mt-3 text-xs font-bold text-amber-950">{t("developerIntegrations.sourceOps.automation.deliveryCode", { defaultValue: "Readiness code: {{code}}", code: preflightResult.deliveryCode })}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl rr-bg-navy p-4 text-xs leading-5 rr-on-dark-secondary">
        <p className="font-black rr-text-gold">{t("developerIntegrations.sourceOps.automation.retryTitle", { defaultValue: "Safe retry rule" })}</p>
        <p className="mt-1">{t("developerIntegrations.sourceOps.automation.retryDescription", { defaultValue: "Retry the same event with the same sourceSubmissionId and Idempotency-Key. Never create a new ID for a retry. Get Phame replays completed outcomes and schedules bounded retries for recoverable delivery failures." })}</p>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-300">{endpoint}</p>
      </div>
    </section>
  );
}
