import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoot = join(process.cwd(), "client/src");

function tagEnd(source: string, start: number) {
  let quote: string | null = null;
  let braces = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (character === quote && previous !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") braces += 1;
    if (character === "}") braces = Math.max(0, braces - 1);
    if (character === ">" && braces === 0) return index;
  }
  return -1;
}

function findMissingFormIdentifiers(directory: string): string[] {
  const findings: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      findings.push(...findMissingFormIdentifiers(path));
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(entry)) continue;

    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/<(input|textarea|select)\b/g)) {
      const end = tagEnd(source, match.index + match[0].length);
      if (end === -1) continue;
      const tag = source.slice(match.index, end + 1);
      if (/\b(?:id|name)\s*=/.test(tag)) continue;
      const line = source.slice(0, match.index).split("\n").length;
      findings.push(`${relative(clientRoot, path)}:${line}`);
    }
  }
  return findings;
}

describe("native form-field identifier coverage", () => {
  it("gives each user-editable input, textarea, and select an id or name", () => {
    expect(findMissingFormIdentifiers(clientRoot)).toEqual([]);
  });
});
