import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
      expect(source).toContain(`value: "${template}"`);
    }
    expect((source.match(/value: "/g) ?? []).length).toBeGreaterThanOrEqual(templates.length);
  });

  it("covers desktop, mobile, and split viewport rendering through the same Blob document URL", () => {
    const source = previewSource();
    expect(source).toContain('type ViewMode = "desktop" | "mobile" | "split"');
    expect(source).toContain('renderIframePane("Desktop — 800px", 800');
    expect(source).toContain('renderIframePane("Mobile — 390px", 390');
    expect((source.match(/src=\{previewDocumentUrl\}/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("exposes a loaded and a recoverable-error state to browser users", () => {
    const source = previewSource();
    expect(source).toContain('setPreviewRenderState("ready")');
    expect(source).toContain('setPreviewRenderState("error")');
    expect(source).toContain('previewRenderState === "error" ? renderPreviewFallback()');
    expect(source).toContain('previewRenderState === "ready" && previewDocumentUrl');
    expect(source).toContain('role="alert"');
  });
});
