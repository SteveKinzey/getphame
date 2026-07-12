import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  getAuthDiagnosticSummary,
  listAuthDiagnosticEvents,
  listAuthHealthChecks,
} from "../db";
import {
  fingerprintAuthValue,
  normalizeDiagnosticEmail,
  runAuthHealthCheck,
} from "../authOperations";

const filtersSchema = z.object({
  email: z.string().trim().email().optional(),
  outcome: z.enum(["ok", "fail"]).optional(),
  requestId: z.string().trim().min(1).max(64).optional(),
  days: z.number().int().min(1).max(30).default(7),
  limit: z.number().int().min(1).max(100).default(50),
});

export const authDiagnosticsRouter = router({
  dashboard: adminProcedure
    .input(filtersSchema.optional())
    .query(async ({ input }) => {
      const filters = filtersSchema.parse(input ?? {});
      const sinceMs = Date.now() - filters.days * 24 * 60 * 60 * 1000;
      const emailFingerprint = filters.email
        ? fingerprintAuthValue(`email:${normalizeDiagnosticEmail(filters.email)}`)
        : undefined;
      const [events, summary, healthChecks] = await Promise.all([
        listAuthDiagnosticEvents({
          emailFingerprint,
          outcome: filters.outcome,
          requestId: filters.requestId,
          sinceMs,
          limit: filters.limit,
        }),
        getAuthDiagnosticSummary(sinceMs),
        listAuthHealthChecks(30),
      ]);
      return { events, summary, healthChecks, sinceMs };
    }),

  runHealthCheck: adminProcedure.mutation(async () => {
    return runAuthHealthCheck({ triggerSource: "manual" });
  }),
});
