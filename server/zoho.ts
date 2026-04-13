/**
 * server/zoho.ts — Zoho Books integration for ReviewLink
 *
 * Plans:
 *   monthly  → $29/mo  → tier: "pro"       → planExpiresAt: +30 days
 *   annual   → $290/yr → tier: "annual"    → planExpiresAt: +365 days
 *   lifetime → $1,247  → tier: "lifetime"  → planExpiresAt: null
 *
 * Flow:
 * 1. Owner visits /api/zoho/connect → redirected to Zoho login (one-time)
 * 2. Zoho redirects to /api/zoho/callback → tokens saved to DB
 * 3. User clicks upgrade → createOrGetZohoCustomer + createZohoInvoice + sendZohoInvoice
 * 4. Customer pays invoice → Zoho fires /api/zoho/webhook → tier updated in DB
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { zohoTokens, businessProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com";
const ZOHO_BOOKS_URL = "https://www.zohoapis.com/books/v3";
const ZOHO_ORG_ID = ENV.zohoOrgId;
const REDIRECT_URI = "https://reviewlink.app/api/zoho/callback";
const SCOPES = "ZohoBooks.fullaccess.all";

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export type ZohoPlan = "monthly" | "annual" | "lifetime";

const PLANS: Record<ZohoPlan, { label: string; description: string; rate: number; tier: "pro" | "annual" | "lifetime"; expiresInDays: number | null }> = {
  monthly: {
    label: "ReviewLink Pro — Monthly",
    description: "Unlimited review requests, follow-up reminders, WooCommerce sync, advanced analytics",
    rate: 29.00,
    tier: "pro",
    expiresInDays: 32, // slight buffer over 30 days
  },
  annual: {
    label: "ReviewLink Pro — Annual",
    description: "All Pro features — billed annually. Save $58 vs monthly.",
    rate: 290.00,
    tier: "annual",
    expiresInDays: 370, // slight buffer over 365 days
  },
  lifetime: {
    label: "ReviewLink Pro — Lifetime License",
    description: "All Pro features, forever. One-time payment, no renewals.",
    rate: 1247.00,
    tier: "lifetime",
    expiresInDays: null, // never expires
  },
};

// ─── Token Management ─────────────────────────────────────────────────────────

export async function getZohoAccessToken(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const stored = await db.query.zohoTokens.findFirst({
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });

  if (stored) {
    const expiresAt = Number(stored.expiresAt);
    if (Date.now() < expiresAt - 5 * 60 * 1000) return stored.accessToken;
    return refreshZohoToken(stored.refreshToken);
  }

  if (ENV.zohoRefreshToken) return refreshZohoToken(ENV.zohoRefreshToken);
  throw new Error("Zoho not connected. Visit /api/zoho/connect to authorize.");
}

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

  const data = await res.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) throw new Error(`Zoho token refresh failed: ${data.error ?? JSON.stringify(data)}`);

  const expiresAt = BigInt(Date.now() + (data.expires_in ?? 3600) * 1000);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.query.zohoTokens.findFirst();
  if (existing) {
    await db.update(zohoTokens)
      .set({ accessToken: data.access_token, expiresAt, updatedAt: BigInt(Date.now()) })
      .where(eq(zohoTokens.id, existing.id));
  } else {
    await db.insert(zohoTokens).values({ accessToken: data.access_token, refreshToken, expiresAt, updatedAt: BigInt(Date.now()) });
  }
  return data.access_token;
}

// ─── Zoho Books API Helpers ───────────────────────────────────────────────────

async function zohoRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const accessToken = await getZohoAccessToken();
  const url = `${ZOHO_BOOKS_URL}${path}?organization_id=${ZOHO_ORG_ID}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as T & { code?: number; message?: string };
  if (!res.ok || (data as { code?: number }).code !== 0) {
    throw new Error(`Zoho API error [${res.status}]: ${(data as { message?: string }).message ?? JSON.stringify(data)}`);
  }
  return data;
}

export async function createOrGetZohoCustomer(params: { email: string; name: string; phone?: string }): Promise<string> {
  const searchRes = await zohoRequest<{ code: number; contacts: Array<{ contact_id: string }> }>(
    "GET", `/contacts?email=${encodeURIComponent(params.email)}&contact_type=customer`
  );
  if (searchRes.contacts?.length > 0) return searchRes.contacts[0].contact_id;

  const createRes = await zohoRequest<{ code: number; contact: { contact_id: string } }>("POST", "/contacts", {
    contact_name: params.name,
    contact_type: "customer",
    email: params.email,
    phone: params.phone ?? "",
  });
  return createRes.contact.contact_id;
}

export async function createZohoInvoice(params: {
  zohoCustomerId: string;
  userId: number;
  userName: string;
  plan: ZohoPlan;
}): Promise<{ invoiceId: string; invoiceNumber: string; invoiceUrl: string }> {
  const planConfig = PLANS[params.plan];

  const res = await zohoRequest<{
    code: number;
    invoice: { invoice_id: string; invoice_number: string; invoice_url: string };
  }>("POST", "/invoices", {
    customer_id: params.zohoCustomerId,
    line_items: [{
      name: planConfig.label,
      description: planConfig.description,
      rate: planConfig.rate,
      quantity: 1,
    }],
    // Embed plan + userId in notes so webhook can identify user and tier
    notes: `ReviewLink user ID: ${params.userId} | plan: ${params.plan}`,
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

export async function sendZohoInvoice(invoiceId: string, plan: ZohoPlan): Promise<void> {
  const planConfig = PLANS[plan];
  const subjectMap: Record<ZohoPlan, string> = {
    monthly: "Your ReviewLink Pro Monthly Invoice",
    annual: "Your ReviewLink Pro Annual Invoice — Save $58",
    lifetime: "Your ReviewLink Lifetime License Invoice",
  };

  await zohoRequest("POST", `/invoices/${invoiceId}/email`, {
    send_from_org_email_id: true,
    to_mail_ids: [],
    subject: subjectMap[plan],
    body: `Hi,\n\nThank you for choosing ReviewLink! Please find your invoice for "${planConfig.label}" attached.\n\nClick the Pay Now button to complete your payment and activate your account immediately.\n\nThank you!`,
  });
}

// ─── Express Route Registration ───────────────────────────────────────────────

export function registerZohoRoutes(app: Express): void {
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

  app.get("/api/zoho/callback", async (req: Request, res: Response) => {
    const { code, error } = req.query as { code?: string; error?: string };
    if (error || !code) return res.status(400).send(`Zoho OAuth error: ${error ?? "No code received"}`);

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
        access_token?: string; refresh_token?: string; expires_in?: number; error?: string;
      };

      if (!tokenData.access_token || !tokenData.refresh_token) {
        throw new Error(tokenData.error ?? "Token exchange failed");
      }

      const expiresAt = BigInt(Date.now() + (tokenData.expires_in ?? 3600) * 1000);
      const db = await getDb();
      if (!db) throw new Error("Database not available");
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

      console.log("[Zoho] OAuth connected successfully.");
      res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>✅ Zoho Books Connected!</h2>
        <p>ReviewLink is now authorized to create customers and invoices in your Zoho Books account.</p>
        <p>You can close this tab.</p>
      </body></html>`);
    } catch (err) {
      console.error("[Zoho] OAuth callback error:", err);
      res.status(500).send(`Zoho connection failed: ${(err as Error).message}`);
    }
  });

  /**
   * Webhook: Zoho fires this when an invoice is paid.
   * Reads userId and plan from invoice notes, sets the correct tier and expiry.
   */
  app.post("/api/zoho/webhook", async (req: Request, res: Response) => {
    try {
      const payload = req.body as {
        invoice?: { invoice_id: string; status: string; notes: string };
      };

      const invoice = payload?.invoice;
      if (!invoice || invoice.status !== "paid") return res.json({ received: true });

      // Parse "ReviewLink user ID: 42 | plan: annual"
      const userMatch = invoice.notes?.match(/ReviewLink user ID: (\d+)/);
      const planMatch = invoice.notes?.match(/plan: (monthly|annual|lifetime)/);

      if (!userMatch) {
        console.warn("[Zoho Webhook] No user ID in notes:", invoice.notes);
        return res.json({ received: true });
      }

      const userId = parseInt(userMatch[1], 10);
      const plan: ZohoPlan = (planMatch?.[1] as ZohoPlan) ?? "monthly";
      const planConfig = PLANS[plan];

      const planExpiresAt = planConfig.expiresInDays
        ? Date.now() + planConfig.expiresInDays * 24 * 60 * 60 * 1000
        : null;

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(businessProfiles)
        .set({ tier: planConfig.tier, planExpiresAt })
        .where(eq(businessProfiles.userId, userId));

      console.log(`[Zoho Webhook] User ${userId} upgraded to "${planConfig.tier}" via invoice ${invoice.invoice_id} (plan: ${plan})`);
      res.json({ received: true, upgraded: true, tier: planConfig.tier });
    } catch (err) {
      console.error("[Zoho Webhook] Error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
