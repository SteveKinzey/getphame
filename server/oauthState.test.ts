import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
  encodeOAuthState,
} from "../shared/const";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Manus OAuth state protection", () => {
  it("round-trips a browser-bound redirect and nonce", () => {
    const payload = {
      redirectUri: "https://getphame.app/api/oauth/callback",
      nonce: "7ccf0db0-83a4-46b6-87ff-ecb7dc61044f",
    };

    expect(decodeOAuthState(encodeOAuthState(payload))).toEqual(payload);
    expect(OAUTH_STATE_COOKIE).toBe("__Host-oauth_state");
  });

  it("fails closed without throwing for malformed or structurally invalid state", () => {
    expect(decodeOAuthState("%%%not-base64%%%")).toEqual({ redirectUri: "" });
    expect(decodeOAuthState(btoa("not-json"))).toEqual({ redirectUri: "" });
    expect(decodeOAuthState(btoa(JSON.stringify({ redirectUri: 42, nonce: {} })))).toEqual({
      redirectUri: "",
    });
  });

  it("validates and clears the one-time nonce before exchanging an authorization code", () => {
    const callbackSource = readProjectFile("./_core/oauth.ts");
    const sdkSource = readProjectFile("./_core/sdk.ts");
    const guardIndex = callbackSource.indexOf("stateNonce !== cookieNonce");
    const clearIndex = callbackSource.indexOf("res.clearCookie(OAUTH_STATE_COOKIE");
    const exchangeIndex = callbackSource.indexOf("sdk.exchangeCodeForToken(code, state)");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(clearIndex).toBeGreaterThan(guardIndex);
    expect(exchangeIndex).toBeGreaterThan(clearIndex);
    expect(callbackSource).toContain('res.status(403).json({ error: "invalid oauth state" })');
    expect(callbackSource).not.toContain("JSON.parse(atob(state))");
    expect(sdkSource).toContain("decodeOAuthState(state).redirectUri");
    expect(sdkSource).not.toContain("const redirectUri = atob(state)");
  });
});
