import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  abortRecoveryDrill,
  completeRecoveryDrill,
  containRecoveryDrill,
  decideRecoveryDrill,
  getRecoverySnapshot,
  prepareRecoveryDrill,
  recordRecoveryEvidence,
  startRecoveryDrill,
} from "../security/recoveryDrills";
import {
  RECOVERY_EVIDENCE_OUTCOMES,
  RECOVERY_EVIDENCE_TYPES,
  RecoveryDrillError,
} from "../security/recoveryDrillPolicy";

const drillIdInput = z.object({ drillId: z.string().uuid() });

function toTrpcError(error: unknown): never {
  if (!(error instanceof RecoveryDrillError)) throw error;
  const code =
    error.code === "NOT_FOUND"
      ? "NOT_FOUND"
      : error.code === "CONFLICT"
        ? "CONFLICT"
        : error.code === "INVALID_INPUT"
          ? "BAD_REQUEST"
          : error.code === "INVALID_STATE"
            ? "PRECONDITION_FAILED"
            : error.code === "NOT_AVAILABLE"
              ? "NOT_FOUND"
              : "FORBIDDEN";
  throw new TRPCError({ code, message: error.message });
}

export const recoveryDrillsRouter = router({
  snapshot: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await getRecoverySnapshot(
        ctx.user.id,
        ctx.req,
        ctx.securitySession
      );
    } catch (error) {
      return toTrpcError(error);
    }
  }),
  prepare: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(3).max(160),
        scheduledAt: z.number().int().positive(),
        approverEmail: z.string().trim().email().max(320),
        notes: z.string().trim().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await prepareRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          ...input,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  decide: protectedProcedure
    .input(
      z.object({
        drillId: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().min(3).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await decideRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          ...input,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  start: protectedProcedure
    .input(drillIdInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await startRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          drillId: input.drillId,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  recordEvidence: protectedProcedure
    .input(
      z.object({
        drillId: z.string().uuid(),
        evidenceType: z.enum(RECOVERY_EVIDENCE_TYPES),
        evidenceReference: z.string().trim().min(3).max(255),
        outcome: z.enum(RECOVERY_EVIDENCE_OUTCOMES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordRecoveryEvidence({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          ...input,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  contain: protectedProcedure
    .input(drillIdInput.extend({ reason: z.string().trim().min(3).max(255) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await containRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          ...input,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  complete: protectedProcedure
    .input(drillIdInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await completeRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          drillId: input.drillId,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
  abort: protectedProcedure
    .input(drillIdInput.extend({ reason: z.string().trim().min(3).max(255) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await abortRecoveryDrill({
          actorUserId: ctx.user.id,
          session: ctx.securitySession,
          req: ctx.req,
          ...input,
        });
      } catch (error) {
        return toTrpcError(error);
      }
    }),
});
