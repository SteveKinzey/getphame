import { createTransporter } from "./smtp";

export const ADMIN_GENERAL_FROM_EMAIL = "hello@getphame.app";
export const ADMIN_MESSAGE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_SUBJECT_CHARS = 180;
const MAX_BODY_CHARS = 12_000;

export type AdminPlatformEmailTemplate = "smtp_onboarding" | "custom";

function compact(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function sanitizeAdminMessage(input: { subject: string; bodyText: string }) {
  const subject = compact(input.subject);
  const bodyText = input.bodyText.trim();
  if (!subject || subject.length > MAX_SUBJECT_CHARS) throw new Error(`Subject is required and must be ${MAX_SUBJECT_CHARS} characters or fewer.`);
  if (!bodyText || bodyText.length > MAX_BODY_CHARS) throw new Error(`Message is required and must be ${MAX_BODY_CHARS.toLocaleString()} characters or fewer.`);
  return { subject, bodyText };
}

export function buildSmtpOnboardingTemplate(recipientName?: string | null) {
  const greeting = recipientName?.trim() ? `Hi ${recipientName.trim()},` : "Hi,";
  const subject = "Welcome to Get Phame — connect your sending email";
  const bodyText = `${greeting}

Welcome to Get Phame. Connecting your own sending email lets review requests come from an address your customers recognize.

In Get Phame, open Settings → Email sending and enter the email address plus the app password or SMTP password from your provider. Never send your password to us by email.

Common provider setup paths:
• Gmail or Google Workspace: enable 2-Step Verification, then create a Google App Password for Mail.
• Microsoft 365 / Outlook: use SMTP AUTH if your tenant allows it, or an app password where your Microsoft account supports one.
• Outlook.com, Live, or Hotmail: use an app password if two-step verification is enabled.
• Yahoo!: create an App Password in Account Security.
• Zoho Mail: create an app-specific password and use the SMTP details shown in Zoho Mail settings.
• iCloud Mail: create an app-specific password at appleid.apple.com.
• AOL: create an app password in Account Security.
• Proton Mail: use Proton Mail Bridge; direct SMTP is not available without it.
• Fastmail: create an app password in Settings → Password & Security.
• Another provider or custom domain: use the SMTP host, port, encryption setting, username, and app password supplied by your provider.

If you need help, reply to hello@getphame.app with your provider name. Do not include a password, app password, or verification code.

— Get Phame`;
  return { subject, bodyText, template: "smtp_onboarding" as const };
}

export async function sendAdminPlatformEmail(input: { to: string; subject: string; bodyText: string; replyTo?: string }) {
  const host = process.env.SYSTEM_SMTP_HOST;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "465", 10);
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const configuredFrom = process.env.HELLO_FROM_EMAIL?.trim() || ADMIN_GENERAL_FROM_EMAIL;
  if (!host || !user || !pass || !Number.isFinite(port)) return { sent: false, providerMessageId: null, failureCode: "not_configured" };
  if (configuredFrom.toLowerCase() !== ADMIN_GENERAL_FROM_EMAIL) return { sent: false, providerMessageId: null, failureCode: "invalid_from_address" };
  try {
    const transporter = createTransporter({ host, port, secure: port === 465, user, pass });
    const result = await transporter.sendMail({
      from: `"Get Phame" <${ADMIN_GENERAL_FROM_EMAIL}>`, to: input.to, replyTo: input.replyTo || ADMIN_GENERAL_FROM_EMAIL,
      subject: input.subject, text: input.bodyText,
      html: `<!doctype html><html lang="en"><body style="margin:0;padding:32px;background:#f6f7f9;color:#10213d;font-family:Arial,sans-serif"><main style="max-width:640px;margin:auto;background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:32px"><h1 style="margin:0 0 20px;font-size:22px;color:#0b1d3a">Get Phame</h1><div style="white-space:pre-wrap;line-height:1.6">${escapeHtml(input.bodyText)}</div></main></body></html>`,
    });
    const accepted = Array.isArray(result.accepted) && result.accepted.length > 0;
    return { sent: accepted, providerMessageId: typeof result.messageId === "string" ? result.messageId.slice(0, 255) : null, failureCode: accepted ? null : "not_accepted" };
  } catch (error) {
    console.warn("[AdminPlatformEmail] Provider delivery failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return { sent: false, providerMessageId: null, failureCode: "delivery_failed" };
  }
}
