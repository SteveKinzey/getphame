import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("administrator route-audit workflow contracts", () => {
  it("stores sanitized audit and renderer history behind admin-only procedures", () => {
    const schema = read("drizzle/schema.ts");
    const router = read("server/routers.ts");
    expect(schema).toContain('pgTable(\n  "route_audit_runs"');
    expect(schema).toContain('pgTable(\n  "email_preview_renderer_errors"');
    expect(router).toContain("triggerRouteAudit: adminProcedure");
    expect(router).toContain("listRouteAuditRuns: adminProcedure");
    expect(router).toContain("recordEmailPreviewRendererError: adminProcedure");
    expect(router).toContain("listEmailPreviewRendererErrors: adminProcedure");
    expect(router).toContain(
      'errorCode: z.literal("render_content_unavailable")'
    );
    expect(schema).not.toContain(
      'emailPreviewRendererErrors = pgTable(\n  "email_preview_renderer_errors",\n  {\n    html:'
    );
  });

  it("renders a protected history page and resilient copy fallback without logging HTML", () => {
    const page = read("client/src/pages/AdminAuditLog.tsx");
    const preview = read("client/src/pages/AdminEmailPreview.tsx");
    expect(page).toContain('user?.role !== "admin"');
    expect(page).toContain("listRouteAuditRuns.useQuery");
    expect(page).toContain("listEmailPreviewRendererErrors.useQuery");
    expect(preview).toContain("copyTextWithFallback");
    expect(preview).toContain("recordEmailPreviewRendererError.useMutation");
    expect(preview).toContain("render_content_unavailable");
    expect(preview).not.toContain("errorMessage:");
  });
});
