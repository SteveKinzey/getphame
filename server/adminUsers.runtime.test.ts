import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  updateWhere: vi.fn(),
  deleteWhere: vi.fn(),
  upsertProfile: vi.fn(),
  setRoleMutate: vi.fn(),
  setLifeMutate: vi.fn(),
  deleteMutate: vi.fn(),
  combineMutate: vi.fn(),
  removeSmtpMutate: vi.fn(),
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
    smtpCredentialId: 101,
    smtpVerified: 1,
    smtpFromEmail: "owner@example.test",
  },
  {
    id: 2,
    name: "Life Member",
    email: "life@example.test",
    role: "user" as const,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    lastSignedIn: new Date("2026-07-02T00:00:00Z"),
    tier: "lifetime" as const,
    smtpCredentialId: 202,
    smtpVerified: 0,
    smtpFromEmail: "life@example.test",
  },
];

function createDb(options?: { targetRole?: "admin" | "user"; targetTier?: "free" | "lifetime" }) {
  return {
    select: vi.fn((selection: Record<string, unknown>) => {
      if ("count" in selection) {
        return { from: () => ({ where: async () => [{ count: 12 }] }) };
      }
      if ("id" in selection) {
        const listChain = {
          leftJoin: () => listChain,
          where: () => ({
            orderBy: () => ({ limit: () => ({ offset: async () => directoryRows }) }),
          }),
        };
        return {
          from: () => "smtpCredentialId" in selection
            ? listChain
            : {
                where: () => ({
                  limit: async () => [{ id: 2, email: "target@example.test" }],
                }),
              },
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
    delete: vi.fn(() => ({ where: mocks.deleteWhere })),
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
              smtpConnected: row.smtpCredentialId !== null,
              smtpVerified: row.smtpVerified === 1,
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
      removeUserSmtp: {
        useMutation: () => ({ mutate: mocks.removeSmtpMutate, isPending: false, variables: undefined }),
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
    mocks.deleteWhere.mockResolvedValue({ rowsAffected: 1 });
    mocks.upsertProfile.mockResolvedValue(undefined);
  });

  it("rejects the complete directory workflow for non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.listUsers({ query: "", page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setUserRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setLifeAccess({ userId: 2, enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deleteUser({ userId: 2, confirmation: "DELETE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.combineAccounts({ sourceUserId: 2, targetUserId: 1, confirmation: "COMBINE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.removeUserSmtp({ userId: 2, confirmationEmail: "target@example.test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns searched, paginated accounts with effective administrator and Life access", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.listUsers({ query: "member", page: 2, pageSize: 10 });
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 12, pageCount: 2 });
    expect(result.users).toEqual([
      expect.objectContaining({ id: 1, role: "admin", lifeAccess: true, smtpConnected: true, smtpVerified: true, smtpFromEmail: "owner@example.test" }),
      expect.objectContaining({ id: 2, tier: "lifetime", lifeAccess: true, smtpConnected: true, smtpVerified: false, smtpFromEmail: "life@example.test" }),
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

  it("requires the target user's exact email before deleting only their SMTP credentials", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const caller = appRouter.createCaller(context("admin"));

    await expect(caller.admin.removeUserSmtp({ userId: 2, confirmationEmail: "wrong@example.test" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Type the user's exact email address to remove SMTP credentials.",
    });
    expect(mocks.deleteWhere).not.toHaveBeenCalled();

    await expect(caller.admin.removeUserSmtp({ userId: 2, confirmationEmail: " TARGET@example.test " })).resolves.toEqual({ ok: true, removed: true });
    expect(mocks.deleteWhere).toHaveBeenCalledTimes(1);
    expect(mocks.updateWhere).not.toHaveBeenCalled();
    expect(mocks.upsertProfile).not.toHaveBeenCalled();
  });
});

describe("administrator user-management rendered workflow", () => {
  let AdminUsersPage: React.ComponentType;
  let matchesTypedEmail: (confirmation: string, email: string | null | undefined) => boolean;

  beforeAll(async () => {
    const module = await import("../client/src/pages/AdminUsers");
    AdminUsersPage = module.default;
    matchesTypedEmail = module.matchesTypedEmail;
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
    expect(html).toContain("SMTP verified");
    expect(html).toContain("SMTP unverified");
    expect(html).toContain("Remove SMTP");
    expect(html).toContain('data-testid="smtp-status-1"');
    expect(html).toContain('data-testid="smtp-status-2"');
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

  it("gates permanent SMTP removal behind the target email and sends only the SMTP removal payload", () => {
    expect(matchesTypedEmail(" OWNER@EXAMPLE.TEST ", "owner@example.test")).toBe(true);
    expect(matchesTypedEmail("wrong@example.test", "owner@example.test")).toBe(false);
    expect(matchesTypedEmail("", null)).toBe(false);

    const source = fs.readFileSync(path.join(process.cwd(), "client/src/pages/AdminUsers.tsx"), "utf8");
    expect(source).toContain('id="remove-smtp-confirmation"');
    expect(source).toContain("matchesTypedEmail(smtpConfirmation, smtpAccount.email)");
    expect(source).toContain("removeUserSmtp.mutate({ userId: smtpAccount.id, confirmationEmail: smtpConfirmation.trim() })");
    expect(source).toContain('defaultValue: "The user account, contacts, requests, plan, and history are not deleted."');
  });
});
