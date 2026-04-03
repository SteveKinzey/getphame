/**
 * Gmail API Daily Health Check
 *
 * Runs once per day at server startup + every 24 hours.
 * Tests whether the owner's Gmail API access is working by calling
 * the Gmail profile endpoint. If the API is disabled or tokens are
 * invalid, sends an owner notification via notifyOwner().
 *
 * Deduplication: only notifies once per failure window — will not
 * spam the owner every day while the issue persists. Resets when
 * a healthy check passes.
 */

import { getValidAccessToken } from "./gmail";
import { getUserByOpenId } from "./db";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

const GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Track last notification to avoid duplicate alerts
let lastNotifiedAt: number | null = null;
let lastStatus: "ok" | "failed" | "unknown" = "unknown";

/**
 * Run a single Gmail API health check for the owner account.
 * Returns true if healthy, false if the API is unreachable/disabled.
 */
export async function checkGmailApiHealth(): Promise<{
  healthy: boolean;
  reason?: string;
}> {
  try {
    // Look up the owner's user record
    const ownerOpenId = ENV.ownerOpenId;
    if (!ownerOpenId) {
      return { healthy: false, reason: "OWNER_OPEN_ID env var not set" };
    }

    const owner = await getUserByOpenId(ownerOpenId);
    if (!owner) {
      return { healthy: false, reason: "Owner user not found in database" };
    }

    // Get a valid (refreshed if needed) access token
    const tokenData = await getValidAccessToken(owner.id);
    if (!tokenData) {
      return {
        healthy: false,
        reason:
          "Gmail not connected — owner has not linked a Gmail account in Settings",
      };
    }

    // Ping the Gmail profile endpoint — this is the lightest possible API call
    const res = await fetch(GMAIL_PROFILE_URL, {
      headers: { Authorization: `Bearer ${tokenData.accessToken}` },
    });

    if (res.ok) {
      return { healthy: true };
    }

    const body = await res.json().catch(() => ({}));
    const message =
      (body as any)?.error?.message ?? `HTTP ${res.status} ${res.statusText}`;
    return { healthy: false, reason: message };
  } catch (err: any) {
    return { healthy: false, reason: err?.message ?? "Unknown error" };
  }
}

/**
 * Run the health check and notify the owner if the API is failing.
 * Suppresses duplicate notifications — only alerts once per failure window.
 */
async function runHealthCheckAndNotify(): Promise<void> {
  console.log("[GmailHealthCheck] Running daily Gmail API health check...");

  const { healthy, reason } = await checkGmailApiHealth();

  if (healthy) {
    console.log("[GmailHealthCheck] ✅ Gmail API is healthy.");
    // Reset deduplication state so a future failure triggers a fresh alert
    if (lastStatus === "failed") {
      console.log("[GmailHealthCheck] Gmail API recovered — resetting alert state.");
    }
    lastStatus = "ok";
    lastNotifiedAt = null;
    return;
  }

  console.warn(`[GmailHealthCheck] ⚠️ Gmail API check failed: ${reason}`);

  // Deduplication: don't re-notify if we already sent an alert in the last 23 hours
  const now = Date.now();
  const alreadyNotifiedRecently =
    lastNotifiedAt !== null && now - lastNotifiedAt < 23 * 60 * 60 * 1000;

  if (alreadyNotifiedRecently) {
    console.log("[GmailHealthCheck] Skipping notification — already alerted recently.");
    return;
  }

  // Send owner notification
  try {
    await notifyOwner({
      title: "⚠️ Gmail API Issue Detected",
      content: [
        "ReviewLink's daily Gmail API health check has detected a problem.",
        "",
        `**Reason:** ${reason}`,
        "",
        "**What this means:** Review request emails may not be sending.",
        "",
        "**How to fix:**",
        "1. Go to Settings → Gmail in ReviewLink and check your connection",
        "2. If disconnected, reconnect your Gmail account",
        "3. If connected, enable the Gmail API at:",
        "   https://console.developers.google.com/apis/api/gmail.googleapis.com/overview",
        "",
        "This check runs daily. You will only receive one alert per failure window.",
      ].join("\n"),
    });

    lastNotifiedAt = now;
    lastStatus = "failed";
    console.log("[GmailHealthCheck] Owner notification sent.");
  } catch (notifyErr: any) {
    console.error(
      "[GmailHealthCheck] Failed to send owner notification:",
      notifyErr?.message
    );
  }
}

/**
 * Start the daily Gmail API health check scheduler.
 * Runs an initial check after a 30-second startup delay,
 * then repeats every 24 hours.
 */
export function startGmailHealthCheckScheduler(): void {
  console.log("[GmailHealthCheck] Daily health check scheduler started.");

  // Initial check after 30s (give server time to fully start + DB to connect)
  setTimeout(() => {
    runHealthCheckAndNotify().catch(console.error);
  }, 30_000);

  // Repeat every 24 hours
  setInterval(() => {
    runHealthCheckAndNotify().catch(console.error);
  }, CHECK_INTERVAL_MS);
}
