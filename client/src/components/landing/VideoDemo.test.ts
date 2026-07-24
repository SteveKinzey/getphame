import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentPath = fileURLToPath(new URL("./VideoDemo.tsx", import.meta.url));
const servedLocales = ["en", "zh-CN", "es", "fr", "it", "th", "zh-TW"] as const;

describe("VideoDemo media contract", () => {
  it("uses the verified self-hosted walkthrough and no stale YouTube embed", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain("/manus-storage/getphame-walkthrough-captioned_d6454fd4.mp4");
    expect(source).toContain("/manus-storage/getphame-walkthrough-poster_98943590.png");
    expect(source).not.toContain("youtube.com");
    expect(source).not.toContain("GetPhame");
  });

  it("keeps captions, inline mobile playback, and dialog keyboard semantics", async () => {
    const source = await readFile(componentPath, "utf8");

    expect(source).toContain("/manus-storage/getphame-walkthrough-captioned_0abd96cb.vtt");
    expect(source).toContain('kind="captions"');
    expect(source).toContain("playsInline");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('event.key === "Escape"');
  });

  it.each(servedLocales)("keeps the %s landing-video catalog complete and current", async (locale) => {
    const localePath = fileURLToPath(
      new URL(`../../../public/locales/${locale}/landing.json`, import.meta.url),
    );
    const catalog = JSON.parse(await readFile(localePath, "utf8")) as {
      landing: {
        section: { description: string };
        thumbnail: { altText: string };
        bottomBar: { title: string };
        modal: Record<string, string>;
      };
    };

    expect(catalog.landing.section.description).toContain("63");
    expect(catalog.landing.thumbnail.altText).toContain("Get Phame");
    expect(catalog.landing.bottomBar.title).toContain("Get Phame");
    expect(catalog.landing.modal.videoTitle).toContain("Get Phame");
    expect(catalog.landing.modal.captionNotice).toBeTruthy();
    expect(catalog.landing.modal.captionTrackLabel).toBeTruthy();
    expect(catalog.landing.modal.videoFallback).toBeTruthy();
    expect(catalog.landing.modal.iframeTitle).toBeUndefined();
  });

  it("keeps the active English translation namespace from overriding the new walkthrough copy", async () => {
    const translationPath = fileURLToPath(
      new URL("../../../public/locales/en/translation.json", import.meta.url),
    );
    const catalog = JSON.parse(await readFile(translationPath, "utf8")) as {
      landing: {
        section: { description: string };
        bottomBar: { title: string };
        modal: Record<string, string>;
      };
    };

    expect(catalog.landing.section.description).toContain("63-second");
    expect(catalog.landing.bottomBar.title).toBe("Get Phame — Platform Walkthrough");
    expect(catalog.landing.modal.videoTitle).toBe("Get Phame platform walkthrough");
    expect(catalog.landing.modal.captionTrackLabel).toBe("English captions");
    expect(catalog.landing.modal.iframeTitle).toBeUndefined();
  });

  it("bumps the PWA cache so installed phones replace stale locale-first video copy", async () => {
    const serviceWorkerPath = fileURLToPath(
      new URL("../../../public/sw.js", import.meta.url),
    );
    const serviceWorker = await readFile(serviceWorkerPath, "utf8");

    expect(serviceWorker).toContain("const CACHE_NAME = 'getphame-v10'");
    expect(serviceWorker).toContain(".filter((name) => name !== CACHE_NAME)");
    expect(serviceWorker).toContain("self.skipWaiting()");
    expect(serviceWorker).toContain("self.clients.claim()");
  });
});
