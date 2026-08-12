import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const sitemapPath = "/tmp/getphame-production-routes.txt";
const outputPath = "/tmp/getphame-production-route-audit.json";
const routes = (await readFile(sitemapPath, "utf8"))
  .split("\n")
  .map(route => route.trim())
  .filter(Boolean);

const browser = await chromium.launch({ headless: true });
const findings = [];

for (const url of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" });
  });

  let status = null;
  let navigationError = null;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    status = response?.status() ?? null;
    await page
      .waitForFunction(() => document.querySelector("#root")?.children.length > 0, { timeout: 15_000 })
      .catch(() => undefined);
    await page.waitForTimeout(500);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const rendered = navigationError
    ? { hasRoot: false, textLength: 0, title: "" }
    : await page.evaluate(() => ({
        hasRoot: Boolean(document.querySelector("#root")),
        rootChildCount: document.querySelector("#root")?.children.length ?? 0,
        textLength: document.body.innerText.trim().length,
        title: document.title,
      }));

  const externalCspWarnings = consoleErrors.filter(message =>
    message.includes("static.cloudflareinsights.com") && message.includes("Content Security Policy")
  );
  const renderingErrors = consoleErrors.filter(message => !externalCspWarnings.includes(message));

  findings.push({
    url,
    status,
    navigationError,
    rendered,
    consoleErrors: renderingErrors,
    externalCspWarnings,
    pageErrors,
    failedRequests,
  });
  await page.close();
}

await browser.close();
await writeFile(outputPath, `${JSON.stringify(findings, null, 2)}\n`);

const failures = findings.filter(finding =>
  finding.navigationError ||
  (finding.status !== null && finding.status >= 400) ||
  finding.pageErrors.length > 0 ||
  finding.consoleErrors.length > 0 ||
  finding.rendered.textLength === 0
);

console.log(JSON.stringify({ auditedRoutes: routes.length, failureCount: failures.length, outputPath }, null, 2));
if (failures.length > 0) process.exitCode = 1;
