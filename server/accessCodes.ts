/**
 * Access Code DB helpers
 * Used by the accessCodes tRPC router for beta/promo code management.
 * Supports duration-aware grants: days, months, or lifetime.
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { accessCodes, accessCodeRedemptions, businessProfiles } from "../drizzle/schema";

/** Generate a random readable code like BETA-X7K2-P9QM */
export function generateCode(prefix = "BETA"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid confusion
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${prefix}-${segment(4)}-${segment(4)}`;
}

/** Create a new access code with optional duration semantics */
export async function createAccessCode(opts: {
  code?: string;
  note?: string;
  maxUses?: number | null;
  expiresAt?: number | null;
  grantDurationType?: "days" | "months" | "lifetime";
  grantAmount?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const code = opts.code ?? generateCode();
  await db.insert(accessCodes).values({
    code: code.toUpperCase(),
    note: opts.note ?? null,
    maxUses: opts.maxUses ?? null,
    expiresAt: opts.expiresAt ?? null,
    grantDurationType: opts.grantDurationType ?? "lifetime",
    grantAmount: opts.grantAmount ?? null,
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
 * On success: upgrades user to the tier/duration encoded in the code, records redemption, increments usedCount.
 * Returns the code note/label for the success message.
 */
export async function redeemAccessCode(
  userId: number,
  rawCode: string
): Promise<{ success: true; note: string | null } | { success: false; error: string }> {
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
    return { success: false, error: "Invalid code. Please check and try again." };
  }

  const ac = rows[0];

  if (!ac.active) {
    return { success: false, error: "This code has been deactivated." };
  }

  if (ac.expiresAt && ac.expiresAt < Date.now()) {
    return { success: false, error: "This code has expired." };
  }

  if (ac.maxUses !== null && ac.usedCount >= ac.maxUses) {
    return { success: false, error: "This code has reached its maximum number of uses." };
  }

  // Check if this user already redeemed a code
  const existing = await db
    .select()
    .from(accessCodeRedemptions)
    .where(eq(accessCodeRedemptions.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: "You have already redeemed an access code." };
  }

  // Determine tier + expiry based on grantDurationType
  const durationType = ac.grantDurationType ?? "lifetime";
  let newTier: "pro" | "annual" | "lifetime" = "pro";
  let newPlanExpiresAt: number | null = null;

  if (durationType === "lifetime") {
    newTier = "lifetime";
    newPlanExpiresAt = null;
  } else {
    const amount = ac.grantAmount ?? 1;
    const [existingProfile] = await db
      .select({ planExpiresAt: businessProfiles.planExpiresAt })
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, userId));
    const base =
      existingProfile?.planExpiresAt && existingProfile.planExpiresAt > Date.now()
        ? existingProfile.planExpiresAt
        : Date.now();
    if (durationType === "days") {
      newTier = "pro";
      newPlanExpiresAt = base + amount * 24 * 60 * 60 * 1000;
    } else {
      // months
      newTier = amount >= 12 ? "annual" : "pro";
      newPlanExpiresAt = base + amount * 30 * 24 * 60 * 60 * 1000;
    }
  }

  // Apply tier upgrade
  await db
    .update(businessProfiles)
    .set({ tier: newTier, planExpiresAt: newPlanExpiresAt })
    .where(eq(businessProfiles.userId, userId));

  // Record redemption
  await db.insert(accessCodeRedemptions).values({ codeId: ac.id, userId });

  // Increment usedCount
  await db
    .update(accessCodes)
    .set({ usedCount: ac.usedCount + 1 })
    .where(eq(accessCodes.id, ac.id));

  return { success: true, note: ac.note };
}
