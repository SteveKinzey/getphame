/**
 * Sign in with Apple — server-side OAuth flow.
 *
 * Routes:
 *   GET  /api/auth/apple          → redirects to Apple consent screen
 *   POST /api/auth/apple/callback → Apple POSTs a code; server exchanges it for tokens
 *
 * Apple Developer Console setup required (see README / delivery message):
 *   - App ID with "Sign in with Apple" capability enabled
 *   - Services ID (APPLE_CLIENT_ID) — e.g. "app.phame.signin"
 *   - Team ID (APPLE_TEAM_ID) — 10-char string from top-right of developer.apple.com
 *   - Key ID + private key (.p8) for Sign in with Apple (APPLE_KEY_ID, APPLE_PRIVATE_KEY)
 *   - Return URL registered: https://getphame.app/api/auth/apple/callback
 *
 * Note: Apple always POSTs to the callback (not GET), so the route is POST.
 * The private key env var should have literal \n replaced with actual newlines.
 */

import type { Express, Request, Response } from "express";
import appleSignin from "apple-signin-auth";
import { ENV } from "./_core/env";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";
import crypto from "crypto";
import { issueSecuritySession } from "./security/passkeySessions";
import { isHighConfidenceDisposableEmail } from "./disposableDomains";
import {
  consumeProviderHumanVerificationAttempt,
  createProviderHumanVerificationAttempt,
  recordSignupRiskEvent,
} from "./signupRisk";
import { verifyProviderStartHumanToken } from "./security/humanVerification";
import {
  isValidExpectedEmailHash,
  PASSKEY_ENROLLMENT_CANCEL_PATH,
  PASSKEY_ENROLLMENT_INTENT,
  PASSKEY_ENROLLMENT_MISMATCH_PATH,
  PASSKEY_ENROLLMENT_SUCCESS_PATH,
  providerEmailMatches,
} from "./security/passkeyEnrollmentIntent";

const APPLE_AUTHORIZATION_ENDPOINT = "https://appleid.apple.com/auth/authorize";
const APPLE_STATE_TTL_MS = 10 * 60 * 1000;

type AppleOAuthState = {
  redirectUri: string;
  nonce: string;
  expiresAt: number;
  intent?: typeof PASSKEY_ENROLLMENT_INTENT;
  expectedEmailHash?: string;
  humanVerificationAttemptId?: string;
};

function createSignedAppleState(
  redirectUri: string,
  input?: {
    intent?: typeof PASSKEY_ENROLLMENT_INTENT;
    expectedEmailHash?: string;
    humanVerificationAttemptId?: string;
  }
): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(32).toString("base64url");
  const payload: AppleOAuthState = {
    redirectUri,
    nonce,
    expiresAt: Date.now() + APPLE_STATE_TTL_MS,
    ...(input ?? {}),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(encodedPayload)
    .digest("base64url");

  return { state: `${encodedPayload}.${signature}`, nonce };
}

function verifySignedAppleState(
  state: string | undefined
): AppleOAuthState | null {
  if (!state || !ENV.cookieSecret) return null;
  const [encodedPayload, suppliedSignature, ...extra] = state.split(".");
  if (!encodedPayload || !suppliedSignature || extra.length > 0) return null;

  const expectedSignature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(encodedPayload)
    .digest();
  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (
    actualSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as Partial<AppleOAuthState>;
    if (
      typeof parsed.redirectUri !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now() ||
      (parsed.intent !== undefined &&
        (parsed.intent !== PASSKEY_ENROLLMENT_INTENT ||
          !isValidExpectedEmailHash(parsed.expectedEmailHash))) ||
      (parsed.humanVerificationAttemptId !== undefined &&
        (typeof parsed.humanVerificationAttemptId !== "string" ||
          !/^[0-9a-f-]{36}$/i.test(parsed.humanVerificationAttemptId)))
    ) {
      return null;
    }
    return parsed as AppleOAuthState;
  } catch {
    return null;
  }
}

function buildRedirectUri(req: Request): string {
  // Use APP_BASE_URL if set (production) so the redirect URI exactly matches
  // what is registered in the Apple Developer Portal Services ID.
  // Falls back to dynamic host detection for local dev.
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/apple/callback`;
  }
  const proto =
    (req.headers["x-forwarded-proto"] as string) ?? req.protocol ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string) ??
    req.headers.host ??
    "phame.app";
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

function createAppleAuthorization(
  req: Request,
  humanVerificationAttemptId?: string
): string | null {
  const redirectUri = buildRedirectUri(req);
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

  const { state, nonce } = createSignedAppleState(redirectUri, {
    ...(intent === PASSKEY_ENROLLMENT_INTENT
      ? { intent, expectedEmailHash: expectedEmailHash! }
      : {}),
    ...(humanVerificationAttemptId ? { humanVerificationAttemptId } : {}),
  });
  const authUrl = new URL(APPLE_AUTHORIZATION_ENDPOINT);
  authUrl.searchParams.set("response_type", "code id_token");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("client_id", ENV.appleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "name email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  return authUrl.toString();
}

export function registerAppleAuthRoutes(app: Express) {
  // Step 1: Redirect to Apple consent screen
  app.get("/api/auth/apple", (req: Request, res: Response) => {
    if (
      !ENV.appleClientId ||
      !ENV.appleTeamId ||
      !ENV.appleKeyId ||
      !ENV.applePrivateKey
    ) {
      return res.status(503).send("Apple Sign In is not configured yet.");
    }

    const authUrl = createAppleAuthorization(req);
    if (!authUrl) return res.status(400).send("Invalid verification request.");
    res.redirect(302, authUrl);
  });

  app.post("/api/auth/apple/start", async (req: Request, res: Response) => {
    if (
      !ENV.appleClientId ||
      !ENV.appleTeamId ||
      !ENV.appleKeyId ||
      !ENV.applePrivateKey
    ) {
      return res
        .status(503)
        .json({ error: "Apple Sign In is not configured yet." });
    }
    if (!(await verifyProviderStartHumanToken(req, req.body?.token))) {
      return res.status(403).json({
        error: "Human verification could not be completed. Please try again.",
      });
    }
    try {
      const attemptId = await createProviderHumanVerificationAttempt("apple");
      const authUrl = createAppleAuthorization(req, attemptId);
      if (!authUrl)
        return res.status(400).json({ error: "Invalid verification request." });
      return res.status(200).json({ url: authUrl });
    } catch (error) {
      console.error("[AppleAuth] Unable to start verified OAuth flow", error);
      return res.status(503).json({
        error: "Secure sign-in could not be started. Please try again.",
      });
    }
  });

  // Step 2: Apple POSTs back here with a short-lived authorization code.
  // The identity token is returned by Apple's server-to-server token exchange;
  // it is not guaranteed to be present in the browser callback payload.
  app.post("/api/auth/apple/callback", async (req: Request, res: Response) => {
    const {
      code,
      id_token: callbackIdToken,
      state,
      user: userJson,
      error,
      error_description: errorDescription,
    } = req.body as {
      code?: string;
      id_token?: string;
      state?: string;
      user?: string;
      error?: string;
      error_description?: string;
    };

    const verifiedState = verifySignedAppleState(state);
    if (!verifiedState || verifiedState.redirectUri !== buildRedirectUri(req)) {
      console.warn("[AppleAuth] State validation failed");
      return res.redirect(302, "/?auth_error=apple_state_mismatch");
    }
    const isPasskeyEnrollment =
      verifiedState.intent === PASSKEY_ENROLLMENT_INTENT;

    if (error) {
      console.warn(
        "[AppleAuth] Authorization declined or failed: %s %s",
        error,
        errorDescription ?? ""
      );
      return res.redirect(
        302,
        isPasskeyEnrollment
          ? PASSKEY_ENROLLMENT_CANCEL_PATH
          : "/?auth_error=apple_authorization_failed"
      );
    }

    if (!code) {
      console.warn("[AppleAuth] Missing authorization code");
      return res.redirect(
        302,
        isPasskeyEnrollment
          ? PASSKEY_ENROLLMENT_CANCEL_PATH
          : "/?auth_error=apple_missing_code"
      );
    }

    try {
      let identityToken = callbackIdToken;
      if (!identityToken) {
        const tokenResponse = (await appleSignin.getAuthorizationToken(code, {
          clientID: ENV.appleClientId,
          redirectUri: verifiedState.redirectUri,
          clientSecret: buildClientSecret(),
        })) as {
          id_token?: string;
          error?: string;
        };
        identityToken = tokenResponse.id_token;

        if (!identityToken) {
          const providerError =
            typeof tokenResponse.error === "string"
              ? tokenResponse.error.slice(0, 80)
              : "missing_id_token";
          console.warn("[AppleAuth] Token exchange failed", {
            providerError,
            responseKeys: Object.keys(tokenResponse).sort(),
          });
          return res.redirect(302, "/?auth_error=apple_token_exchange_failed");
        }
      }

      // Verify the id_token with Apple's public keys
      const appleUser = await appleSignin.verifyIdToken(identityToken, {
        audience: ENV.appleClientId,
        nonce: verifiedState.nonce,
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
          email = email ?? parsedUser?.email ?? null;
        } catch {
          // ignore
        }
      }

      if (isPasskeyEnrollment) {
        const emailVerified =
          appleUser.email_verified === true ||
          appleUser.email_verified === "true";
        const verifiedEmail =
          typeof appleUser.email === "string" ? appleUser.email : null;
        if (
          !emailVerified ||
          !verifiedEmail ||
          !verifiedState.expectedEmailHash ||
          !providerEmailMatches(verifiedEmail, verifiedState.expectedEmailHash)
        ) {
          return res.redirect(302, PASSKEY_ENROLLMENT_MISMATCH_PATH);
        }

        const providerUser = await db.getUserByOpenId(openId);
        const canonicalUser = await db.getUserByEmail(verifiedEmail);
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
              verifiedState.humanVerificationAttemptId,
              "apple"
            ))
          ) {
            return res.redirect(
              302,
              "/login?auth_error=human_verification_required"
            );
          }
          if (await isHighConfidenceDisposableEmail(verifiedEmail)) {
            return res.redirect(302, "/login?auth_error=disposable_email");
          }
          await db.upsertUser({
            openId,
            name,
            email: verifiedEmail,
            loginMethod: "apple",
            lastSignedIn: new Date(),
          });
          sessionUser = await db.getUserByOpenId(openId);
          isNewEnrollmentUser = true;
        } else if (!providerUser) {
          await db.linkUserIdentity({
            userId: sessionUser.id,
            openId,
            loginMethod: "apple",
            lastSignedIn: new Date(),
          });
        }
        if (!sessionUser)
          throw new Error("Session user unavailable after Apple verification");

        if (isNewEnrollmentUser) {
          sendUserWelcomeEmail({ toEmail: verifiedEmail, toName: name }).catch(
            (err: unknown) =>
              console.warn("[AppleAuth] Welcome email failed (non-fatal):", err)
          );
          void recordSignupRiskEvent({
            userId: sessionUser.id,
            subject: verifiedEmail,
            provider: "apple",
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
        return res.redirect(
          302,
          `/auth/apple/landing?return=${encodeURIComponent(PASSKEY_ENROLLMENT_SUCCESS_PATH)}`
        );
      }

      const existingIdentityUser = await db.getUserByOpenId(openId);
      const emailVerified =
        appleUser.email_verified === true ||
        appleUser.email_verified === "true";
      const existingEmailUser =
        !existingIdentityUser && email && emailVerified
          ? await db.getUserByEmail(email)
          : undefined;
      const existingUser = existingIdentityUser ?? existingEmailUser;
      const isNewUser = !existingUser;

      if (
        isNewUser &&
        (!email ||
          !emailVerified ||
          !(await consumeProviderHumanVerificationAttempt(
            verifiedState.humanVerificationAttemptId,
            "apple"
          )))
      ) {
        return res.redirect(
          302,
          "/login?auth_error=human_verification_required"
        );
      }
      if (isNewUser && (await isHighConfidenceDisposableEmail(email))) {
        return res.redirect(302, "/login?auth_error=disposable_email");
      }

      // If returning user, preserve their stored name
      if (!isNewUser && !name) {
        name = existingUser?.name ?? null;
      }

      if (existingEmailUser) {
        await db.linkUserIdentity({
          userId: existingEmailUser.id,
          openId,
          loginMethod: "apple",
          lastSignedIn: new Date(),
        });
      } else {
        await db.upsertUser({
          openId,
          name,
          email,
          loginMethod: "apple",
          lastSignedIn: new Date(),
        });
      }

      // Send welcome email to new users (fire-and-forget)
      if (isNewUser && email) {
        sendUserWelcomeEmail({ toEmail: email, toName: name }).catch(
          (err: unknown) => {
            console.warn("[AppleAuth] Welcome email failed (non-fatal):", err);
          }
        );
      }

      // Create the session with the canonical account identity. For an Apple
      // identity linked by verified email, this avoids depending on immediate
      // alias visibility on the first request after the callback.
      const sessionOpenId = existingUser?.openId ?? openId;
      const sessionUser = await db.getUserByOpenId(sessionOpenId);
      if (!sessionUser)
        throw new Error("Session user unavailable after Apple account update");
      if (isNewUser && email) {
        void recordSignupRiskEvent({
          userId: sessionUser.id,
          subject: email,
          provider: "apple",
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
      console.info("[AppleAuth] Callback completed", {
        accountResolution: existingEmailUser
          ? "linked_existing_email"
          : existingIdentityUser
            ? "existing_apple_identity"
            : "created_apple_identity",
        canonicalSession: sessionOpenId !== openId,
      });
      // Redirect to a same-origin landing page instead of / directly.
      // Apple's form_post is cross-origin (appleid.apple.com), so Safari ITP may
      // not send the session cookie on the immediate redirect. The landing page
      // does a client-side navigation after a 150ms delay, ensuring the cookie
      // is treated as first-party on the next request.
      const returnPath = "/";
      res.redirect(
        302,
        `/auth/apple/landing?return=${encodeURIComponent(returnPath)}`
      );
    } catch (err) {
      console.error("[AppleAuth] Callback failed:", err);
      res.redirect(302, "/?auth_error=apple_failed");
    }
  });

  // Step 3: Apple server-to-server notifications
  // Apple sends JWT-encoded events when users revoke Sign In with Apple or delete their account.
  // Required for App Store apps; also handles web users who revoke via appleid.apple.com.
  // Events: consent-revoked, account-delete, email-disabled, email-enabled
  app.post(
    "/api/auth/apple/notifications",
    async (req: Request, res: Response) => {
      try {
        const payload = req.body as { payload?: string };
        if (!payload?.payload) {
          return res.status(400).json({ error: "Missing payload" });
        }
        // Decode the JWT (Apple signs it with their own keys — we trust the sub claim)
        // For account-delete events, we anonymise the user's data
        const decoded = JSON.parse(
          Buffer.from(payload.payload.split(".")[1], "base64url").toString(
            "utf8"
          )
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
          console.log(
            `[AppleAuth] Server notification: ${event.type} for ${openId}`
          );
          if (
            event.type === "account-delete" ||
            event.type === "consent-revoked"
          ) {
            // Anonymise — remove personal data but keep the row for audit
            await db.anonymiseUserByOpenId(openId);
            console.log(
              `[AppleAuth] Anonymised user ${openId} due to ${event.type}`
            );
          }
        }
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[AppleAuth] Notification handler error:", err);
        // Always return 200 to Apple to prevent retries
        res.status(200).json({ ok: true });
      }
    }
  );
}
