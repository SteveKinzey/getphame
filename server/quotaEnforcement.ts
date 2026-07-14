import { eq } from "drizzle-orm";
import type { FreeQuotaSummary } from "../shared/quota";
import { users } from "../drizzle/schema";
import { getDb, getFreeQuotaSummary } from "./db";

export type FreeQuotaDataSource = {
  getUserRole(userId: number): Promise<string | null>;
  getQuota(userId: number): Promise<FreeQuotaSummary>;
};

export type FreeQuotaAccessDecision = {
  allowed: boolean;
  bypassed: boolean;
  quota: FreeQuotaSummary | null;
};

const productionQuotaDataSource: FreeQuotaDataSource = {
  async getUserRole(userId) {
    const db = await getDb();
    if (!db) return null;
    const [account] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return account?.role ?? null;
  },
  getQuota: getFreeQuotaSummary,
};

/**
 * Evaluate the single Free-plan allowance contract used by every send channel.
 * Paid accounts and administrators bypass the allowance; all other Free users
 * receive 10 initial sends followed by 5 sends per rolling 30-day window.
 */
export async function evaluateFreeQuotaAccess(
  userId: number,
  tier: string,
  dataSource: FreeQuotaDataSource = productionQuotaDataSource,
): Promise<FreeQuotaAccessDecision> {
  if (tier !== "free") {
    return { allowed: true, bypassed: true, quota: null };
  }

  if ((await dataSource.getUserRole(userId)) === "admin") {
    return { allowed: true, bypassed: true, quota: null };
  }

  const quota = await dataSource.getQuota(userId);
  return { allowed: !quota.blocked, bypassed: false, quota };
}

export function formatFreeQuotaBlockedMessage(
  quota: FreeQuotaSummary | null,
  baseMessage: string,
): string {
  const resetMessage = quota?.nextAvailableAt
    ? ` Next send available ${new Date(quota.nextAvailableAt).toISOString()}.`
    : "";
  return `${baseMessage}${resetMessage}`;
}
