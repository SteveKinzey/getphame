import { createHash } from "node:crypto";
import { z } from "zod";

export const OUTREACH_LOCALES = [
  "en",
  "es",
  "fr",
  "it",
  "th",
  "zh-CN",
  "zh-TW",
] as const;
export type OutreachLocale = (typeof OUTREACH_LOCALES)[number];

export const outreachLocaleSchema = z.enum(OUTREACH_LOCALES);

export const reviewOutreachConsentSchema = z.object({
  confirmed: z.literal(true),
  basis: z.enum(["explicit_opt_in", "customer_relationship"]),
  purpose: z.literal("review_outreach"),
  channel: z.literal("email"),
  capturedAt: z.string().datetime({ offset: true }),
  source: z.string().trim().min(3).max(255),
  text: z.string().trim().min(20).max(2_000),
  version: z.string().trim().min(1).max(64),
  privacyPolicyUrl: z.string().url().max(2_048),
});

export type ReviewOutreachConsent = z.infer<typeof reviewOutreachConsentSchema>;

export function consentTextHash(text: string) {
  return createHash("sha256").update(text.trim(), "utf8").digest("hex");
}

export type RecommendedPlatform = {
  platform: "google" | "yelp" | "tripadvisor" | "facebook" | "bing" | "other";
  label: string;
  mode: "link" | "instructions";
  reason: string;
  evidenceLabel: string;
};

const GOOGLE: RecommendedPlatform = {
  platform: "google",
  label: "Google Business Profile",
  mode: "link",
  reason: "Broad local-search visibility and an established review flow.",
  evidenceLabel: "General market guidance — verify fit for your customers.",
};

const FACEBOOK: RecommendedPlatform = {
  platform: "facebook",
  label: "Facebook Recommendations",
  mode: "link",
  reason:
    "Useful when the business already serves an active Facebook audience.",
  evidenceLabel: "Audience-fit guidance — not a popularity guarantee.",
};

const YELP: RecommendedPlatform = {
  platform: "yelp",
  label: "Yelp",
  mode: "instructions",
  reason:
    "Commonly considered for local discovery in the United States and Canada.",
  evidenceLabel:
    "Instruction-only: Yelp discourages direct review solicitation.",
};

const TRIPADVISOR: RecommendedPlatform = {
  platform: "tripadvisor",
  label: "Tripadvisor",
  mode: "link",
  reason:
    "Relevant to hospitality, travel, attractions, and visitor-facing businesses.",
  evidenceLabel:
    "Category-fit guidance — confirm the listing and platform terms.",
};

const CUSTOM_BY_MARKET: Record<string, RecommendedPlatform[]> = {
  GB: [
    {
      platform: "other",
      label: "Trustpilot",
      mode: "link",
      reason: "A recognized consumer-review option in the United Kingdom.",
      evidenceLabel:
        "Regional guidance — confirm current customer usage and terms.",
    },
  ],
  IE: [
    {
      platform: "other",
      label: "Trustpilot",
      mode: "link",
      reason:
        "A recognized consumer-review option in Ireland and the United Kingdom.",
      evidenceLabel:
        "Regional guidance — confirm current customer usage and terms.",
    },
  ],
  AU: [
    {
      platform: "other",
      label: "ProductReview.com.au",
      mode: "link",
      reason: "An Australia-focused consumer-review destination.",
      evidenceLabel: "Regional guidance — confirm category coverage and terms.",
    },
  ],
  TH: [
    {
      platform: "other",
      label: "Wongnai",
      mode: "link",
      reason:
        "A Thailand-focused option for restaurants and local lifestyle businesses.",
      evidenceLabel:
        "Category-specific regional guidance — verify current fit and terms.",
    },
  ],
  CN: [
    {
      platform: "other",
      label: "Dianping / Meituan",
      mode: "link",
      reason:
        "A mainland-China local discovery option for supported business categories.",
      evidenceLabel:
        "Regional guidance — configure the exact verified listing manually.",
    },
  ],
};

const YELP_MARKETS = new Set(["US", "CA"]);
const FACEBOOK_MARKETS = new Set([
  "US",
  "CA",
  "GB",
  "IE",
  "AU",
  "NZ",
  "FR",
  "IT",
  "ES",
  "DE",
  "TH",
  "TW",
]);
const TRAVEL_CATEGORIES = new Set([
  "hospitality",
  "hotel",
  "restaurant",
  "travel",
  "tourism",
  "attraction",
]);

export function getRegionalPlatformRecommendations(params: {
  countryCode?: string | null;
  businessCategory?: string | null;
}) {
  const countryCode = params.countryCode?.trim().toUpperCase() || "";
  const category = params.businessCategory?.trim().toLowerCase() || "";
  const recommendations: RecommendedPlatform[] = [];

  if (countryCode !== "CN") recommendations.push(GOOGLE);
  if (YELP_MARKETS.has(countryCode)) recommendations.push(YELP);
  if (FACEBOOK_MARKETS.has(countryCode)) recommendations.push(FACEBOOK);
  if (TRAVEL_CATEGORIES.has(category)) recommendations.push(TRIPADVISOR);
  recommendations.push(...(CUSTOM_BY_MARKET[countryCode] ?? []));

  if (recommendations.length === 0) {
    recommendations.push({
      platform: "other",
      label: "Verified regional review platform",
      mode: "link",
      reason: "Add the platform your customers actually use in this market.",
      evidenceLabel: "No inferred winner: confirm local fit before activation.",
    });
  }

  return recommendations;
}

export const businessContextSchema = z.object({
  description: z.string().trim().min(20).max(2_000),
  category: z.string().trim().min(2).max(100),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform(value => value.toUpperCase()),
  regionCode: z.string().trim().max(16).optional(),
  preferredLocale: outreachLocaleSchema.default("en"),
});
