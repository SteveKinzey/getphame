/**
 * Magic Link Authentication — passwordless email login for tRPC + Express apps.
 *
 * Routes:
 *   POST /api/auth/magic-link         → generates token, sends email with login link
 *   GET  /api/auth/magic-link/verify  → validates token, creates/finds user, issues JWT session
 *   POST /api/auth/logout             → clears session cookie
 *
 * Security:
 *   - Tokens are crypto-random 64-char hex strings
 *   - Tokens expire after 15 minutes
 *   - Tokens are single-use (marked as used after verification)
 *   - Generic error messages to prevent user enumeration
 *
 * Email: Uses SYSTEM_SMTP_* env vars (same as leadGuideEmail.ts)
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";
import * as db from "./db";
import { getDb } from "./db";
import { magicLinks } from "../drizzle/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { sendUserWelcomeEmail } from "./smtp";
import {
  classifyAuthDiagnosticError,
  findAuthRequestByToken,
  maskDiagnosticEmail,
  recordAuthLifecycleEvent,
  redactAuthDiagnosticDetail,
} from "./authOperations";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex chars
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// System SMTP config (same pattern as leadGuideEmail.ts)
// ---------------------------------------------------------------------------

interface SystemSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
}

function getSystemSmtpConfig(): SystemSmtpConfig | null {
  const host = process.env.SYSTEM_SMTP_HOST;
  const port = process.env.SYSTEM_SMTP_PORT;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const fromEmail = process.env.SYSTEM_FROM_EMAIL;

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  return {
    host,
    port: parseInt(port ?? "587", 10),
    user,
    pass,
    fromEmail,
  };
}

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function buildMagicLinkEmailHtml(magicLinkUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your GetPhame Login Link</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">
          <tr>
            <td style="background:#0F1B2D;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;line-height:1.2;">
                Get<span style="color:#C9A84C;">Phame</span>
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;text-align:center;">
              <p style="margin:0 0 20px;font-size:16px;color:#333;line-height:1.6;">
                Click below to sign in to GetPhame
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#C9A84C;border-radius:10px;padding:16px 40px;text-align:center;">
                    <a href="${magicLinkUrl}" style="color:#0F1B2D;font-size:16px;font-weight:700;text-decoration:none;display:inline-block;">
                      Sign In to GetPhame
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5;">
                This link expires in 15 minutes.
              </p>
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.5;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8f9ff;padding:20px 40px;text-align:center;border-top:1px solid #e8eaf0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                <a href="https://getphame.app" style="color:#0F1B2D;text-decoration:none;">getphame.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerEmailAuthRoutes(app: Express) {
  /**
   * POST /api/auth/magic-link
   * Body: { email: string }
   *
   * Generates a magic link token, stores it in the DB, and sends an email.
   * If the email doesn't exist yet, the account will be created on verification.
   */
  app.post("/api/auth/magic-link", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    const requestId = crypto.randomUUID();
    const requestStartedAt = Date.now();

    if (!email || !isValidEmail(email)) {
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "request_received",
        outcome: "fail",
        detailCode: "invalid_email",
        detail: "A valid email address is required",
        durationMs: Date.now() - requestStartedAt,
      });
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    void recordAuthLifecycleEvent({
      requestId,
      eventType: "request_received",
      outcome: "ok",
      email: normalizedEmail,
      durationMs: Date.now() - requestStartedAt,
    });

    // Check system SMTP is configured
    const smtpConfig = getSystemSmtpConfig();
    if (!smtpConfig) {
      console.error("[MagicLink] System SMTP not configured");
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "provider_failed",
        outcome: "fail",
        email: normalizedEmail,
        detailCode: "provider_config_missing",
        detail: "System SMTP is not configured",
        durationMs: Date.now() - requestStartedAt,
      });
      return res.status(503).json({
        error: "Email sending is not available. Please contact support or try another sign-in method.",
      });
    }

    try {
      const database = await getDb();
      if (!database) {
        void recordAuthLifecycleEvent({
          requestId,
          eventType: "token_created",
          outcome: "fail",
          email: normalizedEmail,
          detailCode: "database_unavailable",
          detail: "Database connection is unavailable",
          durationMs: Date.now() - requestStartedAt,
        });
        return res.status(500).json({ error: "Service temporarily unavailable." });
      }

      // Generate secure token
      const token = crypto.randomBytes(TOKEN_LENGTH).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Store token in DB
      await database.insert(magicLinks).values({
        email: normalizedEmail,
        token,
        expiresAt,
      });
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "token_created",
        outcome: "ok",
        email: normalizedEmail,
        token,
        durationMs: Date.now() - requestStartedAt,
      });

      // Build magic link URL
      const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "https://getphame.app";
      const magicLinkUrl = `${baseUrl}/api/auth/magic-link/verify?token=${token}`;

      // Send email
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        tls: { rejectUnauthorized: false },
      });

      const delivery = await transporter.sendMail({
        from: `"GetPhame" <${smtpConfig.fromEmail}>`,
        to: normalizedEmail,
        subject: "Your GetPhame login link",
        html: buildMagicLinkEmailHtml(magicLinkUrl),
      });

      void recordAuthLifecycleEvent({
        requestId,
        eventType: "provider_accepted",
        outcome: "ok",
        email: normalizedEmail,
        token,
        providerMessageId: delivery.messageId,
        durationMs: Date.now() - requestStartedAt,
      });
      console.log(`[MagicLink] Provider accepted login link for ${maskDiagnosticEmail(normalizedEmail)}`);
      return res.status(200).json({ ok: true, email: normalizedEmail });
    } catch (err) {
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "provider_failed",
        outcome: "fail",
        email: normalizedEmail,
        detailCode: classifyAuthDiagnosticError(err),
        detail: err,
        durationMs: Date.now() - requestStartedAt,
      });
      console.error("[MagicLink] Failed to send magic link:", redactAuthDiagnosticDetail(err));
      return res.status(500).json({ error: "Failed to send login link. Please try again." });
    }
  });

  /**
   * GET /api/auth/magic-link/verify?token=xxx
   *
   * Validates the token, creates or finds the user, issues a JWT session cookie,
   * and redirects to the app.
   */
  app.get("/api/auth/magic-link/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;
    const verificationStartedAt = Date.now();
    let requestId: string = crypto.randomUUID();
    let verificationEmail: string | null = null;

    if (!token) {
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "verification_failed",
        outcome: "fail",
        detailCode: "token_missing",
        detail: "Magic-link token is missing",
        durationMs: Date.now() - verificationStartedAt,
      });
      return res.redirect(302, "/login?auth_error=invalid_link");
    }

    try {
      const correlation = await findAuthRequestByToken(token);
      if (correlation?.requestId) requestId = correlation.requestId;
      const database = await getDb();
      if (!database) {
        void recordAuthLifecycleEvent({
          requestId,
          eventType: "verification_failed",
          outcome: "fail",
          token,
          detailCode: "database_unavailable",
          detail: "Database connection is unavailable",
          durationMs: Date.now() - verificationStartedAt,
        });
        return res.redirect(302, "/login?auth_error=service_unavailable");
      }

      // Find valid, unused, non-expired token
      const now = new Date();
      const [record] = await database
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.token, token),
            isNull(magicLinks.usedAt),
            gt(magicLinks.expiresAt, now)
          )
        )
        .limit(1);

      if (!record) {
        void recordAuthLifecycleEvent({
          requestId,
          eventType: "verification_failed",
          outcome: "fail",
          token,
          detailCode: "token_invalid_or_expired",
          detail: "Token is invalid, expired, or already used",
          durationMs: Date.now() - verificationStartedAt,
        });
        return res.redirect(302, "/login?auth_error=link_expired");
      }

      const email = record.email;
      verificationEmail = email;
      const emailOpenId = `email_${email}`;

      // Resolve both direct email-login accounts and accounts originally created
      // through Google, Apple, or another provider. This prevents a returning
      // customer from receiving a second empty account when using a magic link.
      const existingUser =
        (await db.getUserByOpenId(emailOpenId)) ??
        (await db.getUserByEmail(email));
      const isNewUser = !existingUser;
      const sessionOpenId = existingUser?.openId ?? emailOpenId;

      // Upsert user — creates account if new, updates lastSignedIn if existing
      await db.upsertUser({
        openId: sessionOpenId,
        name: existingUser?.name ?? null,
        email,
        loginMethod: existingUser?.loginMethod ?? "email",
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users (fire-and-forget)
      if (isNewUser) {
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          sendUserWelcomeEmail({
            ownerUserId: ownerUser.id,
            toEmail: email,
            toName: null,
          }).catch((err: unknown) =>
            console.warn("[MagicLink] Welcome email failed:", err)
          );
        }
      }

      // Issue session JWT cookie
      const sessionToken = await sdk.createSessionToken(sessionOpenId, {
        name: "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Consume the token only after account and session creation succeed.
      // This keeps a valid link retryable if a database or signing error occurs.
      await database
        .update(magicLinks)
        .set({ usedAt: now })
        .where(and(eq(magicLinks.id, record.id), isNull(magicLinks.usedAt)));

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      void recordAuthLifecycleEvent({
        requestId,
        eventType: "verification_succeeded",
        outcome: "ok",
        email,
        token,
        detailCode: isNewUser ? "new_user_onboarding" : "returning_user_session",
        durationMs: Date.now() - verificationStartedAt,
      });

      // Redirect — new users go to onboarding, returning users go home
      res.redirect(302, isNewUser ? "/onboarding" : "/");
    } catch (err) {
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "verification_failed",
        outcome: "fail",
        email: verificationEmail,
        token,
        detailCode: classifyAuthDiagnosticError(err),
        detail: err,
        durationMs: Date.now() - verificationStartedAt,
      });
      console.error("[MagicLink] Verify failed:", redactAuthDiagnosticDetail(err));
      return res.redirect(302, "/login?auth_error=verification_failed");
    }
  });

  /**
   * POST /api/auth/logout
   * Clears the session cookie. Works for all auth methods.
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: "/",
    });
    return res.status(200).json({ ok: true });
  });
}
