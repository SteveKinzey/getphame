import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function toFormattedSourcePattern(snippet: string): RegExp {
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let pattern = "";

  for (let index = 0; index < snippet.length; ) {
    const character = snippet[index];
    if (character === '"' || character === "'") {
      let closingIndex = index + 1;
      while (closingIndex < snippet.length) {
        if (
          snippet[closingIndex] === character &&
          snippet[closingIndex - 1] !== "\\"
        )
          break;
        closingIndex += 1;
      }
      if (closingIndex < snippet.length) {
        pattern += `["']${escape(snippet.slice(index + 1, closingIndex))}["']`;
        index = closingIndex + 1;
        continue;
      }
    }

    if (/\s/.test(character)) {
      while (index < snippet.length && /\s/.test(snippet[index])) index += 1;
      pattern += "\\s*";
      continue;
    }

    pattern += escape(character);
    if ("().,=:?{}[]<>".includes(character)) pattern += "\\s*";
    index += 1;
  }

  return new RegExp(pattern);
}

function expectFormattedSource(source: string) {
  return {
    toContain(snippet: string) {
      expect(source).toMatch(toFormattedSourcePattern(snippet));
    },
    not: {
      toContain(snippet: string) {
        expect(source).not.toMatch(toFormattedSourcePattern(snippet));
      },
    },
  };
}

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("versioned service-worker delivery", () => {
  it("registers the path-versioned v28 worker so edge caches cannot pin /sw.js", () => {
    const mainSource = readProjectFile("client/src/main.tsx");

    expectFormattedSource(mainSource).toContain(
      'const SERVICE_WORKER_URL = "/sw-v28.js"'
    );
    expectFormattedSource(mainSource).toContain(
      "navigator.serviceWorker .register(SERVICE_WORKER_URL)"
    );
    expectFormattedSource(mainSource).not.toContain(
      "navigator.serviceWorker.register('/sw.js')"
    );
  });

  it("keeps the versioned file and runtime cache generation aligned", () => {
    const versionedWorker = readProjectFile("client/public/sw-v28.js");
    const legacyWorker = readProjectFile("client/public/sw.js");

    expectFormattedSource(versionedWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );
    expectFormattedSource(versionedWorker).toContain(
      "Release manifest: locale dictionaries phame61; service worker getphame-v29."
    );
    expectFormattedSource(legacyWorker).toContain(
      "const CACHE_NAME = 'getphame-v29'"
    );

    for (const locale of ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const cancellationNamespace = `/locales/${locale}/cancellation.json`;
      expectFormattedSource(versionedWorker).toContain(cancellationNamespace);
      expectFormattedSource(legacyWorker).toContain(cancellationNamespace);
    }
  });
});
