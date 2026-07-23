import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import {
  complimentaryAccessGrants,
  users,
  type ComplimentaryAccessGrant,
  type InsertComplimentaryAccessGrant,
} from "../drizzle/schema";
import {
  fingerprintAuthValue,
  maskDiagnosticEmail,
  normalizeDiagnosticEmail,
} from "./authOperations";
import { getDb } from "./db";

export const COMPLIMENTARY_ACCESS_LIMITS = {
  day: 365,
  month: 24,
  year: 5,
} as const;

export type ComplimentaryAccessDurationUnit = keyof typeof COMPLIMENTARY_ACCESS_LIMITS;
export type ComplimentaryAccessStatus = "active" | "expired" | "revoked";

export type ComplimentaryAccessSnapshot = {
  id: number;
  emailMasked: string;
  accountLinked: boolean;
  durationValue: number;
  durationUnit: ComplimentaryAccessDurationUnit;
  startsAt: number;
  expiresAt: number;
  note: string | null;
  status: ComplimentaryAccessStatus;
  revokedAt: number | null;
  createdAt: number;
};

export class ComplimentaryAccessConflictError extends Error {
  constructor(message = "An active complimentary-access grant already exists for this email address.") {
    super(message);
    this.name = "ComplimentaryAccessConflictError";
  }
}

export class ComplimentaryAccessNotFoundError extends Error {
  constructor(message = "Complimentary-access grant was not found.") {
    super(message);
    this.name = "ComplimentaryAccessNotFoundError";
  }
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

export function complimentaryEmailFingerprint(email: string): string {
  return fingerprintAuthValue(`email:${normalizeDiagnosticEmail(email)}`);
}

export function calculateComplimentaryExpiry(
  startsAt: number,
  durationValue: number,
  durationUnit: ComplimentaryAccessDurationUnit,
): number {
  if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > COMPLIMENTARY_ACCESS_LIMITS[durationUnit]) {
    throw new Error(`Duration must be between 1 and ${COMPLIMENTARY_ACCESS_LIMITS[durationUnit]} ${durationUnit}(s).`);
  }

  if (durationUnit === "day") {
    return startsAt + durationValue * 24 * 60 * 60 * 1000;
  }

  const result = new Date(startsAt);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  if (durationUnit === "month") {
    result.setUTCMonth(result.getUTCMonth() + durationValue);
  } else {
    result.setUTCFullYear(result.getUTCFullYear() + durationValue);
  }
  const finalDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, finalDay));
  return result.getTime();
}

export function getComplimentaryAccessStatus(
  grant: Pick<ComplimentaryAccessGrant, "expiresAt" | "revokedAt">,
  now = Date.now(),
): ComplimentaryAccessStatus {
  if (grant.revokedAt != null) return "revoked";
  if (grant.expiresAt <= now) return "expired";
  return "active";
}

function toSnapshot(grant: ComplimentaryAccessGrant, now = Date.now()): ComplimentaryAccessSnapshot {
  return {
    id: grant.id,
    emailMasked: grant.emailMasked,
    accountLinked: grant.userId != null,
    durationValue: grant.durationValue,
    durationUnit: grant.durationUnit as ComplimentaryAccessDurationUnit,
    startsAt: grant.startsAt,
    expiresAt: grant.expiresAt,
    note: grant.note ?? null,
    status: getComplimentaryAccessStatus(grant, now),
    revokedAt: grant.revokedAt ?? null,
    createdAt: grant.createdAt.getTime(),
  };
}

export async function findActiveComplimentaryAccess({
  userId,
  email,
  now = Date.now(),
}: {
  userId?: number | null;
  email?: string | null;
  now?: number;
}): Promise<{ grantId: number; expiresAt: number } | null> {
  const db = await requireDb();
  const fingerprint = email ? complimentaryEmailFingerprint(email) : null;
  const identityCondition = userId && fingerprint
    ? or(
      eq(complimentaryAccessGrants.userId, userId),
      eq(complimentaryAccessGrants.emailFingerprint, fingerprint),
    )
    : userId
      ? eq(complimentaryAccessGrants.userId, userId)
      : fingerprint
        ? eq(complimentaryAccessGrants.emailFingerprint, fingerprint)
        : null;

  if (!identityCondition) return null;

  const [grant] = await db
    .select({ id: complimentaryAccessGrants.id, expiresAt: complimentaryAccessGrants.expiresAt })
    .from(complimentaryAccessGrants)
    .where(and(
      identityCondition,
      isNull(complimentaryAccessGrants.revokedAt),
      lte(complimentaryAccessGrants.startsAt, now),
      gt(complimentaryAccessGrants.expiresAt, now),
    ))
    .orderBy(desc(complimentaryAccessGrants.expiresAt))
    .limit(1);

  return grant ? { grantId: grant.id, expiresAt: grant.expiresAt } : null;
}

export async function createComplimentaryAccessGrant({
  email,
  durationValue,
  durationUnit,
  note,
  createdByUserId,
  now = Date.now(),
}: {
  email: string;
  durationValue: number;
  durationUnit: ComplimentaryAccessDurationUnit;
  note?: string | null;
  createdByUserId: number;
  now?: number;
}): Promise<ComplimentaryAccessSnapshot> {
  const db = await requireDb();
  const normalizedEmail = normalizeDiagnosticEmail(email);
  const emailFingerprint = complimentaryEmailFingerprint(normalizedEmail);
  const expiresAt = calculateComplimentaryExpiry(now, durationValue, durationUnit);
  const [account] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const existing = await findActiveComplimentaryAccess({
    userId: account?.id ?? null,
    email: normalizedEmail,
    now,
  });
  if (existing) throw new ComplimentaryAccessConflictError();

  const values: InsertComplimentaryAccessGrant = {
    emailFingerprint,
    emailMasked: maskDiagnosticEmail(normalizedEmail),
    userId: account?.id ?? null,
    durationValue,
    durationUnit,
    startsAt: now,
    expiresAt,
    createdByUserId,
    note: note?.trim().slice(0, 500) || null,
    revokedAt: null,
    revokedByUserId: null,
  };

  const [createdId] = await db.insert(complimentaryAccessGrants).values(values).$returningId();
  const [created] = await db
    .select()
    .from(complimentaryAccessGrants)
    .where(eq(complimentaryAccessGrants.id, createdId.id))
    .limit(1);

  if (!created) throw new Error("Complimentary-access grant could not be reloaded after creation.");
  return toSnapshot(created, now);
}

export async function listComplimentaryAccessGrants({
  status,
  now = Date.now(),
  limit = 100,
}: {
  status?: ComplimentaryAccessStatus | "all";
  now?: number;
  limit?: number;
} = {}): Promise<ComplimentaryAccessSnapshot[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(complimentaryAccessGrants)
    .orderBy(desc(complimentaryAccessGrants.createdAt), desc(complimentaryAccessGrants.id))
    .limit(Math.min(Math.max(limit, 1), 200));
  const snapshots = rows.map((row) => toSnapshot(row, now));
  return status && status !== "all" ? snapshots.filter((grant) => grant.status === status) : snapshots;
}

export async function lookupComplimentaryAccessByEmail({
  email,
  now = Date.now(),
}: {
  email: string;
  now?: number;
}): Promise<ComplimentaryAccessSnapshot[]> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(complimentaryAccessGrants)
    .where(eq(complimentaryAccessGrants.emailFingerprint, complimentaryEmailFingerprint(email)))
    .orderBy(desc(complimentaryAccessGrants.createdAt), desc(complimentaryAccessGrants.id))
    .limit(50);
  return rows.map((row) => toSnapshot(row, now));
}

export async function revokeComplimentaryAccessGrant({
  grantId,
  revokedByUserId,
  now = Date.now(),
}: {
  grantId: number;
  revokedByUserId: number;
  now?: number;
}): Promise<ComplimentaryAccessSnapshot> {
  const db = await requireDb();
  const [existing] = await db
    .select()
    .from(complimentaryAccessGrants)
    .where(eq(complimentaryAccessGrants.id, grantId))
    .limit(1);
  if (!existing) throw new ComplimentaryAccessNotFoundError();

  if (existing.revokedAt == null) {
    await db
      .update(complimentaryAccessGrants)
      .set({ revokedAt: now, revokedByUserId, updatedAt: new Date() })
      .where(and(
        eq(complimentaryAccessGrants.id, grantId),
        isNull(complimentaryAccessGrants.revokedAt),
      ));
  }

  const [updated] = await db
    .select()
    .from(complimentaryAccessGrants)
    .where(eq(complimentaryAccessGrants.id, grantId))
    .limit(1);
  if (!updated) throw new ComplimentaryAccessNotFoundError();
  return toSnapshot(updated, now);
}
