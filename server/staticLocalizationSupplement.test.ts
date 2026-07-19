import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("versioned static-copy localization supplement", () => {
  const helperSource = readProjectFile("../client/src/lib/autoText.ts");
  const bootstrapSource = readProjectFile("../client/src/main.tsx");

  it("uses the versioned deployed supplement instead of a sandbox-only artifact", () => {
    expect(helperSource).toContain(
      'const STATIC_COPY_SUPPLEMENT_URL = "/manus-storage/getphame-static-localization-phame17_b0611502.json"',
    );
    expect(helperSource).toContain("fetch(STATIC_COPY_SUPPLEMENT_URL)");
    expect(helperSource).not.toContain("/home/ubuntu");
    expect(helperSource).not.toContain("localization-gap-classification.json");
  });

  it("validates and installs the deployed catalog before the React application mounts", () => {
    expect(helperSource).toContain("function mergeStaticCopySupplement");
    expect(helperSource).toContain("Static localization supplement is malformed.");
    expect(helperSource).toContain("Object.assign(translationCatalogs[locale] ??= {}, catalog)");
    expect(bootstrapSource).toContain("loadStaticLocalizationSupplement");
    expect(bootstrapSource).toContain("Promise.all([i18nReady, loadStaticLocalizationSupplement()])");
  });
});
