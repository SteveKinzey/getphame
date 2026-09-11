import { sql } from "drizzle-orm";
import { sourceConnections } from "../drizzle/schema";
import { getDb } from "./db";
import { listHeartbeatJobs } from "./_core/heartbeat";
import { ENV } from "./_core/env";

export const INTEGRATION_HEALTH_TIMEOUT_MS = 5_000;

export type IntegrationHealthStatus =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "not_configured";

export type IntegrationHealthComponent = {
  status: IntegrationHealthStatus;
  latencyMs: number | null;
  detail: string;
  reauthRequired?: boolean;
  reauthTarget?: "stripe";
};

export type SourceIntegrationHealthComponent = IntegrationHealthComponent & {
  connected: number;
  healthy: number;
  delayed: number;
  failing: number;
  paused: number;
};

export type IntegrationHealthSnapshot = {
  checkedAt: number;
  durationMs: number;
  overallStatus: Exclude<IntegrationHealthStatus, "not_configured">;
  database: IntegrationHealthComponent;
  heartbeat: IntegrationHealthComponent;
  stripe: IntegrationHealthComponent;
  emailRelay: IntegrationHealthComponent;
  sources: SourceIntegrationHealthComponent;
};

type IntegrationHealthDependencies = {
  now: () => number;
  getDb: typeof getDb;
  listHeartbeats: typeof listHeartbeatJobs;
  fetch: typeof fetch;
  getRelaySummary: () => Promise<{
    lastKnownStatus?: string | null;
    lastCheckedAt?: number | null;
  }>;
  stripeSecretKey: () => string | undefined;
  heartbeatConfigured: () => boolean;
};

const defaultDependencies: IntegrationHealthDependencies = {
  now: Date.now,
  getDb,
  listHeartbeats: listHeartbeatJobs,
  fetch,
  getRelaySummary: async () => {
    const { getCurrentRelaySummary } = await import("./relayHealth");
    return getCurrentRelaySummary();
  },
  stripeSecretKey: () => process.env.STRIPE_SECRET_KEY,
  heartbeatConfigured: () => Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
};

function elapsed(startedAt: number, now: () => number) {
  return Math.max(now() - startedAt, 0);
}

function failureDetail(error: unknown, fallback: string) {
  const name = error instanceof Error ? error.name : "UnknownError";
  if (name === "TimeoutError" || name === "AbortError") return "Timed out";
  return fallback;
}

function overallStatus(
  components: Array<
    IntegrationHealthComponent | SourceIntegrationHealthComponent
  >
): Exclude<IntegrationHealthStatus, "not_configured"> {
  if (components.some(component => component.status === "unavailable")) {
    return "unavailable";
  }
  if (components.some(component => component.status === "degraded")) {
    return "degraded";
  }
  return "healthy";
}

export async function getIntegrationHealthSnapshot(
  dependencies: Partial<IntegrationHealthDependencies> = {}
): Promise<IntegrationHealthSnapshot> {
  const deps = { ...defaultDependencies, ...dependencies };
  const startedAt = deps.now();

  const databaseStartedAt = deps.now();
  let database: IntegrationHealthComponent;
  let sources: SourceIntegrationHealthComponent;
  const db = await deps.getDb();
  if (!db) {
    database = {
      status: "unavailable",
      latencyMs: elapsed(databaseStartedAt, deps.now),
      detail: "Database connection is unavailable",
    };
    sources = {
      status: "unavailable",
      latencyMs: null,
      detail:
        "Source integrations cannot be read while the database is unavailable",
      connected: 0,
      healthy: 0,
      delayed: 0,
      failing: 0,
      paused: 0,
    };
  } else {
    try {
      await db.execute(sql`SELECT 1`);
      database = {
        status: "healthy",
        latencyMs: elapsed(databaseStartedAt, deps.now),
        detail: "Read-only connection probe passed",
      };
    } catch (error) {
      database = {
        status: "unavailable",
        latencyMs: elapsed(databaseStartedAt, deps.now),
        detail: failureDetail(error, "Read-only connection probe failed"),
      };
    }

    if (database.status !== "healthy") {
      sources = {
        status: "unavailable",
        latencyMs: null,
        detail:
          "Source integrations cannot be read while the database probe is unavailable",
        connected: 0,
        healthy: 0,
        delayed: 0,
        failing: 0,
        paused: 0,
      };
    } else {
      const sourcesStartedAt = deps.now();
      try {
        const rows = await db
          .select({ status: sourceConnections.status })
          .from(sourceConnections);
        const counts = {
          healthy: 0,
          delayed: 0,
          failing: 0,
          paused: 0,
          setup: 0,
        };
        for (const row of rows) {
          if (row.status === "healthy") counts.healthy += 1;
          else if (row.status === "delayed") counts.delayed += 1;
          else if (row.status === "failing") counts.failing += 1;
          else if (row.status === "paused") counts.paused += 1;
          else counts.setup += 1;
        }
        const connected = rows.length;
        const attention = counts.delayed + counts.failing;
        sources = {
          status:
            attention > 0
              ? "degraded"
              : connected === 0
                ? "not_configured"
                : "healthy",
          latencyMs: elapsed(sourcesStartedAt, deps.now),
          detail:
            connected === 0
              ? "No configured source integrations"
              : attention > 0
                ? `${attention} source integration${attention === 1 ? " needs" : "s need"} attention`
                : `${connected} configured source integration${connected === 1 ? "" : "s"}`,
          connected,
          healthy: counts.healthy,
          delayed: counts.delayed,
          failing: counts.failing,
          paused: counts.paused + counts.setup,
        };
      } catch (error) {
        sources = {
          status: "unavailable",
          latencyMs: elapsed(sourcesStartedAt, deps.now),
          detail: failureDetail(error, "Source integration query failed"),
          connected: 0,
          healthy: 0,
          delayed: 0,
          failing: 0,
          paused: 0,
        };
      }
    }
  }

  const heartbeatStartedAt = deps.now();
  let heartbeat: IntegrationHealthComponent;
  if (!deps.heartbeatConfigured()) {
    heartbeat = {
      status: "not_configured",
      latencyMs: null,
      detail: "Heartbeat service is not configured",
    };
  } else {
    try {
      const result = await deps.listHeartbeats("", { page: 1, pageSize: 100 });
      heartbeat = {
        status: "healthy",
        latencyMs: elapsed(heartbeatStartedAt, deps.now),
        detail: `${result.jobs.filter(job => job.isEnable).length} enabled background job${result.jobs.filter(job => job.isEnable).length === 1 ? "" : "s"}`,
      };
    } catch (error) {
      heartbeat = {
        status: "unavailable",
        latencyMs: elapsed(heartbeatStartedAt, deps.now),
        detail: failureDetail(error, "Heartbeat service could not be reached"),
      };
    }
  }

  const stripeStartedAt = deps.now();
  let stripe: IntegrationHealthComponent;
  const stripeSecretKey = deps.stripeSecretKey();
  if (!stripeSecretKey) {
    stripe = {
      status: "not_configured",
      latencyMs: null,
      detail: "Stripe is not configured",
    };
  } else {
    try {
      const response = await deps.fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
        signal: AbortSignal.timeout(INTEGRATION_HEALTH_TIMEOUT_MS),
      });
      const requiresCredentialRefresh =
        response.status === 401 || response.status === 403;
      stripe = {
        status: response.ok ? "healthy" : "degraded",
        latencyMs: elapsed(stripeStartedAt, deps.now),
        detail: response.ok
          ? "Stripe API credential probe passed"
          : `Stripe API returned HTTP ${response.status}`,
        reauthRequired: requiresCredentialRefresh || undefined,
        reauthTarget: requiresCredentialRefresh ? "stripe" : undefined,
      };
    } catch (error) {
      stripe = {
        status: "unavailable",
        latencyMs: elapsed(stripeStartedAt, deps.now),
        detail: failureDetail(error, "Stripe API could not be reached"),
      };
    }
  }

  const relayStartedAt = deps.now();
  let emailRelay: IntegrationHealthComponent;
  try {
    const relay = await deps.getRelaySummary();
    const status = relay.lastKnownStatus;
    emailRelay = {
      status:
        status === "healthy"
          ? "healthy"
          : status === "unconfigured" || !status
            ? "not_configured"
            : "degraded",
      latencyMs: elapsed(relayStartedAt, deps.now),
      detail:
        status === "healthy"
          ? "Primary email relay is healthy"
          : status === "failover"
            ? "Backup email relay is serving traffic"
            : status === "degraded"
              ? "Email relay needs attention"
              : "No email relay health observation is available",
    };
  } catch (error) {
    emailRelay = {
      status: "unavailable",
      latencyMs: elapsed(relayStartedAt, deps.now),
      detail: failureDetail(error, "Email relay status could not be loaded"),
    };
  }

  return {
    checkedAt: deps.now(),
    durationMs: elapsed(startedAt, deps.now),
    overallStatus: overallStatus([
      database,
      heartbeat,
      stripe,
      emailRelay,
      sources,
    ]),
    database,
    heartbeat,
    stripe,
    emailRelay,
    sources,
  };
}
