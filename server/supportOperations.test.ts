import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { serializeAdminOperationsCsv } from "./adminOperationsExport";

function readProjectFile(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("support operations saved views, SLA exports, and breach alerts", () => {
  it("keeps saved queue views owner-controlled while safely exposing explicit team-visible views", () => {
    const router = readProjectFile("./routers.ts");
    const savedViewsBlock = router.slice(router.indexOf("savedViews: adminProcedure"), router.indexOf("deleteView: adminProcedure"));
    const deleteViewBlock = router.slice(router.indexOf("deleteView: adminProcedure"), router.indexOf("checkSlaBreach: adminProcedure"));

    expect(savedViewsBlock).toContain("savedViews: adminProcedure");
    expect(savedViewsBlock).toContain("saveView: adminProcedure");
    expect(savedViewsBlock).toContain("eq(supportSavedQueueViews.ownerUserId, ctx.user.id)");
    expect(savedViewsBlock).toContain('eq(supportSavedQueueViews.visibility, "team")');
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_VIEW_VISIBILITIES");
    expect(savedViewsBlock).toContain("visibility: input.visibility");
    expect(savedViewsBlock).toContain("normalizeSupportQueueViewName(name)");
    expect(savedViewsBlock).toContain("MAX_SUPPORT_SAVED_QUEUE_VIEWS");
    expect(savedViewsBlock).toContain("MAX_SUPPORT_SAVED_QUEUE_VIEW_NAME_CHARS");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_ASSIGNEE_SCOPES");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_SLA_WINDOWS");
    expect(savedViewsBlock).toContain("SUPPORT_QUEUE_SORTS");
    expect(savedViewsBlock).toContain('value.assigneeScope === "specific" && value.assigneeUserId === null');
    expect(savedViewsBlock).toContain('eq(users.role, "admin")');
    expect(deleteViewBlock).toContain("eq(supportSavedQueueViews.ownerUserId, ctx.user.id)");
  });

  it("exports only aggregate SLA metrics in a spreadsheet-safe CSV artifact across presets or validated custom ranges", () => {
    const router = readProjectFile("./routers.ts");
    const exportBlock = router.slice(router.indexOf("exportMetricsCsv: adminProcedure"), router.indexOf("savedViews: adminProcedure"));
    const csv = serializeAdminOperationsCsv([
      { section: "support_sla", metric: "overdue_tickets", period: "last_30_days", value: 2, unit: "tickets", details: "Open tickets with an SLA target before export generation" },
      { section: "support_sla", metric: "average_resolution", period: "last_30_days", value: "=unavailable", unit: "milliseconds", details: "No customer fields included" },
    ]);

    expect(exportBlock).toContain("exportMetricsCsv: adminProcedure");
    expect(router).toContain("const supportMetricsInputSchema");
    expect(router).toContain("MAX_SUPPORT_EXPORT_RANGE_DAYS");
    expect(router).toContain("Choose either a preset period or a custom date range.");
    expect(router).toContain("Choose a range of ${MAX_SUPPORT_EXPORT_RANGE_DAYS} days or fewer.");
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

  it("creates policy-routed urgent breach alerts from persisted SLA timestamps and suppresses repeats per target window", () => {
    const router = readProjectFile("./routers.ts");
    const breachBlock = router.slice(router.indexOf("checkSlaBreach: adminProcedure"), router.indexOf("adminAssignees: adminProcedure"));

    expect(breachBlock).toContain("checkSlaBreach: adminProcedure");
    expect(breachBlock).toContain('eq(supportSubmissions.priority, "urgent")');
    expect(breachBlock).toContain('ne(supportSubmissions.status, "resolved")');
    expect(breachBlock).toContain("getSupportEscalationPolicySettings(db)");
    expect(breachBlock).toContain("breachCutoff");
    expect(breachBlock).toContain("lte(supportSubmissions.slaTargetAt, breachCutoff)");
    expect(breachBlock).toContain("policy.recipientUserIds");
    expect(breachBlock).toContain("policy.includeAssignee");
    expect(breachBlock).toContain("policy.includeAllAdminsWhenUnassigned");
    expect(breachBlock).toContain('type: "sla_breach"');
    expect(breachBlock).toContain("dedupSince: ticket.slaTargetAt ?? now");
  });

  it("protects escalation-policy updates with bounded thresholds, valid administrators, and a required recipient route", () => {
    const router = readProjectFile("./routers.ts");
    const policyBlock = router.slice(router.indexOf("updateEscalationPolicy: adminProcedure"), router.indexOf("adminAssignees: adminProcedure"));

    expect(policyBlock).toContain("MAX_SUPPORT_ESCALATION_THRESHOLD_MINUTES");
    expect(policyBlock).toContain("Keep at least one escalation recipient route enabled.");
    expect(policyBlock).toContain('eq(users.role, "admin")');
    expect(policyBlock).toContain("SUPPORT_ESCALATION_POLICY_KEY");
    expect(policyBlock).toContain("supportEscalationPolicyRecipients");
  });

  it("keeps saved views, SLA export, and urgent breach emphasis visible in responsive administrator interfaces", () => {
    const inbox = readProjectFile("../client/src/pages/AdminSupportInbox.tsx");
    const dashboard = readProjectFile("../client/src/pages/AdminDashboard.tsx");
    const alerts = readProjectFile("../client/src/components/SupportTicketAlerts.tsx");

    expect(inbox).toContain("trpc.support.savedViews.useQuery");
    expect(inbox).toContain("trpc.support.saveView.useMutation");
    expect(inbox).toContain("trpc.support.deleteView.useMutation");
    expect(inbox).toContain("savedViewVisibility");
    expect(inbox).toContain("Urgent SLA escalation policy");
    expect(inbox).toContain("support-breach-threshold-minutes");
    expect(inbox).toContain("trpc.support.updateEscalationPolicy.useMutation");
    expect(inbox).toContain("Saved queue views");
    expect(inbox).toContain('data-sla-breached={hasUrgentSlaBreach ? "true" : "false"}');
    expect(inbox).toContain("Urgent SLA breach");
    expect(inbox).toContain('<option value="next_4_hours">Due within 4 hours</option>');
    expect(inbox).toContain('<option value="assignee">Assignee</option>');
    expect(dashboard).toContain("trpc.support.exportMetricsCsv.useQuery");
    expect(dashboard).toContain("supportReportStartDate");
    expect(dashboard).toContain("supportReportEndDate");
    expect(dashboard).toContain("Custom SLA reporting date range");
    expect(dashboard).toContain('data-testid="admin-support-sla-csv-export"');
    expect(dashboard).toContain("Export SLA CSV");
    expect(alerts).toContain('alert.type === "sla_breach"');
    expect(alerts).toContain("Urgent SLA breach");
  });
});
