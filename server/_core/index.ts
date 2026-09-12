import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerGoogleAuthRoutes } from "../auth-google";
import { registerEmailAuthRoutes } from "../auth-email";
import { registerAppleAuthRoutes } from "../appleAuth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";
import { reminderHeartbeatHandler } from "../scheduledReminders";
import { quietHoursHeartbeatHandler } from "../quietHoursHeartbeat";
import { koalendarHeartbeatHandler } from "../koalendarHeartbeat";
import { startSmtpWeeklyDigestScheduler } from "../smtpWeeklyDigest";
import { startReEngagementScheduler } from "../reEngagementScheduler";
import { startInactiveUserScheduler } from "../inactiveUserScheduler";
import { startWooAutoImportScheduler } from "../wooImportScheduler";
import { registerKoalendarRoutes } from "../koalendar";
import { registerSitemapRoutes } from "../sitemap";
import { exchangeGmailCode, getGmailRedirectUri } from "../gmail";

import { handleOpenPixel, handleClickRedirect } from "../emailTracking";
import { registerPublicApiRoutes } from "../publicApi";
import { registerMobileAuthRoutes } from "../mobileAuth";
import { authHealthHandler } from "../authHealthRoutes";
import { smtpHealthHandler } from "../smtpHealthRoutes";
import { sourceHealthHandler } from "../sourceHealthRoutes";
import {
  SOURCE_HEALTH_CALLBACK_PATH,
  reconcileSourceHealthHeartbeat,
} from "../sourceHealthHeartbeat";
import { disposableDomainHandler } from "../disposableDomainRoutes";
import {
  DISPOSABLE_DOMAIN_CALLBACK_PATH,
  reconcileDisposableDomainHeartbeat,
} from "../disposableDomainHeartbeat";
import { reconcileRelayHealthHeartbeat } from "../relayHealthHeartbeat";
import { releaseHistoryExportScheduleHandler } from "../releaseHistoryExportScheduleRoutes";
import { apiNotFoundHandler } from "./apiFallback";
import { registerPublicFeaturePrerender } from "../publicFeaturePrerender";
import { registerTranscriptFontRoutes } from "../transcriptFontRoutes";
import { registerStaticCopyRoutes } from "../staticCopyRoutes";
import { registerAutomationHealthRoutes } from "../automationHealthRoutes";
import { registerSecurityAuditReportRoutes } from "../securityAuditReportRoutes";
import {
  registerAgentDiscoveryLinkHeaders,
  registerAgentDiscoveryRoutes,
} from "../agentDiscovery";
import { stripeWebhookHandler } from "../stripeLifecycle";
import { stripeLifecycleHeartbeatHandler } from "../stripeLifecycleProcessor";
import {
  STRIPE_LIFECYCLE_CALLBACK_PATH,
  reconcileStripeLifecycleHeartbeat,
} from "../stripeLifecycleHeartbeat";
import { monthlyDiagnosticsScheduleHandler } from "../monthlyDiagnosticsScheduleRoutes";
import {
  MONTHLY_DIAGNOSTICS_CALLBACK_PATH,
  reconcileMonthlyDiagnosticsHeartbeat,
} from "../monthlyDiagnosticsSchedule";
import { integrationHealthHandler } from "../integrationHealthRoutes";
import {
  INTEGRATION_HEALTH_CALLBACK_PATH,
  reconcileIntegrationHealthHeartbeat,
} from "../integrationHealthHeartbeat";

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

function normalizeIpForGeoLookup(value: string): string | null {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("::ffff:")
    ? trimmed.slice("::ffff:".length)
    : trimmed;
  const lowerCased = normalized.toLowerCase();
  if (!normalized || net.isIP(normalized) === 0) return null;
  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
    normalized.startsWith("169.254.") ||
    lowerCased.startsWith("fc") ||
    lowerCased.startsWith("fd") ||
    lowerCased.startsWith("fe80:")
  ) {
    return null;
  }
  return normalized;
}

async function startServer() {
  const app = express();
  // The managed runtime terminates HTTPS before forwarding to Express.
  // Trust only the first proxy so req.protocol and secure cookies reflect the
  // public getphame.app request rather than the internal HTTP hop.
  app.set("trust proxy", 1);
  const server = createServer(app);

  // ⚠️ Stripe webhook MUST use raw body — register BEFORE express.json()
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );

  // Redirect only the known www hostname. Never derive the redirect target or
  // scheme from request headers because both can be attacker-controlled.
  app.use((req, res, next) => {
    if (req.hostname.toLowerCase() === "www.getphame.app") {
      return res.redirect(301, `https://getphame.app${req.originalUrl}`);
    }
    next();
  });

  // Security headers
  const contentSecurityPolicyDirectives = {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    // Allow images from self, data URIs, Cloudflare R2 CDN, CloudFront, and public manuscdn CDN
    imgSrc: [
      "'self'",
      "data:",
      "https://assets.getphame.app",
      "https://*.r2.dev",
      "https://d2xsxph8kpxj0f.cloudfront.net",
      // Managed web assets redirect to this CloudFront distribution in production.
      "https://d36hbw14aib5lz.cloudfront.net",
      "https://files.manuscdn.com",
      // YouTube thumbnails used on landing page VideoDemo section
      "https://img.youtube.com",
      "https://i.ytimg.com",
    ],
    // Allow YouTube embeds and the official Turnstile challenge frame.
    frameSrc: [
      // Admin email previews render local, static HTML through a revocable Blob URL.
      "blob:",
      "https://www.youtube.com",
      "https://youtube.com",
      "https://challenges.cloudflare.com",
    ],
    // Keep video delivery restricted to the app and the durable public media CDN.
    mediaSrc: ["'self'", "https://files.manuscdn.com"],
    // Allow outbound API calls: IP detection, analytics, font CDNs, and public manuscdn CDN (used for app logo preload)
    connectSrc: [
      "'self'",
      "http://ip-api.com",
      "https://ip-api.com",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://vitals.vercel-insights.com",
      "https://files.manuscdn.com",
      // Manus analytics (Umami) beacon endpoint
      "https://manus-analytics.com",
      ...(process.env.NODE_ENV === "production"
        ? []
        : ["http:", "https:", "ws:", "wss:"]),
    ],
    objectSrc: ["'none'"],
    // Allow the Manus analytics script (Umami) injected by the platform at deploy time.
    // 'unsafe-inline' is required because the Manus platform injects an inline <script>
    // into the served HTML at deploy time (line 146) that cannot be removed or hashed.
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://manus-analytics.com",
      // Cloudflare Web Analytics injects this integrity-protected beacon at the proxied edge.
      "https://static.cloudflareinsights.com",
      // Invisible Turnstile protects genuinely new account creation.
      "https://challenges.cloudflare.com",
      ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
    ],
    scriptSrcAttr: ["'none'"],
    // 'unsafe-inline' is required for:
    // 1. The Manus platform injects an inline script at line 146 of the served HTML
    // 2. The shadcn/ui chart component injects dynamic <style> tags with CSS custom properties
    // Removing it causes the app to break entirely (white screen).
    // The Cloudflare warning is advisory — the actual XSS risk is low given the app has no
    // user-generated HTML injection vectors. Revisit with a nonce-based approach later.
    styleSrc: ["'self'", "https:", "'unsafe-inline'"],
    ...(process.env.NODE_ENV === "production"
      ? { upgradeInsecureRequests: [] }
      : {}),
  };
  app.use(
    helmet({
      // Allow inline scripts/styles needed by Vite HMR in development
      contentSecurityPolicy: {
        directives: contentSecurityPolicyDirectives,
      },
      crossOriginEmbedderPolicy: false, // required for OAuth popup flows
    })
  );
  registerAgentDiscoveryLinkHeaders(app);

  // Body parser — 5 MB is sufficient for all current payloads
  // Cookie parsing must run before the OAuth callback so the Google CSRF state
  // cookie can be validated by the canonical auth-google route.
  app.use(cookieParser());
  registerAutomationHealthRoutes(app);
  registerSecurityAuditReportRoutes(app);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));
  registerAgentDiscoveryRoutes(app);

  // Public, non-sensitive readiness signal for the authenticated dashboard
  // shell. It must remain before tRPC and the SPA fallback so restart windows
  // receive JSON rather than the HTML app shell.
  app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ ok: true, status: "ready" });
  });

  // Same-origin delivery for the bounded Unicode subsets used by client-side
  // transcript PDFs. Managed asset redirects are not readable by browser
  // fetch() on custom domains because their CDN response omits CORS headers.
  registerTranscriptFontRoutes(app);
  registerStaticCopyRoutes(app);

  // OAuth callback under /api/oauth/callback
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleAuthRoutes(app);
  registerEmailAuthRoutes(app);
  registerAppleAuthRoutes(app);
  registerMobileAuthRoutes(app);
  registerKoalendarRoutes(app);
  app.post("/api/scheduled/auth-health", authHealthHandler);
  app.post("/api/scheduled/smtp-health", smtpHealthHandler);
  app.post(
    "/api/scheduled/relay-heartbeat",
    (await import("../relayHealthRoutes")).relayHeartbeatHandler
  );
  app.post(SOURCE_HEALTH_CALLBACK_PATH, sourceHealthHandler);
  app.post(DISPOSABLE_DOMAIN_CALLBACK_PATH, disposableDomainHandler);
  app.post(
    "/api/scheduled/release-history-export",
    releaseHistoryExportScheduleHandler
  );
  app.post("/api/scheduled/process-reminders", reminderHeartbeatHandler);
  app.post("/api/scheduled/process-quiet-hours", quietHoursHeartbeatHandler);
  app.post("/api/scheduled/process-koalendar", koalendarHeartbeatHandler);
  app.post(STRIPE_LIFECYCLE_CALLBACK_PATH, stripeLifecycleHeartbeatHandler);
  app.post(
    MONTHLY_DIAGNOSTICS_CALLBACK_PATH,
    monthlyDiagnosticsScheduleHandler
  );
  app.post(INTEGRATION_HEALTH_CALLBACK_PATH, integrationHealthHandler);

  // IP-based language detection — returns 'en' | 'th' | 'zh-TW' based on client IP
  // Note: Mainland China (CN) is excluded from zh-TW detection since YouTube is blocked there.
  // Traditional Chinese (zh-TW) targets Taiwan, Hong Kong, Macau, and overseas Chinese communities.
  app.get("/api/detect-language", async (req, res) => {
    try {
      const ip = normalizeIpForGeoLookup(
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip ||
          req.socket.remoteAddress ||
          ""
      );
      if (!ip) {
        return res.json({ lang: "en" });
      }
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=countryCode`,
        { signal: AbortSignal.timeout(3_000) }
      );
      const data = (await response.json()) as { countryCode?: string };
      const country = data.countryCode ?? "";
      // Map country codes to supported languages
      // TW=Taiwan, HK=Hong Kong, MO=Macau, SG=Singapore — all use Traditional Chinese
      // CN (mainland China) intentionally excluded: YouTube is banned there
      let lang = "en";
      if (country === "TH") lang = "th";
      else if (["TW", "HK", "MO", "SG"].includes(country)) lang = "zh-TW";
      else if (["FR", "BE", "CH", "LU", "MC"].includes(country))
        lang = "fr"; // French-speaking countries
      else if (
        [
          "ES",
          "MX",
          "AR",
          "CO",
          "CL",
          "PE",
          "VE",
          "EC",
          "BO",
          "PY",
          "UY",
          "CR",
          "PA",
          "DO",
          "CU",
          "GT",
          "HN",
          "SV",
          "NI",
        ].includes(country)
      )
        lang = "es"; // Spanish-speaking countries
      else if (["IT", "SM", "VA"].includes(country)) lang = "it"; // Italy, San Marino, Vatican
      return res.json({ lang });
    } catch {
      return res.json({ lang: "en" });
    }
  });

  // SEO: sitemap.xml and robots.txt (must be before static/Vite catch-all)
  registerSitemapRoutes(app);

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
      console.log(
        `[Gmail OAuth] Connected Gmail for user ${user.id}: ${email}`
      );

      return res.redirect("/settings?gmailConnected=1");
    } catch (err: any) {
      console.error("[Gmail OAuth] Callback error:", err.message);
      return res.redirect(
        "/settings?gmailError=" + encodeURIComponent(err.message)
      );
    }
  });

  // Email open pixel and click redirect (unauthenticated — must be before tRPC catch-all)
  app.get("/api/track/open/:token", handleOpenPixel);
  app.get("/api/track/click/:token", handleClickRedirect);

  // Public REST API — API key authenticated (contacts import, etc.)
  registerPublicApiRoutes(app as any);

  // One-click unsubscribe for re-engagement emails
  app.get("/api/reengagement/unsubscribe/:token", async (req, res) => {
    const { token } = req.params;
    try {
      const db = await getDb();
      if (!db || !token) return res.status(400).send("Invalid link.");
      const { churnSurveys: cs } = await import("../../drizzle/schema");
      const { eq: eqOp } = await import("drizzle-orm");
      const [row] = await db
        .select()
        .from(cs)
        .where(eqOp(cs.unsubscribeToken, token))
        .limit(1);
      if (!row) return res.status(404).send("Link not found or already used.");
      await db
        .update(cs)
        .set({ reEngagementOptedOut: 1 })
        .where(eqOp(cs.id, row.id));
      res.send(
        `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Unsubscribed</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f5f7;}div{text-align:center;max-width:400px;padding:40px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);}h2{color:#1a2744;margin:0 0 12px;}p{color:#666;margin:0;}a{color:#1a2744;}</style></head><body><div><h2>✓ Unsubscribed</h2><p>You won't receive any more re-engagement emails from Phame.</p><p style="margin-top:16px;"><a href="https://getphame.app">Visit Phame</a></p></div></body></html>`
      );
    } catch (err) {
      console.error("[Unsubscribe] Error:", err);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // API requests must always return JSON. Do not let unmatched API paths fall
  // through to Vite's HTML app-shell fallback during restarts or route errors.
  app.use("/api", apiNotFoundHandler);

  // Serve route-specific static HTML for public SEO feature pages before the
  // Vite/static SPA fallback. React replaces this root with the full interactive
  // feature page for JavaScript-capable visitors.
  registerPublicFeaturePrerender(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port =
    process.env.NODE_ENV === "production"
      ? preferredPort
      : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (ENV.isProduction) {
      // Defer heartbeat reconciliations by 30 seconds so cold-start readiness
      // probe passes immediately without competing for database or network I/O
      setTimeout(() => {
        void reconcileSourceHealthHeartbeat()
          .then(result =>
            console.log(`[SourceHealth] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error("[SourceHealth] Heartbeat reconciliation failed.")
          );
        void reconcileDisposableDomainHeartbeat()
          .then(result =>
            console.log(`[DisposableDomains] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error(
              "[DisposableDomains] Heartbeat reconciliation failed."
            )
          );
        void reconcileRelayHealthHeartbeat()
          .then(result =>
            console.log(`[RelayHealth] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error("[RelayHealth] Heartbeat reconciliation failed.")
          );
        void reconcileStripeLifecycleHeartbeat()
          .then(result =>
            console.log(`[StripeLifecycle] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error("[StripeLifecycle] Heartbeat reconciliation failed.")
          );
        void reconcileMonthlyDiagnosticsHeartbeat()
          .then(result =>
            console.log(`[MonthlyDiagnostics] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error(
              "[MonthlyDiagnostics] Heartbeat reconciliation failed."
            )
          );
        void reconcileIntegrationHealthHeartbeat()
          .then(result =>
            console.log(`[IntegrationHealth] Heartbeat ${result.status}.`)
          )
          .catch(() =>
            console.error(
              "[IntegrationHealth] Heartbeat reconciliation failed."
            )
          );
      }, 30_000);
    }
    startSmtpWeeklyDigestScheduler();
    startReEngagementScheduler();
    startInactiveUserScheduler();
    startWooAutoImportScheduler();
  });
}

startServer().catch(console.error);
