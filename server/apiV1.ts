/**
 * Phame Public REST API — v1
 *
 * All routes are authenticated via:
 *   Authorization: Bearer rl_<key>
 *
 * POST /api/v1/send
 *   Trigger a review-request email for a single customer.
 *   Body: { customerName, customerEmail, templateId? }
 *   Returns: { success: true, requestId: number }
 *
 * GET /api/v1/ping
 *   Health-check / key verification endpoint.
 *   Returns: { ok: true, business: string }
 */

import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { apiKeys, businessProfiles, smtpCredentials } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  getBusinessProfile,
  getDefaultReviewPlatform,
  listReviewPlatforms,
  getDefaultTemplate,
  listTemplates,
  createCustomerRequest,
  upsertBusinessProfile,
  enforceFreeLimit,
  checkSendRateLimit,
} from "./db";
import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail } from "./emailBuilder";
import {
  encodeTrackingToken,
  wrapClickUrl,
  buildOpenPixel,
} from "./tracking";
import { PLATFORM_LABELS } from "../shared/platforms";

export const apiV1Router = Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function resolveApiKey(
  req: Request,
  res: Response
): Promise<{ userId: number } | null> {
  const authHeader = req.headers["authorization"] ?? "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!raw) {
    res.status(401).json({ error: "Missing Authorization header. Use: Authorization: Bearer <api_key>" });
    return null;
  }

  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return null;
  }

  const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
  const [row] = await db
    .select({ id: apiKeys.id, userId: apiKeys.userId })
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) {
    res.status(401).json({ error: "Invalid or revoked API key." });
    return null;
  }

  // Update lastUsedAt async (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {});

  return { userId: row.userId };
}

// ─── GET /api/v1/ping ─────────────────────────────────────────────────────────

apiV1Router.get("/ping", async (req: Request, res: Response) => {
  const auth = await resolveApiKey(req, res);
  if (!auth) return;

  const profile = await getBusinessProfile(auth.userId);
  if (!profile) {
    return res.status(400).json({ error: "Business profile not configured." });
  }

  res.json({ ok: true, business: profile.businessName });
});

// ─── POST /api/v1/send ────────────────────────────────────────────────────────

apiV1Router.post("/send", async (req: Request, res: Response) => {
  const auth = await resolveApiKey(req, res);
  if (!auth) return;

  const { customerName, customerEmail, templateId } = req.body ?? {};

  // Validate required fields
  if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
    return res.status(400).json({ error: "customerName is required." });
  }
  if (!customerEmail || typeof customerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return res.status(400).json({ error: "customerEmail must be a valid email address." });
  }

  const userId = auth.userId;

  try {
    const profile = await getBusinessProfile(userId);
    if (!profile) {
      return res.status(400).json({ error: "Business profile not configured. Please complete setup in Phame." });
    }

    // Check SMTP is configured
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    const [smtpRow] = await db
      .select({ id: smtpCredentials.id })
      .from(smtpCredentials)
      .where(eq(smtpCredentials.userId, userId))
      .limit(1);
    if (!smtpRow) {
      return res.status(400).json({ error: "SMTP not configured. Connect your email account in Phame Settings." });
    }

    // Free-tier limit
    await enforceFreeLimit(userId, profile.tier);

    // Monthly reset
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (profile.monthlyResetDate !== yearMonth) {
      await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
      profile.monthlyCount = 0;
    }

    // Rate limit
    checkSendRateLimit(userId, 1);

    // Resolve review URL
    const defaultPlatform = await getDefaultReviewPlatform(userId);
    const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";

    // Resolve template
    const allTemplates = await listTemplates(userId);
    const resolvedTemplate = templateId
      ? allTemplates.find((t) => t.id === Number(templateId)) ?? null
      : await getDefaultTemplate(userId);

    // Build platformLinks block
    const allPlatforms = await listReviewPlatforms(userId);
    const platformLinksList =
      allPlatforms.length > 0
        ? allPlatforms
            .map((p) => {
              const label =
                p.label ||
                (PLATFORM_LABELS as Record<string, string>)[p.platform] ||
                p.platform;
              return `- ${label}: ${p.url}`;
            })
            .join("\n")
        : `- Leave a review: ${reviewUrl}`;

    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{customer_name\}\}/g, customerName.trim())
        .replace(/\{\{customerName\}\}/g, customerName.trim())
        .replace(/\{\{business_name\}\}/g, profile.businessName)
        .replace(/\{\{businessName\}\}/g, profile.businessName)
        .replace(/\{\{review_link\}\}/g, reviewUrl)
        .replace(/\{\{reviewLink\}\}/g, reviewUrl)
        .replace(/\{\{platformLinks\}\}/g, platformLinksList);

    let subject: string;
    let htmlBody: string;

    if (resolvedTemplate) {
      subject = replacePlaceholders(resolvedTemplate.subject);
      htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body).replace(/\n/g, "<br>")}</div>`;
    } else {
      subject = `${profile.businessName} would love your feedback!`;
      htmlBody = buildReviewRequestEmail({
        customerName: customerName.trim(),
        businessName: profile.businessName,
        reviewUrl,
        showPoweredBy: profile.tier === "free",
      });
    }

    // Create request row for tracking
    const newRequestId = await createCustomerRequest({
      userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      method: "email",
      status: "sent",
      platformId: null,
    });

    // Inject tracking
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const trackingToken = encodeTrackingToken(newRequestId, userId, resolvedTemplate?.id ?? null);
    const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
    const openPixel = buildOpenPixel(trackingToken, baseUrl);
    const trackedHtmlBody = htmlBody
      .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewUrl)
      .replace(/<\/div>\s*$/, `${openPixel}</div>`);

    await sendMailViaSmtp({
      userId,
      to: customerEmail.trim().toLowerCase(),
      subject,
      html: trackedHtmlBody,
    });

    // Increment template usage counter
    if (resolvedTemplate) {
      const { emailTemplates } = await import("../drizzle/schema");
      const { eq: eqT, sql: sqlT } = await import("drizzle-orm");
      await db
        .update(emailTemplates)
        .set({ usageCount: sqlT`${emailTemplates.usageCount} + 1` })
        .where(eqT(emailTemplates.id, resolvedTemplate.id));
    }

    // Increment monthly count
    await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + 1 });

    return res.json({ success: true, requestId: newRequestId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    // Surface user-facing errors (free limit, rate limit, SMTP config) as 400
    const isUserError =
      msg.includes("limit") ||
      msg.includes("SMTP") ||
      msg.includes("profile") ||
      msg.includes("subscription");
    return res.status(isUserError ? 400 : 500).json({ error: msg });
  }
});
