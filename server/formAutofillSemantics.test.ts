import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
        missing.push(`${path}:${source.slice(0, match.index).split("\n").length}`);
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

    expect(magicLink).toContain('autoComplete="email"');
    expect(magicLink).toContain('data-testid={`${idPrefix}-email-validation`}');
    expect(magicLink).toContain('aria-invalid={emailValidation === "invalid"}');
    expect(settings).toContain('id="smtp-email"');
    expect(settings).toContain('autoComplete="email"');
    expect(settings).toContain('autoComplete="username"');
    expect(settings).toContain('autoComplete="current-password"');
    expect(settings).toContain('data-testid="smtp-email-validation"');
    expect(settings).toContain("const smtpPasswordValidation");
    expect(settings).toContain("aria-pressed={showSmtpPassword}");
    expect(settings).toContain("aria-pressed={showWooSecret}");
    expect(settings).toContain("const usernameValidation");
    expect(settings).toContain("const secretValidation");
    expect(magicLink).toContain("toast.success(t(\"login.checkInbox\"");
    expect(onboarding).toContain('id="onboarding-smtp-password"');
    expect(onboarding).toContain('autoComplete="current-password"');
    expect(onboarding).toContain("aria-pressed={showPass}");
    expect(onboarding).toContain("const passwordValidation");
  });

  it("requires an autocomplete token on every native email input", () => {
    expect(emailInputsMissingAutocomplete(resolve(root, "client/src"))).toEqual([]);
  });
});
