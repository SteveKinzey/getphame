import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function sourceContractPattern(expected: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
  const hasClosingQuote = (start: number, quote: string) => {
    for (let index = start + 1; index < expected.length; index += 1) {
      if (expected[index] === "\\") {
        index += 1;
      } else if (expected[index] === quote) {
        return true;
      }
    }
    return false;
  };

  let pattern = "";
  let quote: "'" | '"' | "`" | null = null;
  for (let index = 0; index < expected.length; index += 1) {
    const character = expected[index];
    if (quote) {
      if (character === "\\" && index + 1 < expected.length) {
        pattern += escape(character + expected[index + 1]);
        index += 1;
      } else if (character === quote) {
        pattern += quote === "`" ? "`" : "[\"']";
        quote = null;
      } else {
        pattern += escape(character);
      }
      continue;
    }
    if (/\s/.test(character)) {
      while (index + 1 < expected.length && /\s/.test(expected[index + 1])) {
        index += 1;
      }
      pattern += "\\s*";
    } else if (
      (character === "'" || character === '"' || character === "`") &&
      hasClosingQuote(index, character)
    ) {
      pattern += character === "`" ? "`" : "[\"']";
      quote = character;
    } else {
      pattern += escape(character);
    }
  }
  return new RegExp(pattern, "s");
}

function expectSourceContract(source: string) {
  return {
    toContain(expected: string) {
      expect(source).toMatch(sourceContractPattern(expected));
    },
  };
}

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("email template selector schema recovery", () => {
  it("declares every metadata column selected by the saved-template helpers", () => {
    const schema = read("drizzle/schema.ts");
    const requiredColumns = [
      "familyPublicId",
      "locale",
      "activeRevisionId",
      "provenance",
      "approvedAt",
    ];

    for (const column of requiredColumns) {
      expect(schema, column).toContain(`${column}:`);
    }
  });

  it("ships an additive repair for every selector metadata column", () => {
    const migration = read(
      "drizzle/0051_email_template_selector_schema_repair.sql"
    );
    for (const column of [
      "familyPublicId",
      "locale",
      "activeRevisionId",
      "provenance",
      "approvedAt",
    ]) {
      expect(migration, column).toContain(
        `ADD COLUMN IF NOT EXISTS \`${column}\``
      );
    }
    expect(migration).not.toMatch(/\bDROP\b|\bDELETE\b|\bUPDATE\b/i);
  });

  it("loads all saved templates through the authenticated selector query", () => {
    const helpers = read("server/templates.ts");
    const sendRequest = read("client/src/pages/SendRequest.tsx");

    expectSourceContract(helpers).toContain("return db");
    expectSourceContract(helpers).toContain(".select()");
    expectSourceContract(helpers).toContain(
      ".where(eq(emailTemplates.userId, userId))"
    );
    expectSourceContract(sendRequest).toContain(
      "trpc.templates.list.useQuery()"
    );
    expect(sendRequest).toMatch(
      /templates\s*\?\.\s*filter\s*\(\s*\(?tmpl\)?\s*=>\s*!tmpl\.isDefault\s*\)\s*\.\s*map\s*\(\s*\(?tmpl\)?\s*=>\s*\(/
    );
  });
});
