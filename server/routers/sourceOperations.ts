import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { listDeveloperApiKeys } from "../developerApiKeys";
import { evaluateSourceConnection } from "../sourceHealthRoutes";
import {
  SOURCE_PROVIDERS,
  archiveSourceConnection,
  createSourceConnection,
  getSourceAnalytics,
  getSourceConnectionForUser,
  listSourceConnectionsForUser,
  listSourceHealthHistoryForUser,
  updateSourceConnection,
} from "../sourceConnections";

const sourceIdInput = z.object({ id: z.number().int().positive() });

const PROVIDER_RECIPES = {
  zapier: {
    provider: "zapier" as const,
    actionApp: "Webhooks by Zapier",
    actionEvent: "Custom Request",
    method: "POST",
    documentationUrl: "https://help.zapier.com/hc/en-us/articles/8496288690317-Send-webhooks-in-Zaps",
    sourceApp: "zapier",
  },
  make: {
    provider: "make" as const,
    actionApp: "HTTP",
    actionEvent: "Make a request",
    method: "POST",
    documentationUrl: "https://apps.make.com/http",
    sourceApp: "make",
  },
} as const;

const FIELD_MAPPING = [
  { field: "name", required: true, description: "Customer name from the trigger record." },
  { field: "email", required: true, description: "Customer email from the trigger record." },
  { field: "phone", required: false, description: "Customer phone, when available." },
  { field: "externalId", required: false, description: "Stable order, form, or customer ID for traceability." },
  { field: "notes", required: false, description: "Short operational context; do not include secrets or payment data." },
  { field: "tags", required: false, description: "Up to 20 source or workflow tags." },
] as const;

export const sourceOperationsRouter = router({
  setupManifest: protectedProcedure.query(async ({ ctx }) => {
    const keys = await listDeveloperApiKeys(ctx.user.id);
    return {
      endpointPath: "/api/v1/contacts",
      sourceHeaderName: "X-Get-Phame-Source",
      authorizationHeaderName: "Authorization",
      idempotencyHeaderName: "Idempotency-Key",
      contentType: "application/json",
      consent: {
        confirmed: true,
        allowedBasis: ["customer_relationship", "explicit_opt_in", "other"] as const,
      },
      fieldMapping: FIELD_MAPPING,
      providerRecipes: PROVIDER_RECIPES,
      apiKeys: keys
        .filter(key => key.status === "active" && key.scopes.includes("contacts:write"))
        .map(key => ({
          id: key.id,
          label: key.label,
          keyHint: key.keyHint,
          scopes: key.scopes,
          lastUsedAt: key.lastUsedAt,
          expiresAt: key.expiresAt,
        })),
    };
  }),

  list: protectedProcedure.query(async ({ ctx }) => listSourceConnectionsForUser(ctx.user.id)),

  create: protectedProcedure.input(z.object({
    apiKeyId: z.number().int().positive(),
    provider: z.enum(SOURCE_PROVIDERS),
    label: z.string().trim().min(1).max(100),
    expectedIntervalMinutes: z.number().int().min(15).max(10_080).default(1_440),
    monitoringEnabled: z.boolean().default(true),
  })).mutation(async ({ ctx, input }) => {
    const source = await createSourceConnection({ userId: ctx.user.id, ...input });
    if (!source) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active API key with the contacts:write scope." });
    }
    return source;
  }),

  update: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    label: z.string().trim().min(1).max(100).optional(),
    expectedIntervalMinutes: z.number().int().min(15).max(10_080).optional(),
    monitoringEnabled: z.boolean().optional(),
  }).refine(value => value.label !== undefined || value.expectedIntervalMinutes !== undefined || value.monitoringEnabled !== undefined, {
    message: "Provide at least one field to update.",
  })).mutation(async ({ ctx, input }) => {
    const source = await updateSourceConnection({ userId: ctx.user.id, ...input });
    if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Source connection not found." });
    return source;
  }),

  archive: protectedProcedure.input(sourceIdInput).mutation(async ({ ctx, input }) => {
    const existing = await getSourceConnectionForUser(ctx.user.id, input.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Source connection not found." });
    await archiveSourceConnection(ctx.user.id, input.id);
    return { success: true };
  }),

  analytics: protectedProcedure.input(z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  })).query(async ({ ctx, input }) => getSourceAnalytics(ctx.user.id, input.days)),

  healthHistory: protectedProcedure.input(z.object({
    sourceConnectionId: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(100).default(30),
  })).query(async ({ ctx, input }) => listSourceHealthHistoryForUser(
    ctx.user.id,
    input.sourceConnectionId,
    input.limit,
  )),

  refreshHealth: protectedProcedure.input(sourceIdInput).mutation(async ({ ctx, input }) => {
    const source = await getSourceConnectionForUser(ctx.user.id, input.id);
    if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Source connection not found." });
    if (!source.monitoringEnabled) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Enable monitoring before refreshing health." });
    }
    const evaluation = await evaluateSourceConnection(source);
    const updated = await getSourceConnectionForUser(ctx.user.id, input.id);
    return { source: updated, evaluation };
  }),
});
