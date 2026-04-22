/**
 * Sign in with Apple — server-side OAuth flow.
 *
 * Routes:
 *   GET  /api/auth/apple          → redirects to Apple consent screen
 *   POST /api/auth/apple/callback → Apple POSTs back here with code + id_token
 *
 * Apple Developer Console setup required (see README / delivery message):
 *   - App ID with "Sign in with Apple" capability enabled
 *   - Services ID (APPLE_CLIENT_ID) — e.g. "app.reviewlink.signin"
 *   - Team ID (APPLE_TEAM_ID) — 10-char string from top-right of developer.apple.com
 *   - Key ID + private key (.p8) for Sign in with Apple (APPLE_KEY_ID, APPLE_PRIVATE_KEY)
 *   - Return URL registered: https://reviewlink.app/api/auth/apple/callback
 *
 * Note: Apple always POSTs to the callback (not GET), so the route is POST.
 * The private key env var should have literal \n replaced with actual newlines.
 */

import type { Express, Request, Response } from "express";
import appleSignin from "apple-signin-auth";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";
import crypto from "crypto";

function buildRedirectUri(req: Request): string {
  // Use APP_BASE_URL if set (production) so the redirect URI exactly matches
  // what is registered in the Apple Developer Portal Services ID.
  // Falls back to dynamic host detection for local dev.
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/apple/callback`;
  }
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "reviewlink.app";
  return `${proto}://${host}/api/auth/apple/callback`;
}

function buildClientSecret(): string {
  // Apple requires a JWT signed with the .p8 private key
  const privateKey = ENV.applePrivateKey.replace(/\\n/g, "\n");
  return appleSignin.getClientSecret({
    clientID: ENV.appleClientId,
    teamID: ENV.appleTeamId,
    privateKey,
    keyIdentifier: ENV.appleKeyId,
    expAfter: 15777000, // 6 months
  });
}

export function registerAppleAuthRoutes(app: Express) {
  // Step 1: Redirect to Apple consent screen
  app.get("/api/auth/apple", (req: Request, res: Response) => {
    if (!ENV.appleClientId || !ENV.appleTeamId || !ENV.appleKeyId || !ENV.applePrivateKey) {
      return res.status(503).send("Apple Sign In is not configured yet.");
    }

    const redirectUri = buildRedirectUri(req);
    // Store redirectUri in state so callback can reconstruct it
    const state = Buffer.from(JSON.stringify({ redirectUri, nonce: crypto.randomBytes(8).toString("hex") })).toString("base64url");

    const authUrl = appleSignin.getAuthorizationUrl({
      clientID: ENV.appleClientId,
      redirectUri,
      state,
      scope: "name email",
      responseMode: "form_post",
    });

    res.redirect(302, authUrl);
  });

  // Step 2: Apple POSTs back here with code + id_token (+ optional user JSON on first login)
  app.post("/api/auth/apple/callback", async (req: Request, res: Response) => {
    const { code, id_token, state, user: userJson } = req.body as {
      code?: string;
      id_token?: string;
      state?: string;
      user?: string;
    };

    if (!code || !id_token) {
      console.warn("[AppleAuth] Missing code or id_token");
      return res.redirect(302, "/?auth_error=apple_missing_token");
    }

    try {
      // Decode state to get the redirectUri used in step 1
      let redirectUri = buildRedirectUri(req);
      if (state) {
        try {
          const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
          if (decoded.redirectUri) redirectUri = decoded.redirectUri;
        } catch {
          // ignore malformed state
        }
      }

      // Verify the id_token with Apple's public keys
      const appleUser = await appleSignin.verifyIdToken(id_token, {
        audience: ENV.appleClientId,
        ignoreExpiration: false,
      });

      const appleSub = appleUser.sub; // stable unique ID from Apple
      if (!appleSub) {
        return res.redirect(302, "/?auth_error=apple_no_sub");
      }

      const openId = `apple_${appleSub}`;

      // Apple only sends name on the very first login — parse it if present
      let name: string | null = null;
      let email: string | null = appleUser.email ?? null;

      if (userJson) {
        try {
          const parsedUser = JSON.parse(userJson);
          const firstName = parsedUser?.name?.firstName ?? "";
          const lastName = parsedUser?.name?.lastName ?? "";
          name = [firstName, lastName].filter(Boolean).join(" ") || null;
        } catch {
          // ignore
        }
      }

      // Check if new user before upsert
      const existingUser = await db.getUserByOpenId(openId);
      const isNewUser = !existingUser;

      // If returning user, preserve their stored name
      if (!isNewUser && !name) {
        name = existingUser?.name ?? null;
      }

      await db.upsertUser({
        openId,
        name,
        email,
        loginMethod: "apple",
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
            console.warn("[AppleAuth] Welcome email failed (non-fatal):", err);
          });
        }
      }

      // Create session JWT (same mechanism as Google OAuth)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
       res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err) {
      console.error("[AppleAuth] Callback failed:", err);
      res.redirect(302, "/?auth_error=apple_failed");
    }
  });

  // Step 3: Apple server-to-server notifications
  // Apple sends JWT-encoded events when users revoke Sign In with Apple or delete their account.
  // Required for App Store apps; also handles web users who revoke via appleid.apple.com.
  // Events: consent-revoked, account-delete, email-disabled, email-enabled
  app.post("/api/auth/apple/notifications", async (req: Request, res: Response) => {
    try {
      const payload = req.body as { payload?: string };
      if (!payload?.payload) {
        return res.status(400).json({ error: "Missing payload" });
      }
      // Decode the JWT (Apple signs it with their own keys — we trust the sub claim)
      // For account-delete events, we anonymise the user's data
      const decoded = JSON.parse(
        Buffer.from(payload.payload.split(".")[1], "base64url").toString("utf8")
      ) as { events?: string };
      if (!decoded.events) {
        return res.status(200).json({ ok: true });
      }
      const events = JSON.parse(decoded.events) as Array<{
        type: string;
        sub: string;
        email?: string;
      }>;
      for (const event of events) {
        const openId = `apple_${event.sub}`;
        console.log(`[AppleAuth] Server notification: ${event.type} for ${openId}`);
        if (event.type === "account-delete" || event.type === "consent-revoked") {
          // Anonymise — remove personal data but keep the row for audit
          await db.anonymiseUserByOpenId(openId);
          console.log(`[AppleAuth] Anonymised user ${openId} due to ${event.type}`);
        }
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[AppleAuth] Notification handler error:", err);
      // Always return 200 to Apple to prevent retries
      res.status(200).json({ ok: true });
    }
  });
}
