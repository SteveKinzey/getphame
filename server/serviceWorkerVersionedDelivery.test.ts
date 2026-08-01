import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("versioned service-worker delivery", () => {
  it("registers the path-versioned v27 worker so edge caches cannot pin /sw.js", () => {
    const mainSource = readProjectFile("client/src/main.tsx");

    expect(mainSource).toContain('const SERVICE_WORKER_URL = "/sw-v27.js"');
    expect(mainSource).toContain(
      "navigator.serviceWorker.register(SERVICE_WORKER_URL)"
    );
    expect(mainSource).not.toContain(
      "navigator.serviceWorker.register('/sw.js')"
    );
  });

  it("keeps the versioned file and runtime cache generation aligned", () => {
    const versionedWorker = readProjectFile("client/public/sw-v27.js");
    const legacyWorker = readProjectFile("client/public/sw.js");

    expect(versionedWorker).toContain("const CACHE_NAME = 'getphame-v27'");
    expect(versionedWorker).toContain(
      "Release manifest: locale dictionaries phame57; service worker getphame-v27."
    );
    expect(legacyWorker).toContain("const CACHE_NAME = 'getphame-v27'");
  });
});
