import { describe, expect, it } from "vitest";
import { readProjectFile } from "./testProjectFile";
describe("GitHub Actions automation", () => {
  it("enables auto-merge only for trusted Dependabot GitHub Actions patches", () => {
    const workflow = readProjectFile(
      "../.github/workflows/dependabot-actions-automerge.yml"
    );
    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).toContain("github.actor == 'dependabot[bot]'");
    expect(workflow).toContain(
      "github.event.pull_request.user.login == 'dependabot[bot]'"
    );
    expect(workflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository"
    );
    expect(workflow).toContain("github_actions");
    expect(workflow).toContain("github-actions-patches");
    expect(workflow).toContain("version-update:semver-patch");
    expect(workflow).toContain("maintainer-changes");
    expect(workflow).toContain(
      "dependabot/fetch-metadata@25dd0e34f4fe68f24cc83900b1fe3fe149efef98"
    );
    expect(workflow).toContain('gh pr merge --auto --merge "$PR_URL"');
    expect(workflow).not.toContain("actions/checkout");
  });
  it("runs a bounded read-only workflow drift audit every month and on demand", () => {
    const workflow = readProjectFile(
      "../.github/workflows/workflow-drift-audit.yml"
    );
    expect(workflow).toContain('cron: "17 9 1 * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain(`permissions:
  contents: read`);
    expect(workflow).toContain("group: monthly-workflow-drift-audit");
    expect(workflow).toContain("cancel-in-progress: false");
    expect(workflow).toContain("timeout-minutes: 8");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("actions/setup-node@v7");
    expect(workflow).toContain("node-version: 24");
    expect(workflow).toContain("node scripts/audit-github-actions.mjs");
    expect(workflow).toContain("gh api graphql");
    expect(workflow).toContain("autoMergeAllowed");
    expect(workflow).not.toContain(".allow_auto_merge");
    expect(workflow).toContain("docker://rhysd/actionlint:1.7.12");
    expect(workflow).toContain("publish-result:");
    expect(workflow).toContain("needs: audit");
    expect(workflow).toContain("always() && needs.audit.result != 'skipped'");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain('kind: "drift_audit"');
    expect(workflow).toContain("failureCode:");
    expect(workflow).toContain("failureSummary:");
    expect(workflow).toContain("https://getphame.app/api/automation/events");
    expect(workflow).toContain(
      "scripts/publish-oidc-automation-event.sh /tmp/automation-event.json"
    );
    expect(workflow).not.toMatch(
      /secrets\.[A-Z0-9_]*(GITHUB|TOKEN|AUTOMATION)/
    );
  });

  it("publishes only merged Dependabot GitHub Actions outcomes through OIDC", () => {
    const workflow = readProjectFile(
      "../.github/workflows/dependabot-merge-observability.yml"
    );
    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target:");
    expect(workflow).toContain("contents: read");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("github.event.pull_request.merged == true");
    expect(workflow).toContain(
      "github.event.pull_request.user.login == 'dependabot[bot]'"
    );
    expect(workflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository"
    );
    expect(workflow).toContain(
      "github.event.pull_request.base.ref == github.event.repository.default_branch"
    );
    expect(workflow).toContain(
      "startsWith(github.event.pull_request.head.ref, 'dependabot/github_actions/')"
    );
    expect(workflow).toContain('kind: "dependabot_merge"');
    expect(workflow).toContain("https://getphame.app/api/automation/events");
    expect(workflow).not.toMatch(
      /secrets\.[A-Z0-9_]*(GITHUB|TOKEN|AUTOMATION)/
    );
  });

  it("requests and delivers a short-lived OIDC token without argument exposure", () => {
    const publisher = readProjectFile(
      "../scripts/publish-oidc-automation-event.sh"
    );
    expect(publisher).toContain("ACTIONS_ID_TOKEN_REQUEST_URL");
    expect(publisher).toContain("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
    expect(publisher).toContain("audience=${encoded_audience}");
    expect(publisher).toContain('process.stdin.setEncoding("utf8")');
    expect(publisher).toContain("--max-time 15");
    expect(publisher).toContain("--max-time 20");
    expect(publisher).toContain("--retry 3");
    expect(publisher).toContain('--data-binary "@${body_file}"');
    expect(publisher).toContain(
      '--header "Authorization: Bearer ${oidc_token}"'
    );
    expect(publisher).toContain("body_bytes > 16384");
    expect(publisher).not.toContain("process.argv[2]");
  });
  it("routes CI configuration ownership without requiring owner approval", () => {
    const codeowners = readProjectFile("../.github/CODEOWNERS");
    expect(codeowners).toContain("/.github/workflows/ @SteveKinzey");
    expect(codeowners).toContain("/.github/dependabot.yml @SteveKinzey");
    expect(codeowners).toContain(
      "/scripts/audit-github-actions.mjs @SteveKinzey"
    );
    expect(codeowners).toContain("/.github/CODEOWNERS @SteveKinzey");
  });
  it("audits current Node action majors, permissions, concurrency, and ownership", () => {
    const script = readProjectFile("../scripts/audit-github-actions.mjs");
    expect(script).toContain('["actions/checkout", 7]');
    expect(script).toContain('["actions/setup-node", 7]');
    expect(script).toContain('["actions/upload-artifact", 6]');
    expect(script).toContain('["slackapi/slack-github-action", 4]');
    expect(script).toContain("missing top-level permissions");
    expect(script).toContain("missing concurrency control");
    expect(script).toContain("missing bounded job timeout");
    expect(script).toContain("floating action reference");
    expect(script).toContain("deprecated pnpm setup action");
    expect(script).toContain("patch-only GitHub Actions group");
    expect(script).toContain("workflow directory has no owner");
    expect(script).toContain(
      "repository auto-merge check must use GraphQL autoMergeAllowed"
    );
    expect(script).toContain(
      "REST allow_auto_merge is not reliable with the read-only workflow token"
    );
  });
});
