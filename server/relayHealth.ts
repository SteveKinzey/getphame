import { desc, eq, isNull } from "drizzle-orm";
import nodemailer from "nodemailer";
import { emailRelayOutages } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export type RelayProvider = "system_smtp" | "sendgrid" | "none";
export type RelayHealthState = "healthy" | "failover" | "degraded" | "unconfigured";

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
}

const MAX_FAILOVER_HISTORY = 50;
const MAX_OUTAGE_HISTORY = 20;
const failoverHistory: FailoverEvent[] = [];
const fallbackOutageHistory: OutageRecord[] = [];

let activeFailoverIncident = false;
let lastFailoverAlertAt: number | null = null;
let lastCheckedAt: number | null = null;
let lastKnownStatus: RelayHealthState = "healthy";

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
  };
}

export function resetRelayHealthState() {
  activeFailoverIncident = false;
  lastFailoverAlertAt = null;
  lastCheckedAt = null;
  lastKnownStatus = "healthy";
  failoverHistory.length = 0;
  fallbackOutageHistory.length = 0;
}

/** Dispatch a bounded Slack Incoming Webhook payload; no webhook is logged. */
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
          title: payload.title,
          fields: payload.fields.map(field => ({
            title: field.title.slice(0, 80),
            value: field.value.slice(0, 300),
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
  alertType?: "failure" | "recovery" | null;
}

export async function runRelayHeartbeatCheck(): Promise<RelayHeartbeatResult> {
  const startedAt = Date.now();
  const config = getRelayConfigStatus();
  lastCheckedAt = startedAt;

  if (!config.primaryConfigured && !config.backupConfigured) {
    lastKnownStatus = "unconfigured";
    return { checkedAt: startedAt, status: "unconfigured", activeRelay: "none", primaryHealthy: false, backupConfigured: false, primaryError: "Neither primary SYSTEM_SMTP nor backup SendGrid are configured", durationMs: 0, transitionAlertSent: false, slackAlertSent: false, alertType: null };
  }

  if (!config.primaryConfigured && config.backupConfigured) {
    lastKnownStatus = "failover";
    return { checkedAt: startedAt, status: "failover", activeRelay: "sendgrid", primaryHealthy: false, backupConfigured: true, primaryError: "SYSTEM_SMTP_* not configured; running on backup SendGrid relay", durationMs: 0, transitionAlertSent: false, slackAlertSent: false, alertType: null };
  }

  const probe = await probePrimarySmtp();
  let status: RelayHealthState = "healthy";
  let activeRelay: RelayProvider = "system_smtp";
  let alertType: "failure" | "recovery" | null = null;
  let transitionAlertSent = false;
  let slackAlertSent = false;

  if (probe.ok) {
    if (activeFailoverIncident) {
      activeFailoverIncident = false;
      alertType = "recovery";
      recordRelayEvent({ fromProvider: lastKnownStatus === "failover" ? "sendgrid" : "none", toProvider: "system_smtp", reason: "Primary SYSTEM_SMTP transport verified healthy. Traffic restored to primary relay.", source: "heartbeat_check" });
      const outage = await resolveActiveRelayOutage(startedAt);
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
    }
  } else {
    const failReason = boundedCause(probe.error ?? "Primary SMTP connection verification failed");
    if (config.backupConfigured) {
      status = "failover";
      activeRelay = "sendgrid";
    } else {
      status = "degraded";
      activeRelay = "none";
    }

    if (!activeFailoverIncident) {
      activeFailoverIncident = true;
      lastFailoverAlertAt = startedAt;
      alertType = "failure";
      recordRelayEvent({ fromProvider: "system_smtp", toProvider: activeRelay, reason: failReason, source: "heartbeat_check" });
      await startRelayOutage(failReason, "heartbeat_check", startedAt);
      try {
        transitionAlertSent = await notifyOwner({
          title: config.backupConfigured ? "Get Phame: Operational email failed over to SendGrid backup" : "Get Phame: Operational email primary relay failed (No backup)",
          content: [
            "Primary SYSTEM_SMTP relay connection failed verification.",
            `Host: ${config.primaryHost}`,
            `Error: ${failReason}`,
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
          { title: "Reason", value: failReason },
          { title: "Detected At", value: new Date(startedAt).toUTCString() },
        ],
      });
    }
  }

  lastKnownStatus = status;
  return { checkedAt: startedAt, status, activeRelay, primaryHealthy: probe.ok, backupConfigured: config.backupConfigured, primaryError: probe.ok ? null : probe.error, durationMs: probe.durationMs, transitionAlertSent, slackAlertSent, alertType };
}

export async function getCurrentRelaySummary() {
  const config = getRelayConfigStatus();
  return {
    lastCheckedAt,
    lastKnownStatus,
    activeFailoverIncident,
    lastFailoverAlertAt,
    primaryConfigured: config.primaryConfigured,
    primaryHost: config.primaryHost,
    backupConfigured: config.backupConfigured,
    slackWebhookConfigured: config.slackWebhookConfigured,
    recentEvents: getRecentFailoverEvents(5),
    outageHistory: await getOutageHistory(10),
  };
}
