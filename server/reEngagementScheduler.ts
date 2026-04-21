/**
 * Re-engagement email scheduler.
 * Runs every hour. Finds churn_survey rows where:
 *   - createdAt is between 3 and 4 days ago (the 3-day window)
 *   - reEngagementSentAt is null (not yet sent)
 *   - user does NOT have an active Stripe subscription
 * Sends sendReEngagementEmail() and marks reEngagementSentAt.
 */
import { getDb } from "./db";
import { churnSurveys, stripeSubscriptions, users } from "../drizzle/schema";
import { and, isNull, lte, gte, eq } from "drizzle-orm";
import { sendReEngagementEmail } from "./smtp";


const HOUR_MS = 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * HOUR_MS;
const FOUR_DAYS_MS = 4 * 24 * HOUR_MS;

export async function runReEngagementCheck(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();
  const windowStart = new Date(now - FOUR_DAYS_MS);
  const windowEnd = new Date(now - THREE_DAYS_MS);

  // Find eligible churn survey rows in the 3–4 day window, not yet re-engaged
  const eligible = await db
    .select()
    .from(churnSurveys)
    .where(
      and(
        gte(churnSurveys.createdAt, windowStart),
        lte(churnSurveys.createdAt, windowEnd),
        isNull(churnSurveys.reEngagementSentAt)
      )
    );

  if (eligible.length === 0) return;
  console.log(`[ReEngagement] ${eligible.length} candidate(s) in the 3-day window.`);

  for (const survey of eligible) {
    try {
      // Determine the email to send to
      const toEmail = survey.email;
      let toName: string | null = null;
      let ownerUserId: number | null = null;

      // If we have a userId, look up their email and check for active subscription
      if (survey.userId) {
        const userRow = await db
          .select()
          .from(users)
          .where(eq(users.id, survey.userId))
          .limit(1);
        if (userRow.length > 0) {
          toName = userRow[0].name;
          // Check if they have an active subscription
          const activeSub = await db
            .select()
            .from(stripeSubscriptions)
            .where(
              and(
                eq(stripeSubscriptions.userId, survey.userId),
                eq(stripeSubscriptions.status, "active")
              )
            )
            .limit(1);
          if (activeSub.length > 0) {
            // Already resubscribed — mark as sent to prevent future checks, skip email
            console.log(`[ReEngagement] userId=${survey.userId} already resubscribed — skipping.`);
            await db
              .update(churnSurveys)
              .set({ reEngagementSentAt: now })
              .where(eq(churnSurveys.id, survey.id));
            continue;
          }
        }
      }

      // Need an email address to send to
      const emailTarget = toEmail ?? (survey.userId ? null : null);
      if (!emailTarget) {
        console.log(`[ReEngagement] survey id=${survey.id} has no email — skipping.`);
        await db
          .update(churnSurveys)
          .set({ reEngagementSentAt: now })
          .where(eq(churnSurveys.id, survey.id));
        continue;
      }

      // Use owner's SMTP (userId=1 is the platform owner)
      // The owner's SMTP is used to send on behalf of the platform
      ownerUserId = 1;

      await sendReEngagementEmail({
        ownerUserId,
        toEmail: emailTarget,
        toName,
      });

      // Mark as sent
      await db
        .update(churnSurveys)
        .set({ reEngagementSentAt: now })
        .where(eq(churnSurveys.id, survey.id));

      console.log(`[ReEngagement] Sent to ${emailTarget} (survey id=${survey.id}).`);
    } catch (err) {
      console.error(`[ReEngagement] Failed for survey id=${survey.id}:`, err);
    }
  }
}

export function startReEngagementScheduler(): void {
  console.log("[ReEngagement] Scheduler started — checking every hour.");
  // Run immediately on start, then every hour
  runReEngagementCheck().catch(err =>
    console.error("[ReEngagement] Initial check failed:", err)
  );
  setInterval(() => {
    runReEngagementCheck().catch(err =>
      console.error("[ReEngagement] Hourly check failed:", err)
    );
  }, HOUR_MS);
}
