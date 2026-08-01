/**
 * Google OAuth 2.0 — full server-side implementation for tRPC + Express apps.
 *
 * Routes:
 *   GET /api/auth/google              → redirects to Google consent screen
 *   GET /api/auth/google/callback     → handles OAuth callback, creates/finds user, issues a revocable session
 *
 * Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_BASE_URL
 * Install: pnpm add googleapis
 *
 * Graceful degradation: if GOOGLE_CLIENT_ID is not set, the /api/auth/google route
 * returns a 503 instead of crashing. The frontend checks /api/auth/google/status
 * to decide whether to show the button.
 */
import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";
import crypto from "crypto";
import { issueSecuritySession } from "./security/passkeySessions";
import {
  consumeProviderHumanVerificationAttempt,
  createProviderHumanVerificationAttempt,
  recordSignupRiskEvent,
} from "./signupRisk";
import { verifyProviderStartHumanToken } from "./security/humanVerification";
import {
  createProviderOAuthState,
  isValidExpectedEmailHash,
  PASSKEY_ENROLLMENT_CANCEL_PATH,
  PASSKEY_ENROLLMENT_INTENT,
  PASSKEY_ENROLLMENT_MISMATCH_PATH,
  PASSKEY_ENROLLMENT_SUCCESS_PATH,
  providerEmailMatches,
  verifyProviderOAuthCallbackState,
} from "./security/passkeyEnrollmentIntent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function buildRedirectUri(req: Request): string {
  // CRITICAL: Use APP_BASE_URL so redirect_uri exactly matches what's registered
  // in the Google Cloud Console. Dynamic host detection resolves to the internal
  // proxy hostname and causes redirect_uri_mismatch errors.
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  // Fallback for local dev only
  const proto =
    (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    req.headers.host ??
    "localhost:3000";
  return `${proto}://${host}/api/auth/google/callback`;
}

function createOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

function createGoogleAuthorization(
  req: Request,
  res: Response,
  humanVerificationAttemptId?: string
) {
  const redirectUri = buildRedirectUri(req);
  const oAuth2Client = createOAuthClient(redirectUri);
  const intent =
    typeof req.query.intent === "string" ? req.query.intent : undefined;
  const expectedEmailHash =
    typeof req.query.expected_email_hash === "string"
      ? req.query.expected_email_hash
      : undefined;
  if (
    intent !== undefined &&
    (intent !== PASSKEY_ENROLLMENT_INTENT ||
      !isValidExpectedEmailHash(expectedEmailHash))
  )
    return null;

  const state = createProviderOAuthState({
    ...(intent === PASSKEY_ENROLLMENT_INTENT
      ? { intent, expectedEmailHash }
      : {}),
    ...(humanVerificationAttemptId ? { humanVerificationAttemptId } : {}),
  });
  res.cookie("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 10 * 60 * 1000,
  });

  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ],
    state,
    prompt: "select_account",
  });
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerGoogleAuthRoutes(app: Express) {
  /**
   * GET /api/auth/google/status
   * Frontend polls this to decide whether to show the Google button.
   * Returns { enabled: true } if credentials are configured, { enabled: false } otherwise.
   */
  app.get("/api/auth/google/status", (_req: Request, res: Response) => {
    res.json({ enabled: isGoogleConfigured() });
  });

  /**
   * GET /api/auth/google
   * Redirects the user to Google's OAuth consent screen.
   * Generates a CSRF state token stored in a short-lived cookie.
   */
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!isGoogleConfigured()) {
      return res.status(503).json({
        error:
          "Google Sign-In is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      });
    }

    const authUrl = createGoogleAuthorization(req, res);
    if (!authUrl)
      return res.status(400).json({ error: "Invalid verification request." });
    res.redirect(302, authUrl);
  });

  app.post("/api/auth/google/start", async (req: Request, res: Response) => {
    if (!isGoogleConfigured())
      return res
        .status(503)
        .json({ error: "Google Sign-In is not configured." });
    if (!(await verifyProviderStartHumanToken(req, req.body?.token))) {
      return res.status(403).json({
        error: "Human verification could not be completed. Please try again.",
      });
    }
    try {
      const attemptId = await createProviderHumanVerificationAttempt("google");
      const authUrl = createGoogleAuthorization(req, res, attemptId);
      if (!authUrl)
        return res.status(400).json({ error: "Invalid verification request." });
      return res.status(200).json({ url: authUrl });
    } catch (error) {
      console.error("[GoogleAuth] Unable to start verified OAuth flow", error);
      return res.status(503).json({
        error: "Secure sign-in could not be started. Please try again.",
      });
    }
  });

  /**
   * GET /api/auth/google/callback
   * Google redirects here after the user grants (or denies) consent.
   * Exchanges the authorization code for tokens, fetches the user profile,
   * upserts the user in the database, and issues a revocable session cookie.
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    // CSRF state validation
    const storedState = req.cookies?.google_oauth_state;
    const stateVerification = verifyProviderOAuthCallbackState(
      storedState,
      state
    );
    if (!stateVerification) {
      console.warn("[GoogleAuth] State mismatch — possible CSRF attack");
      return res.redirect(302, "/?auth_error=google_state_mismatch");
    }

    // Clear the state cookie immediately
    res.clearCookie("google_oauth_state");
    const statePayload =
      stateVerification.kind === "signed" ? stateVerification.payload : null;
    const isPasskeyEnrollment =
      statePayload?.intent === PASSKEY_ENROLLMENT_INTENT;

    if (error || !code) {
      if (error) console.warn("[GoogleAuth] User denied access:", error);
      else console.warn("[GoogleAuth] Missing authorization code");
      return res.redirect(
        302,
        isPasskeyEnrollment
          ? PASSKEY_ENROLLMENT_CANCEL_PATH
          : error
            ? "/?auth_error=google_denied"
            : "/?auth_error=google_missing_code"
      );
    }

    try {
      const redirectUri = buildRedirectUri(req);
      const oAuth2Client = createOAuthClient(redirectUri);

      // Exchange authorization code for access + refresh tokens
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Fetch the user's Google profile
      const oauth2 = google.oauth2({ version: "v2", auth: oAuth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      if (!googleUser.id) {
        console.error("[GoogleAuth] No user ID in Google response");
        return res.redirect(302, "/?auth_error=google_no_id");
      }

      const openId = `google_${googleUser.id}`;
      const email = googleUser.email ?? null;
      const name = googleUser.name ?? null;

      if (isPasskeyEnrollment) {
        if (
          !email ||
          googleUser.verified_email !== true ||
          !statePayload?.expectedEmailHash ||
          !providerEmailMatches(email, statePayload.expectedEmailHash)
        ) {
          return res.redirect(302, PASSKEY_ENROLLMENT_MISMATCH_PATH);
        }

        const providerUser = await db.getUserByOpenId(openId);
        const canonicalUser = await db.getUserByEmail(email);
        if (
          providerUser &&
          canonicalUser &&
          providerUser.id !== canonicalUser.id
        ) {
          return res.redirect(302, PASSKEY_ENROLLMENT_MISMATCH_PATH);
        }

        let sessionUser = canonicalUser ?? providerUser;
        let isNewEnrollmentUser = false;
        if (!sessionUser) {
          if (
            !(await consumeProviderHumanVerificationAttempt(
              statePayload?.humanVerificationAttemptId,
              "google"
            ))
          ) {
            return res.redirect(
              302,
              "/login?auth_error=human_verification_required"
            );
          }
          await db.upsertUser({
            openId,
            name,
            email,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });
          sessionUser = await db.getUserByOpenId(openId);
          isNewEnrollmentUser = true;
        } else if (!providerUser) {
          await db.linkUserIdentity({
            userId: sessionUser.id,
            openId,
            loginMethod: "google",
            lastSignedIn: new Date(),
          });
        }
        if (!sessionUser)
          throw new Error("Session user unavailable after Google verification");

        if (isNewEnrollmentUser) {
          sendUserWelcomeEmail({ toEmail: email, toName: name }).catch(
            (err: unknown) =>
              console.warn("[GoogleAuth] Welcome email failed:", err)
          );
          void recordSignupRiskEvent({
            userId: sessionUser.id,
            subject: email,
            provider: "google",
            outcome: "verified",
            reasonCode: "provider_attempt_verified",
            humanVerified: true,
          });
        }
        await issueSecuritySession({
          userId: sessionUser.id,
          authMethod: "oauth",
          assurance: "a1",
          req,
          res,
        });
        return res.redirect(302, PASSKEY_ENROLLMENT_SUCCESS_PATH);
      }

      const providerUser = await db.getUserByOpenId(openId);
      const canonicalUser =
        email && googleUser.verified_email === true
          ? await db.getUserByEmail(email)
          : null;
      let sessionUser = canonicalUser ?? providerUser;
      const isNewUser = !sessionUser;

      if (isNewUser) {
        if (
          !email ||
          googleUser.verified_email !== true ||
          !(await consumeProviderHumanVerificationAttempt(
            statePayload?.humanVerificationAttemptId,
            "google"
          ))
        ) {
          return res.redirect(
            302,
            "/login?auth_error=human_verification_required"
          );
        }
        await db.upsertUser({
          openId,
          name,
          email,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
        sessionUser = await db.getUserByOpenId(openId);
      } else if (!providerUser) {
        if (!sessionUser)
          throw new Error(
            "Canonical Google account unavailable for identity linking"
          );
        await db.linkUserIdentity({
          userId: sessionUser.id,
          openId,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
      } else {
        await db.upsertUser({
          openId,
          name,
          email,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
      }

      if (!sessionUser)
        throw new Error("Session user unavailable after Google account update");
      if (isNewUser && email) {
        sendUserWelcomeEmail({ toEmail: email, toName: name }).catch(
          (err: unknown) =>
            console.warn("[GoogleAuth] Welcome email failed:", err)
        );
        void recordSignupRiskEvent({
          userId: sessionUser.id,
          subject: email,
          provider: "google",
          outcome: "verified",
          reasonCode: "provider_attempt_verified",
          humanVerified: true,
        });
      }
      await issueSecuritySession({
        userId: sessionUser.id,
        authMethod: "oauth",
        assurance: "a1",
        req,
        res,
      });

      // Redirect to app root (or onboarding if new user)
      res.redirect(302, isNewUser ? "/onboarding" : "/");
    } catch (err) {
      console.error("[GoogleAuth] Callback failed:", err);
      res.redirect(302, "/?auth_error=google_failed");
    }
  });
}
