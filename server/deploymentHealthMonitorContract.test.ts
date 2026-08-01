import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("canonical production health monitor", () => {
  it("probes the public Get Phame health contract while preserving incident safeguards", () => {
    const workflow = fs.readFileSync(
      path.resolve(import.meta.dirname, "../.github/workflows/api-health-monitor.yml"),
      "utf8"
    );

    expect(workflow).toContain("HEALTH_URL: https://getphame.app/api/health");
    expect(workflow).not.toContain("revrocket-j5ynazte.manus.space");
    expect(workflow).toContain('FAILURE_THRESHOLD: "2"');
    expect(workflow).toContain('jq -e \'.ok == true and .status == "ready"\'');
    expect(workflow).toContain("INCIDENT_LABEL");
  });
});
