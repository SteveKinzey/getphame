/**
 * server/zoho.ts — Zoho Books integration for ReviewLink
 *
 * Flow:
 * 1. Owner visits /api/zoho/connect → redirected to Zoho login
 * 2. Zoho redirects to /api/zoho/callback with a code
 * 3. Server exchanges code for access + refresh tokens
 * 4. Refresh token is stored in DB (zoho_tokens table)
 * 5. All API calls auto-refresh the access token as needed
 * 6. When user upgrades: createZohoCustomer + createZohoInvoice + sendZohoInvoice
 * 7. Zoho webhook at /api/zoho/webhook fires on payment → user upgraded to Pro
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { zohoTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_BOOKS_URL = "https://www.zohoapis.com/books/v3";
const ZOHO_ORG_ID = ENV.zohoOrgId;
const REDIRECT_URI = "https://reviewlink.app/api/zoho/callback";
const SCOPES = "ZohoBooks.fullaccess.all";

// ─── Token Management ─────────────────────────────────────────────────────────

/** Get a valid access token, refreshing if expired */
export async function getZohoAccessToken(): Promise<string> {
  const db = await getDb();

  // Try stored token first
  const stored = await db.query.zohoTokens.findFirst({
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  if (stored) {
    // If token is still valid (expires in > 5 minutes), use it
    const expiresAt = Number(stored.expiresAt);
    if (Date.now() < expiresAt - 5 * 60 * 1000) {
      return stored.accessToken;
    }
    // Otherwise refresh it
    return refreshZohoToken(stored.refreshToken);
  }

  // Fall back to env refresh token (set during initial OAuth)
  if (ENV.zohoRefreshToken) {
    return refreshZohoToken(ENV.zohoRefreshToken);
  }

  throw new Error("Zoho not connected. Visit /api/zoho/connect to authorize.");
}

/** Exchange a refresh token for a new access token */
async function refreshZohoToken(refreshToken: string): Promise<string> {
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: ENV.zohoClientId,
    client_secret: ENV.zohoClientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!data.access_token) {
    throw new Error(`Zoho token refresh failed: ${data.error ?? JSON.stringify(data)}`);
  }

  const expiresAt = BigInt(Date.now() + (data.expires_in ?? 3600) * 1000);

  // Upsert token in DB
  const db = await getDb();
  const existing = await db.query.zohoTokens.findFirst();
  if (existing) {
    await db.update(zohoTokens)
      .set({ accessToken: data.access_token, expiresAt, updatedAt: BigInt(Date.now()) })
      .where(eq(zohoTokens.id, existing.id));
  } else {
    await db.insert(zohoTokens).values({
      accessToken: data.access_token,
      refreshToken,
      expiresAt,
      updatedAt: BigInt(Date.now()),
    });
  }

  return data.access_token;
}

// ─── Zoho Books API Helpers ───────────────────────────────────────────────────

/** Make an authenticated request to Zoho Books API */
async function zohoRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const accessToken = await getZohoAccessToken();
  const url = `${ZOHO_BOOKS_URL}${path}?organization_id=${ZOHO_ORG_ID}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json() as T & { code?: number; message?: string };

  if (!res.ok || (data as { code?: number }).code !== 0) {
    throw new Error(
      `Zoho API error [${res.status}]: ${(data as { message?: string }).message ?? JSON.stringify(data)}`
    );
  }

  return data;
}

/** Create or retrieve a Zoho Books customer by email */
export async function createOrGetZohoCustomer(params: {
  email: string;
  name: string;
  phone?: string;
}): Promise<string> {
  // Search for existing customer by email
  const searchRes = await zohoRequest<{
    code: number;
    contacts: Array<{ contact_id: string; email: string }>;
  }>("GET", `/contacts?email=${encodeURIComponent(params.email)}&contact_type=customer`);

  if (searchRes.contacts && searchRes.contacts.length > 0) {
    return searchRes.contacts[0].contact_id;
  }

  // Create new customer
  const createRes = await zohoRequest<{
    code: number;
    contact: { contact_id: string };
  }>("POST", "/contacts", {
    contact_name: params.name,
    contact_type: "customer",
    email: params.email,
    phone: params.phone ?? "",
    billing_address: {},
  });

  return createRes.contact.contact_id;
}

/** Create a Zoho Books invoice for ReviewLink Pro ($29/month) */
export async function createZohoInvoice(params: {
  zohoCustomerId: string;
  userEmail: string;
  userName: string;
  userId: number;
}): Promise<{ invoiceId: string; invoiceNumber: string; invoiceUrl: string }> {
  const res = await zohoRequest<{
    code: number;
    invoice: {
      invoice_id: string;
      invoice_number: string;
      invoice_url: string;
    };
  }>("POST", "/invoices", {
    customer_id: params.zohoCustomerId,
    line_items: [
      {
        name: "ReviewLink Pro — Monthly Subscription",
        description: "Unlimited review requests, follow-up reminders, advanced analytics",
        rate: 29.00,
        quantity: 1,
      },
    ],
    notes: `ReviewLink user ID: ${params.userId}`,
    terms: "Payment due upon receipt.",
    payment_options: {
      payment_gateways: [{ configured: true, gateway_name: "stripe" }],
    },
  });

  return {
    invoiceId: res.invoice.invoice_id,
    invoiceNumber: res.invoice.invoice_number,
    invoiceUrl: res.invoice.invoice_url,
  };
}

/** Send a Zoho Books invoice to the customer via email */
export async function sendZohoInvoice(invoiceId: string): Promise<void> {
  await zohoRequest("POST", `/invoices/${invoiceId}/email`, {
    send_from_org_email_id: true,
    to_mail_ids: [],
    subject: "Your ReviewLink Pro Invoice",
    body: "Hi,\n\nPlease find your ReviewLink Pro invoice attached. Click the Pay Now button to complete your payment and activate your Pro account.\n\nThank you!",
  });
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerZohoRoutes(app: Express): void {
  /** Step 1: Redirect owner to Zoho authorization page */
  app.get("/api/zoho/connect", (req: Request, res: Response) => {
    const authUrl = new URL(`${ZOHO_ACCOUNTS_URL}/oauth/v2/auth`);
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("client_id", ENV.zohoClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    res.redirect(authUrl.toString());
  });

  /** Step 2: Handle Zoho OAuth callback — exchange code for tokens */
  app.get("/api/zoho/callback", async (req: Request, res: Response) => {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error || !code) {
      return res.status(400).send(`Zoho OAuth error: ${error ?? "No code received"}`);
    }

    try {
      const params = new URLSearchParams({
        code,
        client_id: ENV.zohoClientId,
        client_secret: ENV.zohoClientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      });

      const tokenRes = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const tokenData = await tokenRes.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
      };

      if (!tokenData.access_token || !tokenData.refresh_token) {
        throw new Error(tokenData.error ?? "Token exchange failed");
      }

      const expiresAt = BigInt(Date.now() + (tokenData.expires_in ?? 3600) * 1000);
      const db = await getDb();

      // Upsert token record
      const existing = await db.query.zohoTokens.findFirst();
      if (existing) {
        await db.update(zohoTokens).set({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          updatedAt: BigInt(Date.now()),
        }).where(eq(zohoTokens.id, existing.id));
      } else {
        await db.insert(zohoTokens).values({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          updatedAt: BigInt(Date.now()),
        });
      }

      console.log("[Zoho] OAuth connected successfully. Refresh token saved.");
      res.send(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>✅ Zoho Books Connected!</h2>
          <p>ReviewLink is now authorized to create customers and invoices in your Zoho Books account.</p>
          <p>You can close this tab.</p>
        </body></html>
      `);
    } catch (err) {
      console.error("[Zoho] OAuth callback error:", err);
      res.status(500).send(`Zoho connection failed: ${(err as Error).message}`);
    }
  });

  /** Step 3: Webhook — Zoho fires this when an invoice is paid */
  app.post("/api/zoho/webhook", async (req: Request, res: Response) => {
    try {
      const payload = req.body as {
        invoice?: {
          invoice_id: string;
          status: string;
          notes: string;
          customer_id: string;
        };
      };

      const invoice = payload?.invoice;
      if (!invoice || invoice.status !== "paid") {
        return res.json({ received: true });
      }

      // Extract userId from invoice notes field
      const match = invoice.notes?.match(/ReviewLink user ID: (\d+)/);
      if (!match) {
        console.warn("[Zoho Webhook] No user ID found in invoice notes:", invoice.notes);
        return res.json({ received: true });
      }

      const userId = parseInt(match[1], 10);
      const db = await getDb();
      const { users } = await import("../drizzle/schema");

      await db.update(users)
        .set({ tier: "pro" })
        .where(eq(users.id, userId));

      console.log(`[Zoho Webhook] User ${userId} upgraded to Pro via invoice ${invoice.invoice_id}`);
      res.json({ received: true, upgraded: true });
    } catch (err) {
      console.error("[Zoho Webhook] Error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
