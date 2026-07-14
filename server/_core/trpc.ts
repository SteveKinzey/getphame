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

export function hasActivePaidEntitlement(input: {
  role?: string | null;
  tier?: string | null;
  planExpiresAt?: number | null;
  now?: number;
}): boolean {
  if (input.role === "admin") return true;

  const tier = input.tier ?? "free";
  if (tier === "lifetime") return true;
  if (tier !== "pro" && tier !== "annual") return false;

  return !input.planExpiresAt || (input.now ?? Date.now()) <= input.planExpiresAt;
}

/** Returns whether a user may access paid features, including the admin bypass. */
export async function userHasPaidAccess(
  user: NonNullable<TrpcContext["user"]>,
): Promise<boolean> {
  if (user.role === "admin") return true;

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const profile = await db.query.businessProfiles.findFirst({
    where: eq(businessProfiles.userId, user.id),
  });
  return hasActivePaidEntitlement({
    role: user.role,
    tier: profile?.tier,
    planExpiresAt: profile?.planExpiresAt,
  });
}

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

    if (!(await userHasPaidAccess(ctx.user))) {
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
