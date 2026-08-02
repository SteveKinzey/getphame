import { and, desc, eq, sql } from "drizzle-orm";
import {
  customerRequests,
  emailTemplates as emailTemplatesTable,
  quietHoursQueuedSends,
} from "../drizzle/schema";
import { FREE_LIMIT_ERR_MSG } from "@shared/const";
import {
  buildSafePlatformLinks,
  getFallbackReviewRequestDraft,
  getReviewPlatformValue,
  renderReviewRequestDraft,
  wrapPlainTextReviewRequestHtml,
} from "../shared/reviewRequestDraft";
import { createCustomerRequest, getBusinessProfile, getDb, upsertBusinessProfile } from "./db";
import { encodeTrackingToken, buildOpenPixel, wrapClickUrl } from "./emailTracking";
import { outreachLocaleSchema, type OutreachLocale } from "./integrationExpansion";
import { getAdaptiveSendStatus } from "./adaptiveSendLimits";
import { getDefaultReviewPlatform, listReviewPlatforms } from "./reviewPlatforms";
import { deliverReviewEmailOrQueue } from "./quietHours";
import { evaluateFreeQuotaAccess, formatFreeQuotaBlockedMessage } from "./quotaEnforcement";
import { getDefaultTemplate, listTemplates } from "./templates";
import { getLatestApprovedTemplateRevision } from "./templateRevisions";

function trackingBaseUrl() {
  return (process.env.APP_BASE_URL ?? "https://getphame.app").replace(/\/$/, "");
}

function isTrackableHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export type ReviewRequestDeliveryParams = {
  userId: number;
  customerName: string;
  customerEmail: string;
  preferredLocale?: OutreachLocale;
  templateId?: number | null;
  platformId?: number | null;
  sourceConnectionId?: number | null;
  sourceEventId?: string | null;
  contactId?: number | null;
};

export type ReviewRequestDeliveryValidation = {
  valid: true;
  preferredLocale: OutreachLocale;
  templateId: number | null;
  templateRevisionId: number | null;
  englishTemplateRevisionId: number | null;
  platformId: number | null;
  platformType: string | null;
  platformName: string | null;
};

export async function validateReviewRequestDelivery(
  params: ReviewRequestDeliveryParams,
): Promise<ReviewRequestDeliveryValidation> {
  const locale = outreachLocaleSchema.parse(params.preferredLocale ?? "en");
  const name = params.customerName.trim();
  const email = params.customerEmail.trim().toLowerCase();
  if (!name || !email) throw new Error("A customer name and email address are required.");

  const profile = await getBusinessProfile(params.userId);
  if (!profile) throw new Error("Business profile not configured. Please complete setup in Get Phame.");
  const sendStatus = await getAdaptiveSendStatus(params.userId);
  if (!sendStatus.configured) throw new Error("SMTP not configured. Connect your email account in Get Phame Settings.");
  if (profile.tier === "free") {
    const decision = await evaluateFreeQuotaAccess(params.userId, profile.tier);
    if (!decision.allowed) throw new Error(formatFreeQuotaBlockedMessage(decision.quota, FREE_LIMIT_ERR_MSG));
  }

  const allPlatforms = await listReviewPlatforms(params.userId);
  const chosenPlatform = params.platformId
    ? allPlatforms.find(platform => platform.id === params.platformId) ?? null
    : await getDefaultReviewPlatform(params.userId);
  if (params.platformId && !chosenPlatform) throw new Error("The selected review platform was not found.");
  const reviewValue = getReviewPlatformValue(chosenPlatform, profile.businessName, profile.reviewLink ?? "");
  if (!reviewValue) throw new Error("A review destination must be configured before sending requests.");

  const allTemplates = await listTemplates(params.userId);
  const selectedTemplate = params.templateId
    ? allTemplates.find(template => template.id === params.templateId) ?? null
    : await getDefaultTemplate(params.userId);
  if (params.templateId && !selectedTemplate) throw new Error("The selected email template was not found.");
  const revision = selectedTemplate
    ? await getLatestApprovedTemplateRevision({ userId: params.userId, templateId: selectedTemplate.id, locale })
    : null;
  if (locale !== "en" && !revision) {
    throw new Error(`An approved ${locale} template is required before sending in that language.`);
  }

  return {
    valid: true,
    preferredLocale: locale,
    templateId: selectedTemplate?.id ?? null,
    templateRevisionId: revision?.id ?? null,
    englishTemplateRevisionId: revision?.englishRevisionId ?? null,
    platformId: chosenPlatform?.id ?? null,
    platformType: chosenPlatform?.platform ?? null,
    platformName: chosenPlatform?.label ?? null,
  };
}

export async function deliverReviewRequest(params: ReviewRequestDeliveryParams) {
  const locale = outreachLocaleSchema.parse(params.preferredLocale ?? "en");
  const name = params.customerName.trim();
  const email = params.customerEmail.trim().toLowerCase();
  if (!name || !email) throw new Error("A customer name and email address are required.");

  const profile = await getBusinessProfile(params.userId);
  if (!profile) throw new Error("Business profile not configured. Please complete setup in Get Phame.");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let existingRequestId: number | null = null;
  if (params.sourceConnectionId && params.sourceEventId) {
    const [existingRequest] = await db
      .select()
      .from(customerRequests)
      .where(and(
        eq(customerRequests.userId, params.userId),
        eq(customerRequests.sourceConnectionId, params.sourceConnectionId),
        eq(customerRequests.sourceEventId, params.sourceEventId),
      ))
      .limit(1);
    if (existingRequest) {
      if (existingRequest.sentAt || existingRequest.status === "sent" || existingRequest.status === "followed_up") {
        return {
          requestId: existingRequest.id,
          delivery: "sent" as const,
          scheduledAt: null,
          preferredLocale: outreachLocaleSchema.parse(existingRequest.preferredLocale),
          templateRevisionId: existingRequest.templateRevisionId,
          englishTemplateRevisionId: existingRequest.englishTemplateRevisionId,
          platformId: existingRequest.platformId,
          sendLimitStatus: null,
          idempotentReplay: true,
        };
      }
      const [existingQueueItem] = await db
        .select()
        .from(quietHoursQueuedSends)
        .where(and(
          eq(quietHoursQueuedSends.userId, params.userId),
          eq(quietHoursQueuedSends.customerRequestId, existingRequest.id),
        ))
        .orderBy(desc(quietHoursQueuedSends.id))
        .limit(1);
      if (existingQueueItem && ["pending", "sending"].includes(existingQueueItem.status)) {
        return {
          requestId: existingRequest.id,
          delivery: "queued" as const,
          scheduledAt: existingQueueItem.scheduledAt,
          preferredLocale: outreachLocaleSchema.parse(existingRequest.preferredLocale),
          templateRevisionId: existingRequest.templateRevisionId,
          englishTemplateRevisionId: existingRequest.englishTemplateRevisionId,
          platformId: existingRequest.platformId,
          sendLimitStatus: null,
          idempotentReplay: true,
        };
      }
      if (existingQueueItem?.status === "sent") {
        return {
          requestId: existingRequest.id,
          delivery: "sent" as const,
          scheduledAt: null,
          preferredLocale: outreachLocaleSchema.parse(existingRequest.preferredLocale),
          templateRevisionId: existingRequest.templateRevisionId,
          englishTemplateRevisionId: existingRequest.englishTemplateRevisionId,
          platformId: existingRequest.platformId,
          sendLimitStatus: null,
          idempotentReplay: true,
        };
      }
      existingRequestId = existingRequest.id;
    }
  }
  const sendStatus = await getAdaptiveSendStatus(params.userId);
  if (!sendStatus.configured) throw new Error("SMTP not configured. Connect your email account in Get Phame Settings.");
  if (profile.tier === "free") {
    const decision = await evaluateFreeQuotaAccess(params.userId, profile.tier);
    if (!decision.allowed) throw new Error(formatFreeQuotaBlockedMessage(decision.quota, FREE_LIMIT_ERR_MSG));
  }

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (profile.monthlyResetDate !== yearMonth) {
    await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
  }

  const allPlatforms = await listReviewPlatforms(params.userId);
  const chosenPlatform = params.platformId
    ? allPlatforms.find(platform => platform.id === params.platformId) ?? null
    : await getDefaultReviewPlatform(params.userId);
  if (params.platformId && !chosenPlatform) throw new Error("The selected review platform was not found.");
  const fallbackReviewValue = profile.reviewLink ?? "";
  const reviewValue = getReviewPlatformValue(chosenPlatform, profile.businessName, fallbackReviewValue);
  if (!reviewValue) throw new Error("A review destination must be configured before sending requests.");
  const platformLinks = buildSafePlatformLinks(allPlatforms, profile.businessName, reviewValue);

  const allTemplates = await listTemplates(params.userId);
  const selectedTemplate = params.templateId
    ? allTemplates.find(template => template.id === params.templateId) ?? null
    : await getDefaultTemplate(params.userId);
  if (params.templateId && !selectedTemplate) throw new Error("The selected email template was not found.");

  const revision = selectedTemplate
    ? await getLatestApprovedTemplateRevision({ userId: params.userId, templateId: selectedTemplate.id, locale })
    : null;
  if (locale !== "en" && !revision) {
    throw new Error(`An approved ${locale} template is required before sending in that language.`);
  }
  const copy = revision
    ? { subject: revision.subject, body: revision.body }
    : selectedTemplate
      ? { subject: selectedTemplate.subject, body: selectedTemplate.body }
      : getFallbackReviewRequestDraft();
  const context = {
    customerName: name,
    businessName: profile.businessName,
    reviewValue,
    platformLinks,
  };
  const subject = renderReviewRequestDraft(copy.subject, context);
  const htmlBody = wrapPlainTextReviewRequestHtml(renderReviewRequestDraft(copy.body, context));

  const requestId = existingRequestId ?? await createCustomerRequest({
      userId: params.userId,
      customerName: name,
      customerEmail: email,
      method: "email",
      status: "pending",
      platformId: chosenPlatform?.id ?? null,
      sourceConnectionId: params.sourceConnectionId ?? null,
      sourceEventId: params.sourceEventId ?? null,
      preferredLocale: locale,
      templateRevisionId: revision?.id ?? null,
      englishTemplateRevisionId: revision?.englishRevisionId ?? null,
    });

  const trackingToken = encodeTrackingToken(requestId, params.userId, selectedTemplate?.id ?? null);
  const trackedReviewValue = isTrackableHttpUrl(reviewValue)
    ? wrapClickUrl(reviewValue, trackingToken, trackingBaseUrl())
    : reviewValue;
  const openPixel = buildOpenPixel(trackingToken, trackingBaseUrl());
  const trackedHtml = isTrackableHttpUrl(reviewValue)
    ? htmlBody.replace(new RegExp(reviewValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewValue)
    : htmlBody;
  const trackedHtmlBody = trackedHtml.replace(/<\/div>\s*$/, `${openPixel}</div>`);
  const delivery = await deliverReviewEmailOrQueue({
    userId: params.userId,
    customerRequestId: requestId,
    customerName: name,
    recipientEmail: email,
    subject,
    html: trackedHtmlBody,
    source: params.contactId ? "contacts" : "api",
    sourceRecordId: params.contactId ?? null,
    templateId: selectedTemplate?.id ?? null,
    scheduleFollowUps: true,
  });

  if (selectedTemplate) {
    await db.update(emailTemplatesTable).set({
      usageCount: sql`${emailTemplatesTable.usageCount} + 1`,
    }).where(and(
      eq(emailTemplatesTable.userId, params.userId),
      eq(emailTemplatesTable.id, selectedTemplate.id),
    ));
  }
  return {
    requestId,
    delivery: delivery.delivery,
    scheduledAt: delivery.scheduledAt,
    preferredLocale: locale,
    templateRevisionId: revision?.id ?? null,
    englishTemplateRevisionId: revision?.englishRevisionId ?? null,
    platformId: chosenPlatform?.id ?? null,
    sendLimitStatus: delivery.sendLimitStatus,
  };
}
