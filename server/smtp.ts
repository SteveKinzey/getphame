/**
 * SMTP email sending helpers for ReviewLink.
 * Replaces Gmail API OAuth — users connect any email account using
 * their standard SMTP credentials (email + password/app-password).
 *
 * Passwords are AES-256-GCM encrypted at rest using JWT_SECRET as the key material.
 */

import nodemailer from "nodemailer";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { getDb } from "./db";
import { smtpCredentials } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Encryption helpers ────────────────────────────────────────────────────────

function getDerivedKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "fallback-secret-change-me";
  // Derive a 32-byte key from JWT_SECRET via SHA-256
  return createHash("sha256").update(secret).digest();
}

export function encryptPassword(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(32 hex) + tag(32 hex) + ciphertext(hex)
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export function decryptPassword(encoded: string): string {
  const key = getDerivedKey();
  const iv = Buffer.from(encoded.slice(0, 32), "hex");
  const tag = Buffer.from(encoded.slice(32, 64), "hex");
  const ciphertext = Buffer.from(encoded.slice(64), "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

// ── SMTP host auto-detection ──────────────────────────────────────────────────

const KNOWN_HOSTS: Record<string, { host: string; port: number; secure: number }> = {
  "gmail.com": { host: "smtp.gmail.com", port: 587, secure: 0 },
  "googlemail.com": { host: "smtp.gmail.com", port: 587, secure: 0 },
  "outlook.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "hotmail.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "live.com": { host: "smtp-mail.outlook.com", port: 587, secure: 0 },
  "yahoo.com": { host: "smtp.mail.yahoo.com", port: 587, secure: 0 },
  "yahoo.co.uk": { host: "smtp.mail.yahoo.com", port: 587, secure: 0 },
  "icloud.com": { host: "smtp.mail.me.com", port: 587, secure: 0 },
  "me.com": { host: "smtp.mail.me.com", port: 587, secure: 0 },
  "zoho.com": { host: "smtp.zoho.com", port: 587, secure: 0 },
  "zohomail.com": { host: "smtp.zoho.com", port: 587, secure: 0 },
  "aol.com": { host: "smtp.aol.com", port: 587, secure: 0 },
  "protonmail.com": { host: "smtp.protonmail.com", port: 587, secure: 0 },
  "proton.me": { host: "smtp.protonmail.com", port: 587, secure: 0 },
  "fastmail.com": { host: "smtp.fastmail.com", port: 587, secure: 0 },
};

export function detectSmtpSettings(email: string): { host: string; port: number; secure: number } | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return KNOWN_HOSTS[domain] ?? null;
}

export function getAppPasswordHint(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "Gmail requires an App Password when 2-Step Verification is on. Go to myaccount.google.com → Security → App Passwords to create one.";
  }
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") {
    return "Outlook may require an App Password if two-step verification is enabled. Go to account.microsoft.com → Security → Advanced security options.";
  }
  if (domain === "yahoo.com") {
    return "Yahoo requires an App Password. Go to account.yahoo.com → Security → Generate app password.";
  }
  return null;
}

// ── Transporter factory ───────────────────────────────────────────────────────

export function createTransporter(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}) {
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: { user: opts.user, pass: opts.pass },
    tls: { rejectUnauthorized: false }, // allow self-signed certs on cPanel hosts
  });
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getSmtpCredentials(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(smtpCredentials)
    .where(eq(smtpCredentials.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function saveSmtpCredentials(
  userId: number,
  opts: {
    host: string;
    port: number;
    secure: number;
    user: string;
    password: string;
    fromName?: string;
    replyTo?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const encryptedPass = encryptPassword(opts.password);
  const existing = await getSmtpCredentials(userId);
  if (existing) {
    await db
      .update(smtpCredentials)
      .set({
        host: opts.host,
        port: opts.port,
        secure: opts.secure,
        user: opts.user,
        encryptedPass,
        fromName: opts.fromName ?? null,
        replyTo: opts.replyTo ?? null,
        verified: 0,
      })
      .where(eq(smtpCredentials.userId, userId));
  } else {
    await db.insert(smtpCredentials).values({
      userId,
      host: opts.host,
      port: opts.port,
      secure: opts.secure,
      user: opts.user,
      encryptedPass,
      fromName: opts.fromName ?? null,
      replyTo: opts.replyTo ?? null,
      verified: 0,
    });
  }
}

export async function deleteSmtpCredentials(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(smtpCredentials).where(eq(smtpCredentials.userId, userId));
}

export async function markSmtpVerified(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(smtpCredentials)
    .set({ verified: 1 })
    .where(eq(smtpCredentials.userId, userId));
}

// ── Send email via stored SMTP credentials ────────────────────────────────────

export interface SendMailOptions {
  userId: number;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMailViaSmtp(opts: SendMailOptions): Promise<void> {
  const creds = await getSmtpCredentials(opts.userId);
  if (!creds) throw new Error("No email account connected. Please connect your email in Settings.");

  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });

  const fromName = creds.fromName ?? creds.user;
  const from = `"${fromName}" <${creds.user}>`;
  const replyTo = creds.replyTo ?? creds.user;

  await transporter.sendMail({
    from,
    replyTo,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

// ── Test connection ───────────────────────────────────────────────────────────

export async function testSmtpConnection(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const transporter = createTransporter(opts);
    await transporter.verify();
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ── Welcome email ─────────────────────────────────────────────────────────────

/**
 * Sends a branded welcome/confirmation email to the user's own connected address.
 * Called automatically after smtp.connect succeeds so the user can verify
 * their connection works and see a preview of what their customers will receive.
 */
export async function sendWelcomeEmail(userId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const creds = await getSmtpCredentials(userId);
    if (!creds) return { ok: false, error: "No SMTP credentials found" };

    const fromName = creds.fromName ?? creds.user;
    const toAddress = creds.replyTo ?? creds.user;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're connected to ReviewLink!</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a2a5e;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">ReviewLink</p>
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">Your email is connected! 🚀</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">
                Hi ${fromName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                This email confirms that <strong>${creds.user}</strong> is successfully connected to ReviewLink. Your review request emails will be sent from this address — so they land in your customers' inboxes looking like a personal message from you, not a bulk mailer.
              </p>

              <!-- Sample preview box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e4f0;border-radius:12px;margin:24px 0;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0a500;">Sample review request</p>
                    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a2a5e;">Subject: We'd love your feedback!</p>
                    <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
                      Hi [Customer Name],<br/><br/>
                      Thank you for choosing us! We'd really appreciate it if you could take 60 seconds to leave us a review — it helps other customers find us and means the world to our team.<br/><br/>
                      <a href="#" style="color:#1a2a5e;font-weight:700;">⭐ Leave a Review</a><br/><br/>
                      Thank you so much,<br/>
                      ${fromName}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Ready to start collecting reviews? Head to the app and send your first request — it takes less than 30 seconds.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#1a2a5e;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://reviewlink.app/send" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">Send Your First Review Request →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because you just connected your email to ReviewLink.<br/>
                <a href="https://reviewlink.app/settings" style="color:#1a2a5e;">Manage your settings</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Hi ${fromName},\n\nYour email (${creds.user}) is now connected to ReviewLink.\n\nYou're ready to send review requests to your customers. Head to https://reviewlink.app/send to get started.\n\n— The ReviewLink Team`;

    await sendMailViaSmtp({
      userId,
      to: toAddress,
      subject: "You're connected to ReviewLink! 🚀",
      html,
      text,
    });

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
