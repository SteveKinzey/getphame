/**
 * Google OAuth 2.0 — full server-side implementation for tRPC + Express apps.
 *
 * Routes:
 *   GET /api/auth/google              → redirects to Google consent screen
 *   GET /api/auth/google/callback     → handles OAuth callback, creates/finds user, issues JWT
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
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";
import crypto from "crypto";

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
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "localhost:3000";
  return `${proto}://${host}/api/auth/google/callback`;
}

function createOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
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
      return res
        .status(503)
        .json({ error: "Google Sign-In is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    }

    const redirectUri = buildRedirectUri(req);
    const oAuth2Client = createOAuthClient(redirectUri);

    // Generate a CSRF state token to prevent open redirect attacks
    const state = crypto.randomBytes(16).toString("hex");

    // Store state in a short-lived httpOnly cookie (10 minutes)
    res.cookie("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "openid",
      ],
      state,
      prompt: "select_account", // Always show account picker for better UX
    });

    res.redirect(302, authUrl);
  });

  /**
   * GET /api/auth/google/callback
   * Google redirects here after the user grants (or denies) consent.
   * Exchanges the authorization code for tokens, fetches the user profile,
   * upserts the user in the database, and issues a session JWT cookie.
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    // User denied access
    if (error) {
      console.warn("[GoogleAuth] User denied access:", error);
      return res.redirect(302, "/?auth_error=google_denied");
    }

    if (!code) {
      console.warn("[GoogleAuth] Missing authorization code");
      return res.redirect(302, "/?auth_error=google_missing_code");
    }

    // CSRF state validation
    const storedState = req.cookies?.google_oauth_state;
    if (!storedState || storedState !== state) {
      console.warn("[GoogleAuth] State mismatch — possible CSRF attack");
      return res.redirect(302, "/?auth_error=google_state_mismatch");
    }

    // Clear the state cookie immediately
    res.clearCookie("google_oauth_state");

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

      // Check if this is a new user before upsert
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      // Upsert user — on conflict (same openId) update name/email/lastSignedIn
      // The email stored here becomes the default "from" email for review requests.
      // Users can override this in Settings → Sending Email.
      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users (fire-and-forget, non-blocking)
      if (isNewUser && email) {
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          sendUserWelcomeEmail({ ownerUserId: ownerUser.id, toEmail: email, toName: name })
            .catch((err: unknown) =>
              console.warn("[GoogleAuth] Welcome email failed:", err)
            );
        }
      }

      // Issue a session JWT cookie (same mechanism as Apple Sign-In)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to app root (or onboarding if new user)
      res.redirect(302, isNewUser ? "/onboarding" : "/");
    } catch (err) {
      console.error("[GoogleAuth] Callback failed:", err);
      res.redirect(302, "/?auth_error=google_failed");
    }
  });
}
