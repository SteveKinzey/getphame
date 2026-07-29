import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowDirectory = join(repositoryRoot, ".github", "workflows");
const failures = [];
const workflowFiles = readdirSync(workflowDirectory)
  .filter(name => name.endsWith(".yml") || name.endsWith(".yaml"))
  .sort();
const minimumMajors = new Map([
  ["actions/checkout", 7],
  ["actions/setup-node", 7],
  ["actions/upload-artifact", 6],
  ["actions/download-artifact", 6],
  ["slackapi/slack-github-action", 4],
]);
for (const name of workflowFiles) {
  const path = join(workflowDirectory, name);
  const source = readFileSync(path, "utf8");
  if (!/^permissions:\s*$/m.test(source))
    failures.push(`${name}: missing top-level permissions`);
  if (!/^concurrency:\s*$/m.test(source))
    failures.push(`${name}: missing concurrency control`);
  if (!/^\s+timeout-minutes:\s*\d+\s*$/m.test(source))
    failures.push(`${name}: missing bounded job timeout`);
  if (/^\s*permissions:\s*write-all\s*$/m.test(source))
    failures.push(`${name}: write-all permission is forbidden`);
  if (/^\s*uses:\s*pnpm\/action-setup@/m.test(source))
    failures.push(`${name}: deprecated pnpm setup action`);
  for (const match of source.matchAll(
    /^\s*uses:\s*([^\s#]+)(?:\s+#\s*(\S+))?\s*$/gm
  )) {
    const [, use, annotation = ""] = match;
    if (use.startsWith("./") || use.startsWith("docker://")) continue;
    const separator = use.lastIndexOf("@");
    if (separator < 1) {
      failures.push(`${name}: action reference has no version: ${use}`);
      continue;
    }
    const action = use.slice(0, separator);
    const reference = use.slice(separator + 1);
    if (["main", "master", "latest"].includes(reference)) {
      failures.push(`${name}: floating action reference: ${use}`);
    }
    const minimum = minimumMajors.get(action);
    if (!minimum) continue;
    const taggedMajor = /^v(\d+)(?:$|\.)/.exec(reference)?.[1];
    const annotatedMajor = /^v(\d+)(?:$|\.)/.exec(annotation)?.[1];
    const major = taggedMajor ?? annotatedMajor;
    if (!major) {
      failures.push(
        `${name}: ${action} has no auditable major-version annotation`
      );
    } else if (Number(major) < minimum) {
      failures.push(`${name}: ${action}@${reference} is below v${minimum}`);
    }
  }
}
const driftWorkflow = readFileSync(
  join(workflowDirectory, "workflow-drift-audit.yml"),
  "utf8"
);
if (
  !driftWorkflow.includes("gh api graphql") ||
  !driftWorkflow.includes("autoMergeAllowed")
) {
  failures.push(
    "workflow-drift-audit.yml: repository auto-merge check must use GraphQL autoMergeAllowed"
  );
}
if (driftWorkflow.includes(".allow_auto_merge")) {
  failures.push(
    "workflow-drift-audit.yml: REST allow_auto_merge is not reliable with the read-only workflow token"
  );
}
const dependabot = readFileSync(
  join(repositoryRoot, ".github", "dependabot.yml"),
  "utf8"
);
const actionEntries =
  dependabot.match(/package-ecosystem:\s*["']github-actions["']/g) ?? [];
if (actionEntries.length !== 1) {
  failures.push(
    `dependabot.yml: expected one github-actions entry, found ${actionEntries.length}`
  );
}
if (
  !/github-actions-patches:[\s\S]*?update-types:[\s\S]*?-\s*["']patch["']/.test(
    dependabot
  )
) {
  failures.push("dependabot.yml: missing the patch-only GitHub Actions group");
}
const codeowners = readFileSync(
  join(repositoryRoot, ".github", "CODEOWNERS"),
  "utf8"
);
if (!/^\/\.github\/workflows\/\s+@\S+/m.test(codeowners))
  failures.push("CODEOWNERS: workflow directory has no owner");
if (!/^\/\.github\/CODEOWNERS\s+@\S+/m.test(codeowners))
  failures.push("CODEOWNERS: ownership file does not own itself");
if (failures.length > 0) {
  console.error("GitHub Actions configuration drift detected:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  `Workflow drift audit passed for ${workflowFiles.length} workflow files.`
);
