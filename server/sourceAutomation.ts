import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, lte, or, sql } from "drizzle-orm";
import {
  contactConsentEvidence,
  savedContacts,
  sourceAutomationEvents,
  sourceAutomationSchedulers,
  sourceConnections,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  consentTextHash,
  type ReviewOutreachConsent,
} from "./integrationExpansion";

const SOURCE_AUTOMATION_CLAIM_MS = 15 * 60_000;
const SOURCE_AUTOMATION_MAX_ATTEMPTS = 3;
const SOURCE_AUTOMATION_SCHEDULE_KEY = "global";
export const SOURCE_AUTOMATION_CRON = "0 */5 * * * *";

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { affectedRows?: number } | undefined;
    return Number(header?.affectedRows ?? 0);
  }
  return Number(
    (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
}

function publicId(prefix: "ce" | "sa") {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export async function claimSourceAutomationEvent(params: {
  userId: number;
  sourceConnectionId: number;
  apiKeyId: number;
  sourceEventId: string;
  requestHash: string;
  eventType?: "review_request";
  contactId?: number | null;
  templateId?: number | null;
  platformId?: number | null;
  preferredLocale?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lookup = async () => {
    const [event] = await db
      .select()
      .from(sourceAutomationEvents)
      .where(
        and(
          eq(sourceAutomationEvents.userId, params.userId),
          eq(
            sourceAutomationEvents.sourceConnectionId,
            params.sourceConnectionId
          ),
          eq(sourceAutomationEvents.sourceEventId, params.sourceEventId)
        )
      )
      .limit(1);
    return event ?? null;
  };
  const existing = await lookup();
  if (existing) {
    if (existing.requestHash !== params.requestHash)
      return { kind: "conflict" as const, event: existing };
    return { kind: "replay" as const, event: existing };
  }
  try {
    const now = Date.now();
    const [result] = await db
      .insert(sourceAutomationEvents)
      .values({
        publicId: publicId("sa"),
        userId: params.userId,
        sourceConnectionId: params.sourceConnectionId,
        apiKeyId: params.apiKeyId,
        sourceEventId: params.sourceEventId,
        requestHash: params.requestHash,
        eventType: params.eventType ?? "review_request",
        contactId: params.contactId ?? null,
        templateId: params.templateId ?? null,
        platformId: params.platformId ?? null,
        preferredLocale: params.preferredLocale ?? "en",
        status: "processing",
        attemptCount: 1,
        lastAttemptAt: now,
        claimExpiresAt: now + SOURCE_AUTOMATION_CLAIM_MS,
      })
      .$returningId();
    return { kind: "claimed" as const, eventId: result.id };
  } catch {
    const raced = await lookup();
    if (!raced) throw new Error("Source event could not be claimed.");
    if (raced.requestHash !== params.requestHash)
      return { kind: "conflict" as const, event: raced };
    return { kind: "replay" as const, event: raced };
  }
}

export async function completeSourceAutomationEvent(params: {
  userId: number;
  eventId: number;
  sourceConnectionId: number;
  status: "dry_run" | "scheduled" | "queued" | "sent" | "suppressed" | "failed";
  contactId?: number | null;
  customerRequestId?: number | null;
  errorCode?: string | null;
  scheduledAt?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  await db
    .update(sourceAutomationEvents)
    .set({
      status: params.status,
      contactId: params.contactId ?? null,
      customerRequestId: params.customerRequestId ?? null,
      errorCode: params.errorCode?.slice(0, 64) ?? null,
      scheduledAt: params.scheduledAt ?? null,
      claimExpiresAt: null,
      ...(params.status === "scheduled"
        ? { attemptCount: 0, lastAttemptAt: null }
        : {}),
      completedAt: params.status === "scheduled" ? null : now,
    })
    .where(
      and(
        eq(sourceAutomationEvents.userId, params.userId),
        eq(sourceAutomationEvents.id, params.eventId)
      )
    );
  await db
    .update(sourceConnections)
    .set({
      lastAutomationAt: now,
      updatedAt: now,
      ...(params.status === "dry_run" ? { dryRunCompletedAt: now } : {}),
    })
    .where(
      and(
        eq(sourceConnections.userId, params.userId),
        eq(sourceConnections.id, params.sourceConnectionId)
      )
    );
}

export async function attachContactToSourceAutomationEvent(params: {
  userId: number;
  eventId: number;
  contactId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(sourceAutomationEvents)
    .set({
      contactId: params.contactId,
    })
    .where(
      and(
        eq(sourceAutomationEvents.userId, params.userId),
        eq(sourceAutomationEvents.id, params.eventId),
        eq(sourceAutomationEvents.status, "processing")
      )
    );
}

export async function getSourceAutomationScheduler() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(sourceAutomationSchedulers)
    .where(
      eq(sourceAutomationSchedulers.scheduleKey, SOURCE_AUTOMATION_SCHEDULE_KEY)
    )
    .limit(1);
  return row ?? null;
}

export async function getSourceAutomationSchedulerByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(sourceAutomationSchedulers)
    .where(eq(sourceAutomationSchedulers.scheduleCronTaskUid, taskUid))
    .limit(1);
  return row ?? null;
}

export async function saveSourceAutomationSchedulerTaskUid(
  taskUid: string,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(sourceAutomationSchedulers)
    .values({
      scheduleKey: SOURCE_AUTOMATION_SCHEDULE_KEY,
      scheduleCronTaskUid: taskUid,
      cronExpression: SOURCE_AUTOMATION_CRON,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: taskUid,
        cronExpression: SOURCE_AUTOMATION_CRON,
        updatedAt: now,
      },
    });
}

export async function claimSourceAutomationSchedulerRun(
  taskUid: string,
  dedupWindowMs: number,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(sourceAutomationSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: "running",
      lastRunErrorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(sourceAutomationSchedulers.scheduleCronTaskUid, taskUid),
        or(
          isNull(sourceAutomationSchedulers.lastRunAt),
          lte(sourceAutomationSchedulers.lastRunAt, now - dedupWindowMs)
        )
      )
    );
  return getAffectedRows(result) === 1;
}

export async function recordSourceAutomationSchedulerRun(params: {
  taskUid: string;
  status: "ok" | "failed";
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = params.now ?? Date.now();
  await db
    .update(sourceAutomationSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: params.status,
      lastRunErrorCode: params.errorCode?.slice(0, 64) ?? null,
      updatedAt: now,
    })
    .where(eq(sourceAutomationSchedulers.scheduleCronTaskUid, params.taskUid));
}

export async function claimDueSourceAutomationEvent(now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [candidate] = await db
    .select()
    .from(sourceAutomationEvents)
    .where(
      or(
        and(
          eq(sourceAutomationEvents.status, "scheduled"),
          lte(sourceAutomationEvents.scheduledAt, now),
          or(
            isNull(sourceAutomationEvents.claimExpiresAt),
            lte(sourceAutomationEvents.claimExpiresAt, now)
          )
        ),
        and(
          eq(sourceAutomationEvents.status, "processing"),
          lte(sourceAutomationEvents.claimExpiresAt, now)
        )
      )
    )
    .orderBy(
      asc(sourceAutomationEvents.scheduledAt),
      asc(sourceAutomationEvents.id)
    )
    .limit(1);
  if (!candidate) return null;
  const claimExpiresAt = now + SOURCE_AUTOMATION_CLAIM_MS;
  const claimResult = await db
    .update(sourceAutomationEvents)
    .set({
      status: "processing",
      lastAttemptAt: now,
      claimExpiresAt,
      attemptCount: sql`${sourceAutomationEvents.attemptCount} + 1`,
    })
    .where(
      and(
        eq(sourceAutomationEvents.id, candidate.id),
        eq(sourceAutomationEvents.status, candidate.status),
        or(
          isNull(sourceAutomationEvents.claimExpiresAt),
          lte(sourceAutomationEvents.claimExpiresAt, now)
        )
      )
    );
  if (getAffectedRows(claimResult) !== 1) return null;
  const [claimed] = await db
    .select()
    .from(sourceAutomationEvents)
    .where(
      and(
        eq(sourceAutomationEvents.id, candidate.id),
        eq(sourceAutomationEvents.status, "processing"),
        eq(sourceAutomationEvents.claimExpiresAt, claimExpiresAt)
      )
    )
    .limit(1);
  return claimed ?? null;
}

export async function getSourceAutomationDeliveryContext(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [event] = await db
    .select()
    .from(sourceAutomationEvents)
    .where(eq(sourceAutomationEvents.id, eventId))
    .limit(1);
  if (!event || !event.contactId) return null;
  const [contact] = await db
    .select()
    .from(savedContacts)
    .where(
      and(
        eq(savedContacts.id, event.contactId),
        eq(savedContacts.userId, event.userId)
      )
    )
    .limit(1);
  const [source] = await db
    .select()
    .from(sourceConnections)
    .where(
      and(
        eq(sourceConnections.id, event.sourceConnectionId),
        eq(sourceConnections.userId, event.userId)
      )
    )
    .limit(1);
  if (!contact || !source) return null;
  return { event, contact, source };
}

export async function retryOrFailSourceAutomationEvent(params: {
  userId: number;
  eventId: number;
  attemptCount: number;
  errorCode: string;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = params.now ?? Date.now();
  const failed = params.attemptCount >= SOURCE_AUTOMATION_MAX_ATTEMPTS;
  const scheduledAt = failed
    ? null
    : now +
      Math.min(60, 5 * 2 ** Math.max(0, params.attemptCount - 1)) * 60_000;
  await db
    .update(sourceAutomationEvents)
    .set({
      status: failed ? "failed" : "scheduled",
      errorCode: params.errorCode.slice(0, 64),
      scheduledAt,
      claimExpiresAt: null,
      completedAt: failed ? now : null,
    })
    .where(
      and(
        eq(sourceAutomationEvents.userId, params.userId),
        eq(sourceAutomationEvents.id, params.eventId)
      )
    );
  return { failed, scheduledAt };
}

export async function recordConsentEvidence(params: {
  userId: number;
  sourceConnectionId: number;
  sourceSubmissionId: string;
  contactId: number;
  consent: ReviewOutreachConsent;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const hash = consentTextHash(params.consent.text);
  const [existing] = await db
    .select()
    .from(contactConsentEvidence)
    .where(
      and(
        eq(contactConsentEvidence.userId, params.userId),
        eq(
          contactConsentEvidence.sourceSubmissionId,
          params.sourceSubmissionId
        ),
        eq(contactConsentEvidence.purpose, params.consent.purpose)
      )
    )
    .limit(1);
  if (existing) {
    const same =
      existing.consentTextHash === hash &&
      existing.consentVersion === params.consent.version &&
      existing.contactId === params.contactId;
    if (!same)
      throw new Error(
        "Consent evidence conflicts with the existing source submission."
      );
    return existing;
  }
  const [result] = await db
    .insert(contactConsentEvidence)
    .values({
      publicId: publicId("ce"),
      userId: params.userId,
      contactId: params.contactId,
      sourceConnectionId: params.sourceConnectionId,
      sourceSubmissionId: params.sourceSubmissionId,
      purpose: params.consent.purpose,
      channel: params.consent.channel,
      basis: params.consent.basis,
      confirmed: true,
      capturedAt: Date.parse(params.consent.capturedAt),
      source: params.consent.source,
      consentText: params.consent.text,
      consentTextHash: hash,
      consentVersion: params.consent.version,
      privacyPolicyUrl: params.consent.privacyPolicyUrl,
    })
    .$returningId();
  return { id: result.id };
}
