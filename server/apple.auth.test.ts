/**
 * Apple Sign In credential validation tests
 * Verifies that the 4 Apple env vars are set and that a client secret JWT can be generated.
 */
import { describe, it, expect } from "vitest";
import appleSignin from "apple-signin-auth";

describe("Apple Sign In credentials", () => {
  it("should have all 4 required env vars set", () => {
    expect(process.env.APPLE_CLIENT_ID).toBeTruthy();
    expect(process.env.APPLE_TEAM_ID).toBeTruthy();
    expect(process.env.APPLE_KEY_ID).toBeTruthy();
    expect(process.env.APPLE_PRIVATE_KEY).toBeTruthy();
  });

  it("APPLE_CLIENT_ID should be the Services ID format", () => {
    const clientId = process.env.APPLE_CLIENT_ID ?? "";
    // Services IDs typically follow reverse-domain format
    expect(clientId.length).toBeGreaterThan(0);
    expect(clientId).toContain(".");
  });

  it("APPLE_TEAM_ID should be 10 characters", () => {
    const teamId = process.env.APPLE_TEAM_ID ?? "";
    expect(teamId).toHaveLength(10);
  });

  it("APPLE_KEY_ID should be 10 characters", () => {
    const keyId = process.env.APPLE_KEY_ID ?? "";
    expect(keyId).toHaveLength(10);
  });

  it("should successfully generate a client secret JWT from the private key", () => {
    const privateKey = (process.env.APPLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
    expect(() => {
      const secret = appleSignin.getClientSecret({
        clientID: process.env.APPLE_CLIENT_ID!,
        teamID: process.env.APPLE_TEAM_ID!,
        privateKey,
        keyIdentifier: process.env.APPLE_KEY_ID!,
        expAfter: 15777000,
      });
      expect(secret).toBeTruthy();
      expect(secret.length).toBeGreaterThan(100);
      // JWT has 3 parts separated by dots
      expect(secret.split(".")).toHaveLength(3);
    }).not.toThrow();
  });
});
