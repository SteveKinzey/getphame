/**
 * Direct Google OAuth 2.0 login flow.
 * Replaces the Manus portal redirect so users see a clean Phame-branded login.
 *
 * Routes:
 *   GET /api/auth/google/status   → reports whether Google OAuth is configured
 *   GET /api/auth/google          → redirects to Google consent screen
 *   GET /api/auth/google/callback → exchanges code, creates session cookie, redirects to /
 *
 * Required env vars (already present):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET
 *
 * Google Cloud Console — add these Authorized redirect URIs:
 *   https://getphame.app/api/auth/google/callback
 *   https://getphame.manus.space/api/auth/google/callback  (staging)
 */

import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import { ENV } from "./_core/env";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";
import { issueSecuritySession } from "./security/passkeySessions";

function getOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    redirectUri
  );
}

function buildRedirectUri(req: Request): string {
  // Use APP_BASE_URL if set (production) so the redirect URI exactly matches
  // what is registered in the Google Cloud Console.
  // Falls back to dynamic host detection for local dev.
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/google/callback`;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    req.headers.host ??
    "phame.app";
  return `${proto}://${host}/api/auth/google/callback`;
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/status", (_req: Request, res: Response) => {
    res.json({
      enabled: Boolean(ENV.googleClientId && ENV.googleClientSecret),
    });
  });

  // Step 1: Redirect user to Google consent screen
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      return res.redirect(302, "/?auth_error=google_failed");
    }

    const redirectUri = buildRedirectUri(req);
    const oauth2Client = getOAuth2Client(redirectUri);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
      // Store redirectUri in state so callback can reconstruct the same client
      state: Buffer.from(redirectUri).toString("base64"),
    });

    res.redirect(302, authUrl);
  });

  // Step 2: Google redirects back here with ?code=...&state=...
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;

    if (error) {
      console.warn("[GoogleAuth] User denied consent:", error);
      return res.redirect(302, "/?auth_error=google_denied");
    }

    if (!code || !state) {
      return res.redirect(302, "/?auth_error=google_missing_code");
    }

    try {
      // Reconstruct the same redirectUri used in step 1
      const redirectUri = Buffer.from(state, "base64").toString("utf8");
      const oauth2Client = getOAuth2Client(redirectUri);

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user profile from Google
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile.id) {
        return res.redirect(302, "/?auth_error=google_no_id");
      }

      // Use Google sub (stable unique ID) as openId
      const openId = `google_${profile.id}`;
      const email = profile.email ?? null;
      const name = profile.name ?? null;

      // Check if new user before upsert
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users (fire-and-forget)
      if (isNewUser && email) {
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          sendUserWelcomeEmail({
            ownerUserId: ownerUser.id,
            toEmail: email,
            toName: name,
          }).catch((err: unknown) => {
            console.warn("[GoogleAuth] Welcome email failed (non-fatal):", err);
          });
        }
      }

      const sessionUser = await db.getUserByOpenId(openId);
      if (!sessionUser)
        throw new Error("Session user unavailable after Google account update");
      await issueSecuritySession({
        userId: sessionUser.id,
        authMethod: "oauth",
        assurance: "a1",
        req,
        res,
      });

      res.redirect(302, "/");
    } catch (err) {
      console.error("[GoogleAuth] Callback failed:", err);
      res.redirect(302, "/?auth_error=google_failed");
    }
  });
}
