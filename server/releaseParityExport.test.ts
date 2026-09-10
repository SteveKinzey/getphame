import { describe, expect, it } from "vitest";
import {
  buildReleaseHistoryCsvExport,
  RELEASE_HISTORY_EXPORT_LIMIT,
} from "./releaseParityExport";

describe("release-history export", () => {
  it("uses a sanitized, formula-safe, bounded snapshot with clipboard parity", () => {
    const snapshot = buildReleaseHistoryCsvExport({
      rows: [
        {
          id: 1,
          checkpointId: "=unsafe-checkpoint",
          protectedMainCommit: "main-commit",
          protectedMainTree: "main-tree",
          managedTree: "managed-tree",
          parityStatus: "matched",
          recordedAt: 1_726_000_000_000,
        },
      ] as any,
      total: RELEASE_HISTORY_EXPORT_LIMIT + 1,
      truncated: true,
      status: "matched",
      sortBy: "recordedAt",
      sortDirection: "desc",
      generatedAt: 1_726_000_000_000,
    });

    expect(snapshot.csv.startsWith("\uFEFF")).toBe(true);
    expect(snapshot.csv.slice(1)).toBe(snapshot.clipboardText);
    expect(snapshot.csv).toContain("'=unsafe-checkpoint");
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.snapshotToMs).toBe(1_726_000_000_000);
    expect(snapshot.preview.rows).toEqual(
      snapshot.searchRows.slice(0, snapshot.preview.limit)
    );
    expect(snapshot.availableColumns.map(column => column.key)).toEqual([
      "recordedAtUtc",
      "checkpointId",
      "protectedMainCommit",
      "protectedMainTree",
      "managedTree",
      "parityStatus",
    ]);
  });
});
