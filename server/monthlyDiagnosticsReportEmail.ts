import type { MonthlyDiagnosticsAttachment } from "./monthlyDiagnosticsExport";
import { sendSystemReportEmailOnce } from "./sendgrid";

export async function sendMonthlyDiagnosticReportEmail(input: {
  recipient: string;
  reportMonthKey: string;
  snapshotGeneratedAtMs: number;
  attachments: readonly MonthlyDiagnosticsAttachment[];
  metadata: {
    consent: { savedContactsTotal: number };
    auth: {
      totalMatching: number;
      exportedRows: number;
      truncated: boolean;
    };
  };
}) {
  const truncationNotice = input.metadata.auth.truncated
    ? " The authentication attachment was truncated at the export safety limit."
    : "";
  const subject = `Get Phame monthly diagnostics — ${input.reportMonthKey}`;
  const text = [
    `Monthly operational diagnostics for ${input.reportMonthKey}.`,
    `Consent posture snapshot generated ${new Date(input.snapshotGeneratedAtMs).toISOString()}: ${input.metadata.consent.savedContactsTotal} saved contacts.`,
    `Authentication checks: ${input.metadata.auth.exportedRows} exported of ${input.metadata.auth.totalMatching} matching scheduled checks.${truncationNotice}`,
    "The attached files are bounded, privacy-minimized CSV reports for authorized administrators.",
  ].join("\n\n");
  const html = `<p>Monthly operational diagnostics for <strong>${input.reportMonthKey}</strong>.</p><p>Consent posture snapshot: ${input.metadata.consent.savedContactsTotal} saved contacts.</p><p>Authentication checks: ${input.metadata.auth.exportedRows} exported of ${input.metadata.auth.totalMatching} matching scheduled checks.${truncationNotice}</p><p>The attached files are bounded, privacy-minimized CSV reports for authorized administrators.</p>`;
  return sendSystemReportEmailOnce({
    to: input.recipient,
    subject,
    text,
    html,
    suppressRelayAlert: true,
    attachments: input.attachments.map(attachment => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      content: attachment.content,
    })),
  });
}
