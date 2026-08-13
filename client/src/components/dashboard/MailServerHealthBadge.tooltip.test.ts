import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("MailServerHealthBadge detail tooltip", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/dashboard/MailServerHealthBadge.tsx"), "utf8");

  it("offers accessible tooltip explanations for every tenant-scoped health state", () => {
    expect(source).toContain("<Tooltip>");
    expect(source).toContain("healthyTooltip");
    expect(source).toContain("attentionTooltip");
    expect(source).toContain("disconnectedTooltip");
    expect(source).toContain("bulkActiveTooltip");
    expect(source).toContain("dashboard.mailHealth.details");
  });
});
