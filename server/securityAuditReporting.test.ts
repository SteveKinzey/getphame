import { describe, expect, it } from "vitest";
import {
  SECURITY_AUDIT_OWNER_ID,
  SECURITY_AUDIT_REPOSITORY,
  SECURITY_AUDIT_REPOSITORY_ID,
  buildSecurityAuditReportInsert,
  securityAuditEventBodySchema,
  type SecurityAuditOidcClaims,
} from "./securityAuditReporting";

const nowMs = Date.parse("2026-07-31T18:00:00.000Z");

const body = {
  outcome: "clean" as const,
  eventAt: nowMs,
  production: {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    dependencyCount: 100,
  },
  full: {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
    dependencyCount: 150,
  },
  updatedPackageCount: 0,
  testStatus: "passed" as const,
  buildStatus: "not_run" as const,
};

const claims: SecurityAuditOidcClaims = {
  actor: "github-actions[bot]",
  event_name: "schedule",
  exp: Math.floor(nowMs / 1000) + 300,
  iat: Math.floor(nowMs / 1000) - 30,
  jti: "security-audit-contract-jti-123456",
  ref: "refs/heads/main",
  repository: SECURITY_AUDIT_REPOSITORY,
  repository_id: SECURITY_AUDIT_REPOSITORY_ID,
  repository_owner_id: SECURITY_AUDIT_OWNER_ID,
  run_attempt: "2",
  run_id: "123456789",
  run_number: "9",
  sub: `repo:${SECURITY_AUDIT_REPOSITORY}:ref:refs/heads/main`,
  workflow: "Monthly Dependency Security Audit",
  workflow_ref: `${SECURITY_AUDIT_REPOSITORY}/.github/workflows/monthly-dependency-security-audit.yml@refs/heads/main`,
  workflow_sha: "c".repeat(40),
};

describe("Security audit reporting contract", () => {
  it("accepts a clean, consistent, sanitized audit report", () => {
    expect(securityAuditEventBodySchema.parse(body)).toMatchObject(body);
  });

  it("rejects a clean report that contains a full audit vulnerability", () => {
    const parsed = securityAuditEventBodySchema.safeParse({
      ...body,
      full: { ...body.full, high: 1 },
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a claimed production count greater than the full audit", () => {
    const parsed = securityAuditEventBodySchema.safeParse({
      ...body,
      production: { ...body.production, critical: 1 },
      full: { ...body.full, critical: 0 },
    });

    expect(parsed.success).toBe(false);
  });

  it("requires a bounded sanitized failure description for failed outcomes", () => {
    const parsed = securityAuditEventBodySchema.safeParse({
      ...body,
      outcome: "failed",
      testStatus: "failed",
    });

    expect(parsed.success).toBe(false);
  });

  it("derives identity-bound persistence fields without retaining a bearer token", () => {
    const parsed = securityAuditEventBodySchema.parse(body);
    const insert = buildSecurityAuditReportInsert({
      body: parsed,
      claims,
      receivedAt: nowMs + 1_000,
    });

    expect(insert).toMatchObject({
      eventKey: "dependency_audit:123456789:2",
      oidcJtiHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      runUrl: "https://github.com/SteveKinzey/getphame/actions/runs/123456789",
      outcome: "clean",
    });
    expect(JSON.stringify(insert)).not.toMatch(/bearer|token/i);
  });

  it("rejects an unexpected workflow identity before persistence", () => {
    const parsed = securityAuditEventBodySchema.parse(body);

    expect(() =>
      buildSecurityAuditReportInsert({
        body: parsed,
        claims: { ...claims, workflow: "Untrusted workflow" },
        receivedAt: nowMs + 1_000,
      })
    ).toThrow(/not allowed/i);
  });
});
