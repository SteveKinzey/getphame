import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("interaction-only Turnstile account-verification control", () => {
  it("uses supported explicit-execution parameters and retries after token expiry", () => {
    const control = read("client/src/components/auth/HumanVerification.tsx");
    const sourceFile = ts.createSourceFile(
      "HumanVerification.tsx",
      control,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    let renderOptions: ts.ObjectLiteralExpression | undefined;
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.getText(sourceFile) === "window.turnstile.render" &&
        ts.isObjectLiteralExpression(node.arguments[1])
      ) {
        renderOptions = node.arguments[1];
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    expect(renderOptions).toBeDefined();
    const optionValue = (name: string) => {
      const property = renderOptions?.properties.find(
        candidate =>
          ts.isPropertyAssignment(candidate) &&
          candidate.name.getText(sourceFile) === name
      );
      return property && ts.isPropertyAssignment(property)
        ? property.initializer.getText(sourceFile)
        : undefined;
    };

    expect(optionValue("size")).toBe('"normal"');
    expect(optionValue("appearance")).toBe('"interaction-only"');
    expect(optionValue("execution")).toBe('"execute"');
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
    expect(control).toMatch(
      /className="[^"]*\bflex\b[^"]*\bjustify-center\b[^"]*"[\s\S]{0,120}data-testid="human-verification-widget"/
    );
  });
});
