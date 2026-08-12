import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("admin email preview runtime contract", () => {
  it("imports every React hook used by the signed-in preview page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(source).toMatch(/import\s*\{[^}]*useState[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toMatch(/import\s*\{[^}]*useCallback[^}]*\}\s*from\s*["']react["']/s);
    expect(source).toContain("trpc.admin.emailPreview.useQuery");
    expect(source).toContain("trpc.admin.sendTestEmail.useMutation");
  });

  it("preserves an admin email-preview deep link through sign-in", () => {
    const appSource = readFileSync(
      resolve(process.cwd(), "client/src/App.tsx"),
      "utf8"
    );
    const authUrlSource = readFileSync(
      resolve(process.cwd(), "client/src/const.ts"),
      "utf8"
    );

    expect(authUrlSource).toContain("returnTo=");
    expect(appSource).toContain('path === "/admin/email-preview"');
    expect(appSource).toContain("authReturnPathStorageKey");
    expect(appSource).toContain("sessionStorage.setItem");
  });

  it("uses a Blob URL first and falls back to srcDoc only when a browser blocks that document", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(previewSource).toContain("URL.createObjectURL");
    expect(previewSource).toContain('type: "text/html;charset=utf-8"');
    expect(previewSource).toContain("src={previewDocumentUrl ?? undefined}");
    expect(previewSource).toContain('previewRenderMode === "blob"');
    expect(previewSource).toContain("srcDoc={previewHtml ?? \"\"}");
    expect(previewSource).toContain('setPreviewRenderMode("srcdoc")');
  });

  it("does not nest the branded header row inside a second table row", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(routerSource).toContain("${headerHtml}<tr><td class=\"email-body\"");
    expect(routerSource).not.toContain("<tr>${headerHtml}</tr><tr><td class=\"email-body\"");
  });
});
