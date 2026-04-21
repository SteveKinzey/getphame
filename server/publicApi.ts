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
import { getUserByApiKey, logApiImport, getWebhookConfigs, updateWebhookStatus, logWebhookDelivery } from "./db";
import { upsertApiContact } from "./contacts";
import { listApiKeys } from "./db";
import { createHash } from "crypto";

/** Fire outbound webhooks for a user on a given event. Fire-and-forget. */
async function fireWebhooks(userId: number, event: string, data: object): Promise<void> {
  try {
    const configs = await getWebhookConfigs(userId);
    const active = configs.filter((c) => c.active && c.events.split(",").map(e => e.trim()).includes(event));
    for (const cfg of active) {
      const payload = JSON.stringify({ event, timestamp: Date.now(), data });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-ReviewLink-Event": event,
      };
      if (cfg.secret) {
        const sig = createHash("sha256").update(cfg.secret + payload).digest("hex");
        headers["X-ReviewLink-Signature"] = `sha256=${sig}`;
      }
      const startMs = Date.now();
      fetch(cfg.url, { method: "POST", headers, body: payload, signal: AbortSignal.timeout(8000) })
        .then(async (r) => {
          const durationMs = Date.now() - startMs;
          let responseBody = "";
          try { responseBody = (await r.text()).slice(0, 500); } catch { /* ignore */ }
          updateWebhookStatus(cfg.id, r.status).catch(() => {});
          logWebhookDelivery({
            webhookId: cfg.id,
            userId: cfg.userId,
            event,
            url: cfg.url,
            statusCode: r.status,
            success: r.ok,
            responseBody,
            durationMs,
            createdAt: Date.now(),
          }).catch(() => {});
        })
        .catch((err) => {
          const durationMs = Date.now() - startMs;
          updateWebhookStatus(cfg.id, 0).catch(() => {});
          logWebhookDelivery({
            webhookId: cfg.id,
            userId: cfg.userId,
            event,
            url: cfg.url,
            statusCode: null,
            success: false,
            errorMessage: String(err?.message ?? err).slice(0, 500),
            durationMs,
            createdAt: Date.now(),
          }).catch(() => {});
        });
    }
  } catch (err) {
    console.warn("[Webhook] Fire error:", err);
  }
}

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
}
