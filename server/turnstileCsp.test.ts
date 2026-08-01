import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function directive(source: string, name: string) {
  const match = source.match(new RegExp(`${name}:\\s*\\[([\\s\\S]*?)\\],`));
  if (!match) throw new Error(`Missing CSP ${name} directive`);
  return match[1];
}

describe("production Turnstile Content Security Policy", () => {
  it("allows the official challenge origin without broadening either directive", () => {
    const source = read("server/_core/index.ts");
    const frameSrc = directive(source, "frameSrc");
    const scriptSrc = directive(source, "scriptSrc");

    expect(frameSrc).toContain('"https://challenges.cloudflare.com"');
    expect(scriptSrc).toContain('"https://challenges.cloudflare.com"');
    expect(frameSrc).not.toContain('"https:"');
    expect(scriptSrc).not.toContain('"https:"');
    expect(frameSrc).not.toContain("*.cloudflare.com");
    expect(scriptSrc).not.toContain("*.cloudflare.com");
  });
});
