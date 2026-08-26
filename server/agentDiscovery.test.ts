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
    expect(tools.body.result.tools).toHaveLength(1);
    expect(tools.body.result.tools[0]).toMatchObject({
      name: "get_phame_public_product_information",
      annotations: { readOnlyHint: true },
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
