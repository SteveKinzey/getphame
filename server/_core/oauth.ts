import {
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
} from "@shared/const";
import { ENV } from "./env";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { isHighConfidenceDisposableEmail } from "../disposableDomains";
import { sendUserWelcomeEmail } from "../smtp";
import { sdk } from "./sdk";
import { issueSecuritySession } from "../security/passkeySessions";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const { nonce: stateNonce } = decodeOAuthState(state);
    const cookieNonce = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!stateNonce || !cookieNonce || stateNonce !== cookieNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none",
    });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this is a new user before upserting
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;
      if (isNewUser && await isHighConfidenceDisposableEmail(userInfo.email)) {
        return res.redirect(302, "/login?auth_error=disposable_email");
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Send welcome email to new users (fire-and-forget, non-blocking)
      if (isNewUser && userInfo.email) {
        const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          sendUserWelcomeEmail({
            ownerUserId: ownerUser.id,
            toEmail: userInfo.email,
            toName: userInfo.name || null,
          }).catch((err: unknown) => {
            console.warn("[OAuth] Welcome email failed (non-fatal):", err);
          });
        }
      }

      const sessionUser = await db.getUserByOpenId(userInfo.openId);
      if (!sessionUser) throw new Error("Session user unavailable after OAuth account update");
      await issueSecuritySession({
        userId: sessionUser.id,
        authMethod: "oauth",
        assurance: "a1",
        req,
        res,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
