import { describe, expect, it, vi } from "vitest";
import {
  buildDeploymentVersionUrl,
  clearReloadGuard,
  clearReloadTarget,
  DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS,
  fetchDeploymentVersion,
  getReloadTarget,
  hasReloadGuard,
  isNewDeploymentVersion,
  isValidDeploymentVersionPayload,
  reloadGuardStorageKey,
  setReloadGuard,
  setReloadTarget,
} from "./appVersion";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("appVersion", () => {
  it("validates bounded, non-empty version payloads", () => {
    expect(isValidDeploymentVersionPayload({ version: " build-28 " })).toBe(true);
    expect(isValidDeploymentVersionPayload({ version: "" })).toBe(false);
    expect(isValidDeploymentVersionPayload({ version: 28 })).toBe(false);
    expect(isValidDeploymentVersionPayload({})).toBe(false);
    expect(isValidDeploymentVersionPayload(null)).toBe(false);
  });

  it("fetches the platform version with an uncached timestamped request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: "build-28" }), { status: 200 })
    ) as unknown as typeof fetch;

    await expect(
      fetchDeploymentVersion({ fetchImpl, now: () => 1_725_000_000_000 })
    ).resolves.toBe("build-28");

    expect(fetchImpl).toHaveBeenCalledWith(
      buildDeploymentVersionUrl(1_725_000_000_000),
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("silently recovers when an internally bounded version request stalls", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<never>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new Error("request aborted")),
              { once: true }
            );
          })
      ) as unknown as typeof fetch;

      const request = fetchDeploymentVersion({ fetchImpl });
      await vi.advanceTimersByTimeAsync(DEPLOYMENT_VERSION_REQUEST_TIMEOUT_MS);

      await expect(request).resolves.toBeNull();
      expect(fetchImpl).toHaveBeenCalledWith(
        expect.stringContaining("?_t="),
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats invalid, unavailable, and malformed deployment responses as silent no-results", async () => {
    const unavailable = vi
      .fn()
      .mockResolvedValue(new Response("unavailable", { status: 503 })) as unknown as typeof fetch;
    const malformed = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ release: "build-28" }),
    }) as unknown as typeof fetch;
    const invalidJson = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("invalid JSON");
      },
    }) as unknown as typeof fetch;

    await expect(fetchDeploymentVersion({ fetchImpl: unavailable })).resolves.toBeNull();
    await expect(fetchDeploymentVersion({ fetchImpl: malformed })).resolves.toBeNull();
    await expect(fetchDeploymentVersion({ fetchImpl: invalidJson })).resolves.toBeNull();
  });

  it("detects only a real change from an established baseline", () => {
    expect(isNewDeploymentVersion(null, "build-28")).toBe(false);
    expect(isNewDeploymentVersion("build-28", "build-28")).toBe(false);
    expect(isNewDeploymentVersion("build-28", "build-29")).toBe(true);
  });

  it("records one session-scoped reload guard per target deployment version", () => {
    const storage = new MemoryStorage();
    const version = "build-28";

    expect(reloadGuardStorageKey(version)).toBe("getphame:update-reload:build-28");
    expect(hasReloadGuard(storage, version)).toBe(false);
    expect(setReloadGuard(storage, version, 1_725_000_000_000)).toBe(true);
    expect(setReloadTarget(storage, version)).toBe(true);
    expect(hasReloadGuard(storage, version)).toBe(true);
    expect(getReloadTarget(storage)).toBe(version);

    clearReloadGuard(storage, version);
    clearReloadTarget(storage);
    expect(hasReloadGuard(storage, version)).toBe(false);
    expect(getReloadTarget(storage)).toBeNull();
  });
});
