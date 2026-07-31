import type { Express, Request, Response } from "express";
import express from "express";
import {
  AUTOMATION_HEALTH_PATH,
  automationEventBodySchema,
  buildAutomationEventInsert,
  verifyAutomationOidcToken,
  type AutomationOidcClaims,
} from "./automationHealth";
import {
  AutomationReplayError,
  ingestAutomationEvent,
} from "./automationHealthDb";

type AutomationHealthRouteDependencies = {
  now: () => number;
  verifyToken: (token: string, nowMs: number) => Promise<AutomationOidcClaims>;
  ingest: typeof ingestAutomationEvent;
};

const defaultDependencies: AutomationHealthRouteDependencies = {
  now: Date.now,
  verifyToken: verifyAutomationOidcToken,
  ingest: ingestAutomationEvent,
};

function bearerToken(request: Request): string | null {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function createAutomationHealthHandler(
  dependencies: AutomationHealthRouteDependencies = defaultDependencies
) {
  return async (request: Request, response: Response) => {
    response.set("Cache-Control", "no-store");
    const token = bearerToken(request);
    if (!token)
      return response
        .status(401)
        .json({ accepted: false, code: "unauthorized" });

    const parsedBody = automationEventBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return response
        .status(400)
        .json({ accepted: false, code: "invalid_event" });
    }

    const receivedAt = dependencies.now();
    try {
      const claims = await dependencies.verifyToken(token, receivedAt);
      const event = buildAutomationEventInsert({
        body: parsedBody.data,
        claims,
        receivedAt,
      });
      const stored = await dependencies.ingest(event);
      return response.status(stored.duplicate ? 200 : 201).json({
        accepted: true,
        duplicate: stored.duplicate,
      });
    } catch (error) {
      if (error instanceof AutomationReplayError) {
        return response
          .status(409)
          .json({ accepted: false, code: "replayed_token" });
      }
      if (
        error instanceof Error &&
        (error.name === "JWTExpired" ||
          error.name === "JWTClaimValidationFailed" ||
          error.name === "JWSSignatureVerificationFailed" ||
          error.name === "ZodError" ||
          error.message.includes("OIDC") ||
          error.message.includes("timestamp"))
      ) {
        return response
          .status(401)
          .json({ accepted: false, code: "unauthorized" });
      }
      console.error("[AutomationHealth] Event ingestion failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return response
        .status(503)
        .json({ accepted: false, code: "temporarily_unavailable" });
    }
  };
}

export function registerAutomationHealthRoutes(app: Express): void {
  app.post(
    AUTOMATION_HEALTH_PATH,
    express.json({ limit: "16kb", type: "application/json" }),
    createAutomationHealthHandler()
  );
}
