import { releaseParityRecords } from "../drizzle/schema";
import { serializePreparedCsvRows } from "../shared/authHealthHistoryCsv";

type ReleaseParityRecord = typeof releaseParityRecords.$inferSelect;

export const RELEASE_HISTORY_EXPORT_LIMIT = 250;
export const RELEASE_HISTORY_EXPORT_PREVIEW_LIMIT = 25;

export const RELEASE_HISTORY_EXPORT_COLUMNS = [
  { key: "recordedAtUtc", csvHeader: "recorded_at_utc" },
  { key: "checkpointId", csvHeader: "checkpoint_id" },
  { key: "protectedMainCommit", csvHeader: "protected_main_commit" },
  { key: "protectedMainTree", csvHeader: "protected_main_tree" },
  { key: "managedTree", csvHeader: "managed_tree" },
  { key: "parityStatus", csvHeader: "parity_status" },
] as const;

export type ReleaseHistoryExportColumnKey = (typeof RELEASE_HISTORY_EXPORT_COLUMNS)[number]["key"];
export type ReleaseHistoryExportRow = Record<ReleaseHistoryExportColumnKey, string>;

export const RELEASE_HISTORY_EXPORT_COLUMN_KEYS = RELEASE_HISTORY_EXPORT_COLUMNS.map(
  (column) => column.key
) as [ReleaseHistoryExportColumnKey, ...ReleaseHistoryExportColumnKey[]];

export function buildReleaseHistoryExportRows(rows: ReleaseParityRecord[]): ReleaseHistoryExportRow[] {
  return rows.map((row) => ({
    recordedAtUtc: new Date(row.recordedAt).toISOString(),
    checkpointId: row.checkpointId.slice(0, 64),
    protectedMainCommit: row.protectedMainCommit.slice(0, 64),
    protectedMainTree: row.protectedMainTree.slice(0, 64),
    managedTree: row.managedTree.slice(0, 64),
    parityStatus: row.parityStatus.slice(0, 16),
  }));
}

function selectedColumns(keys?: readonly ReleaseHistoryExportColumnKey[]) {
  if (!keys) return RELEASE_HISTORY_EXPORT_COLUMNS;
  const selected = new Set(keys);
  return RELEASE_HISTORY_EXPORT_COLUMNS.filter((column) => selected.has(column.key));
}

export function buildReleaseHistoryCsvExport(input: {
  rows: ReleaseParityRecord[];
  total: number;
  truncated: boolean;
  status: "all" | "matched" | "needs_review";
  sortBy: "recordedAt" | "checkpointId";
  sortDirection: "asc" | "desc";
  selectedColumns?: readonly ReleaseHistoryExportColumnKey[];
  snapshotToMs?: number;
  generatedAt?: number;
}) {
  const generatedAt = input.generatedAt ?? Date.now();
  const columns = selectedColumns(input.selectedColumns);
  const rows = buildReleaseHistoryExportRows(input.rows);
  const csv = serializePreparedCsvRows(rows, columns);
  return {
    filename: `getphame-release-history-${new Date(generatedAt).toISOString().slice(0, 10)}.csv`,
    mimeType: "text/csv;charset=utf-8" as const,
    csv,
    clipboardText: serializePreparedCsvRows(rows, columns, false),
    generatedAt,
    snapshotToMs: input.snapshotToMs ?? generatedAt,
    rowCount: rows.length,
    totalMatching: input.total,
    truncated: input.truncated,
    availableColumns: RELEASE_HISTORY_EXPORT_COLUMNS.map(({ key, csvHeader }) => ({ key, csvHeader })),
    searchRows: rows,
    preview: {
      columns,
      rows: rows.slice(0, RELEASE_HISTORY_EXPORT_PREVIEW_LIMIT),
      rowCount: Math.min(rows.length, RELEASE_HISTORY_EXPORT_PREVIEW_LIMIT),
      limit: RELEASE_HISTORY_EXPORT_PREVIEW_LIMIT,
      truncated: rows.length > RELEASE_HISTORY_EXPORT_PREVIEW_LIMIT,
    },
    filters: {
      status: input.status,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    },
  };
}
