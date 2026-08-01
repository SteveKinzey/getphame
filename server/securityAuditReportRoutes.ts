import type { Express, Request, Response } from "express";
import express from "express";
import {
  SECURITY_AUDIT_PATH,
  buildSecurityAuditReportInsert,
  securityAuditEventBodySchema,
  verifySecurityAuditOidcToken,
  type SecurityAuditOidcClaims,
} from "./securityAuditReporting";
import {
  SecurityAuditReplayError,
  ingestSecurityAuditReport,
} from "./securityAuditReports";

type SecurityAuditRouteDependencies = {
  now: () => number;
  verifyToken: (
    token: string,
    nowMs: number
  ) => Promise<SecurityAuditOidcClaims>;
  ingest: typeof ingestSecurityAuditReport;
};

const defaultDependencies: SecurityAuditRouteDependencies = {
  now: Date.now,
  verifyToken: verifySecurityAuditOidcToken,
  ingest: ingestSecurityAuditReport,
};

function bearerToken(request: Request): string | null {
  const authorization = request.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function createSecurityAuditReportHandler(
  dependencies: SecurityAuditRouteDependencies = defaultDependencies
) {
  return async (request: Request, response: Response) => {
    response.set("Cache-Control", "no-store");
    const token = bearerToken(request);
    if (!token) {
      return response
        .status(401)
        .json({ accepted: false, code: "unauthorized" });
    }

    const parsedBody = securityAuditEventBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return response
        .status(400)
        .json({ accepted: false, code: "invalid_report" });
    }

    const receivedAt = dependencies.now();
    try {
      const claims = await dependencies.verifyToken(token, receivedAt);
      const report = buildSecurityAuditReportInsert({
        body: parsedBody.data,
        claims,
        receivedAt,
      });
      const stored = await dependencies.ingest(report);
      return response.status(stored.duplicate ? 200 : 201).json({
        accepted: true,
        duplicate: stored.duplicate,
      });
    } catch (error) {
      if (error instanceof SecurityAuditReplayError) {
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
      console.error("[SecurityAuditReports] Report ingestion failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
      return response
        .status(503)
        .json({ accepted: false, code: "temporarily_unavailable" });
    }
  };
}

export function registerSecurityAuditReportRoutes(app: Express): void {
  app.post(
    SECURITY_AUDIT_PATH,
    express.json({ limit: "16kb", type: "application/json" }),
    createSecurityAuditReportHandler()
  );
}
