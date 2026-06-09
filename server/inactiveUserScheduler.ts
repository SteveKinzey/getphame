/**
 * Inactive user re-engagement scheduler.
 *
 * Targets users who:
 *   - Signed up 7–14 days ago
 *   - Have monthlyCount = 0 (never sent a review request)
 *   - Have not yet received the inactive re-engagement email (inactiveEmailSentAt is null)
 *
 * Sends sendInactiveUserEmail() from the platform owner's SMTP (userId=1).
 * Marks inactiveEmailSentAt on businessProfiles to prevent duplicate sends.
 *
 * Runs every 6 hours via setInterval (lightweight — only fires for new signups in the window).
 */

import { getDb } from "./db";
import { businessProfiles, users } from "../drizzle/schema";
import { and, isNull, lte, gte, eq } from "drizzle-orm";
import { sendInactiveUserEmail } from "./smtp";
import crypto from "crypto";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function runInactiveUserCheck(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();
  const windowStart = new Date(now - FOURTEEN_DAYS_MS);
  const windowEnd = new Date(now - SEVEN_DAYS_MS);

  // Find business profiles for users who signed up 7–14 days ago, never sent, and haven't been emailed
  const eligible = await db
    .select({
      userId: businessProfiles.userId,
      monthlyCount: businessProfiles.monthlyCount,
      inactiveEmailSentAt: businessProfiles.inactiveEmailSentAt,
      profileCreatedAt: businessProfiles.createdAt,
    })
    .from(businessProfiles)
    .where(
      and(
        gte(businessProfiles.createdAt, windowStart),
        lte(businessProfiles.createdAt, windowEnd),
        isNull(businessProfiles.inactiveEmailSentAt),
        eq(businessProfiles.monthlyCount, 0)
      )
    );

  if (eligible.length === 0) {
    console.log("[InactiveUsers] No eligible users in the 7–14 day window.");
    return;
  }

  console.log(`[InactiveUsers] ${eligible.length} candidate(s) in the 7-day window.`);

  for (const profile of eligible) {
    try {
      // Look up the user's email
      const userRows = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, profile.userId))
        .limit(1);

      if (userRows.length === 0) {
        console.log(`[InactiveUsers] userId=${profile.userId} not found — skipping.`);
        await db
          .update(businessProfiles)
          .set({ inactiveEmailSentAt: now })
          .where(eq(businessProfiles.userId, profile.userId));
        continue;
      }

      const { email, name } = userRows[0];
      if (!email) {
        console.log(`[InactiveUsers] userId=${profile.userId} has no email — skipping.`);
        await db
          .update(businessProfiles)
          .set({ inactiveEmailSentAt: now })
          .where(eq(businessProfiles.userId, profile.userId));
        continue;
      }

      // Generate a simple unsubscribe token (store in a query param for now)
      const token = crypto.randomBytes(24).toString("hex");
      const appBaseUrl = process.env.APP_BASE_URL ?? "https://getphame.app";
      const unsubscribeUrl = `${appBaseUrl}/api/inactive/unsubscribe/${token}`;

      // Send from owner's SMTP (userId=1 is the platform owner)
      await sendInactiveUserEmail({
        ownerUserId: 1,
        toEmail: email,
        toName: name,
        unsubscribeUrl,
      });

      // Mark as sent
      await db
        .update(businessProfiles)
        .set({ inactiveEmailSentAt: now })
        .where(eq(businessProfiles.userId, profile.userId));

      console.log(`[InactiveUsers] Sent to ${email} (userId=${profile.userId}).`);
    } catch (err) {
      console.error(`[InactiveUsers] Failed for userId=${profile.userId}:`, err);
    }
  }
}

export function startInactiveUserScheduler(): void {
  console.log("[InactiveUsers] Scheduler started — checking every 6 hours.");
  // Run immediately on start, then every 6 hours
  runInactiveUserCheck().catch((err) =>
    console.error("[InactiveUsers] Initial check failed:", err)
  );
  setInterval(() => {
    runInactiveUserCheck().catch((err) =>
      console.error("[InactiveUsers] Periodic check failed:", err)
    );
  }, SIX_HOURS_MS);
}
