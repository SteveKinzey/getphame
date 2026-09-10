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

describe("admin email preview runtime contract", () => {
  it("imports every React hook used by the signed-in preview page", () => {
    const source = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expect(source).toMatch(
      /import\s*\{[^}]*useState[^}]*\}\s*from\s*["']react["']/s
    );
    expect(source).toMatch(
      /import\s*\{[^}]*useEffect[^}]*\}\s*from\s*["']react["']/s
    );
    expect(source).toMatch(
      /import\s*\{[^}]*useCallback[^}]*\}\s*from\s*["']react["']/s
    );
    expectSourceContract(source).toContain("trpc.admin.emailPreview.useQuery");
    expectSourceContract(source).toContain(
      "trpc.admin.sendTestEmail.useMutation"
    );
    expectSourceContract(source).toContain("function getInitialTemplate");
    expectSourceContract(source).toContain(
      'new URLSearchParams(window.location.search).get("template")'
    );
    expectSourceContract(source).toContain(
      "TEMPLATES.some(template => template.value === requested)"
    );
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

    expectSourceContract(authUrlSource).toContain("returnTo=");
    expectSourceContract(unauthenticatedRoute).toContain(
      'path === "/admin/email-preview"'
    );
    expectSourceContract(unauthenticatedRoute).toContain(
      "<AdminEmailPreviewPage readOnly />"
    );
    expect(unauthenticatedRoute).not.toContain("<AuthRequiredRedirect");
    expectSourceContract(appSource).toContain(
      'path="/admin/email-preview" component={AuthenticatedAdminEmailPreviewPage}'
    );
    expectSourceContract(appSource).toContain(
      "const isDevelopmentPreviewBypass"
    );
    expectSourceContract(appSource).toContain(
      'import.meta.env.DEV && path === "/admin/email-preview"'
    );
    expectSourceContract(appSource).toContain(
      "if (loading && !isDevelopmentPreviewBypass)"
    );
  });

  it("uses a sanitized Shadow DOM surface instead of a policy-sensitive nested document", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expectSourceContract(previewSource).toContain(
      "function sanitizeEmailPreviewHtml"
    );
    expectSourceContract(previewSource).toContain(
      "function EmailPreviewSurface"
    );
    expectSourceContract(previewSource).toContain(
      'attachShadow({ mode: "open" })'
    );
    expectSourceContract(previewSource).toContain(
      "[data-email-preview-content]"
    );
    expectSourceContract(previewSource).toContain(
      "Email preview contains no rendered content"
    );
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

    expectSourceContract(previewSource).toContain("enabled: true");
    expectSourceContract(previewSource).toContain("renderedText");
    expectSourceContract(previewSource).toContain("const [previewReadyKey");
    expectSourceContract(previewSource).toContain("const [previewErrorKey");
    expectSourceContract(previewSource).toContain(
      "previewReadyKey === previewKey"
    );
    expectSourceContract(previewSource).toContain(
      "previewErrorKey === previewKey"
    );
    expectSourceContract(routerSource).toContain(
      "emailPreview: publicProcedure"
    );
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

    expect(previewSource).toMatch(
      /function\s+AdminEmailPreview\s*\(\s*\{\s*readOnly\s*=\s*false\s*,?\s*\}\s*:\s*\{/s
    );
    expectSourceContract(previewSource).toContain("!readOnly && (");
    expectSourceContract(previewSource).toContain("!readOnly && showVars");
    expectSourceContract(routerSource).toContain(
      "sendTestEmail: adminProcedure"
    );
  });

  it("shows an accessible email-shaped loading skeleton and exports resolved HTML safely", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expectSourceContract(previewSource).toContain("renderPreviewSkeleton");
    expectSourceContract(previewSource).toContain('role="status"');
    expectSourceContract(previewSource).toContain('aria-live="polite"');
    expectSourceContract(previewSource).toContain("handleExportHtml");
    expectSourceContract(previewSource).toContain(
      'type: "text/html;charset=utf-8"'
    );
    expectSourceContract(previewSource).toContain(
      "get-phame-${templateSlug}-email-preview.html"
    );
    expectSourceContract(previewSource).toContain("anchor.download");
    expectSourceContract(previewSource).toContain("URL.revokeObjectURL(url)");
  });

  it("keeps email body and footer text legible in dark-mode preview rendering", () => {
    const previewSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminEmailPreview.tsx"),
      "utf8"
    );

    expectSourceContract(previewSource).toContain(
      ".email-body,.email-body *{color:#f8fafc!important}"
    );
    expectSourceContract(previewSource).toContain(
      ".email-body a{color:#f6d56e!important}"
    );
    expectSourceContract(previewSource).toContain(
      ".email-footer,.email-footer *{color:#cbd5e1!important}"
    );
  });

  it("does not nest the branded header row inside a second table row", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expectSourceContract(routerSource).toContain(
      '${headerHtml}<tr><td class="email-body"'
    );
    expect(routerSource).not.toContain(
      '<tr>${headerHtml}</tr><tr><td class="email-body"'
    );
    expect(routerSource).not.toContain(
      '<tr>${headerHtml}</tr><tr><td style="padding:40px;"'
    );
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

    expectSourceContract(sendTestSource).toContain(
      "https://getphame.app/login?returnTo=%2Fadmin%2Femail-preview"
    );
    expect(sendTestSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
    expectSourceContract(templateSource).toContain(
      "https://getphame.app/login?returnTo=%2Fadmin%2Femail-preview"
    );
    expectSourceContract(templateSource).toContain("Open Get Phame sign-in");
    expect(browserPreviewSource).not.toContain("PREVIEW_TOKEN_SAMPLE");
  });

  it("uses the same shared renderer for browser previews and dispatched test emails", () => {
    const routerSource = readFileSync(
      resolve(process.cwd(), "server/routers.ts"),
      "utf8"
    );

    expectSourceContract(routerSource).toContain(
      'from "./adminEmailPreviewTemplates"'
    );
    expect(
      routerSource.match(/buildAdminEmailPreviewTemplate\(/g)
    ).toHaveLength(2);
    expectSourceContract(routerSource).toContain(
      "const testMessageId = Date.now().toString(36)"
    );
    expectSourceContract(routerSource).toContain(
      "[Test Preview ${testMessageId}]"
    );
  });

  it("keeps an email-preview shortcut in both administrator dashboard access surfaces", () => {
    const dashboardSource = readFileSync(
      resolve(process.cwd(), "client/src/pages/AdminDashboard.tsx"),
      "utf8"
    );

    expectSourceContract(dashboardSource).toContain(
      'path: "/admin/email-preview"'
    );
    expectSourceContract(dashboardSource).toContain(
      'onClick={() => navigate("/admin/email-preview")}'
    );
    expectSourceContract(dashboardSource).toContain("Email Template Preview");
  });
});
