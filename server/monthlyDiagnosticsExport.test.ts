import { describe, expect, it } from "vitest";
import {
  buildMonthlyDiagnosticsExport,
  deriveCompletedPreviousUtcMonth,
  MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT,
  MONTHLY_DIAGNOSTICS_AUTH_HEADERS,
  MONTHLY_DIAGNOSTICS_CONSENT_HEADERS,
  type MonthlyDiagnosticsAuthRow,
} from "./monthlyDiagnosticsExport";

function authRow(
  id: number,
  checkedAt: number,
  failureCode: string | null = null,
  triggerSource = "scheduled"
): MonthlyDiagnosticsAuthRow {
  return {
    id,
    checkedAt,
    triggerSource,
    overallStatus: "ok",
    configStatus: "ok",
    databaseStatus: "ok",
    userSchemaStatus: "ok",
    magicLinkSchemaStatus: "ok",
    sessionStatus: "ok",
    emailProviderStatus: "ok",
    failureCode,
    durationMs: 17,
  };
}

describe("monthly diagnostics export", () => {
  it("derives the completed previous UTC month with half-open boundaries", () => {
    expect(
      deriveCompletedPreviousUtcMonth(Date.parse("2026-01-15T12:30:00.000Z"))
    ).toEqual({
      reportMonthKey: "2025-12",
      periodStartMs: Date.parse("2025-12-01T00:00:00.000Z"),
      periodEndExclusiveMs: Date.parse("2026-01-01T00:00:00.000Z"),
      snapshotGeneratedAtMs: Date.parse("2026-01-15T12:30:00.000Z"),
    });
  });

  it("emits exactly two bounded aggregate-only attachments with stable headers", () => {
    const snapshot = Date.parse("2026-09-01T08:10:00.000Z");
    const start = Date.parse("2026-08-01T00:00:00.000Z");
    const end = Date.parse("2026-09-01T00:00:00.000Z");
    const result = buildMonthlyDiagnosticsExport({
      snapshotGeneratedAtMs: snapshot,
      consent: {
        savedContactsTotal: 8,
        explicitConsentTotal: 3,
        optedOutTotal: 2,
      },
      authRows: [
        authRow(2, end),
        authRow(3, start + 2_000, "=unsafe"),
        authRow(1, start, null),
        authRow(4, start + 1_000, "manual", "manual"),
        authRow(0, start - 1),
      ],
      authTotalMatching: 2,
    });

    expect(result.attachments).toHaveLength(2);
    expect(result.window.reportMonthKey).toBe("2026-08");
    expect(MONTHLY_DIAGNOSTICS_CONSENT_HEADERS).toEqual([
      "report_month_utc",
      "snapshot_generated_at_utc",
      "saved_contacts_total",
      "explicit_consent_total",
      "without_explicit_consent_total",
      "opted_out_total",
      "explicit_consent_percent",
    ]);
    expect(MONTHLY_DIAGNOSTICS_AUTH_HEADERS).toEqual([
      "checked_at_utc",
      "trigger_source",
      "overall_status",
      "config_status",
      "database_status",
      "user_schema_status",
      "magic_link_schema_status",
      "session_status",
      "email_provider_status",
      "failure_code",
      "duration_ms",
    ]);
    expect(result.attachments[0].content).toContain(
      "2026-08,2026-09-01T08:10:00.000Z,8,3,5,2,37.50"
    );
    const authLines = result.attachments[1].content.trim().split("\r\n");
    expect(authLines).toHaveLength(3);
    expect(authLines[1]).toContain("2026-08-01T00:00:02.000Z");
    expect(authLines[1]).toContain("'=unsafe");
    expect(authLines[2]).toContain("2026-08-01T00:00:00.000Z");
    expect(result.metadata.auth).toMatchObject({
      totalMatching: 2,
      exportedRows: 2,
      truncated: false,
    });
    expect(
      result.attachments.every(item => item.byteLength <= 1024 * 1024)
    ).toBe(true);
  });

  it("enforces the one-MiB byte limit and discloses truncation", () => {
    const start = Date.parse("2026-08-01T00:00:00.000Z");
    const rows = Array.from({ length: 5_000 }, (_, index) =>
      authRow(index + 1, start + index, `=${"x".repeat(63)}`)
    );
    const result = buildMonthlyDiagnosticsExport({
      snapshotGeneratedAtMs: Date.parse("2026-09-01T08:10:00.000Z"),
      consent: {
        savedContactsTotal: 0,
        explicitConsentTotal: 0,
        optedOutTotal: 0,
      },
      authRows: rows,
      authTotalMatching: 5_001,
    });
    expect(result.attachments[1].byteLength).toBeLessThanOrEqual(
      MONTHLY_DIAGNOSTICS_ATTACHMENT_BYTE_LIMIT
    );
    expect(result.metadata.auth.truncated).toBe(true);
    expect(result.metadata.auth.totalMatching).toBe(5_001);
  });

  it("does not expose contact, tenant, provider, task, or raw-detail fields", () => {
    const result = buildMonthlyDiagnosticsExport({
      snapshotGeneratedAtMs: Date.parse("2026-09-01T08:10:00.000Z"),
      consent: {
        savedContactsTotal: 1,
        explicitConsentTotal: 1,
        optedOutTotal: 0,
      },
      authRows: [authRow(7, Date.parse("2026-08-15T12:00:00.000Z"))],
      authTotalMatching: 1,
    });
    const combined = result.attachments.map(item => item.content).join("\n");
    for (const forbidden of [
      "user_id",
      "contact_id",
      "email_address",
      "recipient_email",
      "email_masked",
      "phone",
      "consent_source",
      "consent_text",
      "consent_hash",
      "consent_version",
      "provider_name",
      "failure_detail",
      "schedule_cron_task_uid",
      "record_id",
    ]) {
      expect(combined.toLowerCase()).not.toContain(forbidden);
    }
  });
});
