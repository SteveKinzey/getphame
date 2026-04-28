/**
 * Public REST API — unauthenticated by session cookie, authenticated by API key.
 * Exposes a single endpoint for now:
 *   POST /api/public/contacts  — import a contact from a website form
 *
 * Authentication: Bearer token in Authorization header.
 *   Authorization: Bearer rl_<hex>
 *
 * Rate limiting: 60 requests per minute per API key (in-memory, resets on server restart).
 */

import { Router, Request, Response } from "express";
import { getUserByApiKey, logApiImport, getBusinessProfile, createCustomerRequest, upsertBusinessProfile, getTotalRequestCount } from "./db";
import { getDefaultReviewPlatform, listReviewPlatforms, PLATFORM_LABELS } from "./reviewPlatforms";
import { getDefaultTemplate, listTemplates } from "./templates";
import { checkSendRateLimit } from "./rateLimiter";
import { FREE_LIMIT, FREE_LIMIT_ERR_MSG } from "@shared/const";
import { upsertApiContact } from "./contacts";
import { listApiKeys, getDb } from "./db";
import { fireWebhooks } from "./webhookHelpers";
import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail } from "./emailTemplates";
import { encodeTrackingToken, wrapClickUrl, buildOpenPixel } from "./emailTracking";
import { smtpCredentials, emailTemplates as emailTemplatesTable } from "../drizzle/schema";
import { eq, sql as sqlOp } from "drizzle-orm";

// Simple in-memory rate limiter: { keyHash -> { count, resetAt } }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export function registerPublicApiRoutes(app: Router) {
  /**
   * POST /api/public/contacts
   *
   * Body (JSON):
   * {
   *   name:    string  (required — full name or first + last)
   *   email:   string  (required — must be a valid email)
   *   phone?:  string  (optional)
   *   notes?:  string  (optional — e.g. product purchased, order ID)
   *   tags?:   string[] (optional — e.g. ["new-customer", "plumbing"])
   * }
   *
   * Response 200: { success: true, contactId: number, created: boolean }
   * Response 400: { error: string }
   * Response 401: { error: "Invalid or missing API key" }
   * Response 429: { error: "Rate limit exceeded. Max 60 requests per minute." }
   */
  app.post("/api/public/contacts", async (req: Request, res: Response) => {
    // 1. Extract Bearer token
    const authHeader = req.headers.authorization ?? "";
    const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!rawKey || !rawKey.startsWith("rl_")) {
      return res.status(401).json({ error: "Invalid or missing API key. Use Authorization: Bearer rl_<key>" });
    }

    // 2. Rate limit by raw key prefix (first 20 chars — enough to identify the key without exposing it)
    const rateLimitKey = rawKey.slice(0, 20);
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ error: "Rate limit exceeded. Max 60 requests per minute." });
    }

    // 3. Look up user by API key
    const userId = await getUserByApiKey(rawKey);
    if (!userId) {
      return res.status(401).json({ error: "Invalid or revoked API key." });
    }

    // 4. Validate body
    const { name, email, phone, notes, tags } = req.body ?? {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required." });
    }
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "email is not a valid email address." });
    }
    if (phone !== undefined && typeof phone !== "string") {
      return res.status(400).json({ error: "phone must be a string." });
    }
    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({ error: "notes must be a string." });
    }
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== "string"))) {
      return res.status(400).json({ error: "tags must be an array of strings." });
    }

    // 5. Upsert the contact (deduped by email per user)
    // Also look up the API key id and label for logging
    let apiKeyId: number | null = null;
    let keyLabel = "API Key";
    try {
      const keys = await listApiKeys(userId);
      // Match by checking lastUsedAt — the key was just updated by getUserByApiKey
      // We can't match exactly, so just use the most-recently-used key
      const sorted = keys.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
      if (sorted.length > 0) {
        apiKeyId = sorted[0].id;
        keyLabel = sorted[0].label;
      }
    } catch { /* non-fatal */ }

    try {
      const result = await upsertApiContact(userId, {
        name: name.trim().slice(0, 255),
        email: email.trim().toLowerCase().slice(0, 320),
        phone: phone?.trim().slice(0, 30) ?? undefined,
        notes: notes?.trim().slice(0, 2000) ?? undefined,
        tags: tags ?? undefined,
      });

      // Log the import event (fire-and-forget)
      logApiImport({
        userId,
        apiKeyId,
        keyLabel,
        contactId: result.id,
        email: email.trim().toLowerCase().slice(0, 320),
        created: result.created,
      }).catch(() => {});

      // Fire webhooks for new contacts (fire-and-forget)
      if (result.created) {
        fireWebhooks(userId, "contact.created", {
          contactId: result.id,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          source: "api",
        }).catch(() => {});
      }

      return res.json({
        success: true,
        contactId: result.id,
        created: result.created,
      });
    } catch (err: any) {
      console.error("[Public API] contacts upsert error:", err?.message);
      return res.status(500).json({ error: "Internal server error. Please try again." });
    }
  });

  /**
   * POST /api/public/send
   *
   * Immediately sends a review-request email to a single customer.
   * Used by WordPress form builders (Elementor, Gravity Forms, WS Form, Fluent Forms)
   * via their HTTP/webhook action after a form submission.
   *
   * Body (JSON):
   * {
   *   customerName:  string  (required)
   *   customerEmail: string  (required)
   *   templateId?:   number  (optional — defaults to user's default template)
   * }
   *
   * Response 200: { success: true, requestId: number }
   * Response 400: { error: string }
   * Response 401: { error: string }
   * Response 429: { error: string }
   */
  app.post("/api/public/send", async (req: Request, res: Response) => {
    // 1. Auth
    const authHeader = req.headers.authorization ?? "";
    const rawKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!rawKey || !rawKey.startsWith("rl_")) {
      return res.status(401).json({ error: "Invalid or missing API key. Use Authorization: Bearer rl_<key>" });
    }
    // 2. Rate limit
    const rateLimitKey = rawKey.slice(0, 20);
    if (!checkRateLimit(rateLimitKey)) {
      return res.status(429).json({ error: "Rate limit exceeded. Max 60 requests per minute." });
    }
    // 3. Resolve user
    const userId = await getUserByApiKey(rawKey);
    if (!userId) {
      return res.status(401).json({ error: "Invalid or revoked API key." });
    }
    // 4. Validate body
    const { customerName, customerEmail, templateId } = req.body ?? {};
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return res.status(400).json({ error: "customerName is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || typeof customerEmail !== "string" || !emailRegex.test(customerEmail.trim())) {
      return res.status(400).json({ error: "customerEmail must be a valid email address." });
    }
    // 5. Send
    try {
      const profile = await getBusinessProfile(userId);
      if (!profile) {
        return res.status(400).json({ error: "Business profile not configured. Please complete setup in Phame." });
      }
      // Check SMTP configured
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const [smtpRow] = await db.select({ id: smtpCredentials.id }).from(smtpCredentials).where(eq(smtpCredentials.userId, userId)).limit(1);
      if (!smtpRow) {
        return res.status(400).json({ error: "SMTP not configured. Connect your email account in Phame Settings." });
      }
      // Free-tier limit
      if (profile.tier === 'free') {
        const total = await getTotalRequestCount(userId);
        if (total >= FREE_LIMIT) {
          return res.status(429).json({ error: FREE_LIMIT_ERR_MSG });
        }
      }
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
      const platformLinksList = allPlatforms.length > 0
        ? allPlatforms.map((p) => {
            const label = p.label || (PLATFORM_LABELS as Record<string, string>)[p.platform] || p.platform;
            return `- ${label}: ${p.url}`;
          }).join("\n")
        : `- Leave a review: ${reviewUrl}`;
      const name = customerName.trim();
      const email = customerEmail.trim().toLowerCase();
      const replacePlaceholders = (text: string) =>
        text
          .replace(/\{\{customer_name\}\}/g, name)
          .replace(/\{\{customerName\}\}/g, name)
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
        htmlBody = buildReviewRequestEmail({ customerName: name, businessName: profile.businessName, reviewUrl, showPoweredBy: profile.tier === "free" });
      }
      // Create request row
      const newRequestId = await createCustomerRequest({ userId, customerName: name, customerEmail: email, method: "email", status: "sent", platformId: null });
      // Inject tracking
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const trackingToken = encodeTrackingToken(newRequestId, userId, resolvedTemplate?.id ?? null);
      const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
      const openPixel = buildOpenPixel(trackingToken, baseUrl);
      const trackedHtmlBody = htmlBody
        .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewUrl)
        .replace(/<\/div>\s*$/, `${openPixel}</div>`);
      await sendMailViaSmtp({ userId, to: email, subject, html: trackedHtmlBody });
      // Increment template usage
      if (resolvedTemplate) {
        await db.update(emailTemplatesTable).set({ usageCount: sqlOp`${emailTemplatesTable.usageCount} + 1` }).where(eq(emailTemplatesTable.id, resolvedTemplate.id));
      }
      // Increment monthly count
      await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + 1 });
      return res.json({ success: true, requestId: newRequestId });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Internal error";
      const isUserError = msg.includes("limit") || msg.includes("SMTP") || msg.includes("profile") || msg.includes("subscription");
      return res.status(isUserError ? 400 : 500).json({ error: msg });
    }
  });
}
