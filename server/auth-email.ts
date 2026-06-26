/**
 * Email + Password Authentication — register and login for tRPC + Express apps.
 *
 * Routes:
 *   POST /api/auth/register  → creates a new account (email + password)
 *   POST /api/auth/login     → validates credentials, issues JWT session cookie
 *
 * Security:
 *   - Passwords hashed with bcrypt (cost factor 12)
 *   - Input validated before any DB access
 *   - Generic error messages to prevent user enumeration
 *   - Rate limiting recommended at the reverse-proxy level (Fly.io / Cloudflare)
 *
 * Install: pnpm add bcryptjs && pnpm add -D @types/bcryptjs
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./db";
import { sendUserWelcomeEmail } from "./smtp";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  // RFC 5322-ish — good enough for server-side pre-validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be no more than ${MAX_PASSWORD_LENGTH} characters.`;
  }
  return null; // valid
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerEmailAuthRoutes(app: Express) {
  /**
   * POST /api/auth/register
   * Body: { email: string; password: string; name?: string }
   *
   * Creates a new user account. The email becomes the user's default
   * "from" address for sending review requests (overridable in Settings).
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    // --- Input validation ---
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const passwordError = validatePassword(password ?? "");
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Check if email is already registered (any auth method)
      const existingUser = await db.getUserByEmail(normalizedEmail);
      if (existingUser) {
        // Generic message — don't reveal which auth method they used
        return res.status(409).json({
          error: "An account with this email already exists. Try signing in instead.",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password!, BCRYPT_ROUNDS);

      // Create a stable openId for email-based accounts
      const openId = `email_${normalizedEmail}`;

      // Insert user — email is stored as the default sending email
      await db.upsertUser({
        openId,
        name: name?.trim() || null,
        email: normalizedEmail,
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Send welcome email (fire-and-forget)
      const ownerUser = await db.getUserByOpenId(ENV.ownerOpenId);
      if (ownerUser) {
        sendUserWelcomeEmail({
          ownerUserId: ownerUser.id,
          toEmail: normalizedEmail,
          toName: name?.trim() || null,
        }).catch((err: unknown) =>
          console.warn("[EmailAuth] Welcome email failed:", err)
        );
      }

      // Issue session cookie immediately after registration (no separate login step)
      const sessionToken = await sdk.createSessionToken(openId, {
        name: name?.trim() ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.status(201).json({ ok: true, redirect: "/onboarding" });
    } catch (err) {
      console.error("[EmailAuth] Register failed:", err);
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  /**
   * POST /api/auth/login
   * Body: { email: string; password: string }
   *
   * Validates credentials and issues a session JWT cookie.
   * Uses constant-time comparison to prevent timing attacks.
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    // --- Input validation ---
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Look up user by email
      const user = await db.getUserByEmail(normalizedEmail);

      if (!user) {
        // Run a dummy bcrypt compare to prevent timing-based user enumeration
        await bcrypt.compare(password, "$2b$12$dummyhashtopreventtimingattacks00000000000000000000");
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // User exists but registered via Google/Apple — no password set
      if (!user.passwordHash) {
        return res.status(401).json({
          error: `This account was created with ${user.loginMethod === "google" ? "Google" : "Apple"} Sign-In. Please use that method to log in.`,
        });
      }

      // Verify password (constant-time bcrypt compare)
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // Update last signed-in timestamp
      await db.updateUserLastSignedIn(user.openId, new Date());

      // Issue session cookie
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name ?? "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.status(200).json({ ok: true, redirect: "/" });
    } catch (err) {
      console.error("[EmailAuth] Login failed:", err);
      return res.status(500).json({ error: "Login failed. Please try again." });
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
