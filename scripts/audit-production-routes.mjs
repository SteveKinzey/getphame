import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const sitemapPath =
  process.env.ROUTE_AUDIT_SITEMAP_PATH ?? "/tmp/getphame-production-routes.txt";
const outputPath =
  process.env.ROUTE_AUDIT_OUTPUT_PATH ??
  "/tmp/getphame-production-route-audit.json";
let routes;
try {
  routes = (await readFile(sitemapPath, "utf8"))
    .split("\n")
    .map(route => route.trim())
    .filter(Boolean);
} catch (error) {
  console.error(
    `Unable to read route list at ${sitemapPath}: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

if (routes.length === 0) {
  console.error(`No production routes were found in ${sitemapPath}.`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.ROUTE_AUDIT_CHROMIUM_PATH || undefined,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const findings = [];

for (const url of routes) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const failedResponses = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", response => {
    try {
      if (
        response.status() >= 400 &&
        new URL(response.url()).origin === new URL(url).origin
      ) {
        failedResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    } catch {
      // Ignore malformed response URLs in diagnostics.
    }
  });

  let status = null;
  let navigationError = null;
  let navigationAttempts = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    navigationAttempts = attempt;
    consoleErrors.length = 0;
    pageErrors.length = 0;
    failedRequests.length = 0;
    failedResponses.length = 0;
    try {
      const response = await page.goto(url, {
        waitUntil: "commit",
        timeout: 45_000,
      });
      status = response?.status() ?? null;
      await page
        .waitForLoadState("domcontentloaded", { timeout: 15_000 })
        .catch(() => undefined);
      await page
        .waitForFunction(
          () => document.querySelector("#root")?.children.length > 0,
          { timeout: 15_000 }
        )
        .catch(() => undefined);
      await page.waitForTimeout(500);
      navigationError = null;
      break;
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
      if (attempt < 3) await page.waitForTimeout(1_000);
    }
  }

  let evaluationError = null;
  let rendered = {
    hasRoot: false,
    rootChildCount: 0,
    textLength: 0,
    title: "",
  };
  if (!navigationError) {
    try {
      rendered = await page.evaluate(() => ({
        hasRoot: Boolean(document.querySelector("#root")),
        rootChildCount: document.querySelector("#root")?.children.length ?? 0,
        textLength: document.body.innerText.trim().length,
        title: document.title,
      }));
    } catch (error) {
      evaluationError = error instanceof Error ? error.message : String(error);
    }
  }

  const externalCspWarnings = consoleErrors.filter(
    message =>
      message.includes("static.cloudflareinsights.com") &&
      message.includes("Content Security Policy")
  );
  const renderingErrors = consoleErrors.filter(
    message => !externalCspWarnings.includes(message)
  );

  findings.push({
    url,
    status,
    navigationError,
    navigationAttempts,
    evaluationError,
    rendered,
    consoleErrors: renderingErrors,
    externalCspWarnings,
    pageErrors,
    failedRequests,
    failedResponses,
  });
  await page.close();
}

await browser.close();
await writeFile(outputPath, `${JSON.stringify(findings, null, 2)}\n`);

const failures = findings.filter(
  finding =>
    finding.navigationError ||
    finding.evaluationError ||
    (finding.status !== null && finding.status >= 400) ||
    finding.pageErrors.length > 0 ||
    finding.consoleErrors.length > 0 ||
    finding.rendered.textLength === 0
);

console.log(
  JSON.stringify(
    { auditedRoutes: routes.length, failureCount: failures.length, outputPath },
    null,
    2
  )
);
if (failures.length > 0) process.exitCode = 1;
