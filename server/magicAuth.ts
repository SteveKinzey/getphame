/**
 * Magic Link Authentication
 *
 * Passwordless email sign-in for Get Phame.
 * Users enter any valid email → receive a one-time link → click it → session created.
 *
 * Routes:
 *   POST /api/auth/magic/send    → validates email, creates token, sends magic link email
 *   GET  /api/auth/magic/verify  → verifies token, creates session cookie, redirects to /
 *
 * Security:
 *   - Tokens are 32-byte cryptographically random hex strings (64 chars)
 *   - Tokens expire after 15 minutes
 *   - Tokens are single-use (marked usedAt on consumption)
 *   - Rate-limited to 3 requests per email per 10 minutes (via in-memory map)
 *   - Sends via owner's configured SMTP (same pattern as welcome emails)
 */

import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getDb } from "./db";
import * as db from "./db";
import { magicLinkTokens } from "../drizzle/schema";
import { getSmtpCredentials, createTransporter, decryptPassword } from "./smtp";
import { renderGetPhameEmailHeader } from "./platformEmailBrand";

const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Simple in-memory rate limiter: email → [timestamps]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const timestamps = (rateLimitMap.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (timestamps.length >= RATE_LIMIT_MAX) return true;
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function buildAppBaseUrl(req: Request): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL.replace(/\/$/, "");
  }
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "getphame.app";
  return `${proto}://${host}`;
}

async function sendMagicLinkEmail(opts: {
  ownerUserId: number;
  toEmail: string;
  magicUrl: string;
}): Promise<void> {
  const creds = await getSmtpCredentials(opts.ownerUserId);
  if (!creds) {
    throw new Error("Owner SMTP not configured — cannot send magic link.");
  }

  const fromName = creds.fromName ?? creds.user;
  const from = `"${fromName}" <${creds.user}>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Phame Sign-In Link</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          ${renderGetPhameEmailHeader("Your sign-in link")}
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#333;line-height:1.6;">Hi there,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.7;">
                Click the button below to sign in to Get Phame. This link expires in <strong>15 minutes</strong> and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#f0a500;border-radius:10px;padding:16px 40px;text-align:center;">
                    <a href="${opts.magicUrl}" style="color:#1a2744;font-size:16px;font-weight:800;text-decoration:none;">Sign In to Phame →</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.6;">
                Or copy and paste this URL into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#aaa;word-break:break-all;line-height:1.6;">
                ${opts.magicUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                If you didn't request this, you can safely ignore this email.<br/>
                This link expires in 15 minutes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Sign in to Get Phame\n\nClick this link to sign in (expires in 15 minutes):\n${opts.magicUrl}\n\nIf you didn't request this, ignore this email.`;

  const pass = decryptPassword(creds.encryptedPass);
  const transporter = createTransporter({
    host: creds.host,
    port: creds.port,
    secure: creds.secure === 1,
    user: creds.user,
    pass,
  });

  await transporter.sendMail({
    from,
    replyTo: creds.replyTo ?? creds.user,
    to: opts.toEmail,
    subject: "Your Get Phame sign-in link",
    html,
    text,
  });
}

export function registerMagicAuthRoutes(app: Express) {
  /**
   * POST /api/auth/magic/send
   * Body: { email: string }
   * Sends a magic link to the provided email address.
   */
  app.post("/api/auth/magic/send", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isRateLimited(normalizedEmail)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a few minutes before trying again.",
      });
    }

    try {
      const database = await getDb();
      if (!database) {
        return res.status(500).json({ error: "Database unavailable." });
      }

      // Generate a secure random token
      const token = randomBytes(32).toString("hex");
      const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MS;

      // Store the token
      await database.insert(magicLinkTokens).values({
        email: normalizedEmail,
        token,
        expiresAt,
      });

      // Build the magic link URL
      const baseUrl = buildAppBaseUrl(req);
      const magicUrl = `${baseUrl}/api/auth/magic/verify?token=${token}`;

      // Send via owner's SMTP
      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (!ownerUser) {
        console.error("[MagicAuth] Owner user not found — cannot send magic link.");
        return res.status(500).json({ error: "Email service not configured. Please try Google or Apple sign-in." });
      }

      await sendMagicLinkEmail({
        ownerUserId: ownerUser.id,
        toEmail: normalizedEmail,
        magicUrl,
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error("[MagicAuth] Send failed:", err);
      return res.status(500).json({ error: "Failed to send magic link. Please try again or use Google/Apple sign-in." });
    }
  });

  /**
   * GET /api/auth/magic/verify?token=...
   * Validates the token, creates a session, and redirects to /.
   */
  app.get("/api/auth/magic/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;

    if (!token) {
      return res.redirect(302, "/?auth_error=invalid_magic_link");
    }

    try {
      const database = await getDb();
      if (!database) {
        return res.redirect(302, "/?auth_error=db_unavailable");
      }

      // Look up the token
      const rows = await database
        .select()
        .from(magicLinkTokens)
        .where(
          and(
            eq(magicLinkTokens.token, token),
            isNull(magicLinkTokens.usedAt)
          )
        )
        .limit(1);

      if (rows.length === 0) {
        return res.redirect(302, "/?auth_error=invalid_magic_link");
      }

      const record = rows[0];

      // Check expiry
      if (record.expiresAt < Date.now()) {
        return res.redirect(302, "/?auth_error=magic_link_expired");
      }

      // Mark token as used
      await database
        .update(magicLinkTokens)
        .set({ usedAt: Date.now() })
        .where(eq(magicLinkTokens.id, record.id));

      const email = record.email;

      // Derive a stable openId from the email for magic-link users
      const openId = `email_${email}`;

      // Check if new user
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      // Upsert the user
      await db.upsertUser({
        openId,
        name: null, // no name from email-only sign-in
        email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users (fire-and-forget)
      if (isNewUser) {
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          const { sendUserWelcomeEmail } = await import("./smtp");
          sendUserWelcomeEmail({
            ownerUserId: ownerUser.id,
            toEmail: email,
            toName: null,
          }).catch((err: unknown) => {
            console.warn("[MagicAuth] Welcome email failed (non-fatal):", err);
          });
        }
      }

      // Create session JWT
      const sessionToken = await sdk.createSessionToken(openId, {
        name: email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      return res.redirect(302, "/");
    } catch (err) {
      console.error("[MagicAuth] Verify failed:", err);
      return res.redirect(302, "/?auth_error=failed");
    }
  });
}
