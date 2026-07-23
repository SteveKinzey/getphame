export const SOURCE_TYPES = [
  "csv",
  "woocommerce",
  "api",
  "shopify",
  "square",
  "hubspot",
  "pipedrive",
  "stripe",
  "koalendar",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceConnectionStatus = "connected" | "disconnected" | "setup_required" | "error";
export type SourceImportStatus = "previewed" | "committed" | "dismissed" | "failed";
export type SourceConsentBasis = "express" | "contract" | "legitimate_interest" | "other";

export interface SourceContactRow {
  name: string;
  email: string;
  phone?: string;
  externalId?: string;
}

export interface SourceImportConsent {
  basis: SourceConsentBasis;
  source: string;
  attested: true;
}

export interface SourceImportPreviewStats {
  requested: number;
  valid: number;
  duplicates: number;
  rejected: number;
}

export const GUIDED_SOURCE_TYPES = ["shopify", "square", "hubspot", "pipedrive"] as const;

export function sourceDisplayName(type: SourceType): string {
  const labels: Record<SourceType, string> = {
    csv: "CSV upload",
    woocommerce: "WooCommerce",
    api: "Developer API",
    shopify: "Shopify",
    square: "Square",
    hubspot: "HubSpot",
    pipedrive: "Pipedrive",
    stripe: "Stripe",
    koalendar: "Koalendar",
  };
  return labels[type];
}
