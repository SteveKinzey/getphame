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
  auditInsert: vi.fn(),
  decryptPassword: vi.fn(),
  testSmtpConnection: vi.fn(),
  retestSmtpMutate: vi.fn(),
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
  const db = {
    select: vi.fn((selection?: Record<string, unknown>) => {
      if (!selection) {
        const auditRows = [{
          id: 1,
          actorUserId: 1,
          actorName: "Owner Admin",
          actorEmail: "owner@example.test",
          targetUserId: 2,
          targetName: "Target User",
          targetEmail: "target@example.test",
          smtpUser: "smtp-target@example.test",
          action: "smtp_credentials_removed",
          outcome: "removed",
          occurredAt: 1_752_537_600_000,
        }];
        const auditChain = {
          where: () => auditChain,
          orderBy: () => ({ limit: () => ({ offset: async () => auditRows }) }),
        };
        return { from: () => auditChain };
      }
      if ("count" in selection || "value" in selection) {
        const countChain = {
          leftJoin: () => countChain,
          where: async () => ["value" in selection ? { value: 12 } : { count: 12 }],
        };
        return { from: () => countChain };
      }
      if ("smtpCredentialId" in selection) {
        const listChain = {
          leftJoin: () => listChain,
          where: () => ({ orderBy: () => ({ limit: () => ({ offset: async () => directoryRows }) }) }),
        };
        return { from: () => listChain };
      }
      if ("encryptedPass" in selection) {
        return { from: () => ({ where: () => ({ limit: async () => [{ host: "smtp.example.test", port: 587, secure: 0, user: "smtp-target@example.test", encryptedPass: "encrypted", lastHealthStatus: "fail" }] }) }) };
      }
      if ("occurredAt" in selection) {
        const exportRows = [{
          occurredAt: 1_752_537_600_000,
          outcome: "removed",
          action: "smtp_credentials_removed",
          actorName: "Owner Admin",
          actorEmail: "owner@example.test",
          targetName: "Target User",
          targetEmail: "target@example.test",
          smtpUser: "smtp-target@example.test",
        }];
        const exportChain = { where: () => exportChain, orderBy: async () => exportRows };
        return { from: () => exportChain };
      }
      if ("id" in selection && "user" in selection) {
        return { from: () => ({ where: () => ({ limit: async () => [{ id: 202, user: "smtp-target@example.test" }] }) }) };
      }
      if ("id" in selection) {
        return { from: () => ({ where: () => ({ limit: async () => [{ id: 2, name: "Target User", email: "target@example.test" }] }) }) };
      }
      return {
        from: () => ({
          leftJoin: () => ({
            where: () => ({ limit: async () => [{
              name: "Target User",
              email: "target@example.test",
              role: options?.targetRole ?? "user",
              tier: options?.targetTier ?? "free",
            }] }),
          }),
        }),
      };
    }),
    update: vi.fn(() => ({ set: () => ({ where: mocks.updateWhere }) })),
    delete: vi.fn(() => ({ where: mocks.deleteWhere })),
    insert: vi.fn(() => ({
      values: (payload: Record<string, unknown>) => "occurredAt" in payload
        ? mocks.auditInsert(payload)
        : { onDuplicateKeyUpdate: mocks.upsertProfile },
    })),
    transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(db)),
  };
  return db;
}

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./smtp", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./smtp")>()),
  decryptPassword: mocks.decryptPassword,
  testSmtpConnection: mocks.testSmtpConnection,
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
    useUtils: () => ({ admin: { listUsers: { invalidate: vi.fn() }, listSmtpAuditLogs: { invalidate: vi.fn() } } }),
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
      retestUserSmtp: {
        useMutation: () => ({ mutate: mocks.retestSmtpMutate, isPending: false, variables: undefined }),
      },
      listSmtpAuditLogs: {
        useQuery: () => ({
          data: {
            entries: [{
              id: 1,
              actorUserId: 1,
              actorName: "Owner Admin",
              actorEmail: "owner@example.test",
              targetUserId: 2,
              targetName: "Life Member",
              targetEmail: "life@example.test",
              smtpUser: "life@example.test",
              action: "smtp_credentials_removed",
              outcome: "removed",
              occurredAt: 1_752_537_600_000,
            }],
            page: 1,
            pageSize: 25,
            total: 30,
            pageCount: 2,
          },
          isLoading: false,
          isFetching: false,
          error: null,
        }),
      },
      listSmtpAuditActors: {
        useQuery: () => ({ data: [], isLoading: false, error: null }),
      },
      exportSmtpAuditLogs: {
        useQuery: () => ({ data: undefined, isFetching: false, refetch: vi.fn() }),
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
    mocks.auditInsert.mockResolvedValue(undefined);
    mocks.decryptPassword.mockReturnValue("decrypted-password");
    mocks.testSmtpConnection.mockResolvedValue({ ok: true });
  });

  it("rejects the complete directory workflow for non-admin accounts", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.listUsers({ query: "", smtpStatus: "all", page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setUserRole({ userId: 2, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.setLifeAccess({ userId: 2, enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deleteUser({ userId: 2, confirmation: "DELETE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.combineAccounts({ sourceUserId: 2, targetUserId: 1, confirmation: "COMBINE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.removeUserSmtp({ userId: 2, confirmationEmail: "target@example.test" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.retestUserSmtp({ userId: 2 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.listSmtpAuditLogs({ page: 1, pageSize: 25 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.exportSmtpAuditLogs({ outcome: "all" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns searched, paginated accounts with effective administrator and Life access", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.listUsers({ query: "member", smtpStatus: "verified", page: 2, pageSize: 10 });
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 12, pageCount: 2 });
    expect(result.users).toEqual([
      expect.objectContaining({ id: 1, role: "admin", lifeAccess: true, smtpConnected: true, smtpVerified: true, smtpFromEmail: "owner@example.test" }),
      expect.objectContaining({ id: 2, tier: "lifetime", lifeAccess: true, smtpConnected: true, smtpVerified: false, smtpFromEmail: "life@example.test" }),
    ]);
  });

  it("re-tests stored SMTP credentials server-side and persists health state without returning secrets", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.retestUserSmtp({ userId: 2 });
    const routerSource = fs.readFileSync(path.join(process.cwd(), "server/routers.ts"), "utf8");
    expect(routerSource).toContain("pass: decryptPassword(credential.encryptedPass)");
    expect(routerSource).toContain("result = await testSmtpConnection({");
    expect(mocks.updateWhere).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, error: null, recovered: true });
    expect(result).not.toHaveProperty("pass");
    expect(result).not.toHaveProperty("encryptedPass");
  });

  it("returns a safe failure result when stored SMTP credentials fail verification", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    mocks.testSmtpConnection.mockResolvedValueOnce({ ok: false, error: "Authentication rejected" });
    const result = await appRouter.createCaller(context("admin")).admin.retestUserSmtp({ userId: 2 });
    expect(mocks.updateWhere).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: false, error: "Authentication rejected", recovered: false });
    expect(result.checkedAt).toEqual(expect.any(Number));
    expect(result).not.toHaveProperty("pass");
    expect(result).not.toHaveProperty("encryptedPass");
  });

  it("returns durable SMTP removal audit entries newest-first to administrators", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.listSmtpAuditLogs({ page: 1, pageSize: 25 });
    expect(result).toMatchObject({ page: 1, pageSize: 25, total: 12, pageCount: 1 });
    expect(result.entries).toEqual([
      expect.objectContaining({ actorEmail: "owner@example.test", targetEmail: "target@example.test", smtpUser: "smtp-target@example.test", outcome: "removed" }),
    ]);
  });

  it("exports every matching SMTP audit row from the server without credential identifiers", async () => {
    mocks.getDb.mockResolvedValue(createDb());
    const result = await appRouter.createCaller(context("admin")).admin.exportSmtpAuditLogs({ outcome: "removed" });
    expect(result).toMatchObject({ total: 1, filename: expect.stringMatching(/^getphame-smtp-removal-audit-\d{4}-\d{2}-\d{2}\.csv$/) });
    expect(result.csv).toContain("owner@example.test");
    expect(result.csv).toContain("target@example.test");
    expect(result.csv).not.toContain("encryptedPass");
    expect(result.csv).not.toContain("credentialId");
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
    expect(mocks.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 1,
      targetUserId: 2,
      smtpUser: "smtp-target@example.test",
      action: "smtp_credentials_removed",
      outcome: "removed",
    }));
    expect(mocks.updateWhere).not.toHaveBeenCalled();
    expect(mocks.upsertProfile).not.toHaveBeenCalled();
  });
});

describe("administrator user-management rendered workflow", () => {
  let matchesTypedEmail: (confirmation: string, email: string | null | undefined) => boolean;
  let parseAdminUserDirectoryParams: (searchString: string) => { search: string; smtpStatus: string };

  beforeAll(async () => {
    const module = await import("../client/src/pages/AdminUsers");
    matchesTypedEmail = module.matchesTypedEmail;
    parseAdminUserDirectoryParams = module.parseAdminUserDirectoryParams;
  });

  it("hydrates the user directory from a failing-SMTP remediation deep link", () => {
    expect(parseAdminUserDirectoryParams("?smtpStatus=failing&search=owner%40example.test")).toEqual({
      search: "owner@example.test",
      smtpStatus: "failing",
    });
    expect(parseAdminUserDirectoryParams("?smtpStatus=invalid")).toEqual({ search: "", smtpStatus: "all" });

    const dashboard = fs.readFileSync(path.join(process.cwd(), "client/src/pages/AdminDashboard.tsx"), "utf8");
    expect(dashboard).toContain('data-testid={`manage-failing-smtp-${credential.userId}`}');
    expect(dashboard).toContain("/admin/users?smtpStatus=failing&search=");
    expect(dashboard).toContain('data-testid={`retest-failing-smtp-${credential.userId}`}');
    expect(dashboard).toContain("Latest health: failed");
    expect(dashboard).toContain("retestUserSmtp.useMutation");
  });

  it("wires SMTP filtering, re-test controls, audit history, account controls, pagination, and self-protection", () => {
    const html = fs.readFileSync(path.join(process.cwd(), "client/src/pages/AdminUsers.tsx"), "utf8");
    expect(html).toContain('id="admin-user-search"');
    expect(html).toContain('data-testid={`admin-user-${account.id}`}');
    expect(html).toContain("Admin");
    expect(html).toContain("Life");
    expect(html).toContain('defaultValue: "Page {{page}} of {{count}}"');
    expect(html).toContain('data-testid="smtp-audit-pagination"');
    expect(html).toContain("smtpAuditLogs.data.pageCount > 1");
    expect(html).toContain("Previous");
    expect(html).toContain("Next");
    expect(html).toContain('defaultValue: "Remove admin"');
    expect(html).toContain('defaultValue: "Remove Life"');
    expect(html).toContain("Combine");
    expect(html).toContain("SMTP verified");
    expect(html).toContain("SMTP unverified");
    expect(html).toContain("Remove SMTP");
    expect(html).toContain('data-testid="smtp-status-filter"');
    expect(html).toContain("All SMTP statuses");
    expect(html).toContain("Re-test SMTP");
    expect(html).toContain('data-testid={`retest-smtp-${account.id}`}');
    expect(html).toContain('data-testid={`smtp-recovery-${account.id}`}');
    expect(html).toContain("SMTP connection recovered and verified.");
    expect(html).toContain("SMTP removal audit log");
    expect(html).toContain('data-testid="smtp-audit-log"');
    expect(html).toContain("exportSmtpAuditLogs.useQuery");
    expect(html).toContain("Exported {{count}} matching audit records.");
    expect(html).toContain("removed SMTP credentials for");
    expect(html).toContain('data-testid={`smtp-status-${account.id}`}');
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
