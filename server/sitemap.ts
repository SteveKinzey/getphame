/**
 * Sitemap & robots.txt — SEO endpoints
 *
 * /sitemap.xml  — dynamic XML sitemap with all public routes
 * /robots.txt   — instructs crawlers and points to sitemap
 *
 * To add a new public page, append an entry to PUBLIC_ROUTES below.
 */
import type { Express } from "express";

const BASE_URL = "https://reviewlink.app";

interface SitemapRoute {
  path: string;
  changefreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: string;
  /** Override lastmod; defaults to today's date */
  lastmod?: string;
}

/**
 * All publicly crawlable pages.
 * Add new routes here whenever a new public page is created.
 */
const PUBLIC_ROUTES: SitemapRoute[] = [
  { path: "/",                  changefreq: "weekly",  priority: "1.0" },
  { path: "/privacy-policy",    changefreq: "yearly",  priority: "0.3" },
  { path: "/terms-of-service",  changefreq: "yearly",  priority: "0.3" },
];

function buildSitemapXml(): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const urlEntries = PUBLIC_ROUTES.map(({ path, changefreq, priority, lastmod }) => {
    const loc = `${BASE_URL}${path}`;
    const mod = lastmod ?? today;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${mod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    "</urlset>",
    "",
  ].join("\n");
}

export function registerSitemapRoutes(app: Express): void {
  // ── /sitemap.xml ──────────────────────────────────────────────────────────
  app.get("/sitemap.xml", (_req, res) => {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    // Cache for 24 hours in production; no-cache in dev
    const maxAge = process.env.NODE_ENV === "production" ? 86400 : 0;
    res.setHeader("Cache-Control", `public, max-age=${maxAge}`);
    res.send(buildSitemapXml());
  });

  // ── /robots.txt ───────────────────────────────────────────────────────────
  app.get("/robots.txt", (_req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
      [
        "User-agent: *",
        "Allow: /",
        "",
        `Sitemap: ${BASE_URL}/sitemap.xml`,
        "",
      ].join("\n")
    );
  });
}
