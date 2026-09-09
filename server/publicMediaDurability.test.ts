import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

const PUBLIC_STATIC_SOURCES = [
  { path: "../client/src/components/landing/ProductShowcase.tsx", deliveryMarker: "https://files.manuscdn.com/" },
  { path: "../client/src/lib/autoText.ts", deliveryMarker: "/api/assets/static-copy/" },
  { path: "../client/src/pages/FeaturePage.tsx", deliveryMarker: "https://files.manuscdn.com/" },
  { path: "../client/public/manifest.json", deliveryMarker: "https://files.manuscdn.com/" },
  { path: "./publicFeaturePrerender.ts", deliveryMarker: "https://files.manuscdn.com/" },
  { path: "./staticCopyRoutes.ts", deliveryMarker: "storageGet(source.storageKey)" },
  { path: "./transcriptFontRoutes.ts", deliveryMarker: "https://files.manuscdn.com/" },
] as const;

describe("public media durability", () => {
  it("keeps all audited public static media off expiring managed-storage redirects", () => {
    for (const { path, deliveryMarker } of PUBLIC_STATIC_SOURCES) {
      const source = readProjectFile(path);
      expect(source, path).not.toContain("/manus-storage/");
      expect(source, path).toContain(deliveryMarker);
    }
  });

  it("keeps the authorized storage proxy for private and user-uploaded objects", () => {
    const storageProxy = readProjectFile("./_core/storageProxy.ts");

    expect(storageProxy).toContain('app.get(["/manus-storage", "/manus-storage/"]');
    expect(storageProxy).toContain('app.get("/manus-storage/*key"');
    expect(storageProxy).toContain("Authorization: `Bearer ${ENV.forgeApiKey}`");
    expect(storageProxy).toContain('res.set("Cache-Control", "no-store")');
    expect(storageProxy).toContain("res.redirect(307, url)");
  });

  it("uses MIME-correct durable WebP social cards in both client and crawler metadata", () => {
    const clientFeaturePage = readProjectFile("../client/src/pages/FeaturePage.tsx");
    const serverPrerender = readProjectFile("./publicFeaturePrerender.ts");

    for (const url of [
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/UhORQpjNTcwKpeBp.webp",
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/uvvaVNerCoMHTwhX.webp",
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/vHMUvHplgLmsaIxk.webp",
    ]) {
      expect(clientFeaturePage).toContain(url);
      expect(serverPrerender).toContain(url);
    }
  });
});
