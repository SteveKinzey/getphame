import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getSignupRiskReview } from "../signupRisk";

const reviewInput = z.object({
  outcome: z.enum(["allowed", "verified", "restricted", "blocked"]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

/** Administrator-only and deliberately limited to safe aggregate status data. */
export const signupRiskReviewRouter = router({
  dashboard: adminProcedure
    .input(reviewInput.optional())
    .query(({ input }) => getSignupRiskReview(reviewInput.parse(input ?? {}))),
});
