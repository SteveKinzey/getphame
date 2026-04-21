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

  /**
   * Helper: build a chainable Drizzle-style mock.
   * - First call to .from() returns smtpRows (no .where() needed)
   * - Second call to .from() returns a chainable object with .where() that resolves churnRows
   */
  function makeDb(smtpRows: ReturnType<typeof makeRow>[], churnRows: object[] = []) {
    let callCount = 0;
    return {
      select: () => ({
        from: () => {
          callCount++;
          if (callCount === 1) {
            // smtpCredentials query — no .where()
            return Promise.resolve(smtpRows);
          }
          // churnSurveys query — has .where()
          return {
            where: () => Promise.resolve(churnRows),
          };
        },
      }),
    } as any;
  }

  it("sends digest even when all accounts are healthy (weekly pulse always fires)", async () => {
    mockGetDb.mockResolvedValue(makeDb([makeRow({ lastHealthStatus: "ok" })]));
    const result = await sendSmtpWeeklyDigest();
    // The digest always fires — it's a weekly pulse, not just an alert
    expect(result).toBe(true);
    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.content).toContain("All 1 connected account(s) healthy");
  });

  it("sends digest even when no accounts exist (weekly pulse always fires)", async () => {
    mockGetDb.mockResolvedValue(makeDb([]));
    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(true);
    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const call = mockNotifyOwner.mock.calls[0][0];
    expect(call.content).toContain("No SMTP accounts connected");
  });

  it("sends digest and returns true when there are failing accounts", async () => {
    const rows = [
      makeRow({ lastHealthStatus: "ok" }),
      makeRow({ host: "smtp.zoho.com", lastHealthStatus: "fail", lastHealthError: "Auth failed" }),
      makeRow({ host: "smtp.zoho.com", lastHealthStatus: "fail", lastHealthError: "Connection refused" }),
    ];
    mockGetDb.mockResolvedValue(makeDb(rows));

    const result = await sendSmtpWeeklyDigest();
    expect(result).toBe(true);
    expect(mockNotifyOwner).toHaveBeenCalledOnce();

    const call = mockNotifyOwner.mock.calls[0][0];
    // Title format: "📊 Weekly Digest — ⚠️ 2 SMTP fail · 0 cancellations"
    expect(call.title).toContain("2 SMTP fail");
    expect(call.content).toContain("smtp.zoho.com");
    expect(call.content).toContain("Auth failed");
  });

  it("includes at most 3 error samples per host", async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ host: "smtp.outlook.com", lastHealthStatus: "fail", lastHealthError: `Error ${i + 1}` })
    );
    mockGetDb.mockResolvedValue(makeDb(rows));

    await sendSmtpWeeklyDigest();
    const call = mockNotifyOwner.mock.calls[0][0];
    // Only 3 error samples should appear
    const errorMatches = (call.content.match(/Error \d/g) ?? []).length;
    expect(errorMatches).toBeLessThanOrEqual(3);
  });
});
