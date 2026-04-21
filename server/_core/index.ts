import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { stripe } from "../stripe";
import { getDb, getUserByOpenId } from "../db";
import { ENV } from "./env";
import { businessProfiles, stripeSubscriptions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./sdk";
import { startReminderScheduler } from "../reminders";
import { startSmtpHealthCheckScheduler } from "../smtpHealthCheck";
import { startSmtpWeeklyDigestScheduler } from "../smtpWeeklyDigest";
import { startReEngagementScheduler } from "../reEngagementScheduler";
import { registerSitemapRoutes } from "../sitemap";
import { registerZohoRoutes } from "../zoho";
import { exchangeGmailCode, getGmailRedirectUri } from "../gmail";

import { handleOpenPixel, handleClickRedirect } from "../emailTracking";
import { sendUpgradeReceiptEmail, sendChurnRecoveryEmail } from "../smtp";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ⚠️ Stripe webhook MUST use raw body — register BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Test event passthrough — required for Stripe webhook verification
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any;
        const userId = parseInt(session.metadata?.user_id ?? session.client_reference_id ?? "0", 10);
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | null;
        const plan = (session.metadata?.plan ?? "monthly") as "monthly" | "annual" | "lifetime";
        const mode = session.mode as string; // "subscription" | "payment"

        // Map plan to tier
        const tierMap: Record<string, "pro" | "annual" | "lifetime"> = {
          monthly: "pro",
          annual: "annual",
          lifetime: "lifetime",
        };
        const newTier = tierMap[plan] ?? "pro";

        // Lifetime = no expiry; monthly/annual expire based on billing cycle
        const planExpiresAt = newTier === "lifetime" ? null : undefined;

        if (userId && customerId) {
          // Save Stripe customer ID and upgrade tier
          await db
            .update(businessProfiles)
            .set({
              stripeCustomerId: customerId,
              tier: newTier,
              ...(planExpiresAt !== undefined ? { planExpiresAt } : {}),
            })
            .where(eq(businessProfiles.userId, userId));

          // Upsert subscription record for recurring plans
          if (subscriptionId && mode === "subscription") {
            await db
              .insert(stripeSubscriptions)
              .values({ userId, stripeSubscriptionId: subscriptionId, status: "active" })
              .onDuplicateKeyUpdate({ set: { stripeSubscriptionId: subscriptionId, status: "active" } });
          }

          // For Lifetime (one-time payment), store a sentinel subscription record
          // so the subscription.deleted webhook doesn't accidentally downgrade them
          if (mode === "payment" && newTier === "lifetime") {
            const paymentIntentId = session.payment_intent as string | null;
            if (paymentIntentId) {
              await db
                .insert(stripeSubscriptions)
                .values({ userId, stripeSubscriptionId: `lifetime_${paymentIntentId}`, status: "lifetime" })
                .onDuplicateKeyUpdate({ set: { status: "lifetime" } });
            }
          }

          console.log(`[Stripe Webhook] User ${userId} upgraded to ${newTier} (plan: ${plan}, mode: ${mode})`);

          // Send upgrade receipt email (fire-and-forget)
          const customerEmail = session.metadata?.customer_email as string | undefined;
          const customerName = session.metadata?.customer_name as string | undefined;
          if (customerEmail) {
            const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
            if (ownerUser) {
              sendUpgradeReceiptEmail({
                ownerUserId: ownerUser.id,
                toEmail: customerEmail,
                toName: customerName ?? null,
                tier: newTier,
              }).catch((err: unknown) => {
                console.warn("[Stripe Webhook] Upgrade receipt email failed (non-fatal):", err);
              });
            }
          }
        }
      }

      if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
        const sub = event.data.object as any;
        const subscriptionId = sub.id as string;
        const status = sub.status as string;

        // Find the user by subscription ID
        const rows = await db
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (rows.length > 0) {
          const userId = rows[0].userId;
          const existingStatus = rows[0].status;

          // Never downgrade a Lifetime user — their sentinel record has status="lifetime"
          if (existingStatus === "lifetime") {
            console.log(`[Stripe Webhook] Skipping downgrade for Lifetime user ${userId}`);
          } else {
            await db
              .update(stripeSubscriptions)
              .set({ status })
              .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId));

            // Downgrade to free if subscription is canceled or unpaid
            if (["canceled", "unpaid", "incomplete_expired"].includes(status)) {
              // Double-check current tier — don't downgrade a Lifetime user
              const [profile] = await db
                .select({ tier: businessProfiles.tier })
                .from(businessProfiles)
                .where(eq(businessProfiles.userId, userId))
                .limit(1);

              if (profile && profile.tier !== "lifetime") {
                await db
                  .update(businessProfiles)
                  .set({ tier: "free" })
                  .where(eq(businessProfiles.userId, userId));
                console.log(`[Stripe Webhook] User ${userId} downgraded to Free (status: ${status})`);
                // Fire churn recovery email on cancellation (fire-and-forget)
                if (status === "canceled") {
                  const ownerUser = await getUserByOpenId(ENV.ownerOpenId);
                  if (ownerUser) {
                    const [churningUser] = await db
                      .select({ email: users.email, name: users.name })
                      .from(users)
                      .where(eq(users.id, userId))
                      .limit(1);
                    if (churningUser?.email) {
                      sendChurnRecoveryEmail({
                        ownerUserId: ownerUser.id,
                        toEmail: churningUser.email,
                        toName: churningUser.name ?? null,
                      }).catch((err: unknown) => {
                        console.warn("[Stripe Webhook] Churn recovery email failed (non-fatal):", err);
                      });
                    }
                  }
                }
              } else {
                console.log(`[Stripe Webhook] Skipping downgrade — user ${userId} is on Lifetime tier`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Stripe Webhook] Processing error:", err);
    }

    res.json({ received: true });
  });

  // Security headers
  app.use(
    helmet({
      // Allow inline scripts/styles needed by Vite HMR in development
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false, // required for OAuth popup flows
    })
  );

  // Body parser — 5 MB is sufficient for all current payloads
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // SEO: sitemap.xml and robots.txt (must be before static/Vite catch-all)
  registerSitemapRoutes(app);

  // Zoho Books OAuth + webhook routes
  registerZohoRoutes(app);

  // Gmail OAuth 2.0 callback
  app.get("/api/gmail/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      console.error("[Gmail OAuth] Error from Google:", error);
      return res.redirect("/?gmailError=" + encodeURIComponent(error));
    }

    if (!code || !state) {
      return res.redirect("/?gmailError=missing_params");
    }

    try {
      // state encodes the origin so we can build the correct redirect URI
      const origin = Buffer.from(state, "base64").toString("utf8");
      const redirectUri = getGmailRedirectUri(origin);

      // Authenticate the user from the session cookie using the sdk
      let user;
      try {
        user = await sdk.authenticateRequest(req as any);
      } catch {
        return res.redirect("/settings?gmailError=not_logged_in");
      }

      const { email } = await exchangeGmailCode(code, redirectUri, user.id);
      console.log(`[Gmail OAuth] Connected Gmail for user ${user.id}: ${email}`);

      return res.redirect("/settings?gmailConnected=1");
    } catch (err: any) {
      console.error("[Gmail OAuth] Callback error:", err.message);
      return res.redirect("/settings?gmailError=" + encodeURIComponent(err.message));
    }
  });

  // Email open pixel and click redirect (unauthenticated — must be before tRPC catch-all)
  app.get("/api/track/open/:token", handleOpenPixel);
  app.get("/api/track/click/:token", handleClickRedirect);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startReminderScheduler();
    startSmtpHealthCheckScheduler();
    startSmtpWeeklyDigestScheduler();
    startReEngagementScheduler();
  });
}

startServer().catch(console.error);
