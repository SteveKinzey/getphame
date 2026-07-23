import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;
const LOCALES = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function read(relativePath: string) {
  return readFileSync(join(PROJECT_ROOT, relativePath), "utf8");
}

function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string" ? [path] : leafPaths(child, path);
  });
}

function getByPath(value: unknown, dottedPath: string): unknown {
  return dottedPath.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

describe("Sources workspace contract", () => {
  it("keeps every Sources key fully localized across all maintained locales", () => {
    const english = JSON.parse(read("client/public/locales/en/translation.json")) as Record<string, unknown>;
    const expectedPaths = leafPaths(english.sources, "sources");
    expect(expectedPaths.length).toBeGreaterThanOrEqual(100);

    for (const locale of LOCALES) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/translation.json`)) as Record<string, unknown>;
      expect(getByPath(catalog, "nav.sources"), `${locale} nav.sources`).toBeTruthy();
      for (const path of expectedPaths) {
        const value = getByPath(catalog, path);
        expect(typeof value === "string" && value.trim().length > 0, `${locale} ${path}`).toBe(true);
      }
    }
  });

  it("registers Sources as an authenticated route with desktop and mobile navigation", () => {
    expect(read("client/src/App.tsx")).toContain('<Route path="/sources" component={SourcesPage} />');
    expect(read("client/src/components/AppLayout.tsx")).toContain('{ path: "/sources"');
    expect(read("client/src/components/BottomNav.tsx")).toContain("navigate('/sources')");
  });

  it("keeps import review explicit and never starts background WooCommerce imports", () => {
    const page = read("client/src/pages/Sources.tsx");
    const core = read("server/_core/index.ts");
    const settings = read("client/src/pages/Settings.tsx");
    const router = read("server/routers/sources.ts");

    expect(page).toContain("ConsentPanel");
    expect(page).toContain("PreviewPanel");
    expect(page).toContain("sources.preview.rejectedSummary");
    expect(page).toContain("sources.csv.downloadSample");
    expect(page).toContain("Importing never sends messages");
    expect(page).not.toContain("trpc.woo.importPending.useMutation");
    expect(settings).not.toContain("trpc.woo.importPending.useMutation");
    expect(settings).not.toContain("trpc.woo.saveCredentials.useMutation");
    expect(settings).not.toContain("trpc.woo.sync.useMutation");
    expect(settings).not.toContain("Monday auto-import");
    expect(settings).toContain('navigate("/sources")');
    expect(core).not.toContain("startWooAutoImportScheduler");
    expect(router).not.toContain("publicProcedure");
    expect(router.match(/protectedProcedure/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it("keeps the Sources migration additive and non-destructive", () => {
    const migration = read("drizzle/0026_jazzy_molecule_man.sql");
    expect(migration).toContain("CREATE TABLE");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|DATABASE)/i);
    expect(migration).not.toMatch(/TRUNCATE|DELETE\s+FROM/i);
  });
});
