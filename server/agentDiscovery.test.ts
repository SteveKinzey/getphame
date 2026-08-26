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
  it("serves homepage Link headers and Markdown without changing browser HTML", async () => {
    const app = buildDiscoveryApp();
    const html = await request(app).get("/");
    const markdown = await request(app).get("/").set("Accept", "text/markdown");

    expect(html.status).toBe(200);
    expect(html.headers.link).toBe(HOMEPAGE_AGENT_LINK_HEADER);
    expect(html.headers.vary).toContain("Accept");
    expect(html.headers["content-type"]).toContain("text/html");
    expect(markdown.status).toBe(200);
    expect(markdown.headers.vary).toContain("Accept");
    expect(markdown.headers["content-type"]).toContain("text/markdown");
    expect(markdown.headers["x-markdown-tokens"]).toMatch(/^\d+$/);
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
    expect(tools.body.result.tools).toHaveLength(1);
    expect(tools.body.result.tools[0]).toMatchObject({
      name: "get_phame_public_product_information",
      annotations: { readOnlyHint: true },
    });
  });

  it("keeps OpenAPI and well-known discovery payloads JSON-only and structurally authoritative", async () => {
    const app = buildDiscoveryApp();
    const [openApi, authorizationServer] = await Promise.all([
      request(app).get("/openapi.json").set("Accept", "text/markdown"),
      request(app)
        .get("/.well-known/oauth-authorization-server")
        .set("Accept", "text/markdown"),
    ]);

    expect(openApi.headers["content-type"]).toContain("application/vnd.oai.openapi+json");
    expect(openApi.body).toMatchObject({
      openapi: "3.1.0",
      info: { title: "Get Phame Developer API", version: "1.0.0" },
      components: {
        securitySchemes: {
          developerApiKey: { scheme: "bearer" },
        },
      },
    });
    expect(Object.keys(openApi.body)).toContain("info");
    expect(Object.keys(openApi.body)).toContain("components");
    expect(authorizationServer.headers["content-type"]).toContain("application/json");
    expect(authorizationServer.body.agent_auth).toMatchObject({
      credential_types_supported: ["api_key"],
      claim_uri: "https://getphame.app/docs/api",
    });
  });

  it("declares content signals without making authenticated paths crawlable", async () => {
    const app = express();
    registerSitemapRoutes(app);
    const robots = await request(app).get("/robots.txt");

    expect(robots.text).toContain("Content-Signal: ai-train=no, search=yes, ai-input=no");
    expect(robots.text).toContain("Disallow: /dashboard");
    expect(robots.text).toContain("Disallow: /api/");
  });
});
