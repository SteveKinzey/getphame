import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("interaction-only Turnstile account-verification control", () => {
  it("uses supported explicit-execution parameters and retries after token expiry", () => {
    const control = read("client/src/components/auth/HumanVerification.tsx");

    expect(control).toContain('size: "normal"');
    expect(control).toContain('appearance: "interaction-only"');
    expect(control).toContain('execution: "execute"');
    expect(control).not.toContain('size: "invisible"');
    expect(control).toContain(
      "widgetIdRef.current = window.turnstile.render(containerRef.current"
    );
    expect(control).toContain("window.turnstile.execute(widgetId)");
    expect(control).toContain("window.turnstile.reset(widgetId)");
    expect(control).toContain('"expired-callback": () =>');
    expect(control).toContain("executeWidget();");
    expect(control).toContain("onTokenChange(null);");
    expect(control).toContain('setStatus("unavailable")');
    expect(control).toContain('data-testid="human-verification-widget"');
    expect(control).toContain('className="flex justify-center"');
  });
});
