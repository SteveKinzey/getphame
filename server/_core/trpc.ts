import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, UNPAID_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "../db";
import { businessProfiles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * paidProcedure — requires an active paid subscription (pro, annual, or lifetime).
 * Free-tier users get a FORBIDDEN error which the frontend redirects to /upgrade.
 */
export const paidProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    const db = await getDb();
    const profile = await db.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, ctx.user.id),
    });

    const tier = profile?.tier ?? "free";
    const isPaid = tier === "pro" || tier === "annual" || tier === "lifetime";

    // For monthly/annual: also check expiry
    if (isPaid && tier !== "lifetime" && profile?.planExpiresAt) {
      if (Date.now() > profile.planExpiresAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: UNPAID_ERR_MSG });
      }
    }

    if (!isPaid) {
      throw new TRPCError({ code: "FORBIDDEN", message: UNPAID_ERR_MSG });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
