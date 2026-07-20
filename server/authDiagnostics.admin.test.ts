import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listAuthDiagnosticEvents: vi.fn(),
  getAuthDiagnosticSummary: vi.fn(),
  listAuthHealthChecks: vi.fn(),
  runAuthHealthCheck: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  listAuthDiagnosticEvents: mocks.listAuthDiagnosticEvents,
  getAuthDiagnosticSummary: mocks.getAuthDiagnosticSummary,
  listAuthHealthChecks: mocks.listAuthHealthChecks,
}));

vi.mock("./authOperations", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./authOperations")>()),
  runAuthHealthCheck: mocks.runAuthHealthCheck,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-account`,
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
  };
}

describe("admin authentication diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "admin-diagnostics-test-secret-long-enough");
    mocks.listAuthDiagnosticEvents.mockResolvedValue([]);
    mocks.getAuthDiagnosticSummary.mockResolvedValue({ total: 0, ok: 0, fail: 0 });
    mocks.listAuthHealthChecks.mockResolvedValue([]);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.authDiagnostics.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins and converts an exact email filter to a one-way fingerprint", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.authDiagnostics.dashboard({ email: "Person@Example.com", days: 7, limit: 20 });
    expect(mocks.listAuthDiagnosticEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        emailFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        limit: 20,
      }),
    );
    expect(JSON.stringify(mocks.listAuthDiagnosticEvents.mock.calls[0]?.[0])).not.toContain("person@example.com");
  });
});
