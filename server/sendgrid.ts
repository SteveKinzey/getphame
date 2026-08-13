/**
 * sendgrid.ts — System email relay via SendGrid API
 *
 * Used for platform-generated operational emails (magic links, auth, account,
 * support, and administrator-controlled previews). It is server-managed only:
 * customer outreach must never receive a SendGrid credential, select this relay,
 * or call this helper through a user mail-connection procedure.
 * Falls back to the legacy SYSTEM_SMTP_* nodemailer path when SENDGRID_API_KEY is absent
 * so existing deployments continue to work without any config change.
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

export interface SystemEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;   // explicit override; prefer the helpers below
  replyTo?: string;
}

/** Transactional sender — magic links, auth, account deletion, welcome. */
export const NOREPLY_FROM = process.env.SYSTEM_NOREPLY_EMAIL?.trim() ?? "no-reply@getphame.app";
/** Conversational sender — admin messages, lead guide, support. */
export const HELLO_FROM = process.env.SYSTEM_HELLO_EMAIL?.trim() ?? "hello@getphame.app";

/**
 * Send a system email.
 * Prefers SendGrid when SENDGRID_API_KEY is set; falls back to SYSTEM_SMTP_* otherwise.
 */
export async function sendSystemEmail(opts: SystemEmailOptions): Promise<void> {
  const fromEmail = opts.from
    ?? NOREPLY_FROM;
  const fromDisplay = `"Get Phame" <${fromEmail}>`;

  if (ENV.sendgridApiKey) {
    // ── SendGrid path ──────────────────────────────────────────────────────
    sgMail.setApiKey(ENV.sendgridApiKey);
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

  // ── Legacy SYSTEM_SMTP_* nodemailer fallback ───────────────────────────
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "587", 10);

  if (!host || !user || !pass) {
    console.warn("[SystemEmail] Skipped — neither SENDGRID_API_KEY nor SYSTEM_SMTP_* are configured");
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.ALLOW_INSECURE_SMTP_TLS !== "true" },
  });

  await transporter.sendMail({
    from: fromDisplay,
    replyTo: opts.replyTo ?? fromEmail,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? stripHtml(opts.html),
  });
}

/** Minimal HTML → plain-text fallback (strips tags, collapses whitespace). */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
