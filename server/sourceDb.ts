import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { sourceConnections, sourceImportEvents, sourceImports } from "../drizzle/schema";
import type { SourceConnectionStatus, SourceImportStatus, SourceType } from "../shared/sourceTypes";

export async function listSourceConnections(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(sourceConnections).where(eq(sourceConnections.userId, userId));
  return rows.map(({ encryptedSecrets: _encryptedSecrets, ...connection }) => connection);
}

export async function getSourceConnection(userId: number, sourceType: SourceType) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(sourceConnections).where(and(
    eq(sourceConnections.userId, userId),
    eq(sourceConnections.sourceType, sourceType)
  )).limit(1);
  return row ?? null;
}

export async function upsertSourceConnection(input: {
  userId: number;
  sourceType: SourceType;
  displayName: string;
  status: SourceConnectionStatus;
  encryptedSecrets?: string | null;
  settingsJson?: string | null;
  lastTestedAt?: number | null;
  lastImportedAt?: number | null;
  lastError?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  await db.insert(sourceConnections).values({ ...input, updatedAt: now }).onDuplicateKeyUpdate({
    set: {
      displayName: input.displayName,
      status: input.status,
      encryptedSecrets: input.encryptedSecrets ?? null,
      settingsJson: input.settingsJson ?? null,
      lastTestedAt: input.lastTestedAt ?? null,
      lastImportedAt: input.lastImportedAt ?? null,
      lastError: input.lastError ?? null,
      updatedAt: now,
    },
  });
  return getSourceConnection(input.userId, input.sourceType);
}

export async function setSourceConnectionStatus(
  userId: number,
  sourceType: SourceType,
  status: SourceConnectionStatus,
  lastError: string | null = null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sourceConnections).set({ status, lastError, updatedAt: new Date() }).where(and(
    eq(sourceConnections.userId, userId),
    eq(sourceConnections.sourceType, sourceType)
  ));
}

export async function listSourceImportHistory(userId: number, limit = 25) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sourceImports)
    .where(eq(sourceImports.userId, userId))
    .orderBy(desc(sourceImports.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getSourceImport(userId: number, importId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(sourceImports).where(and(
    eq(sourceImports.userId, userId),
    eq(sourceImports.id, importId)
  )).limit(1);
  return row ?? null;
}

export async function getSourceImportByIdempotency(userId: number, sourceType: SourceType, idempotencyKeyHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(sourceImports).where(and(
    eq(sourceImports.userId, userId),
    eq(sourceImports.sourceType, sourceType),
    eq(sourceImports.idempotencyKeyHash, idempotencyKeyHash)
  )).limit(1);
  return row ?? null;
}

export async function createSourceImportPreview(
  input: Omit<typeof sourceImports.$inferInsert, "sourceType"> & { sourceType: SourceType }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSourceImportByIdempotency(input.userId, input.sourceType, input.idempotencyKeyHash);
  if (existing) return { importRecord: existing, reused: true as const };
  await db.insert(sourceImports).values(input);
  const created = await getSourceImportByIdempotency(input.userId, input.sourceType, input.idempotencyKeyHash);
  if (!created) throw new Error("Source import preview could not be persisted.");
  return { importRecord: created, reused: false as const };
}

export async function updateSourceImportResult(input: {
  userId: number;
  importId: number;
  status: SourceImportStatus;
  importedCount: number;
  skippedCount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sourceImports).set({
    status: input.status,
    importedCount: input.importedCount,
    skippedCount: input.skippedCount,
    updatedAt: new Date(),
  }).where(and(eq(sourceImports.userId, input.userId), eq(sourceImports.id, input.importId)));
}

export async function recordSourceImportEvent(input: {
  userId: number;
  sourceImportId: number;
  eventType: string;
  detail?: Record<string, string | number | boolean | null>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sourceImportEvents).values({
    userId: input.userId,
    sourceImportId: input.sourceImportId,
    eventType: input.eventType,
    actorType: "user",
    detailJson: input.detail ? JSON.stringify(input.detail) : null,
    createdAt: Date.now(),
  });
}
