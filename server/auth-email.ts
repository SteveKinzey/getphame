/**
 * Magic Link Authentication — passwordless email login for tRPC + Express apps.
 *
 * Routes:
 *   POST /api/auth/magic-link         → generates token, sends email with login link
 *   GET  /api/auth/magic-link/verify  → validates token, creates/finds user, issues a revocable session
 *   POST /api/auth/logout             → revokes the session and clears its cookie
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
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import * as db from "./db";
import { getDb } from "./db";
import { magicLinks } from "../drizzle/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { createTransporter, sendUserWelcomeEmail } from "./smtp";
import { sendSystemEmail } from "./sendgrid";
import { renderGetPhameEmailHeader } from "./platformEmailBrand";
import {
  classifyAuthDiagnosticError,
  findAuthRequestByToken,
  maskDiagnosticEmail,
  recordAuthLifecycleEvent,
  redactAuthDiagnosticDetail,
} from "./authOperations";
import {
  issueSecuritySession,
  revokeSecuritySessionFromRequest,
} from "./security/passkeySessions";
import {
  createSignedHumanProof,
  recordSignupRiskEvent,
  verifySignedHumanProof,
  verifyTurnstileHuman,
} from "./signupRisk";
import { isHighConfidenceDisposableEmail } from "./disposableDomains";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOKEN_LENGTH = 32; // 32 bytes = 64 hex chars
const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const PASSKEY_ENROLLMENT_INTENT = "enroll_passkey";

function signPasskeyEnrollmentIntent(token: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to protect passkey enrollment intent");
  return crypto
    .createHmac("sha256", secret)
    .update(`getphame:passkey-enrollment:v1\0${token}\0${email.trim().toLowerCase()}`)
    .digest("hex");
}

function isValidPasskeyEnrollmentSignature(token: string, email: string, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = signPasskeyEnrollmentIntent(token, email);
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

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
          ${renderGetPhameEmailHeader("Your secure sign-in link")}
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
    const { email, intent, humanVerificationToken } = req.body as {
      email?: string;
      intent?: string;
      humanVerificationToken?: unknown;
    };
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
    if (intent !== undefined && intent !== PASSKEY_ENROLLMENT_INTENT) {
      return res.status(400).json({ error: "Unsupported sign-in intent." });
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
    const hasSendGrid = !!(process.env.SENDGRID_API_KEY);
    if (!smtpConfig && !hasSendGrid) {
      console.error("[MagicLink] Neither SendGrid nor System SMTP is configured");
      void recordAuthLifecycleEvent({
        requestId,
        eventType: "provider_failed",
        outcome: "fail",
        email: normalizedEmail,
        detailCode: "provider_config_missing",
        detail: "No email relay configured (set SENDGRID_API_KEY or SYSTEM_SMTP_*)",
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

      // Only a genuinely new account requires a browser challenge. Existing
      // customers continue to receive a normal sign-in link without a new
      // verification hurdle.
      const existingAccount =
        (await db.getUserByEmail(normalizedEmail)) ??
        (await db.getUserByOpenId(`email_${normalizedEmail}`));
      const humanProof = existingAccount
        ? undefined
        : (await verifyTurnstileHuman(
            humanVerificationToken,
            typeof req.ip === "string" ? req.ip : undefined,
          ))
          ? createSignedHumanProof(normalizedEmail)
          : null;
      if (humanProof === null) {
        return res.status(403).json({
          error: "Human verification is required before creating a new account.",
        });
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
      const magicLinkParams = new URLSearchParams({ token });
      if (intent === PASSKEY_ENROLLMENT_INTENT) {
        magicLinkParams.set("intent", PASSKEY_ENROLLMENT_INTENT);
        magicLinkParams.set("intent_signature", signPasskeyEnrollmentIntent(token, normalizedEmail));
      }
      if (humanProof) magicLinkParams.set("human_proof", humanProof);
      const magicLinkUrl = `${baseUrl}/api/auth/magic-link/verify?${magicLinkParams.toString()}`;

      // Send email
      await sendSystemEmail({
        to: normalizedEmail,
        subject: "Your GetPhame login link",
        html: buildMagicLinkEmailHtml(magicLinkUrl),
        from: process.env.SYSTEM_FROM_EMAIL?.trim() ?? "no-reply@getphame.com",
      });
      const delivery = { messageId: "system-relay" };

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
   * Validates the token, creates or finds the user, issues a revocable session cookie,
   * and redirects to the app.
   */
  app.get("/api/auth/magic-link/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;
    const requestedIntent = typeof req.query.intent === "string" ? req.query.intent : null;
    const intentSignature = typeof req.query.intent_signature === "string" ? req.query.intent_signature : null;
    const humanProof = typeof req.query.human_proof === "string" ? req.query.human_proof : undefined;
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
      const isPasskeyEnrollment = requestedIntent === PASSKEY_ENROLLMENT_INTENT;
      if (requestedIntent !== null && !isPasskeyEnrollment) {
        return res.redirect(302, "/login?auth_error=invalid_link");
      }
      if (isPasskeyEnrollment && (!intentSignature || !isValidPasskeyEnrollmentSignature(token, email, intentSignature))) {
        return res.redirect(302, "/login?auth_error=invalid_link");
      }
      const emailOpenId = `email_${email}`;

      // Resolve both direct email-login accounts and accounts originally created
      // through Google, Apple, or another provider. This prevents a returning
      // customer from receiving a second empty account when using a magic link.
      // Resolve the canonical data-owning account first. Historical releases
      // could leave a direct `email_<address>` identity beside an older Google
      // or Apple account for the same email. getUserByEmail ranks those
      // candidates by role, paid access, onboarding data, and age; checking the
      // direct email openId first would bypass that ranking and sign the user
      // into the stale empty account.
      const existingUser =
        (await db.getUserByEmail(email)) ??
        (await db.getUserByOpenId(emailOpenId));
      const isNewUser = !existingUser;
      if (isNewUser && await isHighConfidenceDisposableEmail(email)) {
        return res.redirect(302, "/login?auth_error=disposable_email");
      }
      if (isNewUser && !verifySignedHumanProof(humanProof, email)) {
        return res.redirect(302, "/login?auth_error=human_verification_required");
      }
      const sessionOpenId = existingUser?.openId ?? emailOpenId;
      // Session verification requires a non-empty name. The previous empty
      // string produced a signed cookie that was immediately rejected as
      // "Session payload missing required fields" on the next request.
      const sessionName = existingUser?.name?.trim() || email;

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
        sendUserWelcomeEmail({
          toEmail: email,
          toName: null,
        }).catch((err: unknown) =>
          console.warn("[MagicLink] Welcome email failed:", err)
        );
      }

      const sessionUser = await db.getUserByOpenId(sessionOpenId);
      if (!sessionUser) throw new Error("Session user unavailable after magic-link account update");
      if (isNewUser) {
        try {
          await recordSignupRiskEvent({
            userId: sessionUser.id,
            subject: email,
            provider: "email",
            outcome: "verified",
            reasonCode: "human_proof_verified",
            humanVerified: true,
          });
        } catch (riskError) {
          console.warn("[MagicLink] Signup-risk audit write failed:", redactAuthDiagnosticDetail(riskError));
        }
      }
      const { token: sessionToken, maxAge: sessionMaxAge } = await issueSecuritySession({
        userId: sessionUser.id,
        authMethod: "magic_link",
        assurance: "a1",
        req,
      });

      // Consume the token only after account and session creation succeed.
      // This keeps a valid link retryable if a database or signing error occurs.
      await database
        .update(magicLinks)
        .set({ usedAt: now })
        .where(and(eq(magicLinks.id, record.id), isNull(magicLinks.usedAt)));

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: sessionMaxAge });

      void recordAuthLifecycleEvent({
        requestId,
        eventType: "verification_succeeded",
        outcome: "ok",
        email,
        token,
        detailCode: isNewUser ? "new_user_onboarding" : "returning_user_session",
        durationMs: Date.now() - verificationStartedAt,
      });

      // Enrollment resumes only after this one-time verification created a session.
      res.redirect(302, isPasskeyEnrollment ? "/settings?passkey_enroll=1" : isNewUser ? "/onboarding" : "/");
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
   * Revokes the backing session and clears the cookie. Works for all auth methods.
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    await revokeSecuritySessionFromRequest(req);
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
