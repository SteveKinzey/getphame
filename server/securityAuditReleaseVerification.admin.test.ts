import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { buildSecurityAuditReleaseVerificationPayload } from "./routers/securityAuditReleaseVerification";

function context(role: "admin" | "user" | null): TrpcContext {
  return {
    user: role
      ? {
          id: role === "admin" ? 1 : 2,
          openId: `${role}-security-audit-release`,
          email: `${role}@example.com`,
          name: role,
          loginMethod: "email",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    securitySession: null,
  };
}

describe("administrator security-audit release verification", () => {
  it.each([
    ["unauthenticated", null],
    ["non-administrator", "user" as const],
  ])("rejects %s callers before returning evidence", async (_label, role) => {
    const caller = appRouter.createCaller(context(role));
    await expect(
      caller.securityAuditReleaseVerification.dashboard()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns a fresh payload for each request", () => {
    const first = buildSecurityAuditReleaseVerificationPayload();
    const second = buildSecurityAuditReleaseVerificationPayload();

    expect(first).not.toBe(second);
    expect(first.release).not.toBe(second.release);
    expect(first.determination).not.toBe(second.determination);
    expect(first.accessBoundary).not.toBe(second.accessBoundary);
    expect(first.accessBoundary[0]).not.toBe(second.accessBoundary[0]);
    expect(first.validationGates).not.toBe(second.validationGates);
    expect(first.productionControls).not.toBe(second.productionControls);
    expect(first.lineage).not.toBe(second.lineage);
    expect(first.schema).not.toBe(second.schema);
    expect(first.schema.indexes).not.toBe(second.schema.indexes);
    expect(first.evidence).not.toBe(second.evidence);
    expect(first.evidence[0]).not.toBe(second.evidence[0]);
    expect(first.nextOperationalConfirmation).not.toBe(second.nextOperationalConfirmation);
    expect(first.nextOperationalConfirmation.steps).not.toBe(second.nextOperationalConfirmation.steps);
    expect(first.privacy).not.toBe(second.privacy);
  });

  it("returns the sanitized internal dossier only to administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.securityAuditReleaseVerification.dashboard();

    expect(result).toMatchObject({
      audience: "administrators",
      status: "verified",
      release: {
        title: "Security Audit History",
        repository: "SteveKinzey/getphame",
        protectedBranch: "main",
      },
      determination: {
        release: "verified",
        scheduledReport: "pending_expected",
      },
      lineage: {
        pullRequest: 72,
        mergeCommit: "c48585a",
        qualityGateRun: "30679098927",
        preservedInProtectedMain: true,
      },
      nextOperationalConfirmation: {
        title: "Confirm the first scheduled audit",
      },
    });
    expect(result.accessBoundary[0]).toEqual({
      id: "unauthenticated",
      status: "blocked",
      pageOutcome: "public_landing_only",
      apiOutcome: "FORBIDDEN",
      payloadOutcome: "none",
    });
    expect(result.accessBoundary).toHaveLength(3);
    expect(result.validationGates).toHaveLength(6);
    expect(result.productionControls).toHaveLength(4);
    expect(result.evidence).toHaveLength(5);
    expect(result.evidence.every(item => item.status === "passed")).toBe(true);
    expect(result.schema).toEqual({
      table: "security_audit_reports",
      indexes: [
        "security_audit_reports_event_idx",
        "security_audit_reports_outcome_event_idx",
      ],
      rowDataInspected: false,
    });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toContain("runurl");
    expect(serialized).not.toContain("advisoryid");
    expect(serialized).not.toContain("authorization: bearer");
    expect(serialized).not.toContain("manus-storage");
    expect(serialized).not.toContain("download full report");
  });
});
