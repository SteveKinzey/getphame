/**
 * Email open and click tracking for review request emails.
 *
 * Architecture:
 *  - Each outbound email gets a signed token: base64url(requestId:userId:templateId:secret_hash)
 *  - Open pixel:  GET /api/track/open/:token  → record event, return 1×1 transparent GIF
 *  - Click redirect: GET /api/track/click/:token?url=<encoded_destination>
 *                    → record event, redirect to destination
 *
 * Tokens are not cryptographically sensitive (no auth) — they only log analytics events.
 * We use a simple HMAC-SHA256 signature to prevent trivial token forgery / spam.
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { emailEvents } from "../drizzle/schema";

// ── Token helpers ─────────────────────────────────────────────────────────────

const TRACKING_SECRET = process.env.JWT_SECRET ?? "reviewlink-tracking-secret";

/** Encode a tracking token for a sent email */
export function encodeTrackingToken(
  requestId: number,
  userId: number,
  templateId: number | null
): string {
  const payload = `${requestId}:${userId}:${templateId ?? 0}`;
  const sig = crypto
    .createHmac("sha256", TRACKING_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 16); // 8-byte prefix is enough for anti-spam
  const raw = `${payload}:${sig}`;
  return Buffer.from(raw).toString("base64url");
}

/** Decode and verify a tracking token. Returns null if invalid. */
export function decodeTrackingToken(
  token: string
): { requestId: number; userId: number; templateId: number | null } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length !== 4) return null;
    const [requestIdStr, userIdStr, templateIdStr, sig] = parts;
    const payload = `${requestIdStr}:${userIdStr}:${templateIdStr}`;
    const expected = crypto
      .createHmac("sha256", TRACKING_SECRET)
      .update(payload)
      .digest("hex")
      .slice(0, 16);
    if (sig !== expected) return null;
    return {
      requestId: parseInt(requestIdStr, 10),
      userId: parseInt(userIdStr, 10),
      templateId: parseInt(templateIdStr, 10) || null,
    };
  } catch {
    return null;
  }
}

// ── 1×1 transparent GIF ───────────────────────────────────────────────────────

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// ── Record event helper ───────────────────────────────────────────────────────

async function recordEvent(
  requestId: number,
  userId: number,
  templateId: number | null,
  type: "open" | "click",
  url: string | null,
  req: Request
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(emailEvents).values({
      requestId,
      userId,
      templateId: templateId ?? undefined,
      type,
      url: url ?? undefined,
      userAgent: (req.headers["user-agent"] ?? "").slice(0, 512) || undefined,
      ip: (
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
        req.socket.remoteAddress ??
        ""
      ).slice(0, 64) || undefined,
    });
  } catch (err) {
    // Non-fatal — tracking failures must never break the user experience
    console.error("[EmailTracking] Failed to record event:", err);
  }
}

// ── Express route handlers ────────────────────────────────────────────────────

/** GET /api/track/open/:token — serve 1×1 GIF and record open event */
export async function handleOpenPixel(req: Request, res: Response): Promise<void> {
  const decoded = decodeTrackingToken(req.params.token ?? "");
  if (decoded) {
    // Fire-and-forget — do not await so the image is served immediately
    void recordEvent(decoded.requestId, decoded.userId, decoded.templateId, "open", null, req);
  }
  res.set({
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.end(TRANSPARENT_GIF);
}

/** GET /api/track/click/:token?url=<encoded_destination> — record click and redirect */
export async function handleClickRedirect(req: Request, res: Response): Promise<void> {
  const destination = typeof req.query.url === "string" ? req.query.url : null;
  const decoded = decodeTrackingToken(req.params.token ?? "");

  if (decoded && destination) {
    void recordEvent(decoded.requestId, decoded.userId, decoded.templateId, "click", destination, req);
  }

  if (destination) {
    res.redirect(302, destination);
  } else {
    // Fallback — send to app if URL is missing
    res.redirect(302, "https://reviewlink.app");
  }
}

// ── Email injection helpers ───────────────────────────────────────────────────

/**
 * Wrap a review URL with the click-tracking redirect.
 * The destination is URL-encoded and appended as a query param.
 */
export function wrapClickUrl(
  reviewUrl: string,
  token: string,
  baseUrl: string
): string {
  const encoded = encodeURIComponent(reviewUrl);
  return `${baseUrl}/api/track/click/${token}?url=${encoded}`;
}

/**
 * Build the open-tracking pixel HTML snippet.
 * Should be injected just before </body> in every outbound email.
 */
export function buildOpenPixel(token: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/track/open/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
}
