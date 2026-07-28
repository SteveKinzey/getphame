import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTranscriptFontCacheForTests,
  getTranscriptFontSource,
  registerTranscriptFontRoutes,
} from "./transcriptFontRoutes";

describe("transcript font routes", () => {
  beforeEach(() => {
    clearTranscriptFontCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes only the two approved immutable font subsets", () => {
    const cjk = getTranscriptFontSource("cjk");
    const thai = getTranscriptFontSource("thai");

    expect(cjk?.fileName).toBe("noto-sans-tc-transcript.ttf");
    expect(thai?.fileName).toBe("noto-sans-thai-transcript-v2.ttf");
    expect(cjk?.sourceUrl).toMatch(/^https:\/\/files\.manuscdn\.com\//);
    expect(thai?.sourceUrl).toMatch(/^https:\/\/files\.manuscdn\.com\//);
    expect(cjk?.sourceUrl).not.toMatch(/manus-storage|X-Amz-|Expires=|Signature=/i);
    expect(thai?.sourceUrl).not.toMatch(/manus-storage|X-Amz-|Expires=|Signature=/i);
    expect(getTranscriptFontSource("../../secret")).toBeNull();
  });

  it("proxies an approved font as a cacheable same-origin TTF response", async () => {
    const fontBytes = new Uint8Array([0, 1, 0, 0, 0, 16]);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(fontBytes, {
        status: 200,
        headers: { "Content-Type": "font/ttf" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    registerTranscriptFontRoutes(app);
    const response = await request(app).get("/api/assets/transcript-font/cjk");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("font/ttf");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(response.headers["content-disposition"]).toContain("noto-sans-tc-transcript.ttf");
    expect(Buffer.from(response.body)).toEqual(Buffer.from(fontBytes));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown font identifiers without contacting upstream storage", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const app = express();
    registerTranscriptFontRoutes(app);
    const response = await request(app).get("/api/assets/transcript-font/unknown");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Transcript font not found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
