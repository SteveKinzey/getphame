import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url).pathname;
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("adaptive burst-cap governance contracts", () => {
  it("persists immutable administrator-attributed history only after a real cap change", () => {
    const schema = read("drizzle/schema.ts");
    const service = read("server/adaptiveSendBurstPolicy.ts");
    const migration = read(
      "drizzle/manual-pending/20260911_add_burst_cap_audit_history.sql"
    );

    expect(schema).toContain("adaptiveSendBurstPolicyChanges");
    expect(schema).toContain("changedByUserId");
    expect(schema).toContain("previousFreeBurstCap");
    expect(service).toContain("const changed =");
    expect(service).toContain("if (!changed) return;");
    expect(service).toContain("tx.insert(adaptiveSendBurstPolicyChanges)");
    expect(service).toMatch(/\.leftJoin\(\s*users,/);
    expect(migration).toContain("adaptive_send_burst_policy_changes");
    expect(migration).toContain("changedByUserId");
  });

  it("keeps audit access and quick edits administrator-scoped in each UI surface", () => {
    const settings = read(
      "client/src/components/AdaptiveSendBurstCapSettings.tsx"
    );
    const quickEdit = read(
      "client/src/components/AdaptiveSendBurstCapQuickEdit.tsx"
    );
    const dashboard = read("client/src/pages/AdminDashboard.tsx");
    const router = read("server/routers.ts");

    expect(settings).toContain("listAdaptiveSendBurstCapAudit.useQuery");
    expect(settings).toContain('data-testid="adaptive-send-burst-cap-audit"');
    expect(quickEdit).toContain("getAdaptiveSendBurstCaps.useQuery");
    expect(quickEdit).toContain("updateAdaptiveSendBurstCaps.useMutation");
    expect(quickEdit).toContain('data-testid="admin-burst-cap-quick-edit"');
    expect(dashboard).toContain("<AdaptiveSendBurstCapQuickEdit />");
    expect(router).toContain("listAdaptiveSendBurstCapAudit: adminProcedure");
  });
});
