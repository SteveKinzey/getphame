import type { Request } from "express";
import { afterEach, describe, expect, it } from "vitest";
import { hashSecurityValue, isPasskeySessionToken } from "./passkeySessions";
import { resolveWebauthnEnvironment } from "./webauthnEnvironment";

function request({
  host = "app.getphame.app",
  protocol = "https",
  origin,
}: { host?: string; protocol?: string; origin?: string } = {}) {
  return {
    protocol,
    headers: origin ? { origin } : {},
    get(name: string) {
      if (name.toLowerCase() === "host") return host;
      return undefined;
    },
  } as unknown as Request;
}

describe("passkey security invariants", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("binds Get Phame subdomains to the getphame.app relying party", () => {
    const result = resolveWebauthnEnvironment(request());
    expect(result).toEqual({
      origin: "https://app.getphame.app",
      rpID: "getphame.app",
      rpName: "Get Phame",
    });
  });

  it("rejects a browser origin that does not match the request host", () => {
    expect(() =>
      resolveWebauthnEnvironment(
        request({ origin: "https://attacker.example" })
      )
    ).toThrow("Passkey origin does not match");
  });

  it("rejects insecure non-local production origins", () => {
    process.env.NODE_ENV = "production";
    expect(() =>
      resolveWebauthnEnvironment(
        request({ protocol: "http", host: "app.getphame.app" })
      )
    ).toThrow("Passkeys require a secure HTTPS origin");
  });

  it("allows localhost HTTP only outside production", () => {
    process.env.NODE_ENV = "development";
    expect(
      resolveWebauthnEnvironment(
        request({ protocol: "http", host: "localhost" })
      ).rpID
    ).toBe("localhost");
  });

  it("recognizes only the opaque passkey session token format", () => {
    const token = `pk.123e4567-e89b-12d3-a456-426614174000.${"a".repeat(43)}`;
    expect(isPasskeySessionToken(token)).toBe(true);
    expect(isPasskeySessionToken("legacy.jwt.token")).toBe(false);
    expect(isPasskeySessionToken("pk.bad.short")).toBe(false);
  });

  it("hashes security evidence deterministically without retaining the source value", () => {
    const value = "sensitive-session-token";
    const digest = hashSecurityValue(value);
    expect(digest).toHaveLength(64);
    expect(digest).toBe(hashSecurityValue(value));
    expect(digest).not.toContain(value);
  });
});
