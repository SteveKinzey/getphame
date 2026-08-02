/**
 * Follow-up Reminders — two-step sequence per review request:
 *   Step 1 — the user's configured delay after the initial send
 *   Step 2 — the user's configured delay after step 1
 *
 * Due reminders are processed by the managed hourly heartbeat endpoint.
 */
import { getDb } from "./db";
import { followUpReminders, businessProfiles, customerRequests } from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendMailViaSmtp } from "./smtp";
import {
  isWithinQuietHours,
  nextAllowedDeliveryAt,
  resolveQuietHoursWindow,
} from "./quietHours";
import { getDefaultReviewPlatform } from "./reviewPlatforms";
import { encodeTrackingToken, wrapClickUrl, buildOpenPixel } from "./emailTracking";
import { buildReviewRequestEmail } from "./emailTemplates";

const DAY_MS = 24 * 60 * 60 * 1000;
const CLAIM_WINDOW_MS = 15 * 60 * 1000;

type ReminderStageSettings = {
  followUpEnabled: number;
  followUpFirstEnabled: number;
  followUpSecondEnabled: number;
};

function isStageEnabled(settings: ReminderStageSettings, step: number) {
  if (settings.followUpEnabled === 0) return false;
  return step === 2
    ? settings.followUpSecondEnabled !== 0
    : settings.followUpFirstEnabled !== 0;
}

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { affectedRows?: number } | undefined;
    return Number(header?.affectedRows ?? 0);
  }
  return Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}

/** Schedule each enabled follow-up stage while preserving cumulative timing. */
export async function scheduleFollowUp(
  userId: number,
  customerRequestId: number,
  customerName: string,
  customerEmail: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [requestSnapshot] = await db
    .select({
      preferredLocale: customerRequests.preferredLocale,
      templateRevisionId: customerRequests.templateRevisionId,
      englishTemplateRevisionId: customerRequests.englishTemplateRevisionId,
    })
    .from(customerRequests)
    .where(
      and(
        eq(customerRequests.userId, userId),
        eq(customerRequests.id, customerRequestId),
      ),
    )
    .limit(1);

  const [profile] = await db
    .select({
      followUpEnabled: businessProfiles.followUpEnabled,
      followUpFirstEnabled: businessProfiles.followUpFirstEnabled,
      followUpSecondEnabled: businessProfiles.followUpSecondEnabled,
      followUpDelayDays: businessProfiles.followUpDelayDays,
      followUpSecondDelayDays: businessProfiles.followUpSecondDelayDays,
    })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId));
  if (profile && profile.followUpEnabled === 0) return;

  const firstDelayDays = profile?.followUpDelayDays ?? 3;
  const secondDelayDays = profile?.followUpSecondDelayDays ?? 7;
  const firstStageEnabled = profile?.followUpFirstEnabled !== 0;
  const secondStageEnabled = profile?.followUpSecondEnabled !== 0;
  const step1DelayMs = firstDelayDays * DAY_MS;
  const step2DelayMs = step1DelayMs + secondDelayDays * DAY_MS;

  const now = Date.now();
  const reminders: Array<typeof followUpReminders.$inferInsert> = [];
  const snapshot = {
    firstDelayDaysSnapshot: firstDelayDays,
    secondDelayDaysSnapshot: secondDelayDays,
    firstStageEnabledSnapshot: firstStageEnabled ? 1 : 0,
    secondStageEnabledSnapshot: secondStageEnabled ? 1 : 0,
    preferredLocale: requestSnapshot?.preferredLocale ?? "en",
    templateRevisionId: requestSnapshot?.templateRevisionId ?? null,
    englishTemplateRevisionId: requestSnapshot?.englishTemplateRevisionId ?? null,
  };

  if (firstStageEnabled) {
    reminders.push({
      userId,
      customerRequestId,
      customerName,
      customerEmail,
      scheduledAt: now + step1DelayMs,
      status: "pending",
      sequenceStep: 1,
      ...snapshot,
    });
  }

  if (secondStageEnabled) {
    reminders.push({
      userId,
      customerRequestId,
      customerName,
      customerEmail,
      scheduledAt: now + step2DelayMs,
      status: "pending",
      sequenceStep: 2,
      ...snapshot,
    });
  }

  if (reminders.length > 0) {
    await db.insert(followUpReminders).values(reminders);
  }
}

export async function listReminders(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(followUpReminders)
    .where(eq(followUpReminders.userId, userId))
    .orderBy(followUpReminders.scheduledAt);
}

export async function cancelReminder(userId: number, reminderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(followUpReminders)
    .set({ status: "cancelled" })
    .where(and(eq(followUpReminders.userId, userId), eq(followUpReminders.id, reminderId)));
}

/**
 * Cancel ALL pending reminders for a given customerRequestId.
 * Called when a customer is marked as responded so they stop receiving follow-ups.
 */
export async function cancelRemindersByRequestId(userId: number, customerRequestId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(followUpReminders)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(followUpReminders.userId, userId),
        eq(followUpReminders.customerRequestId, customerRequestId),
        eq(followUpReminders.status, "pending")
      )
    );
  console.log(`[Reminders] Cancelled all pending reminders for request ${customerRequestId}`);
}

/** Cancel pending rows for reminder stages the user has switched off. */
export async function syncPendingReminderStages(
  userId: number,
  settings: ReminderStageSettings
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (settings.followUpEnabled === 0) {
    await db
      .update(followUpReminders)
      .set({ status: "cancelled" })
      .where(and(eq(followUpReminders.userId, userId), eq(followUpReminders.status, "pending")));
    return;
  }

  const disabledSteps = [
    settings.followUpFirstEnabled === 0 ? 1 : null,
    settings.followUpSecondEnabled === 0 ? 2 : null,
  ].filter((step): step is number => step !== null);

  for (const step of disabledSteps) {
    await db
      .update(followUpReminders)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(followUpReminders.userId, userId),
          eq(followUpReminders.status, "pending"),
          eq(followUpReminders.sequenceStep, step)
        )
      );
  }
}

/** Build the email subject line based on sequence step */
function getReminderSubject(step: number): string {
  if (step === 2) {
    return `One last nudge — we'd love your review!`;
  }
  return `Just checking in — have you had a chance to leave us a review?`;
}

/** Build the reminder email body HTML using the shared branded template */
function getReminderBody(
  step: number,
  customerName: string,
  businessName: string,
  trackedReviewUrl: string,
  reviewUrl: string,
  openPixel: string,
  showPoweredBy = false
): string {
  const bodyHtml = step === 2
    ? `<p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">We know life gets busy — this is our last follow-up, we promise! 😊</p>
       <p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">If you've had a chance to experience our service, it would mean the world to us if you could spare a minute to share your thoughts.</p>
       <p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">Your feedback helps other customers find us and helps us keep improving.</p>`
    : `<p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">We wanted to follow up on our earlier message. If you've had a chance to try our service, we'd love to hear what you think!</p>
       <p style="margin:0 0 14px;font-size:15px;color:#555;line-height:1.7;">Leaving a review only takes a minute and helps us a lot.</p>`;

  return buildReviewRequestEmail({
    customerName,
    businessName,
    reviewUrl: trackedReviewUrl,
    bodyHtml: bodyHtml + openPixel,
    showPoweredBy,
  });
}

/**
 * Process all due pending reminders — called by the background scheduler.
 */
export async function processDueReminders() {
  const summary = { checked: 0, sent: 0, deferred: 0, cancelled: 0, failed: 0, locked: 0 };
  try {
    const db = await getDb();
    if (!db) return summary;

    const now = Date.now();
    const due = await db
      .select()
      .from(followUpReminders)
      .where(
        and(
          eq(followUpReminders.status, "pending"),
          lte(followUpReminders.scheduledAt, now)
        )
      );

    for (const reminder of due) {
      summary.checked += 1;
      try {
        const claimResult = await db
          .update(followUpReminders)
          .set({ scheduledAt: now + CLAIM_WINDOW_MS })
          .where(
            and(
              eq(followUpReminders.id, reminder.id),
              eq(followUpReminders.status, "pending"),
              lte(followUpReminders.scheduledAt, now)
            )
          );
        if (getAffectedRows(claimResult) !== 1) {
          summary.locked += 1;
          continue;
        }

        const [profile] = await db
          .select()
          .from(businessProfiles)
          .where(eq(businessProfiles.userId, reminder.userId));
        if (!profile) {
          await db.update(followUpReminders).set({ status: "cancelled" }).where(eq(followUpReminders.id, reminder.id));
          summary.cancelled += 1;
          continue;
        }

        const step = reminder.sequenceStep ?? 1;
        if (!isStageEnabled(profile, step)) {
          await db.update(followUpReminders).set({ status: "cancelled" }).where(eq(followUpReminders.id, reminder.id));
          summary.cancelled += 1;
          continue;
        }

        const quietWindow = resolveQuietHoursWindow(profile);
        if (isWithinQuietHours(now, quietWindow)) {
          await db
            .update(followUpReminders)
            .set({ scheduledAt: nextAllowedDeliveryAt(now, quietWindow) })
            .where(eq(followUpReminders.id, reminder.id));
          summary.deferred += 1;
          continue;
        }

        const defaultPlatform = await getDefaultReviewPlatform(reminder.userId);
        const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";
        const trackingToken = encodeTrackingToken(reminder.customerRequestId, reminder.userId, null);
        const baseUrl = process.env.APP_BASE_URL ?? "https://getphame.app";
        const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
        const openPixel = buildOpenPixel(trackingToken, baseUrl);

        const subject = getReminderSubject(step);
        const showPoweredBy = !profile.tier || profile.tier === 'free';
        const html = getReminderBody(step, reminder.customerName, profile.businessName ?? "Us", trackedReviewUrl, reviewUrl, openPixel, showPoweredBy);

        await sendMailViaSmtp({ userId: reminder.userId, to: reminder.customerEmail, subject, html });

        await db
          .update(followUpReminders)
          .set({ status: "sent", sentAt: Date.now() })
          .where(eq(followUpReminders.id, reminder.id));

        summary.sent += 1;
        console.log(`[Reminders] Step ${step} follow-up sent for reminder ${reminder.id}`);
      } catch (err) {
        summary.failed += 1;
        console.error(`[Reminders] Failed to send follow-up for reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    // Swallow DB connection errors (e.g. SSL timeout) so the server process stays alive
    console.error("[Reminders] processDueReminders failed (will retry next interval):", err instanceof Error ? err.message : err);
  }
  return summary;
}

/**
 * Send a specific pending reminder immediately (user-triggered override).
 */
export async function sendReminderNow(userId: number, reminderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [reminder] = await db
    .select()
    .from(followUpReminders)
    .where(and(eq(followUpReminders.userId, userId), eq(followUpReminders.id, reminderId)));
  if (!reminder) throw new Error("Reminder not found.");
  if (reminder.status !== "pending") throw new Error("Only pending reminders can be sent now.");

  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId));
  if (!profile) throw new Error("Business profile not found.");

  const step = reminder.sequenceStep ?? 1;
  if (!isStageEnabled(profile, step)) {
    throw new Error("This reminder stage is disabled in Settings.");
  }

  const quietWindow = resolveQuietHoursWindow(profile);
  if (isWithinQuietHours(Date.now(), quietWindow)) {
    const scheduledAt = nextAllowedDeliveryAt(Date.now(), quietWindow);
    await db
      .update(followUpReminders)
      .set({ scheduledAt })
      .where(eq(followUpReminders.id, reminderId));
    return { delivery: "queued" as const, scheduledAt };
  }

  const defaultPlatform = await getDefaultReviewPlatform(userId);
  const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";
  const trackingToken = encodeTrackingToken(reminder.customerRequestId, userId, null);
  const baseUrl = process.env.APP_BASE_URL ?? "https://getphame.app";
  const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
  const openPixel = buildOpenPixel(trackingToken, baseUrl);

  const subject = getReminderSubject(step);
  const showPoweredBy = !profile.tier || profile.tier === 'free';
  const html = getReminderBody(step, reminder.customerName, profile.businessName ?? "Us", trackedReviewUrl, reviewUrl, openPixel, showPoweredBy);

  await sendMailViaSmtp({ userId, to: reminder.customerEmail, subject, html });
  await db
    .update(followUpReminders)
    .set({ status: "sent", sentAt: Date.now() })
    .where(eq(followUpReminders.id, reminderId));
  return { delivery: "sent" as const, scheduledAt: null };
}

/** Build a preview of a follow-up reminder email for the given user and sequence step */
export async function getReminderPreviewHtml(userId: number, step: number): Promise<string> {
  const db = await getDb();
  const profile = db
    ? (await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1))[0]
    : null;
  const businessName = profile?.businessName ?? "Your Business";
  const reviewUrl = "https://g.page/r/example-preview";
  return getReminderBody(step, "Alex Johnson", businessName, reviewUrl, reviewUrl, "");
}
