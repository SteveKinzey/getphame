import { useState } from "react";
import { Search } from "lucide-react";
import {
  BULK_SENDER_PROVIDER_IDS,
  type BulkSenderProvider,
  getBulkSenderPreset,
} from "../../../shared/bulkSenderPresets";
import { BulkProviderSetupGuide } from "./BulkProviderSetupGuide";

type Translate = (key: string, options?: { defaultValue?: string }) => string;

type BulkProviderDiscoveryControlsProps = {
  provider: BulkSenderProvider;
  onProviderChange: (provider: BulkSenderProvider) => void;
  translate: Translate;
};

export const BULK_PROVIDER_VERIFICATION_HELP: Record<
  BulkSenderProvider,
  string
> = {
  sendgrid:
    "Authenticate a single sender or domain in Sender Authentication before using SMTP.",
  amazon_ses:
    "Verify the From address or domain in the same SES region and request production access if your account is still sandboxed.",
  mailgun:
    "Add and verify the sending domain in Mailgun, including the required DNS records, before sending.",
  mailjet:
    "Validate the From address or authenticate the sending domain in Mailjet before testing delivery.",
  mailersend:
    "Verify the sending domain and complete the DNS checks in MailerSend before using its SMTP relay.",
  smtp2go:
    "Verify each From address or domain under Sending Domains before delivering customer outreach.",
  brevo:
    "Verify the sender or domain in Brevo and publish its required DNS records before sending.",
  postmark:
    "Use a verified Sender Signature or verified domain that belongs to the Postmark server token.",
  sparkpost:
    "Verify the sending domain in SparkPost and publish the DNS records required for that domain.",
  elastic_email:
    "Verify the From address or domain in Elastic Email before using the SMTP credentials.",
  zoho_zeptomail:
    "Verify the sender address or domain in the ZeptoMail Mail Agent before delivery.",
  socketlabs:
    "Register and verify the sending domain or address in SocketLabs before customer outreach.",
  custom_smtp:
    "Confirm with your provider that the From address or domain is authorized for this SMTP account.",
};

export function getProviderDiscoveryGuidance(provider: BulkSenderProvider) {
  const preset = getBulkSenderPreset(provider);
  return {
    credentialHelp: preset.secretHelp,
    verificationHelp: BULK_PROVIDER_VERIFICATION_HELP[provider],
    documentationUrl: preset.docsUrl,
  };
}

export function BulkProviderDiscoveryControls({
  provider,
  onProviderChange,
  translate,
}: BulkProviderDiscoveryControlsProps) {
  const [providerSearch, setProviderSearch] = useState("");
  const preset = getBulkSenderPreset(provider);
  const filteredProviders = BULK_SENDER_PROVIDER_IDS.filter(providerId => {
    const candidate = getBulkSenderPreset(providerId);
    return `${candidate.label} ${candidate.description}`
      .toLocaleLowerCase()
      .includes(providerSearch.trim().toLocaleLowerCase());
  });
  const visibleProviders = filteredProviders.includes(provider)
    ? filteredProviders
    : [provider, ...filteredProviders];
  const providerLabel =
    provider === "mailjet"
      ? translate("settings.bulkSender.providers.mailjet.label", {
          defaultValue: preset.label,
        })
      : preset.label;
  const providerDescription =
    provider === "mailjet"
      ? translate("settings.bulkSender.providers.mailjet.description", {
          defaultValue: preset.description,
        })
      : preset.description;
  const credentialHelp =
    provider === "mailjet"
      ? translate("settings.bulkSender.providers.mailjet.secretHelp", {
          defaultValue: preset.secretHelp,
        })
      : preset.secretHelp;
  const guidance = getProviderDiscoveryGuidance(provider);

  return (
    <div data-testid="bulk-provider-discovery-controls">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 rr-text-navy-muted"
          aria-hidden="true"
        />
        <input
          id="bulk-sender-provider-search"
          type="search"
          value={providerSearch}
          onChange={event => setProviderSearch(event.target.value)}
          placeholder={translate("settings.bulkSender.providerSearch", {
            defaultValue: "Search providers",
          })}
          aria-label={translate("settings.bulkSender.providerSearch", {
            defaultValue: "Search providers",
          })}
          className="min-h-11 w-full rounded-xl py-2 pl-9 pr-3 text-sm font-semibold outline-none rr-text-navy"
          style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
        />
      </div>
      <select
        id="bulk-sender-provider"
        value={provider}
        onChange={event =>
          onProviderChange(event.target.value as BulkSenderProvider)
        }
        className="mt-2 min-h-11 w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none rr-text-navy"
        style={{ border: "2px solid oklch(0.90 0.02 260)", fontSize: "16px" }}
      >
        {visibleProviders.map(providerId => (
          <option key={providerId} value={providerId}>
            {providerId === "mailjet"
              ? translate("settings.bulkSender.providers.mailjet.label", {
                  defaultValue: "Mailjet",
                })
              : getBulkSenderPreset(providerId).label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs rr-text-navy-muted">{providerDescription}</p>
      <BulkProviderSetupGuide
        preset={{ ...preset, secretHelp: credentialHelp }}
        providerLabel={providerLabel}
        verificationHelp={guidance.verificationHelp}
        guideTitle={translate("settings.bulkSender.providerGuideTitle", {
          defaultValue: `Set up ${providerLabel}`,
        })}
        finalStep={translate("settings.bulkSender.providerGuideStepThree", {
          defaultValue:
            "Paste that credential below, then connect and test it before sending outreach.",
        })}
        openGuideLabel={translate("settings.bulkSender.openProviderGuide", {
          defaultValue: "Open {{provider}} setup guide",
        })}
      />
    </div>
  );
}
