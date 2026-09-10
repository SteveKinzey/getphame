import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  delete: vi.fn(),
  duplicate: vi.fn(),
  reorder: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

vi.mock("./activityTrendExportPresets", async importOriginal => ({
  ...(await importOriginal<typeof import("./activityTrendExportPresets")>()),
  listActivityTrendExportPresets: mocks.list,
  saveActivityTrendExportPreset: mocks.save,
  deleteActivityTrendExportPreset: mocks.delete,
  duplicateActivityTrendExportPreset: mocks.duplicate,
  reorderActivityTrendExportPresets: mocks.reorder,
}));

import { appRouter } from "./routers";

function context(id: number, role: "admin" | "user"): TrpcContext {
  return {
    user: {
      id,
      openId: `${role}-${id}`,
      email: `${role}-${id}@example.com`,
      name: `${role} ${id}`,
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

describe("Activity Trend export preset router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("JWT_SECRET", "activity-trend-preset-test-secret-long-enough");
    mocks.getDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ suspendedUntil: null }],
          }),
        }),
      })),
    });
    mocks.list.mockResolvedValue([]);
    mocks.save.mockResolvedValue({ outcome: "saved", id: 7, created: true });
    mocks.delete.mockResolvedValue({ outcome: "deleted" });
    mocks.duplicate.mockResolvedValue({ outcome: "duplicated", id: 8 });
    mocks.reorder.mockResolvedValue({ outcome: "reordered" });
  });

  it("allows every authenticated role and scopes each operation to the caller", async () => {
    for (const [id, role] of [
      [42, "user"],
      [1, "admin"],
    ] as const) {
      const caller = appRouter.createCaller(context(id, role));
      await caller.activityTrendExportPresets.list();
      await caller.activityTrendExportPresets.save({
        name: `${role} monthly`,
        rangeKey: "30",
        series: ["sends", "clicks"],
      });
      await caller.activityTrendExportPresets.delete({ id: 7 });
      await caller.activityTrendExportPresets.duplicate({ id: 7 });
      await caller.activityTrendExportPresets.reorder({ orderedIds: [8, 7] });
      expect(mocks.list).toHaveBeenLastCalledWith(id);
      expect(mocks.save).toHaveBeenLastCalledWith(
        id,
        expect.objectContaining({ rangeKey: "30", series: ["sends", "clicks"] })
      );
      expect(mocks.delete).toHaveBeenLastCalledWith(id, 7);
      expect(mocks.duplicate).toHaveBeenLastCalledWith(id, 7);
      expect(mocks.reorder).toHaveBeenLastCalledWith(id, [8, 7]);
    }
  });

  it("rejects duplicate series and invalid custom ranges before persistence", async () => {
    const caller = appRouter.createCaller(context(42, "user"));
    await expect(
      caller.activityTrendExportPresets.save({
        name: "Duplicate series",
        rangeKey: "30",
        series: ["sends", "sends"],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.activityTrendExportPresets.save({
        name: "Backwards",
        rangeKey: "custom",
        customStartDate: "2026-07-31",
        customEndDate: "2026-07-01",
        series: ["opens"],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("maps ownership, conflict, limit, and complete-order outcomes explicitly", async () => {
    const caller = appRouter.createCaller(context(42, "user"));
    mocks.save.mockResolvedValueOnce({ outcome: "name_conflict" });
    await expect(
      caller.activityTrendExportPresets.save({
        name: "Monthly",
        rangeKey: "30",
        series: ["sends"],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    mocks.duplicate.mockResolvedValueOnce({ outcome: "limit_reached" });
    await expect(
      caller.activityTrendExportPresets.duplicate({ id: 7 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    mocks.delete.mockResolvedValueOnce({ outcome: "not_found" });
    await expect(
      caller.activityTrendExportPresets.delete({ id: 99 })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    mocks.reorder.mockResolvedValueOnce({ outcome: "membership_mismatch" });
    await expect(
      caller.activityTrendExportPresets.reorder({ orderedIds: [8, 7] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
