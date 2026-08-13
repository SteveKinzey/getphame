import { Info, Loader2, Mail, RefreshCw, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Translate = (key: string, options?: { defaultValue?: string }) => string;

export function getAppPasswordTooltipCopy(provider: "gmail" | "workspace", translate: Translate) {
  const isGmail = provider === "gmail";
  return {
    label: isGmail
      ? translate("smtp.gmailAppPasswordTooltipLabel", { defaultValue: "Gmail App Password help" })
      : translate("smtp.workspaceAppPasswordTooltipLabel", { defaultValue: "Google Workspace App Password help" }),
    content: isGmail
      ? translate("smtp.gmailAppPasswordTooltip", { defaultValue: "Use a 16-character App Password, not your regular Gmail password. Turn on 2-Step Verification first." })
      : translate("smtp.workspaceAppPasswordTooltip", { defaultValue: "Your Workspace administrator must allow App Passwords. If this option is unavailable, use your organisation’s approved SMTP or OAuth method." }),
  };
}

export function SmtpAppPasswordHelpTooltip({ provider, translate }: { provider: "gmail" | "workspace"; translate: Translate }) {
  const { label, content } = getAppPasswordTooltipCopy(provider, translate);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full rr-text-navy-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={label}>
          <Info size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">{content}</TooltipContent>
    </Tooltip>
  );
}

export function ConnectionSavedNotice({ message }: { message: string }) {
  return (
    <p role="status" className="mt-2 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.34 0.12 145)" }}>
      {message}
    </p>
  );
}

export function SmtpCandidateConnectionActions({
  result,
  testing,
  connecting,
  onTest,
  onConnect,
  onCancel,
  translate,
}: {
  result: { ok: boolean; error?: string | null } | null;
  testing: boolean;
  connecting: boolean;
  onTest: () => void;
  onConnect: () => void;
  onCancel?: () => void;
  translate: Translate;
}) {
  return (
    <>
      {result && (
        <div role="status" aria-live="polite" data-testid="smtp-candidate-test-result" className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: result.ok ? "oklch(0.96 0.04 145)" : "oklch(0.97 0.03 27)", color: result.ok ? "oklch(0.40 0.12 145)" : "oklch(0.45 0.12 27)" }}>
          <span className="font-black shrink-0">
            {result.ok
              ? translate("smtp.testPassedNotSaved", { defaultValue: "Connection test passed. Your credentials have not been saved yet." })
              : translate("smtp.testFailed", { defaultValue: "Connection test failed. Review your server details and try again." })}
          </span>
          {!result.ok && result.error && <span className="font-mono" style={{ wordBreak: "break-word" }}>— {result.error}</span>}
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" data-testid="smtp-test-before-save" onClick={onTest} disabled={testing || connecting} aria-busy={testing} className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-sm font-bold transition-transform active:scale-95" style={{ background: "oklch(0.93 0.02 260)", color: "oklch(0.35 0.04 260)" }}>
          {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {testing ? translate("smtp.testingCandidate", { defaultValue: "Testing your mail server…" }) : translate("smtp.testBeforeSave", { defaultValue: "Test before saving" })}
        </button>
        <button type="button" data-testid="smtp-connect-and-save" onClick={onConnect} disabled={connecting || testing} aria-busy={connecting} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-transform active:scale-95 rr-bg-gold rr-text-navy">
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {connecting ? translate("smtp.connectingAndVerifying", { defaultValue: "Connecting and verifying…" }) : translate("smtp.connectAndSave", { defaultValue: "Connect and save" })}
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="px-4 py-3 rounded-xl text-sm font-bold rr-text-navy-mid" style={{ background: "oklch(0.93 0.02 260)" }}><X size={14} /></button>}
      </div>
    </>
  );
}
