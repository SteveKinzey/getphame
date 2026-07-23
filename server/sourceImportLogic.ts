import { createHash } from "crypto";
import type { SourceContactRow, SourceImportPreviewStats, SourceType } from "../shared/sourceTypes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NormalizedSourceImport {
  rows: SourceContactRow[];
  rejected: number;
  duplicatesWithinPayload: number;
}

export function normalizeSourceContactRows(input: SourceContactRow[]): NormalizedSourceImport {
  const seen = new Set<string>();
  const rows: SourceContactRow[] = [];
  let rejected = 0;
  let duplicatesWithinPayload = 0;

  for (const candidate of input) {
    const email = candidate.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      rejected += 1;
      continue;
    }
    if (seen.has(email)) {
      duplicatesWithinPayload += 1;
      continue;
    }
    seen.add(email);
    rows.push({
      name: candidate.name.trim() || email,
      email,
      phone: candidate.phone?.trim() || undefined,
      externalId: candidate.externalId?.trim() || undefined,
    });
  }

  return { rows, rejected, duplicatesWithinPayload };
}

export function buildSourceImportPreview(
  input: SourceContactRow[],
  existingEmails: Iterable<string>
): { rows: SourceContactRow[]; stats: SourceImportPreviewStats } {
  const normalized = normalizeSourceContactRows(input);
  const existing = new Set(Array.from(existingEmails, (email) => email.trim().toLowerCase()));
  const duplicateExisting = normalized.rows.filter((row) => existing.has(row.email)).length;
  return {
    rows: normalized.rows,
    stats: {
      requested: input.length,
      valid: normalized.rows.length,
      duplicates: normalized.duplicatesWithinPayload + duplicateExisting,
      rejected: normalized.rejected,
    },
  };
}

export function hashSourceImportPayload(sourceType: SourceType, rows: SourceContactRow[]): string {
  const normalized = normalizeSourceContactRows(rows).rows
    .map((row) => ({ ...row, phone: row.phone ?? "", externalId: row.externalId ?? "" }))
    .sort((a, b) => a.email.localeCompare(b.email));
  return createHash("sha256").update(JSON.stringify({ sourceType, rows: normalized })).digest("hex");
}

export function hashSourceIdempotencyKey(userId: number, sourceType: SourceType, key: string): string {
  return createHash("sha256")
    .update(`${userId}:${sourceType}:${key.trim()}`)
    .digest("hex");
}
