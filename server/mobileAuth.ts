/**
 * Mobile Auth Routes — Phame Expo App
 *
 * These endpoints are used exclusively by the React Native / Expo mobile app.
 * Unlike the web flow (which uses cookies), mobile auth returns an opaque token in the
 * response body so the app can store it in SecureStore.
 *
 * Routes:
 *   POST /api/auth/mobile/google  → exchange Google auth code for a revocable session
 *   POST /api/auth/mobile/apple   → exchange Apple identity token for a revocable session
 *
 * The returned identifier-bearing token is stored only as a hash on the server
 * and is accepted through the Authorization: Bearer <token> header.
 */

import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import appleSignin from "apple-signin-auth";
import { ENV } from "./_core/env";
import * as db from "./db";
import { isHighConfidenceDisposableEmail } from "./disposableDomains";
import { sendUserWelcomeEmail } from "./smtp";
import { issueSecuritySession } from "./security/passkeySessions";

// ─── Google ──────────────────────────────────────────────────────────────────

async function handleMobileGoogleAuth(req: Request, res: Response) {
  const { code, redirectUri } = req.body as {
    code?: string;
    redirectUri?: string;
  };

  if (!code || !redirectUri) {
    return res.status(400).json({ error: "Missing code or redirectUri" });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      ENV.googleClientId,
      ENV.googleClientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.id) {
      return res.status(400).json({ error: "Google did not return a user ID" });
    }

    const openId = `google_${profile.id}`;
    const email = profile.email ?? null;
    const name = profile.name ?? null;

    const existingUser = await db.getUserByOpenId(openId);
    const isNewUser = !existingUser;
    if (isNewUser && (await isHighConfidenceDisposableEmail(email))) {
      return res.status(409).json({ error: "disposable_email" });
    }

    await db.upsertUser({
      openId,
      name,
      email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    if (isNewUser && email) {
      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (ownerUser) {
        sendUserWelcomeEmail({
          ownerUserId: ownerUser.id,
          toEmail: email,
          toName: name,
        }).catch((err: unknown) => {
          console.warn(
            "[MobileAuth/Google] Welcome email failed (non-fatal):",
            err
          );
        });
      }
    }

    // Fetch user to get tier from DB
    const user = await db.getUserByOpenId(openId);
    if (!user)
      throw new Error("Session user unavailable after Google account update");
    const { token: sessionToken } = await issueSecuritySession({
      userId: user.id,
      authMethod: "oauth",
      assurance: "a1",
      req,
    });
    const tier = (user as { tier?: string } | null)?.tier ?? "free";

    return res.json({
      token: sessionToken,
      userId: user?.id ?? 0,
      name: name ?? "",
      email: email ?? "",
      avatarUrl: profile.picture ?? null,
      tier,
    });
  } catch (err) {
    console.error("[MobileAuth/Google] Failed:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// ─── Apple ───────────────────────────────────────────────────────────────────

async function handleMobileAppleAuth(req: Request, res: Response) {
  const {
    identityToken,
    fullName,
    email: appleEmail,
  } = req.body as {
    identityToken?: string;
    fullName?: { givenName?: string; familyName?: string } | null;
    email?: string | null;
  };

  if (!identityToken) {
    return res.status(400).json({ error: "Missing identityToken" });
  }

  try {
    const appleUser = await appleSignin.verifyIdToken(identityToken, {
      audience: ENV.appleClientId,
      ignoreExpiration: false,
    });

    const sub = appleUser.sub;
    if (!sub) {
      return res.status(400).json({ error: "Apple did not return a subject" });
    }

    const openId = `apple_${sub}`;

    // Apple only provides name/email on the first sign-in
    const existingUser = await db.getUserByOpenId(openId);
    const isNewUser = !existingUser;

    let name: string | null = null;
    if (isNewUser && fullName) {
      const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
      name = parts.join(" ") || null;
    } else if (existingUser) {
      name = existingUser.name ?? null;
    }

    const email = (isNewUser ? appleEmail : existingUser?.email) ?? null;
    if (isNewUser && (await isHighConfidenceDisposableEmail(email))) {
      return res.status(409).json({ error: "disposable_email" });
    }

    await db.upsertUser({
      openId,
      name,
      email,
      loginMethod: "apple",
      lastSignedIn: new Date(),
    });

    if (isNewUser && email) {
      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (ownerUser) {
        sendUserWelcomeEmail({
          ownerUserId: ownerUser.id,
          toEmail: email,
          toName: name,
        }).catch((err: unknown) => {
          console.warn(
            "[MobileAuth/Apple] Welcome email failed (non-fatal):",
            err
          );
        });
      }
    }

    const user = await db.getUserByOpenId(openId);
    if (!user)
      throw new Error("Session user unavailable after Apple account update");
    const { token: sessionToken } = await issueSecuritySession({
      userId: user.id,
      authMethod: "oauth",
      assurance: "a1",
      req,
    });
    const tier = (user as { tier?: string } | null)?.tier ?? "free";

    return res.json({
      token: sessionToken,
      userId: user?.id ?? 0,
      name: name ?? "",
      email: email ?? "",
      avatarUrl: null,
      tier,
    });
  } catch (err) {
    console.error("[MobileAuth/Apple] Failed:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerMobileAuthRoutes(app: Express) {
  app.post("/api/auth/mobile/google", handleMobileGoogleAuth);
  app.post("/api/auth/mobile/apple", handleMobileAppleAuth);
}
