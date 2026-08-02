import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Get Phame offline fallback", () => {
  it("uses the approved P-star asset, an accessible retry state, and localized recovery copy", () => {
    for (const locale of locales) {
      const page = read(`client/public/offline.${locale}.html`);
      expect(page).toContain('src="/apple-touch-icon.png"');
      expect(page).toContain('class="wordmark">GET PHAME');
      expect(page).toContain('id="retry"');
      expect(page).toContain('role="status" aria-live="polite"');
      expect(page).toContain("window.location.reload()");
      expect(page).toContain("window.addEventListener('online'");
    }
  });

  it("uses a dependency-free mobile-safe visual system that respects reduced motion", () => {
    const styles = read("client/public/offline.css");
    expect(styles).toContain("env(safe-area-inset-top)");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).toContain("button:focus-visible");
    expect(styles).toContain("#101b3f");
    expect(styles).toContain("#d4a017");
  });

  it("serves the cached locale-specific document after failed navigations from both worker entrypoints", () => {
    for (const workerPath of ["client/public/sw-v31.js", "client/public/sw.js"]) {
      const worker = read(workerPath);
      expect(worker).toContain("const CACHE_NAME = 'getphame-v31'");
      expect(worker).toContain("event.request.mode === 'navigate'");
      expect(worker).toContain("return getOfflinePage();");
      expect(worker).toContain("/offline.en.html");
    }
  });
});
