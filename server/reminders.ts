/**
 * Follow-up Reminders — two-step sequence per review request:
 *   Step 1 — day 4 after initial send  ("Just checking in…")
 *   Step 2 — day 11 after initial send ("Last chance to share your thoughts…")
 *
 * The scheduler runs every hour via setInterval on server start.
 */
import { getDb } from "./db";
import { followUpReminders, businessProfiles } from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendMailViaSmtp } from "./smtp";
import { getDefaultReviewPlatform } from "./reviewPlatforms";
import { encodeTrackingToken, wrapClickUrl, buildOpenPixel } from "./emailTracking";

const FOUR_DAYS_MS   = 4  * 24 * 60 * 60 * 1000; // day 4  — first follow-up
const ELEVEN_DAYS_MS = 11 * 24 * 60 * 60 * 1000; // day 11 — second follow-up

/**
 * Schedule both follow-up reminders for a sent review request:
 *   Step 1 — 4 days after initial send
 *   Step 2 — 11 days after initial send (7 days after step 1)
 */
export async function scheduleFollowUp(
  userId: number,
  customerRequestId: number,
  customerName: string,
  customerEmail: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Respect per-user follow-up toggle — skip if disabled
  const [profile] = await db
    .select({ followUpEnabled: businessProfiles.followUpEnabled, followUpDelayDays: businessProfiles.followUpDelayDays })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId));
  if (profile && profile.followUpEnabled === 0) return;

  const step1DelayMs = ((profile?.followUpDelayDays ?? 4)) * 24 * 60 * 60 * 1000;
  const step2DelayMs = step1DelayMs + 7 * 24 * 60 * 60 * 1000; // step 2 always 7 days after step 1

  const now = Date.now();
  await db.insert(followUpReminders).values([
    {
      userId,
      customerRequestId,
      customerName,
      customerEmail,
      scheduledAt: now + step1DelayMs,
      status: "pending",
      sequenceStep: 1,
    },
    {
      userId,
      customerRequestId,
      customerName,
      customerEmail,
      scheduledAt: now + step2DelayMs,
      status: "pending",
      sequenceStep: 2,
    },
  ]);
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

/** Build the email subject line based on sequence step */
function getReminderSubject(step: number): string {
  if (step === 2) {
    return `One last nudge — we'd love your review!`;
  }
  return `Just checking in — have you had a chance to leave us a review?`;
}

/** Build the email body based on sequence step */
function getReminderBody(
  step: number,
  customerName: string,
  businessName: string,
  trackedReviewUrl: string,
  reviewUrl: string,
  openPixel: string
): string {
  if (step === 2) {
    return `Hi ${customerName},<br><br>We know life gets busy — this is our last follow-up, we promise! 😊<br><br>If you've had a chance to experience our service, it would mean the world to us if you could spare a minute to share your thoughts:<br><br><a href="${trackedReviewUrl}">${reviewUrl}</a><br><br>Your feedback helps other customers find us and helps us keep improving.<br><br>Thank you so much,<br>${businessName}${openPixel}`;
  }
  return `Hi ${customerName},<br><br>We wanted to follow up on our earlier message. If you've had a chance to try our service, we'd love to hear what you think!<br><br>Leaving a review only takes a minute and helps us a lot:<br><a href="${trackedReviewUrl}">${reviewUrl}</a><br><br>Thank you so much for your support!<br><br>${businessName}${openPixel}`;
}

/**
 * Process all due pending reminders — called by the background scheduler.
 */
export async function processDueReminders() {
  const db = await getDb();
  if (!db) return;

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
    try {
      const [profile] = await db
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, reminder.userId));
      if (!profile) continue;

      const defaultPlatform = await getDefaultReviewPlatform(reminder.userId);
      const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";
      const trackingToken = encodeTrackingToken(reminder.customerRequestId, reminder.userId, null);
      const baseUrl = process.env.APP_BASE_URL ?? "https://phame.app";
      const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
      const openPixel = buildOpenPixel(trackingToken, baseUrl);

      const step = reminder.sequenceStep ?? 1;
      const subject = getReminderSubject(step);
      const html = getReminderBody(step, reminder.customerName, profile.businessName ?? "Us", trackedReviewUrl, reviewUrl, openPixel);

      await sendMailViaSmtp({ userId: reminder.userId, to: reminder.customerEmail, subject, html });

      await db
        .update(followUpReminders)
        .set({ status: "sent", sentAt: Date.now() })
        .where(eq(followUpReminders.id, reminder.id));

      console.log(`[Reminders] Step ${step} follow-up sent to ${reminder.customerEmail}`);
    } catch (err) {
      console.error(`[Reminders] Failed to send follow-up for reminder ${reminder.id}:`, err);
    }
  }
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

  const defaultPlatform = await getDefaultReviewPlatform(userId);
  const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";
  const trackingToken = encodeTrackingToken(reminder.customerRequestId, userId, null);
  const baseUrl = process.env.APP_BASE_URL ?? "https://phame.app";
  const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
  const openPixel = buildOpenPixel(trackingToken, baseUrl);

  const step = reminder.sequenceStep ?? 1;
  const subject = getReminderSubject(step);
  const html = getReminderBody(step, reminder.customerName, profile.businessName ?? "Us", trackedReviewUrl, reviewUrl, openPixel);

  await sendMailViaSmtp({ userId, to: reminder.customerEmail, subject, html });
  await db
    .update(followUpReminders)
    .set({ status: "sent", sentAt: Date.now() })
    .where(eq(followUpReminders.id, reminderId));
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

/**
 * Start the background scheduler — runs every hour.
 */
export function startReminderScheduler() {
  console.log("[Reminders] Scheduler started — checking every hour.");
  processDueReminders(); // Run immediately on startup
  setInterval(processDueReminders, 60 * 60 * 1000);
}
