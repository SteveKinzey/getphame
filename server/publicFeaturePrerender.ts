import type { Express } from "express";
import fs from "fs";
import path from "path";

const PUBLIC_SITE_ORIGIN = "https://getphame.app";
const CRAWLER_USER_AGENT = /googlebot|bingbot|yandexbot|baiduspider|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|pinterestbot|applebot|semrushbot/i;

export const PUBLIC_FEATURE_ROUTES = [
  "/review-requests",
  "/email-campaigns",
  "/reputation-management",
] as const;

type PublicFeatureRoute = (typeof PUBLIC_FEATURE_ROUTES)[number];

type PrerenderFeature = {
  route: PublicFeatureRoute;
  label: string;
  title: string;
  description: string;
  keywords: string[];
  socialImage: string;
  socialImageAlt: string;
  headline: string;
  introduction: string;
  comparisonRows: Array<{
    consideration: string;
    getPhame: string;
    commonApproach: string;
  }>;
  faq: Array<{ question: string; answer: string }>;
};

const PUBLIC_FEATURES: Record<PublicFeatureRoute, PrerenderFeature> = {
  "/review-requests": {
    route: "/review-requests",
    label: "Review Requests",
    title: "Review Request Software for Local Businesses | Get Phame",
    description: "Create personalized review request emails, direct customers to the right review link, and track campaign engagement from one simple workspace.",
    keywords: ["review request software", "review request emails", "customer feedback", "local business reviews"],
    socialImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/hdtnrnqnUpEWIKSm.png",
    socialImageAlt: "Abstract email and destination-link workflow illustration for Get Phame Review Requests",
    headline: "Make every review request feel like a personal follow-up",
    introduction: "Get Phame helps local businesses send timely, branded review requests without turning a customer relationship into a bulk-email exercise.",
    comparisonRows: [
      { consideration: "Where you prepare requests", getPhame: "One dedicated review-request workspace", commonApproach: "Spreadsheets, inbox notes, or separate tools" },
      { consideration: "Destination links", getPhame: "Organize and select a link for each campaign", commonApproach: "Maintain links manually across documents or bookmarks" },
      { consideration: "Engagement visibility", getPhame: "Review sends, opens, and clicks", commonApproach: "Reconstruct activity from inboxes or a separate email platform" },
      { consideration: "Follow-up approach", getPhame: "Templates and measured reminder sequences", commonApproach: "Create each follow-up manually or coordinate it across tools" },
    ],
    faq: [
      { question: "Can I use my own business email?", answer: "Yes. Get Phame is designed to send through the email account your business already uses for customer communication." },
      { question: "Can I manage more than one review link?", answer: "Yes. Keep the destinations you use organized and choose the appropriate link for each campaign." },
      { question: "Does Get Phame filter customer feedback?", answer: "No. The workflow is built around direct, respectful review requests rather than filtering customers by expected sentiment." },
    ],
  },
  "/email-campaigns": {
    route: "/email-campaigns",
    label: "Email Campaigns",
    title: "Email Campaigns for Review Requests | Get Phame",
    description: "Build personalized email campaigns for review requests, schedule respectful follow-ups, and measure engagement without leaving your own workflow.",
    keywords: ["review request email campaigns", "review follow-up emails", "customer email outreach", "email engagement tracking"],
    socialImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/YWmtUsvJpfRECgYC.png",
    socialImageAlt: "Abstract email campaign workflow illustration for Get Phame Email Campaigns",
    headline: "Turn one customer follow-up into a repeatable email campaign",
    introduction: "Plan a consistent review-request cadence while keeping the message personal, the sender familiar, and the next action easy for customers to understand.",
    comparisonRows: [
      { consideration: "Campaign starting point", getPhame: "Reusable review-request templates", commonApproach: "Start messages from scratch or copy prior emails" },
      { consideration: "Sequence coordination", getPhame: "Set a measured reminder sequence", commonApproach: "Track reminders manually in inboxes or task lists" },
      { consideration: "Message performance signals", getPhame: "Review send, open, and click activity", commonApproach: "Combine signals from an email provider and manual notes" },
      { consideration: "Review destinations", getPhame: "Select the destination link tied to the campaign", commonApproach: "Paste and maintain links separately" },
    ],
    faq: [
      { question: "Can I use templates for recurring campaigns?", answer: "Yes. Templates help teams stay consistent while leaving room to personalize messages for the customer relationship." },
      { question: "Can I follow up after the first email?", answer: "Yes. You can use a measured reminder sequence when it fits your customer communication policy." },
      { question: "What does campaign engagement show?", answer: "Get Phame surfaces practical email activity such as sends, opens, and clicks so you can evaluate outreach performance." },
    ],
  },
  "/reputation-management": {
    route: "/reputation-management",
    label: "Reputation Management",
    title: "Reputation Management Software for Local Businesses | Get Phame",
    description: "Organize customer review outreach, maintain clear review links, and track email engagement in one reputation management workspace.",
    keywords: ["reputation management software", "local business reputation", "customer review outreach", "review management tools"],
    socialImage: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663507659115/jOzrkywwvNmSbOey.png",
    socialImageAlt: "Abstract customer outreach operations illustration for Get Phame Reputation Management",
    headline: "Build a steadier reputation workflow around real customer relationships",
    introduction: "Get Phame gives local teams a focused place to organize review outreach, keep destination links accurate, and measure how customers engage with requests.",
    comparisonRows: [
      { consideration: "Day-to-day operating view", getPhame: "Keep outreach, destinations, and engagement in one workspace", commonApproach: "Coordinate across inboxes, spreadsheets, and separate tools" },
      { consideration: "Review destination governance", getPhame: "Organize selectable destination links", commonApproach: "Maintain links manually across documents or bookmarks" },
      { consideration: "Team repeatability", getPhame: "Use a shared campaign workflow and templates", commonApproach: "Rely on individual team habits and handoffs" },
      { consideration: "Process visibility", getPhame: "Review campaign engagement to improve the workflow", commonApproach: "Reconstruct activity from multiple sources" },
    ],
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

function comparisonMarkup(feature: PrerenderFeature) {
  const rows = feature.comparisonRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.consideration)}</th><td>${escapeHtml(row.getPhame)}</td><td>${escapeHtml(row.commonApproach)}</td></tr>`)
    .join("");

  return `<section data-public-feature-comparison="true" aria-labelledby="${feature.route.slice(1)}-comparison-title">
      <h2 id="${feature.route.slice(1)}-comparison-title">Compare the workflow, not the hype</h2>
      <p>See how a dedicated review-outreach workspace differs from a fragmented, do-it-yourself process.</p>
      <table>
        <caption>A comparison between Get Phame and a common fragmented review-outreach approach.</caption>
        <thead><tr><th scope="col">Workflow consideration</th><th scope="col">Get Phame</th><th scope="col">Common fragmented approach</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>This comparison describes Get Phame’s product workflow alongside common manual or disconnected approaches. Other products and operating processes vary, so confirm any third-party capabilities directly.</p>
    </section>`;
}

function relatedFeatureMarkup(feature: PrerenderFeature) {
  const links = Object.values(PUBLIC_FEATURES)
    .filter((candidate) => candidate.route !== feature.route)
    .map((candidate) => `<li><a href="${escapeHtml(candidate.route)}"><strong>${escapeHtml(candidate.label)}</strong><span>${escapeHtml(candidate.introduction)}</span></a></li>`)
    .join("");

  return `<section data-public-feature-related-features="true" aria-labelledby="${feature.route.slice(1)}-related-features-title">
      <h2 id="${feature.route.slice(1)}-related-features-title">Continue building your customer outreach system</h2>
      <p>Explore the connected workflows that help your team move from a single request to a steadier reputation process.</p>
      <nav aria-label="Related Get Phame features"><ul>${links}</ul></nav>
    </section>`;
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
    ${comparisonMarkup(feature)}
    ${relatedFeatureMarkup(feature)}
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

export function shouldPrerenderUserAgent(userAgent?: string) {
  return CRAWLER_USER_AGENT.test(userAgent ?? "");
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
    if (!shouldPrerenderUserAgent(req.get("user-agent"))) return next();

    try {
      const template = await fs.promises.readFile(getTemplatePath(), "utf8");
      res.status(200).set("Content-Type", "text/html; charset=utf-8").send(renderPublicFeatureHtml(template, feature));
    } catch (error) {
      next(error);
    }
  });
}
