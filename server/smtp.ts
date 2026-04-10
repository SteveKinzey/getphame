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
