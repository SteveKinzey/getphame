/**
 * Per-user in-memory rate limiter for SMTP send operations.
 *
 * Limits: 200 individual sends per user per rolling hour window.
 * Uses a simple sliding-window counter stored in a Map.
 * Resets automatically — no cron job required.
 *
 * Usage:
 *   import { checkSendRateLimit } from "./rateLimiter";
 *   checkSendRateLimit(userId, count); // throws TRPCError if limit exceeded
 */

import { TRPCError } from "@trpc/server";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SENDS_PER_WINDOW = 200;
const MAX_ONBOARDING_EVENTS_PER_WINDOW = 60;

interface WindowEntry {
  count: number;
  windowStart: number;
}

// userId → sliding window entry
const sendWindows = new Map<number, WindowEntry>();
const onboardingEventWindows = new Map<number, WindowEntry>();

/**
 * Check and increment the send rate limit for a user.
 * @param userId  The authenticated user's ID
 * @param count   Number of sends being attempted (default 1)
 * @throws TRPCError TOO_MANY_REQUESTS if the limit would be exceeded
 */
export function checkSendRateLimit(userId: number, count = 1): void {
  const now = Date.now();
  const entry = sendWindows.get(userId);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // Start a fresh window
    sendWindows.set(userId, { count, windowStart: now });
    return;
  }

  const projected = entry.count + count;
  if (projected > MAX_SENDS_PER_WINDOW) {
    const resetInMs = WINDOW_MS - (now - entry.windowStart);
    const resetInMins = Math.ceil(resetInMs / 60000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Send limit reached: ${MAX_SENDS_PER_WINDOW} emails per hour. Resets in ${resetInMins} minute${resetInMins !== 1 ? "s" : ""}.`,
    });
  }

  entry.count = projected;
}

/**
 * Bound authenticated setup-funnel telemetry so a compromised account cannot
 * create an unbounded stream of analytics events. Legitimate setup completes
 * in a handful of events, so 60 events per hour leaves ample retry room.
 */
export function checkOnboardingChecklistEventRateLimit(userId: number): void {
  const now = Date.now();
  const entry = onboardingEventWindows.get(userId);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    onboardingEventWindows.set(userId, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= MAX_ONBOARDING_EVENTS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many onboarding analytics events. Please try again later.",
    });
  }

  entry.count += 1;
}

/**
 * Returns the remaining send quota for a user in the current window.
 * Useful for surfacing quota info in the UI.
 */
export function getRemainingQuota(userId: number): number {
  const now = Date.now();
  const entry = sendWindows.get(userId);
  if (!entry || now - entry.windowStart >= WINDOW_MS) return MAX_SENDS_PER_WINDOW;
  return Math.max(0, MAX_SENDS_PER_WINDOW - entry.count);
}

// Periodically clean up stale entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of Array.from(sendWindows.entries())) {
    if (now - entry.windowStart >= WINDOW_MS) {
      sendWindows.delete(userId);
    }
  }
  for (const [userId, entry] of Array.from(onboardingEventWindows.entries())) {
    if (now - entry.windowStart >= WINDOW_MS) {
      onboardingEventWindows.delete(userId);
    }
  }
}, WINDOW_MS);
