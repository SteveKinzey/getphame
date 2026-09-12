import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("managed storage download URLs", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BUILT_IN_FORGE_API_URL", "https://forge.example/api/");
    vi.stubEnv("BUILT_IN_FORGE_API_KEY", "managed-test-key");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns a validated HTTP URL and preserves the normalized object key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://storage.example/object.json?signature=test",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const { storageGet } = await import("./storage");

    await expect(storageGet("/static-copy/object.json")).resolves.toEqual({
      key: "static-copy/object.json",
      url: "https://storage.example/object.json?signature=test",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://forge.example/api/v1/storage/downloadUrl?path=static-copy%2Fobject.json",
      }),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer managed-test-key" },
      })
    );
  });

  it("rejects non-success responses instead of parsing them as download URLs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("upstream unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        })
      )
    );
    const { storageGet } = await import("./storage");

    await expect(storageGet("asset.json")).rejects.toThrow(
      "Storage download URL request failed (503 Service Unavailable): upstream unavailable"
    );
  });

  it.each([
    ["invalid JSON", new Response("not-json", { status: 200 })],
    ["a missing URL", new Response(JSON.stringify({}), { status: 200 })],
    [
      "an unsupported URL protocol",
      new Response(JSON.stringify({ url: "javascript:alert(1)" }), {
        status: 200,
      }),
    ],
  ])("rejects %s from the storage proxy", async (_label, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const { storageGet } = await import("./storage");

    await expect(storageGet("asset.json")).rejects.toThrow(
      /Storage download URL/
    );
  });
});
