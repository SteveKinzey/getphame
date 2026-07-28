import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createProviderOAuthState,
  PASSKEY_ENROLLMENT_INTENT,
  providerEmailMatches,
  verifyProviderOAuthState,
} from "./security/passkeyEnrollmentIntent";

describe("passkey provider verification state", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "passkey-provider-test-secret-with-sufficient-entropy";
  });

  it("signs, verifies, and email-binds a bounded enrollment intent", () => {
    const expectedEmailHash = "a".repeat(64);
    const state = createProviderOAuthState({ intent: PASSKEY_ENROLLMENT_INTENT, expectedEmailHash });
    expect(verifyProviderOAuthState(state)).toEqual(expect.objectContaining({ intent: PASSKEY_ENROLLMENT_INTENT, expectedEmailHash }));
    expect(verifyProviderOAuthState(`${state}tampered`)).toBeNull();
  });

  it("matches normalized provider email without exposing it in state", () => {
    const email = "Member@Example.Test";
    const expectedEmailHash = crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
    const state = createProviderOAuthState({ intent: PASSKEY_ENROLLMENT_INTENT, expectedEmailHash });
    expect(state).not.toContain(email.toLowerCase());
    expect(providerEmailMatches(" member@example.test ", expectedEmailHash)).toBe(true);
    expect(providerEmailMatches("different@example.test", expectedEmailHash)).toBe(false);
  });

  it("wires both providers to canonical verified-email linking and fixed recovery paths", () => {
    const google = readFileSync(path.resolve(process.cwd(), "server/auth-google.ts"), "utf8");
    const apple = readFileSync(path.resolve(process.cwd(), "server/appleAuth.ts"), "utf8");
    expect(google).toContain("verifyProviderOAuthState");
    expect(apple).toContain("verifySignedAppleState");
    for (const source of [google, apple]) {
      expect(source).toContain("providerEmailMatches");
      expect(source).toContain("linkUserIdentity");
      expect(source).toContain("PASSKEY_ENROLLMENT_MISMATCH_PATH");
      expect(source).toContain("PASSKEY_ENROLLMENT_CANCEL_PATH");
      expect(source).toContain("PASSKEY_ENROLLMENT_SUCCESS_PATH");
    }
  });
});
