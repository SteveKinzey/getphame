/**
 * PayPal integration for Phame Pro subscriptions (alongside Stripe).
 *
 * Uses PayPal Orders v2 REST API for one-time payments.
 * Subscriptions are handled as one-time payments that set the same
 * businessProfiles.tier as Stripe does.
 *
 * Flow:
 * 1. User clicks "Pay with PayPal" → frontend calls POST /api/paypal/create-order
 * 2. Server creates a PayPal Order and returns the approval URL
 * 3. User approves on PayPal's hosted page → redirected back to /payment-success?paypal=1&token=xxx
 * 4. Frontend calls POST /api/paypal/capture-order with the order ID
 * 5. Server captures the payment and upgrades the user to Pro
 *
 * Webhook (optional, for async notifications):
 *   POST /api/paypal/webhook → handles PAYMENT.CAPTURE.COMPLETED etc.
 *
 * Env vars: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID (optional)
 */

import type { Express, Request, Response } from "express";
import { getDb, getUserByOpenId } from "./db";
import { businessProfiles, stripeSubscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { sendUpgradeReceiptEmail } from "./smtp";
import { getUnrewardedReferral, rewardReferrer } from "./referrals";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

function getPayPalCredentials() {
  // Support multiple naming conventions for the credentials
  const clientId = process.env.PAYPAL_CLIENT_ID ?? process.env.VITE_PAYPAL_CLIENT_ID ?? "";
  const secret = process.env.PAYPAL_SECRET ?? process.env.PAYPAL_CLIENT_SECRET ?? "";
  return { clientId, secret, configured: !!(clientId && secret) };
}

// ---------------------------------------------------------------------------
// PayPal API helpers
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const { clientId, secret } = getPayPalCredentials();
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Plan pricing (must match Stripe pricing)
const PLAN_PRICES: Record<string, { amount: string; description: string }> = {
  monthly: { amount: "29.00", description: "GetPhame Pro — Monthly" },
  annual: { amount: "290.00", description: "GetPhame Pro — Annual" },
  lifetime: { amount: "1247.00", description: "GetPhame Pro — Lifetime" },
};

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export function registerPayPalRoutes(app: Express) {
  /**
   * GET /api/paypal/status
   * Returns whether PayPal is configured (so frontend can conditionally show button)
   */
  app.get("/api/paypal/status", (_req: Request, res: Response) => {
    const { clientId, configured } = getPayPalCredentials();
    res.json({ enabled: configured, clientId: configured ? clientId : null });
  });

  /**
   * POST /api/paypal/create-order
   * Body: { plan: "monthly" | "annual" | "lifetime", origin: string }
   *
   * Creates a PayPal order and returns the approval URL + order ID.
   * Requires authenticated user (session cookie).
   */
  app.post("/api/paypal/create-order", async (req: Request, res: Response) => {
    const { configured } = getPayPalCredentials();
    if (!configured) {
      return res.status(503).json({ error: "PayPal is not configured." });
    }

    // Authenticate user from session cookie
    let user;
    try {
      user = await sdk.authenticateRequest(req as any);
    } catch {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const { plan = "monthly", origin = "https://getphame.app" } = req.body as {
      plan?: string;
      origin?: string;
    };

    const pricing = PLAN_PRICES[plan];
    if (!pricing) {
      return res.status(400).json({ error: "Invalid plan." });
    }

    try {
      const accessToken = await getAccessToken();

      const orderPayload = {
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: pricing.amount,
            },
            description: pricing.description,
            custom_id: JSON.stringify({
              user_id: user.id,
              plan,
              email: user.email ?? "",
              name: user.name ?? "",
            }),
          },
        ],
        application_context: {
          brand_name: "GetPhame",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          return_url: `${origin.replace(/\/$/, "")}/payment-success?paypal=1`,
          cancel_url: `${origin.replace(/\/$/, "")}/upgrade?paypal_cancelled=1`,
        },
      };

      const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      if (!orderRes.ok) {
        const text = await orderRes.text();
        console.error("[PayPal] Create order failed:", text);
        return res.status(500).json({ error: "Failed to create PayPal order." });
      }

      const order = (await orderRes.json()) as {
        id: string;
        links: Array<{ rel: string; href: string }>;
      };

      const approvalLink = order.links.find((l) => l.rel === "approve");

      return res.json({
        orderId: order.id,
        approvalUrl: approvalLink?.href ?? null,
      });
    } catch (err) {
      console.error("[PayPal] Create order error:", err);
      return res.status(500).json({ error: "PayPal order creation failed." });
    }
  });

  /**
   * POST /api/paypal/capture-order
   * Body: { orderId: string }
   *
   * Captures a previously approved PayPal order and upgrades the user.
   */
  app.post("/api/paypal/capture-order", async (req: Request, res: Response) => {
    const { configured } = getPayPalCredentials();
    if (!configured) {
      return res.status(503).json({ error: "PayPal is not configured." });
    }

    // Authenticate user from session cookie
    let user;
    try {
      user = await sdk.authenticateRequest(req as any);
    } catch {
      return res.status(401).json({ error: "Not authenticated." });
    }

    const { orderId } = req.body as { orderId?: string };
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required." });
    }

    try {
      const accessToken = await getAccessToken();

      const captureRes = await fetch(
        `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!captureRes.ok) {
        const text = await captureRes.text();
        console.error("[PayPal] Capture failed:", text);
        return res.status(500).json({ error: "Failed to capture PayPal payment." });
      }

      const captureData = (await captureRes.json()) as {
        id: string;
        status: string;
        purchase_units: Array<{
          payments: {
            captures: Array<{ id: string; status: string }>;
          };
          custom_id?: string;
        }>;
      };

      if (captureData.status !== "COMPLETED") {
        return res.status(400).json({ error: `Payment not completed. Status: ${captureData.status}` });
      }

      // Extract metadata from custom_id
      const customId = captureData.purchase_units?.[0]?.custom_id;
      let metadata = { user_id: user.id, plan: "monthly", email: "", name: "" };
      if (customId) {
        try {
          metadata = JSON.parse(customId);
        } catch {
          // fallback to authenticated user
        }
      }

      const userId = metadata.user_id || user.id;
      const plan = metadata.plan as "monthly" | "annual" | "lifetime";
      const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? orderId;

      // Upgrade user — same logic as Stripe webhook
      const db = await getDb();
      if (!db) {
        return res.status(500).json({ error: "Database unavailable." });
      }

      const tierMap: Record<string, "pro" | "annual" | "lifetime"> = {
        monthly: "pro",
        annual: "annual",
        lifetime: "lifetime",
      };
      const newTier = tierMap[plan] ?? "pro";
      const planExpiresAt = newTier === "lifetime" ? null : undefined;

      // Update business profile tier
      await db
        .update(businessProfiles)
        .set({
          tier: newTier,
          ...(planExpiresAt !== undefined ? { planExpiresAt } : {}),
        })
        .where(eq(businessProfiles.userId, userId));

      // Store a subscription record (same table as Stripe for unified status queries)
      await db
        .insert(stripeSubscriptions)
        .values({
          userId,
          stripeSubscriptionId: `paypal_${captureId}`,
          status: newTier === "lifetime" ? "lifetime" : "active",
        })
        .onDuplicateKeyUpdate({ set: {
            stripeSubscriptionId: `paypal_${captureId}`,
            status: newTier === "lifetime" ? "lifetime" : "active",
          } })

      console.log(`[PayPal] User ${userId} upgraded to ${newTier} (plan: ${plan}, capture: ${captureId})`);

      // Referral reward (same as Stripe)
      if ((newTier as string) !== "free") {
        try {
          const referral = await getUnrewardedReferral(userId);
          if (referral) {
            await rewardReferrer(referral.id, referral.referrerUserId);
            console.log(`[Referral] Rewarded user ${referral.referrerUserId} +30 days for referring user ${userId} (PayPal)`);
          }
        } catch (refErr) {
          console.warn("[Referral] Reward failed (non-fatal):", refErr);
        }
      }

      // Send upgrade receipt email (fire-and-forget)
      const customerEmail = metadata.email || user.email;
      if (customerEmail) {
        const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
        if (ownerUser) {
          sendUpgradeReceiptEmail({
            ownerUserId: ownerUser.id,
            toEmail: customerEmail,
            toName: metadata.name || user.name || null,
            tier: newTier,
          }).catch((err: unknown) => {
            console.warn("[PayPal] Upgrade receipt email failed (non-fatal):", err);
          });
        }
      }

      return res.json({ ok: true, tier: newTier });
    } catch (err) {
      console.error("[PayPal] Capture error:", err);
      return res.status(500).json({ error: "Payment capture failed." });
    }
  });

  /**
   * POST /api/paypal/webhook
   * Handles PayPal IPN/webhook notifications.
   * Optional — the capture-order endpoint already handles the upgrade.
   * This is a safety net for async payment confirmations.
   */
  app.post("/api/paypal/webhook", async (req: Request, res: Response) => {
    const { configured } = getPayPalCredentials();
    if (!configured) {
      return res.status(200).json({ ok: true });
    }

    try {
      const event = req.body as {
        event_type?: string;
        resource?: {
          id?: string;
          status?: string;
          custom_id?: string;
          purchase_units?: Array<{ custom_id?: string }>;
        };
      };

      console.log(`[PayPal Webhook] Event: ${event.event_type}`);

      // Handle payment capture completed (safety net)
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        const resource = event.resource;
        const customId = resource?.custom_id;

        if (customId) {
          try {
            const metadata = JSON.parse(customId) as {
              user_id: number;
              plan: string;
              email: string;
              name: string;
            };

            const db = await getDb();
            if (db && metadata.user_id) {
              const tierMap: Record<string, "pro" | "annual" | "lifetime"> = {
                monthly: "pro",
                annual: "annual",
                lifetime: "lifetime",
              };
              const newTier = tierMap[metadata.plan] ?? "pro";

              // Only upgrade if not already on a higher tier
              const [profile] = await db
                .select({ tier: businessProfiles.tier })
                .from(businessProfiles)
                .where(eq(businessProfiles.userId, metadata.user_id))
                .limit(1);

              if (profile && profile.tier === "free") {
                await db
                  .update(businessProfiles)
                  .set({ tier: newTier })
                  .where(eq(businessProfiles.userId, metadata.user_id));
                console.log(`[PayPal Webhook] Upgraded user ${metadata.user_id} to ${newTier}`);
              }
            }
          } catch (parseErr) {
            console.warn("[PayPal Webhook] Could not parse custom_id:", parseErr);
          }
        }
      }

      // Always return 200 to PayPal
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[PayPal Webhook] Error:", err);
      return res.status(200).json({ ok: true });
    }
  });
}
