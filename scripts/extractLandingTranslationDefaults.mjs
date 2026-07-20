import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const landingDir = path.join(root, "client/src/components/landing");
const englishPath = path.join(root, "client/public/locales/en/translation.json");

function get(object, dottedKey) {
  return dottedKey.split(".").reduce((value, part) => value?.[part], object);
}

function set(object, dottedKey, value) {
  const parts = dottedKey.split(".");
  let cursor = object;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = value;
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isArrayLiteralExpression(node)) {
    const values = node.elements.map(literalValue);
    return values.every((value) => value !== undefined) ? values : undefined;
  }
  return undefined;
}

const source = {};
const unresolved = [];
const files = fs.readdirSync(landingDir).filter((file) => file.endsWith(".tsx"));

for (const file of files) {
  const fullPath = path.join(landingDir, file);
  const text = fs.readFileSync(fullPath, "utf8");
  const sourceFile = ts.createSourceFile(fullPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") {
      const [keyNode, optionsNode] = node.arguments;
      const key = keyNode && literalValue(keyNode);
      if (typeof key === "string") {
        let defaultValue;
        if (optionsNode && ts.isObjectLiteralExpression(optionsNode)) {
          const property = optionsNode.properties.find(
            (item) => ts.isPropertyAssignment(item) && item.name.getText(sourceFile).replace(/["']/g, "") === "defaultValue",
          );
          if (property && ts.isPropertyAssignment(property)) defaultValue = literalValue(property.initializer);
        }
        if (defaultValue !== undefined) set(source, key, defaultValue);
        else unresolved.push({ file, key });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const english = JSON.parse(fs.readFileSync(englishPath, "utf8"));
function merge(target, additions) {
  for (const [key, value] of Object.entries(additions)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] ??= {};
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}
merge(english, source);
fs.writeFileSync(englishPath, `${JSON.stringify(english, null, 2)}\n`);

const outputPath = "/home/ubuntu/landing_translation_source.json";
fs.writeFileSync(outputPath, JSON.stringify(source, null, 2));
console.log(JSON.stringify({ outputPath, files: files.length, extractedKeys: Object.keys(source).length, unresolved }, null, 2));
