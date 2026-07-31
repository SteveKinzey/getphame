import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  ACTIVITY_TREND_PRESET_RANGES,
  ACTIVITY_TREND_PRESET_SERIES,
  deleteActivityTrendExportPreset,
  duplicateActivityTrendExportPreset,
  listActivityTrendExportPresets,
  MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS,
  MAX_ACTIVITY_TREND_EXPORT_PRESETS,
  reorderActivityTrendExportPresets,
  saveActivityTrendExportPreset,
} from "../activityTrendExportPresets";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const presetSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS),
    rangeKey: z.enum(ACTIVITY_TREND_PRESET_RANGES),
    customStartDate: dateSchema.nullable().optional(),
    customEndDate: dateSchema.nullable().optional(),
    series: z
      .array(z.enum(ACTIVITY_TREND_PRESET_SERIES))
      .min(1)
      .max(ACTIVITY_TREND_PRESET_SERIES.length)
      .refine(
        values => new Set(values).size === values.length,
        "Preset series must be unique."
      ),
  })
  .superRefine((value, ctx) => {
    if (value.rangeKey !== "custom") return;
    if (!value.customStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customStartDate"],
        message: "A custom start date is required.",
      });
    }
    if (!value.customEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customEndDate"],
        message: "A custom end date is required.",
      });
    }
    if (!value.customStartDate || !value.customEndDate) return;
    const startMs = Date.parse(`${value.customStartDate}T00:00:00.000Z`);
    const endMs = Date.parse(`${value.customEndDate}T00:00:00.000Z`);
    if (startMs > endMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customEndDate"],
        message: "The end date must not be before the start date.",
      });
    }
    if (endMs - startMs > 365 * 86_400_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customEndDate"],
        message: "Choose a date range of 366 days or less.",
      });
    }
  });

function throwPresetError(outcome: string): never {
  const errors: Record<
    string,
    {
      code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR";
      message: string;
    }
  > = {
    not_found: {
      code: "NOT_FOUND",
      message: "This saved export preset no longer exists.",
    },
    name_conflict: {
      code: "CONFLICT",
      message: "You already have an export preset with this name.",
    },
    limit_reached: {
      code: "BAD_REQUEST",
      message: `You can save up to ${MAX_ACTIVITY_TREND_EXPORT_PRESETS} export presets.`,
    },
    invalid_config: {
      code: "BAD_REQUEST",
      message: "The saved export preset configuration is invalid.",
    },
  };
  throw new TRPCError(
    errors[outcome] ?? {
      code: "INTERNAL_SERVER_ERROR",
      message: "Saved export presets are unavailable.",
    }
  );
}

export const activityTrendExportPresetsRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    listActivityTrendExportPresets(ctx.user.id)
  ),

  save: protectedProcedure
    .input(presetSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await saveActivityTrendExportPreset(ctx.user.id, input);
      if (result.outcome !== "saved") throwPresetError(result.outcome);
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await deleteActivityTrendExportPreset(
        ctx.user.id,
        input.id
      );
      if (result.outcome !== "deleted") throwPresetError(result.outcome);
      return { ok: true as const };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const result = await duplicateActivityTrendExportPreset(
        ctx.user.id,
        input.id
      );
      if (result.outcome !== "duplicated") throwPresetError(result.outcome);
      return result;
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        orderedIds: z
          .array(z.number().int().positive())
          .min(1)
          .max(MAX_ACTIVITY_TREND_EXPORT_PRESETS),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await reorderActivityTrendExportPresets(
        ctx.user.id,
        input.orderedIds
      );
      if (result.outcome === "invalid_order") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Preset order must contain unique preset IDs.",
        });
      }
      if (result.outcome === "membership_mismatch") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Preset order must include every saved export preset you own.",
        });
      }
      if (result.outcome !== "reordered") throwPresetError(result.outcome);
      return result;
    }),
});
