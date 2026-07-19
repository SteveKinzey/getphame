import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("package identity", () => {
  it("uses the approved Get Phame package identifier", async () => {
    const packageJson = await readFile(resolve(process.cwd(), "package.json"), "utf8");
    const packageMetadata = JSON.parse(packageJson) as { name?: string };

    expect(packageMetadata.name).toBe("get-phame");
    expect((packageMetadata as { displayName?: string }).displayName).toBe("Get Phame");
  });
});
