import { and, eq, lt, sql } from "drizzle-orm";
import { apiAbuseLimitWindows } from "../drizzle/schema";
import {
  fingerprintAuthValue,
  normalizeDiagnosticEmail,
} from "./authOperations";
import {
  suspendDeveloperApiKey,
  type DeveloperApiPrincipal,
} from "./developerApiKeys";
import { getDb } from "./db";

export type DeveloperApiAbuseAction = "contact_import" | "review_request_send";

export const DEVELOPER_API_ABUSE_SUSPENSION_MS = 24 * 60 * 60 * 1000;

type AbuseDimension =
  | "key_burst"
  | "account_burst"
  | "account_daily"
  | "ip_burst"
  | "recipient_daily";

type AbuseRule = {
  dimension: AbuseDimension;
  value: string;
  limit: number;
  windowMs: number;
  suspendOnBreach: boolean;
  reason: string;
};

export type DeveloperApiAbuseDecision = {
  allowed: boolean;
  reason: string | null;
  retryAfterSeconds: number;
  suspended: boolean;
};

function hashDimension(dimension: AbuseDimension, value: string) {
  return fingerprintAuthValue(`developer-api-abuse:${dimension}:${value}`);
}

async function incrementAbuseWindow(params: {
  principal: DeveloperApiPrincipal;
  action: DeveloperApiAbuseAction;
  rule: AbuseRule;
  now: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const dimensionHash = hashDimension(params.rule.dimension, params.rule.value);
  const windowStartedAt =
    Math.floor(params.now / params.rule.windowMs) * params.rule.windowMs;
  const expiresAt = windowStartedAt + params.rule.windowMs;
  await db
    .delete(apiAbuseLimitWindows)
    .where(
      and(
        eq(apiAbuseLimitWindows.action, params.action),
        eq(apiAbuseLimitWindows.dimensionHash, dimensionHash),
        lt(apiAbuseLimitWindows.expiresAt, params.now + 1)
      )
    );

  const [existing] = await db
    .select()
    .from(apiAbuseLimitWindows)
    .where(
      and(
        eq(apiAbuseLimitWindows.action, params.action),
        eq(apiAbuseLimitWindows.dimensionHash, dimensionHash),
        eq(apiAbuseLimitWindows.windowStartedAt, windowStartedAt)
      )
    )
    .limit(1);

  if (!existing) {
    try {
      await db.insert(apiAbuseLimitWindows).values({
        userId: params.principal.userId,
        apiKeyId: params.principal.apiKeyId,
        action: params.action,
        dimension: params.rule.dimension,
        dimensionHash,
        windowStartedAt,
        requestCount: 1,
        expiresAt,
      });
      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      return incrementAbuseWindow(params);
    }
  }

  await db
    .update(apiAbuseLimitWindows)
    .set({ requestCount: sql`${apiAbuseLimitWindows.requestCount} + 1` })
    .where(eq(apiAbuseLimitWindows.id, existing.id));
  const [updated] = await db
    .select({ requestCount: apiAbuseLimitWindows.requestCount })
    .from(apiAbuseLimitWindows)
    .where(eq(apiAbuseLimitWindows.id, existing.id))
    .limit(1);
  const requestCount = updated?.requestCount ?? existing.requestCount + 1;
  const allowed = requestCount <= params.rule.limit;
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((expiresAt - params.now) / 1000)),
  };
}

export function buildDeveloperApiAbuseRules(params: {
  principal: DeveloperApiPrincipal;
  action: DeveloperApiAbuseAction;
  clientIp: string;
  recipientEmail?: string | null;
}): AbuseRule[] {
  const account = String(params.principal.userId);
  const key = String(params.principal.apiKeyId);
  const ip = params.clientIp || "unknown";
  const recipient = params.recipientEmail
    ? normalizeDiagnosticEmail(params.recipientEmail)
    : null;

  if (params.action === "review_request_send") {
    return [
      {
        dimension: "key_burst",
        value: key,
        limit: 10,
        windowMs: 60_000,
        suspendOnBreach: true,
        reason: "send_key_burst",
      },
      {
        dimension: "account_burst",
        value: account,
        limit: 20,
        windowMs: 10 * 60_000,
        suspendOnBreach: true,
        reason: "send_account_burst",
      },
      {
        dimension: "account_daily",
        value: account,
        limit: 100,
        windowMs: 24 * 60 * 60_000,
        suspendOnBreach: true,
        reason: "send_account_daily",
      },
      {
        dimension: "ip_burst",
        value: ip,
        limit: 30,
        windowMs: 60 * 60_000,
        suspendOnBreach: true,
        reason: "send_ip_burst",
      },
      ...(recipient
        ? [
            {
              dimension: "recipient_daily" as const,
              value: `${account}:${recipient}`,
              limit: 2,
              windowMs: 24 * 60 * 60_000,
              suspendOnBreach: false,
              reason: "send_recipient_daily",
            },
          ]
        : []),
    ];
  }

  return [
    {
      dimension: "account_burst",
      value: account,
      limit: 300,
      windowMs: 60 * 60_000,
      suspendOnBreach: true,
      reason: "import_account_burst",
    },
    {
      dimension: "ip_burst",
      value: ip,
      limit: 120,
      windowMs: 10 * 60_000,
      suspendOnBreach: true,
      reason: "import_ip_burst",
    },
    ...(recipient
      ? [
          {
            dimension: "recipient_daily" as const,
            value: `${account}:${recipient}`,
            limit: 8,
            windowMs: 24 * 60 * 60_000,
            suspendOnBreach: false,
            reason: "import_recipient_daily",
          },
        ]
      : []),
  ];
}

export async function checkDeveloperApiAbuse(params: {
  principal: DeveloperApiPrincipal;
  action: DeveloperApiAbuseAction;
  clientIp: string;
  recipientEmail?: string | null;
  now?: number;
}): Promise<DeveloperApiAbuseDecision> {
  const now = params.now ?? Date.now();
  const rules = buildDeveloperApiAbuseRules(params);

  for (const rule of rules) {
    const result = await incrementAbuseWindow({
      principal: params.principal,
      action: params.action,
      rule,
      now,
    });
    if (result.allowed) continue;

    if (rule.suspendOnBreach) {
      await suspendDeveloperApiKey({
        principal: params.principal,
        reason: rule.reason,
        durationMs: DEVELOPER_API_ABUSE_SUSPENSION_MS,
        now,
      });
    }
    return {
      allowed: false,
      reason: rule.reason,
      retryAfterSeconds: rule.suspendOnBreach
        ? Math.max(
            result.retryAfterSeconds,
            Math.ceil(DEVELOPER_API_ABUSE_SUSPENSION_MS / 1000)
          )
        : result.retryAfterSeconds,
      suspended: rule.suspendOnBreach,
    };
  }

  return {
    allowed: true,
    reason: null,
    retryAfterSeconds: 0,
    suspended: false,
  };
}
