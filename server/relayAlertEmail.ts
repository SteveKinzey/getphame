import { ENV } from "./_core/env";
import { getUserByOpenId } from "./db";

export type RelayAlertEmailFallbackInput = {
  event: "failure" | "recovery" | "slack_test";
  activeRelay: "system_smtp" | "sendgrid" | "none";
  checkedAt: number;
  source: string;
  diagnostic: string;
  durationMinutes?: number | null;
};

export type RelayAlertEmailFallbackResult = {
  attempted: boolean;
  delivered: boolean;
  reason:
    | "delivered"
    | "owner_email_unavailable"
    | "email_transport_unavailable"
    | "delivery_failed";
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fallbackCopy(input: RelayAlertEmailFallbackInput) {
  const timestamp = new Date(input.checkedAt).toISOString();
  const eventCopy =
    input.event === "failure"
      ? "The Slack incident webhook did not confirm delivery after an operational email relay failure."
      : input.event === "recovery"
        ? "The Slack recovery webhook did not confirm delivery after the primary operational email relay recovered."
        : "The Slack webhook test did not confirm delivery.";
  const durationCopy =
    input.durationMinutes == null
      ? "Not applicable"
      : `${input.durationMinutes} minute(s)`;

  return {
    subject: `Get Phame: ${input.event === "failure" ? "Slack fallback for email relay failover" : input.event === "recovery" ? "Slack fallback for email relay recovery" : "Slack webhook test fallback"}`,
    text: [
      eventCopy,
      "",
      `Active relay: ${input.activeRelay}`,
      `Source: ${input.source}`,
      `Checked at: ${timestamp}`,
      `Outage duration: ${durationCopy}`,
      `Sanitized diagnostic: ${input.diagnostic}`,
      "",
      "Review the operational delivery status in Get Phame Admin.",
    ].join("\n"),
  };
}

/**
 * Sends the Get Phame owner a privacy-minimized incident email only after a Slack
 * delivery attempt fails. The recipient is derived server-side from OWNER_OPEN_ID.
 */
export async function sendRelayAlertEmailFallback(
  input: RelayAlertEmailFallbackInput
): Promise<RelayAlertEmailFallbackResult> {
  const ownerOpenId = ENV.ownerOpenId.trim();
  if (!ownerOpenId) {
    return {
      attempted: false,
      delivered: false,
      reason: "owner_email_unavailable",
    };
  }

  const owner = await getUserByOpenId(ownerOpenId).catch(() => undefined);
  const recipient = owner?.email?.trim().toLowerCase();
  if (!recipient) {
    return {
      attempted: false,
      delivered: false,
      reason: "owner_email_unavailable",
    };
  }

  const hasPrimary = Boolean(
    process.env.SYSTEM_SMTP_HOST?.trim() &&
      process.env.SYSTEM_SMTP_USER?.trim() &&
      process.env.SYSTEM_SMTP_PASS?.trim()
  );
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY?.trim());
  if (!hasPrimary && !hasSendGrid) {
    return {
      attempted: false,
      delivered: false,
      reason: "email_transport_unavailable",
    };
  }

  const copy = fallbackCopy(input);
  const { HELLO_FROM, sendSystemEmail } = await import("./sendgrid");

  try {
    await sendSystemEmail({
      to: recipient,
      from: HELLO_FROM,
      replyTo: HELLO_FROM,
      subject: copy.subject,
      text: copy.text,
      suppressRelayAlert: true,
      html: `<!doctype html><html lang="en"><body style="margin:0;padding:32px;background:#f6f7f9;color:#10213d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:auto;background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:32px"><h1 style="margin:0 0 20px;font-size:22px;color:#0b1d3a">GET <span style="color:#D4A017">PHAME</span></h1><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(copy.text)}</p></main></body></html>`,
    });
    return { attempted: true, delivered: true, reason: "delivered" };
  } catch (error) {
    console.warn("[RelayHealth] Slack email fallback delivery failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return { attempted: true, delivered: false, reason: "delivery_failed" };
  }
}
