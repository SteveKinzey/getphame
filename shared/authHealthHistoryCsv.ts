export type PreparedCsvColumn<Key extends string> = {
  key: Key;
  csvHeader: string;
};

export function escapePreparedCsvCell(value: string | number): string {
  const raw = String(value ?? "");
  const formulaSafe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return /[",\r\n]/.test(formulaSafe)
    ? `"${formulaSafe.replace(/"/g, '""')}"`
    : formulaSafe;
}

export function serializePreparedCsvRows<Key extends string>(
  rows: readonly Record<Key, string>[],
  columns: readonly PreparedCsvColumn<Key>[],
  includeBom = true
): string {
  const body = rows.map(row =>
    columns.map(column => escapePreparedCsvCell(row[column.key])).join(",")
  );

  return `${includeBom ? "\uFEFF" : ""}${columns.map(column => column.csvHeader).join(",")}\r\n${body.join("\r\n")}\r\n`;
}

export function normalizePreparedCsvSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

export function filterPreparedCsvRows<Key extends string>(
  rows: readonly Record<Key, string>[],
  columns: readonly PreparedCsvColumn<Key>[],
  query: string
): Record<Key, string>[] {
  const normalizedQuery = normalizePreparedCsvSearchQuery(query);
  if (!normalizedQuery) return [...rows];

  return rows.filter(row =>
    columns.some(column =>
      row[column.key].toLocaleLowerCase().includes(normalizedQuery)
    )
  );
}

export function buildAuthHealthHistorySearchResultsCsvFilename(
  filename: string
): string {
  const trimmed = filename.trim();
  const base = trimmed.replace(/\.csv$/i, "") || "getphame-auth-health-history";
  return `${base}-search-results.csv`;
}
