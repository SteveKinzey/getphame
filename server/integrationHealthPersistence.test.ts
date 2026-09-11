import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: mocks.insert,
    select: mocks.select,
    delete: mocks.delete,
  }),
}));

import {
  listIntegrationHealthHistory,
  recordIntegrationHealthSample,
} from "./integrationHealthPersistence";
import type { IntegrationHealthSnapshot } from "./integrationHealth";

function sampleSnapshot(
  overrides: Partial<IntegrationHealthSnapshot> = {}
): IntegrationHealthSnapshot {
  return {
    checkedAt: 10_000,
    durationMs: 42,
    overallStatus: "healthy",
    database: {
      status: "healthy",
      latencyMs: 3,
      detail: "Read-only connection probe passed",
    },
    heartbeat: {
      status: "healthy",
      latencyMs: 12,
      detail: "1 enabled background job",
    },
    stripe: {
      status: "healthy",
      latencyMs: 30,
      detail: "Stripe API credential probe passed",
    },
    emailRelay: {
      status: "healthy",
      latencyMs: 8,
      detail: "Primary email relay is healthy",
    },
    sources: {
      status: "healthy",
      latencyMs: 5,
      detail: "1 configured source integration",
      connected: 1,
      healthy: 1,
      delayed: 0,
      failing: 0,
      paused: 0,
    },
    ...overrides,
  };
}

describe("integration health history persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores sanitized metrics and enforces a 24-hour retention ceiling", async () => {
    const valuesMock = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    mocks.insert.mockReturnValue({ values: valuesMock });
    const whereMock = vi.fn().mockResolvedValue([{ affectedRows: 0 }]);
    mocks.delete.mockReturnValue({ where: whereMock });

    const stored = await recordIntegrationHealthSample(
      sampleSnapshot(),
      10_000
    );

    expect(stored).toBe(true);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        checkedAt: 10_000,
        durationMs: 42,
        overallStatus: "healthy",
        databaseLatencyMs: 3,
      })
    );
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
  });

  it("maps chronological points across all integration components", async () => {
    const limitMock = vi.fn().mockResolvedValue([
      {
        id: 1,
        checkedAt: 10_000,
        databaseStatus: "healthy",
        databaseLatencyMs: 4,
        heartbeatStatus: "healthy",
        heartbeatLatencyMs: 10,
        stripeStatus: "healthy",
        stripeLatencyMs: 25,
        emailRelayStatus: "healthy",
        emailRelayLatencyMs: 8,
        sourcesStatus: "healthy",
        sourcesLatencyMs: 6,
      },
    ]);
    const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    const whereMock = vi.fn().mockReturnValue({ orderBy: orderMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    mocks.select.mockReturnValue({ from: fromMock });

    const history = await listIntegrationHealthHistory(10_000);

    expect(history.database).toEqual([
      { checkedAt: 10_000, status: "healthy", latencyMs: 4 },
    ]);
    expect(history.stripe).toEqual([
      { checkedAt: 10_000, status: "healthy", latencyMs: 25 },
    ]);
    expect(history.sources).toEqual([
      { checkedAt: 10_000, status: "healthy", latencyMs: 6 },
    ]);
  });
});
