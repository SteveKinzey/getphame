import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOMATION_HEALTH_PATH,
  AUTOMATION_HEALTH_REPOSITORY,
  AUTOMATION_HEALTH_REPOSITORY_ID,
  AUTOMATION_HEALTH_OWNER_ID,
  type AutomationOidcClaims,
} from "./automationHealth";
import { AutomationReplayError } from "./automationHealthDb";
import { createAutomationHealthHandler } from "./automationHealthRoutes";

const nowMs = Date.parse("2026-07-31T18:00:00.000Z");

const claims: AutomationOidcClaims = {
  actor: "github-actions[bot]",
  event_name: "schedule",
  exp: Math.floor(nowMs / 1000) + 300,
  iat: Math.floor(nowMs / 1000) - 30,
  jti: "route-jti-123456",
  ref: "refs/heads/main",
  repository: AUTOMATION_HEALTH_REPOSITORY,
  repository_id: AUTOMATION_HEALTH_REPOSITORY_ID,
  repository_owner_id: AUTOMATION_HEALTH_OWNER_ID,
  run_attempt: "1",
  run_id: "987654321",
  run_number: "8",
  sub: `repo:${AUTOMATION_HEALTH_REPOSITORY}:ref:refs/heads/main`,
  workflow: "Monthly Workflow Drift Audit",
  workflow_ref: `${AUTOMATION_HEALTH_REPOSITORY}/.github/workflows/workflow-drift-audit.yml@refs/heads/main`,
  workflow_sha: "b".repeat(40),
};

function buildApp(
  input: {
    verifyToken?: ReturnType<typeof vi.fn>;
    ingest?: ReturnType<typeof vi.fn>;
  } = {}
) {
  const verifyToken = input.verifyToken ?? vi.fn().mockResolvedValue(claims);
  const ingest =
    input.ingest ?? vi.fn().mockResolvedValue({ eventId: 1, duplicate: false });
  const app = express();
  app.post(
    AUTOMATION_HEALTH_PATH,
    express.json({ limit: "16kb" }),
    createAutomationHealthHandler({ now: () => nowMs, verifyToken, ingest })
  );
  return { app, verifyToken, ingest };
}

const validBody = {
  kind: "drift_audit",
  result: "success",
  eventAt: nowMs,
};

describe("Automation Health event ingestion", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires a bearer token and disables caching", async () => {
    const { app, verifyToken } = buildApp();
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({ accepted: false, code: "unauthorized" });
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects malformed events before token verification", async () => {
    const { app, verifyToken } = buildApp();
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send({ ...validBody, extra: "not-allowed" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ accepted: false, code: "invalid_event" });
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("stores a new verified event and returns 201", async () => {
    const { app, verifyToken, ingest } = buildApp();
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ accepted: true, duplicate: false });
    expect(verifyToken).toHaveBeenCalledWith("oidc", nowMs);
    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: "drift_audit:987654321:1",
        kind: "drift_audit",
        result: "success",
      })
    );
  });

  it("returns 200 for an idempotent delivery of the same workflow event", async () => {
    const ingest = vi.fn().mockResolvedValue({ eventId: 1, duplicate: true });
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ accepted: true, duplicate: true });
  });

  it("rejects replay of the same OIDC token across different events", async () => {
    const ingest = vi.fn().mockRejectedValue(new AutomationReplayError());
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ accepted: false, code: "replayed_token" });
  });

  it("maps OIDC failures to a generic unauthorized response", async () => {
    const error = new Error("expired");
    error.name = "JWTExpired";
    const verifyToken = vi.fn().mockRejectedValue(error);
    const { app } = buildApp({ verifyToken });
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ accepted: false, code: "unauthorized" });
    expect(JSON.stringify(response.body)).not.toContain("expired");
  });

  it("sanitizes unexpected storage failures and does not expose details", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const ingest = vi
      .fn()
      .mockRejectedValue(new Error("database-secret-detail"));
    const { app } = buildApp({ ingest });
    const response = await request(app)
      .post(AUTOMATION_HEALTH_PATH)
      .set("Authorization", "Bearer oidc")
      .send(validBody);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      accepted: false,
      code: "temporarily_unavailable",
    });
    expect(JSON.stringify(response.body)).not.toMatch(/database|secret/i);
    expect(errorSpy).toHaveBeenCalledWith(
      "[AutomationHealth] Event ingestion failed",
      { errorType: "Error" }
    );
  });
});
