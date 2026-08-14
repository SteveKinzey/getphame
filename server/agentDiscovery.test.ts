import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_AGENT_LINK_HEADER,
  registerAgentDiscoveryLinkHeaders,
  registerAgentDiscoveryRoutes,
} from "./agentDiscovery";
import { registerSitemapRoutes } from "./sitemap";

function buildDiscoveryApp() {
  const app = express();
  registerAgentDiscoveryLinkHeaders(app);
  app.use(express.json());
  registerAgentDiscoveryRoutes(app);
  app.get("/", (_req, res) => res.type("html").send("<main>Get Phame</main>"));
  return app;
}

describe("Get Phame agent discovery", () => {
<<<<<<< HEAD
  it("serves homepage Link headers and negotiated Markdown without changing browser HTML", async () => {
    const app = buildDiscoveryApp();

    const html = await request(app).get("/");
    expect(html.status).toBe(200);
    expect(html.headers.link).toBe(HOMEPAGE_AGENT_LINK_HEADER);
    expect(html.headers["content-type"]).toContain("text/html");

    const markdown = await request(app).get("/").set("Accept", "text/markdown");
    expect(markdown.status).toBe(200);
    expect(markdown.headers["content-type"]).toContain("text/markdown");
    expect(Number(markdown.headers["x-markdown-tokens"])).toBeGreaterThan(0);
    expect(markdown.text).toContain("# Get Phame");
  });

  it("publishes catalog, OpenAPI, authentication, skills, and protected-resource metadata", async () => {
    const app = buildDiscoveryApp();
    const [catalog, openApi, oidc, protectedResource, skills, auth] = await Promise.all([
      request(app).get("/.well-known/api-catalog"),
      request(app).get("/openapi.json"),
      request(app).get("/.well-known/openid-configuration"),
      request(app).get("/.well-known/oauth-protected-resource"),
      request(app).get("/.well-known/agent-skills/index.json"),
      request(app).get("/auth.md"),
    ]);

    expect(catalog.headers["content-type"]).toContain("application/linkset+json");
    expect(catalog.body.linkset[0].link.map((item: { rel: string }) => item.rel)).toEqual(
      expect.arrayContaining(["service-desc", "service-doc", "status"])
    );
    expect(openApi.headers["content-type"]).toContain("application/vnd.oai.openapi+json");
    expect(openApi.body.openapi).toBe("3.1.0");
    expect(oidc.body.grant_types_supported).toEqual([]);
    expect(oidc.body.agent_auth.credential_types_supported).toEqual(["api_key"]);
    expect(protectedResource.body.scopes_supported).toEqual(
      expect.arrayContaining(["contacts:write", "review_requests:send"])
    );
    expect(skills.body.$schema).toContain("agentskills.io");
    expect(skills.body.skills[0].digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(auth.headers["content-type"]).toContain("text/markdown");
    expect(auth.text).toContain("# auth.md");
  });

  it("limits MCP discovery to a read-only public information tool", async () => {
    const app = buildDiscoveryApp();
    const card = await request(app).get("/.well-known/mcp/server-card.json");
    expect(card.status).toBe(200);
    expect(card.body.serverInfo.name).toContain("Get Phame");
    expect(card.body.transport.endpoint).toBe("https://getphame.app/mcp");

    const tools = await request(app).post("/mcp").send({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(tools.status).toBe(200);
=======
  it("serves homepage Link headers and Markdown without changing browser HTML", async () => {
    const app = buildDiscoveryApp();
    const html = await request(app).get("/");
    const markdown = await request(app).get("/").set("Accept", "text/markdown");

    expect(html.status).toBe(200);
    expect(html.headers.link).toBe(HOMEPAGE_AGENT_LINK_HEADER);
    expect(html.headers["content-type"]).toContain("text/html");
    expect(markdown.headers["content-type"]).toContain("text/markdown");
    expect(markdown.text).toContain("# Get Phame");
  });

  it("publishes public metadata but limits MCP to the read-only product-information tool", async () => {
    const app = buildDiscoveryApp();
    const [catalog, openApi, protectedResource, skills, tools] = await Promise.all([
      request(app).get("/.well-known/api-catalog"),
      request(app).get("/openapi.json"),
      request(app).get("/.well-known/oauth-protected-resource"),
      request(app).get("/.well-known/agent-skills/index.json"),
      request(app).post("/mcp").send({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    ]);

    expect(catalog.headers["content-type"]).toContain("application/linkset+json");
    expect(openApi.body.openapi).toBe("3.1.0");
    expect(protectedResource.body.scopes_supported).toEqual(
      expect.arrayContaining(["contacts:write", "review_requests:send"])
    );
    expect(skills.body.skills[0].digest).toMatch(/^sha256:[a-f0-9]{64}$/);
>>>>>>> origin/main
    expect(tools.body.result.tools).toHaveLength(1);
    expect(tools.body.result.tools[0]).toMatchObject({
      name: "get_phame_public_product_information",
      annotations: { readOnlyHint: true },
    });
<<<<<<< HEAD

    const call = await request(app).post("/mcp").send({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "get_phame_public_product_information" },
    });
    expect(call.status).toBe(200);
    expect(call.body.result.content[0].text).toContain("customerData");

    const unavailable = await request(app).post("/mcp").send({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "send_review_request" },
    });
    expect(unavailable.body.error.code).toBe(-32602);
  });

  it("declares Content Signals without removing the authenticated route exclusions", async () => {
    const app = express();
    registerSitemapRoutes(app);
    const robots = await request(app).get("/robots.txt");
    expect(robots.status).toBe(200);
=======
  });

  it("declares content signals without making authenticated paths crawlable", async () => {
    const app = express();
    registerSitemapRoutes(app);
    const robots = await request(app).get("/robots.txt");

>>>>>>> origin/main
    expect(robots.text).toContain("Content-Signal: ai-train=no, search=yes, ai-input=no");
    expect(robots.text).toContain("Disallow: /dashboard");
    expect(robots.text).toContain("Disallow: /api/");
  });
});
