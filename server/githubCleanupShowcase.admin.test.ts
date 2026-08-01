import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id: role === "admin" ? 1 : 2,
      openId: `${role}-github-cleanup`,
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

describe("admin GitHub cleanup showcase", () => {
  beforeEach(() => {
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ suspendedUntil: null }],
          }),
        }),
      })),
    });
  });

  it("rejects non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.githubCleanupShowcase.dashboard()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns the verified showcase snapshot to administrators", async () => {
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.githubCleanupShowcase.dashboard();

    expect(result.snapshot).toMatchObject({
      repository: "SteveKinzey/getphame",
      mainShortSha: "29dc09d",
      exactReleaseTreeMatch: true,
      openPullRequests: 0,
      namedBranches: 2,
    });
    expect(result.workstreams.map((item) => item.priority)).toEqual([1, 2, 3, 4]);
    expect(result.divergence).toMatchObject({ commitsAhead: 27, commitsBehindMain: 96, branchOnlyFiles: 20 });
    expect(JSON.stringify(result)).not.toContain("/manus-storage/");
    expect(result.script.scenes).toHaveLength(8);
  });
});
