import type { Express } from "express";
import fs from "fs";
import path from "path";

const PUBLIC_SITE_ORIGIN = "https://getphame.app";

export const PUBLIC_FEATURE_ROUTES = [
  "/review-requests",
  "/email-campaigns",
  "/reputation-management",
] as const;

type PublicFeatureRoute = (typeof PUBLIC_FEATURE_ROUTES)[number];

type PrerenderFeature = {
  route: PublicFeatureRoute;
  title: string;
  description: string;
  keywords: string[];
  socialImage: string;
  socialImageAlt: string;
  headline: string;
  introduction: string;
  faq: Array<{ question: string; answer: string }>;
};

const PUBLIC_FEATURES: Record<PublicFeatureRoute, PrerenderFeature> = {
  "/review-requests": {
    route: "/review-requests",
    title: "Review Request Software for Local Businesses | Get Phame",
    description: "Create personalized review request emails, direct customers to the right review link, and track campaign engagement from one simple workspace.",
    keywords: ["review request software", "review request emails", "customer feedback", "local business reviews"],
    socialImage: "/manus-storage/getphame-review-requests-og_54168ce9.png",
    socialImageAlt: "Abstract email and destination-link workflow illustration for Get Phame Review Requests",
    headline: "Make every review request feel like a personal follow-up",
    introduction: "Get Phame helps local businesses send timely, branded review requests without turning a customer relationship into a bulk-email exercise.",
    faq: [
      { question: "Can I use my own business email?", answer: "Yes. Get Phame is designed to send through the email account your business already uses for customer communication." },
      { question: "Can I manage more than one review link?", answer: "Yes. Keep the destinations you use organized and choose the appropriate link for each campaign." },
      { question: "Does Get Phame filter customer feedback?", answer: "No. The workflow is built around direct, respectful review requests rather than filtering customers by expected sentiment." },
    ],
  },
  "/email-campaigns": {
    route: "/email-campaigns",
    title: "Email Campaigns for Review Requests | Get Phame",
    description: "Build personalized email campaigns for review requests, schedule respectful follow-ups, and measure engagement without leaving your own workflow.",
    keywords: ["review request email campaigns", "review follow-up emails", "customer email outreach", "email engagement tracking"],
    socialImage: "/manus-storage/getphame-email-campaigns-og_c52d741c.png",
    socialImageAlt: "Abstract email campaign workflow illustration for Get Phame Email Campaigns",
    headline: "Turn one customer follow-up into a repeatable email campaign",
    introduction: "Plan a consistent review-request cadence while keeping the message personal, the sender familiar, and the next action easy for customers to understand.",
    faq: [
      { question: "Can I use templates for recurring campaigns?", answer: "Yes. Templates help teams stay consistent while leaving room to personalize messages for the customer relationship." },
      { question: "Can I follow up after the first email?", answer: "Yes. You can use a measured reminder sequence when it fits your customer communication policy." },
      { question: "What does campaign engagement show?", answer: "Get Phame surfaces practical email activity such as sends, opens, and clicks so you can evaluate outreach performance." },
    ],
  },
  "/reputation-management": {
    route: "/reputation-management",
    title: "Reputation Management Software for Local Businesses | Get Phame",
    description: "Organize customer review outreach, maintain clear review links, and track email engagement in one reputation management workspace.",
    keywords: ["reputation management software", "local business reputation", "customer review outreach", "review management tools"],
    socialImage: "/manus-storage/getphame-reputation-management-og_02c63f3d.png",
    socialImageAlt: "Abstract customer outreach operations illustration for Get Phame Reputation Management",
    headline: "Build a steadier reputation workflow around real customer relationships",
    introduction: "Get Phame gives local teams a focused place to organize review outreach, keep destination links accurate, and measure how customers engage with requests.",
    faq: [
      { question: "Is this only for Google reviews?", answer: "No. You can organize the review destinations your business uses and select the appropriate one for an outreach campaign." },
      { question: "Can a team use the same workflow?", answer: "Yes. A shared workflow gives the team a more consistent way to prepare and send customer follow-up." },
      { question: "Does the product promise a specific rating outcome?", answer: "No. Get Phame supports respectful review outreach and engagement tracking; customer feedback remains independent." },
    ],
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function absoluteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `${PUBLIC_SITE_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}

function upsertMeta(html: string, attribute: "name" | "property", key: string, content: string) {
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`;
  const matcher = new RegExp(`<meta\\b[^>]*\\b${attribute}=["']${escapeRegex(key)}["'][^>]*>`, "i");
  return matcher.test(html) ? html.replace(matcher, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

function upsertCanonical(html: string, canonical: string) {
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}">`;
  const matcher = /<link\b[^>]*rel=["']canonical["'][^>]*>/i;
  return matcher.test(html) ? html.replace(matcher, tag) : html.replace("</head>", `  ${tag}\n</head>`);
}

function faqSchema(feature: PrerenderFeature) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: feature.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function staticFeatureBody(feature: PrerenderFeature) {
  const faqMarkup = feature.faq
    .map((item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`)
    .join("");

  return `<main data-prerendered-public-feature="true" data-feature-route="${feature.route}">
  <article>
    <p>Get Phame feature</p>
    <h1>${escapeHtml(feature.headline)}</h1>
    <p>${escapeHtml(feature.introduction)}</p>
    <p><a href="/onboarding">Start free</a></p>
    <section aria-labelledby="${feature.route.slice(1)}-faq-title">
      <h2 id="${feature.route.slice(1)}-faq-title">Useful details before you start</h2>
      ${faqMarkup}
    </section>
  </article>
</main>`;
}

/**
 * Produces crawler-ready route HTML while React still replaces the static root
 * with the real interactive public feature page for JavaScript-capable users.
 */
export function renderPublicFeatureHtml(template: string, feature: PrerenderFeature) {
  const canonical = `${PUBLIC_SITE_ORIGIN}${feature.route}`;
  const socialImage = absoluteUrl(feature.socialImage);
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(feature.title)}</title>`);

  html = upsertMeta(html, "name", "description", feature.description);
  html = upsertMeta(html, "name", "keywords", feature.keywords.join(", "));
  html = upsertCanonical(html, canonical);
  html = upsertMeta(html, "property", "og:title", feature.title);
  html = upsertMeta(html, "property", "og:description", feature.description);
  html = upsertMeta(html, "property", "og:url", canonical);
  html = upsertMeta(html, "property", "og:image", socialImage);
  html = upsertMeta(html, "property", "og:image:secure_url", socialImage);
  html = upsertMeta(html, "property", "og:image:alt", feature.socialImageAlt);
  html = upsertMeta(html, "name", "twitter:title", feature.title);
  html = upsertMeta(html, "name", "twitter:description", feature.description);
  html = upsertMeta(html, "name", "twitter:image", socialImage);
  html = upsertMeta(html, "name", "twitter:image:alt", feature.socialImageAlt);

  html = html.replace(/<script id="getphame-feature-faq-jsonld"[\s\S]*?<\/script>\s*/gi, "");
  const schema = JSON.stringify(faqSchema(feature)).replace(/</g, "\\u003c");
  html = html.replace("</head>", `  <script id="getphame-feature-faq-jsonld" type="application/ld+json">${schema}</script>\n</head>`);

  const root = `<div id="root">${staticFeatureBody(feature)}</div>`;
  return html.includes('<div id="root"></div>')
    ? html.replace('<div id="root"></div>', root)
    : html.replace("</body>", `${root}\n</body>`);
}

function getTemplatePath() {
  return process.env.NODE_ENV === "development"
    ? path.resolve(import.meta.dirname, "..", "client", "index.html")
    : path.resolve(import.meta.dirname, "public", "index.html");
}

export function registerPublicFeaturePrerender(app: Express) {
  const routes = PUBLIC_FEATURE_ROUTES.flatMap((route) => [route, `${route}/`]);

  app.get(routes, async (req, res, next) => {
    const normalizedRoute = (req.path.replace(/\/+$/, "") || "/") as PublicFeatureRoute;
    const feature = PUBLIC_FEATURES[normalizedRoute];

    if (!feature) return next();

    try {
      const template = await fs.promises.readFile(getTemplatePath(), "utf8");
      res.status(200).set("Content-Type", "text/html; charset=utf-8").send(renderPublicFeatureHtml(template, feature));
    } catch (error) {
      next(error);
    }
  });
}
