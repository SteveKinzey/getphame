/**
 * Access Code DB helpers
 * Used by the accessCodes tRPC router for beta/promo code management.
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  accessCodes,
  accessCodeRedemptions,
  businessProfiles,
} from "../drizzle/schema";
import {
  calculateComplimentaryExpiry,
  COMPLIMENTARY_ACCESS_LIMITS,
} from "./complimentaryAccess";

export const ACCESS_CODE_GRANT_UNITS = ["day", "month", "lifetime"] as const;
export type AccessCodeGrantUnit = (typeof ACCESS_CODE_GRANT_UNITS)[number];

export function resolveAccessCodeGrant(
  input: {
    grantDurationValue: number | null;
    grantDurationUnit: string | null;
  },
  startsAt = Date.now()
): { tier: "pro" | "lifetime"; planExpiresAt: number | null } {
  if (input.grantDurationUnit == null) {
    // Backward compatibility for access codes created before duration metadata existed.
    return { tier: "pro", planExpiresAt: null };
  }
  if (input.grantDurationUnit === "lifetime") {
    return { tier: "lifetime", planExpiresAt: null };
  }
  if (
    input.grantDurationUnit !== "day" &&
    input.grantDurationUnit !== "month"
  ) {
    throw new Error("Unsupported access-code grant duration.");
  }
  if (input.grantDurationValue == null) {
    throw new Error(
      "A duration value is required for non-lifetime access codes."
    );
  }

  return {
    tier: "pro",
    planExpiresAt: calculateComplimentaryExpiry(
      startsAt,
      input.grantDurationValue,
      input.grantDurationUnit
    ),
  };
}

/** Generate a random readable code like BETA-X7K2-P9QM */
export function generateCode(prefix = "BETA"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  const segment = (len: number) =>
    Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  return `${prefix}-${segment(4)}-${segment(4)}`;
}

/** Create a new access code */
export async function createAccessCode(opts: {
  code?: string;
  note?: string;
  maxUses?: number | null;
  expiresAt?: number | null;
  grantDurationValue?: number | null;
  grantDurationUnit?: AccessCodeGrantUnit | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const grantDurationUnit = opts.grantDurationUnit ?? "month";
  const grantDurationValue =
    grantDurationUnit === "lifetime" ? null : (opts.grantDurationValue ?? 1);
  if (grantDurationUnit !== "lifetime") {
    const limit = COMPLIMENTARY_ACCESS_LIMITS[grantDurationUnit];
    if (
      grantDurationValue == null ||
      !Number.isInteger(grantDurationValue) ||
      grantDurationValue < 1 ||
      grantDurationValue > limit
    ) {
      throw new Error(
        `Duration must be between 1 and ${limit} ${grantDurationUnit}(s).`
      );
    }
  }
  const code = opts.code ?? generateCode();
  await db.insert(accessCodes).values({
    code: code.toUpperCase(),
    note: opts.note ?? null,
    maxUses: opts.maxUses ?? null,
    expiresAt: opts.expiresAt ?? null,
    grantDurationValue,
    grantDurationUnit,
  });
  return code.toUpperCase();
}

/** List all access codes with usage stats */
export async function listAccessCodes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(accessCodes).orderBy(desc(accessCodes.createdAt));
}

/** Revoke (deactivate) a code */
export async function revokeAccessCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accessCodes).set({ active: 0 }).where(eq(accessCodes.id, id));
}

/** Re-activate a revoked code */
export async function activateAccessCode(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(accessCodes).set({ active: 1 }).where(eq(accessCodes.id, id));
}

/**
 * Redeem an access code for a user.
 * Validates: code exists, is active, not expired, not over maxUses, user hasn't redeemed before.
 * On success: grants the configured duration, records redemption, and increments usedCount.
 * Returns the code note/label and resulting entitlement for the success message.
 */
export async function redeemAccessCode(
  userId: number,
  rawCode: string
): Promise<
  | {
      success: true;
      note: string | null;
      tier: "pro" | "lifetime";
      planExpiresAt: number | null;
    }
  | { success: false; error: string }
> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const code = rawCode.trim().toUpperCase();

  // Look up the code
  const rows = await db
    .select()
    .from(accessCodes)
    .where(eq(accessCodes.code, code))
    .limit(1);

  if (rows.length === 0) {
    return {
      success: false,
      error: "Invalid code. Please check and try again.",
    };
  }

  const ac = rows[0];

  if (!ac.active) {
    return { success: false, error: "This code has been deactivated." };
  }

  if (ac.expiresAt && ac.expiresAt < Date.now()) {
    return { success: false, error: "This code has expired." };
  }

  if (ac.maxUses !== null && ac.usedCount >= ac.maxUses) {
    return {
      success: false,
      error: "This code has reached its maximum number of uses.",
    };
  }

  // Check if this user already redeemed a code
  const existing = await db
    .select()
    .from(accessCodeRedemptions)
    .where(eq(accessCodeRedemptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: "You have already redeemed an access code.",
    };
  }

  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);
  const now = Date.now();
  const startsAt =
    profile?.planExpiresAt != null && profile.planExpiresAt > now
      ? profile.planExpiresAt
      : now;
  const grant =
    profile?.tier === "lifetime"
      ? { tier: "lifetime" as const, planExpiresAt: null }
      : resolveAccessCodeGrant(ac, startsAt);

  await db.transaction(async tx => {
    await tx
      .update(businessProfiles)
      .set({ ...grant, updatedAt: new Date() })
      .where(eq(businessProfiles.userId, userId));
    await tx.insert(accessCodeRedemptions).values({ codeId: ac.id, userId });
    await tx
      .update(accessCodes)
      .set({ usedCount: ac.usedCount + 1 })
      .where(eq(accessCodes.id, ac.id));
  });

  return { success: true, note: ac.note, ...grant };
}
