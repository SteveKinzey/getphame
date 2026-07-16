import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  businessProfiles,
  koalendarBookings,
  koalendarConnections,
  users,
} from "../drizzle/schema";
import { hasActivePaidEntitlement } from "./_core/trpc";
import { upsertApiContact } from "./contacts";
import { fireWebhooks } from "./webhookHelpers";

const PUBLIC_BASE_URL = (process.env.APP_BASE_URL ?? "https://getphame.app").replace(/\/$/, "");
const PROCESS_INTERVAL_MS = 60_000;
const MAX_IMPORT_ATTEMPTS = 5;

const koalendarPayloadSchema = z.object({
  id: z.union([z.string(), z.number()]),
  type: z.enum([
    "event.created",
    "event.tentative",
    "event.rescheduled",
    "event.canceled",
  ]),
  invitee: z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().email().max(320),
    fields: z.unknown().optional(),
  }).passthrough(),
  calendar_event: z.object({
    id: z.union([z.string(), z.number()]),
    calendarId: z.union([z.string(), z.number()]).optional(),
  }).passthrough().optional().nullable(),
  link: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    slug: z.string().optional(),
    name: z.string().optional(),
  }).passthrough().optional().nullable(),
  start_at: z.string(),
  end_at: z.string(),
  canceled_at: z.string().optional().nullable(),
  cancel_reason: z.string().optional().nullable(),
}).passthrough();

export type KoalendarPayload = z.infer<typeof koalendarPayloadSchema>;

const webhookRateLimits = new Map<string, { count: number; resetAt: number }>();

function webhookWithinRateLimit(token: string): boolean {
  const now = Date.now();
  const current = webhookRateLimits.get(token);
  if (!current || current.resetAt <= now) {
    webhookRateLimits.set(token, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 120) return false;
  current.count += 1;
  return true;
}

function parseIsoTimestamp(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${field} must be a valid ISO date-time.`);
  }
  return timestamp;
}

function bookingKey(payload: KoalendarPayload): string {
  const key = payload.calendar_event?.id ?? payload.id;
  return String(key).slice(0, 512);
}

async function userHasPaidKoalendarAccess(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [row] = await db
    .select({
      role: users.role,
      tier: businessProfiles.tier,
      planExpiresAt: businessProfiles.planExpiresAt,
    })
    .from(users)
    .leftJoin(businessProfiles, eq(businessProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return false;
  return hasActivePaidEntitlement(row);
}

export function buildKoalendarWebhookUrl(token: string): string {
  return `${PUBLIC_BASE_URL}/api/integrations/koalendar/${token}`;
}

export async function getKoalendarConnectionStatus(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [connection] = await db
    .select()
    .from(koalendarConnections)
    .where(eq(koalendarConnections.userId, userId))
    .limit(1);

  const recentBookings = await db
    .select({
      id: koalendarBookings.id,
      inviteeName: koalendarBookings.inviteeName,
      inviteeEmail: koalendarBookings.inviteeEmail,
      bookingPageName: koalendarBookings.bookingPageName,
      startsAt: koalendarBookings.startsAt,
      endsAt: koalendarBookings.endsAt,
      status: koalendarBookings.status,
      importedAt: koalendarBookings.importedAt,
      lastError: koalendarBookings.lastError,
    })
    .from(koalendarBookings)
    .where(eq(koalendarBookings.userId, userId))
    .orderBy(desc(koalendarBookings.updatedAt))
    .limit(10);

  return {
    connected: Boolean(connection),
    enabled: connection?.enabled ?? false,
    webhookUrl: connection ? buildKoalendarWebhookUrl(connection.webhookToken) : null,
    lastEventAt: connection?.lastEventAt ?? null,
    recentBookings,
  };
}

export async function connectKoalendar(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select()
    .from(koalendarConnections)
    .where(eq(koalendarConnections.userId, userId))
    .limit(1);

  if (existing) {
    const [connection] = await db
      .update(koalendarConnections)
      .set({ enabled: true, updatedAt: Date.now() })
      .where(eq(koalendarConnections.id, existing.id))
      .returning();
    return { webhookUrl: buildKoalendarWebhookUrl(connection.webhookToken) };
  }

  const webhookToken = randomBytes(24).toString("hex");
  const [connection] = await db
    .insert(koalendarConnections)
    .values({ userId, webhookToken, enabled: true })
    .returning();

  return { webhookUrl: buildKoalendarWebhookUrl(connection.webhookToken) };
}

export async function rotateKoalendarWebhook(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const webhookToken = randomBytes(24).toString("hex");
  const [connection] = await db
    .update(koalendarConnections)
    .set({ webhookToken, enabled: true, updatedAt: Date.now() })
    .where(eq(koalendarConnections.userId, userId))
    .returning();

  if (!connection) return connectKoalendar(userId);
  return { webhookUrl: buildKoalendarWebhookUrl(connection.webhookToken) };
}

export async function disconnectKoalendar(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(koalendarConnections)
    .set({ enabled: false, updatedAt: Date.now() })
    .where(eq(koalendarConnections.userId, userId));

  return { success: true };
}

export async function ingestKoalendarPayload(token: string, rawPayload: unknown) {
  const parsed = koalendarPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { accepted: false as const, statusCode: 400, error: "Invalid Koalendar webhook payload." };
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [connection] = await db
    .select()
    .from(koalendarConnections)
    .where(and(
      eq(koalendarConnections.webhookToken, token),
      eq(koalendarConnections.enabled, true),
    ))
    .limit(1);

  if (!connection) {
    return { accepted: false as const, statusCode: 404, error: "Koalendar connection not found." };
  }

  if (!(await userHasPaidKoalendarAccess(connection.userId))) {
    return { accepted: true as const, ignored: true, reason: "paid_plan_required" };
  }

  const payload = parsed.data;
  const startsAt = parseIsoTimestamp(payload.start_at, "start_at");
  const endsAt = parseIsoTimestamp(payload.end_at, "end_at");
  if (endsAt <= startsAt) {
    return { accepted: false as const, statusCode: 400, error: "end_at must be later than start_at." };
  }

  const externalBookingId = bookingKey(payload);
  const isCanceled = payload.type === "event.canceled" || Boolean(payload.canceled_at);
  const now = Date.now();
  const canceledAt = isCanceled
    ? payload.canceled_at
      ? parseIsoTimestamp(payload.canceled_at, "canceled_at")
      : now
    : null;

  const [existing] = await db
    .select()
    .from(koalendarBookings)
    .where(and(
      eq(koalendarBookings.userId, connection.userId),
      eq(koalendarBookings.externalBookingId, externalBookingId),
    ))
    .limit(1);

  const status = isCanceled
    ? existing?.status === "imported" ? "imported" : "canceled"
    : existing?.status === "imported" ? "imported" : "pending";

  const values = {
    connectionId: connection.id,
    eventType: payload.type,
    status,
    inviteeName: payload.invitee.name.trim().slice(0, 255),
    inviteeEmail: payload.invitee.email.trim().toLowerCase().slice(0, 320),
    bookingPageId: payload.link?.id ? String(payload.link.id).slice(0, 128) : null,
    bookingPageName: payload.link?.name?.slice(0, 255) ?? null,
    startsAt,
    endsAt,
    canceledAt,
    attempts: status === "pending" ? 0 : existing?.attempts ?? 0,
    nextAttemptAt: endsAt,
    lastError: null,
    updatedAt: now,
  };

  if (existing) {
    await db
      .update(koalendarBookings)
      .set(values)
      .where(eq(koalendarBookings.id, existing.id));
  } else {
    await db.insert(koalendarBookings).values({
      userId: connection.userId,
      externalBookingId,
      ...values,
    });
  }

  await db
    .update(koalendarConnections)
    .set({ lastEventAt: now, updatedAt: now })
    .where(eq(koalendarConnections.id, connection.id));

  return { accepted: true as const, ignored: false, status };
}

export async function processDueKoalendarBookings(limit = 100): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = Date.now();
  const due = await db
    .select()
    .from(koalendarBookings)
    .where(and(
      eq(koalendarBookings.status, "pending"),
      lte(koalendarBookings.nextAttemptAt, now),
    ))
    .orderBy(koalendarBookings.nextAttemptAt)
    .limit(limit);

  let processed = 0;
  for (const booking of due) {
    const [claimed] = await db
      .update(koalendarBookings)
      .set({ status: "processing", updatedAt: Date.now() })
      .where(and(
        eq(koalendarBookings.id, booking.id),
        eq(koalendarBookings.status, "pending"),
      ))
      .returning({ id: koalendarBookings.id });
    if (!claimed) continue;

    try {
      if (!(await userHasPaidKoalendarAccess(booking.userId))) {
        await db
          .update(koalendarBookings)
          .set({
            status: "blocked",
            lastError: "A paid Get Phame plan is required at import time.",
            updatedAt: Date.now(),
          })
          .where(eq(koalendarBookings.id, booking.id));
        processed += 1;
        continue;
      }

      const result = await upsertApiContact(booking.userId, {
        name: booking.inviteeName,
        email: booking.inviteeEmail,
        source: "koalendar",
        externalId: booking.externalBookingId,
      });

      await db
        .update(koalendarBookings)
        .set({
          status: "imported",
          contactId: result.id,
          importedAt: Date.now(),
          lastError: null,
          updatedAt: Date.now(),
        })
        .where(eq(koalendarBookings.id, booking.id));

      if (result.created) {
        fireWebhooks(booking.userId, "contact.created", {
          contactId: result.id,
          email: booking.inviteeEmail,
          name: booking.inviteeName,
          source: "koalendar",
        }).catch(() => {});
      }
      processed += 1;
    } catch (error) {
      const attempts = booking.attempts + 1;
      const retryDelay = Math.min(60 * 60_000, 2 ** attempts * 60_000);
      await db
        .update(koalendarBookings)
        .set({
          status: attempts >= MAX_IMPORT_ATTEMPTS ? "failed" : "pending",
          attempts,
          nextAttemptAt: Date.now() + retryDelay,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : "Unknown import error",
          updatedAt: Date.now(),
        })
        .where(eq(koalendarBookings.id, booking.id));
    }
  }

  return processed;
}

let schedulerStarted = false;
let schedulerRunning = false;

export function startKoalendarScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = async () => {
    if (schedulerRunning) return;
    schedulerRunning = true;
    try {
      const processed = await processDueKoalendarBookings();
      if (processed > 0) console.log(`[Koalendar] Processed ${processed} due booking(s).`);
    } catch (error) {
      console.error("[Koalendar] Scheduler error:", error);
    } finally {
      schedulerRunning = false;
    }
  };

  setTimeout(run, 5_000);
  setInterval(run, PROCESS_INTERVAL_MS);
  console.log("[Koalendar] Delayed import scheduler started.");
}

export function registerKoalendarRoutes(app: Express) {
  app.post("/api/integrations/koalendar/:token", async (req: Request, res: Response) => {
    const token = req.params.token ?? "";
    if (!/^[a-f0-9]{48}$/.test(token)) {
      return res.status(404).json({ error: "Koalendar connection not found." });
    }
    if (!webhookWithinRateLimit(token)) {
      return res.status(429).json({ error: "Webhook rate limit exceeded." });
    }

    try {
      const result = await ingestKoalendarPayload(token, req.body);
      if (!result.accepted) {
        return res.status(result.statusCode).json({ error: result.error });
      }
      return res.status(202).json(result);
    } catch (error) {
      console.error("[Koalendar] Webhook error:", error);
      return res.status(500).json({ error: "Unable to process Koalendar webhook." });
    }
  });
}
