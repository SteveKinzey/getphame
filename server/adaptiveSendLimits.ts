import { and, eq, gt, inArray, lt, lte, sql } from "drizzle-orm";

import { outboundSendLimitWindows } from "../drizzle/schema";
import {
  ACCOUNT_HARD_DAILY_SEND_CEILING,
  ACCOUNT_HARD_HOURLY_SEND_CEILING,
  buildAdaptiveSendPolicy,
  getAdaptiveSendRecommendedAction,
  getAdaptiveSendWarningLevel,
  type AdaptiveSendWarningLevel,
} from "../shared/adaptiveSendLimits";
import { getDb } from "./db";
import { resolveOutboundDeliveryChannel } from "./outboundDeliveryChannel";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const ACCOUNT_SCOPE_KEY = "account";

type WindowType = "hour" | "day";

type WindowSpec = {
  scopeKey: string;
  windowType: WindowType;
  windowStartedAt: number;
  expiresAt: number;
  limit: number;
};

export type AdaptiveSendStatus = {
  configured: boolean;
  providerId: string | null;
  providerLabel: string | null;
  channelType: "personal" | "bulk" | null;
  rampStage: "new" | "warming" | "building" | "established" | null;
  connectionAgeDays: number;
  todayCount: number;
  hourCount: number;
  providerTodayCount: number;
  providerHourCount: number;
  dailyLimit: number;
  hourlyLimit: number;
  hardDailyCeiling: number;
  hardHourlyCeiling: number;
  dailyRemaining: number;
  hourlyRemaining: number;
  remaining: number;
  utilization: number;
  warningLevel: AdaptiveSendWarningLevel;
  dailyResetAt: number;
  hourlyResetAt: number;
  recommendedAction: "upgrade_plan" | "connect_bulk_sender" | null;
};

class ReservationBlockedError extends Error {}

export class AdaptiveSendLimitError extends Error {
  readonly code = "ADAPTIVE_SEND_LIMIT_REACHED";
  readonly retryAfterSeconds: number;
  readonly status: AdaptiveSendStatus;

  constructor(status: AdaptiveSendStatus, now = Date.now()) {
    const retryAt =
      status.hourlyRemaining <= 0 ? status.hourlyResetAt : status.dailyResetAt;
    const retryAfterSeconds = Math.max(1, Math.ceil((retryAt - now) / 1_000));
    super(
      `Adaptive sending limit reached for ${status.providerLabel ?? "this sender"}. ` +
        `Sending resumes automatically after the current safety window resets.`
    );
    this.name = "AdaptiveSendLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
    this.status = status;
  }
}

function startOfUtcDay(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function safeRatio(value: number, limit: number): number {
  if (limit <= 0) return 1;
  return value / limit;
}

function getWindowCount(
  rows: Array<{
    scopeKey: string;
    windowType: string;
    windowStartedAt: number;
    sendCount: number;
  }>,
  scopeKey: string,
  windowType: WindowType,
  windowStartedAt: number
): number {
  return (
    rows.find(
      row =>
        row.scopeKey === scopeKey &&
        row.windowType === windowType &&
        row.windowStartedAt === windowStartedAt
    )?.sendCount ?? 0
  );
}

export async function getAdaptiveSendStatus(
  userId: number,
  now = Date.now()
): Promise<AdaptiveSendStatus> {
  const channel = await resolveOutboundDeliveryChannel(userId);
  const dayStartedAt = startOfUtcDay(now);
  const hourStartedAt = Math.floor(now / HOUR_MS) * HOUR_MS;
  const baseStatus = {
    todayCount: 0,
    hourCount: 0,
    providerTodayCount: 0,
    providerHourCount: 0,
    hardDailyCeiling: ACCOUNT_HARD_DAILY_SEND_CEILING,
    hardHourlyCeiling: ACCOUNT_HARD_HOURLY_SEND_CEILING,
    dailyResetAt: dayStartedAt + DAY_MS,
    hourlyResetAt: hourStartedAt + HOUR_MS,
  };
  if (!channel) {
    return {
      configured: false,
      providerId: null,
      providerLabel: null,
      channelType: null,
      rampStage: null,
      connectionAgeDays: 0,
      ...baseStatus,
      dailyLimit: 0,
      hourlyLimit: 0,
      dailyRemaining: 0,
      hourlyRemaining: 0,
      remaining: 0,
      utilization: 1,
      warningLevel: "blocked",
      recommendedAction: null,
    };
  }

  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(outboundSendLimitWindows)
    .where(
      and(
        eq(outboundSendLimitWindows.userId, userId),
        lt(outboundSendLimitWindows.expiresAt, now + 1)
      )
    );
  const scopeKeys = [ACCOUNT_SCOPE_KEY, channel.key];
  const rows = await db
    .select({
      scopeKey: outboundSendLimitWindows.scopeKey,
      windowType: outboundSendLimitWindows.windowType,
      windowStartedAt: outboundSendLimitWindows.windowStartedAt,
      sendCount: outboundSendLimitWindows.sendCount,
    })
    .from(outboundSendLimitWindows)
    .where(
      and(
        eq(outboundSendLimitWindows.userId, userId),
        inArray(outboundSendLimitWindows.scopeKey, scopeKeys),
        gt(outboundSendLimitWindows.expiresAt, now)
      )
    );

  const policy = buildAdaptiveSendPolicy(channel, now);
  const todayCount = getWindowCount(
    rows,
    ACCOUNT_SCOPE_KEY,
    "day",
    dayStartedAt
  );
  const hourCount = getWindowCount(
    rows,
    ACCOUNT_SCOPE_KEY,
    "hour",
    hourStartedAt
  );
  const providerTodayCount = getWindowCount(
    rows,
    channel.key,
    "day",
    dayStartedAt
  );
  const providerHourCount = getWindowCount(
    rows,
    channel.key,
    "hour",
    hourStartedAt
  );
  const dailyRemaining = Math.max(
    0,
    Math.min(
      policy.dailyLimit - providerTodayCount,
      policy.hardDailyCeiling - todayCount
    )
  );
  const hourlyRemaining = Math.max(
    0,
    Math.min(
      policy.hourlyLimit - providerHourCount,
      policy.hardHourlyCeiling - hourCount
    )
  );
  const remaining = Math.min(dailyRemaining, hourlyRemaining);
  const utilization = Math.max(
    safeRatio(providerTodayCount, policy.dailyLimit),
    safeRatio(providerHourCount, policy.hourlyLimit),
    safeRatio(todayCount, policy.hardDailyCeiling),
    safeRatio(hourCount, policy.hardHourlyCeiling)
  );

  return {
    configured: true,
    providerId: channel.providerId,
    providerLabel: channel.providerLabel,
    channelType: channel.type,
    rampStage: policy.rampStage,
    connectionAgeDays: policy.connectionAgeDays,
    ...baseStatus,
    todayCount,
    hourCount,
    providerTodayCount,
    providerHourCount,
    dailyLimit: policy.dailyLimit,
    hourlyLimit: policy.hourlyLimit,
    dailyRemaining,
    hourlyRemaining,
    remaining,
    utilization,
    warningLevel: getAdaptiveSendWarningLevel(utilization, remaining),
    recommendedAction: getAdaptiveSendRecommendedAction(channel),
  };
}

function getWindowSpecs(
  status: AdaptiveSendStatus,
  channelKey: string,
  now: number
): WindowSpec[] {
  const dayStartedAt = startOfUtcDay(now);
  const hourStartedAt = Math.floor(now / HOUR_MS) * HOUR_MS;
  return [
    {
      scopeKey: ACCOUNT_SCOPE_KEY,
      windowType: "hour",
      windowStartedAt: hourStartedAt,
      expiresAt: hourStartedAt + HOUR_MS,
      limit: status.hardHourlyCeiling,
    },
    {
      scopeKey: ACCOUNT_SCOPE_KEY,
      windowType: "day",
      windowStartedAt: dayStartedAt,
      expiresAt: dayStartedAt + DAY_MS,
      limit: status.hardDailyCeiling,
    },
    {
      scopeKey: channelKey,
      windowType: "hour",
      windowStartedAt: hourStartedAt,
      expiresAt: hourStartedAt + HOUR_MS,
      limit: status.hourlyLimit,
    },
    {
      scopeKey: channelKey,
      windowType: "day",
      windowStartedAt: dayStartedAt,
      expiresAt: dayStartedAt + DAY_MS,
      limit: status.dailyLimit,
    },
  ];
}

export async function reserveAdaptiveSendCapacity(
  userId: number,
  requested = 1,
  now = Date.now()
): Promise<AdaptiveSendStatus> {
  if (!Number.isInteger(requested) || requested < 1)
    throw new Error("requested must be a positive integer");
  const channel = await resolveOutboundDeliveryChannel(userId);
  if (!channel)
    throw new Error(
      "No email account connected. Please connect your email in Settings."
    );
  const status = await getAdaptiveSendStatus(userId, now);
  if (status.remaining < requested)
    throw new AdaptiveSendLimitError(status, now);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  try {
    await db.transaction(async tx => {
      for (const spec of getWindowSpecs(status, channel.key, now)) {
        await tx
          .insert(outboundSendLimitWindows)
          .values({
            userId,
            scopeKey: spec.scopeKey,
            windowType: spec.windowType,
            windowStartedAt: spec.windowStartedAt,
            sendCount: 0,
            expiresAt: spec.expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .onDuplicateKeyUpdate({
            set: { expiresAt: spec.expiresAt, updatedAt: now },
          });
        const [result] = await tx
          .update(outboundSendLimitWindows)
          .set({
            sendCount: sql`${outboundSendLimitWindows.sendCount} + ${requested}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(outboundSendLimitWindows.userId, userId),
              eq(outboundSendLimitWindows.scopeKey, spec.scopeKey),
              eq(outboundSendLimitWindows.windowType, spec.windowType),
              eq(
                outboundSendLimitWindows.windowStartedAt,
                spec.windowStartedAt
              ),
              lte(outboundSendLimitWindows.sendCount, spec.limit - requested)
            )
          );
        if (Number(result.affectedRows ?? 0) === 0)
          throw new ReservationBlockedError();
      }
    });
  } catch (error) {
    if (error instanceof ReservationBlockedError) {
      throw new AdaptiveSendLimitError(
        await getAdaptiveSendStatus(userId, now),
        now
      );
    }
    throw error;
  }

  return getAdaptiveSendStatus(userId, now);
}
