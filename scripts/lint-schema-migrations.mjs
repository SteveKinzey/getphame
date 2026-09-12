#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const schemaPath = join(root, "drizzle", "schema.ts");
const drizzlePath = join(root, "drizzle");
const schemaSource = readFileSync(schemaPath, "utf8");

function walkSql(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return walkSql(file);
    return entry.name.endsWith(".sql") ? [file] : [];
  });
}

function extractBalancedBlock(source, openingBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBraceIndex, index + 1);
    }
  }
  throw new Error("Could not read a balanced Drizzle table declaration.");
}

function extractSchemaColumns(source) {
  const tables = new Map();
  const declaration =
    /export const\s+\w+\s*=\s*pgTable\(\s*["'`]([^"'`]+)["'`]\s*,\s*\{/g;
  let match;
  while ((match = declaration.exec(source))) {
    const blockStart = declaration.lastIndex - 1;
    const block = extractBalancedBlock(source, blockStart);
    const columns = new Set();
    for (const field of block.matchAll(
      /^\s*[A-Za-z_$][\w$]*:\s*[A-Za-z_$][\w$]*\(\s*["'`]([^"'`]+)["'`]/gm
    )) {
      columns.add(field[1]);
    }
    tables.set(match[1], columns);
  }
  return tables;
}

function addColumnsFromCreate(sql, tableColumns) {
  for (const match of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([\w-]+)[`"]?\s*\(([\s\S]*?)\)\s*(?:;|$)/gi
  )) {
    const [, table, body] = match;
    const columns = tableColumns.get(table) ?? new Set();
    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("--") ||
        trimmed.startsWith("/*") ||
        /^(?:PRIMARY\s+KEY|UNIQUE|KEY|INDEX|CONSTRAINT)\b/i.test(trimmed)
      ) {
        continue;
      }
      const column = trimmed.match(/^[`"]?([A-Za-z0-9_]+)[`"]?\s+/);
      if (column) {
        columns.add(column[1]);
      }
    }
    tableColumns.set(table, columns);
  }
}

function addColumnsFromAlter(sql, tableColumns) {
  for (const match of sql.matchAll(
    /ALTER\s+TABLE\s+[`"]?([\w-]+)[`"]?\s+([\s\S]*?)(?:;|$)/gi
  )) {
    const [, table, body] = match;
    const columns = tableColumns.get(table) ?? new Set();
    for (const column of body.matchAll(
      /\bADD(?:\s+COLUMN)?\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([A-Za-z0-9_]+)[`"]?\s+/gi
    )) {
      columns.add(column[1]);
    }
    tableColumns.set(table, columns);
  }
}

const migrationColumns = new Map();
const migrationFiles = walkSql(drizzlePath);
for (const file of migrationFiles) {
  const sql = readFileSync(file, "utf8");
  addColumnsFromCreate(sql, migrationColumns);
  addColumnsFromAlter(sql, migrationColumns);
}

const schemaColumns = extractSchemaColumns(schemaSource);
if (schemaColumns.size === 0) {
  throw new Error("No pgTable declarations were found in drizzle/schema.ts.");
}

const discrepancies = [];
for (const [table, columns] of schemaColumns) {
  const knownColumns = migrationColumns.get(table);
  if (!knownColumns) {
    discrepancies.push(`${table}: table is absent from every SQL migration`);
    continue;
  }
  const missing = Array.from(columns).filter(
    column => !knownColumns.has(column)
  );
  if (missing.length > 0) {
    discrepancies.push(`${table}: ${missing.sort().join(", ")}`);
  }
}

if (discrepancies.length > 0) {
  console.error("Schema/migration column parity failed:");
  for (const discrepancy of discrepancies) console.error(`- ${discrepancy}`);
  console.error(
    "Add a reviewed additive migration under drizzle/ or drizzle/manual-pending before merging."
  );
  process.exitCode = 1;
} else {
  console.log(
    `Schema/migration column parity passed for ${schemaColumns.size} tables across ${migrationFiles.length} SQL migrations.`
  );
}

if (process.env.DEBUG_MIGRATION_LINTER === "1") {
  for (const file of migrationFiles) console.log(relative(root, file));
}
