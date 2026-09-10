import fs from "node:fs";
import path from "node:path";

const landingDir = path.resolve(
  import.meta.dirname,
  "../client/src/components/landing"
);
const files = fs.readdirSync(landingDir).filter(file => file.endsWith(".tsx"));
let replacements = 0;

for (const file of files) {
  const filePath = path.join(landingDir, file);
  const source = fs.readFileSync(filePath, "utf8");
  const updated = source.replace(
    /\bt\(\s*(["'`])(?!landing\.)([^"'`]+)\1/g,
    (match, quote, key) => {
      replacements += 1;
      return match.replace(
        `${quote}${key}${quote}`,
        `${quote}landing.${key}${quote}`
      );
    }
  );
  fs.writeFileSync(filePath, updated);
}

console.log(JSON.stringify({ files: files.length, replacements }, null, 2));
