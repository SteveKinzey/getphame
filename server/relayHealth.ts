import { desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailRelayDiagnostics, emailRelayOutages } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { sendRelayAlertEmailFallback } from "./relayAlertEmail";

export type RelayProvider = "system_smtp" | "sendgrid" | "none";
export type RelayHealthState = "healthy" | "failover" | "degraded" | "unconfigured";
export type RelayDiagnosticSource = "scheduled_heartbeat" | "admin_manual";

export interface FailoverEvent {
  id: string;
  timestamp: number;
  fromProvider: RelayProvider;
  toProvider: RelayProvider;
  reason: string;
  source: string;
}

export interface OutageRecord {
  id: string | number;
  startedAt: number;
  resolvedAt: number | null;
  durationMinutes: number;
  cause: string;
  status: "ongoing" | "resolved";
  triggerSource: string;
}

export interface RelayHeartbeatDiagnostic {
  id: string;
  checkedAt: number;
  source: RelayDiagnosticSource;
  status: RelayHealthState;
  activeRelay: RelayProvider;
  primaryHealthy: boolean;
  backupConfigured: boolean;
  durationMs: number;
  alertType: "failure" | "recovery" | null;
  slackAlertSent: boolean;
  emailFallbackAttempted: boolean;
  emailFallbackDelivered: boolean;
  diagnostic: string;
}

const MAX_FAILOVER_HISTORY = 50;
const MAX_OUTAGE_HISTORY = 20;
const MAX_HEARTBEAT_DIAGNOSTICS = 10;
export const RELAY_OUTAGE_EXPORT_LIMIT = 1_000;
const DEFAULT_ALERT_COOLDOWN_MINUTES = 30;
const MIN_ALERT_COOLDOWN_MINUTES = 1;
const MAX_ALERT_COOLDOWN_MINUTES = 24 * 60;
const failoverHistory: FailoverEvent[] = [];
const fallbackOutageHistory: OutageRecord[] = [];
const heartbeatDiagnostics: RelayHeartbeatDiagnostic[] = [];

let activeFailoverIncident = false;
let lastFailoverAlertAt: number | null = null;
let lastCheckedAt: number | null = null;
let lastKnownStatus: RelayHealthState = "healthy";

export function getRelayAlertCooldownMs() {
  const configuredMinutes = Number.parseInt(process.env.RELAY_ALERT_COOLDOWN_MINUTES ?? "", 10);
  const minutes = Number.isFinite(configuredMinutes)
    ? Math.min(Math.max(configuredMinutes, MIN_ALERT_COOLDOWN_MINUTES), MAX_ALERT_COOLDOWN_MINUTES)
    : DEFAULT_ALERT_COOLDOWN_MINUTES;
  return minutes * 60_000;
}

export function getRelayAlertCooldownMinutes() {
  return Math.round(getRelayAlertCooldownMs() / 60_000);
}

/**
 * Strips secrets and personal data before retaining diagnostics in memory,
 * persistence, response payloads, Slack, or operational fallback email.
 */
export function sanitizeRelayDiagnostic(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const redacted = normalized
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\bhttps?:\/\/[^\s<>"']+/gi, "[redacted-url]")
    .replace(/\b(api[_-]?key|password|pass|secret|token|code)\s*(?:=|:)\s*(?:bearer\s+)?[A-Za-z0-9_~+\-/=.:-]{8,}/gi, "$1: [redacted]")
    .replace(/\b(authorization|bearer)\s+(?:bearer\s+)?\S{8,}/gi, "$1 [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[redacted-token]");
  return redacted.slice(0, 300) || "Primary SMTP connection verification failed";
}

function boundedCause(value: string): string {
  return sanitizeRelayDiagnostic(value);
}

function asOutageRecord(row: typeof emailRelayOutages.$inferSelect, now = Date.now()): OutageRecord {
  const durationMs = (row.resolvedAt ?? now) - row.startedAt;
  return {
    id: row.id,
    startedAt: row.startedAt,
    resolvedAt: row.resolvedAt,
    durationMinutes: Math.max(1, Math.round(durationMs / 60_000)),
    cause: row.cause,
    status: row.resolvedAt === null ? "ongoing" : "resolved",
    triggerSource: row.triggerSource,
  };
}

async function recordHeartbeatDiagnostic(
  result: RelayHeartbeatResult,
  source: RelayDiagnosticSource
): Promise<RelayHeartbeatResult> {
  const safeDiagnostic = result.primaryError
    ? boundedCause(result.primaryError)
    : "Primary SYSTEM_SMTP transport verification succeeded.";

  const entry: RelayHeartbeatDiagnostic = {
    id: `rh_${result.checkedAt.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    checkedAt: result.checkedAt,
    source,
    status: result.status,
    activeRelay: result.activeRelay,
    primaryHealthy: result.primaryHealthy,
    backupConfigured: result.backupConfigured,
    durationMs: result.durationMs,
    alertType: result.alertType ?? null,
    slackAlertSent: result.slackAlertSent,
    emailFallbackAttempted: result.emailFallbackAttempted,
    emailFallbackDelivered: result.emailFallbackDelivered,
    diagnostic: safeDiagnostic,
  };

  heartbeatDiagnostics.unshift(entry);
  if (heartbeatDiagnostics.length > MAX_HEARTBEAT_DIAGNOSTICS) heartbeatDiagnostics.pop();

  const db = await getDb();
  if (db) {
    await db.insert(emailRelayDiagnostics).values({
      checkedAt: entry.checkedAt,
      source: entry.source,
      status: entry.status,
      activeRelay: entry.activeRelay,
      primaryHealthy: entry.primaryHealthy,
      backupConfigured: entry.backupConfigured,
      durationMs: entry.durationMs,
      alertType: entry.alertType,
      slackAlertSent: entry.slackAlertSent,
      emailFallbackAttempted: entry.emailFallbackAttempted,
      emailFallbackDelivered: entry.emailFallbackDelivered,
      diagnostic: entry.diagnostic,
    }).catch((error) => {
      console.warn("[RelayHealth] Failed to insert durable heartbeat diagnostic:", error instanceof Error ? error.name : "UnknownError");
    });

    // Keep the database log as bounded as the Admin UI contract: the latest ten
    // sanitized observations only. This prevents an unbounded 15-minute cron log.
    const staleRows = await db
      .select({ id: emailRelayDiagnostics.id })
      .from(emailRelayDiagnostics)
      .orderBy(desc(emailRelayDiagnostics.checkedAt))
      .offset(MAX_HEARTBEAT_DIAGNOSTICS)
      .limit(1000)
      .catch(() => []);
    if (staleRows.length > 0) {
      await db
        .delete(emailRelayDiagnostics)
        .where(inArray(emailRelayDiagnostics.id, staleRows.map(row => row.id)))
        .catch((error) => {
          console.warn("[RelayHealth] Failed to prune durable heartbeat diagnostics:", error instanceof Error ? error.name : "UnknownError");
        });
    }
  }

  return result;
}

export async function getRecentHeartbeatDiagnostics(limit = MAX_HEARTBEAT_DIAGNOSTICS): Promise<RelayHeartbeatDiagnostic[]> {
  const db = await getDb();
  if (!db) {
    return heartbeatDiagnostics.slice(0, Math.min(limit, MAX_HEARTBEAT_DIAGNOSTICS));
  }

  const rows = await db
    .select()
    .from(emailRelayDiagnostics)
    .orderBy(desc(emailRelayDiagnostics.checkedAt))
    .limit(Math.min(limit, MAX_HEARTBEAT_DIAGNOSTICS))
    .catch(() => []);

  if (rows.length === 0) {
    return heartbeatDiagnostics.slice(0, Math.min(limit, MAX_HEARTBEAT_DIAGNOSTICS));
  }

  return rows.map((row) => ({
    id: String(row.id),
    checkedAt: row.checkedAt,
    source: (row.source === "admin_manual" ? "admin_manual" : "scheduled_heartbeat") as RelayDiagnosticSource,
    status: row.status as RelayHealthState,
    activeRelay: row.activeRelay as RelayProvider,
    primaryHealthy: Boolean(row.primaryHealthy),
    backupConfigured: Boolean(row.backupConfigured),
    durationMs: row.durationMs,
    alertType: (row.alertType as "failure" | "recovery" | null) ?? null,
    slackAlertSent: Boolean(row.slackAlertSent),
    emailFallbackAttempted: Boolean(row.emailFallbackAttempted),
    emailFallbackDelivered: Boolean(row.emailFallbackDelivered),
    diagnostic: boundedCause(row.diagnostic),
  }));
}

export function getInMemoryHeartbeatDiagnostics(limit = MAX_HEARTBEAT_DIAGNOSTICS): RelayHeartbeatDiagnostic[] {
  return heartbeatDiagnostics.slice(0, Math.min(limit, MAX_HEARTBEAT_DIAGNOSTICS));
}

export function resetRelayHealthState() {
  activeFailoverIncident = false;
  lastFailoverAlertAt = null;
  lastCheckedAt = null;
  lastKnownStatus = "healthy";
  failoverHistory.length = 0;
  fallbackOutageHistory.length = 0;
  heartbeatDiagnostics.length = 0;
}

/** Dispatch a bounded Slack Incoming Webhook payload; no webhook URL is logged. */
export async function sendSlackWebhookNotification(payload: {
  title: string;
  color: "#e11d48" | "#10b981" | "#f59e0b";
  fields: Array<{ title: string; value: string; short?: boolean }>;
}): Promise<boolean> {
  const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return false;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [{
          color: payload.color,
          title: payload.title.slice(0, 180),
          fields: payload.fields.map(field => ({
            title: field.title.slice(0, 80),
            value: boundedCause(field.value).slice(0, 300),
            short: field.short !== false,
          })),
          footer: "Get Phame Operations Monitor",
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });
    return res.ok;
  } catch (error) {
    console.warn("[RelayHealth] Slack webhook notification failed without interrupting relay delivery:", error instanceof Error ? error.name : "UnknownError");
    return false;
  }
}

export function recordRelayEvent(event: Omit<FailoverEvent, "id" | "timestamp">): FailoverEvent {
  const fullEvent: FailoverEvent = {
    ...event,
    reason: boundedCause(event.reason),
    id: `fe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  failoverHistory.unshift(fullEvent);
  if (failoverHistory.length > MAX_FAILOVER_HISTORY) failoverHistory.pop();
  return fullEvent;
}

export function getRecentFailoverEvents(limit = 10): FailoverEvent[] {
  return failoverHistory.slice(0, Math.min(limit, MAX_FAILOVER_HISTORY));
}

/** Create one durable active outage, or retain the current incident if it already exists. */
export async function startRelayOutage(cause: string, triggerSource: string, startedAt = Date.now()) {
  const normalizedCause = boundedCause(cause);
  const db = await getDb();
  if (!db) {
    const current = fallbackOutageHistory.find(outage => outage.status === "ongoing");
    if (current) return current;
    const outage: OutageRecord = {
      id: `fallback_${startedAt}`,
      startedAt,
      resolvedAt: null,
      durationMinutes: 0,
      cause: normalizedCause,
      status: "ongoing",
      triggerSource,
    };
    fallbackOutageHistory.unshift(outage);
    if (fallbackOutageHistory.length > MAX_OUTAGE_HISTORY) fallbackOutageHistory.pop();
    return outage;
  }

  const [existing] = await db
    .select()
    .from(emailRelayOutages)
    .where(isNull(emailRelayOutages.resolvedAt))
    .orderBy(desc(emailRelayOutages.startedAt))
    .limit(1);
  if (existing) return asOutageRecord(existing, startedAt);

  const [created] = await db.insert(emailRelayOutages).values({
    startedAt,
    cause: normalizedCause,
    triggerSource: triggerSource.slice(0, 32),
  }).$returningId();

  return {
    id: created.id,
    startedAt,
    resolvedAt: null,
    durationMinutes: 0,
    cause: normalizedCause,
    status: "ongoing" as const,
    triggerSource,
  };
}

/** Close the active durable outage exactly once when the primary relay recovers. */
export async function resolveActiveRelayOutage(resolvedAt = Date.now()) {
  const db = await getDb();
  if (!db) {
    const current = fallbackOutageHistory.find(outage => outage.status === "ongoing");
    if (!current) return null;
    current.resolvedAt = resolvedAt;
    current.durationMinutes = Math.max(1, Math.round((resolvedAt - current.startedAt) / 60_000));
    current.status = "resolved";
    return current;
  }

  const [active] = await db
    .select()
    .from(emailRelayOutages)
    .where(isNull(emailRelayOutages.resolvedAt))
    .orderBy(desc(emailRelayOutages.startedAt))
    .limit(1);
  if (!active) return null;

  await db
    .update(emailRelayOutages)
    .set({ resolvedAt })
    .where(eq(emailRelayOutages.id, active.id));
  return asOutageRecord({ ...active, resolvedAt }, resolvedAt);
}

/**
 * Reserve the next administrator notification after the configured cooldown.
 * A durable timestamp prevents cold starts from re-alerting during network flaps.
 */
export async function reserveRelayAlert(outageId: OutageRecord["id"], now = Date.now()) {
  const cooldownMs = getRelayAlertCooldownMs();
  const db = await getDb();
  if (db && typeof outageId === "number") {
    const [outage] = await db
      .select({ lastAlertAt: emailRelayOutages.lastAlertAt })
      .from(emailRelayOutages)
      .where(eq(emailRelayOutages.id, outageId))
      .limit(1);
    if (outage?.lastAlertAt !== null && outage?.lastAlertAt !== undefined && now - outage.lastAlertAt < cooldownMs) {
      return { permitted: false, cooldownMs, retryAt: outage.lastAlertAt + cooldownMs };
    }
    await db
      .update(emailRelayOutages)
      .set({ lastAlertAt: now })
      .where(eq(emailRelayOutages.id, outageId));
    lastFailoverAlertAt = now;
    return { permitted: true, cooldownMs, retryAt: null };
  }

  const fallbackOutage = typeof outageId === "string"
    ? fallbackOutageHistory.find(o => o.id === outageId)
    : null;
  const previousAlert = (fallbackOutage as any)?.lastAlertAt ?? lastFailoverAlertAt;
  if (previousAlert !== null && now - previousAlert < cooldownMs) {
    return { permitted: false, cooldownMs, retryAt: previousAlert + cooldownMs };
  }
  if (fallbackOutage) {
    (fallbackOutage as any).lastAlertAt = now;
  }
  lastFailoverAlertAt = now;
  return { permitted: true, cooldownMs, retryAt: null };
}

export async function getOutageHistory(limit = 10): Promise<OutageRecord[]> {
  const db = await getDb();
  if (!db) {
    const now = Date.now();
    return fallbackOutageHistory.slice(0, limit).map(outage => ({
      ...outage,
      durationMinutes: outage.status === "ongoing"
        ? Math.max(1, Math.round((now - outage.startedAt) / 60_000))
        : outage.durationMinutes,
    }));
  }

  const rows = await db
    .select()
    .from(emailRelayOutages)
    .orderBy(desc(emailRelayOutages.startedAt))
    .limit(Math.min(limit, MAX_OUTAGE_HISTORY));
  return rows.map(row => asOutageRecord(row));
}

/**
 * Capture the one bounded, server-side outage snapshot used for administrator
 * reliability exports. The browser receives prepared data only, never raw rows.
 */
export async function getRelayOutageExportSnapshot() {
  const snapshotToMs = Date.now();
  const db = await getDb();
  if (!db) {
    const outages = await getOutageHistory(RELAY_OUTAGE_EXPORT_LIMIT);
    return {
      outages,
      totalMatching: outages.length,
      truncated: false,
      snapshotToMs,
    };
  }

  const [countRow] = await db
    .select({ total: sql<number>`count(*)` })
    .from(emailRelayOutages)
    .where(lte(emailRelayOutages.startedAt, snapshotToMs));
  const totalMatching = Number(countRow?.total ?? 0);
  const rows = await db
    .select()
    .from(emailRelayOutages)
    .where(lte(emailRelayOutages.startedAt, snapshotToMs))
    .orderBy(desc(emailRelayOutages.startedAt))
    .limit(RELAY_OUTAGE_EXPORT_LIMIT);

  return {
    outages: rows.map(row => asOutageRecord(row, snapshotToMs)),
    totalMatching,
    truncated: totalMatching > rows.length,
    snapshotToMs,
  };
}

export function getRelayConfigStatus() {
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "587", 10);
  return {
    primaryConfigured: Boolean(host && user && pass && Number.isFinite(port)),
    primaryHost: host ?? null,
    primaryPort: Number.isFinite(port) ? port : null,
    backupConfigured: Boolean(process.env.SENDGRID_API_KEY?.trim() || ENV.sendgridApiKey),
    slackWebhookConfigured: Boolean(process.env.SLACK_ALERT_WEBHOOK_URL?.trim()),
  };
}

export async function probePrimarySmtp(): Promise<{ ok: boolean; error?: string; durationMs: number }> {
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "587", 10);
  if (!host || !user || !pass || !Number.isFinite(port)) {
    return { ok: false, error: "SYSTEM_SMTP_* credentials not configured", durationMs: 0 };
  }

  const startedAt = Date.now();
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: process.env.ALLOW_INSECURE_SMTP_TLS !== "true" },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });
    await transporter.verify();
    return { ok: true, durationMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "SMTP connection rejected",
      durationMs: Date.now() - startedAt,
    };
  }
}

export interface RelayHeartbeatResult {
  checkedAt: number;
  status: RelayHealthState;
  activeRelay: RelayProvider;
  primaryHealthy: boolean;
  backupConfigured: boolean;
  primaryError?: string | null;
  durationMs: number;
  transitionAlertSent: boolean;
  slackAlertSent: boolean;
  emailFallbackAttempted: boolean;
  emailFallbackDelivered: boolean;
  alertSuppressed?: boolean;
  alertType?: "failure" | "recovery" | null;
}

async function sendFallbackAfterSlackFailure(input: {
  event: "failure" | "recovery";
  activeRelay: RelayProvider;
  checkedAt: number;
  source: RelayDiagnosticSource;
  diagnostic: string;
  durationMinutes?: number | null;
}) {
  const result = await sendRelayAlertEmailFallback(input).catch(() => ({
    attempted: false,
    delivered: false,
    reason: "delivery_failed" as const,
  }));
  return {
    emailFallbackAttempted: result.attempted,
    emailFallbackDelivered: result.delivered,
  };
}

export async function runRelayHeartbeatCheck(options: { source?: RelayDiagnosticSource } = {}): Promise<RelayHeartbeatResult> {
  const source = options.source ?? "scheduled_heartbeat";
  const startedAt = Date.now();
  const config = getRelayConfigStatus();
  lastCheckedAt = startedAt;

  if (!config.primaryConfigured && !config.backupConfigured) {
    lastKnownStatus = "unconfigured";
    return await recordHeartbeatDiagnostic({
      checkedAt: startedAt,
      status: "unconfigured",
      activeRelay: "none",
      primaryHealthy: false,
      backupConfigured: false,
      primaryError: "Neither primary SYSTEM_SMTP nor backup SendGrid are configured",
      durationMs: 0,
      transitionAlertSent: false,
      slackAlertSent: false,
      emailFallbackAttempted: false,
      emailFallbackDelivered: false,
      alertType: null,
    }, source);
  }

  if (!config.primaryConfigured && config.backupConfigured) {
    lastKnownStatus = "failover";
    return await recordHeartbeatDiagnostic({
      checkedAt: startedAt,
      status: "failover",
      activeRelay: "sendgrid",
      primaryHealthy: false,
      backupConfigured: true,
      primaryError: "SYSTEM_SMTP_* not configured; running on backup SendGrid relay",
      durationMs: 0,
      transitionAlertSent: false,
      slackAlertSent: false,
      emailFallbackAttempted: false,
      emailFallbackDelivered: false,
      alertType: null,
    }, source);
  }

  const probe = await probePrimarySmtp();
  let status: RelayHealthState = "healthy";
  let activeRelay: RelayProvider = "system_smtp";
  let alertType: "failure" | "recovery" | null = null;
  let transitionAlertSent = false;
  let slackAlertSent = false;
  let emailFallbackAttempted = false;
  let emailFallbackDelivered = false;
  let alertSuppressed = false;
  const safeDiagnostic = probe.ok
    ? "Primary SYSTEM_SMTP transport verification succeeded."
    : boundedCause(probe.error ?? "Primary SMTP connection verification failed");

  if (probe.ok) {
    const outage = await resolveActiveRelayOutage(startedAt);
    if (activeFailoverIncident) {
      activeFailoverIncident = false;
      alertType = "recovery";
      recordRelayEvent({ fromProvider: lastKnownStatus === "failover" ? "sendgrid" : "none", toProvider: "system_smtp", reason: safeDiagnostic, source });
      try {
        transitionAlertSent = await notifyOwner({
          title: "Get Phame: Operational email primary relay recovered",
          content: [
            "Primary SYSTEM_SMTP relay connection has been verified healthy.",
            `Host: ${config.primaryHost}`,
            `Verified at: ${new Date(startedAt).toISOString()}`,
            outage ? `Failover duration: ${outage.durationMinutes} minute(s)` : "No durable outage duration was recorded.",
            "Review: /admin",
          ].join("\n"),
        });
      } catch (error) {
        console.warn("[RelayHealth] Recovery owner notification failed:", error instanceof Error ? error.name : "UnknownError");
      }
      slackAlertSent = await sendSlackWebhookNotification({
        title: "✅ Get Phame: Operational Email Primary Relay Recovered",
        color: "#10b981",
        fields: [
          { title: "Status", value: "Primary SYSTEM_SMTP Restored" },
          { title: "Host", value: config.primaryHost || "Configured SMTP" },
          { title: "Outage Duration", value: outage ? `${outage.durationMinutes} minute(s)` : "Not observed" },
        ],
      });
      if (!slackAlertSent) {
        ({ emailFallbackAttempted, emailFallbackDelivered } = await sendFallbackAfterSlackFailure({
          event: "recovery",
          activeRelay: "system_smtp",
          checkedAt: startedAt,
          source,
          diagnostic: safeDiagnostic,
          durationMinutes: outage?.durationMinutes,
        }));
      }
    }
  } else {
    if (config.backupConfigured) {
      status = "failover";
      activeRelay = "sendgrid";
    } else {
      status = "degraded";
      activeRelay = "none";
    }

    if (!activeFailoverIncident) {
      activeFailoverIncident = true;
      alertType = "failure";
      recordRelayEvent({ fromProvider: "system_smtp", toProvider: activeRelay, reason: safeDiagnostic, source });
      const outage = await startRelayOutage(safeDiagnostic, source, startedAt);
      const alertReservation = await reserveRelayAlert(outage.id, startedAt);
      if (!alertReservation.permitted) {
        alertSuppressed = true;
      } else {
        try {
          transitionAlertSent = await notifyOwner({
            title: config.backupConfigured ? "Get Phame: Operational email failed over to SendGrid backup" : "Get Phame: Operational email primary relay failed (No backup)",
            content: [
              "Primary SYSTEM_SMTP relay connection failed verification.",
              `Host: ${config.primaryHost}`,
              `Error: ${safeDiagnostic}`,
              `Status: ${config.backupConfigured ? "Shifted traffic to SendGrid backup failover" : "Outbound operational emails may fail"}`,
              `Detected at: ${new Date(startedAt).toISOString()}`,
              "Review: /admin",
            ].join("\n"),
          });
        } catch (error) {
          console.warn("[RelayHealth] Failover owner notification failed:", error instanceof Error ? error.name : "UnknownError");
        }
        slackAlertSent = await sendSlackWebhookNotification({
          title: config.backupConfigured ? "⚠️ Get Phame: Operational Email Failed Over to SendGrid" : "🚨 Get Phame: Operational Email Primary Relay Failed (No Backup)",
          color: config.backupConfigured ? "#f59e0b" : "#e11d48",
          fields: [
            { title: "Event", value: "Primary Relay Outage" },
            { title: "Active Relay", value: config.backupConfigured ? "SendGrid API (Backup)" : "None" },
            { title: "Reason", value: safeDiagnostic },
            { title: "Detected At", value: new Date(startedAt).toUTCString() },
          ],
        });
        if (!slackAlertSent) {
          ({ emailFallbackAttempted, emailFallbackDelivered } = await sendFallbackAfterSlackFailure({
            event: "failure",
            activeRelay,
            checkedAt: startedAt,
            source,
            diagnostic: safeDiagnostic,
          }));
        }
      }
    }
  }

  lastKnownStatus = status;
  return await recordHeartbeatDiagnostic({
    checkedAt: startedAt,
    status,
    activeRelay,
    primaryHealthy: probe.ok,
    backupConfigured: config.backupConfigured,
    primaryError: probe.ok ? null : safeDiagnostic,
    durationMs: probe.durationMs,
    transitionAlertSent,
    slackAlertSent,
    emailFallbackAttempted,
    emailFallbackDelivered,
    alertSuppressed,
    alertType,
  }, source);
}

/** Admin-only controlled webhook test. It never alters failover state or sends customer mail. */
export async function sendRelaySlackTestAlert() {
  const checkedAt = Date.now();
  const config = getRelayConfigStatus();
  const slackDelivered = await sendSlackWebhookNotification({
    title: "🔔 Get Phame: Operational Email Relay Slack Test",
    color: "#10b981",
    fields: [
      { title: "Result", value: "Manual webhook delivery test requested by an administrator" },
      { title: "Primary Relay", value: config.primaryConfigured ? "SYSTEM_SMTP configured" : "SYSTEM_SMTP unconfigured" },
      { title: "Backup Relay", value: config.backupConfigured ? "SendGrid backup configured" : "SendGrid backup unavailable" },
      { title: "Tested At", value: new Date(checkedAt).toUTCString() },
    ],
  });

  const emailFallback = slackDelivered
    ? { emailFallbackAttempted: false, emailFallbackDelivered: false }
    : await sendRelayAlertEmailFallback({
      event: "slack_test",
      activeRelay: lastKnownStatus === "failover" ? "sendgrid" : config.primaryConfigured ? "system_smtp" : "none",
      checkedAt,
      source: "admin_manual",
      diagnostic: "Manual Slack webhook test did not confirm delivery.",
    })
      .then(result => ({ emailFallbackAttempted: result.attempted, emailFallbackDelivered: result.delivered }))
      .catch(() => ({ emailFallbackAttempted: false, emailFallbackDelivered: false }));

  return {
    checkedAt,
    slackConfigured: config.slackWebhookConfigured,
    slackDelivered,
    ...emailFallback,
  };
}

export async function getCurrentRelaySummary() {
  const config = getRelayConfigStatus();
  const cooldownMs = getRelayAlertCooldownMs();
  const cooldownUntil = lastFailoverAlertAt === null ? null : lastFailoverAlertAt + cooldownMs;
  return {
    lastCheckedAt,
    lastKnownStatus,
    activeFailoverIncident,
    lastFailoverAlertAt,
    primaryConfigured: config.primaryConfigured,
    primaryHost: config.primaryHost,
    backupConfigured: config.backupConfigured,
    slackWebhookConfigured: config.slackWebhookConfigured,
    alertCooldownMinutes: getRelayAlertCooldownMinutes(),
    alertCooldownUntil: cooldownUntil !== null && cooldownUntil > Date.now() ? cooldownUntil : null,
    recentEvents: getRecentFailoverEvents(5),
    recentDiagnostics: await getRecentHeartbeatDiagnostics(10),
    outageHistory: await getOutageHistory(10),
  };
}
