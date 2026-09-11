import { and, desc, eq, gte, inArray } from "drizzle-orm";
import {
  integrationHealthAlertConfigs,
  integrationHealthAlertDeliveries,
} from "../drizzle/schema";
import type {
  IntegrationHealthComponent,
  IntegrationHealthSnapshot,
} from "./integrationHealth";
import { getDb } from "./db";
import { decryptPassword, encryptPassword } from "./smtp";

const SHARED_SCOPE_KEY = "project_operations";
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const MIN_LATENCY_THRESHOLD_MS = 100;
const MAX_LATENCY_THRESHOLD_MS = 60_000;
const MAX_ALERT_LOG_ROWS = 500;

export const HEALTH_ALERT_PROVIDERS = ["slack", "discord"] as const;
export type HealthAlertProvider = (typeof HEALTH_ALERT_PROVIDERS)[number];
export type HealthAlertCategory = "failure" | "latency" | "test";

export type HealthAlertSettings = {
  configured: boolean;
  enabled: boolean;
  provider: HealthAlertProvider | null;
  latencyThresholdMs: number;
  alertOnFailure: boolean;
  alertOnHighLatency: boolean;
  updatedAt: number | null;
};

type HealthAlertConfigRecord = {
  id: number;
  enabled: boolean;
  provider: string;
  encryptedWebhookUrl: string;
  latencyThresholdMs: number;
  alertOnFailure: boolean;
  alertOnHighLatency: boolean;
  updatedAt: number;
};

type AlertCandidate = {
  category: Exclude<HealthAlertCategory, "test">;
  component: string;
  componentStatus: string;
  latencyMs: number | null;
  eventKey: string;
};

function safeProvider(value: string): HealthAlertProvider | null {
  return (HEALTH_ALERT_PROVIDERS as readonly string[]).includes(value)
    ? (value as HealthAlertProvider)
    : null;
}

function toSettings(
  config: HealthAlertConfigRecord | null | undefined
): HealthAlertSettings {
  const provider = config ? safeProvider(config.provider) : null;
  return {
    configured: Boolean(config && provider),
    enabled: Boolean(config?.enabled && provider),
    provider,
    latencyThresholdMs: config?.latencyThresholdMs ?? 2500,
    alertOnFailure: config?.alertOnFailure ?? true,
    alertOnHighLatency: config?.alertOnHighLatency ?? true,
    updatedAt: config?.updatedAt ?? null,
  };
}

function sanitizeWebhookUrl(
  rawUrl: string,
  provider: HealthAlertProvider
): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error("Enter a valid HTTPS webhook URL.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error(
      "Webhook URLs must use HTTPS and must not contain credentials."
    );
  }
  const host = parsed.hostname.toLowerCase();
  const isSlack =
    provider === "slack" &&
    host === "hooks.slack.com" &&
    parsed.pathname.startsWith("/services/");
  const isDiscord =
    provider === "discord" &&
    (host === "discord.com" || host === "discordapp.com") &&
    parsed.pathname.startsWith("/api/webhooks/");
  if (!isSlack && !isDiscord) {
    throw new Error(
      "Use the official HTTPS incoming webhook URL for the selected provider."
    );
  }
  parsed.hash = "";
  return parsed.toString();
}

async function getConfig(): Promise<HealthAlertConfigRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const [config] = await db
    .select()
    .from(integrationHealthAlertConfigs)
    .where(eq(integrationHealthAlertConfigs.scopeKey, SHARED_SCOPE_KEY))
    .limit(1);
  return (config as HealthAlertConfigRecord | undefined) ?? null;
}

export async function getIntegrationHealthAlertSettings(): Promise<HealthAlertSettings> {
  return toSettings(await getConfig());
}

export async function saveIntegrationHealthAlertSettings(input: {
  userId: number;
  enabled: boolean;
  provider: HealthAlertProvider;
  webhookUrl?: string | null;
  latencyThresholdMs: number;
  alertOnFailure: boolean;
  alertOnHighLatency: boolean;
  now?: number;
}): Promise<HealthAlertSettings> {
  const db = await getDb();
  if (!db)
    throw new Error("Health alert settings are temporarily unavailable.");
  const now = input.now ?? Date.now();
  const threshold = Math.round(
    Math.min(
      MAX_LATENCY_THRESHOLD_MS,
      Math.max(MIN_LATENCY_THRESHOLD_MS, input.latencyThresholdMs)
    )
  );
  const current = await getConfig();
  const currentProvider = current ? safeProvider(current.provider) : null;
  const suppliedUrl = input.webhookUrl?.trim();
  const providerChanged = currentProvider !== input.provider;
  let encryptedWebhookUrl = current?.encryptedWebhookUrl ?? "";

  if (suppliedUrl) {
    encryptedWebhookUrl = encryptPassword(
      sanitizeWebhookUrl(suppliedUrl, input.provider)
    );
  } else if (providerChanged || !encryptedWebhookUrl) {
    throw new Error(
      "Add an official incoming webhook URL for the selected provider."
    );
  }

  // Do not accept an enabled configuration that cannot make a verified provider call.
  if (input.enabled && !encryptedWebhookUrl) {
    throw new Error(
      "Add an incoming webhook URL before enabling health alerts."
    );
  }

  await db
    .insert(integrationHealthAlertConfigs)
    .values({
      scopeKey: SHARED_SCOPE_KEY,
      enabled: input.enabled,
      provider: input.provider,
      encryptedWebhookUrl,
      latencyThresholdMs: threshold,
      alertOnFailure: input.alertOnFailure,
      alertOnHighLatency: input.alertOnHighLatency,
      updatedByUserId: input.userId,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        enabled: input.enabled,
        provider: input.provider,
        encryptedWebhookUrl,
        latencyThresholdMs: threshold,
        alertOnFailure: input.alertOnFailure,
        alertOnHighLatency: input.alertOnHighLatency,
        updatedByUserId: input.userId,
        updatedAt: now,
      },
    });

  return toSettings({
    id: current?.id ?? 0,
    enabled: input.enabled,
    provider: input.provider,
    encryptedWebhookUrl,
    latencyThresholdMs: threshold,
    alertOnFailure: input.alertOnFailure,
    alertOnHighLatency: input.alertOnHighLatency,
    updatedAt: now,
  });
}

export async function deleteIntegrationHealthAlertSettings(): Promise<void> {
  const db = await getDb();
  if (!db)
    throw new Error("Health alert settings are temporarily unavailable.");
  await db
    .delete(integrationHealthAlertConfigs)
    .where(eq(integrationHealthAlertConfigs.scopeKey, SHARED_SCOPE_KEY));
}

function statusNeedsFailureAlert(component: IntegrationHealthComponent) {
  return (
    component.status === "unavailable" || component.reauthRequired === true
  );
}

function candidatesFor(
  snapshot: IntegrationHealthSnapshot,
  settings: HealthAlertSettings
): AlertCandidate[] {
  const components: Array<[string, IntegrationHealthComponent]> = [
    ["database", snapshot.database],
    ["heartbeat", snapshot.heartbeat],
    ["stripe", snapshot.stripe],
    ["email_relay", snapshot.emailRelay],
    ["sources", snapshot.sources],
  ];
  const candidates: AlertCandidate[] = [];

  for (const [component, observation] of components) {
    if (settings.alertOnFailure && statusNeedsFailureAlert(observation)) {
      candidates.push({
        category: "failure",
        component,
        componentStatus: observation.status,
        latencyMs: observation.latencyMs,
        eventKey: `failure:${component}:${observation.status}:${observation.reauthRequired ? "auth" : "runtime"}`,
      });
    }
    if (
      settings.alertOnHighLatency &&
      observation.status === "healthy" &&
      observation.latencyMs !== null &&
      observation.latencyMs >= settings.latencyThresholdMs
    ) {
      candidates.push({
        category: "latency",
        component,
        componentStatus: observation.status,
        latencyMs: observation.latencyMs,
        eventKey: `latency:${component}:${settings.latencyThresholdMs}`,
      });
    }
  }
  return candidates;
}

function payloadFor(
  provider: HealthAlertProvider,
  input: {
    category: HealthAlertCategory;
    component: string;
    componentStatus: string;
    latencyMs: number | null;
    timestamp: number;
  }
) {
  const heading =
    input.category === "test"
      ? "Get Phame health alert test"
      : input.category === "latency"
        ? "Get Phame health latency threshold reached"
        : "Get Phame health check needs attention";
  const severity =
    input.category === "failure"
      ? "danger"
      : input.category === "latency"
        ? "warning"
        : "good";
  const detail =
    input.category === "test"
      ? "Administrator configuration test"
      : input.category === "latency"
        ? `${input.component} measured ${input.latencyMs ?? "unknown"} ms`
        : `${input.component} status is ${input.componentStatus}`;
  const fields = [
    { title: "Component", value: input.component },
    { title: "Status", value: input.componentStatus },
    { title: "Observed", value: new Date(input.timestamp).toISOString() },
    { title: "Detail", value: detail },
  ];

  if (provider === "slack") {
    return {
      attachments: [
        {
          color:
            severity === "danger"
              ? "#e11d48"
              : severity === "warning"
                ? "#d97706"
                : "#059669",
          title: heading,
          fields: fields.map(field => ({ ...field, short: false })),
          footer: "Get Phame Operations",
        },
      ],
    };
  }

  return {
    embeds: [
      {
        title: heading,
        description: detail,
        color:
          severity === "danger"
            ? 0xe11d48
            : severity === "warning"
              ? 0xd97706
              : 0x059669,
        fields: fields.slice(0, 3).map(field => ({
          name: field.title,
          value: field.value,
          inline: true,
        })),
        footer: { text: "Get Phame Operations" },
      },
    ],
  };
}

async function recentlyDelivered(
  configId: number,
  eventKey: string,
  now: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;
  const [existing] = await db
    .select({ id: integrationHealthAlertDeliveries.id })
    .from(integrationHealthAlertDeliveries)
    .where(
      and(
        eq(integrationHealthAlertDeliveries.configId, configId),
        eq(integrationHealthAlertDeliveries.eventKey, eventKey),
        eq(integrationHealthAlertDeliveries.delivered, true),
        gte(integrationHealthAlertDeliveries.createdAt, now - ALERT_COOLDOWN_MS)
      )
    )
    .orderBy(desc(integrationHealthAlertDeliveries.createdAt))
    .limit(1);
  return Boolean(existing);
}

function failureCode(error: unknown) {
  if (error instanceof DOMException && error.name === "TimeoutError")
    return "timeout";
  return "network_error";
}

async function logDelivery(input: {
  configId: number;
  eventKey: string;
  category: HealthAlertCategory;
  component: string;
  componentStatus: string;
  delivered: boolean;
  httpStatus: number | null;
  failureCode: string | null;
  now: number;
}) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(integrationHealthAlertDeliveries).values({
      configId: input.configId,
      eventKey: input.eventKey.slice(0, 96),
      category: input.category,
      component: input.component.slice(0, 32),
      componentStatus: input.componentStatus.slice(0, 20),
      delivered: input.delivered,
      httpStatus: input.httpStatus,
      failureCode: input.failureCode,
      createdAt: input.now,
    });
    const stale = await db
      .select({ id: integrationHealthAlertDeliveries.id })
      .from(integrationHealthAlertDeliveries)
      .orderBy(desc(integrationHealthAlertDeliveries.createdAt))
      .offset(MAX_ALERT_LOG_ROWS)
      .limit(MAX_ALERT_LOG_ROWS);
    if (stale.length > 0) {
      await db.delete(integrationHealthAlertDeliveries).where(
        inArray(
          integrationHealthAlertDeliveries.id,
          stale.map(row => row.id)
        )
      );
    }
  } catch (error) {
    console.warn(
      "[IntegrationHealth] Could not record sanitized alert delivery:",
      error instanceof Error ? error.name : "UnknownError"
    );
  }
}

async function deliver(input: {
  config: HealthAlertConfigRecord;
  provider: HealthAlertProvider;
  eventKey: string;
  category: HealthAlertCategory;
  component: string;
  componentStatus: string;
  latencyMs: number | null;
  now: number;
}): Promise<{ delivered: boolean; httpStatus: number | null }> {
  let url: string;
  try {
    url = sanitizeWebhookUrl(
      decryptPassword(input.config.encryptedWebhookUrl),
      input.provider
    );
  } catch {
    await logDelivery({
      configId: input.config.id,
      eventKey: input.eventKey,
      category: input.category,
      component: input.component,
      componentStatus: input.componentStatus,
      now: input.now,
      delivered: false,
      httpStatus: null,
      failureCode: "credential_unavailable",
    });
    return { delivered: false, httpStatus: null };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        payloadFor(input.provider, {
          category: input.category,
          component: input.component,
          componentStatus: input.componentStatus,
          latencyMs: input.latencyMs,
          timestamp: input.now,
        })
      ),
      signal: AbortSignal.timeout(8_000),
    });
    const delivered = response.ok;
    await logDelivery({
      configId: input.config.id,
      eventKey: input.eventKey,
      category: input.category,
      component: input.component,
      componentStatus: input.componentStatus,
      now: input.now,
      delivered,
      httpStatus: response.status,
      failureCode: delivered ? null : "http_error",
    });
    return { delivered, httpStatus: response.status };
  } catch (error) {
    await logDelivery({
      configId: input.config.id,
      eventKey: input.eventKey,
      category: input.category,
      component: input.component,
      componentStatus: input.componentStatus,
      now: input.now,
      delivered: false,
      httpStatus: null,
      failureCode: failureCode(error),
    });
    return { delivered: false, httpStatus: null };
  }
}

/** Sends deduplicated failure/latency alerts without blocking a scheduled probe. */
export async function dispatchIntegrationHealthAlerts(
  snapshot: IntegrationHealthSnapshot,
  now = Date.now()
): Promise<{ considered: number; delivered: number }> {
  let config: Awaited<ReturnType<typeof getConfig>> = null;
  try {
    config = await getConfig();
  } catch (error) {
    console.warn(
      "[IntegrationHealth] Could not read alert settings during dispatch:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return { considered: 0, delivered: 0 };
  }
  const settings = toSettings(config);
  if (!config || !settings.enabled || !settings.provider)
    return { considered: 0, delivered: 0 };

  let delivered = 0;
  const candidates = candidatesFor(snapshot, settings);
  for (const candidate of candidates) {
    if (await recentlyDelivered(config.id, candidate.eventKey, now)) continue;
    const result = await deliver({
      config,
      provider: settings.provider,
      ...candidate,
      now,
    });
    if (result.delivered) delivered += 1;
  }
  return { considered: candidates.length, delivered };
}

/** Sends a safe test card to the stored destination; it does not inspect live health. */
export async function sendIntegrationHealthAlertTest(): Promise<{
  delivered: boolean;
  status: number | null;
}> {
  const config = await getConfig();
  const settings = toSettings(config);
  if (!config || !settings.enabled || !settings.provider) {
    throw new Error(
      "Enable a Slack or Discord health alert destination first."
    );
  }
  const result = await deliver({
    config,
    provider: settings.provider,
    eventKey: `test:${Date.now()}`,
    category: "test",
    component: "health_monitor",
    componentStatus: "configured",
    latencyMs: null,
    now: Date.now(),
  });
  return { delivered: result.delivered, status: result.httpStatus };
}
