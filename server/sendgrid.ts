/**
 * sendgrid.ts — System email relay via SendGrid API
 *
 * Used for all platform-generated emails (magic links, auth, reminders, health alerts).
 * Falls back to the legacy SYSTEM_SMTP_* nodemailer path when SENDGRID_API_KEY is absent
 * so existing deployments continue to work without any config change.
 *
 * User-facing review request emails still use the user's own SMTP credentials (smtp.ts).
 */

import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

export interface SystemEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;   // defaults to SYSTEM_FROM_EMAIL or no-reply@getphame.com
  replyTo?: string;
}

/**
 * Send a system email.
 * Prefers SendGrid when SENDGRID_API_KEY is set; falls back to SYSTEM_SMTP_* otherwise.
 */
export async function sendSystemEmail(opts: SystemEmailOptions): Promise<void> {
  const fromEmail = opts.from
    ?? process.env.SYSTEM_FROM_EMAIL?.trim()
    ?? "no-reply@getphame.com";
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
