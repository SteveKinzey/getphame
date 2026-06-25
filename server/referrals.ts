/**
 * Referral / affiliate tracking.
 *
 * Flow:
 * 1. Each user gets a unique 8-char alphanumeric referral code stored in business_profiles.referralCode.
 * 2. When a user shares the app, the share URL is: https://getphame.app?ref=<code>
 * 3. On landing, the frontend stores the ref code in localStorage (key: "phame_ref").
 * 4. On signup (any auth provider), the backend reads the ref code from the session/request,
 *    looks up the referrer, and creates a row in the referrals table.
 * 5. When the referred user completes a paid checkout (≥ 1 month), the Stripe webhook
 *    calls rewardReferrer() which extends the referrer's planExpiresAt by 30 days.
 */

import { randomBytes } from "crypto";
import { getDb } from "./db";
import { businessProfiles, referrals } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

/** Generate a unique 8-char uppercase alphanumeric referral code */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Get or create a referral code for a user.
 * Returns the code string.
 */
export async function getOrCreateReferralCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [profile] = await db
    .select({ referralCode: businessProfiles.referralCode })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);

  if (profile?.referralCode) return profile.referralCode;

  // Generate a unique code (retry on collision)
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const [existing] = await db
      .select({ id: businessProfiles.id })
      .from(businessProfiles)
      .where(eq(businessProfiles.referralCode, code))
      .limit(1);
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  await db
    .update(businessProfiles)
    .set({ referralCode: code })
    .where(eq(businessProfiles.userId, userId));

  return code;
}

/**
 * Look up the referrer user ID from a referral code.
 * Returns null if the code doesn't exist.
 */
export async function getReferrerByCode(code: string): Promise<number | null> {
  if (!code || code.length < 4) return null;
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db
    .select({ userId: businessProfiles.userId })
    .from(businessProfiles)
    .where(eq(businessProfiles.referralCode, code.toUpperCase()))
    .limit(1);
  return profile?.userId ?? null;
}

/**
 * Record a referral when a new user signs up via a referral link.
 * Safe to call multiple times — silently skips if already recorded.
 */
export async function recordReferral(
  referrerUserId: number,
  referredUserId: number,
  code: string
): Promise<void> {
  if (referrerUserId === referredUserId) return; // can't refer yourself
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(referrals).values({
      referrerUserId,
      referredUserId,
      referralCode: code.toUpperCase(),
    }).onConflictDoNothing({ target: referrals.referredUserId });
  } catch {
    // already exists — ignore
  }
}

/**
 * Check if a referred user has an unrewarded referral.
 * Returns the referral row or null.
 */
export async function getUnrewardedReferral(referredUserId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredUserId, referredUserId),
        isNull(referrals.rewardedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Apply the referral reward: extend the referrer's planExpiresAt by 30 days.
 * Also marks the referral as converted + rewarded.
 * Safe to call multiple times — skips if already rewarded.
 */
export async function rewardReferrer(referralId: number, referrerUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  // Get current planExpiresAt
  const [profile] = await db
    .select({ tier: businessProfiles.tier, planExpiresAt: businessProfiles.planExpiresAt })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, referrerUserId))
    .limit(1);

  if (!profile) return;

  // Don't reward lifetime users (they already have permanent access)
  if (profile.tier === "lifetime") return;

  // Extend from today or from current expiry, whichever is later
  const base = Math.max(now, profile.planExpiresAt ?? now);
  const newExpiry = base + thirtyDays;

  await db
    .update(businessProfiles)
    .set({ planExpiresAt: newExpiry })
    .where(eq(businessProfiles.userId, referrerUserId));

  await db
    .update(referrals)
    .set({ convertedAt: now, rewardedAt: now })
    .where(eq(referrals.id, referralId));
}
