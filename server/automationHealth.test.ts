import { beforeEach, describe, expect, it, vi } from "vitest";

const joseMocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => "github-jwks"),
  jwtVerify: joseMocks.jwtVerify,
}));

import {
  AUTOMATION_HEALTH_AUDIENCE,
  AUTOMATION_HEALTH_ISSUER,
  AUTOMATION_HEALTH_OWNER_ID,
  AUTOMATION_HEALTH_REPOSITORY,
  AUTOMATION_HEALTH_REPOSITORY_ID,
  automationEventBodySchema,
  buildAutomationEventInsert,
  verifyAutomationOidcToken,
  type AutomationOidcClaims,
} from "./automationHealth";

const nowMs = Date.parse("2026-07-31T18:00:00.000Z");

function driftClaims(
  overrides: Partial<AutomationOidcClaims> = {}
): AutomationOidcClaims {
  return {
    actor: "github-actions[bot]",
    event_name: "schedule",
    exp: Math.floor(nowMs / 1000) + 300,
    iat: Math.floor(nowMs / 1000) - 30,
    jti: "oidc-jti-123456",
    ref: "refs/heads/main",
    repository: AUTOMATION_HEALTH_REPOSITORY,
    repository_id: AUTOMATION_HEALTH_REPOSITORY_ID,
    repository_owner_id: AUTOMATION_HEALTH_OWNER_ID,
    run_attempt: "2",
    run_id: "123456789",
    run_number: "42",
    sub: `repo:${AUTOMATION_HEALTH_REPOSITORY}:ref:refs/heads/main`,
    workflow: "Monthly Workflow Drift Audit",
    workflow_ref: `${AUTOMATION_HEALTH_REPOSITORY}/.github/workflows/workflow-drift-audit.yml@refs/heads/main`,
    workflow_sha: "a".repeat(40),
    ...overrides,
  };
}

function dependabotClaims(
  overrides: Partial<AutomationOidcClaims> = {}
): AutomationOidcClaims {
  return driftClaims({
    event_name: "pull_request",
    ref: "refs/pull/57/merge",
    base_ref: "main",
    head_ref: "dependabot/github_actions/actions-checkout-5",
    sub: `repo:${AUTOMATION_HEALTH_REPOSITORY}:pull_request`,
    workflow: "Dependabot merge observability",
    workflow_ref: `${AUTOMATION_HEALTH_REPOSITORY}/.github/workflows/dependabot-merge-observability.yml@refs/heads/main`,
    ...overrides,
  });
}

describe("Automation Health OIDC verification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the GitHub issuer, exact ingestion audience, and RS256", async () => {
    const claims = driftClaims();
    joseMocks.jwtVerify.mockResolvedValue({ payload: claims });

    await expect(
      verifyAutomationOidcToken("short-lived-token", nowMs)
    ).resolves.toEqual(claims);
    expect(joseMocks.jwtVerify).toHaveBeenCalledWith(
      "short-lived-token",
      "github-jwks",
      expect.objectContaining({
        issuer: AUTOMATION_HEALTH_ISSUER,
        audience: AUTOMATION_HEALTH_AUDIENCE,
        algorithms: ["RS256"],
      })
    );
  });

  it("rejects tokens older than the bounded freshness window", async () => {
    joseMocks.jwtVerify.mockResolvedValue({
      payload: driftClaims({ iat: Math.floor(nowMs / 1000) - 601 }),
    });

    await expect(
      verifyAutomationOidcToken("stale-token", nowMs)
    ).rejects.toThrow(/too old/i);
  });

  it("rejects repository identity drift before event construction", async () => {
    joseMocks.jwtVerify.mockResolvedValue({
      payload: { ...driftClaims(), repository_id: "999" },
    });

    await expect(
      verifyAutomationOidcToken("wrong-repository", nowMs)
    ).rejects.toThrow();
  });
});

describe("Automation Health event contract", () => {
  it("normalizes a drift event without retaining the raw OIDC token or JTI", () => {
    const claims = driftClaims();
    const event = buildAutomationEventInsert({
      claims,
      receivedAt: nowMs,
      body: {
        kind: "drift_audit",
        result: "failure",
        eventAt: nowMs - 1_000,
        durationMs: 12_000,
        failureCode: "workflow_failed",
        failureSummary: "The deterministic drift audit failed.",
      },
    });

    expect(event).toMatchObject({
      eventKey: "drift_audit:123456789:2",
      kind: "drift_audit",
      result: "failure",
      repository: AUTOMATION_HEALTH_REPOSITORY,
      runNumber: 42,
      runAttempt: 2,
      runUrl: `https://github.com/${AUTOMATION_HEALTH_REPOSITORY}/actions/runs/123456789`,
      failureCode: "workflow_failed",
    });
    expect(event.oidcJtiHash).toMatch(/^[a-f0-9]{64}$/);
    expect(event.oidcJtiHash).not.toContain(claims.jti);
    expect(event).not.toHaveProperty("token");
    expect(event).not.toHaveProperty("jti");
  });

  it("normalizes an allowed Dependabot GitHub Actions merge", () => {
    const event = buildAutomationEventInsert({
      claims: dependabotClaims(),
      receivedAt: nowMs,
      body: {
        kind: "dependabot_merge",
        result: "success",
        eventAt: nowMs,
        pullRequestNumber: 57,
        pullRequestCreatedAt: nowMs - 86_400_000,
        pullRequestMergedAt: nowMs,
      },
    });

    expect(event).toMatchObject({
      eventKey: "dependabot_merge:123456789:2",
      pullRequestNumber: 57,
      pullRequestCreatedAt: nowMs - 86_400_000,
      pullRequestMergedAt: nowMs,
      failureCode: null,
      failureSummary: null,
    });
  });

  it.each([
    [
      driftClaims({ ref: "refs/heads/release" }),
      { kind: "drift_audit", result: "success", eventAt: nowMs },
    ],
    [
      dependabotClaims({ head_ref: "feature/untrusted" }),
      {
        kind: "dependabot_merge",
        result: "success",
        eventAt: nowMs,
        pullRequestNumber: 57,
        pullRequestCreatedAt: nowMs - 1,
        pullRequestMergedAt: nowMs,
      },
    ],
  ] as const)("rejects a disallowed workflow identity %#", (claims, body) => {
    expect(() =>
      buildAutomationEventInsert({ claims, body, receivedAt: nowMs })
    ).toThrow(/not allowed/i);
  });

  it("rejects stale event timestamps independently of token freshness", () => {
    expect(() =>
      buildAutomationEventInsert({
        claims: driftClaims(),
        receivedAt: nowMs,
        body: {
          kind: "drift_audit",
          result: "success",
          eventAt: nowMs - 600_001,
        },
      })
    ).toThrow(/timestamp/i);
  });

  it.each([
    { kind: "drift_audit", result: "failure", eventAt: nowMs },
    {
      kind: "drift_audit",
      result: "success",
      eventAt: nowMs,
      failureCode: "workflow_failed",
      failureSummary: "Unexpected details",
    },
    {
      kind: "dependabot_merge",
      result: "success",
      eventAt: nowMs,
      pullRequestNumber: 57,
      pullRequestCreatedAt: nowMs,
      pullRequestMergedAt: nowMs - 1,
    },
    {
      kind: "drift_audit",
      result: "success",
      eventAt: nowMs,
      secret: "never-store",
    },
  ])("rejects malformed or overbroad payload %#", body => {
    expect(automationEventBodySchema.safeParse(body).success).toBe(false);
  });
});
