import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("invisible Turnstile account-verification control", () => {
  it("executes the rendered widget so successful third-party initialization can produce a new-account proof token", () => {
    const control = read("client/src/components/auth/HumanVerification.tsx");

    expect(control).toContain('size: "invisible"');
    expect(control).toContain("widgetIdRef.current = window.turnstile.render(containerRef.current");
    expect(control).toContain("void window.turnstile.execute(widgetIdRef.current);");
    expect(control).toContain("onTokenChange(null);");
    expect(control).toContain('setStatus("unavailable")');
  });
});
