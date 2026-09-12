import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(
  resolve(import.meta.dirname, "routers.ts"),
  "utf8"
);
const schemaSource = readFileSync(
  resolve(import.meta.dirname, "../drizzle/schema.ts"),
  "utf8"
);

describe("administrator release operations", () => {
  it("keeps release history, retention, and renderer trends behind administrator procedures", () => {
    for (const name of [
      "listReleaseParityRecords",
      "prepareReleaseParityExport",
      "getAuditRetentionPolicy",
      "updateAuditRetentionPolicy",
      "rendererFailureTrend",
    ]) {
      expect(routerSource).toMatch(new RegExp(`${name}: adminProcedure`));
    }
  });

  it("bounds export, trend, and retention inputs while keeping stored policies privacy-minimized", () => {
    expect(routerSource).toContain("const AUDIT_RETENTION_MIN_DAYS = 7");
    expect(routerSource).toContain("const AUDIT_RETENTION_MAX_DAYS = 3650");
    expect(routerSource).toContain("RELEASE_HISTORY_EXPORT_LIMIT");
    expect(routerSource).toContain(".limit(250)");
    expect(schemaSource).toContain("audit_retention_policies");
    expect(schemaSource).not.toContain("raw_renderer_error");
  });
});
