import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  upsertApiContact: vi.fn(),
  fireWebhooks: vi.fn(),
  hasPaidOrAdminAccess: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./contacts", () => ({ upsertApiContact: mocks.upsertApiContact }));
vi.mock("./webhookHelpers", () => ({ fireWebhooks: mocks.fireWebhooks }));
vi.mock("./entitlements", () => ({ hasPaidOrAdminAccess: mocks.hasPaidOrAdminAccess }));

import { ingestKoalendarPayload, processDueKoalendarBookings } from "./koalendar";
import { koalendarBookings, koalendarConnections, users } from "../drizzle/schema";

const TOKEN = "a".repeat(48);
const START = Date.parse("2026-07-16T17:00:00.000Z");
const END = Date.parse("2026-07-16T17:30:00.000Z");

type Booking = Record<string, any>;
type TestState = {
  connection: Record<string, any>;
  bookings: Booking[];
  user: Record<string, any>;
  nextBookingId: number;
};

function payload(overrides: Record<string, any> = {}) {
  return {
    id: "webhook-event-1",
    type: "event.created",
    invitee: {
      name: "  Jane Client  ",
      email: "JANE@EXAMPLE.COM",
      phone: "+1 555 0100",
      fields: { privateAnswer: "must not persist" },
    },
    calendar_event: { id: "calendar-event-123", calendarId: "calendar-1" },
    link: { id: "booking-page-1", slug: "meet-with-steve", name: "Meet with Steve" },
    start_at: new Date(START).toISOString(),
    end_at: new Date(END).toISOString(),
    canceled_at: null,
    cancel_reason: null,
    ...overrides,
  };
}

function createDb(state: TestState) {
  const rowsFor = (table: unknown, ordered: boolean) => {
    if (table === koalendarConnections) return [state.connection];
    if (table === users) return [state.user];
    if (table === koalendarBookings) {
      if (ordered) return state.bookings.filter((booking) => booking.status === "pending" && booking.nextAttemptAt <= Date.now());
      return state.bookings.length > 0 ? [state.bookings[0]] : [];
    }
    return [];
  };

  return {
    select: vi.fn(() => {
      let table: unknown;
      let ordered = false;
      const chain: any = {
        from(value: unknown) { table = value; return chain; },
        leftJoin() { return chain; },
        where() { return chain; },
        orderBy() { ordered = true; return chain; },
        limit(limit: number) { return Promise.resolve(rowsFor(table, ordered).slice(0, limit)); },
      };
      return chain;
    }),
    update: vi.fn((table: unknown) => {
      let patch: Record<string, any> = {};
      let applied = false;
      let changed = false;
      const apply = () => {
        if (applied) return;
        applied = true;
        if (table === koalendarConnections) {
          Object.assign(state.connection, patch);
          changed = true;
          return;
        }
        if (table === koalendarBookings) {
          const target = patch.status === "processing"
            ? state.bookings.find((booking) => booking.status === "pending")
            : state.bookings[0];
          if (target) {
            Object.assign(target, patch);
            changed = true;
          }
        }
      };
      const chain: any = {
        set(value: Record<string, any>) { patch = value; return chain; },
        where() { return chain; },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          apply();
          return Promise.resolve([{ affectedRows: changed ? 1 : 0 }]).then(resolve, reject);
        },
      };
      return chain;
    }),
    insert: vi.fn((table: unknown) => {
      let inserted: Record<string, any> | undefined;
      const chain: any = {
        values(value: Record<string, any>) {
          if (table === koalendarBookings) {
            inserted = { id: state.nextBookingId++, createdAt: Date.now(), ...value };
            state.bookings.push(inserted);
          }
          return chain;
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          return Promise.resolve([{ insertId: inserted?.id ?? 1, affectedRows: 1 }]).then(resolve, reject);
        },
      };
      return chain;
    }),
  };
}

function setupState(): TestState {
  const state: TestState = {
    connection: { id: 10, userId: 1, webhookToken: TOKEN, enabled: true, lastEventAt: null },
    bookings: [],
    user: { role: "user", tier: "lifetime", planExpiresAt: null },
    nextBookingId: 1,
  };
  mocks.getDb.mockResolvedValue(createDb(state));
  return state;
}

describe("Koalendar delayed contact import", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.hasPaidOrAdminAccess.mockReturnValue(true);
    mocks.upsertApiContact.mockResolvedValue({ id: 99, created: true });
    mocks.fireWebhooks.mockResolvedValue(undefined);
  });

  afterEach(() => vi.useRealTimers());

  it("queues only normalized invitee identity and scheduling state until the meeting ends", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    const result = await ingestKoalendarPayload(TOKEN, payload());
    expect(result).toMatchObject({ accepted: true, ignored: false, status: "pending" });
    expect(state.bookings).toHaveLength(1);
    expect(state.bookings[0]).toMatchObject({
      externalBookingId: "calendar-event-123",
      inviteeName: "Jane Client",
      inviteeEmail: "jane@example.com",
      startsAt: START,
      endsAt: END,
      nextAttemptAt: END,
      status: "pending",
    });
    expect(state.bookings[0]).not.toHaveProperty("phone");
    expect(state.bookings[0]).not.toHaveProperty("fields");
    expect(state.bookings[0]).not.toHaveProperty("cancel_reason");
    expect(await processDueKoalendarBookings()).toBe(0);
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
  });

  it("rejects invalid scheduling timestamps as a client error", async () => {
    setupState();
    await expect(ingestKoalendarPayload(TOKEN, payload({ end_at: "not-a-date" }))).resolves.toMatchObject({
      accepted: false,
      statusCode: 400,
    });
  });

  it("excludes a booking canceled before the meeting ends", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    await ingestKoalendarPayload(TOKEN, payload({
      type: "event.canceled",
      canceled_at: new Date(START - 30_000).toISOString(),
      cancel_reason: "Invitee canceled",
    }));
    expect(state.bookings).toHaveLength(1);
    expect(state.bookings[0].status).toBe("canceled");
    vi.setSystemTime(END + 60_000);
    expect(await processDueKoalendarBookings()).toBe(0);
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
  });

  it("updates the queued end time when the same calendar event is rescheduled", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    const laterStart = START + 24 * 60 * 60_000;
    const laterEnd = END + 24 * 60 * 60_000;
    await ingestKoalendarPayload(TOKEN, payload({
      id: "webhook-event-2",
      type: "event.rescheduled",
      start_at: new Date(laterStart).toISOString(),
      end_at: new Date(laterEnd).toISOString(),
    }));
    expect(state.bookings).toHaveLength(1);
    expect(state.bookings[0]).toMatchObject({
      eventType: "event.rescheduled",
      startsAt: laterStart,
      endsAt: laterEnd,
      nextAttemptAt: laterEnd,
      status: "pending",
    });
  });

  it("is idempotent when Koalendar retries the same booking event", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    await ingestKoalendarPayload(TOKEN, payload());
    expect(state.bookings).toHaveLength(1);
  });

  it("imports a due contact once by normalized email and preserves the Koalendar source", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    vi.setSystemTime(END + 1);
    expect(await processDueKoalendarBookings()).toBe(1);
    expect(mocks.upsertApiContact).toHaveBeenCalledWith(1, {
      name: "Jane Client",
      email: "jane@example.com",
      source: "koalendar",
      externalId: "calendar-event-123",
    });
    expect(state.bookings[0]).toMatchObject({ status: "imported", contactId: 99, lastError: null });
    expect(await processDueKoalendarBookings()).toBe(0);
    expect(mocks.upsertApiContact).toHaveBeenCalledTimes(1);
  });

  it("retries a transient import failure and succeeds on the next due attempt", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    mocks.upsertApiContact.mockRejectedValueOnce(new Error("temporary database timeout"));
    vi.setSystemTime(END + 1);
    expect(await processDueKoalendarBookings()).toBe(0);
    expect(state.bookings[0]).toMatchObject({ status: "pending", attempts: 1, lastError: "temporary database timeout" });
    const retryAt = state.bookings[0].nextAttemptAt;
    vi.setSystemTime(retryAt + 1);
    expect(await processDueKoalendarBookings()).toBe(1);
    expect(state.bookings[0].status).toBe("imported");
    expect(mocks.upsertApiContact).toHaveBeenCalledTimes(2);
  });

  it("accepts but ignores webhook events when paid access has expired", async () => {
    const state = setupState();
    mocks.hasPaidOrAdminAccess.mockReturnValue(false);
    await expect(ingestKoalendarPayload(TOKEN, payload())).resolves.toEqual({
      accepted: true,
      ignored: true,
      reason: "paid_plan_required",
    });
    expect(state.bookings).toHaveLength(0);
  });

  it("blocks a queued import if the subscription expires before meeting end", async () => {
    vi.setSystemTime(START - 60_000);
    const state = setupState();
    await ingestKoalendarPayload(TOKEN, payload());
    mocks.hasPaidOrAdminAccess.mockReturnValue(false);
    vi.setSystemTime(END + 1);
    expect(await processDueKoalendarBookings()).toBe(1);
    expect(mocks.upsertApiContact).not.toHaveBeenCalled();
    expect(state.bookings[0]).toMatchObject({
      status: "blocked",
      lastError: "A paid Get Phame plan is required at import time.",
    });
  });
});
