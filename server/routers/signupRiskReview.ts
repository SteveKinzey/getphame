import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import {
  getDisposableDomainReviewQueue,
  resolveDisposableDomainReview,
} from "../disposableDomains";
import { getSignupRiskReview } from "../signupRisk";

const reviewInput = z.object({
  outcome: z.enum(["allowed", "verified", "restricted", "blocked"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const disposableReviewInput = z.object({
  status: z.enum(["pending", "dismissed", "resolved"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

const resolveDisposableReviewInput = z.object({
  reviewId: z.number().int().positive(),
  status: z.enum(["dismissed", "resolved"]),
  adminNote: z.string().trim().max(500).optional(),
});

/** Administrator-only and deliberately limited to safe aggregate status data. */
export const signupRiskReviewRouter = router({
  dashboard: adminProcedure
    .input(reviewInput.optional())
    .query(({ input }) => getSignupRiskReview(reviewInput.parse(input ?? {}))),
  disposableDomainQueue: adminProcedure
    .input(disposableReviewInput.optional())
    .query(({ input }) => getDisposableDomainReviewQueue(disposableReviewInput.parse(input ?? {}))),
  resolveDisposableDomainReview: adminProcedure
    .input(resolveDisposableReviewInput)
    .mutation(async ({ ctx, input }) => {
      await resolveDisposableDomainReview({
        reviewId: input.reviewId,
        status: input.status,
        adminNote: input.adminNote,
        adminUserId: ctx.user.id,
      });
      return { ok: true };
    }),
});
