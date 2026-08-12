import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import mysql from "mysql2/promise";

const REQUIRED_TEMPLATE_COLUMNS = [
  "familyPublicId",
  "locale",
  "activeRevisionId",
  "provenance",
  "approvedAt",
];

const backupArgumentIndex = process.argv.indexOf("--backup");
const backupPath = backupArgumentIndex >= 0 ? process.argv[backupArgumentIndex + 1] : null;
if (!backupPath) {
  throw new Error("Pass --backup <absolute-path-to-backup.json>.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is unavailable.");
}

const hash = value => createHash("sha256").update(value).digest("hex");
const normalize = value => (value instanceof Date ? value.toISOString() : value ?? null);
const normalizedTemplate = record => ({
  id: Number(record.id),
  userId: Number(record.userId),
  name: String(record.name),
  subject: String(record.subject),
  body: String(record.body),
  familyPublicId: record.familyPublicId ?? null,
  locale: String(record.locale),
  activeRevisionId: record.activeRevisionId ?? null,
  provenance: String(record.provenance),
  approvedAt: record.approvedAt ?? null,
  isDefault: Number(record.isDefault),
  usageCount: Number(record.usageCount),
});

const projectRoot = resolve(import.meta.dirname, "..");
const migrationDirectory = resolve(projectRoot, "drizzle");
const journalPath = resolve(migrationDirectory, "meta", "_journal.json");
const backup = JSON.parse(await readFile(backupPath, "utf8"));
const journal = JSON.parse(await readFile(journalPath, "utf8"));
const migrationFiles = (await readdir(migrationDirectory))
  .filter(name => name.endsWith(".sql"))
  .sort();
const migrationTags = new Set(journal.entries.map(entry => entry.tag));
const journalMissingFiles = journal.entries
  .map(entry => entry.tag)
  .filter(tag => !migrationFiles.includes(`${tag}.sql`));
const journalUntrackedSql = migrationFiles
  .map(file => basename(file, ".sql"))
  .filter(tag => !migrationTags.has(tag));
const duplicateNumericPrefixes = Object.entries(
  migrationFiles.reduce((groups, file) => {
    const prefix = basename(file).split("_")[0];
    groups[prefix] ??= [];
    groups[prefix].push(file);
    return groups;
  }, {})
).filter(([, files]) => files.length > 1);

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [columnRows] = await connection.query("SHOW COLUMNS FROM email_templates");
  const liveColumns = new Set(columnRows.map(row => row.Field));
  const templateMissingColumns = REQUIRED_TEMPLATE_COLUMNS.filter(column => !liveColumns.has(column));
  const [ledgerRows] = await connection.query(
    "SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY created_at ASC"
  );
  const [liveTemplateRows] = await connection.query(
    "SELECT id, userId, name, subject, body, familyPublicId, locale, activeRevisionId, provenance, approvedAt, isDefault, usageCount FROM email_templates ORDER BY userId ASC, id ASC"
  );

  const liveTemplates = new Map(
    liveTemplateRows.map(record => [Number(record.id), normalizedTemplate(record)])
  );
  const backupRecords = Array.isArray(backup.records) ? backup.records : [];
  const verifiedTemplates = backupRecords.map(record => {
    const normalized = normalizedTemplate(record);
    const live = liveTemplates.get(normalized.id);
    return {
      id: normalized.id,
      userId: normalized.userId,
      name: normalized.name,
      isDefault: normalized.isDefault === 1,
      usageCount: normalized.usageCount,
      subjectSha256: hash(normalized.subject),
      bodySha256: hash(normalized.body),
      presentInLiveDatabase: Boolean(live),
      exactContentMatch: Boolean(live) && JSON.stringify(live) === JSON.stringify(normalized),
    };
  });

  const output = {
    dryRun: true,
    backup: {
      format: backup.format,
      declaredRecordCount: backup.recordCount,
      inspectedRecordCount: verifiedTemplates.length,
      verifiedRecordCount: verifiedTemplates.filter(record => record.presentInLiveDatabase && record.exactContentMatch).length,
      templates: verifiedTemplates,
    },
    schemaAlignment: {
      templateMissingColumns,
      aligned: templateMissingColumns.length === 0,
    },
    migrationLedger: {
      ledgerEntryCount: ledgerRows.length,
      journalEntryCount: journal.entries.length,
      journalMissingFiles,
      journalUntrackedSql,
      duplicateNumericPrefixes,
      lineageCollisionDetected:
        journalMissingFiles.length > 0 || journalUntrackedSql.length > 0 || duplicateNumericPrefixes.length > 0,
    },
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} finally {
  connection.destroy();
}
