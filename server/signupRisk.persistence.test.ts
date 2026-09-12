import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));

import { recordSignupRiskEvent } from "./signupRisk";

describe("signup-risk privacy-minimized persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SIGNUP_RISK_HMAC_SECRET =
      "signup-risk-test-secret-with-sufficient-entropy";
  });

  it("stores a one-way normalized account fingerprint and bounded safe outcome fields only", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    mocks.getDb.mockResolvedValue({ insert: vi.fn(() => ({ values })) });

    await recordSignupRiskEvent({
      userId: 17,
      subject: "Member@Private-Example.Test",
      provider: "google",
      outcome: "verified",
      reasonCode:
        "human_proof_verified_with_more_detail_than_the_persisted_bound_allows",
      humanVerified: true,
      now: 1_734_646_400_000,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 17,
        provider: "google",
        outcome: "verified",
        emailFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        emailDomain: "private-example.test",
        riskScore: 0,
        riskReasonsJson: expect.any(String),
        occurredAt: 1_734_646_400_000,
      })
    );

    const persisted = values.mock.calls[0]?.[0] as Record<string, unknown>;
    const serialized = JSON.stringify(persisted);
    expect(serialized).not.toContain("member@private-example.test");
    expect(serialized).not.toMatch(
      /ip(?:address)?|remoteip|device|useragent|fingerprintRaw|password|token/i
    );
    const reasons = JSON.parse(String(persisted.riskReasonsJson)) as string[];
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toBe("human_proof_verified_with_more_detail_than_the_p");
    expect(reasons[0]).toHaveLength(48);
    expect(Object.keys(persisted).sort()).toEqual([
      "emailDomain",
      "emailFingerprint",
      "occurredAt",
      "outcome",
      "provider",
      "riskReasonsJson",
      "riskScore",
      "userId",
    ]);
  });
});
