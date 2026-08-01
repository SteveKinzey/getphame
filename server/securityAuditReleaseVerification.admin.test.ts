import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { buildSecurityAuditReleaseVerificationPayload } from "./routers/securityAuditReleaseVerification";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-security-audit-release`,
      email: `${role}@example.com`,
      name: role,
      loginMethod: "email",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    securitySession: null,
  };
}

describe("administrator security-audit release verification", () => {
  it("rejects non-administrator accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(
      caller.securityAuditReleaseVerification.dashboard()
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns a fresh payload for each request", () => {
    const first = buildSecurityAuditReleaseVerificationPayload();
    const second = buildSecurityAuditReleaseVerificationPayload();

    expect(first).not.toBe(second);
    expect(first.release).not.toBe(second.release);
    expect(first.evidence).not.toBe(second.evidence);
    expect(first.evidence[0]).not.toBe(second.evidence[0]);
    expect(first.nextOperationalConfirmation).not.toBe(
      second.nextOperationalConfirmation
    );
    expect(first.nextOperationalConfirmation.steps).not.toBe(
      second.nextOperationalConfirmation.steps
    );
    expect(first.privacy).not.toBe(second.privacy);
  });

  it("returns the verified, sanitized release evidence only to administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.securityAuditReleaseVerification.dashboard();

    expect(result).toMatchObject({
      status: "verified",
      release: {
        title: "Security Audit History",
        repository: "SteveKinzey/getphame",
        protectedBranch: "main",
      },
      nextOperationalConfirmation: {
        title: "Confirm the first scheduled audit",
      },
    });
    expect(result.evidence).toHaveLength(5);
    expect(result.evidence.every(item => item.status === "passed")).toBe(true);

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toMatch(/https?:\/\//);
    expect(serialized).not.toContain("runurl");
    expect(serialized).not.toContain("advisoryid");
    expect(serialized).not.toContain("authorization: bearer");
  });
});
