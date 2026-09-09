/**
 * Email open and click tracking for review request emails.
 *
 * Architecture:
 *  - Each outbound email gets a signed open token and a destination-bound click token.
 *  - Open pixel:  GET /api/track/open/:token  → record event, return 1×1 transparent GIF
 *  - Click redirect: GET /api/track/click/:token?url=<encoded_destination>
 *                    → record event, redirect to destination
 *
 * Tokens are not authorization credentials, but signatures prevent forged analytics
 * and ensure click redirects cannot be changed after email issuance.
 */

import crypto from "crypto";
import type { Request, Response } from "express";
import { getDb } from "./db";
import { businessProfiles, emailEvents, reviewPlatforms } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

// ── Token helpers ─────────────────────────────────────────────────────────────

type TrackingTokenPayload = {
  v: 2;
  requestId: number;
  userId: number;
  templateId: number | null;
  destinationHash?: string;
};

type DecodedTrackingToken = {
  requestId: number;
  userId: number;
  templateId: number | null;
  version: 1 | 2;
  destinationHash: string | null;
};

const SAFE_REDIRECT_FALLBACK = "https://getphame.app";

function getTrackingSecret(): string {
  const secret = process.env.EMAIL_TRACKING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("EMAIL_TRACKING_SECRET must contain at least 32 characters");
  }
  return secret;
}

function signTrackingPayload(payload: string, secret = getTrackingSecret()): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function timingSafeSignatureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeRedirectDestination(value: string): string | null {
  if (value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    if (!(["http:", "https:"] as string[]).includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function destinationDigest(destination: string): string {
  return crypto.createHash("sha256").update(destination).digest("base64url");
}

function encodeVersionTwoToken(
  requestId: number,
  userId: number,
  templateId: number | null,
  destination?: string,
): string {
  const payload: TrackingTokenPayload = {
    v: 2,
    requestId,
    userId,
    templateId,
    ...(destination ? { destinationHash: destinationDigest(destination) } : {}),
  };
  const payloadSegment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadSegment}.${signTrackingPayload(payloadSegment)}`;
}

/** Encode a tracking token for a sent email */
export function encodeTrackingToken(
  requestId: number,
  userId: number,
  templateId: number | null
): string {
  return encodeVersionTwoToken(requestId, userId, templateId);
}

function decodeTrackingTokenDetailed(token: string): DecodedTrackingToken | null {
  try {
    const [payloadSegment, signature, extra] = token.split(".");
    if (payloadSegment && signature && !extra) {
      const expected = signTrackingPayload(payloadSegment);
      if (!timingSafeSignatureEqual(signature, expected)) return null;
      const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf8")) as TrackingTokenPayload;
      if (
        payload.v !== 2 ||
        !Number.isInteger(payload.requestId) || payload.requestId <= 0 ||
        !Number.isInteger(payload.userId) || payload.userId <= 0 ||
        !(payload.templateId === null || Number.isInteger(payload.templateId)) ||
        !(payload.destinationHash === undefined || typeof payload.destinationHash === "string")
      ) return null;
      return {
        requestId: payload.requestId,
        userId: payload.userId,
        templateId: payload.templateId,
        version: 2,
        destinationHash: payload.destinationHash ?? null,
      };
    }

    // Legacy verification is read-only and exists only so previously sent open
    // pixels and explicitly allowlisted click destinations remain functional.
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length !== 4) return null;
    const [requestIdStr, userIdStr, templateIdStr, sig] = parts;
    const payload = `${requestIdStr}:${userIdStr}:${templateIdStr}`;
    const legacySecret = process.env.JWT_SECRET;
    if (!legacySecret) return null;
    const expected = crypto.createHmac("sha256", legacySecret).update(payload).digest("hex").slice(0, 16);
    if (!timingSafeSignatureEqual(sig, expected)) return null;
    const requestId = Number.parseInt(requestIdStr, 10);
    const userId = Number.parseInt(userIdStr, 10);
    const templateId = Number.parseInt(templateIdStr, 10) || null;
    if (!Number.isInteger(requestId) || requestId <= 0 || !Number.isInteger(userId) || userId <= 0) return null;
    return {
      requestId,
      userId,
      templateId,
      version: 1,
      destinationHash: null,
    };
  } catch {
    return null;
  }
}

/** Decode and verify a tracking token. Returns null if invalid. */
export function decodeTrackingToken(
  token: string
): { requestId: number; userId: number; templateId: number | null } | null {
  const decoded = decodeTrackingTokenDetailed(token);
  if (!decoded) return null;
  return {
    requestId: decoded.requestId,
    userId: decoded.userId,
    templateId: decoded.templateId,
  };
}

async function isAllowlistedLegacyDestination(userId: number, destination: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [platform] = await db.select({ id: reviewPlatforms.id }).from(reviewPlatforms).where(and(
    eq(reviewPlatforms.userId, userId),
    eq(reviewPlatforms.url, destination),
  )).limit(1);
  if (platform) return true;

  const [profile] = await db.select({ reviewLink: businessProfiles.reviewLink }).from(businessProfiles)
    .where(eq(businessProfiles.userId, userId)).limit(1);
  return profile?.reviewLink === destination;
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

// ── Open-notification throttle ────────────────────────────────────────────────
// In-memory map: userId → last notification timestamp (ms)
// Prevents notification spam when many customers open emails in a short window.
// Resets on server restart (acceptable — notifications are advisory, not critical).
const OPEN_NOTIFY_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes
const lastOpenNotifyAt = new Map<number, number>();

function canSendOpenNotify(userId: number): boolean {
  const last = lastOpenNotifyAt.get(userId) ?? 0;
  return Date.now() - last >= OPEN_NOTIFY_THROTTLE_MS;
}

function markOpenNotifySent(userId: number): void {
  lastOpenNotifyAt.set(userId, Date.now());
}

// ── Express route handlers ────────────────────────────────────────────────────

/** GET /api/track/open/:token — serve 1×1 GIF and record open event */
export async function handleOpenPixel(req: Request, res: Response): Promise<void> {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  const decoded = decodeTrackingToken(token);
  if (decoded) {
    // Fire-and-forget — do not await so the image is served immediately
    void recordEvent(decoded.requestId, decoded.userId, decoded.templateId, "open", null, req);
    // Notify the business owner if they have the open-tracking notification pref enabled,
    // subject to a 30-minute per-user throttle to prevent notification spam.
    void (async () => {
      try {
        if (!canSendOpenNotify(decoded.userId)) return;
        const { getNotificationPrefs } = await import("./db");
        const prefs = await getNotificationPrefs(decoded.userId);
        if (prefs?.notifyOnEmailOpen) {
          const { notifyOwner } = await import("./_core/notification");
          const sent = await notifyOwner({
            title: "📬 Review request opened",
            content: `A customer opened your review request email (request #${decoded.requestId}).`,
          });
          if (sent) markOpenNotifySent(decoded.userId);
        }
      } catch (err) {
        // Non-fatal — notification failures must never break tracking
        console.warn("[EmailTracking] notifyOnEmailOpen failed:", err);
      }
    })();
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
  const requestedDestination = typeof req.query.url === "string" ? req.query.url : null;
  const destination = requestedDestination ? normalizeRedirectDestination(requestedDestination) : null;
  const token = typeof req.params.token === "string" ? req.params.token : "";
  const decoded = decodeTrackingTokenDetailed(token);

  let isAuthorizedDestination = false;
  if (decoded && destination) {
    if (decoded.version === 2 && decoded.destinationHash) {
      isAuthorizedDestination = timingSafeSignatureEqual(
        decoded.destinationHash,
        destinationDigest(destination),
      );
    } else if (decoded.version === 1) {
      isAuthorizedDestination = await isAllowlistedLegacyDestination(decoded.userId, destination);
    }
  }

  if (!decoded || !destination || !isAuthorizedDestination) {
    res.redirect(302, SAFE_REDIRECT_FALLBACK);
    return;
  }

  void recordEvent(decoded.requestId, decoded.userId, decoded.templateId, "click", destination, req);
  res.redirect(302, destination);
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
  const destination = normalizeRedirectDestination(reviewUrl);
  const decoded = decodeTrackingTokenDetailed(token);
  if (!destination || !decoded) throw new Error("Cannot create tracking URL for an invalid destination or token");
  const clickToken = encodeVersionTwoToken(
    decoded.requestId,
    decoded.userId,
    decoded.templateId,
    destination,
  );
  return `${baseUrl}/api/track/click/${clickToken}?url=${encodeURIComponent(destination)}`;
}

/**
 * Build the open-tracking pixel HTML snippet.
 * Should be injected just before </body> in every outbound email.
 */
export function buildOpenPixel(token: string, baseUrl: string): string {
  return `<img src="${baseUrl}/api/track/open/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`;
}
