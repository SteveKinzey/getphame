import {
  FREE_INITIAL_REQUESTS,
  FREE_ROLLING_REQUESTS,
  FREE_ROLLING_WINDOW_DAYS,
} from "./const";

export type FreeQuotaPhase = "initial" | "rolling";

export type FreeQuotaSummary = {
  phase: FreeQuotaPhase;
  limit: number;
  used: number;
  remaining: number;
  totalSent: number;
  blocked: boolean;
  nextAvailableAt: number | null;
};

export function buildFreeQuotaSummary(input: {
  totalSent: number;
  rollingUsed: number;
  oldestRollingSentAt?: Date | null;
}): FreeQuotaSummary {
  const phase: FreeQuotaPhase = input.totalSent < FREE_INITIAL_REQUESTS ? "initial" : "rolling";
  const limit = phase === "initial" ? FREE_INITIAL_REQUESTS : FREE_ROLLING_REQUESTS;
  const used = phase === "initial" ? input.totalSent : Math.min(input.rollingUsed, limit);
  const remaining = Math.max(limit - used, 0);
  const blocked = remaining === 0;
  const windowMs = FREE_ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const nextAvailableAt = phase === "rolling" && blocked && input.oldestRollingSentAt
    ? input.oldestRollingSentAt.getTime() + windowMs
    : null;

  return {
    phase,
    limit,
    used,
    remaining,
    totalSent: input.totalSent,
    blocked,
    nextAvailableAt,
  };
}
