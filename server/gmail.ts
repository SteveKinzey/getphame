/**
 * Gmail OAuth 2.0 helpers
 * - getGmailAuthUrl: generate the Google consent URL
 * - exchangeGmailCode: exchange auth code for tokens and persist
 * - getValidAccessToken: return a fresh access token (auto-refresh if expired)
 * - sendViaGmailOAuth: send an email using the stored OAuth tokens
 */

import { google } from "googleapis";
import { getDb } from "./db";
import { gmailTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

// ── OAuth2 client factory ─────────────────────────────────────────────────────

function makeOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    redirectUri
  );
}

// The redirect URI must match exactly what is registered in Google Cloud Console
export function getGmailRedirectUri(origin: string): string {
  if (ENV.isProduction) {
    return "https://reviewlink.app/api/gmail/callback";
  }
  return `${origin}/api/gmail/callback`;
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

export function getGmailAuthUrl(redirectUri: string, statePayload: string): string {
  const oauth2 = makeOAuth2Client(redirectUri);
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh_token to be returned every time
    scope: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: statePayload,
  });
}

// ── Exchange code for tokens ──────────────────────────────────────────────────

export async function exchangeGmailCode(
  code: string,
  redirectUri: string,
  userId: number
): Promise<{ email: string }> {
  const oauth2 = makeOAuth2Client(redirectUri);
  const { tokens } = await oauth2.getToken(code);

  if (!tokens.access_token) {
    throw new Error("No access token returned from Google");
  }

  // Get the user's Gmail address
  oauth2.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const { data: userInfo } = await oauth2Api.userinfo.get();
  const email = userInfo.email ?? "";

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Persist / upsert tokens
  const existing = await db
    .select({ id: gmailTokens.id })
    .from(gmailTokens)
    .where(eq(gmailTokens.userId, userId))
    .limit(1);

  const now = Date.now();
  const expiresAt = tokens.expiry_date ?? now + 3600 * 1000;

  if (existing.length > 0) {
    await db
      .update(gmailTokens)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
        gmailEmail: email,
      })
      .where(eq(gmailTokens.userId, userId));
  } else {
    await db.insert(gmailTokens).values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      gmailEmail: email,
    });
  }

  return { email };
}

// ── Get a valid (possibly refreshed) access token ────────────────────────────

export async function getValidAccessToken(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(gmailTokens)
    .where(eq(gmailTokens.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];

  const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry
  const isExpired = row.expiresAt ? row.expiresAt - bufferMs < Date.now() : false;

  if (!isExpired) return row.accessToken;

  // Refresh the token
  if (!row.refreshToken) return null;

  const oauth2 = makeOAuth2Client(""); // redirectUri not needed for refresh
  oauth2.setCredentials({ refresh_token: row.refreshToken });

  const { credentials } = await oauth2.refreshAccessToken();
  if (!credentials.access_token) return null;

  const expiresAt = credentials.expiry_date ?? Date.now() + 3600 * 1000;

  await db
    .update(gmailTokens)
    .set({
      accessToken: credentials.access_token,
      expiresAt,
    })
    .where(eq(gmailTokens.userId, userId));

  return credentials.access_token;
}

// ── Send email via Gmail API ──────────────────────────────────────────────────

export async function sendViaGmailOAuth(params: {
  userId: number;
  from: string; // "Name <email>" or just "email"
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const accessToken = await getValidAccessToken(params.userId);
  if (!accessToken) {
    throw new Error("No valid Gmail OAuth token found. Please reconnect Gmail.");
  }

  const oauth2 = makeOAuth2Client("");
  oauth2.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const messageParts = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    params.text ?? params.subject,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    params.html,
    ``,
    `--${boundary}--`,
  ];

  const raw = Buffer.from(messageParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

// ── Status helpers ────────────────────────────────────────────────────────────

export async function getGmailStatus(userId: number): Promise<{
  connected: boolean;
  email: string | null;
}> {
  const db = await getDb();
  if (!db) return { connected: false, email: null };

  const rows = await db
    .select({ gmailEmail: gmailTokens.gmailEmail, refreshToken: gmailTokens.refreshToken })
    .from(gmailTokens)
    .where(eq(gmailTokens.userId, userId))
    .limit(1);

  if (rows.length === 0) return { connected: false, email: null };
  return {
    connected: true,
    email: rows[0].gmailEmail ?? null,
  };
}

export async function disconnectGmail(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(gmailTokens).where(eq(gmailTokens.userId, userId));
}
