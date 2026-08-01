import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  SECURITY_AUDIT_HISTORY_MAX_RANGE_MS,
  type SecurityAuditOutcome,
} from "../securityAuditReporting";
import { getSecurityAuditDashboard } from "../securityAuditReports";

const dashboardSchema = z
  .object({
    fromMs: z.number().int().nonnegative().optional(),
    toMs: z.number().int().nonnegative().optional(),
    outcome: z.enum(["clean", "attention", "failed"]).optional(),
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
      if (value.toMs - value.fromMs > SECURITY_AUDIT_HISTORY_MAX_RANGE_MS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["toMs"],
          message: "Choose a range of 366 days or fewer.",
        });
      }
    }
  });

export const securityAuditsRouter = router({
  dashboard: adminProcedure
    .input(dashboardSchema.optional())
    .query(async ({ input }) => {
      const parsed = dashboardSchema.parse(input ?? {});
      const now = Date.now();
      const toMs = Math.min(parsed.toMs ?? now, now);
      const fromMs = parsed.fromMs ?? toMs - 365 * 24 * 60 * 60 * 1000;
      if (
        fromMs > toMs ||
        toMs - fromMs > SECURITY_AUDIT_HISTORY_MAX_RANGE_MS
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a valid date range of 366 days or fewer.",
        });
      }
      return getSecurityAuditDashboard({
        fromMs,
        toMs,
        outcome: parsed.outcome as SecurityAuditOutcome | undefined,
        limit: parsed.limit,
      });
    }),
});
