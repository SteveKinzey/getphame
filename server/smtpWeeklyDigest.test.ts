import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb and notifyOwner before importing the module under test
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendSmtpWeeklyDigest } from "./smtpWeeklyDigest";

const mockGetDb = vi.mocked(getDb);
const mockNotifyOwner = vi.mocked(notifyOwner);

function makeRow(overrides: Partial<{
  host: string;
  lastHealthStatus: string | null;
  lastHealthError: string | null;
  lastHealthCheck: number | null;
}> = {}) {
  return {
    id: 1,
    userId: 1,
    host: "smtp.gmail.com",
    port: 587,
    secure: 0,
    user: "test@gmail.com",
    encryptedPass: "enc",
    fromName: null,
    replyTo: null,
    verified: 1,
    lastHealthCheck: null,
    lastHealthStatus: null,
    lastHealthError: null,
    ...overrides,
  };
}

describe("sendSmtpWeeklyDigest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false and skips when DB is unavailable", async () => {
    mockGetDb.mockResolvedValue(null as any);
    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(false);
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it("returns false and skips when all accounts are healthy", async () => {
    const db = {
      select: () => ({ from: () => Promise.resolve([makeRow({ lastHealthStatus: "ok" })]) }),
    } as any;
    mockGetDb.mockResolvedValue(db);
    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(false);
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it("returns false and skips when no accounts exist", async () => {
    const db = {
      select: () => ({ from: () => Promise.resolve([]) }),
    } as any;
    mockGetDb.mockResolvedValue(db);
    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(false);
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it("sends digest and returns true when there are failing accounts", async () => {
    const rows = [
      makeRow({ lastHealthStatus: "ok" }),
      makeRow({ host: "smtp.zoho.com", lastHealthStatus: "fail", lastHealthError: "Auth failed" }),
      makeRow({ host: "smtp.zoho.com", lastHealthStatus: "fail", lastHealthError: "Connection refused" }),
    ];
    const db = {
      select: () => ({ from: () => Promise.resolve(rows) }),
    } as any;
    mockGetDb.mockResolvedValue(db);

    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(true);
    expect(mockNotifyOwner).toHaveBeenCalledOnce();

    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.title).toContain("2/3");
    expect(call.content).toContain("smtp.zoho.com");
    expect(call.content).toContain("Auth failed");
  });

  it("includes at most 3 error samples per host", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ host: "smtp.outlook.com", lastHealthStatus: "fail", lastHealthError: `Error ${i + 1}` })
    );
    const db = {
      select: () => ({ from: () => Promise.resolve(rows) }),
    } as any;
    mockGetDb.mockResolvedValue(db);

    await sendSmtpWeeklyDigest();
    const call = mockNotifyOwner.mock.calls[0][0];
    // Only 3 error samples should appear
    const errorMatches = (call.content.match(/Error \d/g) ?? []).length;
    expect(errorMatches).toBeLessThanOrEqual(3);
  });
});
