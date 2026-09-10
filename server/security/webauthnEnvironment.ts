import type { Request } from "express";
import { TRPCError } from "@trpc/server";

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value?.split(",")[0]?.trim();
}

export function resolveWebauthnEnvironment(req: Request) {
  const host = firstHeader(req.headers["x-forwarded-host"]) ?? req.get("host");
  const protocol =
    firstHeader(req.headers["x-forwarded-proto"]) ?? req.protocol;
  if (!host)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unable to determine passkey relying party",
    });
  const requestOrigin = `${protocol}://${host}`;
  const suppliedOrigin = firstHeader(req.headers.origin);
  let originUrl: URL;
  let requestUrl: URL;
  try {
    originUrl = new URL(suppliedOrigin ?? requestOrigin);
    requestUrl = new URL(requestOrigin);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid passkey origin",
    });
  }
  if (originUrl.origin !== requestUrl.origin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Passkey origin does not match this Get Phame host",
    });
  }
  const localDevelopment =
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1"].includes(originUrl.hostname);
  if (originUrl.protocol !== "https:" && !localDevelopment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Passkeys require a secure HTTPS origin",
    });
  }
  const rpID =
    originUrl.hostname === "getphame.app" ||
    originUrl.hostname.endsWith(".getphame.app")
      ? "getphame.app"
      : originUrl.hostname;
  return { origin: originUrl.origin, rpID, rpName: "Get Phame" };
}
