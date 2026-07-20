import { notifyOwner } from "./_core/notification";

export type SmtpHealthState = "ok" | "fail" | null;

export type SmtpFailureTransitionInput = {
  previousStatus: SmtpHealthState;
  accountEmail: string;
  host: string;
  checkedAt: number;
  error: string;
};

export function isHealthyToFailedTransition(previousStatus: SmtpHealthState): boolean {
  return previousStatus === "ok";
}

export async function notifySmtpFailureTransition(input: SmtpFailureTransitionInput): Promise<boolean> {
  if (!isHealthyToFailedTransition(input.previousStatus)) return false;

  const accountEmail = input.accountEmail.trim().slice(0, 320) || "Unknown SMTP account";
  const host = input.host.trim().slice(0, 255) || "Unknown provider";
  const error = input.error.trim().slice(0, 500) || "SMTP verification failed.";
  const baseUrl = (process.env.APP_BASE_URL ?? "https://getphame.app").replace(/\/$/, "");
  const remediationUrl = `${baseUrl}/admin/users?smtpStatus=failing&search=${encodeURIComponent(accountEmail)}`;

  try {
    return await notifyOwner({
      title: `Get Phame SMTP connection failed: ${accountEmail}`,
      content: [
        `Account: ${accountEmail}`,
        `Provider: ${host}`,
        `Checked: ${new Date(input.checkedAt).toISOString()}`,
        `Error: ${error}`,
        `Remediate: ${remediationUrl}`,
      ].join("\n"),
    });
  } catch (error) {
    console.warn("[SmtpHealthCheck] Owner notification failed without interrupting health checks:", error);
    return false;
  }
}
