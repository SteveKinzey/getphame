import { TRPCError } from "@trpc/server";

const WINDOW_MS = 30 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

interface RateWindow {
  count: number;
  startedAt: number;
}

const submissionWindows = new Map<string, RateWindow>();

/**
 * Limits anonymous support form submissions per request origin without storing
 * customer messages or identities. The caller supplies a short-lived request key.
 */
export function checkSupportSubmissionRateLimit(requestKey: string): void {
  const key = requestKey.slice(0, 160) || "anonymous";
  const now = Date.now();
  const existing = submissionWindows.get(key);

  if (!existing || now - existing.startedAt >= WINDOW_MS) {
    submissionWindows.set(key, { count: 1, startedAt: now });
    return;
  }

  if (existing.count >= MAX_SUBMISSIONS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait before sending another support request.",
    });
  }

  existing.count += 1;
}

export function resetSupportSubmissionRateLimitForTests(): void {
  submissionWindows.clear();
}
