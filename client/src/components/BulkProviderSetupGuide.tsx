import { ExternalLink, ShieldCheck } from "lucide-react";
import type { BulkSenderPreset } from "../../../shared/bulkSenderPresets";

type BulkProviderSetupGuideProps = {
  preset: BulkSenderPreset;
  providerLabel: string;
  verificationHelp: string;
  guideTitle: string;
  finalStep: string;
  openGuideLabel: string;
};

export function BulkProviderSetupGuide({
  preset,
  providerLabel,
  verificationHelp,
  guideTitle,
  finalStep,
  openGuideLabel,
}: BulkProviderSetupGuideProps) {
  const guideLinkLabel = openGuideLabel.replace("{{provider}}", providerLabel);

  return (
    <aside className="mt-3 rounded-xl p-3" style={{ background: "oklch(0.975 0.012 260)", border: "1px solid oklch(0.90 0.02 260)" }} aria-label={guideTitle}>
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 shrink-0" size={16} aria-hidden="true" style={{ color: "oklch(0.56 0.14 75)" }} />
        <div className="min-w-0">
          <p className="text-xs font-bold rr-text-navy">{guideTitle}</p>
          <ol className="mt-2 space-y-1.5 pl-4 text-xs rr-text-navy-muted">
            <li data-testid="provider-credential-note"><span className="font-semibold rr-text-navy">Credentials:</span> {preset.secretHelp}</li>
            <li data-testid="provider-verification-note"><span className="font-semibold rr-text-navy">Sender verification:</span> {verificationHelp}</li>
            <li>{finalStep}</li>
          </ol>
          <a
            href={preset.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-bold rr-text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {guideLinkLabel}<ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );
}
