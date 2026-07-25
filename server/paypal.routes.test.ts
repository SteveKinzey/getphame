import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { registerPayPalRoutes } from "./paypal";

const originalClientId = process.env.PAYPAL_CLIENT_ID;
const originalSecret = process.env.PAYPAL_SECRET;

function restoreEnv(name: "PAYPAL_CLIENT_ID" | "PAYPAL_SECRET", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv("PAYPAL_CLIENT_ID", originalClientId);
  restoreEnv("PAYPAL_SECRET", originalSecret);
});

describe("PayPal REST routes", () => {
  it("serves the configured public status contract", async () => {
    process.env.PAYPAL_CLIENT_ID = "live-client-id";
    process.env.PAYPAL_SECRET = "live-secret";

    const app = express();
    app.use(express.json());
    registerPayPalRoutes(app);

    const response = await request(app).get("/api/paypal/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: true, clientId: "live-client-id" });
  });

  it.each(["/api/paypal/create-order", "/api/paypal/capture-order"])(
    "mounts %s before authentication checks",
    async (path) => {
      process.env.PAYPAL_CLIENT_ID = "live-client-id";
      process.env.PAYPAL_SECRET = "live-secret";

      const app = express();
      app.use(express.json());
      registerPayPalRoutes(app);

      const response = await request(app).post(path).send({});

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Not authenticated." });
    },
  );

  it("registers PayPal routes before the API not-found fallback in the production server", () => {
    const entryPoint = readFileSync(
      fileURLToPath(new URL("./_core/index.ts", import.meta.url)),
      "utf8",
    );

    expect(entryPoint).toContain('import { registerPayPalRoutes } from "../paypal";');
    expect(entryPoint.indexOf("registerPayPalRoutes(app);")).toBeGreaterThan(-1);
    expect(entryPoint.indexOf("registerPayPalRoutes(app);")).toBeLessThan(
      entryPoint.indexOf('app.use("/api", apiNotFoundHandler);'),
    );
  });
});
