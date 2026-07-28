import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storageGet: vi.fn(),
}));

vi.mock("./storage", () => ({
  storageGet: mocks.storageGet,
}));

import {
  clearStaticCopyCacheForTests,
  getStaticCopySource,
  registerStaticCopyRoutes,
} from "./staticCopyRoutes";

describe("static copy routes", () => {
  beforeEach(() => {
    clearStaticCopyCacheForTests();
    mocks.storageGet.mockReset();
    mocks.storageGet.mockResolvedValue({
      key: "getphame-static-copy-es.json",
      url: "https://storage.example/static-copy.json",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes only the six approved immutable locale catalogs from managed storage", () => {
    for (const locale of ["es", "fr", "it", "th", "zh-CN", "zh-TW"]) {
      const source = getStaticCopySource(locale);
      expect(source?.storageKey).toMatch(/^static-copy\/2026-07-28-pr-review-reconciliation\/getphame-static-copy-/);
      expect(source?.storageKey).toMatch(/\.json$/);
    }
    expect(getStaticCopySource("en")).toBeNull();
    expect(getStaticCopySource("../../secret")).toBeNull();
  });

  it("proxies and caches an approved catalog as readable same-origin JSON", async () => {
    const payload = {
      locale: "es",
      manifest: [{ key: "landing.example", source: "Example" }],
      translations: { "landing.example": "Ejemplo" },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    registerStaticCopyRoutes(app);
    const firstResponse = await request(app).get("/api/assets/static-copy/es");
    const secondResponse = await request(app).get("/api/assets/static-copy/es");

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers["content-type"]).toContain("application/json");
    expect(firstResponse.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(firstResponse.headers["content-disposition"]).toContain("getphame-static-copy-es.json");
    expect(firstResponse.body).toEqual(payload);
    expect(secondResponse.body).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.storageGet).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown locale identifiers without contacting upstream storage", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    registerStaticCopyRoutes(app);
    const response = await request(app).get("/api/assets/static-copy/en");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Static localization catalog not found" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.storageGet).not.toHaveBeenCalled();
  });
});
