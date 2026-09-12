import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  dispatchIntegrationHealthAlerts,
  saveIntegrationHealthAlertSettings,
  sendIntegrationHealthAlertTest,
} from "./integrationHealthAlerts";
import type { IntegrationHealthSnapshot } from "./integrationHealth";
import { encryptPassword } from "./smtp";
import { getDb } from "./db";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mocks.select,
    insert: mocks.insert,
    delete: mocks.delete,
  }),
}));

vi.mock("./smtp", () => ({
  encryptPassword: (value: string) => `test-ciphertext:${value}`,
  decryptPassword: (value: string) => value.replace(/^test-ciphertext:/, ""),
}));

function baseSnapshot(): IntegrationHealthSnapshot {
  return {
    checkedAt: 50_000,
    durationMs: 300,
    overallStatus: "healthy",
    database: { status: "healthy", latencyMs: 5, detail: "ok" },
    heartbeat: { status: "healthy", latencyMs: 20, detail: "ok" },
    stripe: {
      status: "healthy",
      latencyMs: 3500,
      detail: "Stripe API credential probe passed",
    },
    emailRelay: { status: "healthy", latencyMs: 10, detail: "ok" },
    sources: {
      status: "healthy",
      latencyMs: 8,
      detail: "ok",
      connected: 1,
      healthy: 1,
      delayed: 0,
      failing: 0,
      paused: 0,
    },
  };
}

describe("integration health alert configuration and delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
  });

  it("validates incoming webhook destinations strictly before saving", async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValueOnce({ from: fromMock });

    await expect(
      saveIntegrationHealthAlertSettings({
        userId: 1,
        enabled: true,
        provider: "slack",
        webhookUrl: "https://evil.example.com/webhook",
        latencyThresholdMs: 2500,
        alertOnFailure: true,
        alertOnHighLatency: true,
      })
    ).rejects.toThrow(/official HTTPS incoming webhook URL/i);
  });

  it("delivers a formatted Slack card when latency crosses the threshold", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 200 });
    // Mock config lookup returning an active Slack destination
    const configRecord = {
      id: 7,
      enabled: true,
      provider: "slack",
      encryptedWebhookUrl: encryptPassword(
        "https://hooks.slack.com/services/T00/B00/X00"
      ),
      latencyThresholdMs: 2500,
      alertOnFailure: true,
      alertOnHighLatency: true,
      updatedAt: 10_000,
    };
    const limitMock = vi.fn().mockResolvedValue([configRecord]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValueOnce({ from: fromMock });
    // Mock recentlyDelivered returning no recent delivery
    const recentLimit = vi.fn().mockResolvedValue([]);
    const recentOrder = vi.fn().mockReturnValue({ limit: recentLimit });
    const recentWhere = vi.fn().mockReturnValue({ orderBy: recentOrder });
    const recentFrom = vi.fn().mockReturnValue({ where: recentWhere });
    mocks.select.mockReturnValueOnce({ from: recentFrom });
    // Mock insert for delivery log
    const valuesMock = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    mocks.insert.mockReturnValue({ values: valuesMock });
    const offsetMock = vi.fn().mockResolvedValue([]);
    const logOrder = vi.fn().mockReturnValue({ offset: offsetMock });
    const logFrom = vi.fn().mockReturnValue({ orderBy: logOrder });
    mocks.select.mockReturnValueOnce({ from: logFrom });

    const result = await dispatchIntegrationHealthAlerts(
      baseSnapshot(),
      50_000
    );

    expect(result.delivered).toBe(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [, options] = mocks.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.attachments[0].title).toMatch(/threshold reached/i);
    expect(payload.attachments[0].color).toBe("#d97706");
  });

  it("delivers an explicit test notification to Discord", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, status: 204 });
    const configRecord = {
      id: 9,
      enabled: true,
      provider: "discord",
      encryptedWebhookUrl: encryptPassword(
        "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz"
      ),
      latencyThresholdMs: 2500,
      alertOnFailure: true,
      alertOnHighLatency: true,
      updatedAt: 10_000,
    };
    const limitMock = vi.fn().mockResolvedValue([configRecord]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValueOnce({ from: fromMock });
    const valuesMock = vi.fn().mockResolvedValue([{ insertId: 2 }]);
    mocks.insert.mockReturnValue({ values: valuesMock });
    const offsetMock = vi.fn().mockResolvedValue([]);
    const logOrder = vi.fn().mockReturnValue({ offset: offsetMock });
    const logFrom = vi.fn().mockReturnValue({ orderBy: logOrder });
    mocks.select.mockReturnValueOnce({ from: logFrom });

    const testResult = await sendIntegrationHealthAlertTest();

    expect(testResult.delivered).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [, options] = mocks.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.embeds[0].title).toMatch(/test/i);
  });
});
