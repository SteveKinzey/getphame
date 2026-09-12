import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import {
  getAuthDiagnosticSummary,
  getAuthHealthUptimeSummary,
  listAuthDiagnosticEvents,
  listAuthHealthChecks,
  listAuthHealthChecksForExport,
  listAuthHealthChecksPage,
} from "../db";
import {
  fingerprintAuthValue,
  normalizeDiagnosticEmail,
  runAuthHealthCheck,
} from "../authOperations";
import {
  AUTH_HEALTH_HISTORY_EXPORT_COLUMNS,
  AUTH_HEALTH_HISTORY_EXPORT_COLUMN_KEYS,
  buildAuthHealthHistoryCsvExport,
} from "../authHealthHistoryExport";
import {
  deleteAuthHealthHistoryPreset,
  duplicateAuthHealthHistoryPreset,
  listAuthHealthHistoryPresets,
  MAX_AUTH_HEALTH_HISTORY_PRESET_NAME_CHARS,
  MAX_AUTH_HEALTH_HISTORY_PRESETS,
  reorderAuthHealthHistoryPresets,
  saveAuthHealthHistoryPreset,
} from "../authHealthHistoryPresets";

const MAX_AUTH_HEALTH_HISTORY_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

const healthHistoryFilterFields = {
  status: z.enum(["ok", "fail"] as const).optional(),
  triggerSource: z.enum(["scheduled", "manual"] as const).optional(),
  fromMs: z.number().int().nonnegative().optional(),
  toMs: z.number().int().nonnegative().optional(),
};

function validateHealthHistoryRange(
  value: { fromMs?: number | null; toMs?: number | null },
  ctx: z.RefinementCtx
) {
  if (
    value.fromMs !== undefined &&
    value.fromMs !== null &&
    value.toMs !== undefined &&
    value.toMs !== null
  ) {
    if (value.fromMs > value.toMs)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toMs"],
        message: "The end date must not be before the start date.",
      });
    if (value.toMs - value.fromMs > MAX_AUTH_HEALTH_HISTORY_RANGE_MS)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toMs"],
        message: "Choose a date range of 366 days or less.",
      });
  }
}

const filtersSchema = z.object({
  email: z.string().trim().email().optional(),
  outcome: z.enum(["ok", "fail"]).optional(),
  requestId: z.string().trim().min(1).max(64).optional(),
  days: z.number().int().min(1).max(30).default(7),
  limit: z.number().int().min(1).max(100).default(50),
});

const healthHistoryFiltersSchema = z
  .object(healthHistoryFilterFields)
  .superRefine(validateHealthHistoryRange);

const healthHistoryExportSchema = z
  .object({
    ...healthHistoryFilterFields,
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    columns: z
      .array(z.enum(AUTH_HEALTH_HISTORY_EXPORT_COLUMN_KEYS))
      .min(1)
      .max(AUTH_HEALTH_HISTORY_EXPORT_COLUMNS.length)
      .refine(
        columns => new Set(columns).size === columns.length,
        "Export columns must be unique."
      )
      .optional(),
    snapshotGeneratedAt: z.number().int().nonnegative().optional(),
  })
  .superRefine(validateHealthHistoryRange);

const healthHistoryPageSchema = z
  .object({
    ...healthHistoryFilterFields,
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(10).max(50).default(20),
  })
  .superRefine(validateHealthHistoryRange);

const healthHistoryPresetSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_AUTH_HEALTH_HISTORY_PRESET_NAME_CHARS),
    status: z
      .enum(["ok", "fail"] as const)
      .nullable()
      .optional(),
    triggerSource: z
      .enum(["scheduled", "manual"] as const)
      .nullable()
      .optional(),
    fromMs: z.number().int().nonnegative().nullable().optional(),
    toMs: z.number().int().nonnegative().nullable().optional(),
  })
  .superRefine(validateHealthHistoryRange);

export const authDiagnosticsRouter = router({
  dashboard: adminProcedure
    .input(filtersSchema.optional())
    .query(async ({ input }) => {
      const filters = filtersSchema.parse(input ?? {});
      const sinceMs = Date.now() - filters.days * 24 * 60 * 60 * 1000;
      const emailFingerprint = filters.email
        ? fingerprintAuthValue(
            `email:${normalizeDiagnosticEmail(filters.email)}`
          )
        : undefined;
      const [events, summary, healthChecks, uptime] = await Promise.all([
        listAuthDiagnosticEvents({
          emailFingerprint,
          outcome: filters.outcome,
          requestId: filters.requestId,
          sinceMs,
          limit: filters.limit,
        }),
        getAuthDiagnosticSummary(sinceMs),
        listAuthHealthChecks(30),
        getAuthHealthUptimeSummary(),
      ]);
      return { events, summary, healthChecks, uptime, sinceMs };
    }),

  runHealthCheck: adminProcedure.mutation(async () => {
    return runAuthHealthCheck({ triggerSource: "manual" });
  }),

  healthHistory: adminProcedure
    .input(healthHistoryPageSchema.optional())
    .query(async ({ input }) => {
      const filters = healthHistoryPageSchema.parse(input ?? {});
      return listAuthHealthChecksPage(filters);
    }),

  exportHealthHistoryCsv: adminProcedure
    .input(healthHistoryExportSchema.optional())
    .mutation(async ({ input }) => {
      const parsed = healthHistoryExportSchema.parse(input ?? {});
      const { fromDate, toDate, columns, snapshotGeneratedAt, ...filters } =
        parsed;
      const now = Date.now();
      const generatedAt = Math.min(snapshotGeneratedAt ?? now, now);
      const snapshotToMs = Math.min(filters.toMs ?? generatedAt, generatedAt);
      const history = await listAuthHealthChecksForExport({
        ...filters,
        toMs: snapshotToMs,
      });
      return buildAuthHealthHistoryCsvExport({
        ...history,
        ...filters,
        fromDate,
        toDate,
        selectedColumns: columns,
        generatedAt,
        snapshotToMs,
      });
    }),

  healthHistoryPresets: adminProcedure.query(async ({ ctx }) => {
    return listAuthHealthHistoryPresets(ctx.user.id);
  }),

  saveHealthHistoryPreset: adminProcedure
    .input(healthHistoryPresetSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await saveAuthHealthHistoryPreset(ctx.user.id, input);
      if (result.outcome === "not_found")
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This saved filter preset no longer exists.",
        });
      if (result.outcome === "name_conflict")
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a preset with this name.",
        });
      if (result.outcome === "limit_reached")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can save up to ${MAX_AUTH_HEALTH_HISTORY_PRESETS} filter presets.`,
        });
      if (result.outcome === "unavailable")
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Saved filter presets are unavailable.",
        });
      return result;
    }),

  deleteHealthHistoryPreset: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteAuthHealthHistoryPreset(
        ctx.user.id,
        input.id
      );
      if (!deleted)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Saved filter presets are unavailable.",
        });
      return { ok: true as const };
    }),

  duplicateHealthHistoryPreset: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await duplicateAuthHealthHistoryPreset(
        ctx.user.id,
        input.id
      );
      if (result.outcome === "not_found")
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This saved filter preset no longer exists.",
        });
      if (result.outcome === "limit_reached")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You can save up to ${MAX_AUTH_HEALTH_HISTORY_PRESETS} filter presets.`,
        });
      if (result.outcome === "unavailable")
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Saved filter presets are unavailable.",
        });
      return result;
    }),

  reorderHealthHistoryPresets: adminProcedure
    .input(
      z.object({
        orderedIds: z
          .array(z.number().int().positive())
          .min(1)
          .max(MAX_AUTH_HEALTH_HISTORY_PRESETS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reorderAuthHealthHistoryPresets(ctx.user.id, input);
      if (result.outcome === "invalid_order")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Preset order must contain unique preset IDs.",
        });
      if (result.outcome === "membership_mismatch")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Preset order must include every saved preset owned by this administrator.",
        });
      if (result.outcome === "unavailable")
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Saved filter presets are unavailable.",
        });
      return result;
    }),
});
