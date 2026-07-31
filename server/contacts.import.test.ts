import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import { importContacts } from "./contacts";

function createDb(existing: Array<{ email: string }>) {
  const where = vi.fn().mockResolvedValue(existing);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  return { select, insert, values };
}

describe("importContacts", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("returns only privacy-safe row diagnostics for existing and in-file duplicates", async () => {
    const db = createDb([{ email: "already@example.com" }]);
    getDbMock.mockResolvedValue(db);

    const result = await importContacts(42, [
      { name: "Existing", email: "already@example.com", rowNumber: 2 },
      { name: "New", email: "new@example.com", rowNumber: 3 },
      { name: "Duplicate", email: "NEW@example.com", rowNumber: 4 },
    ]);

    expect(result).toEqual({
      imported: 1,
      skipped: 2,
      errorSummary: {
        totalRejected: 2,
        reasons: [
          {
            reason: "duplicate_email",
            count: 2,
            rowNumbers: [2, 4],
            hasMoreRows: false,
          },
        ],
        reportIssues: [
          { reason: "duplicate_email", rowNumber: 2 },
          { reason: "duplicate_email", rowNumber: 4 },
        ],
      },
    });
    expect(db.values).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 42, name: "New", email: "new@example.com" }),
    ]);
    expect(JSON.stringify(result.errorSummary)).not.toContain("@");
  });
});
