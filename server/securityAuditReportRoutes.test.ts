import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SECURITY_AUDIT_OWNER_ID,
  SECURITY_AUDIT_PATH,
  SECURITY_AUDIT_REPOSITORY,
  SECURITY_AUDIT_REPOSITORY_ID,
  type SecurityAuditOidcClaims,
} from "./securityAuditReporting";
import { SecurityAuditReplayError } from "./securityAuditReports";
import { createSecurityAuditReportHandler } from "./securityAuditReportRoutes";

const nowMs = Date.parse("2026-07-31T18:00:00.000Z");

const claims: SecurityAuditOidcClaims = {
  actor: "github-actions[bot]",
  event_name: "schedule",
  exp: Math.floor(nowMs / 1000) + 300,
  iat: Math.floor(nowMs / 1000) - 30,
  jti: "security-audit-route-jti-123456",
  ref: "refs/heads/main",
  repository: SECURITY_AUDIT_REPOSITORY,
  repository_id: SECURITY_AUDIT_REPOSITORY_ID,
  repository_owner_id: SECURITY_AUDIT_OWNER_ID,
  run_attempt: "1",
  run_id: "987654321",
  run_number: "8",
  sub: `repo:${SECURITY_AUDIT_REPOSITORY}:ref:refs/heads/main`,
  workflow: "Monthly Dependency Security Audit",
  workflow_ref: `${SECURITY_AUDIT_REPOSITORY}/.github/workflows/monthly-dependency-security-audit.yml@refs/heads/main`,
  workflow_sha: "b".repeat(40),
};

const validBody = {
  outcome: "clean",
  eventAt: nowMs,
  durationMs: 1_000,
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
  testStatus: "passed",
  buildStatus: "not_run",
};

function buildApp(
  input: {
    verifyToken?: ReturnType<typeof vi.fn>;
    ingest?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const verifyToken = input.verifyToken ?? vi.fn().mockResolvedValue(claims);
  const ingest =
    input.ingest ??
    vi.fn().mockResolvedValue({ reportId: 1, duplicate: false });
  const app = express();
  app.post(
    SECURITY_AUDIT_PATH,
    express.json({ limit: "16kb" }),
    createSecurityAuditReportHandler({ now: () => nowMs, verifyToken, ingest })
  );
  return { app, verifyToken, ingest };
}

describe("Security audit report ingestion", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires a bearer token and disables caching", async () => {
    const { app, verifyToken } = buildApp();
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ accepted: false, code: "unauthorized" });
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects malformed reports before token verification", async () => {
    const { app, verifyToken } = buildApp();
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send({ ...validBody, rawAuditLog: "must-not-be-stored" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ accepted: false, code: "invalid_report" });
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("stores a new verified sanitized report and returns 201", async () => {
    const { app, verifyToken, ingest } = buildApp();
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ accepted: true, duplicate: false });
    expect(verifyToken).toHaveBeenCalledWith("oidc", nowMs);
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: "dependency_audit:987654321:1",
        outcome: "clean",
        runUrl:
          "https://github.com/SteveKinzey/getphame/actions/runs/987654321",
      })
    );
    expect(JSON.stringify(ingest.mock.calls)).not.toContain("rawAuditLog");
  });

  it("returns 200 for an idempotent delivery of the same workflow run", async () => {
    const ingest = vi.fn().mockResolvedValue({ reportId: 1, duplicate: true });
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accepted: true, duplicate: true });
  });

  it("rejects replay of the same OIDC token across distinct reports", async () => {
    const ingest = vi.fn().mockRejectedValue(new SecurityAuditReplayError());
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ accepted: false, code: "replayed_token" });
  });

  it("maps OIDC failures to a generic unauthorized response", async () => {
    const error = new Error("expired token details");
    error.name = "JWTExpired";
    const verifyToken = vi.fn().mockRejectedValue(error);
    const { app } = buildApp({ verifyToken });
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ accepted: false, code: "unauthorized" });
    expect(JSON.stringify(response.body)).not.toContain("expired");
  });

  it("sanitizes unexpected storage failures", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const ingest = vi
      .fn()
      .mockRejectedValue(new Error("database-secret-detail"));
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(SECURITY_AUDIT_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      accepted: false,
      code: "temporarily_unavailable",
    });
    expect(JSON.stringify(response.body)).not.toMatch(/database|secret/i);
    expect(errorSpy).toHaveBeenCalledWith(
      "[SecurityAuditReports] Report ingestion failed",
      { errorType: "Error" }
    );
  });
});
