import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claimWordPressPairingMock = vi.hoisted(() => vi.fn());

vi.mock("./wordpressPairing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./wordpressPairing")>();
  return {
    ...actual,
    claimWordPressPairing: claimWordPressPairingMock,
  };
});

import { createWordPressPairingStartLimiter, registerPublicApiRoutes } from "./publicApi";
import { WordPressPairingError } from "./wordpressPairing";

describe("WordPress pairing public API security", () => {
  beforeEach(() => {
    claimWordPressPairingMock.mockReset();
    claimWordPressPairingMock.mockRejectedValue(
      new WordPressPairingError("NOT_FOUND", "This WordPress connection request was not found."),
    );
  });

  it("returns the same generic no-store 404 for missing, malformed, and unknown pairing secrets", async () => {
    const app = express();
    app.use(express.json());
    registerPublicApiRoutes(app);

    const missing = await request(app)
      .post("/api/v1/wordpress/pairings/wpb_unknown/claim")
      .send({});
    const malformed = await request(app)
      .post("/api/v1/wordpress/pairings/wpb_unknown/claim")
      .set("X-Get-Phame-Pairing-Secret", "not-a-pairing-secret")
      .send({});
    const unknown = await request(app)
      .post("/api/v1/wordpress/pairings/wpb_unknown/claim")
      .set("X-Get-Phame-Pairing-Secret", `wps_${"a".repeat(43)}`)
      .send({});

    const expectedBody = {
      error: "This WordPress connection request was not found.",
      code: "NOT_FOUND",
    };
    for (const response of [missing, malformed, unknown]) {
      expect(response.status).toBe(404);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).toEqual(expectedBody);
      expect(response.body).not.toHaveProperty("apiKey");
      expect(response.body).not.toHaveProperty("sourceId");
      expect(response.body).not.toHaveProperty("siteHost");
    }
    expect(claimWordPressPairingMock).toHaveBeenCalledTimes(1);
  });

  it("caps tracked clients and admits new clients only after expired entries are pruned", () => {
    const limiter = createWordPressPairingStartLimiter({
      windowMs: 1_000,
      maxStartsPerWindow: 2,
      maxTrackedClients: 3,
      pruneIntervalMs: 10_000,
    });

    expect(limiter.canStart("198.51.100.1", 0)).toBe(true);
    expect(limiter.canStart("198.51.100.2", 0)).toBe(true);
    expect(limiter.canStart("198.51.100.3", 0)).toBe(true);
    expect(limiter.canStart("198.51.100.4", 500)).toBe(false);
    expect(limiter.getTrackedClientCount()).toBe(3);

    expect(limiter.canStart("198.51.100.4", 1_000)).toBe(true);
    expect(limiter.getTrackedClientCount()).toBe(1);
    expect(limiter.canStart("198.51.100.4", 1_001)).toBe(true);
    expect(limiter.canStart("198.51.100.4", 1_002)).toBe(false);
  });
});
