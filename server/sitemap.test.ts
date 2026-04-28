/**
 * Tests for /sitemap.xml and /robots.txt endpoints
 */
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { registerSitemapRoutes } from "./sitemap";

function buildTestApp() {
  const app = express();
  registerSitemapRoutes(app);
  return app;
}

describe("/sitemap.xml", () => {
  it("returns 200 with XML content-type", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/xml");
  });

  it("returns valid XML sitemap with urlset root element", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.text).toContain("</urlset>");
  });

  it("includes the homepage URL", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain("<loc>https://phame.app/</loc>");
  });

  it("includes privacy-policy URL", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain("<loc>https://phame.app/privacy-policy</loc>");
  });

  it("includes terms-of-service URL", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain("<loc>https://phame.app/terms-of-service</loc>");
  });

  it("includes lastmod, changefreq, and priority for each URL", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    expect(res.text).toContain("<changefreq>");
    expect(res.text).toContain("<priority>");
  });

  it("does not include authenticated/private routes", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/sitemap.xml");
    // These are app-internal routes that should never be in the sitemap
    expect(res.text).not.toContain("/send");
    expect(res.text).not.toContain("/dashboard");
    expect(res.text).not.toContain("/settings");
    expect(res.text).not.toContain("/admin");
  });
});

describe("/robots.txt", () => {
  it("returns 200 with text/plain content-type", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
  });

  it("allows all crawlers", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/robots.txt");
    expect(res.text).toContain("User-agent: *");
    expect(res.text).toContain("Allow: /");
  });

  it("points to the sitemap URL", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/robots.txt");
    expect(res.text).toContain("Sitemap: https://phame.app/sitemap.xml");
  });
});
