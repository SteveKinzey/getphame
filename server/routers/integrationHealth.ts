import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  deleteIntegrationHealthAlertSettings,
  getIntegrationHealthAlertSettings,
  HEALTH_ALERT_PROVIDERS,
  saveIntegrationHealthAlertSettings,
  sendIntegrationHealthAlertTest,
} from "../integrationHealthAlerts";
import { getIntegrationHealthSnapshot } from "../integrationHealth";
import { listIntegrationHealthHistory } from "../integrationHealthPersistence";

/**
 * Live, non-persistent operational probes for administrators. The contract
 * deliberately returns sanitized summaries only; it never returns credentials,
 * endpoint URLs, raw provider payloads, or customer data.
 */
export const integrationHealthRouter = router({
  snapshot: adminProcedure.query(() => getIntegrationHealthSnapshot()),
  history: adminProcedure
    .input(z.object({ hours: z.literal(24).default(24) }).optional())
    .query(() => listIntegrationHealthHistory()),
  alertSettings: adminProcedure.query(() =>
    getIntegrationHealthAlertSettings()
  ),
  saveAlertSettings: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        provider: z.enum(HEALTH_ALERT_PROVIDERS),
        webhookUrl: z.string().trim().max(2_000).nullable().optional(),
        latencyThresholdMs: z.number().int().min(100).max(60_000),
        alertOnFailure: z.boolean(),
        alertOnHighLatency: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await saveIntegrationHealthAlertSettings({
          userId: ctx.user.id,
          ...input,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Health alert settings could not be saved.",
        });
      }
    }),
  deleteAlertSettings: adminProcedure.mutation(async () => {
    await deleteIntegrationHealthAlertSettings();
    return { success: true as const };
  }),
  testAlert: adminProcedure.mutation(async () => {
    try {
      const result = await sendIntegrationHealthAlertTest();
      if (!result.delivered) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            result.status === null
              ? "The alert destination did not respond. Check its incoming webhook configuration."
              : `The alert destination returned HTTP ${result.status}.`,
        });
      }
      return result;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "The health alert test could not be delivered.",
      });
    }
  }),
});
