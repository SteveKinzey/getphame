import { z } from "zod";
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
import { buildAuthHealthHistoryCsvExport } from "../authHealthHistoryExport";

const filtersSchema = z.object({
  email: z.string().trim().email().optional(),
  outcome: z.enum(["ok", "fail"]).optional(),
  requestId: z.string().trim().min(1).max(64).optional(),
  days: z.number().int().min(1).max(30).default(7),
  limit: z.number().int().min(1).max(100).default(50),
});

const healthHistoryFiltersSchema = z.object({
  status: z.enum(["ok", "fail"]).optional(),
  triggerSource: z.enum(["scheduled", "manual"]).optional(),
});

const healthHistoryPageSchema = healthHistoryFiltersSchema.extend({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(50).default(20),
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
    .input(healthHistoryFiltersSchema.optional())
    .mutation(async ({ input }) => {
      const filters = healthHistoryFiltersSchema.parse(input ?? {});
      const history = await listAuthHealthChecksForExport(filters);
      return buildAuthHealthHistoryCsvExport({ ...history, ...filters });
    }),
});
