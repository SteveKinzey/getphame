import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  updateWhere: vi.fn(),
  upsertProfile: vi.fn(),
  setRoleMutate: vi.fn(),
  setLifeMutate: vi.fn(),
  deleteMutate: vi.fn(),
  combineMutate: vi.fn(),
}));

const directoryRows = [
  {
    id: 1,
    name: "Owner Admin",
    email: "owner@example.test",
    role: "admin" as const,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastSignedIn: new Date("2026-07-01T00:00:00Z"),
    tier: "free" as const,
  },
  {
    id: 2,
    name: "Life Member",
    email: "life@example.test",
    role: "user" as const,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    lastSignedIn: new Date("2026-07-02T00:00:00Z"),
    tier: "lifetime" as const,
  },
];

function createDb(options?: { targetRole?: "admin" | "user"; targetTier?: "free" | "lifetime" }) {
  return {
    select: vi.fn((selection: Record<string, unknown>) => {
      if ("count" in selection) {
        return { from: () => ({ where: async () => [{ count: 12 }] }) };
      }
      if ("id" in selection) {
        return {
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({ limit: () => ({ offset: async () => directoryRows }) }),
              }),
            }),
          }),
        };
      }
      return {
        from: () => ({
          leftJoin: () => ({
            where: () => ({
              limit: async () => [{
                name: "Target User",
                email: "target@example.test",
                role: options?.targetRole ?? "user",
                tier: options?.targetTier ?? "free",
              }],
            }),
          }),
        }),
      };
    }),
    update: vi.fn(() => ({ set: () => ({ where: mocks.updateWhere }) })),
    insert: vi.fn(() => ({ values: () => ({ onDuplicateKeyUpdate: mocks.upsertProfile }) })),
  };
}

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, name: "Owner Admin", email: "owner@example.test", role: "admin" },
  }),
}));

vi.mock("use-debounce", () => ({ useDebounce: (value: string) => [value] }));
vi.mock("wouter", () => ({ useLocation: () => ["/admin/users", vi.fn()] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let value = String(options?.defaultValue ?? key);
      for (const [name, replacement] of Object.entries(options ?? {})) {
        value = value.replaceAll(`{{${name}}}`, String(replacement));
      }
      return value;
    },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listUsers: { invalidate: vi.fn() } } }),
    admin: {
      listUsers: {
        useQuery: () => ({
          data: {
            users: directoryRows.map((row) => ({
              ...row,
              lifeAccess: row.role === "admin" || row.tier === "lifetime",
            })),
            page: 1,
            pageSize: 25,
            total: 30,
            pageCount: 2,
          },
          isLoading: false,
          error: null,
        }),
      },
      setUserRole: {
        useMutation: () => ({ mutate: mocks.setRoleMutate, isPending: false, variables: undefined }),
      },
      setLifeAccess: {
        useMutation: () => ({ mutate: mocks.setLifeMutate, isPending: false, variables: undefined }),
      },
      deleteUser: {
        useMutation: () => ({ mutate: mocks.deleteMutate, isPending: false, variables: undefined }),
      },
      combineAccounts: {
        useMutation: () => ({ mutate: mocks.combineMutate, isPending: false, variables: undefined }),
      },
    },
  },
}));

import { appRouter } from "./routers";

function context(role: "admin" | "user", id = role === "admin" ? 1 : 9): TrpcContext {
  return {
    user: {
      id,
      openId: `${role}-${id}`,
      email: `${role}-${id}@example.test`,
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

describe("administrator user-management runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "admin-users-runtime-test-secret-long-enough");
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.upsertProfile.mockResolvedValue(undefined);
  });

  it("rejects the complete directory workflow for non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.listUsers({ query: "", page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setUserRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setLifeAccess({ userId: 2, enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deleteUser({ userId: 2, confirmation: "DELETE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.combineAccounts({ sourceUserId: 2, targetUserId: 1, confirmation: "COMBINE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns searched, paginated accounts with effective administrator and Life access", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.listUsers({ query: "member", page: 2, pageSize: 10 });
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 12, pageCount: 2 });
    expect(result.users).toEqual([
      expect.objectContaining({ id: 1, role: "admin", lifeAccess: true }),
      expect.objectContaining({ id: 2, tier: "lifetime", lifeAccess: true }),
    ]);
  });

  it("prevents an administrator from removing their own administrator access", async () => {
    const caller = appRouter.createCaller(context("admin", 1));
    await expect(caller.admin.setUserRole({ userId: 1, role: "user" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "You cannot remove your own administrator access.",
    });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("persists role changes for another account", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    await expect(appRouter.createCaller(context("admin")).admin.setUserRole({ userId: 2, role: "admin" })).resolves.toEqual({ ok: true });
    expect(mocks.updateWhere).toHaveBeenCalledTimes(1);
  });

  it("grants Life access to a user and refuses to remove mandatory administrator Life access", async () => {
    mocks.getDb.mockResolvedValueOnce(createDb({ targetRole: "user", targetTier: "free" }));
    await expect(appRouter.createCaller(context("admin")).admin.setLifeAccess({ userId: 2, enabled: true })).resolves.toEqual({ ok: true });
    expect(mocks.upsertProfile).toHaveBeenCalledTimes(1);

    mocks.getDb.mockResolvedValueOnce(createDb({ targetRole: "admin", targetTier: "free" }));
    await expect(appRouter.createCaller(context("admin")).admin.setLifeAccess({ userId: 2, enabled: false })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Administrators always have Life access. Change the role first.",
    });
  });
});

describe("administrator user-management rendered workflow", () => {
  let AdminUsersPage: React.ComponentType;

  beforeAll(async () => {
    AdminUsersPage = (await import("../client/src/pages/AdminUsers")).default;
  });

  it("renders search, account states, role, Life, combine, delete, pagination, and self-protection controls", () => {
    const html = renderToStaticMarkup(React.createElement(AdminUsersPage));
    expect(html).toContain('id="admin-user-search"');
    expect(html).toContain("30 accounts");
    expect(html).toContain('data-testid="admin-user-1"');
    expect(html).toContain('data-testid="admin-user-2"');
    expect(html).toContain("Admin");
    expect(html).toContain("Life");
    expect(html).toContain("Page 1 of 2");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).toMatch(/Remove admin<\/button>/);
    expect(html).toMatch(/Remove Life<\/button>/);
    expect(html).toContain("Combine");
    expect(html).toContain("Delete");
    expect(html).toContain("disabled");
  });

  it("shows the selected duplicate flowing explicitly into the surviving account before confirmation", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "client/src/pages/AdminUsers.tsx"), "utf8");
    expect(source).toContain('data-testid="combine-direction-preview"');
    expect(source).toContain('defaultValue: "Merge direction"');
    expect(source).toContain('defaultValue: "deleted"');
    expect(source).toContain('defaultValue: "survives"');
    expect(source).toContain("sourceUserId: combineSource.id");
    expect(source).toContain("targetUserId: Number(combineTargetId)");
  });
});
