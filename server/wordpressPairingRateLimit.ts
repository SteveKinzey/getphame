import { and, eq, lt, sql } from "drizzle-orm";
import { wordpressPairingRateLimitWindows } from "../drizzle/schema";
import { fingerprintAuthValue } from "./authOperations";
import { getDb } from "./db";

export const WORDPRESS_PAIRING_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const WORDPRESS_PAIRING_RATE_LIMIT_MAX_STARTS = 12;

export function getWordPressPairingRateLimitWindow(
  now = Date.now(),
  windowMs = WORDPRESS_PAIRING_RATE_LIMIT_WINDOW_MS,
) {
  const windowStartedAt = Math.floor(now / windowMs) * windowMs;
  return {
    windowStartedAt,
    expiresAt: windowStartedAt + windowMs,
  };
}

export function hashWordPressPairingClientIp(clientIp: string) {
  return fingerprintAuthValue(`wordpress-pairing-start-ip:${clientIp.trim() || "unknown"}`);
}

export async function checkWordPressPairingStartRateLimit(
  clientIp: string,
  now = Date.now(),
  options: { windowMs?: number; maxStarts?: number } = {},
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const windowMs = options.windowMs ?? WORDPRESS_PAIRING_RATE_LIMIT_WINDOW_MS;
  const maxStarts = options.maxStarts ?? WORDPRESS_PAIRING_RATE_LIMIT_MAX_STARTS;
  const dimensionHash = hashWordPressPairingClientIp(clientIp);
  const { windowStartedAt, expiresAt } = getWordPressPairingRateLimitWindow(now, windowMs);

  await db.delete(wordpressPairingRateLimitWindows).where(lt(wordpressPairingRateLimitWindows.expiresAt, now + 1));
  await db
    .insert(wordpressPairingRateLimitWindows)
    .values({
      dimensionHash,
      windowStartedAt,
      requestCount: 1,
      expiresAt,
      createdAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        requestCount: sql`${wordpressPairingRateLimitWindows.requestCount} + 1`,
        expiresAt,
      },
    });
  const [window] = await db
    .select({
      requestCount: wordpressPairingRateLimitWindows.requestCount,
      expiresAt: wordpressPairingRateLimitWindows.expiresAt,
    })
    .from(wordpressPairingRateLimitWindows)
    .where(and(
      eq(wordpressPairingRateLimitWindows.dimensionHash, dimensionHash),
      eq(wordpressPairingRateLimitWindows.windowStartedAt, windowStartedAt),
    ))
    .limit(1);

  if (!window) throw new Error("Pairing rate-limit window unavailable");
  const allowed = window.requestCount <= maxStarts;
  return {
    allowed,
    remaining: Math.max(0, maxStarts - window.requestCount),
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.expiresAt - now) / 1000)),
  };
}
