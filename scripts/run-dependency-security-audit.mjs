import { spawnSync } from "node:child_process";
import fs from "node:fs";

const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_COUNT = 1_000_000;
const EMPTY_SEVERITIES = {
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
  dependencyCount: 0,
};

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT_BYTES,
    shell: false,
  });
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout || "",
    errored: Boolean(result.error),
  };
}

function asBoundedCount(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT
    ? value
    : null;
}

function parseAudit(result) {
  if (!result.stdout.trim()) return null;
  try {
    const payload = JSON.parse(result.stdout);
    const vulnerabilities = payload?.metadata?.vulnerabilities;
    const dependencies = payload?.metadata?.totalDependencies;
    if (!vulnerabilities || typeof vulnerabilities !== "object") return null;

    const parsed = {
      info: asBoundedCount(vulnerabilities.info),
      low: asBoundedCount(vulnerabilities.low),
      moderate: asBoundedCount(vulnerabilities.moderate),
      high: asBoundedCount(vulnerabilities.high),
      critical: asBoundedCount(vulnerabilities.critical),
      dependencyCount: asBoundedCount(dependencies),
    };
    return Object.values(parsed).every(value => value !== null) ? parsed : null;
  } catch {
    return null;
  }
}

function totalFindings(summary) {
  return (
    summary.info +
    summary.low +
    summary.moderate +
    summary.high +
    summary.critical
  );
}

function writeEvent(outputPath, event) {
  fs.writeFileSync(outputPath, `${JSON.stringify(event)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

const outputPath = process.argv[2];
if (!outputPath) {
  console.error(
    "Usage: node scripts/run-dependency-security-audit.mjs <output-path>"
  );
  process.exit(2);
}

const startedAt = Date.now();
const installation = run("pnpm", ["install", "--frozen-lockfile"]);
const productionAudit =
  installation.exitCode === 0 && !installation.errored
    ? run("pnpm", ["audit", "--prod", "--json"])
    : null;
const fullAudit =
  installation.exitCode === 0 && !installation.errored
    ? run("pnpm", ["audit", "--json"])
    : null;
const production = productionAudit ? parseAudit(productionAudit) : null;
const full = fullAudit ? parseAudit(fullAudit) : null;
const tests =
  installation.exitCode === 0 && !installation.errored
    ? run("pnpm", ["test"])
    : null;
const durationMs = Math.max(0, Date.now() - startedAt);

let outcome = "clean";
let failureCode;
let failureSummary;

if (installation.exitCode !== 0 || installation.errored) {
  outcome = "failed";
  failureCode = "audit_execution_failed";
  failureSummary =
    "Locked dependency installation did not complete. Review the linked GitHub Actions run.";
} else if (!production || !full) {
  outcome = "failed";
  failureCode =
    productionAudit?.errored || fullAudit?.errored
      ? "audit_execution_failed"
      : "audit_output_invalid";
  failureSummary =
    "The dependency audit did not produce a valid summary. Review the linked GitHub Actions run.";
} else if (!tests || tests.exitCode !== 0 || tests.errored) {
  outcome = "failed";
  failureCode = "test_failed";
  failureSummary =
    "The test suite did not complete successfully. Review the linked GitHub Actions run.";
} else if (totalFindings(production) > 0 || totalFindings(full) > 0) {
  outcome = "attention";
}

const event = {
  outcome,
  eventAt: Date.now(),
  durationMs,
  production: production ?? EMPTY_SEVERITIES,
  full: full ?? EMPTY_SEVERITIES,
  updatedPackageCount: 0,
  testStatus:
    tests && tests.exitCode === 0 && !tests.errored ? "passed" : "not_run",
  buildStatus: "not_run",
  ...(failureCode ? { failureCode, failureSummary } : {}),
};

writeEvent(outputPath, event);
console.log(
  JSON.stringify({
    outcome: event.outcome,
    productionFindings: totalFindings(event.production),
    fullFindings: totalFindings(event.full),
    testStatus: event.testStatus,
  })
);
