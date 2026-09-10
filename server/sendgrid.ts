/**
 * sendgrid.ts — System email relay via SendGrid API
 *
 * Used for platform-generated operational emails (magic links, auth, account,
 * support, and administrator-controlled previews). It is server-managed only:
 * customer outreach must never receive a SendGrid credential, select this relay,
 * or call this helper through a user mail-connection procedure.
 *
 * Delivery priority:
 *   1. Primary: Verified managed SYSTEM_SMTP_* nodemailer transport (e.g. Amazon SES / Resend)
 *   2. Backup failover: SendGrid API via @sendgrid/mail when SENDGRID_API_KEY is configured
 *
 * User-facing review request emails still use the user's own SMTP credentials (smtp.ts).
 *
 * Sender policy:
 *   SYSTEM_NOREPLY_EMAIL (default: no-reply@getphame.app)
 *     → transactional / auth emails: magic links, welcome, account deletion
 *   SYSTEM_HELLO_EMAIL  (default: hello@getphame.app)
 *     → conversational emails: admin platform, lead guide, support
 */

import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";
import {
  recordRelayEvent,
  reserveRelayAlert,
  sanitizeRelayDiagnostic,
  sendSlackWebhookNotification,
  startRelayOutage,
} from "./relayHealth";
import { sendRelayAlertEmailFallback } from "./relayAlertEmail";

export interface SystemEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // explicit override; prefer the helpers below
  replyTo?: string;
  /** Internal incident fallback delivery only; prevents recursive alert escalation. */
  suppressRelayAlert?: boolean;
}

/** Transactional sender — magic links, auth, account deletion, welcome. */
export const NOREPLY_FROM =
  process.env.SYSTEM_NOREPLY_EMAIL?.trim() ?? "no-reply@getphame.app";
/** Conversational sender — admin messages, lead guide, support. */
export const HELLO_FROM =
  process.env.SYSTEM_HELLO_EMAIL?.trim() ?? "hello@getphame.app";

/**
 * Send a system email.
 * Prefers verified managed SYSTEM_SMTP_*; uses SendGrid API as a backup failover when configured.
 */
export async function sendSystemEmail(opts: SystemEmailOptions): Promise<void> {
  const fromEmail = opts.from ?? NOREPLY_FROM;
  const fromDisplay = `"Get Phame" <${fromEmail}>`;

  // ── 1. Primary path: Managed SYSTEM_SMTP_* transport ───────────────────
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "587", 10);
  const hasSystemSmtp = Boolean(host && user && pass && Number.isFinite(port));

  if (hasSystemSmtp && host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: {
          rejectUnauthorized: process.env.ALLOW_INSECURE_SMTP_TLS !== "true",
        },
      });

      await transporter.sendMail({
        from: fromDisplay,
        replyTo: opts.replyTo ?? fromEmail,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? stripHtml(opts.html),
      });
      return;
    } catch (primaryError) {
      const hasSendgrid = Boolean(
        process.env.SENDGRID_API_KEY?.trim() || ENV.sendgridApiKey
      );
      const errorMessage =
        primaryError instanceof Error
          ? primaryError.message
          : "Primary SMTP send failed";
      const safeError = sanitizeRelayDiagnostic(errorMessage);
      const recipientDomainMatch = opts.to.match(/@([^>\s,]+)/);
      console.warn(
        "[SystemEmail] Primary SYSTEM_SMTP delivery failed; evaluating configured SendGrid failover",
        {
          errorType:
            primaryError instanceof Error ? primaryError.name : "UnknownError",
          backupConfigured: hasSendgrid,
        }
      );
      recordRelayEvent({
        fromProvider: "system_smtp",
        toProvider: hasSendgrid ? "sendgrid" : "none",
        reason: safeError,
        source: "outbound_send",
      });

      if (!opts.suppressRelayAlert) {
        const checkedAt = Date.now();
        const outage = await startRelayOutage(
          safeError,
          "outbound_send",
          checkedAt
        );
        const alertReservation = await reserveRelayAlert(outage.id, checkedAt);
        if (alertReservation.permitted) {
          const slackDelivered = await sendSlackWebhookNotification({
            title: hasSendgrid
              ? "⚠️ Get Phame: Outbound Email Failed Over to SendGrid"
              : "🚨 Get Phame: Outbound Email Failed (No SendGrid Backup)",
            color: hasSendgrid ? "#f59e0b" : "#e11d48",
            fields: [
              { title: "Event", value: "Runtime Outbound Send Error" },
              {
                title: "Recipient Domain",
                value: recipientDomainMatch?.[1] ?? "unknown",
              },
              { title: "Error", value: safeError.slice(0, 150) },
              { title: "Timestamp", value: new Date(checkedAt).toUTCString() },
            ],
          });

          if (!slackDelivered) {
            await sendRelayAlertEmailFallback({
              event: "failure",
              activeRelay: hasSendgrid ? "sendgrid" : "none",
              checkedAt,
              source: "outbound_send",
              diagnostic: safeError,
            });
          }
        }
      }

      if (!hasSendgrid) {
        throw primaryError;
      }
      // Fall through to SendGrid backup path below
    }
  }

  // ── 2. Backup path: SendGrid API failover ──────────────────────────────
  const sendgridKey =
    process.env.SENDGRID_API_KEY?.trim() || ENV.sendgridApiKey;
  if (sendgridKey) {
    sgMail.setApiKey(sendgridKey);
    await sgMail.send({
      to: opts.to,
      from: fromDisplay,
      replyTo: opts.replyTo ?? fromEmail,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? stripHtml(opts.html),
    });
    return;
  }

  console.warn(
    "[SystemEmail] Skipped — neither primary SYSTEM_SMTP_* nor backup SENDGRID_API_KEY are configured"
  );
}

/** Minimal HTML → plain-text fallback (strips tags, collapses whitespace). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
