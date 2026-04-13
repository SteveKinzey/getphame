/**
 * Follow-up Reminders — schedule and process 3-day follow-up emails.
 * The scheduler runs every hour via setInterval on server start.
 */
import { getDb } from "./db";
import { followUpReminders, businessProfiles } from "../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { sendMailViaSmtp } from "./smtp";
import { getDefaultReviewPlatform } from "./reviewPlatforms";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function scheduleFollowUp(
  userId: number,
  customerRequestId: number,
  customerName: string,
  customerEmail: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(followUpReminders).values({
    userId,
    customerRequestId,
    customerName,
    customerEmail,
    scheduledAt: Date.now() + THREE_DAYS_MS,
    status: "pending",
  });
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
      // Get business profile for review link
      const [profile] = await db
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, reminder.userId));
      if (!profile) continue;

      const reminderDefaultPlatform = await getDefaultReviewPlatform(reminder.userId);
      const reminderReviewUrl = reminderDefaultPlatform?.url ?? profile.reviewLink ?? "";
      const subject = `Just checking in — have you had a chance to leave us a review?`;
      const body = `Hi ${reminder.customerName},<br><br>We wanted to follow up on our earlier message. If you've had a chance to try our service, we'd love to hear what you think!<br><br>Leaving a review only takes a minute and helps us a lot:<br><a href="${reminderReviewUrl}">${reminderReviewUrl}</a><br><br>Thank you so much for your support!<br><br>${profile.businessName}`;

      await sendMailViaSmtp({ userId: reminder.userId, to: reminder.customerEmail, subject, html: body });

      // Mark as sent
      await db
        .update(followUpReminders)
        .set({ status: "sent", sentAt: Date.now() })
        .where(eq(followUpReminders.id, reminder.id));

      console.log(`[Reminders] Follow-up sent to ${reminder.customerEmail}`);
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
  const nowDefaultPlatform = await getDefaultReviewPlatform(userId);
  const nowReviewUrl = nowDefaultPlatform?.url ?? profile.reviewLink ?? "";
  const subject = `Just checking in — have you had a chance to leave us a review?`;
  const body = `Hi ${reminder.customerName},<br><br>We wanted to follow up on our earlier message. If you've had a chance to try our service, we'd love to hear what you think!<br><br>Leaving a review only takes a minute and helps us a lot:<br><a href="${nowReviewUrl}">${nowReviewUrl}</a><br><br>Thank you so much for your support!<br><br>${profile.businessName}`;
  await sendMailViaSmtp({ userId, to: reminder.customerEmail, subject, html: body });
  await db
    .update(followUpReminders)
    .set({ status: "sent", sentAt: Date.now() })
    .where(eq(followUpReminders.id, reminderId));
}

/**
 * Start the background scheduler — runs every hour.
 */
export function startReminderScheduler() {
  console.log("[Reminders] Scheduler started — checking every hour.");
  processDueReminders(); // Run immediately on startup
  setInterval(processDueReminders, 60 * 60 * 1000);
}
