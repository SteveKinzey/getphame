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
    expect(source).toContain("function getInitialTemplate");
    expect(source).toContain('new URLSearchParams(window.location.search).get("template")');
    expect(source).toContain("TEMPLATES.some(template => template.value === requested)");
  });

  it("provides a public read-only preview while keeping email delivery administrative", () => {
    const appSource = readFileSync(
      resolve(process.cwd(), "client/src/App.tsx"),
      "utf8"
    );
    const authUrlSource = readFileSync(
      resolve(process.cwd(), "client/src/const.ts"),
      "utf8"
    );

    const unauthenticatedRoute = appSource.slice(
      appSource.indexOf("if (!user)"),
      appSource.indexOf("// ── Authenticated app shell")
    );

    expect(authUrlSource).toContain("returnTo=");
    expect(unauthenticatedRoute).toContain('path === "/admin/email-preview"');
    expect(unauthenticatedRoute).toContain("<AdminEmailPreviewPage readOnly />");
    expect(unauthenticatedRoute).not.toContain("<AuthRequiredRedirect");
    expect(appSource).toContain('path="/admin/email-preview" component={AuthenticatedAdminEmailPreviewPage}');
    expect(appSource).toContain("const isDevelopmentPreviewBypass");
    expect(appSource).toContain('import.meta.env.DEV && path === "/admin/email-preview"');
    expect(appSource).toContain("if (loading && !isDevelopmentPreviewBypass)");
  });

  it("uses a sanitized Shadow DOM surface instead of a policy-sensitive nested document", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(previewSource).toContain("function sanitizeEmailPreviewHtml");
    expect(previewSource).toContain("function EmailPreviewSurface");
    expect(previewSource).toContain("attachShadow({ mode: \"open\" })");
    expect(previewSource).toContain("[data-email-preview-content]");
    expect(previewSource).toContain("Email preview contains no rendered content");
    expect(previewSource).not.toContain("srcDoc={previewHtml");
    expect(previewSource).not.toContain("previewDocumentUrl");
  });

  it("keeps static preview retrieval available while verifying actual rendered content", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(previewSource).toContain("enabled: true");
    expect(previewSource).toContain("renderedText");
    expect(previewSource).toContain("const [previewReadyKey");
    expect(previewSource).toContain("const [previewErrorKey");
    expect(previewSource).toContain("previewReadyKey === previewKey");
    expect(previewSource).toContain("previewErrorKey === previewKey");
    expect(routerSource).toContain("emailPreview: publicProcedure");
  });

  it("hides preview editing and test-email delivery controls in the public read-only view", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(previewSource).toContain("{ readOnly = false }");
    expect(previewSource).toContain("!readOnly && (");
    expect(previewSource).toContain("!readOnly && showVars");
    expect(routerSource).toContain("sendTestEmail: adminProcedure");
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

  it("keeps email body and footer text legible in dark-mode preview rendering", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(previewSource).toContain(".email-body,.email-body *{color:#f8fafc!important}");
    expect(previewSource).toContain(".email-body a{color:#f6d56e!important}");
    expect(previewSource).toContain(".email-footer,.email-footer *{color:#cbd5e1!important}");
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
      routerSource.indexOf("emailPreview: publicProcedure")
    );
    const templateSource = readFileSync(
      resolve(process.cwd(), "server/adminEmailPreviewTemplates.ts"),
      "utf8"
    );

    expect(sendTestSource).toContain(
      "https://getphame.app/login?returnTo=%2Fadmin%2Femail-preview"
    );
    expect(sendTestSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
    expect(templateSource).toContain(
      "https://getphame.app/login?returnTo=%2Fadmin%2Femail-preview"
    );
    expect(templateSource).toContain("Open Get Phame sign-in");
    expect(browserPreviewSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
  });

  it("uses the same shared renderer for browser previews and dispatched test emails", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expect(routerSource).toContain('from "./adminEmailPreviewTemplates"');
    expect(routerSource.match(/buildAdminEmailPreviewTemplate\(/g)).toHaveLength(2);
    expect(routerSource).toContain("const testMessageId = Date.now().toString(36)");
    expect(routerSource).toContain("[Test Preview ${testMessageId}]");
  });

  it("keeps an email-preview shortcut in both administrator dashboard access surfaces", () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"),
      "utf8"
    );

    expect(dashboardSource).toContain('path: "/admin/email-preview"');
    expect(dashboardSource).toContain(
      'onClick={() => navigate("/admin/email-preview")}'
    );
    expect(dashboardSource).toContain("Email Template Preview");
  });
});
