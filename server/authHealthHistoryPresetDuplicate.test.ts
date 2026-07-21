import { describe, expect, it, vi } from "vitest";
import { duplicateAuthHealthHistoryPreset } from "./authHealthHistoryPresets";

function collectPrimitives(value: unknown, seen = new Set<unknown>()): unknown[] {
  if (value === null || typeof value !== "object") return [value];
  if (seen.has(value)) return [];
  seen.add(value);
  return Object.values(value as Record<string, unknown>).flatMap((entry) => collectPrimitives(entry, seen));
}

function selectChain(result: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  return chain;
}

function duplicateDb(sourceRows: unknown[], existingRows: unknown[], insertedId = 88) {
  const source = selectChain(sourceRows);
  const existing = selectChain(existingRows);
  let insertedValues: Record<string, unknown> | null = null;
  const insertChain = {
    values: vi.fn((values: Record<string, unknown>) => {
      insertedValues = values;
      return insertChain;
    }),
    $returningId: vi.fn(async () => [{ id: insertedId }]),
  };
  const db = {
    select: vi.fn().mockReturnValueOnce(source).mockReturnValueOnce(existing),
    insert: vi.fn(() => insertChain),
  };
  return { db, source, existing, insertChain, getInsertedValues: () => insertedValues };
}

describe("duplicate auth health history preset", () => {
  const sourcePreset = { id: 5, ownerUserId: 42, name: "Manual failures", normalizedName: "manual failures", status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999 };

  it("scopes the source to its owner and copies only validated filter values", async () => {
    const harness = duplicateDb([sourcePreset], [{ name: "Manual failures", sortOrder: 4 }, { name: "Manual failures copy", sortOrder: 5 }]);
    const result = await duplicateAuthHealthHistoryPreset(42, 5, harness.db as never);

    expect(collectPrimitives(harness.source.where.mock.calls[0][0])).toEqual(expect.arrayContaining([42, 5]));
    expect(collectPrimitives(harness.existing.where.mock.calls[0][0])).toContain(42);
    expect(harness.getInsertedValues()).toMatchObject({ ownerUserId: 42, name: "Manual failures copy 2", normalizedName: "manual failures copy 2", status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999, sortOrder: 6 });
    expect(result).toMatchObject({ outcome: "duplicated", preset: { id: 88, name: "Manual failures copy 2", status: "fail", triggerSource: "manual", fromMs: 100, toMs: 999, sortOrder: 6 } });
  });

  it("does not duplicate a preset outside the requesting owner's scope", async () => {
    const harness = duplicateDb([], []);
    await expect(duplicateAuthHealthHistoryPreset(42, 5, harness.db as never)).resolves.toEqual({ outcome: "not_found" });
    expect(harness.db.insert).not.toHaveBeenCalled();
  });

  it("enforces the per-owner preset cap before insertion", async () => {
    const existing = Array.from({ length: 20 }, (_, index) => ({ name: `Preset ${index + 1}` }));
    const harness = duplicateDb([sourcePreset], existing);
    await expect(duplicateAuthHealthHistoryPreset(42, 5, harness.db as never)).resolves.toEqual({ outcome: "limit_reached" });
    expect(harness.db.insert).not.toHaveBeenCalled();
  });
});
