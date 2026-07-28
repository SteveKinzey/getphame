import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { authenticatePasskeySession } from "../security/passkeySessions";

export type SecuritySessionContext = {
  id: string;
  method: "passkey" | "magic_link" | "oauth";
  assurance: "a0" | "a1" | "a2";
  recentAuthenticationAt: number | null;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  securitySession: SecuritySessionContext | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const passkeySession = await authenticatePasskeySession(opts.req);
    if (passkeySession) {
      return {
        req: opts.req,
        res: opts.res,
        user: passkeySession.user,
        securitySession: passkeySession.securitySession,
      };
    }
  } catch (error) {
    console.warn("[Auth] Passkey session resolution failed; continuing with legacy session validation");
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    securitySession: null,
  };
}
