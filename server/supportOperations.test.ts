import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { serializeAdminOperationsCsv } from "./adminOperationsExport";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("support operations saved views, SLA exports, and breach alerts", () => {
  it("keeps saved queue views admin-owned, bounded, normalized, and restricted to supported filters", () => {
    const router = readProjectFile("./routers.ts");
    const savedViewsBlock = router.slice(router.indexOf("savedViews: adminProcedure"), router.indexOf("deleteView: adminProcedure"));

    expect(savedViewsBlock).toContain("savedViews: adminProcedure");
    expect(savedViewsBlock).toContain("saveView: adminProcedure");
    expect(savedViewsBlock).toContain("eq(supportSavedQueueViews.ownerUserId, ctx.user.id)");
    expect(savedViewsBlock).toContain("normalizeSupportQueueViewName(name)");
    expect(savedViewsBlock).toContain("MAX_SUPPORT_SAVED_QUEUE_VIEWS");
    expect(savedViewsBlock).toContain("MAX_SUPPORT_SAVED_QUEUE_VIEW_NAME_CHARS");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_ASSIGNEE_SCOPES");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_SLA_WINDOWS");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_SORTS");
    expect(savedViewsBlock).toContain('value.assigneeScope === "specific" && value.assigneeUserId === null');
    expect(savedViewsBlock).toContain('eq(users.role, "admin")');
  });

  it("exports only aggregate SLA metrics in a spreadsheet-safe CSV artifact", () => {
    const router = readProjectFile("./routers.ts");
    const exportBlock = router.slice(router.indexOf("exportMetricsCsv: adminProcedure"), router.indexOf("savedViews: adminProcedure"));
    const csv = serializeAdminOperationsCsv([
      { section: "support_sla", metric: "overdue_tickets", period: "last_30_days", value: 2, unit: "tickets", details: "Open tickets with an SLA target before export generation" },
      { section: "support_sla", metric: "average_resolution", period: "last_30_days", value: "=unavailable", unit: "milliseconds", details: "No customer fields included" },
    ]);

    expect(exportBlock).toContain("exportMetricsCsv: adminProcedure");
    expect(exportBlock).toContain("getSupportMetricsSnapshot");
    expect(exportBlock).toContain('section: "support_sla"');
    expect(exportBlock).toContain("serializeAdminOperationsCsv(rows)");
    expect(exportBlock).toContain("getphame-support-sla-");
    expect(exportBlock).not.toContain("email:");
    expect(exportBlock).not.toContain("subject:");
    expect(csv.startsWith("\uFEFFsection,metric,period,value,unit,details\r\n")).toBe(true);
    expect(csv).toContain("'=unavailable");
    expect(csv).not.toContain("customer@example.com");
  });

  it("creates recipient-scoped urgent breach alerts from persisted SLA timestamps and suppresses repeats per target window", () => {
    const router = readProjectFile("./routers.ts");
    const breachBlock = router.slice(router.indexOf("checkSlaBreach: adminProcedure"), router.indexOf("adminAssignees: adminProcedure"));

    expect(breachBlock).toContain("checkSlaBreach: adminProcedure");
    expect(breachBlock).toContain('eq(supportSubmissions.priority, "urgent")');
    expect(breachBlock).toContain('ne(supportSubmissions.status, "resolved")');
    expect(breachBlock).toContain("lte(supportSubmissions.slaTargetAt, now)");
    expect(breachBlock).toContain("ticket.assigneeUserId ? [ticket.assigneeUserId] : admins.map((admin) => admin.id)");
    expect(breachBlock).toContain('type: "sla_breach"');
    expect(breachBlock).toContain("dedupSince: ticket.slaTargetAt ?? now");
  });

  it("keeps saved views, SLA export, and urgent breach emphasis visible in responsive administrator interfaces", () => {
    const inbox = readProjectFile("../client/src/pages/AdminSupportInbox.tsx");
    const dashboard = readProjectFile("../client/src/pages/AdminDashboard.tsx");
    const alerts = readProjectFile("../client/src/components/SupportTicketAlerts.tsx");

    expect(inbox).toContain("trpc.support.savedViews.useQuery");
    expect(inbox).toContain("trpc.support.saveView.useMutation");
    expect(inbox).toContain("trpc.support.deleteView.useMutation");
    expect(inbox).toContain("Saved queue views");
    expect(inbox).toContain('data-sla-breached={hasUrgentSlaBreach ? "true" : "false"}');
    expect(inbox).toContain("Urgent SLA breach");
    expect(inbox).toContain('<option value="next_4_hours">Due within 4 hours</option>');
    expect(inbox).toContain('<option value="assignee">Assignee</option>');
    expect(dashboard).toContain("trpc.support.exportMetricsCsv.useQuery");
    expect(dashboard).toContain('data-testid="admin-support-sla-csv-export"');
    expect(dashboard).toContain("Export SLA CSV");
    expect(alerts).toContain('alert.type === "sla_breach"');
    expect(alerts).toContain("Urgent SLA breach");
  });
});
