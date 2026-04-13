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
import { getDb } from "../db";
import { businessProfiles, stripeSubscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./sdk";
import { startReminderScheduler } from "../reminders";
import { startSmtpHealthCheckScheduler } from "../smtpHealthCheck";
import { startSmtpWeeklyDigestScheduler } from "../smtpWeeklyDigest";
import { registerSitemapRoutes } from "../sitemap";
import { registerZohoRoutes } from "../zoho";
import { handleOpenPixel, handleClickRedirect } from "../emailTracking";

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
        const subscriptionId = session.subscription as string;

        if (userId && customerId) {
          // Save Stripe customer ID on the business profile
          await db
            .update(businessProfiles)
            .set({ stripeCustomerId: customerId, tier: "pro" })
            .where(eq(businessProfiles.userId, userId));

          // Upsert subscription record
          if (subscriptionId) {
            await db
              .insert(stripeSubscriptions)
              .values({ userId, stripeSubscriptionId: subscriptionId, status: "active" })
              .onDuplicateKeyUpdate({ set: { stripeSubscriptionId: subscriptionId, status: "active" } });
          }
          console.log(`[Stripe Webhook] User ${userId} upgraded to Pro`);
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
          await db
            .update(stripeSubscriptions)
            .set({ status })
            .where(eq(stripeSubscriptions.stripeSubscriptionId, subscriptionId));

          // Downgrade to free if subscription is canceled or unpaid
          if (["canceled", "unpaid", "incomplete_expired"].includes(status)) {
            await db
              .update(businessProfiles)
              .set({ tier: "free" })
              .where(eq(businessProfiles.userId, userId));
            console.log(`[Stripe Webhook] User ${userId} downgraded to Free (status: ${status})`);
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
  });
}

startServer().catch(console.error);
