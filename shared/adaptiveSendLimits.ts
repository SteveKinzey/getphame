export const ADAPTIVE_SEND_WARNING_THRESHOLD = 0.7;
export const ADAPTIVE_SEND_HIGH_WARNING_THRESHOLD = 0.85;
export const ACCOUNT_HARD_DAILY_SEND_CEILING = 2_000;
export const ACCOUNT_HARD_HOURLY_SEND_CEILING = 300;

export type AdaptiveSendChannelType = "personal" | "bulk";
export type AdaptiveSendRampStage =
  | "new"
  | "warming"
  | "building"
  | "established";
export type AdaptiveSendWarningLevel =
  | "normal"
  | "approaching"
  | "high"
  | "blocked";
export type AdaptiveSendRecommendedAction =
  | "upgrade_plan"
  | "connect_bulk_sender"
  | null;

export type AdaptiveSendVelocityAdvice = {
  requestedCount: number;
  currentRemaining: number;
  estimatedSendCount: number;
  estimatedOverCapacityCount: number;
  isEstimate: true;
};

export type AdaptiveSendChannelDescriptor = {
  key: string;
  type: AdaptiveSendChannelType;
  providerId: string;
  providerLabel: string;
  connectedAt: number;
  tier: string;
};

export type AdaptiveSendPolicy = {
  rampStage: AdaptiveSendRampStage;
  connectionAgeDays: number;
  hourlyLimit: number;
  dailyLimit: number;
  hardHourlyCeiling: number;
  hardDailyCeiling: number;
};

type ProviderBaseLimit = { hourly: number; daily: number };

const PERSONAL_PROVIDER_LIMITS: Record<string, ProviderBaseLimit> = {
  gmail: { hourly: 20, daily: 100 },
  google_workspace: { hourly: 30, daily: 150 },
  microsoft: { hourly: 15, daily: 75 },
  yahoo: { hourly: 12, daily: 60 },
  icloud: { hourly: 10, daily: 50 },
  zoho: { hourly: 20, daily: 100 },
  aol: { hourly: 10, daily: 50 },
  proton: { hourly: 8, daily: 40 },
  fastmail: { hourly: 30, daily: 150 },
  custom_smtp: { hourly: 15, daily: 75 },
};

const BULK_PROVIDER_LIMITS: Record<string, ProviderBaseLimit> = {
  sendgrid: { hourly: 200, daily: 1_000 },
  amazon_ses: { hourly: 250, daily: 1_500 },
  mailgun: { hourly: 200, daily: 1_000 },
  mailersend: { hourly: 160, daily: 800 },
  smtp2go: { hourly: 160, daily: 800 },
  brevo: { hourly: 140, daily: 700 },
  postmark: { hourly: 100, daily: 500 },
  sparkpost: { hourly: 200, daily: 1_000 },
  elastic_email: { hourly: 160, daily: 800 },
  zoho_zeptomail: { hourly: 140, daily: 700 },
  socketlabs: { hourly: 160, daily: 800 },
  custom_smtp: { hourly: 100, daily: 500 },
};

function getRampStage(connectionAgeDays: number): AdaptiveSendRampStage {
  if (connectionAgeDays < 3) return "new";
  if (connectionAgeDays < 7) return "warming";
  if (connectionAgeDays < 14) return "building";
  return "established";
}

function getRampMultiplier(
  type: AdaptiveSendChannelType,
  stage: AdaptiveSendRampStage
): number {
  if (type === "bulk") {
    if (stage === "new") return 0.1;
    if (stage === "warming") return 0.25;
    if (stage === "building") return 0.5;
    return 1;
  }
  if (stage === "new") return 0.25;
  if (stage === "warming") return 0.5;
  if (stage === "building") return 0.75;
  return 1;
}

export function buildAdaptiveSendPolicy(
  channel: AdaptiveSendChannelDescriptor,
  now = Date.now()
): AdaptiveSendPolicy {
  const connectionAgeDays = Math.max(
    0,
    Math.floor((now - channel.connectedAt) / 86_400_000)
  );
  const rampStage = getRampStage(connectionAgeDays);
  const base =
    channel.type === "bulk"
      ? (BULK_PROVIDER_LIMITS[channel.providerId] ??
        BULK_PROVIDER_LIMITS.custom_smtp)
      : (PERSONAL_PROVIDER_LIMITS[channel.providerId] ??
        PERSONAL_PROVIDER_LIMITS.custom_smtp);
  const multiplier = getRampMultiplier(channel.type, rampStage);
  const minimumDaily = channel.type === "bulk" ? 50 : 10;
  const minimumHourly = channel.type === "bulk" ? 10 : 5;

  return {
    rampStage,
    connectionAgeDays,
    hourlyLimit: Math.min(
      ACCOUNT_HARD_HOURLY_SEND_CEILING,
      Math.max(minimumHourly, Math.floor(base.hourly * multiplier))
    ),
    dailyLimit: Math.min(
      ACCOUNT_HARD_DAILY_SEND_CEILING,
      Math.max(minimumDaily, Math.floor(base.daily * multiplier))
    ),
    hardHourlyCeiling: ACCOUNT_HARD_HOURLY_SEND_CEILING,
    hardDailyCeiling: ACCOUNT_HARD_DAILY_SEND_CEILING,
  };
}

export function getAdaptiveSendWarningLevel(
  utilization: number,
  remaining: number
): AdaptiveSendWarningLevel {
  if (remaining <= 0 || utilization >= 1) return "blocked";
  if (utilization >= ADAPTIVE_SEND_HIGH_WARNING_THRESHOLD) return "high";
  if (utilization >= ADAPTIVE_SEND_WARNING_THRESHOLD) return "approaching";
  return "normal";
}

export function getAdaptiveSendVelocityAdvice(
  requestedCount: number,
  remaining: number
): AdaptiveSendVelocityAdvice {
  const normalizedRequested = Math.max(0, Math.floor(requestedCount));
  const normalizedRemaining = Math.max(0, Math.floor(remaining));
  const estimatedSendCount = Math.min(normalizedRequested, normalizedRemaining);

  return {
    requestedCount: normalizedRequested,
    currentRemaining: normalizedRemaining,
    estimatedSendCount,
    estimatedOverCapacityCount: normalizedRequested - estimatedSendCount,
    isEstimate: true,
  };
}

export function getAdaptiveSendRecommendedAction(
  channel: AdaptiveSendChannelDescriptor
): AdaptiveSendRecommendedAction {
  if (channel.type === "bulk") return null;
  return channel.tier === "free" ? "upgrade_plan" : "connect_bulk_sender";
}
