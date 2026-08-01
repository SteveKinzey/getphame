import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, UNPAID_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "../db";
import { businessProfiles, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { hasPaidOrAdminAccess } from "../entitlements";
import { findActiveComplimentaryAccess } from "../complimentaryAccess";
import { authorizeRequest, type AuthorizationRequestOptions } from "../security/authorization";
import type { SecurityPermission } from "../security/policy";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

async function ensureAccountIsActive(userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [account] = await db
    .select({ suspendedUntil: users.suspendedUntil })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (account?.suspendedUntil && account.suspendedUntil > Date.now()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This account is temporarily suspended. Contact Get Phame support if you need assistance.",
    });
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  await ensureAccountIsActive(ctx.user.id);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/**
 * Server-side zero-trust procedure factory. Observe mode is the safe default;
 * enforcement activates only when ZERO_TRUST_ROLLOUT_MODE=enforce.
 */
export const securityProcedure = (
  permission: SecurityPermission,
  resolveOptions?: (input: unknown, ctx: TrpcContext) => AuthorizationRequestOptions,
) => protectedProcedure.use(t.middleware(async ({ ctx, input, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const result = await authorizeRequest(ctx, permission, resolveOptions?.(input, ctx) ?? {});
  if (result.mode === "enforce" && !result.decision.allowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Access denied (${result.decision.reasonCode})` });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
}));

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

    await ensureAccountIsActive(ctx.user.id);

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const profile = await db.query.businessProfiles.findFirst({
      where: eq(businessProfiles.userId, ctx.user.id),
    });
    const complimentaryAccess = ctx.user.role === "admin"
      ? null
      : await findActiveComplimentaryAccess({ userId: ctx.user.id, email: ctx.user.email });

    if (!hasPaidOrAdminAccess({
      role: ctx.user.role,
      tier: profile?.tier ?? "free",
      planExpiresAt: profile?.planExpiresAt,
      complimentaryAccessExpiresAt: complimentaryAccess?.expiresAt,
    })) {
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

    await ensureAccountIsActive(ctx.user.id);

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
