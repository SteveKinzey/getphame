import { createHmac, randomUUID } from "crypto";
import { magicLinks, users, type InsertAuthDiagnosticEvent, type InsertAuthHealthCheck } from "../drizzle/schema";
import {
  createAuthDiagnosticEvent,
  createAuthHealthCheck,
  getDb,
  getLatestAuthDiagnosticByTokenFingerprint,
  pruneAuthOperationsData,
} from "./db";
import { testSmtpConnection } from "./smtp";

const SAFE_DETAIL_LIMIT = 500;
const EMAIL_PROVIDER_TIMEOUT_MS = 10_000;

export type AuthHealthTrigger = "scheduled" | "manual";

export interface AuthHealthRunOptions {
  triggerSource: AuthHealthTrigger;
  scheduleCronTaskUid?: string | null;
  now?: number;
}

export function normalizeDiagnosticEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskDiagnosticEmail(email: string): string {
  const normalized = normalizeDiagnosticEmail(email);
  const [local = "", domain = ""] = normalized.split("@");
  if (!domain) return "invalid";
  const localMask = local.length <= 2
    ? `${local.slice(0, 1)}*`
    : `${local.slice(0, 2)}${"*".repeat(Math.min(local.length - 2, 6))}`;
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() ?? "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
  const domainMask = domainName.length <= 2
    ? `${domainName.slice(0, 1)}*`
    : `${domainName.slice(0, 2)}***`;
  return `${localMask}@${domainMask}${suffix}`;
}

export function fingerprintAuthValue(value: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("AUTH_FINGERPRINT_SECRET_MISSING");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function redactAuthDiagnosticDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "Unknown authentication error");
  return raw
    .replace(/[A-Fa-f0-9]{48,}/g, "[redacted-token]")
    .replace(/[?&](token|code|key|secret|password|pass)=([^&\s]+)/gi, "$1=[redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(bearer\s+)[A-Za-z0-9._~+\/-]+/gi, "$1[redacted]")
    .slice(0, SAFE_DETAIL_LIMIT);
}

export function classifyAuthDiagnosticError(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (message.includes("timeout") || message.includes("timed out")) return "provider_timeout";
  if (message.includes("auth") || message.includes("credential") || message.includes("535")) return "provider_auth_failed";
  if (message.includes("database") || message.includes("table") || message.includes("column")) return "database_error";
  if (message.includes("expired")) return "token_expired";
  if (message.includes("used")) return "token_used";
  return "operation_failed";
}

export async function recordAuthLifecycleEvent(input: {
  requestId?: string;
  eventType: InsertAuthDiagnosticEvent["eventType"];
  outcome: "ok" | "fail";
  email?: string | null;
  token?: string | null;
  providerMessageId?: string | null;
  detailCode?: string | null;
  detail?: unknown;
  durationMs?: number | null;
  occurredAt?: number;
}) {
  try {
    const email = input.email ? normalizeDiagnosticEmail(input.email) : null;
    const event: InsertAuthDiagnosticEvent = {
      requestId: input.requestId ?? randomUUID(),
      eventType: input.eventType,
      outcome: input.outcome,
      emailFingerprint: email ? fingerprintAuthValue(`email:${email}`) : null,
      emailMasked: email ? maskDiagnosticEmail(email) : null,
      tokenFingerprint: input.token ? fingerprintAuthValue(`token:${input.token}`) : null,
      providerMessageId: input.providerMessageId?.slice(0, 128) ?? null,
      detailCode: input.detailCode?.slice(0, 64) ?? null,
      detailMessage: input.detail == null ? null : redactAuthDiagnosticDetail(input.detail),
      durationMs: input.durationMs ?? null,
      occurredAt: input.occurredAt ?? Date.now(),
    };
    await createAuthDiagnosticEvent(event);
    return event;
  } catch (error) {
    console.warn("[AuthDiagnostics] Event persistence failed:", redactAuthDiagnosticDetail(error));
    return null;
  }
}

export async function findAuthRequestByToken(token: string) {
  try {
    return await getLatestAuthDiagnosticByTokenFingerprint(fingerprintAuthValue(`token:${token}`));
  } catch (error) {
    console.warn("[AuthDiagnostics] Correlation lookup failed:", redactAuthDiagnosticDetail(error));
    return null;
  }
}

function providerNameFromHost(host?: string) {
  if (!host) return null;
  if (host.toLowerCase().includes("resend")) return "Resend SMTP";
  return host.toLowerCase().slice(0, 64);
}

function smtpConfig() {
  const host = process.env.SYSTEM_SMTP_HOST;
  const port = Number.parseInt(process.env.SYSTEM_SMTP_PORT ?? "587", 10);
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  const fromEmail = process.env.SYSTEM_FROM_EMAIL;
  if (!host || !user || !pass || !fromEmail || !Number.isFinite(port)) return null;
  return { host, port, secure: port === 465, user, pass };
}

async function verifyEmailProvider(config: NonNullable<ReturnType<typeof smtpConfig>>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      testSmtpConnection(config),
      new Promise<{ ok: false; error: string }>((resolve) => {
        timeout = setTimeout(
          () => resolve({ ok: false, error: "Email provider verification timed out" }),
          EMAIL_PROVIDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runAuthHealthCheck(options: AuthHealthRunOptions) {
  const startedAt = Date.now();
  const checkedAt = options.now ?? startedAt;
  const failures: Array<{ code: string; detail: string }> = [];
  const config = smtpConfig();

  const requiredConfig = [
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["JWT_SECRET", process.env.JWT_SECRET],
    ["APP_BASE_URL", process.env.APP_BASE_URL],
    ["SYSTEM_SMTP_HOST", process.env.SYSTEM_SMTP_HOST],
    ["SYSTEM_SMTP_USER", process.env.SYSTEM_SMTP_USER],
    ["SYSTEM_SMTP_PASS", process.env.SYSTEM_SMTP_PASS],
    ["SYSTEM_FROM_EMAIL", process.env.SYSTEM_FROM_EMAIL],
  ] as const;
  const missingConfig = requiredConfig.filter(([, value]) => !value).map(([name]) => name);
  const configStatus: "ok" | "fail" = missingConfig.length === 0 ? "ok" : "fail";
  if (configStatus === "fail") {
    failures.push({
      code: "configuration_invalid",
      detail: `Missing required configuration: ${missingConfig.join(", ")}`,
    });
  }

  let databaseStatus: "ok" | "fail" = "fail";
  let userSchemaStatus: "ok" | "fail" = "fail";
  let magicLinkSchemaStatus: "ok" | "fail" = "fail";
  const database = await getDb();
  if (!database) {
    failures.push({ code: "database_unavailable", detail: "Database connection is unavailable" });
  } else {
    databaseStatus = "ok";
    try {
      await database
        .select({
          id: users.id,
          openId: users.openId,
          email: users.email,
          role: users.role,
          loginMethod: users.loginMethod,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .limit(1);
      userSchemaStatus = "ok";
    } catch (error) {
      failures.push({ code: "user_schema_invalid", detail: redactAuthDiagnosticDetail(error) });
    }
    try {
      await database
        .select({
          id: magicLinks.id,
          email: magicLinks.email,
          token: magicLinks.token,
          expiresAt: magicLinks.expiresAt,
          usedAt: magicLinks.usedAt,
        })
        .from(magicLinks)
        .limit(1);
      magicLinkSchemaStatus = "ok";
    } catch (error) {
      failures.push({ code: "magic_link_schema_invalid", detail: redactAuthDiagnosticDetail(error) });
    }
  }

  let sessionStatus: "ok" | "fail" = "fail";
  try {
    sessionStatus = fingerprintAuthValue("getphame-auth-health-session-signing").length === 64 ? "ok" : "fail";
  } catch {
    sessionStatus = "fail";
  }
  if (sessionStatus === "fail" && !failures.some((failure) => failure.code === "configuration_invalid")) {
    failures.push({ code: "session_signing_invalid", detail: "Session signing configuration is unavailable" });
  }

  let emailProviderStatus: "ok" | "fail" = "fail";
  if (config) {
    const provider = await verifyEmailProvider(config);
    emailProviderStatus = provider.ok ? "ok" : "fail";
    if (!provider.ok) {
      failures.push({
        code: classifyAuthDiagnosticError(provider.error),
        detail: redactAuthDiagnosticDetail(provider.error),
      });
    }
  } else if (!failures.some((failure) => failure.code === "configuration_invalid")) {
    failures.push({
      code: "email_provider_config_invalid",
      detail: "System email provider configuration is incomplete",
    });
  }

  const overallStatus: "ok" | "fail" = [
    configStatus,
    databaseStatus,
    userSchemaStatus,
    magicLinkSchemaStatus,
    sessionStatus,
    emailProviderStatus,
  ].every((status) => status === "ok") ? "ok" : "fail";

  const result: InsertAuthHealthCheck = {
    triggerSource: options.triggerSource,
    scheduleCronTaskUid: options.scheduleCronTaskUid ?? null,
    overallStatus,
    configStatus,
    databaseStatus,
    userSchemaStatus,
    magicLinkSchemaStatus,
    sessionStatus,
    emailProviderStatus,
    providerName: providerNameFromHost(config?.host),
    failureCode: failures[0]?.code ?? null,
    failureDetail: failures.map((failure) => `${failure.code}: ${failure.detail}`).join(" | ").slice(0, SAFE_DETAIL_LIMIT) || null,
    durationMs: Math.max(Date.now() - startedAt, 0),
    checkedAt,
  };

  try {
    await createAuthHealthCheck(result);
    await pruneAuthOperationsData(checkedAt);
  } catch (error) {
    console.warn("[AuthHealth] Result persistence failed:", redactAuthDiagnosticDetail(error));
  }

  return result;
}
