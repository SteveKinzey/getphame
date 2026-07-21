import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const workflowPath = fileURLToPath(
  new URL("../.github/workflows/api-health-monitor.yml", import.meta.url)
);

const readWorkflow = () => readFileSync(workflowPath, "utf8");

describe("API health monitor workflow", () => {
  it("uses a bounded independent schedule, probe, and least-privilege permissions", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('- cron: "3-58/5 * * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("timeout-minutes: 3");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("issues: write");
    expect(workflow).toContain("connect-timeout 7");
    expect(workflow).toContain("max-time 15");
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("validates only the non-sensitive ready contract and never records the response body", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      'jq -e \'.ok == true and .status == "ready"\' "$response_file"'
    );
    expect(workflow).toContain('rm -f "$response_file"');
    expect(workflow).toContain("No response body is recorded by this monitor.");
    expect(workflow).not.toContain('cat "$response_file"');
  });

  it("persists consecutive failures and waits for the configured threshold", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain("STATE_LABEL: monitor:api-health-state");
    expect(workflow).toContain('FAILURE_THRESHOLD: "2"');
    expect(workflow).toContain(
      'gh issue list --state all --label "$STATE_LABEL" --limit 1'
    );
    expect(workflow).toContain("failures=0 updated=$now");
    expect(workflow).toContain("failure_count=$((previous_failures + 1))");
    expect(workflow).toContain(
      'if [ "$failure_count" -lt "$FAILURE_THRESHOLD" ]; then'
    );
    expect(workflow).toContain(
      "Threshold not reached; no incident notification created."
    );
  });

  it("creates at most one open incident while an outage persists", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain(
      'gh issue list --state open --label "$INCIDENT_LABEL" --limit 1'
    );
    expect(workflow).toContain('if [ -z "$incident_number" ]; then');
    expect(workflow).toContain(
      'title "Incident: Get Phame API health check is failing"'
    );
    expect(workflow).toContain(
      "An incident issue is already open; leaving it deduplicated."
    );
  });

  it("resets durable state and closes the open incident only after recovery", () => {
    const workflow = readWorkflow();
    const healthyBranch = workflow.slice(
      workflow.indexOf('if [ "$healthy" = true ]; then'),
      workflow.indexOf("failure_count=$((previous_failures + 1))")
    );

    expect(healthyBranch).toContain("failures=0 updated=$now");
    expect(healthyBranch).toContain('if [ -n "$incident_number" ]; then');
    expect(healthyBranch).toContain(
      'gh issue comment "$incident_number" --body "Recovered at $now.'
    );
    expect(healthyBranch).toContain(
      'gh issue close "$incident_number" --reason completed'
    );
    expect(healthyBranch).toContain("exit 0");
  });
});
