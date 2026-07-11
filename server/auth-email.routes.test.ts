import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerEmailAuthRoutes } from "./auth-email";

describe("email magic-link route wiring", () => {
  it("is registered and used by every public email-auth screen", () => {
    const entrypointPath = fileURLToPath(new URL("./_core/index.ts", import.meta.url));
    const loginPath = fileURLToPath(new URL("../client/src/pages/Login.tsx", import.meta.url));
    const onboardingPath = fileURLToPath(new URL("../client/src/pages/Onboarding.tsx", import.meta.url));
    const entrypoint = readFileSync(entrypointPath, "utf8");
    const login = readFileSync(loginPath, "utf8");
    const onboarding = readFileSync(onboardingPath, "utf8");

    expect(entrypoint).toContain('import { registerEmailAuthRoutes } from "../auth-email";');
    expect(entrypoint).toContain("registerEmailAuthRoutes(app);");
    expect(login).toContain('fetch("/api/auth/magic-link"');
    expect(onboarding).toContain('fetch("/api/auth/magic-link"');
    expect(onboarding).not.toContain('fetch("/api/auth/magic/send"');
  });

  it("returns JSON for the login form endpoint", async () => {
    const app = express();
    app.use(express.json());
    registerEmailAuthRoutes(app);

    const response = await request(app)
      .post("/api/auth/magic-link")
      .send({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: "A valid email address is required." });
  });
});
