import { describe, expect, it, vi } from "vitest";
import { getIntegrationHealthSnapshot } from "./integrationHealth";

function makeDatabase(rows: Array<{ status: string }>) {
  return {
    execute: vi.fn().mockResolvedValue([{ probe: 1 }]),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(rows),
    }),
  };
}

function healthDependencies(database: ReturnType<typeof makeDatabase> | null) {
  return {
    now: () => 1_000,
    getDb: vi.fn().mockResolvedValue(database),
    listHeartbeats: vi.fn().mockResolvedValue({
      total: 2,
      actorUserId: "owner",
      jobs: [{ isEnable: true }, { isEnable: false }],
    }),
    fetch: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    getRelaySummary: vi.fn().mockResolvedValue({
      lastKnownStatus: "healthy",
      lastCheckedAt: 1_000,
    }),
    stripeSecretKey: () => "configured-key",
    heartbeatConfigured: () => true,
  };
}

describe("integration health snapshot", () => {
  it("returns sanitized live database latency and connected-service summaries", async () => {
    const database = makeDatabase([
      { status: "healthy" },
      { status: "healthy" },
      { status: "delayed" },
      { status: "paused" },
    ]);

    const snapshot = await getIntegrationHealthSnapshot(
      healthDependencies(database)
    );

    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(snapshot.database).toMatchObject({
      status: "healthy",
      latencyMs: 0,
      detail: "Read-only connection probe passed",
    });
    expect(snapshot.sources).toMatchObject({
      status: "degraded",
      connected: 4,
      healthy: 2,
      delayed: 1,
      failing: 0,
      paused: 1,
    });
    expect(snapshot.heartbeat).toMatchObject({
      status: "healthy",
      detail: "1 enabled background job",
    });
    expect(snapshot.stripe).toMatchObject({ status: "healthy" });
    expect(snapshot.emailRelay).toMatchObject({ status: "healthy" });
    expect(snapshot.overallStatus).toBe("degraded");
  });

  it("does not infer healthy source data when the database connection is unavailable", async () => {
    const dependencies = healthDependencies(null);

    const snapshot = await getIntegrationHealthSnapshot(dependencies);

    expect(snapshot.database.status).toBe("unavailable");
    expect(snapshot.sources).toMatchObject({
      status: "unavailable",
      connected: 0,
      detail: expect.stringContaining("database"),
    });
    expect(snapshot.overallStatus).toBe("unavailable");
  });

  it("reports unconfigured services without turning them into a false outage", async () => {
    const dependencies = healthDependencies(makeDatabase([]));
    dependencies.getRelaySummary.mockResolvedValue({ lastKnownStatus: null });

    const snapshot = await getIntegrationHealthSnapshot({
      ...dependencies,
      stripeSecretKey: () => undefined,
      heartbeatConfigured: () => false,
    });

    expect(snapshot.stripe.status).toBe("not_configured");
    expect(snapshot.heartbeat.status).toBe("not_configured");
    expect(snapshot.emailRelay.status).toBe("not_configured");
    expect(snapshot.sources.status).toBe("not_configured");
    expect(snapshot.overallStatus).toBe("healthy");
  });

  it("flags reauthentication required on 401 or 403 without returning secrets or raw traces", async () => {
    const dependencies = healthDependencies(makeDatabase([]));
    dependencies.fetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid API Key provided" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    );

    const snapshot = await getIntegrationHealthSnapshot(dependencies);

    expect(snapshot.stripe).toMatchObject({
      status: "degraded",
      reauthRequired: true,
      reauthTarget: "stripe",
      detail: "Stripe API returned HTTP 401",
    });
    expect(snapshot.stripe.detail).not.toContain("configured-key");
    expect(snapshot.stripe.detail).not.toContain("Invalid API Key");
  });
});
