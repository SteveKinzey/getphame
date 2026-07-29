import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claimWordPressPairingMock = vi.hoisted(() => vi.fn());
const initiateWordPressPairingMock = vi.hoisted(() => vi.fn());
const checkWordPressPairingStartRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("./wordpressPairing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./wordpressPairing")>();
  return {
    ...actual,
    claimWordPressPairing: claimWordPressPairingMock,
    initiateWordPressPairing: initiateWordPressPairingMock,
  };
});

vi.mock("./wordpressPairingRateLimit", () => ({
  checkWordPressPairingStartRateLimit: checkWordPressPairingStartRateLimitMock,
}));

import { registerPublicApiRoutes } from "./publicApi";
import { WordPressPairingError } from "./wordpressPairing";

describe("WordPress pairing public API security", () => {
  beforeEach(() => {
    claimWordPressPairingMock.mockReset();
    claimWordPressPairingMock.mockRejectedValue(
      new WordPressPairingError("NOT_FOUND", "This WordPress connection request was not found."),
    );
    initiateWordPressPairingMock.mockReset();
    checkWordPressPairingStartRateLimitMock.mockReset();
    checkWordPressPairingStartRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 11,
      retryAfterSeconds: 0,
    });
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
      expect(response.body).not.toHaveProperty("pairingSecret");
      expect(response.body).not.toHaveProperty("pairing_secret");
      expect(response.body).not.toHaveProperty("siteHost");
    }
    expect(claimWordPressPairingMock).toHaveBeenCalledTimes(1);
  });

  it("returns a no-store 429 with retry guidance before creating another pairing", async () => {
    checkWordPressPairingStartRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 237,
    });
    const app = express();
    app.use(express.json());
    registerPublicApiRoutes(app);

    const response = await request(app)
      .post("/api/v1/wordpress/pairings")
      .send({ siteUrl: "https://rate-limit-smoke.invalid", siteLabel: "Release smoke" });

    expect(response.status).toBe(429);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["retry-after"]).toBe("237");
    expect(response.body).toEqual({
      error: "Too many WordPress connection attempts. Try again shortly.",
      retryAfterSeconds: 237,
    });
    expect(initiateWordPressPairingMock).not.toHaveBeenCalled();
  });

  it("fails closed without creating a pairing when the shared limiter is unavailable", async () => {
    checkWordPressPairingStartRateLimitMock.mockRejectedValue(new Error("Database unavailable"));
    const app = express();
    app.use(express.json());
    registerPublicApiRoutes(app);

    const response = await request(app)
      .post("/api/v1/wordpress/pairings")
      .send({ siteUrl: "https://limiter-unavailable.invalid", siteLabel: "Release smoke" });

    expect(response.status).toBe(503);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["retry-after"]).toBe("30");
    expect(response.body).toEqual({
      error: "WordPress connections are temporarily unavailable. Try again shortly.",
    });
    expect(initiateWordPressPairingMock).not.toHaveBeenCalled();
  });
});
