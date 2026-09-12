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

const previewSource = () =>
  readFileSync(
    resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
    "utf8"
  );

describe("admin email preview browser coverage matrix", () => {
  const templates = [
    "magic-link",
    "welcome",
    "upgrade-receipt-pro",
    "upgrade-receipt-annual",
    "upgrade-receipt-lifetime",
    "account-deletion",
  ];

  it("keeps every supported preview template selectable in the browser", () => {
    const source = previewSource();
    for (const template of templates) {
      expectSourceContract(source).toContain(`value: "${template}"`);
    }
    expect((source.match(/value: "/g) ?? []).length).toBeGreaterThanOrEqual(
      templates.length
    );
  });

  it("covers desktop, mobile, and split viewport rendering through the shared content-verified surface", () => {
    const source = previewSource();
    expectSourceContract(source).toContain(
      'type ViewMode = "desktop" | "mobile" | "split"'
    );
    expect(source).toMatch(
      /renderIframePane\s*\(\s*["']Desktop — 800px["']\s*,\s*800\s*,/s
    );
    expect(source).toMatch(
      /renderIframePane\s*\(\s*["']Mobile — 390px["']\s*,\s*390\s*,/s
    );
    expectSourceContract(source).toContain("EmailPreviewSurface");
    expectSourceContract(source).toContain(
      "renderPreviewDocument(`${label} preview`, key, 500)"
    );
    expectSourceContract(source).toContain("const previewKey =");
    expect(source).not.toContain("iframeKey");
    expectSourceContract(source).toContain(
      "onReady={() => handlePreviewReady(previewKey)}"
    );
  });

  it("exposes a loaded and a recoverable-error state to browser users", () => {
    const source = previewSource();
    expectSourceContract(source).toContain("previewReadyKey === previewKey");
    expectSourceContract(source).toContain("previewErrorKey === previewKey");
    expectSourceContract(source).toContain(
      'previewRenderState === "error" ? ( renderPreviewFallback()'
    );
    expectSourceContract(source).toContain(
      'previewRenderState === "ready" && previewHtml'
    );
    expectSourceContract(source).toContain('role="alert"');
    expectSourceContract(source).toContain(
      "Email preview contains no rendered content"
    );
    expectSourceContract(source).toContain(
      'data-testid="email-preview-surface"'
    );
    expectSourceContract(source).toContain('previewRenderState === "loading"');
    expectSourceContract(source).toContain("renderPreviewSkeleton(minHeight)");
    expectSourceContract(source).toContain("handleExportHtml");
  });
});
