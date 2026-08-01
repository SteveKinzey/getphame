import type { Request } from "express";
import { verifyTurnstileHuman } from "../signupRisk";

export async function verifyProviderStartHumanToken(
  req: Request,
  token: unknown
): Promise<boolean> {
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    return false;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const remoteIp =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
      ?.split(",")[0]
      ?.trim() || req.ip;
  return verifyTurnstileHuman(token, remoteIp);
}
