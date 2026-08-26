import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";

const BASE_URL = "https://getphame.app";
const CACHE_CONTROL = "public, max-age=3600";

export const HOMEPAGE_AGENT_LINK_HEADER = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
  '</docs/api>; rel="service-doc"; type="text/markdown"',
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
  '</.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"',
].join(", ");

const HOMEPAGE_MARKDOWN = `# Get Phame

Get Phame helps businesses request genuine customer feedback through individual, compliance-aware outreach.

## Public resources

- [Developer API documentation](${BASE_URL}/docs/api)
- [OpenAPI description](${BASE_URL}/openapi.json)
- [Authentication guidance](${BASE_URL}/auth.md)
- [Security policy](${BASE_URL}/security)
- [Privacy policy](${BASE_URL}/privacy-policy)

## Safe agent use

Public documentation and product discovery are available without authentication. Customer data, contact imports, review outreach, templates, and account settings require an authenticated account and explicit authorization. Agents must not create or send outreach without the account owner's authorization and a valid customer-relationship or opt-in basis.
`;

const API_DOCS_MARKDOWN = `# Get Phame Developer API

The Get Phame Developer API enables an account owner to import contacts and, where the account owner has enabled the source, submit an individual review-request event.

## Authentication

Every write request requires a developer API key created by an authenticated Get Phame account owner. Supply it in the \`Authorization: Bearer gp_live_...\` header. Keys are scoped, can be revoked, and are not issued through an automated OAuth client-credentials flow.

## Available scopes

- \`contacts:write\` permits contact imports.
- \`review_requests:send\` permits an eligible source-bound review-request event.

## Important safeguards

The API is rate limited, validates input, records idempotency, enforces source ownership, and requires consent evidence for the versioned review-request workflow. Never submit customer data or trigger outreach without the account owner's authorization and the required customer-relationship or opt-in basis. Do not send to suppressed contacts.

## Endpoints

- \`POST /api/v1/contacts\` imports a contact with consent evidence.
- \`POST /api/v1/source-events/review-request/validate\` checks whether a source-bound review request is eligible without sending it.
- \`POST /api/v1/source-events/review-request\` records an eligible source event; delivery follows the account's configured safeguards, delay, and source state.
- \`GET /api/health\` reports a non-sensitive service readiness signal.

Use the [OpenAPI description](${BASE_URL}/openapi.json) for request and response structures.
`;

const AUTH_MD = `# auth.md

## Get Phame agent authentication

Get Phame does not offer automatic agent account registration or OAuth client-credential token issuance. Public product discovery is available without credentials. The protected Developer API uses account-owner-provisioned developer API keys.

## Provisioning

An account owner signs in at ${BASE_URL}/login, opens Developer Integrations, and creates a scoped key for an approved integration. The key is shown once and must be stored as a secret. Agents must never request, transmit, log, or expose an account owner's API key.

## Authorization and outreach policy

Before a protected action, verify the account owner's authorization, source ownership, relevant API scope, and the customer's valid relationship or explicit opt-in basis. Treat review-request delivery as a consequential action. Never bypass consent, suppression, rate-limit, idempotency, or compliance safeguards.
`;

const AGENT_SKILL = `---
name: get-phame-public-api
description: Discover Get Phame public integration resources and safely prepare an owner-authorized developer API integration.
---

# Get Phame public API discovery

Use this skill to identify public Get Phame API documentation, authentication, and compliance constraints before an account owner authorizes an integration.

## Resources

- API documentation: ${BASE_URL}/docs/api
- OpenAPI description: ${BASE_URL}/openapi.json
- Authentication guidance: ${BASE_URL}/auth.md
- API catalog: ${BASE_URL}/.well-known/api-catalog

## Safety boundary

Get Phame developer API keys are created by an authenticated account owner and scoped to the owner's account. Never request or expose a key. Do not import customer data or request outreach until the owner has authorized the integration and the relevant customer relationship or opt-in evidence is available. Respect source ownership, suppression, rate limits, idempotency, and all compliance controls.
`;

export function countMarkdownTokens(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

export function acceptsMarkdown(req: Request): boolean {
  const accept = req.header("accept") ?? "";
  return accept.toLowerCase().split(",").some(value => value.trim().startsWith("text/markdown"));
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sendMarkdown(res: Response, content: string) {
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.setHeader("X-Markdown-Tokens", String(countMarkdownTokens(content)));
  res.setHeader("Cache-Control", CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(content);
}

function sendJson(res: Response, content: unknown, contentType = "application/json") {
  res.setHeader("Content-Type", `${contentType}; charset=utf-8`);
  res.setHeader("Cache-Control", CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).json(content);
}

function openApiDocument() {
  return {
    openapi: "3.1.0",
    info: { title: "Get Phame Developer API", version: "1.0.0", description: "Account-owner-authorized, compliance-aware integrations for individual review outreach. Read /docs/api and /auth.md before use." },
    servers: [{ url: BASE_URL }],
    security: [{ developerApiKey: [] }],
    components: { securitySchemes: { developerApiKey: { type: "http", scheme: "bearer", bearerFormat: "Get Phame developer API key", description: "Owner-provisioned gp_live_ key. Not an OAuth access token." } } },
    paths: {
      "/api/health": { get: { summary: "Read non-sensitive service readiness", security: [], responses: { "200": { description: "Service ready" } } } },
      "/api/v1/contacts": { post: { summary: "Import a contact with consent evidence", description: "Requires contacts:write and account-owner authorization.", responses: { "200": { description: "Contact imported or deduplicated" }, "401": { description: "Missing, revoked, expired, or invalid key" }, "403": { description: "Insufficient scope or source authorization" }, "422": { description: "Consent evidence is required" }, "429": { description: "Rate-limited or abuse-protected" } } } },
      "/api/v1/source-events/review-request/validate": { post: { summary: "Validate an eligible source-bound review request without delivery", description: "Requires contacts:write and review_requests:send.", responses: { "200": { description: "Eligibility result" } } } },
      "/api/v1/source-events/review-request": { post: { summary: "Submit an eligible source-bound review-request event", description: "Consequential. Requires owner authorization, source ownership, consent evidence, and configured account safeguards.", responses: { "200": { description: "Delivered or queued event" }, "202": { description: "Scheduled or suppressed event" } } } },
    },
  };
}

function publicMcpTool() {
  return { name: "get_phame_public_product_information", title: "Get Phame public product information", description: "Returns public Get Phame product, developer documentation, authentication, privacy, and security resources. It does not access customer data or perform actions.", inputSchema: { type: "object", additionalProperties: false, properties: {} }, annotations: { readOnlyHint: true, openWorldHint: false } };
}

function publicProductInformation() {
  return { product: "Get Phame", description: "Compliance-aware individual customer feedback outreach.", resources: { home: `${BASE_URL}/`, developerDocumentation: `${BASE_URL}/docs/api`, openApi: `${BASE_URL}/openapi.json`, authentication: `${BASE_URL}/auth.md`, security: `${BASE_URL}/security`, privacy: `${BASE_URL}/privacy-policy` }, safety: { customerData: "Not available through this public discovery tool.", consequentialActions: "Not available through this public discovery tool.", protectedApi: "Requires an account-owner-provisioned, scoped developer API key." } };
}

function mcpError(res: Response, id: string | number | null, code: number, message: string) {
  return res.status(200).json({ jsonrpc: "2.0", id, error: { code, message } });
}

function mcpSuccess(res: Response, id: string | number | null, result: unknown) {
  return res.status(200).json({ jsonrpc: "2.0", id, result });
}

export function registerAgentDiscoveryLinkHeaders(app: Express): void {
  app.use((req, res, next) => {
    if (req.path === "/" && (req.method === "GET" || req.method === "HEAD")) {
      res.setHeader("Link", HOMEPAGE_AGENT_LINK_HEADER);
      res.vary("Accept");
    }
    next();
  });
}

export function registerAgentDiscoveryRoutes(app: Express): void {
  app.get("/", (req, res, next) => (acceptsMarkdown(req) ? sendMarkdown(res, HOMEPAGE_MARKDOWN) : next()));
  app.get("/.well-known/api-catalog", (_req, res) => sendJson(res, { linkset: [{ anchor: `${BASE_URL}/api/v1`, link: [{ rel: "service-desc", href: `${BASE_URL}/openapi.json`, type: "application/vnd.oai.openapi+json" }, { rel: "service-doc", href: `${BASE_URL}/docs/api`, type: "text/markdown" }, { rel: "status", href: `${BASE_URL}/api/health`, type: "application/json" }] }] }, "application/linkset+json"));
  app.get("/openapi.json", (_req, res) => sendJson(res, openApiDocument(), "application/vnd.oai.openapi+json"));
  app.get("/docs/api", (_req, res) => sendMarkdown(res, API_DOCS_MARKDOWN));
  app.get("/auth.md", (_req, res) => sendMarkdown(res, AUTH_MD));
  app.get("/.well-known/openid-configuration", (_req, res) => sendJson(res, { issuer: BASE_URL, authorization_endpoint: `${BASE_URL}/api/agent/authorize`, token_endpoint: `${BASE_URL}/api/agent/token`, jwks_uri: `${BASE_URL}/.well-known/jwks.json`, response_types_supported: [], grant_types_supported: [], scopes_supported: ["contacts:write", "review_requests:send"], token_endpoint_auth_methods_supported: [], service_documentation: `${BASE_URL}/auth.md`, agent_auth: { skill: `${BASE_URL}/.well-known/agent-skills/get-phame-public-api/SKILL.md`, register_uri: `${BASE_URL}/login`, identity_types_supported: ["verified_email"], identity_assertion: { assertion_types_supported: ["verified_email"] }, credential_types_supported: ["api_key"], claim_uri: `${BASE_URL}/docs/api` } }));
  app.get("/.well-known/oauth-authorization-server", (_req, res) => sendJson(res, { issuer: BASE_URL, authorization_endpoint: `${BASE_URL}/api/agent/authorize`, token_endpoint: `${BASE_URL}/api/agent/token`, jwks_uri: `${BASE_URL}/.well-known/jwks.json`, response_types_supported: [], grant_types_supported: [], scopes_supported: ["contacts:write", "review_requests:send"], token_endpoint_auth_methods_supported: [], service_documentation: `${BASE_URL}/auth.md`, agent_auth: { skill: `${BASE_URL}/.well-known/agent-skills/get-phame-public-api/SKILL.md`, register_uri: `${BASE_URL}/login`, identity_types_supported: ["verified_email"], identity_assertion: { assertion_types_supported: ["verified_email"] }, credential_types_supported: ["api_key"], claim_uri: `${BASE_URL}/docs/api` } }));
  app.get("/.well-known/jwks.json", (_req, res) => sendJson(res, { keys: [] }));
  app.get("/.well-known/oauth-protected-resource", (_req, res) => sendJson(res, { resource: `${BASE_URL}/api/v1`, authorization_servers: [BASE_URL], scopes_supported: ["contacts:write", "review_requests:send"], bearer_methods_supported: ["header"], resource_documentation: `${BASE_URL}/docs/api` }));
  app.get("/.well-known/mcp/server-card.json", (_req, res) => sendJson(res, { serverInfo: { name: "Get Phame public discovery", version: "1.0.0" }, transport: { type: "streamable-http", endpoint: `${BASE_URL}/mcp` }, transports: [{ type: "streamable-http", endpoint: `${BASE_URL}/mcp` }], capabilities: { tools: { listChanged: false }, resources: {}, prompts: {} } }));
  app.post("/mcp", (req, res) => {
    const body = req.body as { id?: unknown; method?: unknown; params?: unknown } | undefined;
    const id = typeof body?.id === "string" || typeof body?.id === "number" ? body.id : null;
    if (!body || typeof body.method !== "string") return mcpError(res, id, -32600, "Invalid JSON-RPC request.");
    if (body.method === "initialize") return mcpSuccess(res, id, { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "Get Phame public discovery", version: "1.0.0" } });
    if (body.method === "tools/list") return mcpSuccess(res, id, { tools: [publicMcpTool()] });
    if (body.method === "tools/call") {
      const name = (body.params as { name?: unknown } | undefined)?.name;
      if (name !== "get_phame_public_product_information") return mcpError(res, id, -32602, "The requested tool is not available.");
      return mcpSuccess(res, id, { content: [{ type: "text", text: JSON.stringify(publicProductInformation()) }], isError: false });
    }
    return mcpError(res, id, -32601, "Method not found.");
  });
  app.get("/.well-known/agent-skills/get-phame-public-api/SKILL.md", (_req, res) => sendMarkdown(res, AGENT_SKILL));
  app.get("/.well-known/agent-skills/index.json", (_req, res) => sendJson(res, { $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json", skills: [{ name: "get-phame-public-api", type: "skill-md", description: "Discover Get Phame public integration resources and safely prepare an owner-authorized developer API integration.", url: `${BASE_URL}/.well-known/agent-skills/get-phame-public-api/SKILL.md`, digest: `sha256:${sha256(AGENT_SKILL)}` }] }));
  app.get("/api/agent/authorize", (_req, res) => res.status(400).json({ error: "unsupported_response_type", error_description: "Get Phame does not provide automated OAuth authorization. Use account-owner-provisioned developer API keys as documented in /auth.md." }));
  app.post("/api/agent/token", (_req, res) => res.status(400).json({ error: "unsupported_grant_type", error_description: "Get Phame does not mint OAuth access tokens. Use an owner-provisioned developer API key as documented in /auth.md." }));
}
