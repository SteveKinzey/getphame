import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { z } from "zod";
import { publicProcedure, router, securityProcedure } from "../_core/trpc";
import {
  beginPasskeyAuthentication,
  beginPasskeyRegistration,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  listPasskeys,
  renamePasskey,
  revokePasskey,
} from "../security/passkeys";

export const passkeysRouter = router({
  beginRegistration: securityProcedure("auth.factor.bootstrap").mutation(
    ({ ctx }) => beginPasskeyRegistration(ctx.user.id, ctx.req)
  ),
  finishRegistration: securityProcedure("auth.factor.enroll")
    .input(
      z.object({
        ceremonyId: z.string().length(64),
        displayName: z.string().trim().min(1).max(80).default("Passkey"),
        response: z.custom<RegistrationResponseJSON>(value =>
          Boolean(value && typeof value === "object")
        ),
      })
    )
    .mutation(({ ctx, input }) =>
      finishPasskeyRegistration(
        ctx.user.id,
        input.ceremonyId,
        input.response,
        input.displayName
      )
    ),
  beginAuthentication: publicProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(({ ctx, input }) =>
      beginPasskeyAuthentication(input.email, ctx.req)
    ),
  finishAuthentication: publicProcedure
    .input(
      z.object({
        ceremonyId: z.string().length(64),
        response: z.custom<AuthenticationResponseJSON>(value =>
          Boolean(value && typeof value === "object")
        ),
      })
    )
    .mutation(({ ctx, input }) =>
      finishPasskeyAuthentication(
        input.ceremonyId,
        input.response,
        ctx.req,
        ctx.res
      )
    ),
  list: securityProcedure("auth.factor.list").query(({ ctx }) =>
    listPasskeys(ctx.user.id)
  ),
  rename: securityProcedure("auth.factor.rename")
    .input(
      z.object({
        credentialId: z.number().int().positive(),
        displayName: z.string().trim().min(1).max(80),
      })
    )
    .mutation(({ ctx, input }) =>
      renamePasskey(ctx.user.id, input.credentialId, input.displayName)
    ),
  revoke: securityProcedure("auth.factor.delete")
    .input(z.object({ credentialId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      revokePasskey(ctx.user.id, input.credentialId)
    ),
});
