import { createHash, createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWebhookConfigs: vi.fn().mockResolvedValue([]),
  logWebhookDelivery: vi.fn().mockResolvedValue(undefined),
  updateWebhookStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", () => ({
  getWebhookConfigs: mocks.getWebhookConfigs,
  logWebhookDelivery: mocks.logWebhookDelivery,
  updateWebhookStatus: mocks.updateWebhookStatus,
}));

import {
  buildWebhookSignature,
  fireTestWebhook,
  retryWebhookDelivery,
} from "./webhookHelpers";

const secret = "webhook-test-secret";
const payload = JSON.stringify({ event: "review.completed", data: { requestId: 91 } });

describe("webhook HMAC signatures", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("ok"),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("matches a standard sha256-prefixed HMAC and not the retired concatenation hash", () => {
    const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    const retired = `sha256=${createHash("sha256").update(secret + payload).digest("hex")}`;
    expect(buildWebhookSignature(secret, payload)).toBe(expected);
    expect(buildWebhookSignature(secret, payload)).not.toBe(retired);
  });

  it("signs test-ping payload bytes with the shared HMAC helper", async () => {
    await fireTestWebhook(12, 4, "https://webhook.example.test/ping", secret);

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const body = options?.body as string;
    const headers = options?.headers as Record<string, string>;
    expect(headers["X-Phame-Signature"]).toBe(buildWebhookSignature(secret, body));
  });

  it("signs the exact stored payload during a retry", async () => {
    await retryWebhookDelivery(12, 4, "https://webhook.example.test/retry", secret, "review.completed", payload);

    const [, options] = vi.mocked(fetch).mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(options?.body).toBe(payload);
    expect(headers["X-Phame-Signature"]).toBe(buildWebhookSignature(secret, payload));
  });
});
