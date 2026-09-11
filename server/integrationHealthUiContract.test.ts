import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

function source(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("administrator integration health interface", () => {
  it("keeps a live, admin-only snapshot page wired into the application", () => {
    const page = source("client/src/pages/AdminIntegrationHealth.tsx");
    const app = source("client/src/App.tsx");
    const router = source("server/routers.ts");

    expect(page).toContain("trpc.integrationHealth.snapshot.useQuery");
    expect(page).toContain("refetchInterval: 15_000");
    expect(page).toContain('navigate("/admin")');
    expect(page).toContain("Database connection");
    expect(page).toContain("Stripe API");
    expect(app).toContain("AdminIntegrationHealthPage");
    expect(app).toContain('path="/admin/integration-health"');
    expect(router).toContain("integrationHealth: integrationHealthRouter");
  });

  it("surfaces database latency in the administration diagnostics hub", () => {
    const dashboard = source("client/src/pages/AdminDashboard.tsx");

    expect(dashboard).toContain("DatabaseConnectionHealthIndicator");
    expect(dashboard).toContain("admin-database-connection-health");
    expect(dashboard).toContain('navigate("/admin/integration-health")');
    expect(dashboard).toContain(
      "Live database, scheduler, Stripe, email relay"
    );
  });
});
