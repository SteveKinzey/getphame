import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptSourceSecrets, encryptSourceSecrets, isEncryptedSourceSecret } from "./sourceSecrets";

describe("Sources credential encryption", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-only-source-secret-with-sufficient-length";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("round-trips credential values without exposing plaintext", () => {
    const encrypted = encryptSourceSecrets({ consumerKey: "ck_secret", consumerSecret: "cs_secret" });
    expect(isEncryptedSourceSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain("ck_secret");
    expect(encrypted).not.toContain("cs_secret");
    expect(decryptSourceSecrets(encrypted)).toEqual({ consumerKey: "ck_secret", consumerSecret: "cs_secret" });
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSourceSecrets({ value: "secret" });
    const replacement = encrypted.endsWith("A") ? "B" : "A";
    expect(() => decryptSourceSecrets(`${encrypted.slice(0, -1)}${replacement}`)).toThrow();
  });

  it("refuses to encrypt credentials without a managed secret", () => {
    delete process.env.JWT_SECRET;
    expect(() => encryptSourceSecrets({ value: "secret" })).toThrow(/JWT_SECRET/);
  });
});
