export const GUIDE_LANDING_URL = "https://getphame.app/landing#guide";
export const GUIDE_SHARE_TEXT = "Get the free Get Phame 30-Day Review Growth Playbook.";

export type LeadEmailError = "required" | "format" | null;

export function normalizeLeadEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateLeadEmail(value: string): { normalized: string; error: LeadEmailError } {
  const normalized = normalizeLeadEmail(value);
  if (!normalized) return { normalized, error: "required" };

  const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
  return { normalized, error: validFormat ? null : "format" };
}

export function buildGuideShareUrls(guideUrl = GUIDE_LANDING_URL) {
  const twitter = new URL("https://twitter.com/intent/tweet");
  twitter.search = new URLSearchParams({ text: GUIDE_SHARE_TEXT, url: guideUrl }).toString();

  const linkedin = new URL("https://www.linkedin.com/sharing/share-offsite/");
  linkedin.search = new URLSearchParams({ url: guideUrl }).toString();

  return { twitter: twitter.toString(), linkedin: linkedin.toString() };
}
