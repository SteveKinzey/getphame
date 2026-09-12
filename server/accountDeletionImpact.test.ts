import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
      const canWrap = "().,=:?{}[]<>".includes(character);
      if (canWrap) pattern += "\\s*";
      pattern += escape(character);
      if (canWrap) pattern += "\\s*";
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

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("account deletion impact preview", () => {
  it("uses an authenticated aggregate-only preview and a shared cleanup scope", () => {
    const helper = read("server/accountDeletionImpact.ts");
    const router = read("server/routers.ts");

    expectSourceContract(helper).toContain(
      "getAccountDeletionImpact(userId: number)"
    );
    expectSourceContract(helper).toContain(
      "deleteAccountOwnedData(userId: number)"
    );
    expect(helper).toMatch(
      /categories\.reduce\(\s*\(total,\s*category\)\s*=>\s*total\s*\+\s*category\.count,\s*0\s*\)/s
    );
    expectSourceContract(helper).toContain('key: "developerConnections"');
    expectSourceContract(helper).toContain('key: "securitySettings"');
    expectSourceContract(helper).toContain(
      "db.delete(sourceConnections).where(eq(sourceConnections.userId, userId))"
    );
    expectSourceContract(helper).toContain(
      "db.delete(contactConsentEvidence).where(eq(contactConsentEvidence.userId, userId))"
    );
    expectSourceContract(helper).toContain(
      "db.delete(emailTemplateRevisions).where(eq(emailTemplateRevisions.userId, userId))"
    );
    expect(helper).not.toContain("label:");
    expect(helper).not.toContain("encryptedPass");
    expect(helper).not.toContain("select({ apiKey:");
    expect(helper).not.toContain("select({ encryptedApiKey:");
    expectSourceContract(router).toContain(
      "previewDeletion: protectedProcedure.query"
    );
    expectSourceContract(router).toContain(
      "getAccountDeletionImpact(ctx.user.id)"
    );
    expectSourceContract(router).toContain("await deleteAccountOwnedData(uid)");
  });

  it("keeps user-facing deletion category names localized on the client", () => {
    const settings = read("client/src/pages/Settings.tsx");
    const fallback = read("client/src/lib/i18nCompleteFallbackResources.json");

    expectSourceContract(settings).toContain(
      "settings.deleteAccount.previewCategories.${category.key}"
    );
    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const catalog = read(`client/public/locales/${locale}/translation.json`);
      expect(catalog).toContain('"previewCategories"');
      expect(catalog).toContain('"mailConnections"');
      expect(catalog).toContain('"developerConnections"');
      expect(catalog).toContain('"securitySettings"');
    }
    expectSourceContract(fallback).toContain('"previewCategories"');
  });
});
