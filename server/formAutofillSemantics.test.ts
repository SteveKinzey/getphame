import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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

const root = process.cwd();

function tagEnd(source: string, start: number) {
  let quote: string | null = null;
  let braces = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (["'", '"', "`"].includes(character)) quote = character;
    else if (character === "{") braces += 1;
    else if (character === "}") braces = Math.max(0, braces - 1);
    else if (character === ">" && braces === 0) return index;
  }
  return -1;
}

function emailInputsMissingAutocomplete(directory: string): string[] {
  const missing: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      missing.push(...emailInputsMissingAutocomplete(path));
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(entry)) continue;
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(/<input\b/g)) {
      const end = tagEnd(source, match.index + match[0].length);
      if (end < 0) continue;
      const tag = source.slice(match.index, end + 1);
      if (/\btype\s*=\s*"email"/.test(tag) && !/\bautoComplete\s*=/.test(tag)) {
        missing.push(
          `${path}:${source.slice(0, match.index).split("\n").length}`
        );
      }
    }
  }
  return missing;
}

describe("form autofill semantics", () => {
  it("keeps login email feedback and SMTP identity autocomplete contracts in place", () => {
    const magicLink = readFileSync(
      resolve(root, "client/src/components/auth/MagicLinkForm.tsx"),
      "utf8"
    );
    const settings = readFileSync(
      resolve(root, "client/src/pages/Settings.tsx"),
      "utf8"
    );
    const onboarding = readFileSync(
      resolve(root, "client/src/components/OnboardingWizard.tsx"),
      "utf8"
    );

    expectSourceContract(magicLink).toContain('autoComplete="email"');
    expectSourceContract(magicLink).toContain(
      "data-testid={`${idPrefix}-email-validation`}"
    );
    expectSourceContract(magicLink).toContain(
      'aria-invalid={emailValidation === "invalid"}'
    );
    expectSourceContract(settings).toContain('id="smtp-email"');
    expectSourceContract(settings).toContain('autoComplete="email"');
    expectSourceContract(settings).toContain('autoComplete="username"');
    expectSourceContract(settings).toContain('autoComplete="current-password"');
    expectSourceContract(settings).toContain(
      'data-testid="smtp-email-validation"'
    );
    expectSourceContract(settings).toContain("const smtpPasswordValidation");
    expectSourceContract(settings).toContain("aria-pressed={showSmtpPassword}");
    expectSourceContract(settings).toContain("aria-pressed={showWooSecret}");
    expectSourceContract(settings).toContain("const usernameValidation");
    expectSourceContract(settings).toContain("const secretValidation");
    expect(magicLink).toMatch(
      /toast\.success\s*\(\s*t\s*\(\s*["']login\.checkInbox["']/
    );
    expectSourceContract(onboarding).toContain('id="onboarding-smtp-password"');
    expectSourceContract(onboarding).toContain(
      'autoComplete="current-password"'
    );
    expectSourceContract(onboarding).toContain("aria-pressed={showPass}");
    expectSourceContract(onboarding).toContain("const passwordValidation");
  });

  it("requires an autocomplete token on every native email input", () => {
    expect(emailInputsMissingAutocomplete(resolve(root, "client/src"))).toEqual(
      []
    );
  });
});
