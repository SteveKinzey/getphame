/**
 * Gmail OAuth integration for ReviewRocket.
 *
 * Flow:
 * 1. User clicks "Connect Gmail" → frontend calls /api/gmail/auth-url
 * 2. User is redirected to Google OAuth consent screen
 * 3. Google redirects back to /api/gmail/callback with a code
 * 4. We exchange the code for access + refresh tokens and store them
 * 5. When sending a review request, we use the stored tokens to call Gmail API
 */

import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { gmailTokens } from "../drizzle/schema";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getRedirectUri(origin: string): string {
  return `${origin}/api/gmail/callback`;
}

/** Build the Google OAuth consent URL */
export function buildGmailAuthUrl(origin: string, userId: number): string {
  const params = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: getRedirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: String(userId),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Exchange an authorization code for tokens */
export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  email: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

  // Get the user's Gmail address
  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userInfo = await userRes.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    email: userInfo.email ?? "",
  };
}

/** Refresh an expired access token */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

/** Get a valid access token for a user, refreshing if needed */
export async function getValidAccessToken(userId: number): Promise<{
  accessToken: string;
  gmailEmail: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(gmailTokens)
    .where(eq(gmailTokens.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;
  const token = rows[0];

  // Check if token is still valid (with 60s buffer)
  if (token.expiresAt && token.expiresAt > Date.now() + 60_000) {
    return { accessToken: token.accessToken, gmailEmail: token.gmailEmail ?? "" };
  }

  // Refresh the token
  if (!token.refreshToken) return null;

  try {
    const { accessToken, expiresAt } = await refreshAccessToken(token.refreshToken);
    await db
      .update(gmailTokens)
      .set({ accessToken, expiresAt })
      .where(eq(gmailTokens.userId, userId));
    return { accessToken, gmailEmail: token.gmailEmail ?? "" };
  } catch {
    return null;
  }
}

/** Save or update Gmail tokens for a user */
export async function saveGmailTokens(
  userId: number,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: number,
  gmailEmail: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(gmailTokens)
    .values({ userId, accessToken, refreshToken, expiresAt, gmailEmail })
    .onDuplicateKeyUpdate({ set: { accessToken, refreshToken, expiresAt, gmailEmail } });
}

/** Delete Gmail tokens for a user (disconnect) */
export async function deleteGmailTokens(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(gmailTokens).where(eq(gmailTokens.userId, userId));
}

/**
 * Send an email via the Gmail API using the user's stored tokens.
 * The email appears to come from the user's own Gmail address.
 */
export async function sendViaGmail(
  userId: number,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const tokenData = await getValidAccessToken(userId);
  if (!tokenData) {
    throw new Error("Gmail not connected. Please connect your Gmail account in Settings.");
  }

  const { accessToken, gmailEmail } = tokenData;

  // Build RFC 2822 email message
  const message = [
    `From: ${gmailEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlBody,
  ].join("\r\n");

  // Base64url encode
  const encoded = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encoded }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Gmail send failed: ${(err as any)?.error?.message ?? res.statusText}`
    );
  }
}
