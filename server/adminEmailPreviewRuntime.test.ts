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

  it("shows an accessible email-shaped loading skeleton and exports resolved HTML safely", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(previewSource).toContain("renderPreviewSkeleton");
    expect(previewSource).toContain('role="status"');
    expect(previewSource).toContain('aria-live="polite"');
    expect(previewSource).toContain("handleExportHtml");
    expect(previewSource).toContain('type: "text/html;charset=utf-8"');
    expect(previewSource).toContain("get-phame-${templateSlug}-email-preview.html");
    expect(previewSource).toContain("anchor.download");
    expect(previewSource).toContain("URL.revokeObjectURL(url)");
  });

  it("does not nest the branded header row inside a second table row", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(routerSource).toContain("${headerHtml}<tr><td class=\"email-body\"");
    expect(routerSource).not.toContain("<tr>${headerHtml}</tr><tr><td class=\"email-body\"");
    expect(routerSource).not.toContain("<tr>${headerHtml}</tr><tr><td style=\"padding:40px;\"");
  });

  it("makes Magic Link previews safe to click without fabricating a live authentication token", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );
    const sendTestSource = routerSource.slice(
      routerSource.indexOf("sendTestEmail: adminProcedure"),
      routerSource.indexOf("listLeads: adminProcedure")
    );
    const browserPreviewSource = routerSource.slice(
      routerSource.indexOf("emailPreview: adminProcedure"),
      routerSource.indexOf("  }),\n  }),", routerSource.indexOf("emailPreview: adminProcedure"))
    );

    expect(sendTestSource).toContain("https://getphame.app/login?from=test-email-preview");
    expect(sendTestSource).toContain("Open Get Phame sign-in");
    expect(sendTestSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
    expect(browserPreviewSource).toContain("https://getphame.app/login?from=email-preview");
    expect(browserPreviewSource).toContain("Open Get Phame sign-in");
    expect(browserPreviewSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
  });
});
