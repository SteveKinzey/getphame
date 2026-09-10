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

const root = path.resolve(import.meta.dirname, "..");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Get Phame offline fallback", () => {
  it("uses the approved P-star asset, an accessible retry state, and localized recovery copy", () => {
    for (const locale of locales) {
      const page = read(`client/public/offline.${locale}.html`);
      expectFormattedSource(page).toContain('src="/apple-touch-icon.png"');
      expectFormattedSource(page).toContain('class="wordmark">GET PHAME');
      expectFormattedSource(page).toContain('id="retry"');
      expectFormattedSource(page).toContain('role="status" aria-live="polite"');
      expectFormattedSource(page).toContain("window.location.reload()");
      expectFormattedSource(page).toContain("window.addEventListener('online'");
    }
  });

  it("uses a dependency-free mobile-safe visual system that respects reduced motion", () => {
    const styles = read("client/public/offline.css");
    expectFormattedSource(styles).toContain("env(safe-area-inset-top)");
    expectFormattedSource(styles).toContain("prefers-reduced-motion: reduce");
    expectFormattedSource(styles).toContain("button:focus-visible");
    expectFormattedSource(styles).toContain("#101b3f");
    expectFormattedSource(styles).toContain("#d4a017");
  });

  it("serves the cached locale-specific document after failed navigations from both worker entrypoints", () => {
    for (const workerPath of [
      "client/public/sw-v28.js",
      "client/public/sw.js",
    ]) {
      const worker = read(workerPath);
      expectFormattedSource(worker).toContain(
        "const CACHE_NAME = 'getphame-v29'"
      );
      expectFormattedSource(worker).toContain(
        "event.request.mode === 'navigate'"
      );
      expectFormattedSource(worker).toContain("return getOfflinePage();");
      expectFormattedSource(worker).toContain("/offline.en.html");
    }
  });
});
