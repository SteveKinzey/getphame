import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  ExternalLink,
  KeyRound,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

type SourceId = "website" | "jotform" | "facebook" | "linkedin" | "tiktok" | "googleForms" | "airtable" | "other";

interface SourceDefinition {
  id: SourceId;
  label: string;
  sourceApp: string;
  documentationUrl: string;
}

const API_KEY_PLACEHOLDER = "<YOUR_GET_PHAME_API_KEY>";
const REVIEW_OUTREACH_CONSENT = "I agree that {{business_name}} may email me about my recent purchase or service experience, including one review request and up to two follow-up reminders. I can unsubscribe at any time. Consent is not a condition of purchase. See the Privacy Policy.";
const MARKETING_CONSENT = "I would like to receive occasional marketing emails and offers from {{business_name}}. I can unsubscribe at any time. Consent is not a condition of purchase. See the Privacy Policy.";

const SOURCES: SourceDefinition[] = [
  {
    id: "website",
    label: "Website form",
    sourceApp: "website-form",
    documentationUrl: "https://getphame.app/developer",
  },
  {
    id: "jotform",
    label: "Jotform",
    sourceApp: "jotform",
    documentationUrl: "https://www.jotform.com/help/245-how-to-send-submission-data-via-a-webhook/",
  },
  {
    id: "facebook",
    label: "Facebook Lead Ads",
    sourceApp: "facebook-lead-ads",
    documentationUrl: "https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/",
  },
  {
    id: "linkedin",
    label: "LinkedIn Lead Gen Forms",
    sourceApp: "linkedin-lead-gen",
    documentationUrl: "https://www.linkedin.com/help/lms/answer/a422701",
  },
  {
    id: "tiktok",
    label: "TikTok Lead Generation",
    sourceApp: "tiktok-lead-generation",
    documentationUrl: "https://ads.tiktok.com/help/article/lead-generation",
  },
  {
    id: "googleForms",
    label: "Google Forms",
    sourceApp: "google-forms",
    documentationUrl: "https://developers.google.com/apps-script/guides/triggers/installable#google_apps_triggers",
  },
  {
    id: "airtable",
    label: "Airtable",
    sourceApp: "airtable",
    documentationUrl: "https://support.airtable.com/docs/automations-overview",
  },
  {
    id: "other",
    label: "Other source",
    sourceApp: "custom-source",
    documentationUrl: "https://getphame.app/developer",
  },
];

const FIELD_ROWS = [
  ["eventType", "eventType"],
  ["name", "name"],
  ["email", "email"],
  ["phone", "phone"],
  ["externalId", "externalId"],
  ["sourceApp", "sourceApp"],
  ["sourceFormId", "sourceFormId"],
  ["sourceSubmissionId", "sourceSubmissionId"],
  ["preferredLocale", "preferredLocale"],
  ["consent.confirmed", "consentConfirmed"],
  ["consent.basis", "consentBasis"],
  ["consent.purpose", "consentPurpose"],
  ["consent.channel", "consentChannel"],
  ["consent.capturedAt", "consentCapturedAt"],
  ["consent.source", "consentSource"],
  ["consent.text", "consentText"],
  ["consent.version", "consentVersion"],
  ["consent.privacyPolicyUrl", "privacyPolicyUrl"],
] as const;

const WORKFLOW_STEPS = ["choose", "key", "map", "test"] as const;
const RULE_IDS = ["secret", "consent", "idempotency", "activation"] as const;

const STEP_FALLBACKS = {
  choose: "Choose a source",
  key: "Create a source key",
  map: "Map fields and consent",
  test: "Preflight and dry run",
} as const;

const RULE_FALLBACKS = {
  secret: "Store the Get Phame API key only in a protected server-side secret field. Never place it in a form, URL, page source, or browser script.",
  consent: "Import only existing customers or people who affirmatively opted in. Keep optional consent boxes unchecked by default.",
  idempotency: "Reuse the same provider event ID for every retry so one submission cannot create duplicate work.",
  activation: "Start in safe dry-run mode. Live review outreach stays off until an authorized user completes preflight, verifies one provider event, and explicitly activates that source.",
} as const;

const PROVIDER_FALLBACKS: Record<SourceId, { path: string; idempotency: string }> = {
  website: {
    path: "Post from your trusted server or a protected Zapier/Make webhook. Never expose the Get Phame API key in browser JavaScript, page source, or a public form action.",
    idempotency: "Use the form provider's immutable submission ID for externalId, sourceSubmissionId, and Idempotency-Key.",
  },
  jotform: {
    path: "Send each eligible Jotform submission through a trusted automation bridge that can store secrets and add protected headers before posting to Get Phame.",
    idempotency: "Use the immutable Jotform submission ID for both externalId and Idempotency-Key.",
  },
  facebook: {
    path: "Use a trusted automation bridge to retrieve permitted Meta Lead Ads fields and the custom purpose-specific consent response, then post the normalized record to Get Phame.",
    idempotency: "Use Meta's leadgen ID as the stable externalId and Idempotency-Key.",
  },
  linkedin: {
    path: "Use a trusted LinkedIn Lead Gen integration or automation bridge. Map the lead ID, form ID, explicit custom consent response, and exact consent wording shown on the form.",
    idempotency: "Use LinkedIn's immutable lead response ID for externalId, sourceSubmissionId, and Idempotency-Key.",
  },
  tiktok: {
    path: "Use a trusted TikTok Lead Generation integration or automation bridge. Import only the permitted fields and include affirmative, purpose-specific consent evidence.",
    idempotency: "Use TikTok's immutable lead ID for externalId, sourceSubmissionId, and Idempotency-Key.",
  },
  googleForms: {
    path: "Use an installable Google Apps Script form-submit trigger or a trusted automation bridge. Keep the Get Phame key in protected script properties or the bridge's secret store.",
    idempotency: "Use a stable response identifier or the linked response-row ID; do not generate a new value during retries.",
  },
  airtable: {
    path: "Trigger a trusted automation when an eligible Airtable record is created or approved, then map that record to the Get Phame contact-import contract.",
    idempotency: "Use the immutable Airtable record ID for both externalId and Idempotency-Key.",
  },
  other: {
    path: "Use any server-side workflow or trusted no-code tool that supports POST, JSON, protected headers, and a stable event identifier.",
    idempotency: "Use the source system's immutable submission, record, order, or event ID for every retry.",
  },
};

const FIELD_FALLBACKS = {
  eventType: "Fixed value: review_request",
  name: "Customer name field",
  email: "Customer email field",
  phone: "Optional customer phone field",
  externalId: "Immutable provider event or record ID",
  sourceApp: "Fixed provider identifier shown above",
  consentConfirmed: "Boolean true only after affirmative permission",
  consentBasis: "customer_relationship, explicit_opt_in, or other",
  consentSource: "Short description of where permission was captured",
  consentCapturedAt: "ISO 8601 timestamp with timezone from the source submission",
  consentPurpose: "Fixed value: review_outreach",
  consentChannel: "Fixed value: email",
  consentText: "Exact review-outreach checkbox wording shown to the person",
  consentVersion: "Immutable business-managed wording version, such as review-outreach-v1",
  privacyPolicyUrl: "HTTPS privacy-policy URL shown beside the checkbox",
  sourceFormId: "Stable provider form identifier",
  sourceSubmissionId: "Immutable provider submission or lead identifier",
  preferredLocale: "Explicit supported language tag, such as en, es, fr, it, th, zh-CN, or zh-TW",
} as const;

interface SourceSetupGuideProps {
  endpoint: string;
}

export function SourceSetupGuide({ endpoint }: SourceSetupGuideProps) {
  const { t } = useTranslation();
  const [sourceId, setSourceId] = useState<SourceId>("website");
  const source = SOURCES.find((item) => item.id === sourceId) ?? SOURCES[0];
  const getSourceLabel = (item: SourceDefinition) => item.id === "other"
    ? t("developerIntegrations.sources.providers.other.label", { defaultValue: "Other source" })
    : item.label;

  const recipe = useMemo(() => `POST ${endpoint}
Authorization: Bearer ${API_KEY_PLACEHOLDER}
Content-Type: application/json
X-Get-Phame-Source: <YOUR_SOURCE_ID>
Idempotency-Key: <stable-provider-event-id>

{
  "eventType": "review_request",
  "sourceSubmissionId": "<stable-provider-event-id>",
  "name": "<customer name>",
  "email": "<customer email>",
  "phone": "<optional customer phone>",
  "externalId": "<stable-provider-event-id>",
  "sourceFormId": "<provider-form-id>",
  "sourceApp": "${source.sourceApp}",
  "preferredLocale": "en",
  "consent": {
    "confirmed": true,
    "basis": "explicit_opt_in",
    "purpose": "review_outreach",
    "channel": "email",
    "capturedAt": "<ISO-8601 timestamp with timezone>",
    "source": "<provider and form name>",
    "text": "${REVIEW_OUTREACH_CONSENT}",
    "version": "review-outreach-v1",
    "privacyPolicyUrl": "https://example.com/privacy"
  }
}`, [endpoint, source.sourceApp]);

  const copyRecipe = async () => {
    try {
      await navigator.clipboard.writeText(recipe);
      toast.success(t("developerIntegrations.sources.recipeCopied", { defaultValue: "Safe setup recipe copied." }));
    } catch {
      toast.error(t("developerIntegrations.copyFailed", { defaultValue: "Could not copy automatically. Select and copy the value manually." }));
    }
  };

  return (
    <section id="sources" aria-labelledby="sources-title" className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-6" data-testid="developer-sources">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 rr-text-navy">
            <PlugZap size={20} aria-hidden="true" />
            <h2 id="sources-title" className="text-xl font-semibold">
              {t("developerIntegrations.sources.title", { defaultValue: "Connect a source" })}
            </h2>
          </div>
          <p className="mt-1 text-sm leading-6 rr-text-navy-muted">
            {t("developerIntegrations.sources.description", { defaultValue: "Choose where an approved customer event starts. Get Phame validates purpose-specific consent, suppression, delivery readiness, and idempotency before any automated review request can go live." })}
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
          {t("developerIntegrations.sources.badge", { defaultValue: "Validate first · activate later" })}
        </span>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("developerIntegrations.sources.workflowTitle", { defaultValue: "Source connection workflow" })}>
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step} className="flex min-h-16 items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold rr-text-navy">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full rr-bg-navy text-xs font-black rr-text-gold">{index + 1}</span>
            {t(`developerIntegrations.sources.steps.${step}`, { defaultValue: STEP_FALLBACKS[step] })}
          </li>
        ))}
      </ol>

      <fieldset className="mt-6">
        <legend className="text-sm font-black rr-text-navy">
          {t("developerIntegrations.sources.choose", { defaultValue: "Choose a source" })}
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((item) => {
            const selected = item.id === source.id;
            return (
              <label key={item.id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition active:scale-[0.98] ${selected ? "border-[oklch(0.62_0.16_80)] bg-[oklch(0.96_0.04_80)] rr-text-navy" : "border-slate-200 bg-white text-slate-600"}`}>
                <input
                  type="radio"
                  name="source-provider"
                  value={item.id}
                  checked={selected}
                  onChange={() => setSourceId(item.id)}
                  className="size-4 accent-[oklch(0.62_0.16_80)]"
                />
                <span>{getSourceLabel(item)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" aria-live="polite">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {t("developerIntegrations.sources.pathLabel", { defaultValue: "Recommended path" })}
              </p>
              <h3 className="mt-1 text-lg font-semibold rr-text-navy">{getSourceLabel(source)}</h3>
            </div>
            <a href={source.documentationUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black rr-text-navy">
              {t("developerIntegrations.sources.officialDocs", { defaultValue: "Provider docs" })}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-3 text-sm leading-6 rr-text-navy-muted">
            {t(`developerIntegrations.sources.providers.${source.id}.path`, { defaultValue: PROVIDER_FALLBACKS[source.id].path })}
          </p>

          <div className="mt-4 rounded-2xl bg-white p-4">
            <div className="flex items-center gap-2 rr-text-navy">
              <ClipboardCheck size={17} aria-hidden="true" />
              <h4 className="text-sm font-black">{t("developerIntegrations.sources.idempotencyTitle", { defaultValue: "Stable event ID" })}</h4>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {t(`developerIntegrations.sources.providers.${source.id}.idempotency`, { defaultValue: PROVIDER_FALLBACKS[source.id].idempotency })}
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-center gap-2 rr-text-navy">
              <ShieldCheck size={17} aria-hidden="true" />
              <h4 className="text-sm font-black">{t("developerIntegrations.sources.rulesTitle", { defaultValue: "Required safeguards" })}</h4>
            </div>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-600">
              {RULE_IDS.map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{t(`developerIntegrations.sources.rules.${rule}`, { defaultValue: RULE_FALLBACKS[rule] })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl rr-bg-navy p-4 text-white sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 rr-text-gold">
                <KeyRound size={17} aria-hidden="true" />
                <h3 className="text-sm font-black">{t("developerIntegrations.sources.recipeTitle", { defaultValue: "Safe review-event recipe" })}</h3>
              </div>
              <p className="mt-1 max-w-xl text-xs leading-5 text-white/70">
                {t("developerIntegrations.sources.recipeDescription", { defaultValue: "Use a placeholder while configuring. Paste the real key only into the automation service’s protected secret field." })}
              </p>
            </div>
            <button type="button" onClick={copyRecipe} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 text-xs font-black rr-text-gold transition hover:bg-white/15 active:scale-[0.97]">
              <Copy size={13} aria-hidden="true" />
              {t("developerIntegrations.sources.copyRecipe", { defaultValue: "Copy recipe" })}
            </button>
          </div>
          <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/20 p-4 font-mono text-xs leading-6 text-slate-100">{recipe}</pre>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[minmax(7rem,0.6fr)_minmax(0,1fr)] bg-white/5 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white/60">
              <span>{t("developerIntegrations.sources.apiField", { defaultValue: "API field" })}</span>
              <span>{t("developerIntegrations.sources.mapTo", { defaultValue: "Map from source" })}</span>
            </div>
            {FIELD_ROWS.map(([field, translationKey]) => (
              <div key={field} className="grid grid-cols-[minmax(7rem,0.6fr)_minmax(0,1fr)] gap-2 border-t border-white/10 px-3 py-2.5 text-xs">
                <code className="break-all rr-text-gold">{field}</code>
                <span className="text-white/80">{t(`developerIntegrations.sources.fields.${translationKey}`, { defaultValue: FIELD_FALLBACKS[translationKey] })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5" aria-labelledby="review-consent-title">
          <h3 id="review-consent-title" className="text-sm font-black text-emerald-950">
            {t("developerIntegrations.sources.consentCopyTitle", { defaultValue: "Review-outreach checkbox — copy and customize" })}
          </h3>
          <p className="mt-2 text-xs leading-5 text-emerald-900">
            {t("developerIntegrations.sources.consentCopyInstructions", { defaultValue: "Start this checkbox unchecked. You may require it for enrollment in automated review outreach, but not as a condition of an unrelated purchase, quote, or service. Have qualified counsel approve your final wording and workflow." })}
          </p>
          <blockquote className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate-800">
            <span aria-hidden="true">[ ] </span>{t("developerIntegrations.sources.reviewConsentCopy", { defaultValue: REVIEW_OUTREACH_CONSENT })}
          </blockquote>
          <h4 className="mt-4 text-xs font-black uppercase tracking-wide text-emerald-950">
            {t("developerIntegrations.sources.marketingConsentTitle", { defaultValue: "Separate optional marketing permission" })}
          </h4>
          <blockquote className="mt-2 rounded-xl bg-white p-3 text-sm leading-6 text-slate-800">
            <span aria-hidden="true">[ ] </span>{t("developerIntegrations.sources.marketingConsentCopy", { defaultValue: MARKETING_CONSENT })}
          </blockquote>
          <p className="mt-3 text-xs leading-5 text-emerald-900">
            {t("developerIntegrations.sources.channelBoundary", { defaultValue: "Do not treat either email checkbox as permission for SMS, automated calls, or another purpose. Import submissions without valid review-outreach evidence as ineligible and do not send automatically." })}
          </p>
        </section>

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5" aria-labelledby="source-test-title">
          <h3 id="source-test-title" className="text-sm font-black text-sky-950">
            {t("developerIntegrations.sources.testTitle", { defaultValue: "Test, retry, and revoke safely" })}
          </h3>
          <ol className="mt-3 space-y-2 text-xs leading-5 text-sky-950">
            <li><strong>1.</strong> {t("developerIntegrations.sources.testImport", { defaultValue: "Run the read-only validation endpoint with one permitted recipient. Confirm source binding, suppression, SMTP, quota, template, and destination checks without importing or sending." })}</li>
            <li><strong>2.</strong> {t("developerIntegrations.sources.testReplay", { defaultValue: "Enable safe dry run, submit one real provider event, then replay it with the same Idempotency-Key. Expect the same outcome, not duplicate work." })}</li>
            <li><strong>3.</strong> {t("developerIntegrations.sources.testFailure", { defaultValue: "Treat consent conflicts and validation errors as terminal. Retry only recoverable responses, honor Retry-After, and always reuse the same event ID." })}</li>
            <li><strong>4.</strong> {t("developerIntegrations.sources.testActivate", { defaultValue: "Verify the exact approved template, recipient language, destination, reminders, and delay before an authorized user switches from dry run to live delivery." })}</li>
            <li><strong>5.</strong> {t("developerIntegrations.sources.testRevoke", { defaultValue: "To stop a source, pause it in Get Phame and in the provider, revoke or rotate its key, and preserve the redacted audit history." })}</li>
          </ol>
        </section>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-amber-950">{t("developerIntegrations.sources.nextTitle", { defaultValue: "Ready to connect?" })}</p>
          <p className="mt-0.5 text-xs leading-5 text-amber-900">{t("developerIntegrations.sources.nextDescription", { defaultValue: "Create a source key with contacts:write and review_requests:send, bind it to a managed source, then complete preflight and one safe dry run." })}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href="#create-key-title" className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black rr-bg-navy rr-text-gold">
            {t("developerIntegrations.sources.createKey", { defaultValue: "Create source key" })}
          </a>
          <a href="#import-history-title" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-black rr-text-navy">
            {t("developerIntegrations.sources.viewImports", { defaultValue: "Manage sources" })}
          </a>
        </div>
      </div>
    </section>
  );
}
