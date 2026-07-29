import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { SavedContact } from "../drizzle/schema";
import {
  CONTACT_EXPORT_COLUMNS,
  CONTACT_PDF_EXPORT_LIMIT,
  buildContactExportSnapshot,
  neutralizeSpreadsheetFormula,
  serializeContactExportCsv,
  toContactExportRow,
} from "./contactExport";

function contact(overrides: Partial<SavedContact> = {}): SavedContact {
  return {
    id: 1,
    userId: 10,
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    notes: "Never exported",
    lastSentAt: null,
    totalSent: 0,
    tags: null,
    source: "manual",
    externalId: "private-external-reference",
    sourceApp: "Private source app",
    importedViaApiKeyId: 88,
    consentBasis: null,
    consentCapturedAt: null,
    consentSource: "Private consent source",
    optedOut: 0,
    optedOutAt: null,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    ...overrides,
  };
}

describe("contact CSV and PDF export snapshot", () => {
  it("uses a fixed allowlist and neutralizes spreadsheet formulas before serialization", () => {
    expect(CONTACT_EXPORT_COLUMNS).toEqual([
      "name", "email", "phone", "tags", "source", "consentStatus", "consentBasis",
      "consentCapturedAt", "totalSent", "lastSentAt", "suppressionStatus", "createdAt",
    ]);
    expect(neutralizeSpreadsheetFormula("  =SUM(1,1)")).toBe("'  =SUM(1,1)");

    const row = toContactExportRow(contact({
      name: "=HYPERLINK(\"https://example.com\")",
      email: "+victim@example.com",
      phone: "-1+2",
      tags: JSON.stringify(["@vip", "normal"]),
      consentBasis: "=checkbox",
      consentCapturedAt: Date.UTC(2026, 0, 2),
    }));
    const csv = serializeContactExportCsv([row]);

    expect(row.name).toBe("'=HYPERLINK(\"https://example.com\")");
    expect(row.email).toBe("'+victim@example.com");
    expect(row.phone).toBe("'-1+2");
    expect(row.tags).toBe("'@vip; normal");
    expect(row.consentBasis).toBe("'=checkbox");
    expect(csv.startsWith("\uFEFFName,Email,Phone,Tags,Source")).toBe(true);
    expect(csv).not.toContain("private-external-reference");
    expect(csv).not.toContain("Never exported");
  });

  it("exports only requested contacts present in the authenticated user's supplied dataset", () => {
    const snapshot = buildContactExportSnapshot({
      contacts: [contact({ id: 1, name: "Owned one" }), contact({ id: 2, name: "Owned two", createdAt: new Date("2026-01-05T00:00:00.000Z") })],
      requestedIds: [2, 2, 999_999],
      format: "csv",
      now: new Date("2026-07-28T00:00:00.000Z"),
    });

    expect(snapshot.requestedCount).toBe(2);
    expect(snapshot.authorizedCount).toBe(1);
    expect(snapshot.exportedCount).toBe(1);
    expect(snapshot.rows.map((row) => row.name)).toEqual(["Owned two"]);
    expect(snapshot.filename).toBe("get-phame-contacts-2026-01-05_to_2026-01-05.csv");
    expect(snapshot.csv).toContain("Owned two");
    expect(snapshot.csv).not.toContain("Owned one");
  });

  it("caps PDF snapshots and never duplicates CSV content in the PDF response", () => {
    const contacts = Array.from({ length: CONTACT_PDF_EXPORT_LIMIT + 1 }, (_, index) => contact({ id: index + 1 }));
    const snapshot = buildContactExportSnapshot({
      contacts,
      requestedIds: contacts.map((item) => item.id),
      format: "pdf",
    });

    expect(snapshot.authorizedCount).toBe(CONTACT_PDF_EXPORT_LIMIT + 1);
    expect(snapshot.exportedCount).toBe(CONTACT_PDF_EXPORT_LIMIT);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.rows).toHaveLength(CONTACT_PDF_EXPORT_LIMIT);
    expect(snapshot.csv).toBeNull();
    expect(snapshot.filename.endsWith(".pdf")).toBe(true);
  });

  it("keeps both protected procedures behind the authenticated user's contact list", () => {
    const routers = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
    const contactBlock = routers.slice(routers.indexOf("contacts: router({"), routers.indexOf("getDailyStatus:", routers.indexOf("contacts: router({")));

    expect(contactBlock).toContain("naturalSearch: protectedProcedure");
    expect(contactBlock).toContain("prepareExport: protectedProcedure");
    expect(contactBlock.match(/listSavedContacts\(ctx\.user\.id\)/g)).toHaveLength(3);
    expect(contactBlock).toContain("contactIds: z.array(z.number().int().positive()).min(1).max(CONTACT_CSV_EXPORT_LIMIT)");
  });
});
