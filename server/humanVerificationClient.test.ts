import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("invisible Turnstile account-verification control", () => {
  it("executes the widget initially and resets then re-executes it after token expiry", () => {
    const control = read("client/src/components/auth/HumanVerification.tsx");

    expect(control).toContain('size: "invisible"');
    expect(control).toContain(
      "widgetIdRef.current = window.turnstile.render(containerRef.current"
    );
    expect(control).toContain("window.turnstile.execute(widgetId)");
    expect(control).toContain("window.turnstile.reset(widgetId)");
    expect(control).toContain('"expired-callback": () =>');
    expect(control).toContain("executeWidget();");
    expect(control).toContain("onTokenChange(null);");
    expect(control).toContain('setStatus("unavailable")');
  });
});
