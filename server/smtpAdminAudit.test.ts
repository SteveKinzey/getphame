import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSmtpAuditCsv, buildSmtpAuditCsvFilename } from "./smtpAdminAudit";

describe("administrator SMTP audit export", () => {
  it("exports every supplied matching row with stable columns, a BOM, and spreadsheet-safe cells", () => {
    const csv = buildSmtpAuditCsv([
      {
        occurredAt: Date.parse("2026-07-15T10:00:00.000Z"),
        actorName: "Owner Admin",
        actorEmail: "owner@getphame.app",
        targetName: "First Account",
        targetEmail: "first@example.test",
        smtpUser: "smtp-first@example.test",
        action: "smtp_credentials_removed",
        outcome: "removed",
      },
      {
        occurredAt: Date.parse("2026-07-15T11:00:00.000Z"),
        actorName: '=IMPORTXML("https://bad.test")',
        actorEmail: "admin@example.test",
        targetName: "Second Account",
        targetEmail: "second@example.test",
        smtpUser: "smtp-second@example.test",
        action: "smtp_credentials_removed",
        outcome: "removed",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv).toContain(
      '"Occurred at","Administrator","Administrator email","Target account","Target email","SMTP user","Action","Outcome"'
    );
    expect(csv).toContain('"First Account"');
    expect(csv).toContain('"Second Account"');
    expect(csv).toContain('"\'=IMPORTXML(""https://bad.test"")"');
    expect(csv).not.toContain("credentialId");
    expect(csv).not.toContain("encryptedPass");
  });

  it("uses one shared filter builder for paginated listing and complete export", () => {
    const routerSource = fs.readFileSync(
      path.join(process.cwd(), "server/routers.ts"),
      "utf8"
    );
    expect(routerSource.match(/buildSmtpAuditWhere\(input\)/g)).toHaveLength(2);
    expect(routerSource).toContain("exportSmtpAuditLogs: adminProcedure");
    expect(routerSource).toContain("buildSmtpAuditCsv(entries)");
    expect(routerSource).toContain("total: entries.length");
  });

  it("creates a stable dated filename", () => {
    expect(
      buildSmtpAuditCsvFilename(new Date("2026-07-15T23:59:59.000Z"))
    ).toBe("getphame-smtp-removal-audit-2026-07-15.csv");
  });
});
