import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function readProjectFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );
}
