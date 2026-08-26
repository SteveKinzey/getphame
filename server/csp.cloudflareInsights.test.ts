import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverEntryPath = fileURLToPath(new URL("./_core/index.ts", import.meta.url));
const serverEntry = readFileSync(serverEntryPath, "utf8");

describe("production Content Security Policy", () => {
  it("permits Cloudflare's automatically injected Web Analytics script without widening beacon connections", () => {
    const scriptSrcStart = serverEntry.indexOf("scriptSrc: [");
    const scriptSrcEnd = serverEntry.indexOf("scriptSrcAttr:");
    const connectSrcStart = serverEntry.indexOf("connectSrc: [");
    const connectSrcEnd = serverEntry.indexOf("objectSrc:");

    expect(scriptSrcStart).toBeGreaterThanOrEqual(0);
    expect(scriptSrcEnd).toBeGreaterThan(scriptSrcStart);
    expect(connectSrcStart).toBeGreaterThanOrEqual(0);
    expect(connectSrcEnd).toBeGreaterThan(connectSrcStart);

    const scriptSrc = serverEntry.slice(scriptSrcStart, scriptSrcEnd);
    const connectSrc = serverEntry.slice(connectSrcStart, connectSrcEnd);

    expect(scriptSrc).toContain('"https://static.cloudflareinsights.com"');
    expect(connectSrc).toContain('"\'self\'"');
    expect(connectSrc).not.toContain("cloudflareinsights.com");
  });
});
