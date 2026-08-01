import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("versioned service-worker delivery", () => {
  it("registers the path-versioned v28 worker so edge caches cannot pin /sw.js", () => {
    const mainSource = readProjectFile("client/src/main.tsx");

    expect(mainSource).toContain('const SERVICE_WORKER_URL = "/sw-v28.js"');
    expect(mainSource).toContain(
      "navigator.serviceWorker.register(SERVICE_WORKER_URL)"
    );
    expect(mainSource).not.toContain(
      "navigator.serviceWorker.register('/sw.js')"
    );
  });

  it("keeps the versioned file and runtime cache generation aligned", () => {
    const versionedWorker = readProjectFile("client/public/sw-v28.js");
    const legacyWorker = readProjectFile("client/public/sw.js");

    expect(versionedWorker).toContain("const CACHE_NAME = 'getphame-v29'");
    expect(versionedWorker).toContain(
      "Release manifest: locale dictionaries phame61; service worker getphame-v29."
    );
    expect(legacyWorker).toContain("const CACHE_NAME = 'getphame-v29'");

    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const cancellationNamespace = `/locales/${locale}/cancellation.json`;
      expect(versionedWorker).toContain(cancellationNamespace);
      expect(legacyWorker).toContain(cancellationNamespace);
    }
  });
});
