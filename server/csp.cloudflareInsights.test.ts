import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverEntryPath = fileURLToPath(
  new URL("./_core/index.ts", import.meta.url)
);
const serverEntry = readFileSync(serverEntryPath, "utf8");

describe("production Content Security Policy", () => {
  it("permits Cloudflare's automatically injected Web Analytics script without widening beacon connections", () => {
    const cspDirectiveBlock = serverEntry.match(
      /defaultSrc:\s*\[[\s\S]*?scriptSrcAttr:\s*\[[^\]]*\]/
    )?.[0];
    const scriptSrc = cspDirectiveBlock?.match(
      /scriptSrc:\s*\[([^\]]*)\]/
    )?.[1];
    const connectSrc = cspDirectiveBlock?.match(
      /connectSrc:\s*\[([^\]]*)\]/
    )?.[1];

    expect(cspDirectiveBlock).toBeDefined();
    expect(scriptSrc).toBeDefined();
    expect(connectSrc).toBeDefined();
    expect(scriptSrc).toContain('"https://static.cloudflareinsights.com"');
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).not.toContain("cloudflareinsights.com");
  });

  it("adds upgrade-insecure-requests only in production instead of serializing null in development", () => {
    expect(serverEntry).toMatch(
      /\.\.\.\(process\.env\.NODE_ENV === "production"\s*\?\s*\{\s*upgradeInsecureRequests:\s*\[\]\s*\}\s*:\s*\{\}\)/
    );
    expect(serverEntry).not.toContain("? [] : null");
  });
});
