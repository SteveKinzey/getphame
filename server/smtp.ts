/**
 * SMTP email sending helpers for Get Phame.
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
import { notifySmtpFailureTransition } from "./smtpHealthAlerts";

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

export function getAppPasswordHint(email: string, host?: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return "Gmail requires an App Password when 2-Step Verification is on. Go to myaccount.google.com → Security → App Passwords to create one.";
  }
  // Google Workspace: custom domain using smtp.gmail.com as host
  if (host === "smtp.gmail.com" && domain && domain !== "gmail.com" && domain !== "googlemail.com") {
    return "Google Workspace requires an App Password. Go to myaccount.google.com → Security → App Passwords and create one for \"Mail\".";
  }
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") {
    return "Outlook may require an App Password if two-step verification is enabled. Go to account.microsoft.com → Security → Advanced security options.";
  }
  if (domain === "yahoo.com") {
    return "Yahoo requires an App Password. Go to account.yahoo.com → Security → Generate app password.";
  }
  if (domain === "zoho.com" || domain === "zohomail.com" || host === "smtp.zoho.com") {
    return "Zoho Mail requires SMTP access to be enabled first. Go to mail.zoho.com → Settings → Mail Accounts → SMTP and enable \"Allow SMTP Access\".";
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
  <title>You're connected to Get Phame!</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
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
                This email confirms that <strong>${creds.user}</strong> is successfully connected to Get Phame. Your review request emails will be sent from this address — so they land in your customers' inboxes looking like a personal message from you, not a bulk mailer.
              </p>

              <!-- Sample preview box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e4f0;border-radius:12px;margin:24px 0;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0a500;">Sample review request</p>
                    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#1a2744;">Subject: We'd love your feedback!</p>
                    <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
                      Hi [Customer Name],<br/><br/>
                      Thank you for choosing us! We'd really appreciate it if you could take 60 seconds to leave us a review — it helps other customers find us and means the world to our team.<br/><br/>
                      <a href="#" style="color:#1a2744;font-weight:700;">⭐ Leave a Review</a><br/><br/>
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
                  <td style="background:#1a2744;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/send" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">Send Your First Review Request →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because you just connected your email to Get Phame.<br/>
                <a href="https://getphame.app/settings" style="color:#1a2744;">Manage your settings</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Hi ${fromName},\n\nYour email (${creds.user}) is now connected to Get Phame.\n\nYou're ready to send review requests to your customers. Head to https://getphame.app/send to get started.\n\n— The Get Phame Team`;

    await sendMailViaSmtp({
      userId,
      to: toAddress,
      subject: "You're connected to Get Phame! 🚀",
      html,
      text,
    });

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

/** Update only the fromName field on an existing SMTP credential row */
export async function updateSmtpFromName(userId: number, fromName: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(smtpCredentials)
    .set({ fromName: fromName || null })
    .where(eq(smtpCredentials.userId, userId));
}

// ── Daily health check ────────────────────────────────────────────────────────

/**
 * Runs a silent SMTP connection test for every connected user.
 * Updates lastHealthCheck (Unix ms) and lastHealthStatus ('ok'|'fail') on each row.
 * Called once per day from the server cron job.
 */
export async function runSmtpHealthChecks(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const allCreds = await db.select().from(smtpCredentials);
  console.log(`[SmtpHealthCheck] Running checks for ${allCreds.length} connected account(s)...`);

  // Track failures by provider host for aggregate reporting
  const providerFailures: Record<string, { count: number; errors: string[] }> = {};

  for (const creds of allCreds) {
    try {
      const pass = decryptPassword(creds.encryptedPass);
      const result = await testSmtpConnection({
        host: creds.host,
        port: creds.port,
        secure: creds.secure === 1,
        user: creds.user,
        pass,
      });
      if (result.ok) {
        const checkedAt = Date.now();
        await db
          .update(smtpCredentials)
          .set({ lastHealthCheck: checkedAt, lastHealthStatus: "ok", lastHealthError: null })
          .where(eq(smtpCredentials.userId, creds.userId));
        console.log(`[SmtpHealthCheck] userId=${creds.userId} host=${creds.host} → ✓ ok`);
      } else {
        const errMsg = result.error ?? "Unknown error";
        const checkedAt = Date.now();
        await db
          .update(smtpCredentials)
          .set({ lastHealthCheck: checkedAt, lastHealthStatus: "fail", lastHealthError: errMsg.slice(0, 500) })
          .where(eq(smtpCredentials.userId, creds.userId));
        await notifySmtpFailureTransition({
          previousStatus: creds.lastHealthStatus as "ok" | "fail" | null,
          accountEmail: creds.user,
          host: creds.host,
          checkedAt,
          error: errMsg,
        });
        console.warn(`[SmtpHealthCheck] userId=${creds.userId} host=${creds.host} → ✗ fail: ${errMsg}`);
        // Aggregate by provider host
        if (!providerFailures[creds.host]) providerFailures[creds.host] = { count: 0, errors: [] };
        providerFailures[creds.host].count++;
        if (providerFailures[creds.host].errors.length < 3) providerFailures[creds.host].errors.push(errMsg);
      }
    } catch (err) {
      // Don't let one failure abort the whole batch
      const errMsg = err instanceof Error ? err.message : String(err);
      const checkedAt = Date.now();
      console.error(`[SmtpHealthCheck] userId=${creds.userId} host=${creds.host} threw:`, errMsg);
      await db
        .update(smtpCredentials)
        .set({ lastHealthCheck: checkedAt, lastHealthStatus: "fail", lastHealthError: errMsg.slice(0, 500) })
        .where(eq(smtpCredentials.userId, creds.userId));
      await notifySmtpFailureTransition({
        previousStatus: creds.lastHealthStatus as "ok" | "fail" | null,
        accountEmail: creds.user,
        host: creds.host,
        checkedAt,
        error: errMsg,
      });
      if (!providerFailures[creds.host]) providerFailures[creds.host] = { count: 0, errors: [] };
      providerFailures[creds.host].count++;
      if (providerFailures[creds.host].errors.length < 3) providerFailures[creds.host].errors.push(errMsg);
    }
  }

  // Log provider-level failure summary
  const failingHosts = Object.keys(providerFailures);
  if (failingHosts.length > 0) {
    console.warn("[SmtpHealthCheck] Provider failure summary:");
    for (const host of failingHosts) {
      const { count, errors } = providerFailures[host];
      console.warn(`  ${host}: ${count} failure(s) — ${errors.join(" | ")}`);
    }
  }
  console.log(`[SmtpHealthCheck] Done. ${allCreds.length} checked, ${failingHosts.reduce((t, h) => t + providerFailures[h].count, 0)} failed.`);
}

// ── Transactional emails (sent from owner's SMTP to app users) ────────────────

/**
 * Send a welcome email to a new user via the owner's connected SMTP.
 * Silently skips if the owner has no SMTP configured.
 */
export async function sendUserWelcomeEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return; // Owner has no SMTP — skip gracefully

  const fromName = creds.fromName ?? creds.user;
  const displayName = opts.toName || "there";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Get Phame!</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">Welcome aboard! 🚀</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Thanks for joining Get Phame! You're now set up to send personalised review request emails directly from your own email account — so your customers see a message from <em>you</em>, not a bulk mailer.
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Here's how to get started in 3 steps:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;border:1px solid #e0e4f0;border-radius:12px;margin:0 0 24px;">
                <tr><td style="padding:20px 24px;">
                  <p style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;"><strong>1.</strong> Connect your email account in Settings</p>
                  <p style="margin:0 0 10px;font-size:14px;color:#1a2744;line-height:1.6;"><strong>2.</strong> Add your Google (or Yelp, TripAdvisor, etc.) review link</p>
                  <p style="margin:0;font-size:14px;color:#1a2744;line-height:1.6;"><strong>3.</strong> Send your first review request — takes under 30 seconds</p>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#1a2744;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Get Started →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because you signed up for Get Phame.<br/>
                <a href="https://getphame.app/settings" style="color:#1a2744;">Manage your settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${displayName},\n\nWelcome to Get Phame!\n\nYou're now set up to send personalised review request emails directly from your own email account.\n\nGet started at https://getphame.app\n\n— ${fromName}`;

  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: "Welcome to Get Phame! 🚀",
    html,
    text,
  });
}

/**
 * Send an upgrade receipt/confirmation email to a user via the owner's connected SMTP.
 * Silently skips if the owner has no SMTP configured.
 */
export async function sendUpgradeReceiptEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
  tier: "pro" | "annual" | "lifetime";
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return;

  const fromName = creds.fromName ?? creds.user;
  const displayName = opts.toName || "there";

  const tierLabels: Record<string, string> = {
    pro: "Pro Monthly",
    annual: "Pro Annual",
    lifetime: "Lifetime",
  };
  const tierLabel = tierLabels[opts.tier] ?? "Pro";

  const tierPerks: Record<string, string[]> = {
    pro: ["Unlimited review requests", "Automated follow-up reminders", "Priority support"],
    annual: ["Everything in Pro Monthly", "2 months free vs monthly billing", "Priority support"],
    lifetime: ["Everything in Pro Annual", "Never pay again — one-time fee", "Lifetime updates included"],
  };
  const perks = tierPerks[opts.tier] ?? [];

  const perksHtml = perks.map(p => `<li style="margin:0 0 8px;font-size:14px;color:#333;line-height:1.6;">✅ ${p}</li>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're now on Get Phame ${tierLabel}!</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
              <h1 style="margin:0;font-size:26px;font-weight:900;color:#ffffff;line-height:1.2;">You're on ${tierLabel}! 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Your Get Phame account has been upgraded to <strong>${tierLabel}</strong>. Here's what you now have access to:
              </p>
              <ul style="margin:0 0 24px;padding:0 0 0 4px;list-style:none;">
                ${perksHtml}
              </ul>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#1a2744;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/send" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Start Sending Reviews →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                Questions? Reply to this email or visit <a href="https://getphame.app/settings" style="color:#1a2744;">your settings</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${displayName},\n\nYour Get Phame account has been upgraded to ${tierLabel}!\n\nStart sending review requests at https://getphame.app/send\n\n— ${fromName}`;

  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: `You're now on Get Phame ${tierLabel}! 🎉`,
    html,
    text,
  });
}

/**
 * Send a churn recovery email when a user cancels their subscription.
 * Silently skips if the owner has no SMTP configured.
 */
export async function sendChurnRecoveryEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return;
  const fromName = creds.fromName ?? creds.user;
  const displayName = opts.toName || "there";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We're sorry to see you go</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">We're sorry to see you go</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">Your Get Phame subscription has been cancelled. Your account has been moved back to the free plan.</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">If you cancelled by mistake, or if there is anything we can do to help, just reply to this email.</p>
              <!-- Discount offer block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#1a2744;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f0a500;">Special offer — just for you</p>
                    <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#ffffff;line-height:1.4;">Come back for <span style="color:#f0a500;">40% off for 3 months</span></p>
                    <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.75);">Use this code at checkout:</p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
                      <tr>
                        <td style="background:#f0a500;border-radius:8px;padding:10px 24px;text-align:center;">
                          <span style="color:#1a2744;font-size:18px;font-weight:900;letter-spacing:4px;">STAY40</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.45);">Valid for 7 days. Apply at checkout when resubscribing.</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">Whenever you are ready to come back, your account is waiting:</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/upgrade" style="color:#1a2744;font-size:15px;font-weight:700;text-decoration:none;">Reactivate My Account</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">Questions? Reply to this email or visit <a href="https://getphame.app/settings" style="color:#1a2744;">your settings</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = `Hi ${displayName},\n\nYour Get Phame subscription has been cancelled and your account is now on the free plan.\n\nIf you cancelled by mistake or want to come back, reactivate at https://getphame.app/upgrade\n\nQuestions? Just reply to this email.\n\n-- ${fromName}`;
  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: "We're sorry to see you go -- Get Phame",
    html,
    text,
  });
}

/**
 * Send a re-engagement email 3 days after the churn recovery email,
 * if the user has still not resubscribed. Softer angle — "here's what you're missing".
 * Silently skips if the owner has no SMTP configured.
 */
export async function sendReEngagementEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
  unsubscribeUrl?: string;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return;
  const fromName = creds.fromName ?? creds.user;
  const displayName = opts.toName || "there";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Here's what you're missing</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">Here's what you're missing</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7;">It's been a few days since your Get Phame subscription ended. We wanted to share a quick reminder of what's waiting for you when you come back:</p>
              <!-- Feature list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:10px 16px;background:#f8f9ff;border-radius:10px;margin-bottom:8px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding-top:2px;">
                          <span style="font-size:16px;">⭐</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#1a2744;">Automated review requests</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#777;">Send personalised review emails from your own inbox — no bulk mailer look.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background:#f8f9ff;border-radius:10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding-top:2px;">
                          <span style="font-size:16px;">📈</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#1a2744;">Follow-up sequences</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#777;">3-day and 10-day reminders that run automatically — more reviews, less manual work.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background:#f8f9ff;border-radius:10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding-top:2px;">
                          <span style="font-size:16px;">🔗</span>
                        </td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#1a2744;">Multi-platform review links</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#777;">Google, Yelp, TripAdvisor, Facebook — send customers exactly where you need reviews.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/upgrade" style="color:#1a2744;font-size:15px;font-weight:700;text-decoration:none;">Come Back — Reactivate Now</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#aaa;text-align:center;">Still not sure? Just reply to this email — we'd love to hear your feedback.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">Questions? Reply to this email or visit <a href="https://getphame.app/settings" style="color:#1a2744;">your settings</a>.</p>
              ${opts.unsubscribeUrl ? `<p style="margin:8px 0 0;font-size:11px;color:#ccc;">Don't want these emails? <a href="${opts.unsubscribeUrl}" style="color:#aaa;text-decoration:underline;">Unsubscribe</a></p>` : ""}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = `Hi ${displayName},\n\nIt's been a few days since your Get Phame subscription ended. Here's what's waiting for you:\n\n• Automated review requests from your own inbox\n• 3-day and 10-day follow-up sequences\n• Multi-platform review links (Google, Yelp, TripAdvisor, Facebook)\n\nCome back: https://getphame.app/upgrade\n\nQuestions? Just reply to this email.\n\n-- ${fromName}${opts.unsubscribeUrl ? `\n\nUnsubscribe from these emails: ${opts.unsubscribeUrl}` : ""}`;
  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: "Here's what you're missing — Get Phame",
    html,
    text,
  });
}

/**
 * Send a payment-failed recovery email when a Stripe charge fails.
 * Prompts the user to update their payment method before the subscription lapses.
 * Silently skips if the owner has no SMTP configured.
 */
export async function sendPaymentFailedEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
  attemptCount: number;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return;
  const fromName = creds.fromName ?? creds.user;
  const displayName = opts.toName || "there";
  const attemptNote =
    opts.attemptCount > 1
      ? `This is attempt ${opts.attemptCount} to charge your card.`
      : "This is the first attempt to charge your card.";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment failed — action required</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#b91c1c;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#fca5a5;">Get Phame</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">Payment failed — action required</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">We were unable to process your Get Phame subscription payment. ${attemptNote}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">To keep your account active and continue sending review requests, please update your payment method as soon as possible.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/settings" style="color:#1a2744;font-size:15px;font-weight:700;text-decoration:none;">Update Payment Method</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">If you need help or believe this is an error, just reply to this email and we'll sort it out.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">Questions? Reply to this email or visit <a href="https://getphame.app/settings" style="color:#1a2744;">your settings</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = `Hi ${displayName},\n\nWe were unable to process your Get Phame subscription payment. ${attemptNote}\n\nPlease update your payment method to keep your account active:\nhttps://getphame.app/settings\n\nQuestions? Just reply to this email.\n\n-- ${fromName}`;
  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: "Action required: payment failed — Get Phame",
    html,
    text,
  });
}

/**
 * Send a re-engagement email to a user who signed up but never sent their first review request.
 * Sent from the platform owner's SMTP (userId=1). Silently skips if no SMTP configured.
 */
export async function sendInactiveUserEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  toName: string | null;
  unsubscribeUrl?: string;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) return;
  const fromName = creds.fromName ?? "Get Phame";
  const displayName = opts.toName || "there";
  const unsubLine = opts.unsubscribeUrl
    ? `<p style="margin:0;font-size:11px;color:#bbb;"><a href="${opts.unsubscribeUrl}" style="color:#bbb;">Unsubscribe</a></p>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your first review request is waiting</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#1a2744;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#f0a500;">Get Phame</p>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">Your first review request is waiting</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi ${displayName},</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7;">You signed up for Get Phame a week ago — but you haven't sent your first review request yet. That's a week of potential 5-star reviews sitting on the table.</p>
              <p style="margin:0 0 20px;font-size:15px;color:#555;line-height:1.7;">It takes under 2 minutes to send your first one. Here's all you need:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:10px 16px;background:#f8f9ff;border-radius:10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding-top:2px;"><span style="font-size:16px;">&#11088;</span></td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#1a2744;">A customer name + email</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#777;">Someone you've helped recently who'd be happy to leave a review.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:10px 16px;background:#f8f9ff;border-radius:10px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="28" style="vertical-align:top;padding-top:2px;"><span style="font-size:16px;">&#128279;</span></td>
                        <td>
                          <p style="margin:0;font-size:14px;font-weight:700;color:#1a2744;">Your review link</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#777;">Google, Yelp, TripAdvisor — wherever you want the review to land.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">Get Phame sends the email from your own inbox — so it looks personal, not automated. Customers are far more likely to act on it.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://getphame.app/send" style="color:#1a2744;font-size:15px;font-weight:900;text-decoration:none;">Send My First Request &#8594;</a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:12px;color:#aaa;text-align:center;">Takes less than 2 minutes</p>
              <p style="margin:28px 0 0;font-size:13px;color:#888;line-height:1.7;border-top:1px solid #f0f0f0;padding-top:20px;"><strong>P.S.</strong> Businesses using Get Phame collect their first 3–5 reviews within 48 hours of signing up. Your competitors are already doing this — don't leave reviews on the table.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0 0 6px;font-size:12px;color:#aaa;line-height:1.6;">
                You received this because you signed up for Get Phame.<br/>
                <a href="https://getphame.app/settings" style="color:#1a2744;">Manage your settings</a>
              </p>
              ${unsubLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = `Hi ${displayName},\n\nYou signed up for Get Phame a week ago but haven't sent your first review request yet.\n\nIt takes under 2 minutes. Go to https://getphame.app/send to send your first one now.\n\n-- ${fromName}`;
  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });
  const from = `"${fromName}" <${creds.user}>`;
  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: displayName !== 'there' ? `${displayName}, your first review request is waiting` : `Your first review request is waiting`,
    html,
    text,
  });
}
