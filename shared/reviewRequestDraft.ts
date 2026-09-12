export const MAX_REVIEW_REQUEST_SUBJECT_CHARS = 180;
export const MAX_REVIEW_REQUEST_BODY_CHARS = 6000;

export type ReviewPlatformDraftValue = {
  platform: string;
  url: string;
  label?: string | null;
};

export type ReviewRequestDraftContext = {
  customerName: string;
  businessName: string;
  reviewValue: string;
  platformLinks: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
  bing: "Bing",
  facebook: "Facebook",
  apple: "Apple Maps",
  other: "Other",
};

const yelpDirectLinkPattern = () =>
  /(?:https?:\/\/)?(?:www\.)?yelp\.[a-z]{2,}(?:\.[a-z]{2,})?\/[^\s<>"')]+/gi;

export function buildYelpSearchInstruction(businessName: string): string {
  const safeBusinessName = businessName.trim() || "this business";
  return `Search "${safeBusinessName}" on Yelp`;
}

export function containsDirectYelpLink(value: string): boolean {
  return yelpDirectLinkPattern().test(value);
}

export function replaceDirectYelpLinksWithInstruction(
  value: string,
  businessName: string
): string {
  return value.replace(
    yelpDirectLinkPattern(),
    buildYelpSearchInstruction(businessName)
  );
}

export function getReviewPlatformValue(
  platform: ReviewPlatformDraftValue | null | undefined,
  businessName: string,
  fallbackReviewUrl = ""
): string {
  if (!platform) return fallbackReviewUrl;
  return platform.platform === "yelp"
    ? buildYelpSearchInstruction(businessName)
    : platform.url;
}

export function buildSafePlatformLinks(
  platforms: ReviewPlatformDraftValue[],
  businessName: string,
  fallbackReviewValue = ""
): string {
  if (platforms.length === 0) {
    return fallbackReviewValue
      ? `- Leave a review: ${fallbackReviewValue}`
      : "";
  }

  return platforms
    .map(platform => {
      const label =
        platform.label ||
        PLATFORM_LABELS[platform.platform] ||
        platform.platform;
      const value = getReviewPlatformValue(platform, businessName);
      return `- ${label}: ${value}`;
    })
    .join("\n");
}

export function renderReviewRequestDraft(
  value: string,
  context: ReviewRequestDraftContext
): string {
  const rendered = value
    .replace(/\{\{customer_name\}\}/g, context.customerName)
    .replace(/\{\{customerName\}\}/g, context.customerName)
    .replace(/\{\{business_name\}\}/g, context.businessName)
    .replace(/\{\{businessName\}\}/g, context.businessName)
    .replace(/\{\{review_link\}\}/g, context.reviewValue)
    .replace(/\{\{reviewLink\}\}/g, context.reviewValue)
    .replace(/\{\{platformLinks\}\}/g, context.platformLinks);

  return replaceDirectYelpLinksWithInstruction(rendered, context.businessName);
}

export function escapeReviewRequestHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function wrapPlainTextReviewRequestHtml(value: string): string {
  const safeBody = escapeReviewRequestHtml(value).replace(/\r?\n/g, "<br>");
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${safeBody}</div>`;
}

export function getFallbackReviewRequestDraft() {
  return {
    subject: "{{businessName}} would appreciate your feedback",
    body: `Hi {{customerName}},

Thank you for choosing {{businessName}}.

If you have a minute, we'd appreciate your honest feedback. It helps us improve and helps other customers know what to expect.

You can share your feedback here:

{{platformLinks}}

No pressure — just your honest experience.

Thank you,
{{businessName}} Team

---
You received this email because you are a customer of {{businessName}}. To stop receiving these emails, reply with "unsubscribe".`,
  };
}
