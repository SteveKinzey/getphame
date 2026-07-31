import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./auth-email.ts", import.meta.url), "utf8");

describe("magic-link new-account human verification", () => {
  it("requires a browser challenge only when canonical account lookup finds no existing user", () => {
    expect(source).toContain("const existingAccount =");
    expect(source).toContain("const humanProof = existingAccount");
    expect(source).toContain("verifyTurnstileHuman(");
    expect(source).toContain("createSignedHumanProof(normalizedEmail)");
    expect(source).toContain("if (humanProof === null)");
  });

  it("binds the proof into a one-time link and rechecks it before a new account is created", () => {
    expect(source).toContain('magicLinkParams.set("human_proof", humanProof)');
    expect(source).toContain("if (isNewUser && !verifySignedHumanProof(humanProof, email))");
    expect(source).toContain('provider: "email"');
    expect(source).toContain('outcome: "verified"');
  });
});
