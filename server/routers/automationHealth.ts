import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { AUTOMATION_HISTORY_MAX_RANGE_MS } from "../automationHealth";
import {
  acknowledgeAutomationAlert,
  getAutomationAlertAcknowledgementHistory,
  getAutomationAlert,
  getAutomationDashboard,
  getAutomationRunsForDay,
} from "../automationHealthDb";

const dashboardSchema = z
  .object({
    fromMs: z.number().int().nonnegative().optional(),
    toMs: z.number().int().nonnegative().optional(),
    kind: z.enum(["drift_audit", "dependabot_merge"]).optional(),
    result: z.enum(["success", "failure"]).optional(),
    limit: z.number().int().min(10).max(100).default(50),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.fromMs !== undefined && value.toMs !== undefined) {
      if (value.fromMs > value.toMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toMs"],
          message: "The end date must not precede the start date.",
        });
      }
      if (value.toMs - value.fromMs > AUTOMATION_HISTORY_MAX_RANGE_MS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toMs"],
          message: "Choose a range of 366 days or fewer.",
        });
      }
    }
  });

const acknowledgeSchema = z
  .object({ eventId: z.number().int().positive() })
  .strict();

const runDetailsSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(["drift_audit", "dependabot_merge"]),
    limit: z.number().int().min(1).max(50).default(50),
  })
  .strict();

const acknowledgementHistorySchema = z
  .object({ limit: z.number().int().min(1).max(100).default(50) })
  .strict();

export const automationHealthRouter = router({
  dashboard: adminProcedure
    .input(dashboardSchema.optional())
    .query(async ({ input }) => {
      const parsed = dashboardSchema.parse(input ?? {});
      const now = Date.now();
      const toMs = Math.min(parsed.toMs ?? now, now);
      const fromMs = parsed.fromMs ?? toMs - 89 * 24 * 60 * 60 * 1000;
      if (fromMs > toMs || toMs - fromMs > AUTOMATION_HISTORY_MAX_RANGE_MS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a valid date range of 366 days or fewer.",
        });
      }
      return getAutomationDashboard({
        fromMs,
        toMs,
        kind: parsed.kind,
        result: parsed.result,
        limit: parsed.limit,
      });
    }),

  alert: adminProcedure.query(async ({ ctx }) =>
    getAutomationAlert(ctx.user.id)
  ),

  acknowledgeAlert: adminProcedure
    .input(acknowledgeSchema)
    .mutation(async ({ ctx, input }) =>
      acknowledgeAutomationAlert({
        eventId: input.eventId,
        adminUserId: ctx.user.id,
        acknowledgedAt: Date.now(),
      })
    ),

  runDetails: adminProcedure
    .input(runDetailsSchema)
    .query(async ({ input }) => {
      const fromMs = Date.parse(`${input.date}T00:00:00.000Z`);
      if (!Number.isFinite(fromMs) || fromMs > Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a valid UTC date that is not in the future.",
        });
      }
      return getAutomationRunsForDay(input);
    }),

  acknowledgementHistory: adminProcedure
    .input(acknowledgementHistorySchema.optional())
    .query(({ input }) =>
      getAutomationAlertAcknowledgementHistory(input?.limit ?? 50)
    ),
});
