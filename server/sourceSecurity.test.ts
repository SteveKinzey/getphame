import { describe, expect, it, vi } from "vitest";

const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));

describe("Sources store URL validation", () => {
  it("accepts an HTTPS hostname that resolves only to public addresses", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "203.0.113.20", family: 4 }]);
    const { normalizePublicHttpsStoreUrl } = await import("./sourceSecurity");
    await expect(normalizePublicHttpsStoreUrl("https://shop.example.com/")).resolves.toBe("https://shop.example.com");
  });

  it("rejects non-HTTPS and embedded credentials", async () => {
    const { normalizePublicHttpsStoreUrl } = await import("./sourceSecurity");
    await expect(normalizePublicHttpsStoreUrl("http://shop.example.com")).rejects.toThrow(/HTTPS/);
    await expect(normalizePublicHttpsStoreUrl("https://user:pass@shop.example.com")).rejects.toThrow(/credentials/);
  });

  it("rejects local hostnames and private network resolutions", async () => {
    const { normalizePublicHttpsStoreUrl } = await import("./sourceSecurity");
    await expect(normalizePublicHttpsStoreUrl("https://localhost")).rejects.toThrow(/publicly reachable/);
    lookupMock.mockResolvedValueOnce([{ address: "192.168.1.5", family: 4 }]);
    await expect(normalizePublicHttpsStoreUrl("https://shop.example.com")).rejects.toThrow(/public internet/);
  });
});
