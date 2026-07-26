/**
 * Shared webhook firing helper used by both the public contacts API
 * and the tRPC webhook.test procedure so all deliveries appear in the log.
 */
import { createHash } from "crypto";
import {
  getWebhookConfigs,
  logWebhookDelivery,
  updateWebhookStatus,
} from "./db";

const RETRY_DELAY_MS = 5000; // 5 seconds

/** Sleep helper for retry delay */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build HMAC signature header value */
function buildSig(secret: string, payload: string): string {
  return "sha256=" + createHash("sha256").update(secret + payload).digest("hex");
}

/**
 * Fire a single webhook config, with one automatic retry on failure.
 * Returns the final result (success/failure).
 */
async function fireSingleWebhook(
  cfg: { id: number; userId: number; url: string; secret: string | null; events: string },
  event: string,
  payload: string,
  headers: Record<string, string>
): Promise<{ success: number; statusCode: number | null; durationMs: number; responseBody?: string; errorMessage?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }
    const startMs = Date.now();
    try {
      const r = await fetch(cfg.url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(8000),
      });
      const durationMs = Date.now() - startMs;
      let responseBody = "";
      try { responseBody = (await r.text()).slice(0, 500); } catch { /* ignore */ }

      if (r.ok || attempt === 1) {
        // Success, or final attempt — log and return
        return { success: r.ok ? 1 : 0 ? 1 : 0, statusCode: r.status, durationMs, responseBody };
      }
      // Non-ok on first attempt — retry
      console.warn(`[fireWebhooks] webhookId=${cfg.id} attempt=${attempt + 1} status=${r.status} — retrying in ${RETRY_DELAY_MS}ms`);
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      if (attempt === 1) {
        return { success: 0, statusCode: null, durationMs, errorMessage: String(err?.message ?? err).slice(0, 500) };
      }
      console.warn(`[fireWebhooks] webhookId=${cfg.id} attempt=${attempt + 1} error=${err?.message} — retrying in ${RETRY_DELAY_MS}ms`);
    }
  }
  // Should never reach here, but TypeScript needs a return
  return { success: 0, statusCode: null, durationMs: 0, errorMessage: "Unknown error" };
}

/**
 * Fire all active webhook configs for a user that match the given event.
 * Each delivery gets one automatic retry after 5s on failure.
 * Every attempt is logged.
 */
export async function fireWebhooks(
  userId: number,
  event: string,
  data: object
): Promise<void> {
  try {
    const configs = await getWebhookConfigs(userId);
    const active = configs.filter(
      (c) =>
        c.active &&
        c.events
          .split(",")
          .map((e) => e.trim())
          .includes(event)
    );

    for (const cfg of active) {
      const payload = JSON.stringify({ event, timestamp: Date.now(), data });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Phame-Event": event,
      };
      if (cfg.secret) {
        headers["X-Phame-Signature"] = buildSig(cfg.secret, payload);
      }

      // Fire with retry — fire-and-forget but log the result
      void fireSingleWebhook(cfg, event, payload, headers).then((result) => {
        updateWebhookStatus(cfg.id, result.statusCode ?? 0).catch(() => {});
        logWebhookDelivery({
          webhookId: cfg.id,
          userId: cfg.userId,
          event,
          url: cfg.url,
          statusCode: result.statusCode,
          success: result.success,
          responseBody: result.responseBody,
          errorMessage: result.errorMessage,
          durationMs: result.durationMs,
          createdAt: Date.now(),
        }).catch(() => {});
      }).catch((err) => {
        console.error("[fireWebhooks] Unexpected error for webhookId=" + cfg.id, err);
      });
    }
  } catch (err) {
    console.error("[fireWebhooks] Unexpected error:", err);
  }
}

/**
 * Fire a single webhook URL as a test ping and log the result.
 * Unlike fireWebhooks(), this targets a specific URL (not all configs)
 * and returns the result synchronously.
 */
export async function fireTestWebhook(
  webhookId: number,
  userId: number,
  url: string,
  secret: string | null
): Promise<{ success: number; status: number; error?: string }> {
  const event = "test";
  const payload = JSON.stringify({
    event,
    timestamp: Date.now(),
    data: { message: "Phame webhook test ping", userId },
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Phame-Event": event,
  };
  if (secret) {
    headers["X-Phame-Signature"] = buildSig(secret, payload);
  }

  const startMs = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    const durationMs = Date.now() - startMs;
    let responseBody = "";
    try {
      responseBody = (await r.text()).slice(0, 500);
    } catch {
      /* ignore */
    }
    updateWebhookStatus(webhookId, r.status).catch(() => {});
    logWebhookDelivery({
      webhookId,
      userId,
      event,
      url,
      statusCode: r.status,
      success: r.ok ? 1 : 0 ? 1 : 0,
      responseBody,
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: r.ok ? 1 : 0 ? 1 : 0, status: r.status };
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    updateWebhookStatus(webhookId, 0).catch(() => {});
    logWebhookDelivery({
      webhookId,
      userId,
      event,
      url,
      statusCode: null,
      success: 0,
      errorMessage: String(err?.message ?? err).slice(0, 500),
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: 0, status: 0, error: err.message };
  }
}

/**
 * Retry a specific failed delivery log entry by re-firing the webhook.
 * Used by the tRPC webhook.retryDelivery procedure.
 */
export async function retryWebhookDelivery(
  webhookId: number,
  userId: number,
  url: string,
  secret: string | null,
  event: string,
  originalPayload: string | null
): Promise<{ success: number; status: number; error?: string }> {
  const payload = originalPayload ?? JSON.stringify({ event, timestamp: Date.now(), data: { retried: true } });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Phame-Event": event,
    "X-Phame-Retry": "1",
  };
  if (secret) {
    headers["X-Phame-Signature"] = buildSig(secret, payload);
  }

  const startMs = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    const durationMs = Date.now() - startMs;
    let responseBody = "";
    try { responseBody = (await r.text()).slice(0, 500); } catch { /* ignore */ }
    updateWebhookStatus(webhookId, r.status).catch(() => {});
    logWebhookDelivery({
      webhookId,
      userId,
      event,
      url,
      statusCode: r.status,
      success: r.ok ? 1 : 0 ? 1 : 0,
      responseBody,
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: r.ok ? 1 : 0 ? 1 : 0, status: r.status };
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    updateWebhookStatus(webhookId, 0).catch(() => {});
    logWebhookDelivery({
      webhookId,
      userId,
      event,
      url,
      statusCode: null,
      success: 0,
      errorMessage: String(err?.message ?? err).slice(0, 500),
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: 0, status: 0, error: err.message };
  }
}
