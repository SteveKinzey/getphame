import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { paidProcedure, protectedProcedure, router } from "../_core/trpc";
import { listSavedContacts, upsertContactsFromSource } from "../contacts";
import {
  createSourceImportPreview,
  getSourceImport,
  listSourceConnections,
  listSourceImportHistory,
  recordSourceImportEvent,
  setSourceConnectionStatus,
  updateSourceImportResult,
  upsertSourceConnection,
} from "../sourceDb";
import { buildSourceImportPreview, hashSourceIdempotencyKey, hashSourceImportPayload } from "../sourceImportLogic";
import { encryptSourceSecrets } from "../sourceSecrets";
import { normalizePublicHttpsStoreUrl } from "../sourceSecurity";
import { deleteWooCredentials, fetchWooOrders, getWooCredentials, upsertWooCredentials } from "../woocommerce";
import { importPendingWooOrders, listPendingWooImports } from "../wooImportScheduler";
import { sourceConnections } from "../../drizzle/schema";
import { getDb } from "../db";
import { and, eq } from "drizzle-orm";

const consentSchema = z.object({
  basis: z.enum(["express", "contract", "legitimate_interest", "other"]),
  source: z.string().trim().min(3).max(255),
  attested: z.literal(true),
});

const contactRowSchema = z.object({
  name: z.string().trim().max(255).default(""),
  email: z.string().trim().max(320),
  phone: z.string().trim().max(30).optional(),
  externalId: z.string().trim().max(128).optional(),
});

const importInputFields = {
  idempotencyKey: z.string().trim().min(8).max(128),
  rows: z.array(contactRowSchema).min(1).max(1000),
  consent: consentSchema,
};

async function previewImport(input: {
  userId: number;
  sourceType: "csv" | "woocommerce";
  idempotencyKey: string;
  rows: Array<{ name: string; email: string; phone?: string; externalId?: string }>;
  consent: { basis: "express" | "contract" | "legitimate_interest" | "other"; source: string; attested: true };
  sourceConnectionId?: number | null;
}) {
  const existingContacts = await listSavedContacts(input.userId);
  const { rows, stats } = buildSourceImportPreview(input.rows, existingContacts.map((contact) => contact.email));
  const payloadHash = hashSourceImportPayload(input.sourceType, rows);
  const idempotencyKeyHash = hashSourceIdempotencyKey(input.userId, input.sourceType, input.idempotencyKey);
  const created = await createSourceImportPreview({
    userId: input.userId,
    sourceConnectionId: input.sourceConnectionId ?? null,
    sourceType: input.sourceType,
    idempotencyKeyHash,
    payloadHash,
    status: "previewed",
    requestedRowCount: stats.requested,
    validRowCount: stats.valid,
    duplicateRowCount: stats.duplicates,
    rejectedRowCount: stats.rejected,
    importedCount: 0,
    skippedCount: 0,
    consentBasis: input.consent.basis,
    consentSource: input.consent.source,
    consentAttestedAt: Date.now(),
    metadataJson: JSON.stringify({ mode: "manual_review", autoSend: false }),
  });
  if (!created.reused) {
    await recordSourceImportEvent({
      userId: input.userId,
      sourceImportId: created.importRecord.id,
      eventType: "preview_created",
      detail: { sourceType: input.sourceType, requested: stats.requested, valid: stats.valid, duplicates: stats.duplicates, rejected: stats.rejected },
    });
  }
  return { importRecord: created.importRecord, rows, stats, reused: created.reused };
}

export const sourcesRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const [connections, imports, pendingWoo, legacyWoo] = await Promise.all([
      listSourceConnections(ctx.user.id),
      listSourceImportHistory(ctx.user.id, 25),
      listPendingWooImports(ctx.user.id),
      getWooCredentials(ctx.user.id),
    ]);
    const hasWooConnection = connections.some((connection) => connection.sourceType === "woocommerce");
    return {
      connections: hasWooConnection || !legacyWoo ? connections : [
        ...connections,
        {
          id: 0,
          userId: ctx.user.id,
          sourceType: "woocommerce" as const,
          displayName: "WooCommerce",
          status: "connected" as const,
          settingsJson: JSON.stringify({ storeUrl: legacyWoo.storeUrl }),
          lastTestedAt: null,
          lastImportedAt: legacyWoo.lastSyncedAt,
          lastError: null,
          createdAt: legacyWoo.createdAt,
          updatedAt: legacyWoo.updatedAt,
        },
      ],
      imports,
      pendingWooCount: pendingWoo.length,
      autoImportEnabled: false as const,
      autoSendEnabled: false as const,
    };
  }),

  connectWooCommerce: paidProcedure.input(z.object({
    storeUrl: z.string().trim().url().max(512),
    consumerKey: z.string().trim().min(8).max(255),
    consumerSecret: z.string().trim().min(8).max(255),
  })).mutation(async ({ ctx, input }) => {
    let storeUrl: string;
    try {
      storeUrl = await normalizePublicHttpsStoreUrl(input.storeUrl);
      await fetchWooOrders(storeUrl, input.consumerKey, input.consumerSecret, 1);
    } catch (error) {
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "WooCommerce connection failed." });
    }
    const encryptedSecrets = encryptSourceSecrets({ consumerKey: input.consumerKey, consumerSecret: input.consumerSecret });
    await Promise.all([
      upsertWooCredentials({ userId: ctx.user.id, storeUrl, consumerKey: input.consumerKey, consumerSecret: input.consumerSecret }),
      upsertSourceConnection({
        userId: ctx.user.id,
        sourceType: "woocommerce",
        displayName: "WooCommerce",
        status: "connected",
        encryptedSecrets,
        settingsJson: JSON.stringify({ storeUrl }),
        lastTestedAt: Date.now(),
        lastError: null,
      }),
    ]);
    return { ok: true as const, storeUrl };
  }),

  disconnectWooCommerce: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    await Promise.all([
      deleteWooCredentials(ctx.user.id),
      db.delete(sourceConnections).where(and(eq(sourceConnections.userId, ctx.user.id), eq(sourceConnections.sourceType, "woocommerce"))),
    ]);
    return { ok: true as const };
  }),

  previewCsv: protectedProcedure.input(z.object(importInputFields)).mutation(async ({ ctx, input }) => {
    return previewImport({ userId: ctx.user.id, sourceType: "csv", ...input });
  }),

  commitCsv: protectedProcedure.input(z.object({
    importId: z.number().int().positive(),
    rows: z.array(contactRowSchema).min(1).max(1000),
  })).mutation(async ({ ctx, input }) => {
    const importRecord = await getSourceImport(ctx.user.id, input.importId);
    if (!importRecord || importRecord.sourceType !== "csv") throw new TRPCError({ code: "NOT_FOUND", message: "Import preview not found." });
    if (importRecord.status === "committed") return { imported: importRecord.importedCount, skipped: importRecord.skippedCount, reused: true as const };
    if (importRecord.status !== "previewed") throw new TRPCError({ code: "CONFLICT", message: "This import can no longer be committed." });
    const normalized = buildSourceImportPreview(input.rows, []).rows;
    if (hashSourceImportPayload("csv", normalized) !== importRecord.payloadHash) {
      throw new TRPCError({ code: "CONFLICT", message: "The reviewed CSV rows changed. Create a new preview before importing." });
    }
    const result = await upsertContactsFromSource(ctx.user.id, normalized.map((row) => ({
      ...row,
      source: "manual" as const,
      sourceApp: "csv",
      consentBasis: importRecord.consentBasis,
      consentCapturedAt: importRecord.consentAttestedAt,
      consentSource: importRecord.consentSource,
    })));
    await updateSourceImportResult({ userId: ctx.user.id, importId: input.importId, status: "committed", importedCount: result.inserted, skippedCount: result.skipped });
    await recordSourceImportEvent({ userId: ctx.user.id, sourceImportId: input.importId, eventType: "import_committed", detail: { imported: result.inserted, skipped: result.skipped, autoSend: false } });
    return { imported: result.inserted, skipped: result.skipped, reused: false as const };
  }),

  previewWooPending: paidProcedure.input(z.object({
    idempotencyKey: z.string().trim().min(8).max(128),
    consent: consentSchema,
  })).mutation(async ({ ctx, input }) => {
    const pending = await listPendingWooImports(ctx.user.id);
    if (pending.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "There are no staged WooCommerce contacts to review." });
    const connection = await listSourceConnections(ctx.user.id).then((items) => items.find((item) => item.sourceType === "woocommerce"));
    return previewImport({
      userId: ctx.user.id,
      sourceType: "woocommerce",
      idempotencyKey: input.idempotencyKey,
      consent: input.consent,
      sourceConnectionId: connection?.id || null,
      rows: pending.map((row) => ({ name: row.name ?? "", email: row.email, phone: row.phone ?? undefined, externalId: row.orderId ?? undefined })),
    });
  }),

  commitWooPending: paidProcedure.input(z.object({ importId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const importRecord = await getSourceImport(ctx.user.id, input.importId);
    if (!importRecord || importRecord.sourceType !== "woocommerce") throw new TRPCError({ code: "NOT_FOUND", message: "WooCommerce import preview not found." });
    if (importRecord.status === "committed") return { imported: importRecord.importedCount, skipped: importRecord.skippedCount, reused: true as const };
    if (importRecord.status !== "previewed") throw new TRPCError({ code: "CONFLICT", message: "This import can no longer be committed." });
    const pending = await listPendingWooImports(ctx.user.id);
    const rows = pending.map((row) => ({ name: row.name ?? "", email: row.email, phone: row.phone ?? undefined, externalId: row.orderId ?? undefined }));
    if (hashSourceImportPayload("woocommerce", rows) !== importRecord.payloadHash) {
      throw new TRPCError({ code: "CONFLICT", message: "The staged WooCommerce contacts changed. Create a new preview before importing." });
    }
    const result = await importPendingWooOrders(ctx.user.id, {
      basis: importRecord.consentBasis,
      source: importRecord.consentSource,
      capturedAt: importRecord.consentAttestedAt,
    });
    await updateSourceImportResult({ userId: ctx.user.id, importId: input.importId, status: "committed", importedCount: result.imported, skippedCount: result.skipped });
    await recordSourceImportEvent({ userId: ctx.user.id, sourceImportId: input.importId, eventType: "import_committed", detail: { imported: result.imported, skipped: result.skipped, autoSend: false } });
    await setSourceConnectionStatus(ctx.user.id, "woocommerce", "connected", null);
    return { ...result, reused: false as const };
  }),
});
