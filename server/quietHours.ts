import { and, eq, lte, sql } from "drizzle-orm";
import {
  businessProfiles,
  customerRequests,
  quietHoursQueuedSends,
  savedContacts,
  wooCustomers,
  type BusinessProfile,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  makeRequest,
  type GeocodingResult,
  type TimeZoneResult,
} from "./_core/map";
import { sendMailViaSmtp } from "./smtp";

export const QUIET_HOURS_DEFAULT_START_MINUTES = 20 * 60;
export const QUIET_HOURS_DEFAULT_END_MINUTES = 8 * 60;
export const QUIET_HOURS_MINIMUM_DURATION_MINUTES = 12 * 60;

const MINUTE_MS = 60_000;
const CLAIM_WINDOW_MS = 15 * MINUTE_MS;
const RETRY_DELAY_MS = 15 * MINUTE_MS;
const MAX_DELIVERY_ATTEMPTS = 3;

export type QuietHoursDeliverySource =
  | "single"
  | "contacts"
  | "woocommerce"
  | "api"
  | "resend"
  | "reminder";

export type QuietHoursDeliveryInput = {
  userId: number;
  customerRequestId: number;
  customerName: string;
  recipientEmail: string;
  subject: string;
  html: string;
  source: QuietHoursDeliverySource;
  sourceRecordId?: number | null;
  templateId?: number | null;
  scheduleFollowUps?: boolean;
  countTowardMonthly?: boolean;
};

export type QuietHoursDeliveryResult = {
  delivery: "sent" | "queued";
  scheduledAt: number | null;
  sendLimitStatus: Awaited<ReturnType<typeof sendMailViaSmtp>>;
};

type QuietHoursWindow = {
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
};

function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function normalizeMinute(value: number | null | undefined, fallback: number) {
  return Number.isInteger(value) && value! >= 0 && value! < 24 * 60
    ? value!
    : fallback;
}

export function quietWindowDurationMinutes(startMinutes: number, endMinutes: number) {
  const duration = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
  return duration === 0 ? 24 * 60 : duration;
}

export async function resolveBusinessAddressTimeZone(physicalAddress: string) {
  const address = physicalAddress.trim();
  if (address.length < 8) {
    throw new Error("Enter a complete physical business address to set local quiet hours.");
  }

  const geocode = await makeRequest<GeocodingResult>("/maps/api/geocode/json", {
    address,
  });
  const result = geocode.results?.[0];
  if (geocode.status !== "OK" || !result?.geometry?.location) {
    throw new Error("We could not verify that business address. Please enter a complete street address.");
  }

  const { lat, lng } = result.geometry.location;
  const timeZone = await makeRequest<TimeZoneResult>("/maps/api/timezone/json", {
    location: `${lat},${lng}`,
    timestamp: Math.floor(Date.now() / 1000),
  });
  if (timeZone.status !== "OK" || !isValidTimeZone(timeZone.timeZoneId)) {
    throw new Error("We could not determine the local timezone for that business address.");
  }

  return {
    normalizedPhysicalAddress: result.formatted_address,
    businessTimeZone: timeZone.timeZoneId,
  };
}

export function resolveQuietHoursWindow(profile: BusinessProfile): QuietHoursWindow {
  if (!isValidTimeZone(profile.businessTimeZone)) {
    throw new Error(
      "Add and verify your physical business address in Settings before sending review requests. Get Phame uses it to protect customers during local quiet hours."
    );
  }

  const configuredStart = normalizeMinute(
    profile.quietHoursStartMinutes,
    QUIET_HOURS_DEFAULT_START_MINUTES
  );
  const configuredEnd = normalizeMinute(
    profile.quietHoursEndMinutes,
    QUIET_HOURS_DEFAULT_END_MINUTES
  );
  const requestedDuration = quietWindowDurationMinutes(configuredStart, configuredEnd);
  const hasApprovedShortening = profile.quietHoursShorteningApproved === 1;

  if (!hasApprovedShortening && requestedDuration < QUIET_HOURS_MINIMUM_DURATION_MINUTES) {
    return {
      startMinutes: QUIET_HOURS_DEFAULT_START_MINUTES,
      endMinutes: QUIET_HOURS_DEFAULT_END_MINUTES,
      timeZone: profile.businessTimeZone,
    };
  }

  return {
    startMinutes: configuredStart,
    endMinutes: configuredEnd,
    timeZone: profile.businessTimeZone,
  };
}

function localMinuteAt(timestampMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isWithinQuietHours(timestampMs: number, window: QuietHoursWindow) {
  const localMinute = localMinuteAt(timestampMs, window.timeZone);
  if (window.startMinutes < window.endMinutes) {
    return localMinute >= window.startMinutes && localMinute < window.endMinutes;
  }
  return localMinute >= window.startMinutes || localMinute < window.endMinutes;
}

export function nextAllowedDeliveryAt(timestampMs: number, window: QuietHoursWindow) {
  if (!isWithinQuietHours(timestampMs, window)) return timestampMs;
  for (let offsetMinutes = 1; offsetMinutes <= 26 * 60; offsetMinutes += 1) {
    const candidate = timestampMs + offsetMinutes * MINUTE_MS;
    if (!isWithinQuietHours(candidate, window)) return candidate;
  }
  throw new Error("Unable to calculate the next allowed local delivery time.");
}

async function markRequestDelivered(input: QuietHoursDeliveryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(customerRequests)
    .set({ status: "sent", sentAt: new Date() })
    .where(
      and(
        eq(customerRequests.id, input.customerRequestId),
        eq(customerRequests.userId, input.userId)
      )
    );

  if (input.source === "contacts" && input.sourceRecordId) {
    await db
      .update(savedContacts)
      .set({
        lastSentAt: Date.now(),
        totalSent: sql`${savedContacts.totalSent} + 1`,
      })
      .where(
        and(
          eq(savedContacts.id, input.sourceRecordId),
          eq(savedContacts.userId, input.userId)
        )
      );
  }

  if (input.source === "woocommerce" && input.sourceRecordId) {
    await db
      .update(wooCustomers)
      .set({ reviewRequestSentAt: Date.now() })
      .where(
        and(
          eq(wooCustomers.id, input.sourceRecordId),
          eq(wooCustomers.userId, input.userId)
        )
      );
  }

  if (input.countTowardMonthly !== false) {
    await db
      .update(businessProfiles)
      .set({
        monthlyCount: sql`${businessProfiles.monthlyCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(businessProfiles.userId, input.userId));
  }

  if (input.scheduleFollowUps) {
    const { scheduleFollowUp } = await import("./reminders");
    await scheduleFollowUp(
      input.userId,
      input.customerRequestId,
      input.customerName,
      input.recipientEmail
    );
  }
}

async function deliverImmediately(input: QuietHoursDeliveryInput) {
  const sendLimitStatus = await sendMailViaSmtp({
    userId: input.userId,
    to: input.recipientEmail,
    subject: input.subject,
    html: input.html,
  });
  await markRequestDelivered(input);
  return sendLimitStatus;
}

export async function deliverReviewEmailOrQueue(
  input: QuietHoursDeliveryInput
): Promise<QuietHoursDeliveryResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, input.userId))
    .limit(1);
  if (!profile) throw new Error("Business profile not found");

  const window = resolveQuietHoursWindow(profile);
  const now = Date.now();

  await db
    .update(customerRequests)
    .set({ status: "pending", sentAt: null })
    .where(
      and(
        eq(customerRequests.id, input.customerRequestId),
        eq(customerRequests.userId, input.userId)
      )
    );

  if (isWithinQuietHours(now, window)) {
    const scheduledAt = nextAllowedDeliveryAt(now, window);
    await db.insert(quietHoursQueuedSends).values({
      userId: input.userId,
      customerRequestId: input.customerRequestId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      html: input.html,
      source: input.source,
      sourceRecordId: input.sourceRecordId ?? null,
      templateId: input.templateId ?? null,
      scheduleFollowUps: input.scheduleFollowUps ? 1 : 0,
      scheduledAt,
      status: "pending",
    });
    return { delivery: "queued", scheduledAt, sendLimitStatus: null };
  }

  const sendLimitStatus = await deliverImmediately(input);
  return { delivery: "sent", scheduledAt: null, sendLimitStatus };
}

async function queueInputFromRow(
  row: typeof quietHoursQueuedSends.$inferSelect
): Promise<QuietHoursDeliveryInput> {
  const db = await getDb();
  const [request] = db
    ? await db
        .select({ customerName: customerRequests.customerName })
        .from(customerRequests)
        .where(
          and(
            eq(customerRequests.id, row.customerRequestId),
            eq(customerRequests.userId, row.userId)
          )
        )
        .limit(1)
    : [];
  return {
    userId: row.userId,
    customerRequestId: row.customerRequestId,
    customerName: request?.customerName ?? "Customer",
    recipientEmail: row.recipientEmail,
    subject: row.subject,
    html: row.html,
    source: row.source as QuietHoursDeliverySource,
    sourceRecordId: row.sourceRecordId,
    templateId: row.templateId,
    scheduleFollowUps: row.scheduleFollowUps === 1,
  };
}

function affectedRows(result: unknown) {
  if (Array.isArray(result)) {
    return Number((result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
  }
  return Number((result as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}

export async function processDueQuietHoursQueuedSends() {
  const summary = { checked: 0, sent: 0, deferred: 0, failed: 0, locked: 0 };
  const db = await getDb();
  if (!db) return summary;

  const now = Date.now();
  await db
    .update(quietHoursQueuedSends)
    .set({ status: "pending", claimedAt: null, scheduledAt: now })
    .where(
      and(
        eq(quietHoursQueuedSends.status, "sending"),
        lte(quietHoursQueuedSends.claimedAt, now - CLAIM_WINDOW_MS)
      )
    );

  const due = await db
    .select()
    .from(quietHoursQueuedSends)
    .where(
      and(
        eq(quietHoursQueuedSends.status, "pending"),
        lte(quietHoursQueuedSends.scheduledAt, now)
      )
    )
    .limit(100);

  for (const queued of due) {
    summary.checked += 1;
    const claim = await db
      .update(quietHoursQueuedSends)
      .set({
        status: "sending",
        claimedAt: now,
        attemptCount: sql`${quietHoursQueuedSends.attemptCount} + 1`,
      })
      .where(
        and(
          eq(quietHoursQueuedSends.id, queued.id),
          eq(quietHoursQueuedSends.status, "pending"),
          lte(quietHoursQueuedSends.scheduledAt, now)
        )
      );
    if (affectedRows(claim) !== 1) {
      summary.locked += 1;
      continue;
    }

    try {
      const [profile] = await db
        .select()
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, queued.userId))
        .limit(1);
      if (!profile) {
        await db
          .update(quietHoursQueuedSends)
          .set({ status: "failed", lastError: "Business profile no longer exists." })
          .where(eq(quietHoursQueuedSends.id, queued.id));
        summary.failed += 1;
        continue;
      }

      const window = resolveQuietHoursWindow(profile);
      if (isWithinQuietHours(now, window)) {
        await db
          .update(quietHoursQueuedSends)
          .set({
            status: "pending",
            claimedAt: null,
            scheduledAt: nextAllowedDeliveryAt(now, window),
          })
          .where(eq(quietHoursQueuedSends.id, queued.id));
        summary.deferred += 1;
        continue;
      }

      await deliverImmediately(await queueInputFromRow(queued));
      await db
        .update(quietHoursQueuedSends)
        .set({ status: "sent", sentAt: Date.now(), lastError: null })
        .where(eq(quietHoursQueuedSends.id, queued.id));
      summary.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextStatus = queued.attemptCount + 1 >= MAX_DELIVERY_ATTEMPTS
        ? "failed"
        : "pending";
      await db
        .update(quietHoursQueuedSends)
        .set({
          status: nextStatus,
          claimedAt: null,
          scheduledAt: now + RETRY_DELAY_MS,
          lastError: message.slice(0, 1000),
        })
        .where(eq(quietHoursQueuedSends.id, queued.id));
      summary.failed += 1;
    }
  }

  return summary;
}
