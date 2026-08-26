import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractProductionAuditRoutes,
  isProductionRouteAuditEnabled,
  ROUTE_AUDIT_DEFERRED_CODE,
  RouteAuditError,
} from "./routeAudit";

describe("production route audit boundaries", () => {
  it("keeps only canonical same-origin public sitemap routes", () => {
    const routes = extractProductionAuditRoutes(`
      <urlset>
        <url><loc>https://getphame.app/</loc></url>
        <url><loc>https://getphame.app/pricing#plans</loc></url>
        <url><loc>https://getphame.app/security</loc></url>
        <url><loc>https://www.getphame.app/ignored</loc></url>
        <url><loc>https://example.invalid/not-allowed</loc></url>
        <url><loc>javascript:alert(1)</loc></url>
      </urlset>
    `);

    expect(routes).toEqual([
      "https://getphame.app/",
      "https://getphame.app/pricing",
      "https://getphame.app/security",
    ]);
  });

  it("uses a stable, non-sensitive error code for operational failures", () => {
    const error = new RouteAuditError("browser_unavailable");
    expect(error.name).toBe("RouteAuditError");
    expect(error.code).toBe("browser_unavailable");
    expect(error.message).not.toContain("cookie");
  });

  it("defers browser-backed audits unless a Chromium-capable runtime explicitly enables them", () => {
    expect(isProductionRouteAuditEnabled({})).toBe(false);
    expect(isProductionRouteAuditEnabled({ ROUTE_AUDIT_ENABLED: "true" })).toBe(true);
    expect(new RouteAuditError(ROUTE_AUDIT_DEFERRED_CODE).code).toBe("route_audit_deferred");
  });

  it("retries transient browser console and page errors before persisting a route failure", () => {
    const source = readFileSync(resolve(import.meta.dirname, "routeAudit.ts"), "utf8");
    expect(source).toContain("for (let attempt = 1; attempt <= 3; attempt += 1)");
    expect(source).toContain("consoleErrorCount = 0;");
    expect(source).toContain("if (consoleErrorCount === 0 && pageErrorCount === 0) break;");
  });

  it("keeps the standalone audit diagnostic runnable with one Chromium import and same-origin HTTP failure capture", () => {
    const script = readFileSync(
      resolve(import.meta.dirname, "../scripts/audit-production-routes.mjs"),
      "utf8"
    );
    expect(script.match(/import \{ chromium \}/g)).toHaveLength(1);
    expect(script).toContain("const failedResponses = [];");
    expect(script).toContain("new URL(response.url()).origin === new URL(url).origin");
  });
});
