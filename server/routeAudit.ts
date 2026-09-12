import { chromium } from "playwright-core";

const CANONICAL_PRODUCTION_ORIGIN = "https://getphame.app";
const MAX_ROUTES_PER_AUDIT = 25;
const NAVIGATION_TIMEOUT_MS = 20_000;
export const ROUTE_AUDIT_DEFERRED_CODE = "route_audit_deferred";

export type RouteAuditFinding = {
  route: string;
  status: number | null;
  navigationError: boolean;
  evaluationError: boolean;
  consoleErrorCount: number;
  pageErrorCount: number;
  rendered: {
    hasRoot: boolean;
    rootChildCount: number;
    textLength: number;
    title: string;
  };
};

export type ProductionRouteAuditResult = {
  auditedRoutes: number;
  failureCount: number;
  findings: RouteAuditFinding[];
  durationMs: number;
  auditedAt: number;
};

export class RouteAuditError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "RouteAuditError";
  }
}

/** Browser-backed audits run only in an explicitly provisioned Chromium runtime. */
export function isProductionRouteAuditEnabled(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return env.ROUTE_AUDIT_ENABLED === "true";
}

/** Extract only canonical same-origin routes from a sitemap document. */
export function extractProductionAuditRoutes(sitemapXml: string): string[] {
  const seen = new Set<string>();
  const origin = new URL(CANONICAL_PRODUCTION_ORIGIN).origin;
  const matches = Array.from(
    sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)
  );

  for (const match of matches) {
    try {
      const url = new URL(match[1]);
      if (url.origin !== origin || url.protocol !== "https:") continue;
      url.hash = "";
      seen.add(url.toString());
    } catch {
      // An invalid sitemap entry cannot make the auditor fetch an arbitrary URL.
    }
  }

  return Array.from(seen).slice(0, MAX_ROUTES_PER_AUDIT);
}

function isExternalAnalyticsCspWarning(message: string): boolean {
  return (
    message.includes("static.cloudflareinsights.com") &&
    message.includes("Content Security Policy")
  );
}

function findingFailed(finding: RouteAuditFinding): boolean {
  return (
    finding.navigationError ||
    finding.evaluationError ||
    (finding.status !== null && finding.status >= 400) ||
    finding.consoleErrorCount > 0 ||
    finding.pageErrorCount > 0 ||
    !finding.rendered.hasRoot ||
    finding.rendered.rootChildCount === 0 ||
    finding.rendered.textLength === 0
  );
}

/**
 * Run a serialized, non-authenticated audit of sitemap-discovered public routes.
 * The returned data is sanitized before it is persisted or displayed.
 */
export async function runProductionRouteAudit(): Promise<ProductionRouteAuditResult> {
  if (!isProductionRouteAuditEnabled()) {
    throw new RouteAuditError(ROUTE_AUDIT_DEFERRED_CODE);
  }

  const startedAt = Date.now();
  const sitemapResponse = await fetch(
    `${CANONICAL_PRODUCTION_ORIGIN}/sitemap.xml`,
    {
      headers: { accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(NAVIGATION_TIMEOUT_MS),
    }
  ).catch(() => {
    throw new RouteAuditError("sitemap_unavailable");
  });

  if (!sitemapResponse.ok) throw new RouteAuditError("sitemap_unavailable");
  const routes = extractProductionAuditRoutes(await sitemapResponse.text());
  if (!routes.length) throw new RouteAuditError("sitemap_empty");

  const executablePath =
    process.env.ROUTE_AUDIT_CHROMIUM_PATH || "/usr/bin/chromium";
  const browser = await chromium
    .launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    })
    .catch(() => {
      throw new RouteAuditError("browser_unavailable");
    });

  try {
    const findings: RouteAuditFinding[] = [];
    for (const url of routes) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      let consoleErrorCount = 0;
      let pageErrorCount = 0;
      let status: number | null = null;
      let navigationError = false;
      let evaluationError = false;
      let rendered: RouteAuditFinding["rendered"] = {
        hasRoot: false,
        rootChildCount: 0,
        textLength: 0,
        title: "",
      };

      page.on("console", message => {
        if (
          message.type() === "error" &&
          !isExternalAnalyticsCspWarning(message.text())
        ) {
          consoleErrorCount += 1;
        }
      });
      page.on("pageerror", () => {
        pageErrorCount += 1;
      });

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        consoleErrorCount = 0;
        pageErrorCount = 0;
        navigationError = false;
        try {
          const response = await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: NAVIGATION_TIMEOUT_MS,
          });
          status = response?.status() ?? null;
          await page
            .waitForFunction(
              () => {
                const root = document.querySelector("#root");
                return Boolean(root && root.children.length > 0);
              },
              { timeout: 10_000 }
            )
            .catch(() => undefined);
          await page.waitForTimeout(400);
          if (consoleErrorCount === 0 && pageErrorCount === 0) break;
        } catch {
          navigationError = true;
        }
        if (attempt < 3) await page.waitForTimeout(500);
      }

      if (!navigationError) {
        try {
          rendered = await page.evaluate(() => ({
            hasRoot: Boolean(document.querySelector("#root")),
            rootChildCount:
              document.querySelector("#root")?.children.length ?? 0,
            textLength: document.body.innerText.trim().length,
            title: document.title.slice(0, 160),
          }));
        } catch {
          evaluationError = true;
        }
      }

      findings.push({
        route: new URL(url).pathname || "/",
        status,
        navigationError,
        evaluationError,
        consoleErrorCount,
        pageErrorCount,
        rendered,
      });
      await page.close();
    }

    return {
      auditedRoutes: findings.length,
      failureCount: findings.filter(findingFailed).length,
      findings,
      durationMs: Date.now() - startedAt,
      auditedAt: Date.now(),
    };
  } finally {
    await browser.close();
  }
}
