import { TRPCError } from "@trpc/server";

const WINDOW_MS = 30 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;
const MAX_ATTACHMENTS_PER_WINDOW = 6;

interface RateWindow {
  count: number;
  startedAt: number;
}

const submissionWindows = new Map<string, RateWindow>();
const attachmentWindows = new Map<string, RateWindow>();

function checkRateWindow(
  windows: Map<string, RateWindow>,
  requestKey: string,
  maximum: number,
  message: string
): void {
  const key = requestKey.slice(0, 160) || "anonymous";
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.startedAt >= WINDOW_MS) {
    windows.set(key, { count: 1, startedAt: now });
    return;
  }

  if (existing.count >= maximum) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
  }

  existing.count += 1;
}

/**
 * Limits anonymous support form submissions per request origin without storing
 * customer messages or identities. The caller supplies a short-lived request key.
 */
export function checkSupportSubmissionRateLimit(requestKey: string): void {
  checkRateWindow(
    submissionWindows,
    requestKey,
    MAX_SUBMISSIONS_PER_WINDOW,
    "Please wait before sending another support request."
  );
}

/** Limits public screenshot uploads independently from final form submissions. */
export function checkSupportAttachmentRateLimit(requestKey: string): void {
  checkRateWindow(
    attachmentWindows,
    requestKey,
    MAX_ATTACHMENTS_PER_WINDOW,
    "Please wait before uploading another screenshot."
  );
}

export function resetSupportSubmissionRateLimitForTests(): void {
  submissionWindows.clear();
  attachmentWindows.clear();
}
