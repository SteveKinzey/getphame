import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSignedHumanProof, verifySignedHumanProof } from "./signupRisk";

describe("signed human-verification proofs", () => {
  const originalSecret = process.env.SIGNUP_RISK_HMAC_SECRET;

  beforeEach(() => {
    process.env.SIGNUP_RISK_HMAC_SECRET = "proof-test-secret-that-is-long-enough-and-not-production";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SIGNUP_RISK_HMAC_SECRET;
    else process.env.SIGNUP_RISK_HMAC_SECRET = originalSecret;
  });

  it("accepts an untampered proof only for the bound subject inside its lifetime", () => {
    const issuedAt = 1_000_000;
    const proof = createSignedHumanProof("new-account@example.com", issuedAt);
    expect(verifySignedHumanProof(proof, "new-account@example.com", issuedAt + 1)).toBe(true);
    expect(verifySignedHumanProof(proof, "different@example.com", issuedAt + 1)).toBe(false);
    expect(verifySignedHumanProof(proof, "new-account@example.com", issuedAt + 15 * 60 * 1000 + 1)).toBe(false);
  });

  it("rejects a modified or malformed proof", () => {
    const proof = createSignedHumanProof("provider-oauth", 1_000_000);
    expect(verifySignedHumanProof(`${proof}x`, "provider-oauth", 1_000_001)).toBe(false);
    expect(verifySignedHumanProof("not-a-proof", "provider-oauth", 1_000_001)).toBe(false);
  });
});
