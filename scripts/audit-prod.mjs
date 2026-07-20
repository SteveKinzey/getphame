import { spawnSync } from "node:child_process";

const OSV_QUERY_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const MAX_BATCH_SIZE = 1_000;
const MAX_ATTEMPTS = 3;

function listProductionPackages() {
  const result = spawnSync(
    "pnpm",
    ["list", "--prod", "--json", "--depth", "Infinity"],
    { encoding: "utf8", maxBuffer: 100 * 1024 * 1024 },
  );

  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr.trim();
    throw new Error(
      `Unable to enumerate production dependencies.${detail ? ` ${detail}` : ""}`,
    );
  }

  const roots = JSON.parse(result.stdout);
  const packages = new Map();

  const visit = (node, nameHint) => {
    if (!node || typeof node !== "object") return;

    if (
      typeof nameHint === "string" &&
      typeof node.version === "string" &&
      /^\d/.test(node.version)
    ) {
      packages.set(`${nameHint}@${node.version}`, {
        package: { ecosystem: "npm", name: nameHint },
        version: node.version,
      });
    }

    if (node.dependencies && typeof node.dependencies === "object") {
      for (const [dependencyName, dependency] of Object.entries(
        node.dependencies,
      )) {
        visit(dependency, dependencyName);
      }
    }
  };

  for (const root of roots) visit(root);
  return [...packages.values()];
}

async function wait(milliseconds) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function queryOsv(queries) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(OSV_QUERY_BATCH_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queries }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`OSV returned HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(attempt * 1_000);
    }
  }

  throw new Error(
    `The OSV dependency audit could not complete after ${MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function main() {
  const packages = listProductionPackages();
  const findings = [];

  for (let offset = 0; offset < packages.length; offset += MAX_BATCH_SIZE) {
    const batch = packages.slice(offset, offset + MAX_BATCH_SIZE);
    const payload = await queryOsv(batch);

    payload.results?.forEach((result, index) => {
      for (const vulnerability of result.vulns ?? []) {
        findings.push({
          dependency: `${batch[index].package.name}@${batch[index].version}`,
          id: vulnerability.id,
          summary: vulnerability.summary ?? "Known security advisory",
        });
      }
    });
  }

  if (findings.length > 0) {
    console.error("Production dependency audit failed. OSV reported:");
    for (const finding of findings) {
      console.error(`- ${finding.dependency}: ${finding.id} — ${finding.summary}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Production dependency audit passed: ${packages.length} unique npm package versions checked against OSV.`,
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
