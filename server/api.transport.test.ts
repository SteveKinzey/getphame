import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { apiFetch } from "../client/src/lib/apiFetch";
import {
  getQueryRetryLimit,
  queryRetryDelay,
  shouldRetryQuery,
} from "../client/src/lib/queryRetry";
import { apiNotFoundHandler } from "./_core/apiFallback";

describe("API transport JSON guarantees", () => {
  it("converts an upstream HTML response into a structured tRPC service error", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<!doctype html><html><body>App shell</body></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        })
    ) as unknown as typeof fetch;

    const response = await apiFetch(
      "https://example.com/api/trpc/settings.get",
      undefined,
      fetchImpl
    );
    const body = await response.json();
    const requestInit = fetchImpl.mock.calls[0]?.[1] as RequestInit;

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(body[0].error.json.message).toContain("temporarily unavailable");
    expect(body[0].error.json.data).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 503,
      path: "/api/trpc/settings.get",
    });
    expect(new Headers(requestInit.headers).get("accept")).toBe(
      "application/json"
    );
    expect(requestInit.credentials).toBe("include");
  });

  it("passes valid JSON responses through unchanged", async () => {
    const original = new Response('[{"result":{"data":{"json":true}}}]', {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const fetchImpl = vi.fn(async () => original) as unknown as typeof fetch;

    await expect(
      apiFetch("/api/trpc/health", undefined, fetchImpl)
    ).resolves.toBe(original);
  });

  it("returns JSON for unmatched API routes before the SPA renderer", async () => {
    const app = express();
    app.use("/api", apiNotFoundHandler);

    const response = await request(app).get("/api/unknown-route");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: "API endpoint not found.",
      path: "/api/unknown-route",
    });
  });

  it("mounts the JSON API fallback after tRPC and before Vite", () => {
    const entrypointPath = fileURLToPath(
      new URL("./_core/index.ts", import.meta.url)
    );
    const source = readFileSync(entrypointPath, "utf8");
    const trpcIndex = source.indexOf('"/api/trpc"');
    const fallbackIndex = source.indexOf('app.use("/api", apiNotFoundHandler)');
    const viteIndex = source.indexOf("await setupVite(app, server)");

    expect(trpcIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(trpcIndex);
    expect(viteIndex).toBeGreaterThan(fallbackIndex);
  });

  it("exposes a cache-bypassing readiness endpoint before tRPC and the SPA fallback", () => {
    const entrypointPath = fileURLToPath(
      new URL("./_core/index.ts", import.meta.url)
    );
    const source = readFileSync(entrypointPath, "utf8");
    const healthIndex = source.indexOf('app.get("/api/health"');
    const trpcIndex = source.indexOf('"/api/trpc"');
    const fallbackIndex = source.indexOf('app.use("/api", apiNotFoundHandler)');

    expect(healthIndex).toBeGreaterThan(-1);
    expect(source).toContain('res.set("Cache-Control", "no-store")');
    expect(healthIndex).toBeLessThan(trpcIndex);
    expect(healthIndex).toBeLessThan(fallbackIndex);
  });
});

describe("API query retry policy", () => {
  it("allows a longer bounded recovery window for temporary 503 responses", () => {
    const error = Object.assign(
      new Error("The API is temporarily unavailable. Please try again."),
      {
        data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 503 },
      }
    );

    expect(getQueryRetryLimit(error)).toBe(8);
    expect(shouldRetryQuery(7, error)).toBe(true);
    expect(shouldRetryQuery(8, error)).toBe(false);
  });

  it("does not retry terminal authorization and validation failures", () => {
    const forbidden = Object.assign(new Error("Forbidden"), {
      data: { code: "FORBIDDEN", httpStatus: 403 },
    });
    const badRequest = Object.assign(new Error("Invalid input"), {
      data: { code: "BAD_REQUEST", httpStatus: 400 },
    });

    expect(getQueryRetryLimit(forbidden)).toBe(0);
    expect(getQueryRetryLimit(badRequest)).toBe(0);
  });

  it("uses capped exponential backoff for repeated transport failures", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(queryRetryDelay(0)).toBe(800);
    expect(queryRetryDelay(1)).toBe(1_600);
    expect(queryRetryDelay(4)).toBe(8_000);

    vi.restoreAllMocks();
  });
});
