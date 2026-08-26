import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const serverEntryPath = fileURLToPath(new URL("./_core/index.ts", import.meta.url));
const serverEntry = readFileSync(serverEntryPath, "utf8");

describe("production Content Security Policy", () => {
  it("permits Cloudflare's automatically injected Web Analytics script without widening beacon connections", () => {
    const scriptSrc = serverEntry.slice(
      serverEntry.indexOf("scriptSrc: ["),
      serverEntry.indexOf("scriptSrcAttr:")
    );
    const connectSrc = serverEntry.slice(
      serverEntry.indexOf("connectSrc: ["),
      serverEntry.indexOf("objectSrc:")
    );

    expect(scriptSrc).toContain('"https://static.cloudflareinsights.com"');
    expect(connectSrc).toContain('"\'self\'"');
    expect(connectSrc).not.toContain("cloudflareinsights.com");
  });
});
