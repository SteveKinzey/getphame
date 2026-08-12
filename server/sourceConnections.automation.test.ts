import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  setValues: vi.fn(),
}));

vi.mock("./db", async importOriginal => ({
  ...(await importOriginal<typeof import("./db")>()),
  getDb: mocks.getDb,
}));

import { updateSourceConnection } from "./sourceConnections";

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: 31,
    userId: 701,
    publicId: "src_public_31",
    label: "Post-purchase form",
    automationEnabled: true,
    automationMode: "review_request",
    dryRun: true,
    dryRunCompletedAt: null,
    sendDelayMinutes: 60,
    templateId: 12,
    platformId: 18,
    preferredLocale: "en",
    monitoringEnabled: true,
    status: "healthy",
    archivedAt: null,
    ...overrides,
  };
}

function database(row: ReturnType<typeof source>) {
  const selectQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([row]),
  };
  const updateQuery = {
    set: mocks.setValues.mockImplementation(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
  };
  return {
    select: vi.fn(() => selectQuery),
    update: vi.fn(() => updateQuery),
  };
}

describe("source connection automation safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects live mode until a successful provider dry run has been recorded", async () => {
    mocks.getDb.mockResolvedValue(database(source()));

    await expect(updateSourceConnection({
      userId: 701,
      id: 31,
      dryRun: false,
      now: 1_785_700_000_000,
    })).rejects.toThrow("Complete one successful source dry run before enabling live review requests.");
    expect(mocks.setValues).not.toHaveBeenCalled();
  });

  it("allows live mode when current configuration has durable dry-run evidence", async () => {
    mocks.getDb.mockResolvedValue(database(source({ dryRunCompletedAt: 1_785_699_000_000 })));

    await updateSourceConnection({
      userId: 701,
      id: 31,
      dryRun: false,
      now: 1_785_700_000_000,
    });

    expect(mocks.setValues).toHaveBeenCalledWith(expect.objectContaining({
      dryRun: false,
      updatedAt: 1_785_700_000_000,
    }));
  });

  it("invalidates old dry-run evidence when delivery-critical configuration changes", async () => {
    mocks.getDb.mockResolvedValue(database(source({
      dryRun: false,
      dryRunCompletedAt: 1_785_699_000_000,
    })));

    await updateSourceConnection({
      userId: 701,
      id: 31,
      preferredLocale: "fr",
      now: 1_785_700_000_000,
    });

    expect(mocks.setValues).toHaveBeenCalledWith(expect.objectContaining({
      preferredLocale: "fr",
      dryRun: true,
      dryRunCompletedAt: null,
    }));
  });

  it("rejects live activation when configuration changes in the same mutation", async () => {
    mocks.getDb.mockResolvedValue(database(source({ dryRunCompletedAt: 1_785_699_000_000 })));

    await expect(updateSourceConnection({
      userId: 701,
      id: 31,
      automationEnabled: true,
      dryRun: false,
      templateId: 99,
      now: 1_785_700_000_000,
    })).rejects.toThrow("Complete one successful source dry run before enabling live review requests.");
    expect(mocks.setValues).not.toHaveBeenCalled();
  });

  it("requires an active source to be paused before switching back to import-only mode", async () => {
    mocks.getDb.mockResolvedValue(database(source()));

    await expect(updateSourceConnection({
      userId: 701,
      id: 31,
      automationMode: "import_only",
      now: 1_785_700_000_000,
    })).rejects.toThrow("Pause review-request automation before switching this source to import-only mode.");
    expect(mocks.setValues).not.toHaveBeenCalled();
  });
});
