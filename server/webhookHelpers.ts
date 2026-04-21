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

/**
 * Fire all active webhook configs for a user that match the given event.
 * Delivery is async (fire-and-forget) but every attempt is logged.
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
        "X-ReviewLink-Event": event,
      };
      if (cfg.secret) {
        const sig = createHash("sha256")
          .update(cfg.secret + payload)
          .digest("hex");
        headers["X-ReviewLink-Signature"] = `sha256=${sig}`;
      }

      const startMs = Date.now();
      fetch(cfg.url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(8000),
      })
        .then(async (r) => {
          const durationMs = Date.now() - startMs;
          let responseBody = "";
          try {
            responseBody = (await r.text()).slice(0, 500);
          } catch {
            /* ignore */
          }
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
): Promise<{ success: boolean; status: number; error?: string }> {
  const event = "test";
  const payload = JSON.stringify({
    event,
    timestamp: Date.now(),
    data: { message: "ReviewLink webhook test ping", userId },
  });
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-ReviewLink-Event": event,
  };
  if (secret) {
    const sig = createHash("sha256")
      .update(secret + payload)
      .digest("hex");
    headers["X-ReviewLink-Signature"] = `sha256=${sig}`;
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
      success: r.ok,
      responseBody,
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: r.ok, status: r.status };
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    updateWebhookStatus(webhookId, 0).catch(() => {});
    logWebhookDelivery({
      webhookId,
      userId,
      event,
      url,
      statusCode: null,
      success: false,
      errorMessage: String(err?.message ?? err).slice(0, 500),
      durationMs,
      createdAt: Date.now(),
    }).catch(() => {});
    return { success: false, status: 0, error: err.message };
  }
}
