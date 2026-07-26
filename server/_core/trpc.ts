import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, UNPAID_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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

/**
 * paidProcedure — requires an active paid subscription (pro / annual / lifetime).
 * Free-tier users receive FORBIDDEN with code 10003 which the client
 * intercepts to show the PaywallModal instead of a generic error toast.
 */
const requirePaid = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const { getBusinessProfile } = await import("../db");
  const profile = await getBusinessProfile(ctx.user.id);
  const tier = profile?.tier ?? "free";
  if (tier === "free") {
    throw new TRPCError({ code: "FORBIDDEN", message: UNPAID_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const paidProcedure = t.procedure.use(requirePaid);
