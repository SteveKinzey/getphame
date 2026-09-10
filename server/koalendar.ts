import type { Express, Request, Response } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, count, desc, eq, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  businessProfiles,
  koalendarBookings,
  koalendarConnections,
  users,
  type KoalendarBooking,
} from "../drizzle/schema";
import { hasPaidOrAdminAccess } from "./entitlements";
import { findActiveComplimentaryAccess } from "./complimentaryAccess";
import { upsertApiContact } from "./contacts";
import { fireWebhooks } from "./webhookHelpers";

const PUBLIC_BASE_URL = (
  process.env.APP_BASE_URL ?? "https://getphame.app"
).replace(/\/$/, "");
const MAX_IMPORT_ATTEMPTS = 5;

const koalendarPayloadSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    type: z.enum([
      "event.created",
      "event.tentative",
      "event.rescheduled",
      "event.canceled",
    ]),
    invitee: z
      .object({
        name: z.string().trim().min(1).max(255),
        email: z.string().trim().email().max(320),
      })
      .passthrough(),
    calendar_event: z
      .object({
        id: z.union([z.string(), z.number()]),
      })
      .passthrough()
      .optional()
      .nullable(),
    start_at: z.string(),
    end_at: z.string(),
    canceled_at: z.string().optional().nullable(),
  })
  .passthrough();

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
  if (!Number.isFinite(timestamp))
    throw new Error(`${field} must be a valid ISO date-time.`);
  return timestamp;
}

function bookingKey(payload: KoalendarPayload): string {
  return String(payload.calendar_event?.id ?? payload.id).slice(0, 512);
}

async function userHasPaidKoalendarAccess(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .select({
      role: users.role,
      email: users.email,
      tier: businessProfiles.tier,
      planExpiresAt: businessProfiles.planExpiresAt,
    })
    .from(users)
    .leftJoin(businessProfiles, eq(businessProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return false;
  const complimentaryAccess =
    row.role === "admin"
      ? null
      : await findActiveComplimentaryAccess({ userId, email: row.email });
  return hasPaidOrAdminAccess({
    role: row.role,
    tier: row.tier ?? "free",
    planExpiresAt: row.planExpiresAt,
    complimentaryAccessExpiresAt: complimentaryAccess?.expiresAt,
  });
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
    webhookUrl: connection
      ? buildKoalendarWebhookUrl(connection.webhookToken)
      : null,
    lastEventAt: connection?.lastEventAt ?? null,
    recentBookings,
  };
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "Hidden";
  return `${local.slice(0, 1) || "*"}***@${domain}`;
}

export async function listFailedKoalendarBookings(page = 1, pageSize = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(50, Math.max(10, Math.trunc(pageSize)));
  const [totalRow] = await db
    .select({ value: count() })
    .from(koalendarBookings)
    .where(eq(koalendarBookings.status, "failed"));
  const total = Number(totalRow?.value ?? 0);
  const rows = await db
    .select({
      id: koalendarBookings.id,
      userId: koalendarBookings.userId,
      accountName: users.name,
      accountEmail: users.email,
      inviteeName: koalendarBookings.inviteeName,
      inviteeEmail: koalendarBookings.inviteeEmail,
      externalBookingId: koalendarBookings.externalBookingId,
      eventType: koalendarBookings.eventType,
      endsAt: koalendarBookings.endsAt,
      attempts: koalendarBookings.attempts,
      nextAttemptAt: koalendarBookings.nextAttemptAt,
      lastError: koalendarBookings.lastError,
      updatedAt: koalendarBookings.updatedAt,
    })
    .from(koalendarBookings)
    .innerJoin(users, eq(koalendarBookings.userId, users.id))
    .where(eq(koalendarBookings.status, "failed"))
    .orderBy(desc(koalendarBookings.updatedAt))
    .limit(safePageSize)
    .offset((safePage - 1) * safePageSize);

  return {
    bookings: rows.map(
      ({ externalBookingId, inviteeEmail, lastError, ...row }) => ({
        ...row,
        inviteeEmail: maskEmail(inviteeEmail),
        bookingReference: externalBookingId.slice(0, 64),
        lastError: lastError?.slice(0, 500) ?? null,
      })
    ),
    page: safePage,
    pageSize: safePageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / safePageSize)),
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
    await db
      .update(koalendarConnections)
      .set({ enabled: true, updatedAt: Date.now() })
      .where(eq(koalendarConnections.id, existing.id));
    return { webhookUrl: buildKoalendarWebhookUrl(existing.webhookToken) };
  }
  const webhookToken = randomBytes(24).toString("hex");
  await db
    .insert(koalendarConnections)
    .values({ userId, webhookToken, enabled: true });
  return { webhookUrl: buildKoalendarWebhookUrl(webhookToken) };
}

export async function rotateKoalendarWebhook(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const webhookToken = randomBytes(24).toString("hex");
  const [result] = await db
    .update(koalendarConnections)
    .set({ webhookToken, enabled: true, updatedAt: Date.now() })
    .where(eq(koalendarConnections.userId, userId));
  if (result.affectedRows === 0) return connectKoalendar(userId);
  return { webhookUrl: buildKoalendarWebhookUrl(webhookToken) };
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

export async function ingestKoalendarPayload(
  token: string,
  rawPayload: unknown
) {
  const parsed = koalendarPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return {
      accepted: false as const,
      statusCode: 400,
      error: "Invalid Koalendar webhook payload.",
    };
  }
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [connection] = await db
    .select()
    .from(koalendarConnections)
    .where(
      and(
        eq(koalendarConnections.webhookToken, token),
        eq(koalendarConnections.enabled, true)
      )
    )
    .limit(1);
  if (!connection)
    return {
      accepted: false as const,
      statusCode: 404,
      error: "Koalendar connection not found.",
    };
  if (!(await userHasPaidKoalendarAccess(connection.userId))) {
    return {
      accepted: true as const,
      ignored: true,
      reason: "paid_plan_required",
    };
  }

  const payload = parsed.data;
  let startsAt: number;
  let endsAt: number;
  let canceledAt: number | null;
  try {
    startsAt = parseIsoTimestamp(payload.start_at, "start_at");
    endsAt = parseIsoTimestamp(payload.end_at, "end_at");
    if (endsAt <= startsAt)
      throw new Error("end_at must be later than start_at.");
    canceledAt =
      payload.type === "event.canceled" || Boolean(payload.canceled_at)
        ? payload.canceled_at
          ? parseIsoTimestamp(payload.canceled_at, "canceled_at")
          : Date.now()
        : null;
  } catch (error) {
    return {
      accepted: false as const,
      statusCode: 400,
      error:
        error instanceof Error ? error.message : "Invalid scheduling data.",
    };
  }

  const externalBookingId = bookingKey(payload);
  const now = Date.now();
  const [existing] = await db
    .select()
    .from(koalendarBookings)
    .where(
      and(
        eq(koalendarBookings.userId, connection.userId),
        eq(koalendarBookings.externalBookingId, externalBookingId)
      )
    )
    .limit(1);
  const status = canceledAt
    ? existing?.status === "imported"
      ? "imported"
      : "canceled"
    : existing?.status === "imported"
      ? "imported"
      : "pending";
  const values = {
    connectionId: connection.id,
    eventType: payload.type,
    status,
    inviteeName: payload.invitee.name.trim().slice(0, 255),
    inviteeEmail: payload.invitee.email.trim().toLowerCase().slice(0, 320),
    startsAt,
    endsAt,
    canceledAt,
    attempts: status === "pending" ? 0 : (existing?.attempts ?? 0),
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
    await db
      .insert(koalendarBookings)
      .values({ userId: connection.userId, externalBookingId, ...values });
  }
  await db
    .update(koalendarConnections)
    .set({ lastEventAt: now, updatedAt: now })
    .where(eq(koalendarConnections.id, connection.id));
  return { accepted: true as const, ignored: false, status };
}

type KoalendarDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function importClaimedKoalendarBooking(
  db: KoalendarDb,
  booking: KoalendarBooking
) {
  if (booking.canceledAt) {
    await db
      .update(koalendarBookings)
      .set({ status: "canceled", lastError: null, updatedAt: Date.now() })
      .where(eq(koalendarBookings.id, booking.id));
    return { outcome: "canceled" as const, contactId: null, created: false };
  }
  if (!(await userHasPaidKoalendarAccess(booking.userId))) {
    await db
      .update(koalendarBookings)
      .set({
        status: "blocked",
        lastError: "A paid Get Phame plan is required at import time.",
        updatedAt: Date.now(),
      })
      .where(eq(koalendarBookings.id, booking.id));
    return { outcome: "blocked" as const, contactId: null, created: false };
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
  return {
    outcome: "imported" as const,
    contactId: result.id,
    created: result.created,
  };
}

export async function retryFailedKoalendarBooking(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const [booking] = await db
    .select()
    .from(koalendarBookings)
    .where(eq(koalendarBookings.id, bookingId))
    .limit(1);
  if (!booking) return { outcome: "not_found" as const, bookingId };
  if (
    booking.status !== "failed" ||
    booking.endsAt > now ||
    booking.canceledAt
  ) {
    return {
      outcome: "not_eligible" as const,
      bookingId,
      status: booking.status,
    };
  }

  const [claim] = await db
    .update(koalendarBookings)
    .set({ status: "processing", updatedAt: now })
    .where(
      and(
        eq(koalendarBookings.id, bookingId),
        eq(koalendarBookings.status, "failed"),
        lte(koalendarBookings.endsAt, now)
      )
    );
  if (claim.affectedRows === 0) {
    const [current] = await db
      .select({ status: koalendarBookings.status })
      .from(koalendarBookings)
      .where(eq(koalendarBookings.id, bookingId))
      .limit(1);
    return {
      outcome: "not_eligible" as const,
      bookingId,
      status: current?.status ?? "missing",
    };
  }

  try {
    const result = await importClaimedKoalendarBooking(db, booking);
    return { ...result, bookingId };
  } catch (error) {
    const attempts = booking.attempts + 1;
    const errorMessage =
      error instanceof Error
        ? error.message.slice(0, 2000)
        : "Unknown import error";
    await db
      .update(koalendarBookings)
      .set({
        status: "failed",
        attempts,
        nextAttemptAt: now,
        lastError: errorMessage,
        updatedAt: Date.now(),
      })
      .where(eq(koalendarBookings.id, booking.id));
    return {
      outcome: "failed" as const,
      bookingId,
      attempts,
      error: errorMessage,
    };
  }
}

export async function processDueKoalendarBookings(
  limit = 100
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const due = await db
    .select()
    .from(koalendarBookings)
    .where(
      and(
        eq(koalendarBookings.status, "pending"),
        lte(koalendarBookings.nextAttemptAt, Date.now())
      )
    )
    .orderBy(koalendarBookings.nextAttemptAt)
    .limit(limit);
  let processed = 0;
  for (const booking of due) {
    const [claim] = await db
      .update(koalendarBookings)
      .set({ status: "processing", updatedAt: Date.now() })
      .where(
        and(
          eq(koalendarBookings.id, booking.id),
          eq(koalendarBookings.status, "pending")
        )
      );
    if (claim.affectedRows === 0) continue;
    try {
      await importClaimedKoalendarBooking(db, booking);
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
          lastError:
            error instanceof Error
              ? error.message.slice(0, 2000)
              : "Unknown import error",
          updatedAt: Date.now(),
        })
        .where(eq(koalendarBookings.id, booking.id));
    }
  }
  return processed;
}

export function registerKoalendarRoutes(app: Express) {
  app.post(
    "/api/integrations/koalendar/:token",
    async (req: Request, res: Response) => {
      const token = req.params.token ?? "";
      if (!/^[a-f0-9]{48}$/.test(token))
        return res
          .status(404)
          .json({ error: "Koalendar connection not found." });
      if (!webhookWithinRateLimit(token))
        return res.status(429).json({ error: "Webhook rate limit exceeded." });
      try {
        const result = await ingestKoalendarPayload(token, req.body);
        if (!result.accepted)
          return res.status(result.statusCode).json({ error: result.error });
        return res.status(202).json(result);
      } catch (error) {
        console.error("[Koalendar] Webhook error:", error);
        return res
          .status(500)
          .json({ error: "Unable to process Koalendar webhook." });
      }
    }
  );
}
