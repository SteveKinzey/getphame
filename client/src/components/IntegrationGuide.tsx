import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Braces,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileJson,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL = "https://getphame.app";
const CONTACTS_ENDPOINT = `${BASE_URL}/api/v1/contacts`;
const API_KEY_PLACEHOLDER = "<YOUR_GET_PHAME_API_KEY>";

type FormBuilder =
  | "zapier"
  | "make"
  | "jotform"
  | "wsform"
  | "gravity"
  | "fluent"
  | "elementor"
  | "contactForm7"
  | "generic"
  | "curl";

interface Props {
  showSnippet: boolean;
  setShowSnippet: (value: boolean) => void;
}

interface BuilderGuide {
  label: string;
  summary: string;
  sourceApp: string;
  documentationUrl?: string;
  steps: string[];
  fieldMap?: Array<[string, string]>;
  example: string;
  caution?: string;
}

async function copyText(
  value: string,
  successMessage: string,
  errorMessage: string
) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error(errorMessage);
  }
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const { t } = useTranslation();
  return (
    <div className="relative mt-3">
      <p className="mb-1.5 text-xs font-black rr-text-navy">{label}</p>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-[oklch(0.18_0.06_260)] p-4 pr-12 font-mono text-xs leading-6 text-slate-100">
        {code}
      </pre>
      <button
        type="button"
        onClick={() =>
          copyText(
            code,
            t("developerIntegrations.guides.copied", {
              defaultValue: "Example copied.",
            }),
            t("developerIntegrations.copyFailed", {
              defaultValue:
                "Could not copy automatically. Select and copy the value manually.",
            })
          )
        }
        className="absolute right-2 top-7 inline-flex min-h-9 items-center gap-1 rounded-lg bg-white/10 px-2 text-xs font-black rr-text-gold transition hover:bg-white/15 active:scale-[0.97]"
        aria-label={t("developerIntegrations.guides.copyExample", {
          defaultValue: "Copy example",
        })}
      >
        <Copy size={12} aria-hidden="true" />
        {t("common.copy", { defaultValue: "Copy" })}
      </button>
    </div>
  );
}

export function IntegrationGuide({ showSnippet, setShowSnippet }: Props) {
  const { t } = useTranslation();
  const [activeBuilder, setActiveBuilder] = useState<FormBuilder>("zapier");

  const canonicalJson = `{
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "phone": "+1 555 010 2040",
  "externalId": "form-submission-1842",
  "sourceApp": "generic-webhook",
  "consent": {
    "confirmed": true,
    "basis": "customer_relationship",
    "capturedAt": "2026-07-22T20:00:00.000Z",
    "source": "Completed-service website form"
  }
}`;

  const flatBuilderJson = `{
  "name": "<name field>",
  "email": "<email field>",
  "externalId": "<stable submission ID>",
  "sourceApp": "<builder source>",
  "consentConfirmed": true,
  "consentBasis": "customer_relationship",
  "consentSource": "Completed-service website form"
}`;

  const curlExample = `curl --request POST '${CONTACTS_ENDPOINT}' \\
  --header 'Authorization: Bearer ${API_KEY_PLACEHOLDER}' \\
  --header 'Content-Type: application/json' \\
  --header 'Idempotency-Key: form-submission-1842' \\
  --data '${canonicalJson.replaceAll("'", "'\\''")}'`;

  const commonHeaders = `Authorization: Bearer ${API_KEY_PLACEHOLDER}
Content-Type: application/json
Idempotency-Key: <stable submission or entry ID>`;

  const guides = useMemo<Record<FormBuilder, BuilderGuide>>(
    () => ({
      zapier: {
        label: "Zapier",
        summary: t("developerIntegrations.guides.zapier.summary", {
          defaultValue:
            "Map one eligible trigger into Webhooks by Zapier with an explicit JSON request.",
        }),
        sourceApp: "zapier",
        documentationUrl:
          "https://help.zapier.com/hc/en-us/articles/8496326446989-Send-webhooks-in-Zap-workflows",
        steps: [
          t("developerIntegrations.guides.zapier.step1", {
            defaultValue:
              "Choose the trigger that creates an eligible customer record, then add Webhooks by Zapier as the next action.",
          }),
          t("developerIntegrations.guides.zapier.step2", {
            defaultValue:
              "Choose POST or Custom Request, set the URL to the v1 contact endpoint, and set Payload Type to JSON.",
          }),
          t("developerIntegrations.guides.zapier.step3", {
            defaultValue:
              "Map only the fields below. Add Authorization in protected headers and never leave the Data section blank.",
          }),
          t("developerIntegrations.guides.zapier.step4", {
            defaultValue:
              "Map the source event ID unchanged into externalId and Idempotency-Key so a retry remains a safe replay.",
          }),
          t("developerIntegrations.guides.zapier.step5", {
            defaultValue:
              "Test with one permitted record, then verify its masked result in Recent API imports.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          ["externalId", "Source event ID"],
          ["sourceApp", "zapier"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "zapier")}`,
      },
      make: {
        label: "Make",
        summary: t("developerIntegrations.guides.make.summary", {
          defaultValue:
            "Use Make HTTP v4 with a JSON data structure and a protected API-key credential.",
        }),
        sourceApp: "make",
        documentationUrl: "https://apps.make.com/http",
        steps: [
          t("developerIntegrations.guides.make.step1", {
            defaultValue:
              "Choose the trigger module that produces an eligible customer record, then add HTTP > Make a request (v4).",
          }),
          t("developerIntegrations.guides.make.step2", {
            defaultValue:
              "Set Method to POST, URL to the v1 contact endpoint, and Body content type to application/json.",
          }),
          t("developerIntegrations.guides.make.step3", {
            defaultValue:
              "Choose Data structure for JSON mapping and configure the Get Phame key in Make’s protected credential store.",
          }),
          t("developerIntegrations.guides.make.step4", {
            defaultValue:
              "Map the stable source event ID into externalId and Idempotency-Key. Do not generate a new value on retry.",
          }),
          t("developerIntegrations.guides.make.step5", {
            defaultValue:
              "Enable error handling for non-2xx responses, then run one permitted scenario test.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          ["externalId", "Source event ID"],
          ["sourceApp", "make"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "make")}`,
      },
      jotform: {
        label: "Jotform",
        summary: t("developerIntegrations.guides.jotform.summary", {
          defaultValue:
            "Use the native Jotform webhook as a trigger and forward it through a server-side bridge that holds the API key.",
        }),
        sourceApp: "jotform",
        documentationUrl:
          "https://www.jotform.com/help/245-how-to-send-submission-data-via-a-webhook/",
        steps: [
          t("developerIntegrations.guides.jotform.step1", {
            defaultValue:
              "In Jotform Settings > Integrations, add Webhooks and point it to an HTTPS bridge URL you control.",
          }),
          t("developerIntegrations.guides.jotform.step2", {
            defaultValue:
              "In the bridge, validate the expected form and affirmative consent, then parse Jotform’s rawRequest payload.",
          }),
          t("developerIntegrations.guides.jotform.step3", {
            defaultValue:
              "Send only the normalized fields below from the bridge to the v1 contact endpoint with protected headers.",
          }),
          t("developerIntegrations.guides.jotform.step4", {
            defaultValue:
              "Reuse Jotform submissionID as externalId and Idempotency-Key for every downstream retry.",
          }),
          t("developerIntegrations.guides.jotform.step5", {
            defaultValue:
              "Acknowledge Jotform promptly after durable acceptance, then test one permitted submission end to end.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          ["externalId", "Jotform submissionID"],
          ["sourceApp", "jotform"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "jotform")}`,
        caution: t("developerIntegrations.guides.jotform.caution", {
          defaultValue:
            "Jotform’s native webhook setup does not document protected request headers. Keep the Get Phame API key exclusively in the server-side bridge, never in the Jotform form or webhook URL.",
        }),
      },
      wsform: {
        label: "WS Form",
        summary: t("developerIntegrations.guides.wsform.summary", {
          defaultValue:
            "Use the Webhook action with JSON field, custom, and header mappings.",
        }),
        sourceApp: "ws-form",
        documentationUrl: "https://wsform.com/knowledgebase/webhook/",
        steps: [
          t("developerIntegrations.guides.wsform.step1", {
            defaultValue:
              "Edit the form, open Actions, add an action, and select Webhook.",
          }),
          t("developerIntegrations.guides.wsform.step2", {
            defaultValue:
              "Set URL of Endpoint to the v1 contact endpoint, Request Method to POST, and Content Type to JSON.",
          }),
          t("developerIntegrations.guides.wsform.step3", {
            defaultValue:
              "Use Field Mapping for name and email. Use Custom Mapping for the static source and consent values shown below.",
          }),
          t("developerIntegrations.guides.wsform.step4", {
            defaultValue:
              "Use Header Mapping for Authorization and Idempotency-Key. Select the form submission identifier for the idempotency value.",
          }),
          t("developerIntegrations.guides.wsform.step5", {
            defaultValue:
              "Keep SSL Verify enabled, save the action, and submit one permitted test record.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          ["sourceApp", "ws-form"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "ws-form")}`,
      },
      gravity: {
        label: "Gravity Forms",
        summary: t("developerIntegrations.guides.gravity.summary", {
          defaultValue:
            "Create a Webhooks Add-On feed with a JSON request and custom headers.",
        }),
        sourceApp: "gravity-forms",
        documentationUrl:
          "https://docs.gravityforms.com/triggering-webhooks-form-submissions/",
        steps: [
          t("developerIntegrations.guides.gravity.step1", {
            defaultValue:
              "Install and activate the Gravity Forms Webhooks Add-On, then open Form Settings → Webhooks → Add New.",
          }),
          t("developerIntegrations.guides.gravity.step2", {
            defaultValue:
              "Set Request URL to the v1 contact endpoint, Request Method to POST, and Request Format to JSON.",
          }),
          t("developerIntegrations.guides.gravity.step3", {
            defaultValue:
              "Choose Select Fields and map the fields and static consent values shown below.",
          }),
          t("developerIntegrations.guides.gravity.step4", {
            defaultValue:
              "Add the Authorization header and use the entry ID merge tag as Idempotency-Key.",
          }),
          t("developerIntegrations.guides.gravity.step5", {
            defaultValue:
              "Save the feed and submit one permitted test record. Gravity Forms sets application/json automatically for JSON POST feeds.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          [
            "externalId",
            t("developerIntegrations.guides.map.entryId", {
              defaultValue: "The Gravity Forms entry ID merge tag",
            }),
          ],
          ["sourceApp", "gravity-forms"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "gravity-forms")}`,
      },
      fluent: {
        label: "Fluent Forms",
        summary: t("developerIntegrations.guides.fluent.summary", {
          defaultValue:
            "Create a Pro Webhook feed with POST, JSON, headers, and a mapped request body.",
        }),
        sourceApp: "fluent-forms",
        documentationUrl:
          "https://fluentforms.com/docs/how-to-integrate-webhook-with-fluent-forms/",
        steps: [
          t("developerIntegrations.guides.fluent.step1", {
            defaultValue:
              "Enable the Webhooks integration module, then open the form’s Settings & Integrations → WebHook → Add New.",
          }),
          t("developerIntegrations.guides.fluent.step2", {
            defaultValue:
              "Set Request URL to the v1 contact endpoint, Request Method to POST, and Request Format to JSON.",
          }),
          t("developerIntegrations.guides.fluent.step3", {
            defaultValue:
              "Enable Request Header and add Authorization plus Idempotency-Key using a stable submission identifier.",
          }),
          t("developerIntegrations.guides.fluent.step4", {
            defaultValue:
              "Enable Request Body and map the fields and static consent values shown below.",
          }),
          t("developerIntegrations.guides.fluent.step5", {
            defaultValue: "Save the feed and submit one permitted test record.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          [
            "externalId",
            t("developerIntegrations.guides.map.submissionId", {
              defaultValue: "The Fluent Forms submission ID token",
            }),
          ],
          ["sourceApp", "fluent-forms"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "fluent-forms")}`,
      },
      elementor: {
        label: "Elementor Forms",
        summary: t("developerIntegrations.guides.elementor.summary", {
          defaultValue:
            "Use a server-side custom form action or trusted webhook bridge that can add protected headers.",
        }),
        sourceApp: "elementor-forms",
        documentationUrl: "https://developers.elementor.com/docs/form-actions/",
        steps: [
          t("developerIntegrations.guides.elementor.step1", {
            defaultValue:
              "Create the Elementor Pro Form with stable IDs for the customer name, email, and any consent checkbox.",
          }),
          t("developerIntegrations.guides.elementor.step2", {
            defaultValue:
              "Use a server-side custom form action or trusted webhook bridge that supports custom Authorization and Idempotency-Key headers.",
          }),
          t("developerIntegrations.guides.elementor.step3", {
            defaultValue:
              "Configure POST, the v1 contact endpoint, JSON, and the field map shown below.",
          }),
          t("developerIntegrations.guides.elementor.step4", {
            defaultValue:
              "Store the key only in a protected WordPress setting or server-side connector. Never paste it into page HTML or browser JavaScript.",
          }),
          t("developerIntegrations.guides.elementor.step5", {
            defaultValue:
              "Submit one permitted test record and confirm it appears in Recent API imports.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          [
            "externalId",
            t("developerIntegrations.guides.map.submissionId", {
              defaultValue: "A stable server-side submission identifier",
            }),
          ],
          ["sourceApp", "elementor-forms"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "elementor-forms")}`,
        caution: t("developerIntegrations.guides.elementor.caution", {
          defaultValue:
            "Elementor’s built-in Webhook action may not expose every protected-header control required by your setup. Do not work around that by placing the API key in the URL or page source.",
        }),
      },
      contactForm7: {
        label: "Contact Form 7",
        summary: t("developerIntegrations.guides.contactForm7.summary", {
          defaultValue:
            "Use a small WordPress-side integration because Contact Form 7 has no native generic outbound webhook action.",
        }),
        sourceApp: "contact-form-7",
        documentationUrl:
          "https://contactform7.com/integration-with-external-apis/",
        steps: [
          t("developerIntegrations.guides.contactForm7.step1", {
            defaultValue:
              "Add a required Contact Form 7 acceptance checkbox with consent wording that matches your actual outreach channels.",
          }),
          t("developerIntegrations.guides.contactForm7.step2", {
            defaultValue:
              "Use the documented wpcf7_before_send_mail hook in a reviewed WordPress plugin or mu-plugin to read sanitized submission data.",
          }),
          t("developerIntegrations.guides.contactForm7.step3", {
            defaultValue:
              "Validate the form identity and consent server-side, then post only the mapped JSON fields to the v1 contact endpoint.",
          }),
          t("developerIntegrations.guides.contactForm7.step4", {
            defaultValue:
              "Generate and persist one idempotency key before retrying so retries never create duplicate contact work.",
          }),
          t("developerIntegrations.guides.contactForm7.step5", {
            defaultValue:
              "Keep the API key in server configuration and verify one permitted submission in Recent API imports.",
          }),
        ],
        fieldMap: [
          [
            "name",
            t("developerIntegrations.guides.map.name", {
              defaultValue: "Your customer name field",
            }),
          ],
          [
            "email",
            t("developerIntegrations.guides.map.email", {
              defaultValue: "Your customer email field",
            }),
          ],
          ["externalId", "Persisted server-side submission ID"],
          ["sourceApp", "contact-form-7"],
          ["consentConfirmed", "true"],
          ["consentBasis", "customer_relationship | explicit_opt_in | other"],
          [
            "consentSource",
            t("developerIntegrations.guides.map.consentSource", {
              defaultValue: "A short description of where consent was captured",
            }),
          ],
        ],
        example: `${commonHeaders}\n\n${flatBuilderJson.replace("<builder source>", "contact-form-7")}`,
        caution: t("developerIntegrations.guides.contactForm7.caution", {
          defaultValue:
            "Do not use browser DOM events or form markup for this connection. They expose the API key and are not an authoritative consent-to-import boundary.",
        }),
      },
      generic: {
        label: t("developerIntegrations.guides.generic.label", {
          defaultValue: "Generic webhook",
        }),
        summary: t("developerIntegrations.guides.generic.summary", {
          defaultValue:
            "Configure any server-side automation tool that supports POST, JSON, and protected headers.",
        }),
        sourceApp: "generic-webhook",
        steps: [
          t("developerIntegrations.guides.generic.step1", {
            defaultValue:
              "Create a new outbound HTTP or webhook action that runs once after an eligible customer form submission.",
          }),
          t("developerIntegrations.guides.generic.step2", {
            defaultValue:
              "Set method to POST, URL to the v1 contact endpoint, and content type to application/json.",
          }),
          t("developerIntegrations.guides.generic.step3", {
            defaultValue:
              "Add the Authorization header and a stable per-submission Idempotency-Key.",
          }),
          t("developerIntegrations.guides.generic.step4", {
            defaultValue: "Send the canonical nested JSON payload shown below.",
          }),
          t("developerIntegrations.guides.generic.step5", {
            defaultValue:
              "Treat HTTP 200 as success. Retry temporary failures with the same idempotency key.",
          }),
        ],
        example: `${commonHeaders}\n\n${canonicalJson}`,
      },
      curl: {
        label: "curl",
        summary: t("developerIntegrations.guides.curl.summary", {
          defaultValue:
            "Run one server-side command to validate your endpoint, key, scope, payload, and consent mapping.",
        }),
        sourceApp: "curl",
        steps: [
          t("developerIntegrations.guides.curl.step1", {
            defaultValue:
              "Copy the example into a secure terminal on a machine you control.",
          }),
          t("developerIntegrations.guides.curl.step2", {
            defaultValue:
              "Replace only the API-key placeholder and sample customer values. Do not paste a real key into shared chat, logs, or screenshots.",
          }),
          t("developerIntegrations.guides.curl.step3", {
            defaultValue:
              "Run the command once and confirm a success response and a privacy-safe Recent API imports row.",
          }),
          t("developerIntegrations.guides.curl.step4", {
            defaultValue:
              "Run it again with the same idempotency key to confirm a safe replay rather than a duplicate contact.",
          }),
        ],
        example: curlExample,
      },
    }),
    [canonicalJson, commonHeaders, curlExample, flatBuilderJson, t]
  );

  const guide = guides[activeBuilder];

  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
      data-testid="integration-guide"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl rr-bg-navy rr-text-gold">
            <Braces size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black rr-text-navy">
              {t("developerIntegrations.guides.header", {
                defaultValue: "Form and webhook integration",
              })}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {t("developerIntegrations.guides.headerDescription", {
                defaultValue:
                  "Every guide imports a contact only. It never sends a review request automatically.",
              })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSnippet(!showSnippet)}
          aria-expanded={showSnippet}
          aria-controls="integration-guide-details"
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black rr-text-navy transition active:scale-[0.97]"
        >
          {showSnippet ? (
            <ChevronUp size={15} aria-hidden="true" />
          ) : (
            <ChevronDown size={15} aria-hidden="true" />
          )}
          {showSnippet
            ? t("developerIntegrations.guides.hide", {
                defaultValue: "Hide guides",
              })
            : t("developerIntegrations.guides.show", {
                defaultValue: "Show guides",
              })}
        </button>
      </div>

      <div className="grid gap-3 border-t border-slate-200 bg-white p-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
        <span className="w-fit rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-black text-emerald-800">
          POST
        </span>
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-3">
          <code className="min-w-0 flex-1 break-all text-xs font-bold rr-text-navy sm:text-sm">
            {CONTACTS_ENDPOINT}
          </code>
          <button
            type="button"
            onClick={() =>
              copyText(
                CONTACTS_ENDPOINT,
                t("developerIntegrations.contract.endpointCopied", {
                  defaultValue: "Endpoint copied.",
                }),
                t("developerIntegrations.copyFailed", {
                  defaultValue:
                    "Could not copy automatically. Select and copy the value manually.",
                })
              )
            }
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-white"
            aria-label={t("developerIntegrations.contract.copyEndpoint", {
              defaultValue: "Copy endpoint",
            })}
          >
            <Copy size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="border-t border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-amber-800"
            aria-hidden="true"
          />
          <p className="text-xs leading-5 text-amber-950">
            <strong>
              {t("developerIntegrations.guides.consentTitle", {
                defaultValue: "Consent rule:",
              })}
            </strong>{" "}
            {t("developerIntegrations.guides.consentRule", {
              defaultValue:
                "Set consentConfirmed to true only when this workflow represents an existing customer relationship or an explicit opt-in. For general lead forms, add an unchecked consent box and run the webhook only after it is selected.",
            })}
          </p>
        </div>
      </div>

      {showSnippet && (
        <div
          id="integration-guide-details"
          className="space-y-5 border-t border-slate-200 bg-white p-4 sm:p-5"
        >
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label={t("developerIntegrations.guides.builderTabs", {
              defaultValue: "Integration type",
            })}
          >
            {(Object.keys(guides) as FormBuilder[]).map(builder => (
              <button
                key={builder}
                type="button"
                role="tab"
                aria-selected={activeBuilder === builder}
                onClick={() => setActiveBuilder(builder)}
                className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-black transition active:scale-[0.97] ${activeBuilder === builder ? "rr-bg-navy rr-text-gold" : "bg-slate-100 rr-text-navy hover:bg-slate-200"}`}
              >
                {guides[builder].label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold rr-text-navy">
                    {guide.label}
                  </h3>
                  <p className="mt-1 text-sm leading-6 rr-text-navy-muted">
                    {guide.summary}
                  </p>
                </div>
                {guide.documentationUrl && (
                  <a
                    href={guide.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black rr-text-navy transition active:scale-[0.97]"
                  >
                    {t("developerIntegrations.guides.officialDocs", {
                      defaultValue: "Official docs",
                    })}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </div>

              <ol className="mt-5 space-y-3">
                {guide.steps.map((step, index) => (
                  <li
                    key={step}
                    className="flex gap-3 text-sm leading-6 text-slate-700"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full rr-bg-navy text-xs font-black rr-text-gold">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {guide.caution && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
                  {guide.caution}
                </p>
              )}

              {guide.fieldMap && (
                <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[34rem] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-black">
                          {t("developerIntegrations.guides.apiField", {
                            defaultValue: "API field",
                          })}
                        </th>
                        <th className="px-3 py-2 font-black">
                          {t("developerIntegrations.guides.mapTo", {
                            defaultValue: "Map to",
                          })}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {guide.fieldMap.map(([field, value]) => (
                        <tr key={field}>
                          <td className="px-3 py-2 font-mono font-bold rr-text-navy">
                            {field}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 rr-text-navy">
                <FileJson size={17} aria-hidden="true" />
                <h3 className="text-sm font-black">
                  {t("developerIntegrations.guides.safeExample", {
                    defaultValue: "Safe placeholder example",
                  })}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {t("developerIntegrations.guides.placeholderNote", {
                  defaultValue:
                    "Examples use a placeholder key by design. Get Phame never inserts an existing raw key into these copyable instructions.",
                })}
              </p>
              <CodeBlock
                code={guide.example}
                label={t("developerIntegrations.guides.requestExample", {
                  defaultValue: "Request example",
                })}
              />
              <CodeBlock
                code={`// Success — HTTP 200\n{\n  "success": true,\n  "contactId": 1842,\n  "created": true,\n  "deduplicated": false,\n  "idempotentReplay": false\n}\n\n// Safe error shape\n{\n  "error": {\n    "code": "CONSENT_REQUIRED",\n    "message": "Affirmative consent attestation is required."\n  },\n  "requestId": "..."\n}`}
                label={t("developerIntegrations.guides.responseExample", {
                  defaultValue: "Response reference",
                })}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-black rr-text-navy">
              {t("developerIntegrations.guides.testChecklist", {
                defaultValue: "Test checklist",
              })}
            </h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {[
                t("developerIntegrations.guides.check1", {
                  defaultValue: "The API key has contacts:write permission.",
                }),
                t("developerIntegrations.guides.check2", {
                  defaultValue:
                    "The key is stored server-side, never in the page source or URL.",
                }),
                t("developerIntegrations.guides.check3", {
                  defaultValue:
                    "The webhook runs only after permitted customer action or opt-in.",
                }),
                t("developerIntegrations.guides.check4", {
                  defaultValue:
                    "The same submission keeps the same Idempotency-Key when retried.",
                }),
                t("developerIntegrations.guides.check5", {
                  defaultValue:
                    "A successful import appears with a masked email in Recent API imports.",
                }),
                t("developerIntegrations.guides.check6", {
                  defaultValue:
                    "The imported contact is not emailed automatically.",
                }),
              ].map(item => (
                <p
                  key={item}
                  className="flex items-start gap-2 text-xs leading-5 text-slate-600"
                >
                  <ShieldCheck
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
