import { z } from "zod";
import { COOKIE_NAME, FREE_LIMIT_ERR_MSG } from "@shared/const";
import { getEffectiveTier } from "@shared/plans";
import { USD_PRICE_CENTS } from "@shared/pricing";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, paidProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { hasPaidOrAdminAccess } from "./entitlements";
import { evaluateFreeQuotaAccess, formatFreeQuotaBlockedMessage } from "./quotaEnforcement";
import { storageGet, storagePut } from "./storage";
import {
  getBusinessProfile,
  upsertBusinessProfile,
  createCustomerRequest,
  getCustomerRequests,
  getMonthlyRequestCount,
  getTotalRequestCount,
  getFreeQuotaSummary,
  getRecentApiImports,
  getWebhookConfigs,
  createWebhookConfig,
  deleteWebhookConfig,
  getWebhookDeliveryLogs,
  getNotificationPrefs,
  updateNotificationPrefs,
  getAccountProfile,
  updateAccountProfile,
} from "./db";
import {
  createDeveloperApiKey,
  DEVELOPER_API_SCOPES,
  listDeveloperApiKeys,
  revokeDeveloperApiKey,
  rotateDeveloperApiKey,
} from "./developerApiKeys";
import {
  acceptDeveloperApiTerms,
  getDeveloperApiEnrollmentStatus,
  requestDeveloperSendScope,
  reviewDeveloperSendScope,
} from "./developerApiEnrollment";
import {
  approveWordPressPairing,
  getWordPressPairingForApproval,
  WordPressPairingError,
} from "./wordpressPairing";
import { fingerprintAuthValue } from "./authOperations";

import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail, buildReviewRequestText } from "./emailTemplates";
import {
  buildSafePlatformLinks,
  buildYelpSearchInstruction,
  MAX_REVIEW_REQUEST_BODY_CHARS,
  MAX_REVIEW_REQUEST_SUBJECT_CHARS,
  renderReviewRequestDraft,
  wrapPlainTextReviewRequestHtml,
} from "../shared/reviewRequestDraft";
import { checkManualSearchEventRateLimit, checkOnboardingChecklistEventRateLimit, checkOnboardingFunnelInsightRateLimit } from "./rateLimiter";
import { AdaptiveSendLimitError, getAdaptiveSendStatus } from "./adaptiveSendLimits";
import {
  cancelSubscriptionRenewal,
  claimMoneyBackGuarantee,
  createCheckoutSession,
  createPortalSession,
  createStripePromotionCode,
  createThbCheckoutSession,
  getMoneyBackGuaranteeStatus,
  listStripePromotionCodes,
  getSubscriptionSnapshot,
} from "./stripe";
import { GUIDE_PDF_URL, sendLeadGuideEmail } from "./leadGuideEmail";
import { sendSupportMessage } from "./supportEmail";
import { checkSupportAttachmentRateLimit, checkSupportSubmissionRateLimit } from "./supportRateLimit";
import { helpAssistantRouter } from "./helpAssistant";
import {
  CONTACT_SEARCH_LOCALES,
  enforceContactSearchRateLimit,
  runNaturalContactSearch,
} from "./contactNaturalSearch";
import {
  buildContactExportSnapshot,
  CONTACT_CSV_EXPORT_LIMIT,
} from "./contactExport";
import {
  getSupportAttachmentExtension,
  getSupportSlaTargetAt,
  isSupportEscalation,
  MAX_SUPPORT_DUE_DATE_FUTURE_DAYS,
  MAX_SUPPORT_INTERNAL_NOTE_CHARS,
  MAX_SUPPORT_INTERNAL_NOTE_MENTIONS,
  MAX_SUPPORT_ESCALATION_THRESHOLD_MINUTES,
  MAX_SUPPORT_EXPORT_RANGE_DAYS,
  MAX_SUPPORT_SAVED_QUEUE_VIEW_NAME_CHARS,
  MAX_SUPPORT_SAVED_QUEUE_VIEWS,
  isValidSupportScreenshot,
  MAX_SUPPORT_ATTACHMENT_BYTES,
  getSupportInternalNotePlainText,
  renderSupportInternalNoteHtml,
  normalizeSupportQueueViewName,
  sanitizeSupportAttachmentFilename,
  SUPPORT_ATTACHMENT_MIME_TYPES,
  SUPPORT_ESCALATION_POLICY_KEY,
  SUPPORT_PRIORITIES,
  SUPPORT_QUEUE_ASSIGNEE_SCOPES,
  SUPPORT_QUEUE_SLA_WINDOWS,
  SUPPORT_QUEUE_SORTS,
  SUPPORT_QUEUE_VIEW_VISIBILITIES,
  SUPPORT_SUBMISSION_STATUSES,
  SUPPORT_TICKET_ALERT_DEDUP_WINDOW_MS,
  SUPPORT_TICKET_ALERT_TYPES,
  SUPPORT_TOPICS,
  type SupportPriority,
} from "./supportIntake";
import { buildDailyTrend } from "./dailyTrend";
import {
  getWooCredentials,
  upsertWooCredentials,
  syncWooOrders,
  fetchWooOrders,
  getPendingWooCustomers,
  getAllWooCustomers,
  markWooCustomersSent,
  setWooCustomerStatus,
  bulkSetWooCustomerStatus,
} from "./woocommerce";
import { getDb } from "./db";
import { stripeSubscriptions, businessProfiles, smtpCredentials, smtpAdminAuditLogs, customerRequests, reviewPlatforms, users, savedContacts, emailTemplates, followUpReminders, emailEvents, wooCredentials, wooCustomers, wooSyncLogs, accessCodeRedemptions, gmailTokens, churnSurveys, pageEvents, apiKeys, clientReviews, referrals, leads, koalendarBookings, koalendarConnections, supportEscalationPolicies, supportEscalationPolicyRecipients, supportInternalNoteMentions, supportInternalNotes, supportSavedQueueViews, supportSubmissions, supportTicketAlerts } from "../drizzle/schema";
import { getOrCreateReferralCode, getReferrerByCode, recordReferral } from "./referrals";
import { PWA_EVENT_NAMES, PWA_EVENT_SOURCE, summarizePwaEvents, toPwaEventPage } from "./pwaAnalytics";
import {
  CAPTION_LANGUAGE_ANALYTICS_LANGUAGES,
  CAPTION_LANGUAGE_ANALYTICS_SOURCE,
  summarizeCaptionLanguageEvents,
  toCaptionLanguageEventPage,
} from "./captionLanguageAnalytics";
import { ONBOARDING_CHECKLIST_EVENT_NAMES, ONBOARDING_CHECKLIST_EVENT_SOURCE, summarizeOnboardingChecklistEvents, toOnboardingChecklistEventPage } from "./onboardingChecklistAnalytics";
import {
  getManualSearchInsights,
  MANUAL_SEARCH_LOCALES,
  MANUAL_SEARCH_REPORTING_PERIODS,
  MANUAL_SEARCH_ROLES,
  recordManualZeroResultSearch,
} from "./manualSearchAnalytics";
import { generateOnboardingFunnelInsight } from "./onboardingFunnelInsight";
import { eq, like, or, inArray, desc, asc, isNotNull, isNull, and, sql, gte, lte, ne, count } from "drizzle-orm";
import {
  listSavedContacts,
  createSavedContact,
  updateSavedContact,
  deleteSavedContact,
  markContactSent,
  importContacts,
  setContactTags,
  upsertContactsFromSource,
} from "./contacts";
import {
  listTemplates,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  seedDefaultTemplates,
} from "./templates";
import {
  listReminders,
  cancelReminder,
  cancelRemindersByRequestId,
  scheduleFollowUp,
  sendReminderNow,
  syncPendingReminderStages,
} from "./reminders";
import { getReminderTimingPerformance } from "./reminderPerformance";
import { getOperationsAlertState, getSystemHealthTrend } from "./systemHealth";
import { buildAdminOperationsAnalyticsExport, serializeAdminOperationsCsv, type AdminOperationsCsvRow } from "./adminOperationsExport";
import {
  createAccessCode,
  listAccessCodes,
  revokeAccessCode,
  activateAccessCode,
  redeemAccessCode,
  generateCode,
} from "./accessCodes";
import {
  grantSubscriptionByEmail,
  revokeSubscriptionByEmail,
} from "./subscriptionGrants";
import {
  listReviewPlatforms,
  addReviewPlatform,
  updateReviewPlatform,
  deleteReviewPlatform,
  setDefaultReviewPlatform,
  getDefaultReviewPlatform,
  PLATFORM_LABELS,
} from "./reviewPlatforms";
import {
  getSmtpCredentials,
  saveSmtpCredentials,
  deleteSmtpCredentials,
  markSmtpVerified,
  testSmtpConnection,
  encryptPassword,
  decryptPassword,
  detectSmtpSettings,
  getAppPasswordHint,
  sendWelcomeEmail,
  updateSmtpFromName,
  runSmtpHealthChecks,
} from "./smtp";

import { encodeTrackingToken, wrapClickUrl, buildOpenPixel } from "./emailTracking";
import { bulkSenderRouter } from "./bulkSender";
import { authDiagnosticsRouter } from "./routers/authDiagnostics";
import { githubCleanupShowcaseRouter } from "./routers/githubCleanupShowcase";
import { passkeysRouter } from "./routers/passkeys";
import { recoveryDrillsRouter } from "./routers/recoveryDrills";
import { sourceOperationsRouter } from "./routers/sourceOperations";
import { revokeSecuritySessionFromRequest } from "./security/passkeySessions";
import { combineAccountsAsAdmin, deleteAccountAsAdmin } from "./accountManagement";
import {
  COMPLIMENTARY_ACCESS_LIMITS,
  ComplimentaryAccessConflictError,
  ComplimentaryAccessNotFoundError,
  createComplimentaryAccessGrant,
  findActiveComplimentaryAccess,
  listComplimentaryAccessGrants,
  lookupComplimentaryAccessByEmail,
  revokeComplimentaryAccessGrant,
} from "./complimentaryAccess";
import { buildSmtpAuditCsv, buildSmtpAuditCsvFilename, buildSmtpAuditWhere } from "./smtpAdminAudit";
import {
  connectKoalendar,
  disconnectKoalendar,
  getKoalendarConnectionStatus,
  listFailedKoalendarBookings,
  retryFailedKoalendarBooking,
  rotateKoalendarWebhook,
} from "./koalendar";
import crypto from "crypto";

const smtpAuditFilterShape = {
  dateFrom: z.number().int().nonnegative().optional(),
  dateTo: z.number().int().nonnegative().optional(),
  adminId: z.number().int().positive().optional(),
  outcome: z.enum(["all", "removed"]).default("all"),
};

const validateSmtpAuditDateRange = (value: { dateFrom?: number; dateTo?: number }) =>
  value.dateFrom === undefined || value.dateTo === undefined || value.dateFrom <= value.dateTo;

// ── Unsubscribe token helpers ────────────────────────────────────────────────

function getUnsubscribeSigningSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("UNSUBSCRIBE_SIGNING_SECRET must contain at least 32 characters");
  }
  return secret;
}

function unsubSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function safeSignatureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

/** Generate a signed unsubscribe token: base64url(contactType:id:userId:sig) */
export function buildUnsubToken(contactType: "contact" | "woo", id: number, userId: number): string {
  const payload = `${contactType}:${id}:${userId}`;
  const sig = unsubSignature(payload, getUnsubscribeSigningSecret());
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/** Verify and decode an unsubscribe token. Returns null if invalid. */
export function verifyUnsubToken(token: string): { contactType: "contact" | "woo"; id: number; userId: number } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length !== 4) return null;
    const [contactType, idStr, userIdStr, sig] = parts;
    if (contactType !== "contact" && contactType !== "woo") return null;
    const payload = `${contactType}:${idStr}:${userIdStr}`;
    const id = Number.parseInt(idStr, 10);
    const userId = Number.parseInt(userIdStr, 10);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(userId) || userId <= 0) return null;

    const primaryExpected = unsubSignature(payload, getUnsubscribeSigningSecret());
    const primaryValid = safeSignatureEqual(sig, primaryExpected);
    const legacySecret = process.env.JWT_SECRET;
    const legacyValid = !primaryValid && sig.length === 16 && Boolean(legacySecret) && safeSignatureEqual(
      sig,
      unsubSignature(payload, legacySecret!).slice(0, 16),
    );
    if (!primaryValid && !legacyValid) return null;
    return { contactType, id, userId };
  } catch {
    return null;
  }
}

/** Build the full unsubscribe URL for a contact or woo customer */
export function buildUnsubUrl(contactType: "contact" | "woo", id: number, userId: number): string {
  const token = buildUnsubToken(contactType, id, userId);
  const base = process.env.APP_BASE_URL ?? "https://getphame.app";
  return `${base}/unsubscribe?token=${token}`;
}

/** Enforce 10 initial sends, then 5 sends per rolling 30-day window. */
async function enforceFreeLimit(userId: number, tier: string) {
  const decision = await evaluateFreeQuotaAccess(userId, tier);
  if (!decision.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: formatFreeQuotaBlockedMessage(decision.quota, FREE_LIMIT_ERR_MSG),
    });
  }
}

const avatarMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const avatarExtensions: Record<(typeof avatarMimeTypes)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isValidAvatarSignature(data: Buffer, mimeType: (typeof avatarMimeTypes)[number]) {
  if (mimeType === "image/jpeg") return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mimeType === "image/png") return data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
}

type SupportTicketAlertInput = {
  ticketId: number;
  recipientUserIds: number[];
  actorUserId: number;
  type: (typeof SUPPORT_TICKET_ALERT_TYPES)[number];
  /** For SLA breaches, keep one alert per recipient for the active target window. */
  dedupSince?: Date;
};

/**
 * Persist only recipient-scoped operational events. This never copies customer
 * message, attachment, or email data into an alert record.
 */
async function queueSupportTicketAlerts(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: SupportTicketAlertInput,
) {
  const recipientUserIds = Array.from(new Set(input.recipientUserIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (recipientUserIds.length === 0) return;

  const createdAfter = new Date(Date.now() - SUPPORT_TICKET_ALERT_DEDUP_WINDOW_MS);
  const recipientsWithoutRecentUnreadAlert: number[] = [];

  for (const recipientUserId of recipientUserIds) {
    const [existingAlert] = await db.select({ id: supportTicketAlerts.id })
      .from(supportTicketAlerts)
      .where(input.type === "sla_breach"
        ? and(
          eq(supportTicketAlerts.ticketId, input.ticketId),
          eq(supportTicketAlerts.recipientUserId, recipientUserId),
          eq(supportTicketAlerts.type, input.type),
          gte(supportTicketAlerts.createdAt, input.dedupSince ?? createdAfter),
        )
        : and(
          eq(supportTicketAlerts.ticketId, input.ticketId),
          eq(supportTicketAlerts.recipientUserId, recipientUserId),
          eq(supportTicketAlerts.type, input.type),
          isNull(supportTicketAlerts.readAt),
          gte(supportTicketAlerts.createdAt, createdAfter),
        ))
      .limit(1);
    if (!existingAlert) recipientsWithoutRecentUnreadAlert.push(recipientUserId);
  }

  if (recipientsWithoutRecentUnreadAlert.length === 0) return;

  await db.insert(supportTicketAlerts).values(
    recipientsWithoutRecentUnreadAlert.map((recipientUserId) => ({
      ticketId: input.ticketId,
      recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
    })),
  );
}

/** First response is the first confirmed administrator status transition or private note. */
async function recordSupportFirstResponse(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  ticketId: number,
) {
  await db.update(supportSubmissions)
    .set({ firstRespondedAt: new Date() })
    .where(and(
      eq(supportSubmissions.id, ticketId),
      isNull(supportSubmissions.firstRespondedAt),
    ));
}

type SupportMetricsPeriod = "7" | "30" | "90";
type SupportMetricsInput = {
  periodDays?: SupportMetricsPeriod;
  startDate?: string;
  endDate?: string;
};
type SupportMetricsSnapshot = {
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  isCustomRange: boolean;
  generatedAt: Date;
  ticketsCreated: number;
  resolvedTickets: number;
  openTickets: number;
  firstResponseCount: number;
  avgFirstResponseMs: number | null;
  avgResolutionMs: number | null;
  overdueTickets: number;
};

const supportMetricsInputSchema = z.object({
  periodDays: z.enum(["7", "30", "90"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid start date.").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid end date.").optional(),
}).superRefine((value, issueContext) => {
  const hasCustomRange = Boolean(value.startDate || value.endDate);
  if (hasCustomRange && (!value.startDate || !value.endDate)) {
    issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Choose both a start and end date for a custom report." });
  }
  if (hasCustomRange && value.periodDays) {
    issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["periodDays"], message: "Choose either a preset period or a custom date range." });
  }
});

function parseSupportReportDay(value: string, field: "start" | "end"): Date {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, field === "end" ? 23 : 0, field === "end" ? 59 : 0, field === "end" ? 59 : 0, field === "end" ? 999 : 0));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Choose a valid ${field} date for the support report.` });
  }
  return parsed;
}

function resolveSupportMetricsRange(input?: SupportMetricsInput) {
  const generatedAt = new Date();
  if (input?.startDate && input.endDate) {
    const periodStart = parseSupportReportDay(input.startDate, "start");
    const periodEnd = parseSupportReportDay(input.endDate, "end");
    if (periodEnd.getTime() < periodStart.getTime()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The report end date must be on or after its start date." });
    }
    const periodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (periodDays > MAX_SUPPORT_EXPORT_RANGE_DAYS) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Choose a range of ${MAX_SUPPORT_EXPORT_RANGE_DAYS} days or fewer.` });
    }
    return {
      generatedAt,
      periodStart,
      periodEnd,
      periodDays,
      periodLabel: `${input.startDate}_to_${input.endDate}`,
      isCustomRange: true,
    };
  }

  const periodDays = Number(input?.periodDays ?? "30");
  return {
    generatedAt,
    periodStart: new Date(generatedAt.getTime() - periodDays * 24 * 60 * 60 * 1000),
    periodEnd: generatedAt,
    periodDays,
    periodLabel: `last_${periodDays}_days`,
    isCustomRange: false,
  };
}

const MAX_ONBOARDING_FUNNEL_RANGE_DAYS = 366;
type OnboardingChecklistFunnelInput = {
  periodDays?: "7" | "30" | "90";
  startDate?: string;
  endDate?: string;
};
const onboardingChecklistFunnelInputSchema = z.object({
  periodDays: z.enum(["7", "30", "90"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid start date.").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid end date.").optional(),
}).strict().superRefine((value, issueContext) => {
  const hasCustomRange = Boolean(value.startDate || value.endDate);
  if (hasCustomRange && (!value.startDate || !value.endDate)) {
    issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Choose both a start and end date for the onboarding report." });
  }
  if (hasCustomRange && value.periodDays) {
    issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["periodDays"], message: "Choose either a preset period or a custom date range." });
  }
});

function parseOnboardingFunnelDay(value: string, field: "start" | "end"): Date {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, field === "end" ? 23 : 0, field === "end" ? 59 : 0, field === "end" ? 59 : 0, field === "end" ? 999 : 0));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Choose a valid ${field} date for the onboarding report.` });
  }
  return parsed;
}

function resolveOnboardingChecklistFunnelRange(input?: OnboardingChecklistFunnelInput) {
  const generatedAt = new Date();
  if (input?.startDate && input.endDate) {
    const periodStart = parseOnboardingFunnelDay(input.startDate, "start");
    const periodEnd = parseOnboardingFunnelDay(input.endDate, "end");
    if (periodEnd.getTime() < periodStart.getTime()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The onboarding report end date must be on or after its start date." });
    }
    const periodDays = Math.floor((periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (periodDays > MAX_ONBOARDING_FUNNEL_RANGE_DAYS) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Choose a range of ${MAX_ONBOARDING_FUNNEL_RANGE_DAYS} days or fewer.` });
    }
    return { generatedAt, periodStart, periodEnd, periodDays, periodLabel: `${input.startDate}_to_${input.endDate}`, isCustomRange: true };
  }

  const periodDays = Number(input?.periodDays ?? "30");
  return {
    generatedAt,
    periodStart: new Date(generatedAt.getTime() - periodDays * 24 * 60 * 60 * 1000),
    periodEnd: generatedAt,
    periodDays,
    periodLabel: `last_${periodDays}_days`,
    isCustomRange: false,
  };
}

async function getOnboardingChecklistFunnelSnapshot(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input?: OnboardingChecklistFunnelInput,
) {
  const range = resolveOnboardingChecklistFunnelRange(input);
  const rows = await db
    .select({ page: pageEvents.page, userId: pageEvents.userId, createdAt: pageEvents.createdAt })
    .from(pageEvents)
    .where(and(
      eq(pageEvents.utmSource, ONBOARDING_CHECKLIST_EVENT_SOURCE),
      gte(pageEvents.createdAt, range.periodStart),
      lte(pageEvents.createdAt, range.periodEnd),
    ));
  return { ...summarizeOnboardingChecklistEvents(rows, range.generatedAt.getTime()), range };
}

/**
 * Builds adjacent aggregate-only windows for a trustworthy period comparison.
 * No individual account activity leaves this helper or the admin procedure.
 */
async function getOnboardingChecklistFunnelComparison(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input?: OnboardingChecklistFunnelInput,
) {
  const range = resolveOnboardingChecklistFunnelRange(input);
  const periodDurationMs = range.periodEnd.getTime() - range.periodStart.getTime() + 1;
  const previousPeriodEnd = new Date(range.periodStart.getTime() - 1);
  const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDurationMs + 1);
  const rows = await db
    .select({ page: pageEvents.page, userId: pageEvents.userId, createdAt: pageEvents.createdAt })
    .from(pageEvents)
    .where(and(
      eq(pageEvents.utmSource, ONBOARDING_CHECKLIST_EVENT_SOURCE),
      gte(pageEvents.createdAt, previousPeriodStart),
      lte(pageEvents.createdAt, range.periodEnd),
    ));

  const currentRows = rows.filter((row) => row.createdAt.getTime() >= range.periodStart.getTime());
  const previousRows = rows.filter((row) => row.createdAt.getTime() <= previousPeriodEnd.getTime());
  const current = summarizeOnboardingChecklistEvents(currentRows, range.generatedAt.getTime());
  const previous = summarizeOnboardingChecklistEvents(previousRows, previousPeriodEnd.getTime());

  return {
    ...current,
    range,
    comparison: {
      previous: {
        ...previous,
        range: {
          periodStart: previousPeriodStart,
          periodEnd: previousPeriodEnd,
          periodDays: range.periodDays,
          periodLabel: `previous_${range.periodLabel}`,
          isCustomRange: range.isCustomRange,
        },
      },
    },
  };
}

async function getSupportMetricsSnapshot(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input?: SupportMetricsInput,
): Promise<SupportMetricsSnapshot> {
  const { generatedAt, periodStart, periodEnd, periodDays, periodLabel, isCustomRange } = resolveSupportMetricsRange(input);
  const [metrics] = await db.select({
    ticketsCreated: count(supportSubmissions.id),
    resolvedTickets: sql<number>`COALESCE(SUM(CASE WHEN ${supportSubmissions.resolvedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
    openTickets: sql<number>`COALESCE(SUM(CASE WHEN ${supportSubmissions.status} <> 'resolved' THEN 1 ELSE 0 END), 0)`,
    firstResponseCount: sql<number>`COALESCE(SUM(CASE WHEN ${supportSubmissions.firstRespondedAt} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
    avgFirstResponseMs: sql<number | null>`AVG(CASE WHEN ${supportSubmissions.firstRespondedAt} IS NOT NULL THEN TIMESTAMPDIFF(SECOND, ${supportSubmissions.createdAt}, ${supportSubmissions.firstRespondedAt}) * 1000 ELSE NULL END)`,
    avgResolutionMs: sql<number | null>`AVG(CASE WHEN ${supportSubmissions.resolvedAt} IS NOT NULL THEN TIMESTAMPDIFF(SECOND, ${supportSubmissions.createdAt}, ${supportSubmissions.resolvedAt}) * 1000 ELSE NULL END)`,
    overdueTickets: sql<number>`COALESCE(SUM(CASE WHEN ${supportSubmissions.status} <> 'resolved' AND ${supportSubmissions.slaTargetAt} IS NOT NULL AND ${supportSubmissions.slaTargetAt} < ${generatedAt} THEN 1 ELSE 0 END), 0)`,
  })
    .from(supportSubmissions)
    .where(and(gte(supportSubmissions.createdAt, periodStart), lte(supportSubmissions.createdAt, periodEnd)));

  const asCount = (value: unknown) => Number(value ?? 0);
  const asDuration = (value: unknown) => value === null || value === undefined ? null : Math.round(Number(value));
  return {
    periodDays,
    periodStart,
    periodEnd,
    periodLabel,
    isCustomRange,
    generatedAt,
    ticketsCreated: asCount(metrics?.ticketsCreated),
    resolvedTickets: asCount(metrics?.resolvedTickets),
    openTickets: asCount(metrics?.openTickets),
    firstResponseCount: asCount(metrics?.firstResponseCount),
    avgFirstResponseMs: asDuration(metrics?.avgFirstResponseMs),
    avgResolutionMs: asDuration(metrics?.avgResolutionMs),
    overdueTickets: asCount(metrics?.overdueTickets),
  };
}

type SupportEscalationPolicySettings = {
  breachThresholdMinutes: number;
  includeAssignee: boolean;
  includeAllAdminsWhenUnassigned: boolean;
  recipientUserIds: number[];
};

const defaultSupportEscalationPolicy: SupportEscalationPolicySettings = {
  breachThresholdMinutes: 0,
  includeAssignee: true,
  includeAllAdminsWhenUnassigned: true,
  recipientUserIds: [],
};

async function getSupportEscalationPolicySettings(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<SupportEscalationPolicySettings> {
  const [policy] = await db.select({
    id: supportEscalationPolicies.id,
    breachThresholdMinutes: supportEscalationPolicies.breachThresholdMinutes,
    includeAssignee: supportEscalationPolicies.includeAssignee,
    includeAllAdminsWhenUnassigned: supportEscalationPolicies.includeAllAdminsWhenUnassigned,
  })
    .from(supportEscalationPolicies)
    .where(eq(supportEscalationPolicies.policyKey, SUPPORT_ESCALATION_POLICY_KEY))
    .limit(1);
  if (!policy) return defaultSupportEscalationPolicy;

  const recipients = await db.select({ recipientUserId: supportEscalationPolicyRecipients.recipientUserId })
    .from(supportEscalationPolicyRecipients)
    .where(eq(supportEscalationPolicyRecipients.policyId, policy.id));
  return {
    breachThresholdMinutes: policy.breachThresholdMinutes,
    includeAssignee: policy.includeAssignee,
    includeAllAdminsWhenUnassigned: policy.includeAllAdminsWhenUnassigned,
    recipientUserIds: recipients.map((recipient) => recipient.recipientUserId),
  };
}

export const appRouter = router({
  system: systemRouter,
  authDiagnostics: authDiagnosticsRouter,
  githubCleanupShowcase: githubCleanupShowcaseRouter,
  passkeys: passkeysRouter,
  recoveryDrills: recoveryDrillsRouter,
  sources: sourceOperationsRouter,
  helpAssistant: helpAssistantRouter,

  /** Paid Koalendar booking-to-contact integration. */
  koalendar: router({
    status: paidProcedure.query(async ({ ctx }) => getKoalendarConnectionStatus(ctx.user.id)),
    connect: paidProcedure.mutation(async ({ ctx }) => connectKoalendar(ctx.user.id)),
    rotateWebhook: paidProcedure.mutation(async ({ ctx }) => rotateKoalendarWebhook(ctx.user.id)),
    disconnect: paidProcedure.mutation(async ({ ctx }) => disconnectKoalendar(ctx.user.id)),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await revokeSecuritySessionFromRequest(ctx.req);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  accountProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getAccountProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Account profile not found" });
      const avatar = profile.avatarKey ? await storageGet(profile.avatarKey) : null;
      return {
        name: profile.name,
        email: profile.email,
        avatarUrl: avatar?.url ?? null,
        avatarMimeType: profile.avatarMimeType,
        avatarUpdatedAt: profile.avatarUpdatedAt,
      };
    }),
    update: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(80) }))
      .mutation(async ({ ctx, input }) => {
        await updateAccountProfile(ctx.user.id, { name: input.name });
        return { success: true as const };
      }),
    uploadAvatar: protectedProcedure
      .input(z.object({
        mimeType: z.enum(avatarMimeTypes),
        dataBase64: z.string().min(4).max(4_200_000),
      }))
      .mutation(async ({ ctx, input }) => {
        const data = Buffer.from(input.dataBase64, "base64");
        if (data.length === 0 || data.length > 3 * 1024 * 1024 || !isValidAvatarSignature(data, input.mimeType)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a valid JPG, PNG, or WebP image up to 3 MB." });
        }
        const extension = avatarExtensions[input.mimeType];
        const key = `avatars/${ctx.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        await storagePut(key, data, input.mimeType);
        const updatedAt = new Date();
        await updateAccountProfile(ctx.user.id, {
          avatarKey: key,
          avatarMimeType: input.mimeType,
          avatarUpdatedAt: updatedAt,
        });
        const avatar = await storageGet(key);
        return { success: true as const, avatarUrl: avatar.url, avatarUpdatedAt: updatedAt };
      }),
    removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
      await updateAccountProfile(ctx.user.id, {
        avatarKey: null,
        avatarMimeType: null,
        avatarUpdatedAt: null,
      });
      return { success: true as const };
    }),
  }),

  smtp: router({
    /** Return connection status without exposing credentials */
    status: protectedProcedure.query(async ({ ctx }) => {
      const creds = await getSmtpCredentials(ctx.user.id);
      if (!creds) return { connected: false, email: null, fromName: null, replyTo: null, verified: false, lastHealthCheck: null, lastHealthStatus: null, lastHealthError: null };
      return {
        connected: true,
        email: creds.user,
        fromName: creds.fromName ?? null,
        replyTo: creds.replyTo ?? null,
        verified: creds.verified === 1,
        lastHealthCheck: creds.lastHealthCheck ?? null,
        lastHealthStatus: creds.lastHealthStatus ?? null,
        lastHealthError: creds.lastHealthError ?? null,
      };
    }),

    /** Detect SMTP settings from email domain */
    detect: protectedProcedure
      .input(z.object({ email: z.string().email(), host: z.string().optional() }))
      .query(({ input }) => {
        const detected = detectSmtpSettings(input.email);
        const hint = getAppPasswordHint(input.email, input.host);
        return { detected, hint };
      }),

    /** Test SMTP credentials without saving — used by wizard Test Connection button */
    testCredentials: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
          host: z.string().min(1),
          port: z.number().int().min(1).max(65535),
          secure: z.number().int().min(0).max(1),
        })
      )
      .mutation(async ({ input }) => {
        const result = await testSmtpConnection({
          host: input.host,
          port: input.port,
          secure: input.secure === 1,
          user: input.email,
          pass: input.password,
        });
        return result;
      }),

    /** Save credentials and verify the connection */
    connect: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1),
          host: z.string().min(1),
          port: z.number().int().min(1).max(65535),
          secure: z.number().int().min(0).max(1),
          fromName: z.string().max(255).optional(),
          replyTo: z.string().email().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Test connection before saving
        const test = await testSmtpConnection({
          host: input.host,
          port: input.port,
          secure: input.secure === 1,
          user: input.email,
          pass: input.password,
        });
        if (!test.ok) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: test.error ?? "Could not connect to email server. Check your credentials and try again.",
          });
        }
        await saveSmtpCredentials(ctx.user.id, {
          host: input.host,
          port: input.port,
          secure: input.secure,
          user: input.email,
          password: input.password,
          fromName: input.fromName,
          replyTo: input.replyTo || undefined,
        });
        await markSmtpVerified(ctx.user.id);

        // Send welcome/confirmation email to the user's own address.
        // Fire-and-forget — don't let a welcome email failure block the connect response.
        sendWelcomeEmail(ctx.user.id).catch((err) =>
          console.warn("[smtp.connect] Welcome email failed (non-fatal):", err)
        );

        return { success: true, email: input.email };
      }),

    /** Remove stored SMTP credentials */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteSmtpCredentials(ctx.user.id);
      return { success: true };
    }),

    /** Re-test the stored SMTP connection and return live status */
    test: protectedProcedure.mutation(async ({ ctx }) => {
      const creds = await getSmtpCredentials(ctx.user.id);
      if (!creds) return { ok: false, error: "No email account connected." };
      const pass = decryptPassword(creds.encryptedPass);
      const result = await testSmtpConnection({
        host: creds.host,
        port: creds.port,
        secure: creds.secure === 1,
        user: creds.user,
        pass,
      });
      if (result.ok) {
        await markSmtpVerified(ctx.user.id);
      }
      return result;
    }),

    /** Update only the sender display name without changing credentials */
    updateFromName: protectedProcedure
      .input(z.object({ fromName: z.string().max(100) }))
      .mutation(async ({ ctx, input }) => {
        const creds = await getSmtpCredentials(ctx.user.id);
        if (!creds) throw new TRPCError({ code: "NOT_FOUND", message: "No email account connected." });
        await updateSmtpFromName(ctx.user.id, input.fromName || null);
        return { success: true };
      }),

    /** Update only the reply-to address without changing credentials */
    updateReplyTo: protectedProcedure
      .input(z.object({ replyTo: z.string().email().optional().or(z.literal("")) }))
      .mutation(async ({ ctx, input }) => {
        const creds = await getSmtpCredentials(ctx.user.id);
        if (!creds) throw new TRPCError({ code: "NOT_FOUND", message: "No email account connected." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db
          .update(smtpCredentials)
          .set({ replyTo: input.replyTo || null })
          .where(eq(smtpCredentials.userId, ctx.user.id));
        return { success: true };
      }),

    /** Re-send the welcome/confirmation email to the user's own address */
    sendWelcome: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await sendWelcomeEmail(ctx.user.id);
      if (!result.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to send confirmation email.",
        });
      }
      return { success: true };
    }),

    /** Return rendered HTML preview of the review request email using real profile data */
    previewEmail: protectedProcedure.query(async ({ ctx }) => {
      const { buildReviewRequestEmail } = await import("./emailTemplates");
      const profile = await getBusinessProfile(ctx.user.id);
      const db = await getDb();
      let reviewUrl = "https://g.page/r/example";
      if (db) {
        const { reviewPlatforms } = await import("../drizzle/schema");
        const { eq: eqOp, and } = await import("drizzle-orm");
        const [defaultPlatform] = await db
          .select({ url: reviewPlatforms.url })
          .from(reviewPlatforms)
          .where(and(eqOp(reviewPlatforms.userId, ctx.user.id), eqOp(reviewPlatforms.isDefault, 1)))
          .limit(1);
        const [anyPlatform] = !defaultPlatform
          ? await db
              .select({ url: reviewPlatforms.url })
              .from(reviewPlatforms)
              .where(eqOp(reviewPlatforms.userId, ctx.user.id))
              .limit(1)
          : [null];
        reviewUrl = defaultPlatform?.url ?? anyPlatform?.url ?? reviewUrl;
      }
      const html = buildReviewRequestEmail({
        customerName: "Alex Johnson",
        businessName: profile?.businessName || "Your Business",
        reviewUrl,
        showPoweredBy: !profile || profile.tier === 'free',
      });
      return { html, businessName: profile?.businessName || "Your Business", reviewUrl };
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getBusinessProfile(ctx.user.id);
      if (!profile) return null;
      const freeQuota = await getFreeQuotaSummary(ctx.user.id);
      const complimentaryAccess = ctx.user.role === "admin"
        ? null
        : await findActiveComplimentaryAccess({ userId: ctx.user.id, email: ctx.user.email });
      const tier = getEffectiveTier(profile.tier, ctx.user.role);
      return {
        ...profile,
        tier,
        hasPaidAccess: hasPaidOrAdminAccess({
          role: ctx.user.role,
          tier,
          planExpiresAt: profile.planExpiresAt,
          complimentaryAccessExpiresAt: complimentaryAccess?.expiresAt,
        }),
        complimentaryAccessExpiresAt: complimentaryAccess?.expiresAt ?? null,
        totalSent: freeQuota.totalSent,
        freeQuota,
      };
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          businessName: z.string().min(1),
          reviewLink: z.string().url(),
          tier: z.enum(["free", "pro"]).optional(),
          fromName: z.string().max(255).optional(),
          replyTo: z.string().email().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const existing = await getBusinessProfile(ctx.user.id);
        await upsertBusinessProfile({
          userId: ctx.user.id,
          businessName: input.businessName,
          reviewLink: input.reviewLink,
          tier: input.tier ?? existing?.tier ?? "free",
          monthlyCount: existing?.monthlyCount ?? 0,
          monthlyResetDate: existing?.monthlyResetDate ?? yearMonth,
          fromName: input.fromName ?? existing?.fromName ?? null,
          replyTo: input.replyTo ?? existing?.replyTo ?? null,
        });
        return getBusinessProfile(ctx.user.id);
      }),

    setGoal: protectedProcedure
      .input(z.object({ goal: z.number().int().min(0).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getBusinessProfile(ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        await upsertBusinessProfile({ ...existing, reviewGoal: input.goal });
        return { ok: true };
      }),

    setDailySendLimit: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getBusinessProfile(ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
        await upsertBusinessProfile({ ...existing, dailySendLimit: input.limit });
        return { ok: true };
      }),

    getReEngagementSettings: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [profile] = await db
        .select({ reEngagementEnabled: businessProfiles.reEngagementEnabled })
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, ctx.user.id));
      return { reEngagementEnabled: profile?.reEngagementEnabled ?? 1 };
    }),

    updateReEngagementSettings: protectedProcedure
      .input(z.object({ reEngagementEnabled: z.number().int().min(0).max(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        await db
          .update(businessProfiles)
          .set({ reEngagementEnabled: input.reEngagementEnabled })
          .where(eq(businessProfiles.userId, ctx.user.id));
        return { ok: true };
      }),
  }),

  stripe: router({
    /** Live Stripe promotion-code metadata, available only to administrators. */
    promotionMonitor: adminProcedure.query(async () => {
      try {
        return await listStripePromotionCodes();
      } catch (error) {
        console.error("[Stripe] Failed to load promotion-code monitor", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Stripe promotion data is temporarily unavailable. Please refresh in a moment.",
        });
      }
    }),

    /** Create a real Stripe coupon and customer-facing promotion code without storing a local mirror. */
    createPromotionCode: adminProcedure
      .input(z.object({
        code: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/),
        percentOff: z.number().positive().max(100),
        applicablePlans: z.array(z.enum(["monthly", "annual", "lifetime"])).min(1).max(3),
        firstTimeTransaction: z.boolean().default(false),
        expiresAt: z.number().int().positive().nullable().optional(),
        maxRedemptions: z.number().int().min(1).max(100_000).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createStripePromotionCode({ ...input, createdByUserId: ctx.user.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const safeInputError = [
            "Promotion codes must",
            "Percentage off must",
            "Select at least one",
            "Maximum redemptions must",
            "Expiration must",
            "A Stripe promotion code with this code already exists",
            "A selected Stripe plan is not linked",
          ].some((prefix) => message.startsWith(prefix));
          if (safeInputError) {
            throw new TRPCError({
              code: message.includes("already exists") ? "CONFLICT" : "BAD_REQUEST",
              message,
            });
          }
          console.error("[Stripe] Administrator promotion-code creation failed", error);
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "Stripe could not create this promotion code. Please retry or review Stripe configuration.",
          });
        }
      }),

    /** Create a Stripe Checkout Session for the selected plan */
    createCheckout: protectedProcedure
      .input(z.object({
        origin: z.string(),
        plan: z.enum(["monthly", "annual", "lifetime"]).default("monthly"),
        promotionCode: z.string().trim().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId: profile?.stripeCustomerId ?? null,
          origin: input.origin,
          plan: input.plan,
          promotionCode: input.promotionCode ?? null,
        });
        return { url };
      }),

    /** Create a Stripe Checkout Session in THB with PromptPay enabled (Thailand users) */
    createThbCheckout: protectedProcedure
      .input(z.object({
        origin: z.string(),
        plan: z.enum(["monthly", "annual", "lifetime"]).default("monthly"),
        promotionCode: z.string().trim().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        const url = await createThbCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId: profile?.stripeCustomerId ?? null,
          origin: input.origin,
          plan: input.plan,
          promotionCode: input.promotionCode ?? null,
        });
        return { url };
      }),

    /** Create a Stripe Billing Portal session to manage subscription */
    createPortal: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile?.stripeCustomerId) {
          throw new Error("No active subscription found.");
        }
        const url = await createPortalSession(profile.stripeCustomerId, input.origin);
        return { url };
      }),

    /** Get current subscription status for the user */
    subscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
      const rows = await db
        .select()
        .from(stripeSubscriptions)
        .where(eq(stripeSubscriptions.userId, ctx.user.id))
        .limit(1);
      if (rows.length === 0) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
      const sub = rows[0];
      try {
        const snapshot = await getSubscriptionSnapshot(sub.stripeSubscriptionId);
        return {
          active: snapshot.status === "active" || snapshot.status === "trialing" || snapshot.status === "lifetime",
          status: snapshot.status,
          subscriptionId: sub.stripeSubscriptionId,
          currentPeriodEnd: snapshot.currentPeriodEnd,
          cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
        };
      } catch (error) {
        console.warn("[Stripe] Failed to refresh subscription status; using stored status", error);
        const profile = await getBusinessProfile(ctx.user.id);
        return {
          active: sub.status === "active" || sub.status === "lifetime",
          status: sub.status,
          subscriptionId: sub.stripeSubscriptionId,
          currentPeriodEnd: profile?.planExpiresAt ?? null,
          cancelAtPeriodEnd: false,
        };
      }
    }),

    /** Server-authoritative seven-day refund eligibility for the signed-in Stripe customer. */
    guaranteeStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const profile = await getBusinessProfile(ctx.user.id);
      const rows = await db
        .select()
        .from(stripeSubscriptions)
        .where(eq(stripeSubscriptions.userId, ctx.user.id))
        .limit(1);
      return getMoneyBackGuaranteeStatus({
        stripeCustomerId: profile?.stripeCustomerId ?? null,
        stripeSubscriptionId: rows[0]?.stripeSubscriptionId ?? null,
      });
    }),

    /** Issue a full Stripe refund, then end the subscription. */
    claimGuarantee: protectedProcedure
      .input(z.object({ confirmation: z.literal("REFUND_AND_CANCEL") }))
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const profile = await getBusinessProfile(ctx.user.id);
        const rows = await db
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.userId, ctx.user.id))
          .limit(1);
        const stripeCustomerId = profile?.stripeCustomerId;
        const stripeSubscriptionId = rows[0]?.stripeSubscriptionId;
        if (!stripeCustomerId || !stripeSubscriptionId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe subscription was found for this account." });
        }

        try {
          const result = await claimMoneyBackGuarantee({
            userId: ctx.user.id,
            stripeCustomerId,
            stripeSubscriptionId,
          });
          await Promise.all([
            db
              .update(businessProfiles)
              .set({ tier: "free", planExpiresAt: null, updatedAt: new Date() })
              .where(eq(businessProfiles.userId, ctx.user.id)),
            db
              .update(stripeSubscriptions)
              .set({ status: "canceled", updatedAt: new Date() })
              .where(eq(stripeSubscriptions.userId, ctx.user.id)),
          ]);
          return result;
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "The refund could not be completed.",
          });
        }
      }),

    /** Stop the next renewal without refunding the current paid period. */
    cancelRenewal: protectedProcedure
      .input(z.object({ confirmation: z.literal("CANCEL_RENEWAL") }))
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const profile = await getBusinessProfile(ctx.user.id);
        const rows = await db
          .select()
          .from(stripeSubscriptions)
          .where(eq(stripeSubscriptions.userId, ctx.user.id))
          .limit(1);
        const stripeCustomerId = profile?.stripeCustomerId;
        const stripeSubscriptionId = rows[0]?.stripeSubscriptionId;
        if (!stripeCustomerId || !stripeSubscriptionId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe subscription was found for this account." });
        }
        try {
          return await cancelSubscriptionRenewal(stripeCustomerId, stripeSubscriptionId);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "The subscription could not be canceled.",
          });
        }
      }),
  }),

  woo: router({
    /** Get saved WooCommerce credentials (secrets redacted) */
    getCredentials: protectedProcedure.query(async ({ ctx }) => {
      const creds = await getWooCredentials(ctx.user.id);
      if (!creds) return null;
      return {
        storeUrl: creds.storeUrl,
        consumerKey: creds.consumerKey.slice(0, 8) + "...",
        lastSyncedAt: creds.lastSyncedAt,
        lastSyncCount: creds.lastSyncCount ?? 0,
      };
    }),

    /** Save WooCommerce credentials */
    saveCredentials: protectedProcedure
      .input(
        z.object({
          storeUrl: z.string().url(),
          consumerKey: z.string().min(1),
          consumerSecret: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertWooCredentials({
          userId: ctx.user.id,
          storeUrl: input.storeUrl.replace(/\/$/, ""),
          consumerKey: input.consumerKey,
          consumerSecret: input.consumerSecret,
        });
        return { success: true };
      }),

    /** Sync orders from WooCommerce and return counts */
    sync: protectedProcedure
      .input(z.object({ days: z.number().int().min(1).max(90).default(30) }))
      .mutation(async ({ ctx, input }) => {
        // Fetch orders and stage them in woo_pending_imports (hold-until-import logic)
        const creds = await getWooCredentials(ctx.user.id);
        if (!creds) throw new TRPCError({ code: "BAD_REQUEST", message: "WooCommerce credentials not configured." });
        const orders = await fetchWooOrders(creds.storeUrl, creds.consumerKey, creds.consumerSecret, input.days);
        const { stageWooOrders } = await import("./wooImportScheduler");
        const staged = await stageWooOrders(ctx.user.id, orders);
        // Write a sync log entry and update lastSyncedAt / lastSyncCount on credentials
        const db = await getDb();
        if (db) {
          await db.insert(wooSyncLogs).values({
            userId: ctx.user.id,
            syncedAt: Date.now(),
            daysWindow: input.days,
            added: staged.staged,
            total: orders.length,
            storeUrl: creds.storeUrl,
          });
          // Update the timestamp and staged count so the UI can show "Last synced X ago · Y orders staged"
          await db
            .update(wooCredentials)
            .set({ lastSyncedAt: Date.now(), lastSyncCount: staged.staged })
            .where(eq(wooCredentials.userId, ctx.user.id));
        }
        return { added: staged.staged, total: orders.length, staged: staged.staged, skipped: staged.skipped };
      }),

    /** Return the last 20 sync log entries for the current user */
    syncHistory: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { desc } = await import("drizzle-orm");
      return db
        .select()
        .from(wooSyncLogs)
        .where(eq(wooSyncLogs.userId, ctx.user.id))
        .orderBy(desc(wooSyncLogs.syncedAt))
        .limit(20);
    }),

    /** List pending customers (not yet sent a review request) */
    listPending: protectedProcedure.query(async ({ ctx }) => {
      return getPendingWooCustomers(ctx.user.id);
    }),

    /** List ALL customers (pending + already sent) */
    listAll: protectedProcedure.query(async ({ ctx }) => {
      return getAllWooCustomers(ctx.user.id);
    }),

    /** Manually mark a customer as Sent or Pending */
    setStatus: protectedProcedure
      .input(z.object({ customerId: z.number().int(), sent: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await setWooCustomerStatus(ctx.user.id, input.customerId, input.sent);
        return { ok: true };
      }),

    /** Bulk mark selected customers as Sent or Pending */
    bulkSetStatus: protectedProcedure
      .input(z.object({ customerIds: z.array(z.number().int()).min(1), sent: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await bulkSetWooCustomerStatus(ctx.user.id, input.customerIds, input.sent);
        return { ok: true, count: input.customerIds.length };
      }),

    /** Bulk send review requests to selected WooCommerce customers */
    bulkSend: protectedProcedure
      .input(z.object({ customerIds: z.array(z.number().int()).min(1), platformId: z.number().int().optional() }))
      .mutation(async ({ ctx, input }) => {
         const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new Error("Please complete your business profile first.");
        // Free-tier limit: 10 total sends, then subscription required
        await enforceFreeLimit(ctx.user.id, profile.tier);
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (profile.monthlyResetDate !== yearMonth) {
          await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
          profile.monthlyCount = 0;
          profile.monthlyResetDate = yearMonth;
        }
        // Fetch the selected customers
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { wooCustomers } = await import("../drizzle/schema");
        const { inArray, and, eq: eqOp, isNull } = await import("drizzle-orm");
        const customers = await db
          .select()
          .from(wooCustomers)
          .where(
            and(
              eqOp(wooCustomers.userId, ctx.user.id),
              inArray(wooCustomers.id, input.customerIds),
              isNull(wooCustomers.reviewRequestSentAt)
            )
          );

        // Filter out opted-out customers, then cap the batch at the adaptive provider/account allowance.
        const eligibleCustomers = customers.filter((c) => !c.optedOut);
        if (eligibleCustomers.length === 0) throw new Error("No eligible customers found (all may have unsubscribed).");
        const initialSendStatus = await getAdaptiveSendStatus(ctx.user.id);
        if (!initialSendStatus.configured) throw new Error("Connect an email account in Settings before sending review requests.");
        const toSend = eligibleCustomers.slice(0, initialSendStatus.remaining);
        const skippedDueToLimit = eligibleCustomers.length - toSend.length;
        if (toSend.length === 0) throw new AdaptiveSendLimitError(initialSendStatus);

        // Resolve review URL: use selected platform → default platform → legacy reviewLink
        let wooReviewUrl = profile.reviewLink ?? "";
        if (input.platformId) {
          const allPlatforms = await listReviewPlatforms(ctx.user.id);
          const selected = allPlatforms.find((p) => p.id === input.platformId);
          if (selected) wooReviewUrl = selected.url;
        } else {
          const wooDefaultPlatform = await getDefaultReviewPlatform(ctx.user.id);
          if (wooDefaultPlatform) wooReviewUrl = wooDefaultPlatform.url;
        }

        const subject = `${profile.businessName} would love your feedback!`;
        const sentIds: number[] = [];
        const errors: string[] = [];
        const sentRequests: { customerRequestId: number; customerName: string; customerEmail: string }[] = [];

        for (const customer of toSend) {
          const unsubUrl = buildUnsubUrl("woo", customer.id, ctx.user.id);
          const htmlBody = buildReviewRequestEmail({
            customerName: customer.customerName,
            businessName: profile.businessName,
            reviewUrl: wooReviewUrl,
            productName: customer.productName ?? null,
            unsubscribeUrl: unsubUrl,
            showPoweredBy: profile.tier === 'free',
          });
          try {
            await sendMailViaSmtp({ userId: ctx.user.id, to: customer.customerEmail, subject, html: htmlBody });
            sentIds.push(customer.id);
            const wooReqId = await createCustomerRequest({
              userId: ctx.user.id,
              customerName: customer.customerName,
              customerEmail: customer.customerEmail,
              method: "email",
              status: "sent",
              platformId: input.platformId ?? null,
              emailSubject: subject,
              emailBody: htmlBody,
            });
            sentRequests.push({ customerRequestId: wooReqId, customerName: customer.customerName, customerEmail: customer.customerEmail });
          } catch (err) {
            errors.push(`${customer.customerEmail}: ${(err as Error).message}`);
          }
        }

        if (sentIds.length > 0) {
          await markWooCustomersSent(ctx.user.id, sentIds);
          await upsertBusinessProfile({
            ...profile,
            monthlyCount: profile.monthlyCount + sentIds.length,
          });
        }

        return {
          sent: sentIds.length,
          errors,
          sentRequests,
          skippedDueToLimit,
          sendLimitStatus: await getAdaptiveSendStatus(ctx.user.id),
        };
      }),

    /** Count pending WooCommerce imports waiting for user action */
    pendingCount: protectedProcedure.query(async ({ ctx }) => {
      const { getPendingWooImportCount } = await import("./wooImportScheduler");
      return { count: await getPendingWooImportCount(ctx.user.id) };
    }),
    /** Import all pending WooCommerce orders now */
    importPending: protectedProcedure.mutation(async ({ ctx }) => {
      const { importPendingWooOrders } = await import("./wooImportScheduler");
      return importPendingWooOrders(ctx.user.id);
    }),
    /** Dismiss all pending WooCommerce orders without importing */
    dismissPending: protectedProcedure.mutation(async ({ ctx }) => {
      const { dismissPendingWooOrders } = await import("./wooImportScheduler");
      await dismissPendingWooOrders(ctx.user.id);
      return { ok: true };
    }),
    /**
     * Return send history for a specific WooCommerce customer — all customer_requests rows
     * linked to this customer's email address, ordered newest first.
     */
    sendHistory: protectedProcedure
      .input(z.object({ customerId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const { wooCustomers } = await import("../drizzle/schema");
        const { and: andW, eq: eqW, desc: descW } = await import("drizzle-orm");
        // Look up the woo customer to get their email
        const rows = await db
          .select({ email: wooCustomers.customerEmail })
          .from(wooCustomers)
          .where(andW(eqW(wooCustomers.userId, ctx.user.id), eqW(wooCustomers.id, input.customerId)));
        if (rows.length === 0) return [];
        const email = rows[0].email;
        const history = await db
          .select({
            id: customerRequests.id,
            sentAt: customerRequests.sentAt,
            status: customerRequests.status,
            respondedAt: customerRequests.respondedAt,
            platformId: customerRequests.platformId,
          })
          .from(customerRequests)
          .where(andW(eqW(customerRequests.userId, ctx.user.id), eqW(customerRequests.customerEmail, email)))
          .orderBy(descW(customerRequests.sentAt));
        const platforms = await listReviewPlatforms(ctx.user.id);
        const platformMap = new Map(platforms.map((p) => [p.id, p]));
        return history.map((r) => ({
          ...r,
          platformLabel: r.platformId ? (platformMap.get(r.platformId)?.label ?? platformMap.get(r.platformId)?.platform ?? null) : null,
          sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : String(r.sentAt),
        }));
      }),
  }),
  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listSavedContacts(ctx.user.id);
    }),

    naturalSearch: protectedProcedure
      .input(z.object({
        query: z.string().trim().min(3).max(300),
        locale: z.enum(CONTACT_SEARCH_LOCALES).default("en"),
      }))
      .mutation(async ({ ctx, input }) => {
        enforceContactSearchRateLimit(ctx.user.id);
        const contacts = await listSavedContacts(ctx.user.id);
        return runNaturalContactSearch({ ...input, contacts });
      }),

    prepareExport: protectedProcedure
      .input(z.object({
        contactIds: z.array(z.number().int().positive()).min(1).max(CONTACT_CSV_EXPORT_LIMIT),
        format: z.enum(["csv", "pdf"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const contacts = await listSavedContacts(ctx.user.id);
        return buildContactExportSnapshot({
          contacts,
          requestedIds: input.contactIds,
          format: input.format,
        });
      }),

    getDailyStatus: protectedProcedure.query(async ({ ctx }) => {
      return getAdaptiveSendStatus(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createSavedContact(ctx.user.id, input);
        return { ok: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int(), name: z.string().min(1), email: z.string().email(), phone: z.string().optional(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateSavedContact(ctx.user.id, input.id, input);
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSavedContact(ctx.user.id, input.id);
        return { ok: true };
      }),

    markSent: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await markContactSent(ctx.user.id, input.id);
        return { ok: true };
      }),
    setTags: protectedProcedure
      .input(z.object({ id: z.number().int(), tags: z.array(z.string().max(50)).max(20) }))
      .mutation(async ({ ctx, input }) => {
        await setContactTags(ctx.user.id, input.id, input.tags);
        return { ok: true };
      }),
    importCSV: protectedProcedure
      .input(
        z.object({
          rows: z.array(
            z.object({
              name: z.string().min(1),
              email: z.string().email(),
              phone: z.string().optional(),
              notes: z.string().optional(),
            })
          ).min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await importContacts(ctx.user.id, input.rows);
        return result;
      }),

    bulkSend: protectedProcedure
      .input(
        z.object({
          contactIds: z.array(z.number().int()).min(1).max(200),
          templateId: z.number().int().optional(),
          platformId: z.number().int().optional(), // optional: specific review platform to link to
        })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new Error("Please complete your business profile first.");
        // Free-tier limit: 10 total sends, then subscription required
        await enforceFreeLimit(ctx.user.id, profile.tier);
        // Reset monthly count if needed
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (profile.monthlyResetDate !== yearMonth) {
          await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
          profile.monthlyCount = 0;
          profile.monthlyResetDate = yearMonth;
        }
        // Resolve review URL: use selected platform, else default platform, else profile.reviewLink
        let reviewUrl = profile.reviewLink ?? "";
        let isYelpPlatform = false;
        if (input.platformId) {
          const platforms = await listReviewPlatforms(ctx.user.id);
          const chosen = platforms.find((p) => p.id === input.platformId);
          if (chosen) { reviewUrl = chosen.url; isYelpPlatform = chosen.platform === "yelp"; }
        } else {
          const defaultPlatform = await getDefaultReviewPlatform(ctx.user.id);
          if (defaultPlatform) { reviewUrl = defaultPlatform.url; isYelpPlatform = defaultPlatform.platform === "yelp"; }
        }

        // Fetch all contacts for this user and filter to requested IDs (skip opted-out)
        const allContacts = await listSavedContacts(ctx.user.id);
        const contactMap = new Map(allContacts.map((c) => [c.id, c]));
        const targets = (input.contactIds
          .map((id) => contactMap.get(id))
          .filter((c): c is NonNullable<typeof c> => Boolean(c))
          .filter((c) => !c.optedOut)) as typeof allContacts;

        // Adaptive provider-aware safety limit, with an account ceiling that provider changes cannot bypass.
        const initialSendStatus = await getAdaptiveSendStatus(ctx.user.id);
        if (!initialSendStatus.configured) throw new Error("Connect an email account in Settings before sending review requests.");
        const toSend = targets.slice(0, initialSendStatus.remaining);
        const skippedDueToLimit = targets.length - toSend.length;
        if (toSend.length === 0) {
          throw new AdaptiveSendLimitError(initialSendStatus);
        }

        // Resolve template
        const allTemplates = await listTemplates(ctx.user.id);
        const resolvedTemplate = input.templateId
          ? allTemplates.find((t) => t.id === input.templateId) ?? null
          : await getDefaultTemplate(ctx.user.id);
        // Build {{platformLinks}} — a formatted list of only the user's configured platforms
        const allUserPlatforms = await listReviewPlatforms(ctx.user.id);
        const platformLinksList = allUserPlatforms.length > 0
          ? allUserPlatforms.map((p) => {
              const label = p.label || (PLATFORM_LABELS as Record<string, string>)[p.platform] || p.platform;
              // Yelp: stored value is plain-text search instruction, not a URL — render as-is (no link)
              if (p.platform === "yelp") return `- ${label}: ${p.url}`;
              return `- ${label}: ${p.url}`;
            }).join("\n")
          : `- Leave a review: ${reviewUrl}`;
        const replacePlaceholders = (text: string, customerName: string) =>
          text
            .replace(/\{\{customer_name\}\}/g, customerName)
            .replace(/\{\{customerName\}\}/g, customerName)
            .replace(/\{\{business_name\}\}/g, profile.businessName)
            .replace(/\{\{businessName\}\}/g, profile.businessName)
            .replace(/\{\{review_link\}\}/g, reviewUrl)
            .replace(/\{\{reviewLink\}\}/g, reviewUrl)
            .replace(/\{\{platformLinks\}\}/g, platformLinksList);

        let sent = 0;
        let failed = 0;
        const errors: string[] = [];
        const sentRequests: { customerRequestId: number; customerName: string; customerEmail: string }[] = [];

        for (const contact of toSend) {
          try {
            let subject: string;
            let htmlBody: string;
            if (resolvedTemplate) {
              subject = replacePlaceholders(resolvedTemplate.subject, contact.name);
              htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body, contact.name).replace(/\n/g, "<br>")}</div>`;
            } else {
              subject = `${profile.businessName} would love your feedback!`;
              htmlBody = buildReviewRequestEmail({
                customerName: contact.name,
                businessName: profile.businessName,
                reviewUrl,
                isYelpInstruction: isYelpPlatform,
                unsubscribeUrl: buildUnsubUrl("contact", contact.id, ctx.user.id),
                showPoweredBy: profile.tier === 'free',
              });
            }
            // Create request row first to get its ID for tracking
            const bulkRequestId = await createCustomerRequest({
              userId: ctx.user.id,
              customerName: contact.name,
              customerEmail: contact.email,
              method: "email",
              status: "sent",
              platformId: input.platformId ?? null,
              emailSubject: subject,
              emailBody: htmlBody,
            });

            // Inject open pixel + click-tracking wrapper
            // Skip URL replacement for Yelp (plain-text instruction, not a URL)
            const bulkToken = encodeTrackingToken(bulkRequestId, ctx.user.id, resolvedTemplate?.id ?? null);
            const bulkBase = "https://getphame.app";
            const bulkPixel = buildOpenPixel(bulkToken, bulkBase);
            const trackedBulkHtml = isYelpPlatform
              ? htmlBody.replace(/<\/div>\s*$/, `${bulkPixel}</div>`)
              : (() => {
                  const trackedBulkUrl = wrapClickUrl(reviewUrl, bulkToken, bulkBase);
                  return htmlBody
                    .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedBulkUrl)
                    .replace(/<\/div>\s*$/, `${bulkPixel}</div>`);
                })();

            await sendMailViaSmtp({ userId: ctx.user.id, to: contact.email, subject, html: trackedBulkHtml });
            // Mark contact as sent
            const db = await import("./db").then((m) => m.getDb());
            if (db) {
              const { savedContacts } = await import("../drizzle/schema");
              const { and, eq } = await import("drizzle-orm");
              const [existing] = await db.select({ totalSent: savedContacts.totalSent }).from(savedContacts).where(and(eq(savedContacts.userId, ctx.user.id), eq(savedContacts.id, contact.id)));
              if (existing) {
                await db.update(savedContacts).set({ lastSentAt: Date.now(), totalSent: (existing.totalSent ?? 0) + 1 }).where(and(eq(savedContacts.userId, ctx.user.id), eq(savedContacts.id, contact.id)));
              }
            }
            sentRequests.push({ customerRequestId: bulkRequestId, customerName: contact.name, customerEmail: contact.email });
            sent++;
          } catch (err) {
            failed++;
            errors.push(`${contact.email}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Increment template usage counter once for the whole bulk send
        if (resolvedTemplate && sent > 0) {
          const dbT = await import("./db").then((m) => m.getDb());
          if (dbT) {
            const { emailTemplates: etTable } = await import("../drizzle/schema");
            const { eq: eqT, sql: sqlT } = await import("drizzle-orm");
            await dbT.update(etTable).set({ usageCount: sqlT`${etTable.usageCount} + ${sent}` }).where(eqT(etTable.id, resolvedTemplate.id));
          }
        }

        // Update monthly count
        await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + sent });

        return {
          sent,
          failed,
          skippedDueToLimit,
          errors,
          sentRequests,
          sendLimitStatus: await getAdaptiveSendStatus(ctx.user.id),
        };
      }),

    /**
     * Sync contacts from Stripe — fetches all Stripe customers for this user's Stripe account
     * and upserts them into saved_contacts (deduped by email against all existing contacts).
     * Only runs if the user has a stripeCustomerId (i.e., has used Stripe billing).
     */
    syncFromStripe: protectedProcedure.mutation(async ({ ctx }) => {
      const { stripe } = await import("./stripe");
      const profile = await getBusinessProfile(ctx.user.id);

      // Fetch all Stripe customers using the platform Stripe key (owner's account)
      // We identify this user's customers by metadata.user_id set during checkout
      let allCustomers: { name: string; email: string; stripeId: string }[] = [];
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const page = await stripe.customers.list({
          limit: 100,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        for (const customer of page.data) {
          // Only include customers linked to this Phame user via metadata
          const metaUserId = customer.metadata?.user_id;
          if (metaUserId && String(metaUserId) !== String(ctx.user.id)) continue;
          if (!customer.email) continue;
          allCustomers.push({
            name: customer.name || customer.email,
            email: customer.email,
            stripeId: customer.id,
          });
        }

        hasMore = page.has_more;
        if (page.data.length > 0) {
          startingAfter = page.data[page.data.length - 1].id;
        } else {
          hasMore = false;
        }
      }

      if (allCustomers.length === 0) {
        return { inserted: 0, skipped: 0, total: 0 };
      }

      const rows = allCustomers.map((c) => ({
        name: c.name,
        email: c.email,
        source: "stripe" as const,
        externalId: c.stripeId,
      }));

      const result = await upsertContactsFromSource(ctx.user.id, rows);

      // Save last synced timestamp to businessProfiles
      const db = await getDb();
      if (db && profile) {
        await db.update(businessProfiles)
          .set({ stripeLastSyncedAt: Date.now() })
          .where(eq(businessProfiles.userId, ctx.user.id));
      }

      return { ...result, total: allCustomers.length };
    }),

    syncStatus: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getBusinessProfile(ctx.user.id);
      return {
        stripeLastSyncedAt: profile?.stripeLastSyncedAt ?? null,
      };
    }),

    /**
     * Return send history for a specific contact — all customer_requests rows
     * linked to this contact's email address, ordered newest first.
     */
    sendHistory: protectedProcedure
      .input(z.object({ contactId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const { and: andH, eq: eqH, desc: descH } = await import("drizzle-orm");
        // Look up the contact to get their email
        const contacts = await db
          .select({ email: savedContacts.email, name: savedContacts.name })
          .from(savedContacts)
          .where(andH(eqH(savedContacts.userId, ctx.user.id), eqH(savedContacts.id, input.contactId)));
        if (contacts.length === 0) return [];
        const contact = contacts[0];
        const rows = await db
          .select({
            id: customerRequests.id,
            sentAt: customerRequests.sentAt,
            status: customerRequests.status,
            respondedAt: customerRequests.respondedAt,
            platformId: customerRequests.platformId,
          })
          .from(customerRequests)
          .where(andH(eqH(customerRequests.userId, ctx.user.id), eqH(customerRequests.customerEmail, contact.email)))
          .orderBy(descH(customerRequests.sentAt));
        // Attach platform label if available
        const platforms = await listReviewPlatforms(ctx.user.id);
        const platformMap = new Map(platforms.map((p) => [p.id, p]));
        return rows.map((r) => ({
          ...r,
          platformLabel: r.platformId ? (platformMap.get(r.platformId)?.label ?? platformMap.get(r.platformId)?.platform ?? null) : null,
          sentAt: r.sentAt instanceof Date ? r.sentAt.toISOString() : String(r.sentAt),
        }));
      }),

    /**
     * Schedule 3-day follow-up reminders for a list of contacts after a bulk send.
     * Expects the customerRequestIds returned from the bulk send (one per contact).
     */
    scheduleReminders: protectedProcedure
      .input(
        z.object({
          reminders: z.array(
            z.object({
              customerRequestId: z.number().int(),
              customerName: z.string(),
              customerEmail: z.string().email(),
            })
          ).min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let scheduled = 0;
        for (const r of input.reminders) {
          try {
            await scheduleFollowUp(ctx.user.id, r.customerRequestId, r.customerName, r.customerEmail);
            scheduled++;
          } catch {
            // Non-fatal — skip individual failures
          }
        }
        return { scheduled };
      }),

    /**
     * Public unsubscribe — validates HMAC token and marks the contact as opted out.
     * Called from the /unsubscribe page with the token from the email footer link.
     */
    unsubscribe: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const decoded = verifyUnsubToken(input.token);
        if (!decoded) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired unsubscribe link." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const { eq: eqU } = await import("drizzle-orm");
        if (decoded.contactType === "contact") {
          await db
            .update(savedContacts)
            .set({ optedOut: 1, optedOutAt: Date.now() })
            .where(eqU(savedContacts.id, decoded.id));
        } else {
          await db
            .update(wooCustomers)
            .set({ optedOut: 1, optedOutAt: Date.now() })
            .where(eqU(wooCustomers.id, decoded.id));
        }
        return { ok: true, contactType: decoded.contactType };
      }),
  }),

  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Seed the 3 starter templates for new users who have none yet
      await seedDefaultTemplates(ctx.user.id);
      return listTemplates(ctx.user.id);
    }),

    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return getDefaultTemplate(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), subject: z.string().min(1), body: z.string().min(1), isDefault: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await createTemplate(ctx.user.id, input);
        return { ok: true };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int(), name: z.string().min(1), subject: z.string().min(1), body: z.string().min(1), isDefault: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateTemplate(ctx.user.id, input.id, input);
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTemplate(ctx.user.id, input.id);
        return { ok: true };
      }),
  }),

  reminders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listReminders(ctx.user.id);
    }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await cancelReminder(ctx.user.id, input.id);
        return { ok: true };
      }),

    scheduleFollowUp: protectedProcedure
      .input(z.object({ customerRequestId: z.number().int(), customerName: z.string(), customerEmail: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        await scheduleFollowUp(ctx.user.id, input.customerRequestId, input.customerName, input.customerEmail);
        return { ok: true };
      }),

    sendNow: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await sendReminderNow(ctx.user.id, input.id);
        return { ok: true };
      }),

    getSettings: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const { eq: eqR } = await import("drizzle-orm");
      const [profile] = await db
        .select({
          followUpEnabled: businessProfiles.followUpEnabled,
          followUpFirstEnabled: businessProfiles.followUpFirstEnabled,
          followUpSecondEnabled: businessProfiles.followUpSecondEnabled,
          followUpDelayDays: businessProfiles.followUpDelayDays,
          followUpSecondDelayDays: businessProfiles.followUpSecondDelayDays,
        })
        .from(businessProfiles)
        .where(eqR(businessProfiles.userId, ctx.user.id));
      return {
        followUpEnabled: profile?.followUpEnabled ?? 1,
        followUpFirstEnabled: profile?.followUpFirstEnabled ?? 1,
        followUpSecondEnabled: profile?.followUpSecondEnabled ?? 1,
        followUpDelayDays: profile?.followUpDelayDays ?? 3,
        followUpSecondDelayDays: profile?.followUpSecondDelayDays ?? 7,
      };
    }),

    updateSettings: protectedProcedure
      .input(z.object({
        followUpEnabled: z.number().int().min(0).max(1),
        followUpFirstEnabled: z.number().int().min(0).max(1),
        followUpSecondEnabled: z.number().int().min(0).max(1),
        followUpDelayDays: z.number().int().min(1).max(14),
        followUpSecondDelayDays: z.number().int().min(1).max(14),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const { eq: eqR } = await import("drizzle-orm");
        await db
          .update(businessProfiles)
          .set({
            followUpEnabled: input.followUpEnabled,
            followUpFirstEnabled: input.followUpFirstEnabled,
            followUpSecondEnabled: input.followUpSecondEnabled,
            followUpDelayDays: input.followUpDelayDays,
            followUpSecondDelayDays: input.followUpSecondDelayDays,
          })
          .where(eqR(businessProfiles.userId, ctx.user.id));
        await syncPendingReminderStages(ctx.user.id, input);
        return { ok: true };
      }),

    timingPerformance: protectedProcedure.query(async ({ ctx }) => {
      return getReminderTimingPerformance(ctx.user.id);
    }),

    /** List reminders for a specific customer request */
    listForRequest: protectedProcedure
      .input(z.object({ requestId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const { eq: eqR, and: andR, asc } = await import("drizzle-orm");
        return db
          .select()
          .from(followUpReminders)
          .where(andR(eq(followUpReminders.userId, ctx.user.id), eqR(followUpReminders.customerRequestId, input.requestId)))
          .orderBy(asc(followUpReminders.scheduledAt));
      }),

    /** Return rendered HTML preview of a follow-up reminder email */
    previewEmail: protectedProcedure
      .input(z.object({ step: z.number().int().min(1).max(2).default(1) }))
      .query(async ({ ctx, input }) => {
        const { getReminderPreviewHtml } = await import("./reminders");
        const html = await getReminderPreviewHtml(ctx.user.id, input.step);
        return { html };
      }),
  }),

  requests: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getCustomerRequests(ctx.user.id);
    }),

    send: protectedProcedure
      .input(
        z.object({
          customerName: z.string().min(1),
          customerEmail: z.string().email(),
          method: z.enum(["email", "sms", "both"]),
          templateId: z.number().int().optional(),
          platformId: z.number().int().optional(), // optional: specific review platform to link to
          editedSubject: z.string()
            .trim()
            .min(1)
            .max(MAX_REVIEW_REQUEST_SUBJECT_CHARS)
            .refine((value) => !/[\r\n]/.test(value), "Email subject must stay on one line")
            .optional(),
          editedBody: z.string().trim().min(1).max(MAX_REVIEW_REQUEST_BODY_CHARS).optional(),
          complianceConfirmed: z.boolean().optional(),
        })
          .superRefine((value, ctx) => {
            const hasEditedSubject = value.editedSubject !== undefined;
            const hasEditedBody = value.editedBody !== undefined;
            if (hasEditedSubject !== hasEditedBody) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Edited subject and body must be submitted together",
              });
            }
            if (hasEditedSubject && value.complianceConfirmed !== true) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["complianceConfirmed"],
                message: "Confirm the compliance checklist before sending edited copy",
              });
            }
          })
      )
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new Error("Please complete your business profile first.");
        // Free-tier limit: 10 total sends, then subscription required
        await enforceFreeLimit(ctx.user.id, profile.tier);
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (profile.monthlyResetDate !== yearMonth) {
          await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
          profile.monthlyCount = 0;
          profile.monthlyResetDate = yearMonth;
        }
        // Resolve review URL: use selected platform, else fall back to profile.reviewLink
        let reviewUrl = profile.reviewLink ?? "";
        let isYelpSingle = false;
        const userPlatforms = await listReviewPlatforms(ctx.user.id);
        if (input.platformId) {
          // Find the specific platform by ID
          const chosen = userPlatforms.find((p) => p.id === input.platformId);
          if (chosen) {
            isYelpSingle = chosen.platform === "yelp";
            reviewUrl = isYelpSingle ? buildYelpSearchInstruction(profile.businessName) : chosen.url;
          }
        } else {
          // Use default platform if available
          const defaultPlatform = userPlatforms.find((p) => p.isDefault === 1) ?? userPlatforms[0] ?? null;
          if (defaultPlatform) {
            isYelpSingle = defaultPlatform.platform === "yelp";
            reviewUrl = isYelpSingle ? buildYelpSearchInstruction(profile.businessName) : defaultPlatform.url;
          }
        }

        // Resolve template: use specified templateId, else fall back to user's default template
        let subject: string;
        let htmlBody: string;

        const allTemplates = await listTemplates(ctx.user.id);
        const resolvedTemplate = input.templateId
          ? allTemplates.find((t) => t.id === input.templateId) ?? null
          : await getDefaultTemplate(ctx.user.id);
        const platformLinksList = buildSafePlatformLinks(userPlatforms, profile.businessName, reviewUrl);
        const renderDraft = (value: string) => renderReviewRequestDraft(value, {
          customerName: input.customerName,
          businessName: profile.businessName,
          reviewValue: reviewUrl,
          platformLinks: platformLinksList,
        });

        if (input.editedSubject !== undefined && input.editedBody !== undefined) {
          subject = renderDraft(input.editedSubject).replace(/\s*[\r\n]+\s*/g, " ");
          htmlBody = wrapPlainTextReviewRequestHtml(renderDraft(input.editedBody));
        } else if (resolvedTemplate) {
          subject = renderDraft(resolvedTemplate.subject).replace(/\s*[\r\n]+\s*/g, " ");
          htmlBody = wrapPlainTextReviewRequestHtml(renderDraft(resolvedTemplate.body));
        } else {
          subject = `${profile.businessName} would love your feedback!`;
          htmlBody = buildReviewRequestEmail({
            customerName: input.customerName,
            businessName: profile.businessName,
            reviewUrl,
            isYelpInstruction: isYelpSingle,
            showPoweredBy: profile.tier === 'free',
          });
        }

        // Create the request row first so we have its ID for tracking tokens
        const newRequestId = await createCustomerRequest({
          userId: ctx.user.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          method: input.method,
          status: "sent",
          platformId: input.platformId ?? null,
          emailSubject: subject,
          emailBody: htmlBody, // store pre-tracking HTML so it's editable
        });

        // Inject open pixel + click-tracking wrapper into the email HTML
        // Skip URL replacement for Yelp (plain-text instruction, not a URL)
        const trackingToken = encodeTrackingToken(newRequestId, ctx.user.id, resolvedTemplate?.id ?? null);
        const baseUrl = (ctx.req.headers.origin as string | undefined) ?? "https://getphame.app";
        const openPixel = buildOpenPixel(trackingToken, baseUrl);
        const trackedHtmlBody = isYelpSingle
          ? htmlBody.replace(/<\/div>\s*$/, `${openPixel}</div>`)
          : (() => {
              const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
              return htmlBody
                .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewUrl)
                .replace(/<\/div>\s*$/, `${openPixel}</div>`);
            })();

        const sendLimitStatus = await sendMailViaSmtp({ userId: ctx.user.id, to: input.customerEmail, subject, html: trackedHtmlBody });

        // Increment template usage counter
        if (resolvedTemplate) {
          const db2 = await getDb();
          if (db2) {
            const { emailTemplates } = await import("../drizzle/schema");
            const { eq: eqT, sql: sqlT } = await import("drizzle-orm");
            await db2.update(emailTemplates).set({ usageCount: sqlT`${emailTemplates.usageCount} + 1` }).where(eqT(emailTemplates.id, resolvedTemplate.id));
          }
        }

        await upsertBusinessProfile({
          ...profile,
          monthlyCount: profile.monthlyCount + 1,
        });

        return { success: true, requestId: newRequestId, sendLimitStatus };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, eq: eqOp } = await import("drizzle-orm");
        const [row] = await db
          .select()
          .from(customerRequests)
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)))
          .limit(1);
        if (!row) throw new Error("Request not found");
        return row;
      }),

    updateEmail: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        emailSubject: z.string().min(1),
        emailBody: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, eq: eqOp } = await import("drizzle-orm");
        await db
          .update(customerRequests)
          .set({ emailSubject: input.emailSubject, emailBody: input.emailBody })
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)));
        return { ok: true };
      }),

    resend: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        emailSubject: z.string().min(1),
        emailBody: z.string().min(1),
        restart: z.boolean().default(false), // true = new campaign row; false = resend same row
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, eq: eqOp } = await import("drizzle-orm");
        // Fetch original request to get customer info
        const [original] = await db
          .select()
          .from(customerRequests)
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)))
          .limit(1);
        if (!original) throw new Error("Request not found");
        if (!original.customerEmail) throw new Error("No email address on file for this customer");

        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new Error("Business profile not found");
        await enforceFreeLimit(ctx.user.id, profile.tier);

        // Save updated email body on original row
        await db
          .update(customerRequests)
          .set({ emailSubject: input.emailSubject, emailBody: input.emailBody })
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)));

        // Build tracking for the resend
        const baseUrl = "https://getphame.app";
        const trackingToken = encodeTrackingToken(input.id, ctx.user.id, null);
        const openPixel = buildOpenPixel(trackingToken, baseUrl);
        const trackedHtml = input.emailBody.replace(/<\/div>\s*$/, `${openPixel}</div>`);

        await sendMailViaSmtp({ userId: ctx.user.id, to: original.customerEmail, subject: input.emailSubject, html: trackedHtml });

        if (input.restart) {
          // Cancel existing reminders for the original request
          await cancelRemindersByRequestId(ctx.user.id, input.id);
          // Reset respondedAt and sentAt on original row
          await db
            .update(customerRequests)
            .set({ respondedAt: null, sentAt: new Date(), status: "sent" })
            .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)));
        }

        await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + 1 });
        return { ok: true };
      }),

    markResponded: protectedProcedure
      .input(z.object({ id: z.number().int(), responded: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, eq: eqOp } = await import("drizzle-orm");
        await db
          .update(customerRequests)
          .set({ respondedAt: input.responded ? Date.now() : null })
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)));
        // Cancel all pending follow-up reminders for this request when marked as responded
        if (input.responded) {
          await cancelRemindersByRequestId(ctx.user.id, input.id);
        }
        return { ok: true };
      }),
    bulkMarkResponded: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), responded: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, inArray, eq: eqOp } = await import("drizzle-orm");
        await db
          .update(customerRequests)
          .set({ respondedAt: input.responded ? Date.now() : null })
          .where(
            and(
              eqOp(customerRequests.userId, ctx.user.id),
              inArray(customerRequests.id, input.ids)
            )
          );
        // Cancel all pending follow-up reminders for each responded request
        if (input.responded) {
          await Promise.all(
            input.ids.map((id) => cancelRemindersByRequestId(ctx.user.id, id))
          );
        }
        return { updated: input.ids.length };
      }),

    bulkRestart: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int()).min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const { and, eq: eqOp } = await import("drizzle-orm");
        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new Error("Business profile not found");

        let sent = 0;
        const errors: string[] = [];

        for (const id of input.ids) {
          try {
            await enforceFreeLimit(ctx.user.id, profile.tier);

            const [original] = await db
              .select()
              .from(customerRequests)
              .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, id)))
              .limit(1);

            if (!original || !original.customerEmail) {
              errors.push(`Request ${id}: missing email address`);
              continue;
            }
            if (!original.emailSubject || !original.emailBody) {
              errors.push(`Request ${id}: no stored email content`);
              continue;
            }

            // Cancel existing reminders and reset the request
            await cancelRemindersByRequestId(ctx.user.id, id);
            await db
              .update(customerRequests)
              .set({ respondedAt: null, sentAt: new Date(), status: "sent" })
              .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, id)));

            // Re-inject tracking and resend
            const baseUrl = "https://getphame.app";
            const trackingToken = encodeTrackingToken(id, ctx.user.id, null);
            const openPixel = buildOpenPixel(trackingToken, baseUrl);
            const trackedHtml = original.emailBody.replace(/<\/div>\s*$/, `${openPixel}</div>`);

            await sendMailViaSmtp({ userId: ctx.user.id, to: original.customerEmail, subject: original.emailSubject, html: trackedHtml });
            await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + 1 });
            sent++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Request ${id}: ${msg}`);
          }
        }

        return { sent, errors };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [all, monthly] = await Promise.all([
        getCustomerRequests(ctx.user.id, 1000),
        getMonthlyRequestCount(ctx.user.id, yearMonth),
      ]);
      // Build platform breakdown: count requests per platformId
      const db = await getDb();
      let platformBreakdown: { platformId: number | null; platform: string; label: string | null; count: number }[] = [];
      if (db) {
        const allPlatforms = await db.select().from(reviewPlatforms).where(eq(reviewPlatforms.userId, ctx.user.id));
        const platformMap = new Map(allPlatforms.map((p) => [p.id, p]));
        const countMap = new Map<number | null, number>();
        for (const req of all) {
          const pid = req.platformId ?? null;
          countMap.set(pid, (countMap.get(pid) ?? 0) + 1);
        }
        for (const [pid, count] of Array.from(countMap.entries())) {
          if (pid === null) {
            platformBreakdown.push({ platformId: null, platform: "unknown", label: "No platform", count });
          } else {
            const p = platformMap.get(pid);
            if (p) platformBreakdown.push({ platformId: pid, platform: p.platform, label: p.label ?? null, count });
          }
        }
        platformBreakdown.sort((a, b) => b.count - a.count);
      }
      // Count requests that have been responded to this calendar month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const respondedThisMonth = all.filter(
        (r) => r.respondedAt !== null && r.respondedAt !== undefined && r.respondedAt >= monthStart
      ).length;
      return {
        total: all.length,
        thisMonth: monthly,
        respondedThisMonth,
        recent: all.slice(0, 5),
        platformBreakdown,
      };
    }),
  }),

  tracking: router({
    /**
     * Returns open and click counts for a list of request IDs.
     * Used by Dashboard to show per-row open/click badges.
     */
    requestStats: protectedProcedure
      .input(z.object({ requestIds: z.array(z.number().int()).max(500) }))
      .query(async ({ ctx, input }) => {
        if (input.requestIds.length === 0) return [];
        const db = await getDb();
        if (!db) return [];
        const { emailEvents } = await import("../drizzle/schema");
        const { and, eq: eqOp, inArray, sql: sqlOp } = await import("drizzle-orm");
        const rows = await db
          .select({
            requestId: emailEvents.requestId,
            type: emailEvents.type,
            count: sqlOp<number>`count(*)`,
          })
          .from(emailEvents)
          .where(
            and(
              eqOp(emailEvents.userId, ctx.user.id),
              inArray(emailEvents.requestId, input.requestIds)
            )
          )
          .groupBy(emailEvents.requestId, emailEvents.type);

        // Pivot into { requestId, opens, clicks }
        const map = new Map<number, { opens: number; clicks: number }>();
        for (const row of rows) {
          const entry = map.get(row.requestId) ?? { opens: 0, clicks: 0 };
          if (row.type === "open") entry.opens = Number(row.count);
          if (row.type === "click") entry.clicks = Number(row.count);
          map.set(row.requestId, entry);
        }
        return Array.from(map.entries()).map(([requestId, stats]) => ({ requestId, ...stats }));
      }),

    /**
     * Returns aggregate open/click stats per template for the current user.
     * Used by EmailTemplates to show open rate % and click rate % on each card.
     */
    templateStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { emailEvents } = await import("../drizzle/schema");
      const { and, eq: eqOp, isNotNull, sql: sqlOp } = await import("drizzle-orm");
      const rows = await db
        .select({
          templateId: emailEvents.templateId,
          type: emailEvents.type,
          count: sqlOp<number>`count(*)`,
        })
        .from(emailEvents)
        .where(
          and(
            eqOp(emailEvents.userId, ctx.user.id),
            isNotNull(emailEvents.templateId)
          )
        )
        .groupBy(emailEvents.templateId, emailEvents.type);

      const map = new Map<number, { opens: number; clicks: number }>();
      for (const row of rows) {
        if (row.templateId === null) continue;
        const entry = map.get(row.templateId) ?? { opens: 0, clicks: 0 };
        if (row.type === "open") entry.opens = Number(row.count);
        if (row.type === "click") entry.clicks = Number(row.count);
        map.set(row.templateId, entry);
      }
      return Array.from(map.entries()).map(([templateId, stats]) => ({ templateId, ...stats }));
    }),

    /**
     * Returns the most recent email open and click events for the current user.
     * Used by the frontend haptic feedback system to detect new activity.
     * Returns up to 20 events from the last 24 hours, sorted newest first.
     */
    recentEvents: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const { emailEvents, customerRequests } = await import("../drizzle/schema");
      const { and, eq: eqOp, gte, desc } = await import("drizzle-orm");
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours
      const rows = await db
        .select({
          id: emailEvents.id,
          type: emailEvents.type,
          requestId: emailEvents.requestId,
          createdAt: emailEvents.createdAt,
          customerName: customerRequests.customerName,
        })
        .from(emailEvents)
        .leftJoin(customerRequests, eqOp(emailEvents.requestId, customerRequests.id))
        .where(
          and(
            eqOp(emailEvents.userId, ctx.user.id),
            gte(emailEvents.createdAt, since)
          )
        )
        .orderBy(desc(emailEvents.createdAt))
        .limit(20);
      return rows;
    }),

    /**
     * Returns daily send/open/click counts for the last N days (default 30).
     * Used by Dashboard 30-day line chart.
     */
    dailyTrend: protectedProcedure
      .input(z.object({ days: z.number().int().min(7).max(90).default(30) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const { emailEvents: evTable, customerRequests: crTable } = await import("../drizzle/schema");
        const { and: andOp, eq: eqOp, gte, inArray: inArrayOp } = await import("drizzle-orm");
        const nowMs = Date.now();
        const since = new Date(nowMs - input.days * 24 * 60 * 60 * 1000);

        const sendRows = await db
          .select({ sentAt: crTable.sentAt })
          .from(crTable)
          .where(andOp(eqOp(crTable.userId, ctx.user.id), gte(crTable.sentAt, since)));

        const eventRows = await db
          .select({
            createdAt: evTable.createdAt,
            requestId: evTable.requestId,
            type: evTable.type,
          })
          .from(evTable)
          .where(andOp(
            eqOp(evTable.userId, ctx.user.id),
            inArrayOp(evTable.type, ["open", "click"]),
            gte(evTable.createdAt, since),
          ));

        return buildDailyTrend({ days: input.days, nowMs, sendRows, eventRows });
      }),

    /**
     * Returns overall open/click rates across all emails sent by the user.
     * Used by Dashboard summary card.
     */
    overallStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalSent: 0, uniqueOpens: 0, uniqueClicks: 0, openRate: 0, clickRate: 0 };
      const { emailEvents, customerRequests } = await import("../drizzle/schema");
      const { eq: eqOp, sql: sqlOp } = await import("drizzle-orm");

      // Total emails sent by this user
      const sentRows = await db
        .select({ count: sqlOp<number>`count(*)` })
        .from(customerRequests)
        .where(eqOp(customerRequests.userId, ctx.user.id));
      const totalSent = Number(sentRows[0]?.count ?? 0);

      // Unique opens (one per request)
      const openRows = await db
        .select({ count: sqlOp<number>`count(distinct ${emailEvents.requestId})` })
        .from(emailEvents)
        .where(
          (await import("drizzle-orm")).and(
            eqOp(emailEvents.userId, ctx.user.id),
            eqOp(emailEvents.type, "open")
          )
        );
      const uniqueOpens = Number(openRows[0]?.count ?? 0);

      // Unique clicks (one per request)
      const clickRows = await db
        .select({ count: sqlOp<number>`count(distinct ${emailEvents.requestId})` })
        .from(emailEvents)
        .where(
          (await import("drizzle-orm")).and(
            eqOp(emailEvents.userId, ctx.user.id),
            eqOp(emailEvents.type, "click")
          )
        );
      const uniqueClicks = Number(clickRows[0]?.count ?? 0);

      const openRate = totalSent > 0 ? Math.round((uniqueOpens / totalSent) * 100) : 0;
      const clickRate = totalSent > 0 ? Math.round((uniqueClicks / totalSent) * 100) : 0;
      return { totalSent, uniqueOpens, uniqueClicks, openRate, clickRate };
    }),
  }),

  accessCodes: router({
    /** Admin only: create a new access code */
    create: adminProcedure
      .input(
        z.object({
          code: z.string().optional(),
          note: z.string().optional(),
          maxUses: z.number().int().positive().nullable().optional(),
          expiresAt: z.number().nullable().optional(),
          grantDurationValue: z.number().int().positive().nullable().optional(),
          grantDurationUnit: z.enum(["day", "month", "lifetime"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const code = await createAccessCode({
          code: input.code,
          note: input.note,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ?? null,
          grantDurationValue: input.grantDurationValue ?? null,
          grantDurationUnit: input.grantDurationUnit,
        });
        return { code };
      }),

    /** Admin only: generate a random code preview without saving */
    generatePreview: adminProcedure.query(async () => {
      return { code: generateCode() };
    }),

    /** Admin only: list all codes */
    list: adminProcedure.query(async () => {
      return listAccessCodes();
    }),

    /** Admin only: revoke a code */
    revoke: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await revokeAccessCode(input.id);
        return { ok: true };
      }),

    /** Admin only: re-activate a revoked code */
    activate: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await activateAccessCode(input.id);
        return { ok: true };
      }),

    /** Any logged-in user: redeem a code for Pro access */
    redeem: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemAccessCode(ctx.user.id, input.code);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        return { note: result.note, tier: result.tier, planExpiresAt: result.planExpiresAt };
      }),
  }),

  /** Review platform URL manager — multi-platform support (Google, Yelp, TripAdvisor, Bing, Facebook, Other) */
  reviewPlatforms: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listReviewPlatforms(ctx.user.id);
    }),

    add: protectedProcedure
      .input(
        z.object({
          platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]),
          // Yelp entries are stored as search URLs (built client-side from plain text);
          // all other platforms supply a direct URL — accept any non-empty string.
          url: z.string().min(1, "Please enter a value"),
          label: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return addReviewPlatform(ctx.user.id, input.platform, input.url, input.label);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          url: z.string().min(1, "Please enter a value"),
          label: z.string().max(255).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateReviewPlatform(ctx.user.id, input.id, input.url, input.label);
        return { ok: true };
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await deleteReviewPlatform(ctx.user.id, input.id);
        return { ok: true };
      }),

    restore: protectedProcedure
      .input(
        z.object({
          platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]),
          url: z.string().min(1),
          label: z.string().max(255).optional(),
          isDefault: z.number().int().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Re-insert the deleted platform (used by undo-delete toast)
        const restored = await addReviewPlatform(ctx.user.id, input.platform, input.url, input.label);
        // If it was the default, promote it back
        if (input.isDefault === 1) {
          await setDefaultReviewPlatform(ctx.user.id, restored.id);
        }
        return { ok: true };
      }),

    setDefault: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        await setDefaultReviewPlatform(ctx.user.id, input.id);
        return { ok: true };
      }),

    getDefault: protectedProcedure.query(async ({ ctx }) => {
      return getDefaultReviewPlatform(ctx.user.id);
    }),
  }),

  onboarding: router({
    /** Returns the current onboarding state derived from existing data. */
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { smtpCredentials, reviewPlatforms, customerRequests, savedContacts } = await import("../drizzle/schema");
      const { eq: eqOp, count } = await import("drizzle-orm");

      const [smtpRow] = await db
        .select({ verified: smtpCredentials.verified })
        .from(smtpCredentials)
        .where(eqOp(smtpCredentials.userId, ctx.user.id))
        .limit(1);

      const [platformRow] = await db
        .select({ id: reviewPlatforms.id })
        .from(reviewPlatforms)
        .where(eqOp(reviewPlatforms.userId, ctx.user.id))
        .limit(1);

      const [requestRow] = await db
        .select({ cnt: count() })
        .from(customerRequests)
        .where(eqOp(customerRequests.userId, ctx.user.id));

      const [contactRow] = await db
        .select({ cnt: count() })
        .from(savedContacts)
        .where(eqOp(savedContacts.userId, ctx.user.id));

      const profile = await getBusinessProfile(ctx.user.id);

      const smtpConnected = !!smtpRow?.verified;
      const hasPlatform = !!platformRow;
      const hasSentRequest = (requestRow?.cnt ?? 0) > 0;
      const hasContacts = (contactRow?.cnt ?? 0) > 0;
      const dismissed = profile?.onboardingDismissed === 1;
      const allDone = smtpConnected && hasPlatform && hasContacts && hasSentRequest;
      const canAccessConnector = hasPaidOrAdminAccess({
        role: ctx.user.role,
        tier: profile?.tier ?? "free",
        planExpiresAt: profile?.planExpiresAt,
      });

      return { smtpConnected, hasPlatform, hasSentRequest, hasContacts, allDone, dismissed, canAccessConnector };
    }),

    /** Permanently dismisses the onboarding wizard for this user. */
    dismiss: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getBusinessProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      await upsertBusinessProfile({ ...profile, onboardingDismissed: 1 });
      return { ok: true };
    }),

    /** Resets the dismissed flag so the onboarding wizard is shown again. */
    reset: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getBusinessProfile(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      await upsertBusinessProfile({ ...profile, onboardingDismissed: 0 });
      return { ok: true };
    }),
  }),

  /** Account self-service: delete all data and the account itself */
  account: router({
    delete: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const uid = ctx.user.id;
      // Delete all user data in dependency order (children before parents)
      await db.delete(emailEvents).where(eq(emailEvents.userId, uid));
      await db.delete(koalendarBookings).where(eq(koalendarBookings.userId, uid));
      await db.delete(koalendarConnections).where(eq(koalendarConnections.userId, uid));
      await db.delete(followUpReminders).where(eq(followUpReminders.userId, uid));
      await db.delete(customerRequests).where(eq(customerRequests.userId, uid));
      await db.delete(savedContacts).where(eq(savedContacts.userId, uid));
      await db.delete(emailTemplates).where(eq(emailTemplates.userId, uid));
      await db.delete(reviewPlatforms).where(eq(reviewPlatforms.userId, uid));
      await db.delete(smtpCredentials).where(eq(smtpCredentials.userId, uid));
      await db.delete(wooCustomers).where(eq(wooCustomers.userId, uid));
      await db.delete(wooCredentials).where(eq(wooCredentials.userId, uid));
      await db.delete(accessCodeRedemptions).where(eq(accessCodeRedemptions.userId, uid));
      await db.delete(stripeSubscriptions).where(eq(stripeSubscriptions.userId, uid));
      await db.delete(businessProfiles).where(eq(businessProfiles.userId, uid));
      await db.delete(gmailTokens).where(eq(gmailTokens.userId, uid));
      // Capture user email/name before deleting the user row
      const deletedUser = ctx.user;
      // Finally delete the user row itself
      await db.delete(users).where(eq(users.id, uid));
      // Clear the session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Send deletion confirmation email (non-fatal — fire and forget)
      try {
        const { sendAccountDeletionEmail } = await import("./accountDeletionEmail");
        await sendAccountDeletionEmail(deletedUser.email ?? "", deletedUser.name ?? "");
      } catch (emailErr) {
        console.warn("[account.delete] Confirmation email failed (non-fatal):", emailErr);
      }
      return { ok: true };
    }),
  }),

  /** Admin-only analytics and diagnostics */
  admin: router({
    complimentaryAccess: adminProcedure
      .input(z.object({
        status: z.enum(["all", "active", "expired", "revoked"]).default("all"),
      }).optional())
      .query(({ input }) => listComplimentaryAccessGrants({ status: input?.status ?? "all" })),

    complimentaryAccessLookup: adminProcedure
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .query(({ input }) => lookupComplimentaryAccessByEmail({ email: input.email })),

    grantComplimentaryAccess: adminProcedure
      .input(z.object({
        email: z.string().trim().email().max(320),
        durationValue: z.number().int().positive(),
        durationUnit: z.enum(["day", "month", "year"]),
        note: z.string().trim().max(500).nullable().optional(),
      }).superRefine((value, issueContext) => {
        const maximum = COMPLIMENTARY_ACCESS_LIMITS[value.durationUnit];
        if (value.durationValue > maximum) {
          issueContext.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["durationValue"],
            message: `Duration cannot exceed ${maximum} ${value.durationUnit}(s).`,
          });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createComplimentaryAccessGrant({ ...input, createdByUserId: ctx.user.id });
        } catch (error) {
          if (error instanceof ComplimentaryAccessConflictError) {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          console.error("[Admin] Complimentary-access grant failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Complimentary access could not be granted. Please retry.",
          });
        }
      }),

    revokeComplimentaryAccess: adminProcedure
      .input(z.object({ grantId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await revokeComplimentaryAccessGrant({
            grantId: input.grantId,
            revokedByUserId: ctx.user.id,
          });
        } catch (error) {
          if (error instanceof ComplimentaryAccessNotFoundError) {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
          console.error("[Admin] Complimentary-access revocation failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Complimentary access could not be revoked. Please retry.",
          });
        }
      }),

    /** Overall platform stats — user count, tier breakdown, recent signups, recent sends */
    stats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // User counts by tier
      const allProfiles = await db.select().from(businessProfiles);
      const tierCounts = { free: 0, pro: 0, annual: 0, lifetime: 0 };
      for (const p of allProfiles) {
        if (p.tier in tierCounts) tierCounts[p.tier as keyof typeof tierCounts]++;
      }

      // Recent signups (last 10 users)
      const recentUsers = await db
        .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
        .from(users)
        .orderBy(users.createdAt)
        .limit(10);

      // Total sends in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentSends = await db
        .select()
        .from(customerRequests)
        .where(eq(customerRequests.userId, customerRequests.userId)); // all rows
      const sendsLast30 = recentSends.filter(r => r.sentAt && r.sentAt > thirtyDaysAgo).length;

      // Total sends all time
      const totalSends = recentSends.length;

      // Active SMTP connections
      const smtpRows = await db.select().from(smtpCredentials);
      const activeSmtp = smtpRows.filter(r => r.lastHealthStatus === "ok").length;

      const [reminderQueue] = await db
        .select({
          pendingReminders: sql<number>`SUM(CASE WHEN ${followUpReminders.status} = 'pending' THEN 1 ELSE 0 END)`,
          dueReminders: sql<number>`SUM(CASE WHEN ${followUpReminders.status} = 'pending' AND ${followUpReminders.scheduledAt} <= NOW() THEN 1 ELSE 0 END)`,
        })
        .from(followUpReminders);

      return {
        totalUsers: allProfiles.length,
        tierCounts,
        recentUsers: recentUsers.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
        })),
        totalSends,
        sendsLast30,
        activeSmtp,
        totalSmtp: smtpRows.length,
        pendingReminders: Number(reminderQueue?.pendingReminders ?? 0),
        dueReminders: Number(reminderQueue?.dueReminders ?? 0),
      };
    }),

    /** Platform-wide reminder timing attribution for administrator operations. */
    reminderPerformance: adminProcedure.query(async () => {
      return getReminderTimingPerformance();
    }),

    /** Durable 24-hour SMTP and authentication health observations. */
    systemHealthTrend: adminProcedure
      .input(z.object({ hours: z.number().int().min(1).max(168).default(24) }).default({ hours: 24 }))
      .query(async ({ input }) => getSystemHealthTrend(input.hours)),

    /** Centralized alert thresholds for administration hub metric emphasis. */
    operationsAlerts: adminProcedure.query(async () => {
      const reminderRows = await getReminderTimingPerformance();
      return getOperationsAlertState(reminderRows);
    }),

    /** Privacy-safe CSV combining platform revenue, churn, and reminder analytics. */
    operationsAnalyticsExport: adminProcedure.query(async () => {
      return buildAdminOperationsAnalyticsExport();
    }),

    /** SMTP provider failure stats — breakdown by host across all users */
    smtpStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(smtpCredentials);
      // Aggregate by host
      const byHost: Record<string, {
        host: string;
        total: number;
        ok: number;
        fail: number;
        neverChecked: number;
        recentErrors: string[];
      }> = {};
      for (const row of rows) {
        const h = row.host || "(unknown)";
        if (!byHost[h]) byHost[h] = { host: h, total: 0, ok: 0, fail: 0, neverChecked: 0, recentErrors: [] };
        byHost[h].total++;
        if (row.lastHealthStatus === "ok") byHost[h].ok++;
        else if (row.lastHealthStatus === "fail") {
          byHost[h].fail++;
          if (row.lastHealthError && byHost[h].recentErrors.length < 3) {
            byHost[h].recentErrors.push(row.lastHealthError);
          }
        } else {
          byHost[h].neverChecked++;
        }
      }
      const summary = Object.values(byHost).sort((a, b) => b.fail - a.fail);
      const totals = {
        total: rows.length,
        ok: rows.filter(r => r.lastHealthStatus === "ok").length,
        fail: rows.filter(r => r.lastHealthStatus === "fail").length,
        neverChecked: rows.filter(r => !r.lastHealthStatus).length,
        lastRunAt: rows.reduce((max, r) => Math.max(max, r.lastHealthCheck ?? 0), 0) || null,
      };
      return { summary, totals };
    }),

    /** Failing SMTP credentials with account context for immediate admin action. */
    failingSmtpUsers: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          host: smtpCredentials.host,
          smtpUser: smtpCredentials.user,
          lastHealthError: smtpCredentials.lastHealthError,
          lastHealthCheck: smtpCredentials.lastHealthCheck,
        })
        .from(smtpCredentials)
        .innerJoin(users, eq(smtpCredentials.userId, users.id))
        .where(eq(smtpCredentials.lastHealthStatus, "fail"))
        .orderBy(desc(smtpCredentials.lastHealthCheck));
    }),

    /** Trigger SMTP health check on demand (admin only) */
    runHealthCheck: adminProcedure.mutation(async () => {
      await runSmtpHealthChecks();
      return { ok: true, ranAt: Date.now() };
    }),

    /** Search users by name or email — admin only */
    searchUsers: adminProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const q = `%${input.query}%`;
        // Fetch matching users
        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            createdAt: users.createdAt,
            tier: businessProfiles.tier,
            totalSent: businessProfiles.monthlyCount,
          })
          .from(users)
          .leftJoin(businessProfiles, eq(users.id, businessProfiles.userId))
          .where(or(like(users.name, q), like(users.email, q)))
          .limit(20);
        // Attach most recent churn reason for each user (if any)
        const userIds = rows.map(r => r.id);
        let churnMap: Record<number, string> = {};
        if (userIds.length > 0) {
          const churnRows = await db
            .select({ userId: churnSurveys.userId, reason: churnSurveys.reason })
            .from(churnSurveys)
            .where(inArray(churnSurveys.userId, userIds))
            .orderBy(churnSurveys.createdAt);
          // Keep the most recent reason per user
          for (const c of churnRows) {
            if (c.userId !== null) churnMap[c.userId] = c.reason;
          }
        }
        return rows.map(r => ({ ...r, churnReason: churnMap[r.id] ?? null }));
      }),

    /** Paginated user directory with account role and effective Life access. */
    listUsers: adminProcedure
      .input(z.object({
        query: z.string().trim().max(100).default(""),
        smtpStatus: z.enum(["all", "verified", "unverified", "failing", "unconnected"]).default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(100).default(25),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const search = input.query ? `%${input.query}%` : null;
        const searchClause = search ? or(like(users.name, search), like(users.email, search)) : undefined;
        const smtpClause = input.smtpStatus === "verified"
          ? and(isNotNull(smtpCredentials.id), eq(smtpCredentials.verified, 1))
          : input.smtpStatus === "unverified"
            ? and(isNotNull(smtpCredentials.id), eq(smtpCredentials.verified, 0))
            : input.smtpStatus === "failing"
              ? and(isNotNull(smtpCredentials.id), eq(smtpCredentials.lastHealthStatus, "fail"))
              : input.smtpStatus === "unconnected"
                ? isNull(smtpCredentials.id)
                : undefined;
        const whereClause = searchClause && smtpClause
          ? and(searchClause, smtpClause)
          : searchClause ?? smtpClause;
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .leftJoin(smtpCredentials, eq(users.id, smtpCredentials.userId))
          .where(whereClause);
        const total = Number(countRow?.count ?? 0);
        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
            tier: businessProfiles.tier,
            smtpCredentialId: smtpCredentials.id,
            smtpVerified: smtpCredentials.verified,
            smtpFromEmail: smtpCredentials.user,
          })
          .from(users)
          .leftJoin(businessProfiles, eq(users.id, businessProfiles.userId))
          .leftJoin(smtpCredentials, eq(users.id, smtpCredentials.userId))
          .where(whereClause)
          .orderBy(desc(users.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          users: rows.map((row) => ({
            ...row,
            tier: row.tier ?? "free",
            lifeAccess: row.role === "admin" || row.tier === "lifetime",
            smtpConnected: row.smtpCredentialId !== null,
            smtpVerified: row.smtpVerified === 1,
          })),
          page: input.page,
          pageSize: input.pageSize,
          total,
          pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
        };
      }),

    /** Re-test one user's stored SMTP credentials without exposing the password. */
    retestUserSmtp: adminProcedure
      .input(z.object({ userId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [credential] = await db
          .select({
            host: smtpCredentials.host,
            port: smtpCredentials.port,
            secure: smtpCredentials.secure,
            user: smtpCredentials.user,
            encryptedPass: smtpCredentials.encryptedPass,
            lastHealthStatus: smtpCredentials.lastHealthStatus,
          })
          .from(smtpCredentials)
          .where(eq(smtpCredentials.userId, input.userId))
          .limit(1);
        if (!credential) throw new TRPCError({ code: "NOT_FOUND", message: "No SMTP credentials are connected for this user." });

        let result: { ok: boolean; error?: string };
        try {
          result = await testSmtpConnection({
            host: credential.host,
            port: credential.port,
            secure: credential.secure === 1,
            user: credential.user,
            pass: decryptPassword(credential.encryptedPass),
          });
        } catch (error) {
          result = { ok: false, error: error instanceof Error ? error.message : "Unable to decrypt or test the stored credentials." };
        }

        const checkedAt = Date.now();
        const recovered = credential.lastHealthStatus === "fail" && result.ok;
        const errorMessage = result.ok ? null : (result.error ?? "SMTP verification failed.").slice(0, 500);
        await db.update(smtpCredentials).set({
          verified: result.ok ? 1 : 0,
          lastHealthCheck: checkedAt,
          lastHealthStatus: result.ok ? "ok" : "fail",
          lastHealthError: errorMessage,
          updatedAt: new Date(),
        }).where(eq(smtpCredentials.userId, input.userId));
        console.log(`[Admin] SMTP credentials for user ${input.userId} re-tested by admin ${ctx.user.id}: ${result.ok ? "ok" : "fail"}`);
        return { ok: result.ok, checkedAt, error: errorMessage, recovered };
      }),

    /** Durable, newest-first administrator SMTP removal history. */
    listSmtpAuditLogs: adminProcedure
      .input(z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(25),
        ...smtpAuditFilterShape,
      }).refine(
        validateSmtpAuditDateRange,
        { message: "The audit start date must be before the end date.", path: ["dateFrom"] }
      ))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const whereClause = buildSmtpAuditWhere(input);
        const [totalRow] = await db
          .select({ value: count() })
          .from(smtpAdminAuditLogs)
          .where(whereClause);
        const total = Number(totalRow?.value ?? 0);
        const pageCount = Math.max(1, Math.ceil(total / input.pageSize));
        const page = Math.min(input.page, pageCount);
        const entries = await db
          .select()
          .from(smtpAdminAuditLogs)
          .where(whereClause)
          .orderBy(desc(smtpAdminAuditLogs.occurredAt))
          .limit(input.pageSize)
          .offset((page - 1) * input.pageSize);
        return { entries, page, pageSize: input.pageSize, total, pageCount };
      }),

    /** Complete server-generated CSV for every audit row matching the active filters. */
    exportSmtpAuditLogs: adminProcedure
      .input(z.object(smtpAuditFilterShape).refine(
        validateSmtpAuditDateRange,
        { message: "The audit start date must be before the end date.", path: ["dateFrom"] }
      ))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const entries = await db
          .select({
            occurredAt: smtpAdminAuditLogs.occurredAt,
            outcome: smtpAdminAuditLogs.outcome,
            action: smtpAdminAuditLogs.action,
            actorName: smtpAdminAuditLogs.actorName,
            actorEmail: smtpAdminAuditLogs.actorEmail,
            targetName: smtpAdminAuditLogs.targetName,
            targetEmail: smtpAdminAuditLogs.targetEmail,
            smtpUser: smtpAdminAuditLogs.smtpUser,
          })
          .from(smtpAdminAuditLogs)
          .where(buildSmtpAuditWhere(input))
          .orderBy(desc(smtpAdminAuditLogs.occurredAt));
        return {
          csv: buildSmtpAuditCsv(entries),
          filename: buildSmtpAuditCsvFilename(),
          total: entries.length,
        };
      }),

    /** Distinct administrators represented in the durable SMTP audit trail. */
    listSmtpAuditActors: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .selectDistinct({
          id: smtpAdminAuditLogs.actorUserId,
          name: smtpAdminAuditLogs.actorName,
          email: smtpAdminAuditLogs.actorEmail,
        })
        .from(smtpAdminAuditLogs)
        .orderBy(smtpAdminAuditLogs.actorName, smtpAdminAuditLogs.actorEmail);
    }),

    setUserRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.id === input.userId && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own administrator access." });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(users).set({ role: input.role, updatedAt: new Date() }).where(eq(users.id, input.userId));
        console.log(`[Admin] User ${input.userId} role set to ${input.role} by admin ${ctx.user.id}`);
        return { ok: true };
      }),

    setLifeAccess: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [target] = await db
          .select({ name: users.name, email: users.email, role: users.role, tier: businessProfiles.tier })
          .from(users)
          .leftJoin(businessProfiles, eq(users.id, businessProfiles.userId))
          .where(eq(users.id, input.userId))
          .limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        if (!input.enabled && target.role === "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Administrators always have Life access. Change the role first." });
        }
        const yearMonth = new Date().toISOString().slice(0, 7);
        await db
          .insert(businessProfiles)
          .values({
            userId: input.userId,
            businessName: target.name?.trim() || target.email?.trim() || "Get Phame User",
            reviewLink: "",
            tier: input.enabled ? "lifetime" : "free",
            monthlyCount: 0,
            monthlyResetDate: yearMonth,
            planExpiresAt: null,
          })
          .onDuplicateKeyUpdate({
            set: {
              tier: input.enabled ? "lifetime" : target.tier === "lifetime" ? "free" : target.tier ?? "free",
              planExpiresAt: null,
              updatedAt: new Date(),
            },
          });
        console.log(`[Admin] User ${input.userId} Life access ${input.enabled ? "enabled" : "disabled"} by admin ${ctx.user.id}`);
        return { ok: true };
      }),

    removeUserSmtp: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        confirmationEmail: z.string().trim().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const removed = await db.transaction(async (tx) => {
          const [target] = await tx
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1);
          if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
          if (!target.email || input.confirmationEmail.toLowerCase() !== target.email.trim().toLowerCase()) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Type the user's exact email address to remove SMTP credentials." });
          }
          const [credential] = await tx
            .select({ id: smtpCredentials.id, user: smtpCredentials.user })
            .from(smtpCredentials)
            .where(eq(smtpCredentials.userId, input.userId))
            .limit(1);
          if (!credential) return false;

          const occurredAt = Date.now();
          await tx.delete(smtpCredentials).where(eq(smtpCredentials.id, credential.id));
          await tx.insert(smtpAdminAuditLogs).values({
            actorUserId: ctx.user.id,
            actorName: ctx.user.name,
            actorEmail: ctx.user.email,
            targetUserId: target.id,
            targetName: target.name,
            targetEmail: target.email,
            smtpUser: credential.user,
            action: "smtp_credentials_removed",
            outcome: "removed",
            occurredAt,
          });
          return true;
        });
        console.log(`[Admin] SMTP credentials for user ${input.userId} ${removed ? "removed" : "were already absent"} by admin ${ctx.user.id}`);
        return { ok: true, removed };
      }),

    deleteUser: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        confirmation: z.literal("DELETE"),
      }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteAccountAsAdmin(ctx.user.id, input.userId);
        console.log(`[Admin] Account ${deleted.id} deleted by admin ${ctx.user.id}`);
        return { ok: true, deleted };
      }),

    listKoalendarFailures: adminProcedure
      .input(z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(10).max(50).default(20),
      }))
      .query(async ({ input }) => listFailedKoalendarBookings(input.page, input.pageSize)),

    retryKoalendarImport: adminProcedure
      .input(z.object({ bookingId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const result = await retryFailedKoalendarBooking(input.bookingId);
        if (result.outcome === "not_found") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Koalendar import was not found." });
        }
        if (result.outcome === "not_eligible") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Koalendar import is no longer eligible for a manual retry. Refresh the queue to see its current state.",
          });
        }
        return result;
      }),

    combineAccounts: adminProcedure
      .input(z.object({
        sourceUserId: z.number().int().positive(),
        targetUserId: z.number().int().positive(),
        confirmation: z.literal("COMBINE"),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await combineAccountsAsAdmin(ctx.user.id, input.sourceUserId, input.targetUserId);
        console.log(`[Admin] Account ${input.sourceUserId} combined into ${input.targetUserId} by admin ${ctx.user.id}`);
        return { ok: true, ...result };
      }),

    /** Manually override a user's tier — admin only */
    setTier: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        tier: z.enum(["free", "pro", "annual", "lifetime"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db
          .update(businessProfiles)
          .set({ tier: input.tier })
          .where(eq(businessProfiles.userId, input.userId));
        console.log(`[Admin] User ${input.userId} tier set to ${input.tier} by admin ${ctx.user.id}`);
        return { ok: true };
      }),

    /** Grant a registered account a monthly, annual, or lifetime subscription — admin only */
    grantSubscription: adminProcedure
      .input(z.object({
        email: z.string().trim().email(),
        plan: z.enum(["monthly", "annual", "lifetime"]),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const granted = await grantSubscriptionByEmail(input.email, input.plan);
          if (!granted) {
            throw new TRPCError({ code: "NOT_FOUND", message: "No account matches that email address." });
          }
          console.log(`[Admin] ${input.plan} access granted to user ${granted.userId} by admin ${ctx.user.id}`);
          return granted;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Subscription grant failed.",
          });
        }
      }),

    /** Return a registered account to the free tier — admin only */
    revokeSubscription: adminProcedure
      .input(z.object({ email: z.string().trim().email() }))
      .mutation(async ({ ctx, input }) => {
        const revoked = await revokeSubscriptionByEmail(input.email);
        if (!revoked) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No subscription profile matches that email address." });
        }
        console.log(`[Admin] Paid access revoked for user ${revoked.userId} by admin ${ctx.user.id}`);
        return revoked;
      }),

    /** Upsell click stats — powered-by footer clicks to /upgrade (last 30d) */
    upsellStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select()
        .from(pageEvents)
        .where(eq(pageEvents.utmSource, "powered_by_footer"));
      const last30 = rows.filter(r => r.createdAt > thirtyDaysAgo).length;
      return { total: rows.length, last30 };
    }),

    /** Privacy-light install/share funnel totals; no raw user or device records leave the server. */
    pwaConversionStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select({
          page: pageEvents.page,
          utmMedium: pageEvents.utmMedium,
          createdAt: pageEvents.createdAt,
        })
        .from(pageEvents)
        .where(eq(pageEvents.utmSource, PWA_EVENT_SOURCE));
      return summarizePwaEvents(rows);
    }),

    /** Aggregate explicit caption-language choices; no identity, referrer, user-agent, or free text is returned. */
    captionLanguageStats: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select({
          page: pageEvents.page,
          createdAt: pageEvents.createdAt,
        })
        .from(pageEvents)
        .where(eq(pageEvents.utmSource, CAPTION_LANGUAGE_ANALYTICS_SOURCE));
      return summarizeCaptionLanguageEvents(rows);
    }),

    /** Aggregate zero-result Manual searches; raw rows, account IDs, and fingerprints never leave the server. */
    manualSearchInsights: adminProcedure
      .input(z.object({
        periodDays: z.enum(MANUAL_SEARCH_REPORTING_PERIODS.map(String) as ["30", "90", "365"]).default("90"),
        limit: z.number().int().min(1).max(50).default(25),
      }).default({ periodDays: "90", limit: 25 }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        return getManualSearchInsights({
          db,
          periodDays: Number(input.periodDays) as (typeof MANUAL_SEARCH_REPORTING_PERIODS)[number],
          limit: input.limit,
        });
      }),

    /** Aggregate checklist setup funnel. It intentionally returns no raw event or identity data. */
    onboardingChecklistFunnel: adminProcedure.input(onboardingChecklistFunnelInputSchema.optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return getOnboardingChecklistFunnelComparison(db, input);
    }),

    /** Bounded administrator insight generated from aggregate funnel metrics only. */
    onboardingChecklistFunnelInsight: adminProcedure.input(onboardingChecklistFunnelInputSchema.optional()).query(async ({ ctx, input }) => {
      checkOnboardingFunnelInsightRateLimit(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const funnel = await getOnboardingChecklistFunnelComparison(db, input);
      return generateOnboardingFunnelInsight({
        currentWindowDays: funnel.range.periodDays,
        current: funnel.steps,
        previous: funnel.comparison.previous.steps,
      });
    }),

    /** Admin-only aggregate export. It contains no raw event, identity, or customer data. */
    onboardingChecklistFunnelExport: adminProcedure.input(onboardingChecklistFunnelInputSchema.optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const funnel = await getOnboardingChecklistFunnelSnapshot(db, input);
      const period = funnel.range.periodLabel;
      const stepLabels = { email: "connect_email", platform: "add_platform", contacts: "import_contacts", send: "first_send" } as const;
      const rows: AdminOperationsCsvRow[] = [
        { section: "metadata", metric: "generated_at", period, value: funnel.range.generatedAt.toISOString(), unit: "iso_8601", details: "Get Phame aggregate onboarding funnel export" },
        { section: "metadata", metric: "period_start", period, value: funnel.range.periodStart.toISOString(), unit: "iso_8601", details: "Inclusive UTC reporting boundary" },
        { section: "metadata", metric: "period_end", period, value: funnel.range.periodEnd.toISOString(), unit: "iso_8601", details: "Inclusive UTC reporting boundary" },
        { section: "onboarding_funnel", metric: "checklist_views", period, value: funnel.allTime.checklist_viewed, unit: "unique_accounts", details: "Unique accounts that viewed the setup checklist" },
        { section: "onboarding_funnel", metric: "checklist_completed", period, value: funnel.allTime.checklist_completed, unit: "unique_accounts", details: "Unique accounts that completed all setup steps" },
        { section: "onboarding_funnel", metric: "completion_rate", period, value: funnel.rates.completion, unit: "percent", details: "Completed accounts divided by checklist viewers" },
        ...Object.entries(stepLabels).flatMap(([step, label]) => {
          const metric = funnel.steps[step as keyof typeof funnel.steps];
          return [
            { section: "onboarding_funnel", metric: `${label}_shown`, period, value: metric.shown, unit: "unique_accounts", details: "Unique accounts that viewed this step" },
            { section: "onboarding_funnel", metric: `${label}_continued`, period, value: metric.actioned, unit: "unique_accounts", details: "Unique accounts that used this step action" },
            { section: "onboarding_funnel", metric: `${label}_drop_off`, period, value: metric.dropOff, unit: "unique_accounts", details: "Viewed this step without using its action" },
            { section: "onboarding_funnel", metric: `${label}_continuation_rate`, period, value: metric.continuationRate, unit: "percent", details: "Accounts that continued after viewing this step" },
          ] satisfies AdminOperationsCsvRow[];
        }),
      ];
      const dateStamp = funnel.range.generatedAt.toISOString().slice(0, 10);
      return {
        filename: `getphame-onboarding-funnel-${period}-${dateStamp}.csv`,
        csv: serializeAdminOperationsCsv(rows),
        mimeType: "text/csv;charset=utf-8",
        generatedAt: funnel.range.generatedAt,
        rowCount: rows.length,
      };
    }),

    /** Churn survey responses — admin only */
    churnSurveys: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select()
        .from(churnSurveys)
        .orderBy(churnSurveys.createdAt);
      // Aggregate by reason
      const counts: Record<string, number> = {};
      for (const r of rows) {
        counts[r.reason] = (counts[r.reason] ?? 0) + 1;
      }
      return { total: rows.length, counts, recent: rows.slice(-10).reverse() };
    }),

    /** Revenue dashboard — MRR, ARR, tier breakdown, monthly subscriber growth, churn rate */
    revenue: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Platform-wide email open/click stats
      const { sql: sqlRev, and: andRev, eq: eqRev } = await import("drizzle-orm");
      const totalSentRows = await db.select({ count: sqlRev<number>`count(*)` }).from(customerRequests);
      const platformTotalSent = Number(totalSentRows[0]?.count ?? 0);
      const platformOpenRows = await db
        .select({ count: sqlRev<number>`count(distinct ${emailEvents.requestId})` })
        .from(emailEvents)
        .where(eqRev(emailEvents.type, "open"));
      const platformUniqueOpens = Number(platformOpenRows[0]?.count ?? 0);
      const platformClickRows = await db
        .select({ count: sqlRev<number>`count(distinct ${emailEvents.requestId})` })
        .from(emailEvents)
        .where(eqRev(emailEvents.type, "click"));
      const platformUniqueClicks = Number(platformClickRows[0]?.count ?? 0);
      const platformOpenRate = platformTotalSent > 0 ? Math.round((platformUniqueOpens / platformTotalSent) * 100 * 10) / 10 : 0;
      const platformClickRate = platformTotalSent > 0 ? Math.round((platformUniqueClicks / platformTotalSent) * 100 * 10) / 10 : 0;

      // Tier counts
      const allProfiles = await db.select({ tier: businessProfiles.tier, createdAt: businessProfiles.createdAt }).from(businessProfiles);
      const tierCounts = { free: 0, pro: 0, annual: 0, lifetime: 0 };
      for (const p of allProfiles) {
        if (p.tier in tierCounts) tierCounts[p.tier as keyof typeof tierCounts]++;
      }

      // MRR = (pro × monthly) + (annual × monthly-equivalent)
      const mrrCents = (tierCounts.pro * USD_PRICE_CENTS.monthly) + (tierCounts.annual * Math.round(USD_PRICE_CENTS.annual / 12));
      const arrCents = mrrCents * 12;

      // Lifetime revenue (all-time)
      const lifetimeRevenueCents = tierCounts.lifetime * USD_PRICE_CENTS.lifetime;

      // Monthly subscriber growth — new paid users per month for last 6 months
      const allSubs = await db
        .select({ createdAt: stripeSubscriptions.createdAt, status: stripeSubscriptions.status })
        .from(stripeSubscriptions)
        .orderBy(stripeSubscriptions.createdAt);

      const monthlyGrowth: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyGrowth[key] = 0;
      }
      for (const sub of allSubs) {
        if (!sub.createdAt || sub.status === "lifetime") continue;
        const d = new Date(sub.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthlyGrowth) monthlyGrowth[key]++;
      }
      const growthChart = Object.entries(monthlyGrowth).map(([month, newSubs]) => ({ month, newSubs }));

      // PromptPay reveal clicks — users who tapped "Reveal PromptPay QR" on the upgrade page
      const promptpayRevealRows = await db
        .select({ count: sqlRev<number>`count(*)` })
        .from(pageEvents)
        .where(eqRev(pageEvents.page, "/upgrade/promptpay-reveal"));
      const promptpayRevealTotal = Number(promptpayRevealRows[0]?.count ?? 0);

      // PromptPay reveals in last 30 days
      const thirtyDaysAgoTs = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const promptpayRevealLast30Rows = await db
        .select({ count: sqlRev<number>`count(*)` })
        .from(pageEvents)
        .where(
          andRev(
            eqRev(pageEvents.page, "/upgrade/promptpay-reveal"),
            sqlRev`${pageEvents.createdAt} >= ${thirtyDaysAgoTs}`
          )
        );
      const promptpayRevealLast30 = Number(promptpayRevealLast30Rows[0]?.count ?? 0);

      // PromptPay reveal-to-paid conversion rate (reveals vs lifetime+annual+pro Thai users)
      // We approximate by comparing reveals to total paid conversions
      const promptpayConversionRate = promptpayRevealTotal > 0
        ? Math.round(((tierCounts.pro + tierCounts.annual + tierCounts.lifetime) / promptpayRevealTotal) * 100 * 10) / 10
        : 0;

      // Churn rate — canceled subscriptions in last 30 days / active subscriptions
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const allSubRows = await db.select().from(stripeSubscriptions);
      const activeSubs = allSubRows.filter(s => s.status === "active").length;
      const recentCancels = allSubRows.filter(s =>
        s.status === "canceled" &&
        s.createdAt &&
        new Date(s.createdAt).getTime() > thirtyDaysAgo
      ).length;
      const churnRate = activeSubs > 0 ? Math.round((recentCancels / activeSubs) * 100 * 10) / 10 : 0;

      return {
        mrrCents,
        arrCents,
        lifetimeRevenueCents,
        tierCounts,
        growthChart,
        activeSubs,
        recentCancels,
        churnRate,
        platformTotalSent,
        platformUniqueOpens,
        platformUniqueClicks,
        platformOpenRate,
        platformClickRate,
        promptpayRevealTotal,
        promptpayRevealLast30,
        promptpayConversionRate,
      };
    }),
  }),

  /** Admin: deferred referral reward management */
  adminReferrals: router({
    /**
     * List referral rows where:
     * - convertedAt IS NOT NULL (referred user paid)
     * - rewardedAt IS NULL (reward not yet applied)
     * - referrer is currently on tier = 'pro' or 'annual' (now eligible)
     */
    listDeferred: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];

      // Fetch all deferred rows (converted but not rewarded)
      const rows = await db
        .select()
        .from(referrals)
        .where(
          and(
            isNotNull(referrals.convertedAt),
            isNull(referrals.rewardedAt)
          )
        )
        .orderBy(desc(referrals.convertedAt));

      if (rows.length === 0) return [];

      // Fetch referrer profiles to check current tier
      const referrerIds = Array.from(new Set(rows.map(r => r.referrerUserId)));
      const referrerProfiles = await db
        .select({
          userId: businessProfiles.userId,
          tier: businessProfiles.tier,
          businessName: businessProfiles.businessName,
          planExpiresAt: businessProfiles.planExpiresAt,
        })
        .from(businessProfiles)
        .where(inArray(businessProfiles.userId, referrerIds));

      const profileMap = new Map(referrerProfiles.map(p => [p.userId, p]));

      // Fetch user names/emails for referrers and referred users
      const allUserIds = Array.from(new Set([
        ...rows.map(r => r.referrerUserId),
        ...rows.map(r => r.referredUserId),
      ]));
      const userRows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, allUserIds));
      const userMap = new Map(userRows.map(u => [u.id, u]));

      const ELIGIBLE_TIERS = ["pro", "annual"];

      return rows.map(row => {
        const referrerProfile = profileMap.get(row.referrerUserId);
        const referrerUser = userMap.get(row.referrerUserId);
        const referredUser = userMap.get(row.referredUserId);
        const isNowEligible = ELIGIBLE_TIERS.includes(referrerProfile?.tier ?? "");
        return {
          id: row.id,
          referrerUserId: row.referrerUserId,
          referredUserId: row.referredUserId,
          referralCode: row.referralCode,
          convertedAt: row.convertedAt,
          referrerName: referrerUser?.name ?? referrerUser?.email ?? `User #${row.referrerUserId}`,
          referrerEmail: referrerUser?.email ?? null,
          referrerTier: referrerProfile?.tier ?? "unknown",
          referrerPlanExpiresAt: referrerProfile?.planExpiresAt ?? null,
          referredName: referredUser?.name ?? referredUser?.email ?? `User #${row.referredUserId}`,
          isNowEligible,
        };
      });
    }),

    /** Process a single deferred reward by referral row ID */
    processOne: adminProcedure
      .input(z.object({ referralId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [row] = await db
          .select()
          .from(referrals)
          .where(eq(referrals.id, input.referralId))
          .limit(1);

        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Referral row not found" });
        if (row.rewardedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Already rewarded" });

        const { rewardReferrer } = await import("./referrals");
        await rewardReferrer(row.id, row.referrerUserId);
        return { ok: true, referralId: row.id };
      }),

    /** Process ALL eligible deferred rewards in one go */
    processAll: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rows = await db
        .select()
        .from(referrals)
        .where(
          and(
            isNotNull(referrals.convertedAt),
            isNull(referrals.rewardedAt)
          )
        );

      if (rows.length === 0) return { processed: 0, skipped: 0 };

      const ELIGIBLE_TIERS = ["pro", "annual"];
      const referrerIds = Array.from(new Set(rows.map(r => r.referrerUserId)));
      const profiles = await db
        .select({ userId: businessProfiles.userId, tier: businessProfiles.tier })
        .from(businessProfiles)
        .where(inArray(businessProfiles.userId, referrerIds));
      const tierMap = new Map(profiles.map(p => [p.userId, p.tier]));

      const { rewardReferrer } = await import("./referrals");
      let processed = 0;
      let skipped = 0;

      for (const row of rows) {
        const tier = tierMap.get(row.referrerUserId) ?? "free";
        if (ELIGIBLE_TIERS.includes(tier)) {
          await rewardReferrer(row.id, row.referrerUserId);
          processed++;
        } else {
          skipped++;
        }
      }

      console.log(`[AdminReferrals] processAll: ${processed} rewarded, ${skipped} skipped (not on paid plan)`);
      return { processed, skipped };
    }),
  }),

  /** Public churn survey submission */
  churn: router({
    submit: publicProcedure
      .input(z.object({
        reason: z.enum(["too_expensive", "not_using", "switching_tools", "missing_feature", "other"]),
        comment: z.string().max(1000).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { ok: true }; // fail silently
        const offerValidUntil = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        await db.insert(churnSurveys).values({
          userId: (ctx as any).user?.id ?? null,
          email: input.email ?? null,
          reason: input.reason,
          comment: input.comment ?? null,
          offerValidUntil,
        });
        return { ok: true, offerValidUntil };
      }),
  }),

  /** Private WordPress connector delivery for paid subscribers and administrators. */
  connector: router({
    download: paidProcedure.mutation(async () => {
      const { url } = await storageGet("connectors/get-phame-connector.zip");
      return { url, fileName: "get-phame-connector.zip" };
    }),
  }),

  /** Customer-approved binding between one WordPress installation and one Get Phame account. */
  wordpressPairing: router({
    get: protectedProcedure
      .input(z.object({ pairingId: z.string().trim().regex(/^wpb_[A-Za-z0-9_-]{12,}$/).max(64) }))
      .query(async ({ input }) => {
        const pairing = await getWordPressPairingForApproval(input.pairingId);
        if (!pairing) throw new TRPCError({ code: "NOT_FOUND", message: "This WordPress connection request was not found." });
        return pairing;
      }),
    approve: paidProcedure
      .input(z.object({ pairingId: z.string().trim().regex(/^wpb_[A-Za-z0-9_-]{12,}$/).max(64) }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await approveWordPressPairing({ userId: ctx.user.id, pairingId: input.pairingId });
        } catch (error) {
          if (error instanceof WordPressPairingError) {
            throw new TRPCError({
              code: error.code === "NOT_FOUND" ? "NOT_FOUND" : error.code === "ALREADY_APPROVED" ? "CONFLICT" : "BAD_REQUEST",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to authorize this WordPress connection.",
          });
        }
      }),
  }),

  /** Per-user API keys for the public REST API (contacts import, etc.) */
  apiKey: router({
    /** Versioned API Terms/AUP acceptance and higher-risk send-scope status for this authenticated account. */
    enrollment: protectedProcedure.query(async ({ ctx }) => {
      return getDeveloperApiEnrollmentStatus(ctx.user.id);
    }),
    /** Record affirmative acceptance without retaining a raw IP address or user-agent string. */
    acceptTerms: protectedProcedure
      .input(z.object({
        termsAccepted: z.literal(true),
        acceptableUseAccepted: z.literal(true),
      }))
      .mutation(async ({ ctx }) => {
        const forwarded = ctx.req.headers["x-forwarded-for"];
        const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim())
          || ctx.req.ip
          || ctx.req.socket.remoteAddress
          || "unknown";
        const userAgent = String(ctx.req.headers["user-agent"] || "unknown").slice(0, 256);
        return acceptDeveloperApiTerms({
          userId: ctx.user.id,
          acceptanceFingerprint: fingerprintAuthValue(`developer-api-enrollment:${clientIp}:${userAgent}`),
        });
      }),
    /** Collect business-use and consent details before enabling the higher-risk send scope. */
    requestSendScope: protectedProcedure
      .input(z.object({
        businessName: z.string().trim().min(2).max(160),
        websiteUrl: z.union([z.literal(""), z.string().trim().url().max(512)]).default(""),
        useCase: z.string().trim().min(20).max(1500),
        expectedMonthlySendVolume: z.number().int().min(1).max(1_000_000),
        consentProcess: z.string().trim().min(20).max(1500),
        confirmsExistingCustomersOnly: z.literal(true),
        confirmsNoPurchasedOrScrapedLists: z.literal(true),
        confirmsIndividualCustomerActions: z.literal(true),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await requestDeveloperSendScope({
            userId: ctx.user.id,
            businessName: input.businessName,
            websiteUrl: input.websiteUrl || null,
            useCase: input.useCase,
            expectedMonthlySendVolume: input.expectedMonthlySendVolume,
            consentProcess: input.consentProcess,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Unable to request sending access.",
          });
        }
      }),
    /** Administrator decision for high-volume send-scope requests; standard-volume requests are approved automatically. */
    reviewSendScope: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        status: z.enum(["approved", "denied"]),
        note: z.string().trim().max(500).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await reviewDeveloperSendScope({
            userId: input.userId,
            reviewerUserId: ctx.user.id,
            status: input.status,
            note: input.note,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Unable to review sending access.",
          });
        }
      }),
    /** List safe API-key metadata; raw secrets are never persisted or returned. */
    list: protectedProcedure.query(async ({ ctx }) => {
      return listDeveloperApiKeys(ctx.user.id);
    }),
    /** Generate a scoped API key — returns the raw secret exactly once. */
    generate: protectedProcedure
      .input(z.object({
        label: z.string().trim().min(1).max(100).default("My API Key"),
        scopes: z.array(z.enum(DEVELOPER_API_SCOPES)).min(1).max(DEVELOPER_API_SCOPES.length).default(["contacts:write"]),
        expiresInDays: z.number().int().min(1).max(3650).nullable().default(null),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await createDeveloperApiKey({
            userId: ctx.user.id,
            label: input.label,
            scopes: input.scopes,
            expiresAt: input.expiresInDays ? Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000 : null,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Unable to create API key.",
          });
        }
      }),
    /** Rotate an active key and reveal the replacement secret exactly once. */
    rotate: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), label: z.string().trim().min(1).max(100).optional() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await rotateDeveloperApiKey({ userId: ctx.user.id, keyId: input.id, label: input.label });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Unable to rotate API key.",
          });
        }
      }),
    /** Revoke (soft-delete) an API key. */
    revoke: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const revoked = await revokeDeveloperApiKey(ctx.user.id, input.id);
        if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "Active API key not found." });
        return { success: true };
      }),
    /** Get recent API import events */
    recentImports: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
      .query(async ({ ctx, input }) => {
        return getRecentApiImports(ctx.user.id, input.limit);
      }),
  }),

  /** Outbound webhooks — fire on contact.created events */
  webhook: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWebhookConfigs(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        url: z.string().url().max(2048),
        label: z.string().min(1).max(100).default("My Webhook"),
        secret: z.string().max(64).optional(),
        events: z.string().max(500).default("contact.created"),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getWebhookConfigs(ctx.user.id);
        if (existing.length >= 10) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 10 webhooks allowed." });
        }
        const id = await createWebhookConfig({
          userId: ctx.user.id,
          url: input.url,
          label: input.label,
          secret: input.secret,
          events: input.events,
        });
        return { success: true, id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWebhookConfig(ctx.user.id, input.id);
        return { success: true };
      }),
    /** Send a test ping to a webhook URL — logs the delivery so it appears in the Logs panel */
    test: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), url: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const { fireTestWebhook } = await import("./webhookHelpers");
        // Fetch the secret for this webhook (if any) so the signature header is correct
        const configs = await getWebhookConfigs(ctx.user.id);
        const cfg = configs.find((c) => c.id === input.id);
        const secret = cfg?.secret ?? null;
        return fireTestWebhook(input.id, ctx.user.id, input.url, secret);
      }),
    /** Get the last 5 delivery logs for a specific webhook */
    deliveryLogs: protectedProcedure
      .input(z.object({ webhookId: z.number().int().positive(), limit: z.number().int().min(1).max(20).default(5) }))
      .query(async ({ ctx, input }) => {
        const configs = await getWebhookConfigs(ctx.user.id);
        const owned = configs.find((c) => c.id === input.webhookId);
        if (!owned) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
        return getWebhookDeliveryLogs(input.webhookId, input.limit);
      }),
    /** Retry a specific failed delivery log entry */
    retryDelivery: protectedProcedure
      .input(z.object({ webhookId: z.number().int().positive(), logId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const configs = await getWebhookConfigs(ctx.user.id);
        const cfg = configs.find((c) => c.id === input.webhookId);
        if (!cfg) throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
        const logs = await getWebhookDeliveryLogs(input.webhookId, 20);
        const log = logs.find((l) => l.id === input.logId);
        if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Delivery log not found." });
        const { retryWebhookDelivery } = await import("./webhookHelpers");
        return retryWebhookDelivery(cfg.id, ctx.user.id, cfg.url, cfg.secret ?? null, log.event ?? "contact.created", null);
      }),
  }),
  /** User notification preferences */
  notificationPrefs: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPrefs(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        wooAutoImportNotify: z.boolean().optional(),
        notifyOnEmailOpen: z.boolean().optional(),
        onboardingTipsEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateNotificationPrefs(ctx.user.id, input);
        return { success: true };
      }),
  }),

  /** Client reviews — reviews manually logged by the business owner */
  reviews: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(clientReviews)
          .where(eq(clientReviews.userId, ctx.user.id))
          .orderBy(desc(clientReviews.reviewedAt))
          .limit(input.limit);
      }),
    add: protectedProcedure
      .input(z.object({
        reviewerName: z.string().min(1).max(255),
        rating: z.number().int().min(1).max(5),
        reviewText: z.string().max(2000).optional(),
        platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]).default("google"),
        reviewedAt: z.number().optional(),
        requestId: z.number().int().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [result] = await db.insert(clientReviews).values({
          userId: ctx.user.id,
          reviewerName: input.reviewerName,
          rating: input.rating,
          reviewText: input.reviewText ?? null,
          platform: input.platform,
          reviewedAt: input.reviewedAt ?? Date.now(),
          requestId: input.requestId ?? null,
        });
        return { id: result.insertId };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        reviewerName: z.string().min(1).max(255).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        reviewText: z.string().max(2000).optional(),
        platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]).optional(),
        reviewedAt: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { id, ...fields } = input;
        await db.update(clientReviews).set(fields).where(eq(clientReviews.id, id));
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.delete(clientReviews).where(eq(clientReviews.id, input.id));
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0, avgRating: 0, byPlatform: {} };
      const rows = await db.select().from(clientReviews).where(eq(clientReviews.userId, ctx.user.id));
      const total = rows.length;
      const avgRating = total > 0 ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
      const byPlatform: Record<string, number> = {};
      for (const r of rows) { byPlatform[r.platform] = (byPlatform[r.platform] ?? 0) + 1; }
      return { total, avgRating: Math.round(avgRating * 10) / 10, byPlatform };
    }),
  }),

  /** Analytics / page event tracking */
  analytics: router({
    /** Authenticated zero-result Manual searches only; role scope is verified against the session. */
    trackManualZeroResultSearch: protectedProcedure
      .input(z.object({
        query: z.string().min(2).max(100),
        resultCount: z.literal(0),
        locale: z.enum(MANUAL_SEARCH_LOCALES),
        manualRole: z.enum(MANUAL_SEARCH_ROLES),
        manualVersion: z.string().trim().min(8).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        const sessionRole = ctx.user.role === "admin" ? "admin" : "user";
        if (input.manualRole !== sessionRole) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Manual scope does not match the authenticated account." });
        }
        checkManualSearchEventRateLimit(ctx.user.id);
        const db = await getDb();
        if (!db) return { ok: true as const };
        return recordManualZeroResultSearch({
          db,
          userId: ctx.user.id,
          query: input.query,
          manualRole: input.manualRole,
          locale: input.locale,
          manualVersion: input.manualVersion,
        });
      }),
    /** Authenticated, allowlisted checklist telemetry. It captures no device, referrer, or customer content. */
    trackOnboardingChecklistEvent: protectedProcedure
      .input(z.object({ event: z.enum(ONBOARDING_CHECKLIST_EVENT_NAMES) }))
      .mutation(async ({ ctx, input }) => {
        checkOnboardingChecklistEventRateLimit(ctx.user.id);
        const db = await getDb();
        if (!db) return { ok: true };
        await db.insert(pageEvents).values({
          userId: ctx.user.id,
          page: toOnboardingChecklistEventPage(input.event),
          utmSource: ONBOARDING_CHECKLIST_EVENT_SOURCE,
          utmMedium: null,
          utmCampaign: "setup_funnel",
          referrer: null,
          userAgent: null,
        });
        return { ok: true };
      }),
    trackPwaEvent: publicProcedure
      .input(z.object({
        event: z.enum(PWA_EVENT_NAMES),
        platform: z.enum(["ios", "android", "desktop", "unknown"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { ok: true };
        await db.insert(pageEvents).values({
          userId: null,
          page: toPwaEventPage(input.event),
          utmSource: PWA_EVENT_SOURCE,
          utmMedium: input.platform,
          utmCampaign: "install_conversion",
          referrer: null,
          userAgent: null,
        });
        return { ok: true };
      }),
    /** Explicit caption-language selections only; bounded language code and no visitor identity or raw context. */
    trackCaptionLanguage: publicProcedure
      .input(z.object({ language: z.enum(CAPTION_LANGUAGE_ANALYTICS_LANGUAGES) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { ok: true };
        await db.insert(pageEvents).values({
          userId: null,
          page: toCaptionLanguageEventPage(input.language),
          utmSource: CAPTION_LANGUAGE_ANALYTICS_SOURCE,
          utmMedium: input.language,
          utmCampaign: "walkthrough_caption_language",
          referrer: null,
          userAgent: null,
        });
        return { ok: true };
      }),
    trackPageView: publicProcedure
      .input(z.object({
        page: z.string().max(255),
        utmSource: z.string().max(128).optional(),
        utmMedium: z.string().max(128).optional(),
        utmCampaign: z.string().max(128).optional(),
        referrer: z.string().max(2048).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { ok: true };
        await db.insert(pageEvents).values({
          userId: (ctx as any).user?.id ?? null,
          page: input.page,
          utmSource: input.utmSource ?? null,
          utmMedium: input.utmMedium ?? null,
          utmCampaign: input.utmCampaign ?? null,
          referrer: input.referrer ?? null,
          userAgent: (ctx as any).req?.headers?.["user-agent"]?.slice(0, 512) ?? null,
        });
        return { ok: true };
      }),
  }),
  bulkSender: bulkSenderRouter,

  /** Referral / affiliate system */
  referral: router({
    /** Get (or generate) the current user's referral code and share URL */
    getCode: protectedProcedure.query(async ({ ctx }) => {
      const code = await getOrCreateReferralCode(ctx.user.id);
      const shareUrl = `https://getphame.app/ref/${code}`;
      return { code, shareUrl };
    }),

    /** Get referral stats for the current user */
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalReferrals: 0, convertedReferrals: 0, monthsEarned: 0 };
      const rows = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerUserId, ctx.user.id));
      const totalReferrals = rows.length;
      const convertedReferrals = rows.filter(r => r.convertedAt !== null).length;
      const monthsEarned = rows.filter(r => r.rewardedAt !== null).length;
      return { totalReferrals, convertedReferrals, monthsEarned };
    }),

    /** Called on signup when a ?ref=CODE param was present — links the new user to the referrer */
    claimReferral: protectedProcedure
      .input(z.object({ code: z.string().min(4).max(32) }))
      .mutation(async ({ ctx, input }) => {
        const referrerUserId = await getReferrerByCode(input.code);
        if (!referrerUserId || referrerUserId === ctx.user.id) return { ok: false };
        await recordReferral(referrerUserId, ctx.user.id, input.code);
        return { ok: true };
      }),
  }),

  /** Anonymous landing-footer support form with a deliberately inert honeypot. */
  support: router({
    uploadScreenshot: publicProcedure
      .input(z.object({
        filename: z.string().trim().min(1).max(255),
        mimeType: z.enum(SUPPORT_ATTACHMENT_MIME_TYPES),
        dataBase64: z.string().min(4).max(11_200_000),
        website: z.string().max(250).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Keep honeypot responses deliberately uninformative and avoid storage writes.
        if (input.website) return { ok: true as const, attachment: null };

        const forwarded = ctx.req.headers["x-forwarded-for"];
        const requestKey = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() || ctx.req.ip || "anonymous";
        checkSupportAttachmentRateLimit(requestKey);

        const data = Buffer.from(input.dataBase64, "base64");
        if (data.length === 0 || data.length > MAX_SUPPORT_ATTACHMENT_BYTES || !isValidSupportScreenshot(data, input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Upload a valid JPG, PNG, or WebP screenshot up to 8 MB.",
          });
        }

        const extension = getSupportAttachmentExtension(input.mimeType);
        const key = `support-screenshots/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
        await storagePut(key, data, input.mimeType);

        return {
          ok: true as const,
          attachment: {
            key,
            filename: sanitizeSupportAttachmentFilename(input.filename),
            mimeType: input.mimeType,
            size: data.length,
          },
        };
      }),
    submit: publicProcedure
      .input(z.object({
        name: z.string().trim().max(80).optional(),
        email: z.string().trim().toLowerCase().email().max(254),
        topic: z.enum(SUPPORT_TOPICS),
        subject: z.string().trim().min(3).max(120).refine((value) => !/[\r\n]/.test(value), "Invalid subject"),
        message: z.string().trim().min(10).max(4000),
        attachment: z.object({
          key: z.string().startsWith("support-screenshots/").max(512),
          filename: z.string().trim().min(1).max(255),
          mimeType: z.enum(SUPPORT_ATTACHMENT_MIME_TYPES),
          size: z.number().int().positive().max(MAX_SUPPORT_ATTACHMENT_BYTES),
        }).optional(),
        website: z.string().max(250).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Accept honeypot submissions without sending an email so bots receive no useful signal.
        if (input.website) return { ok: true, sent: true };

        const forwarded = ctx.req.headers["x-forwarded-for"];
        const requestKey = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() || ctx.req.ip || "anonymous";
        checkSupportSubmissionRateLimit(requestKey);

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "We could not save your message right now. Please try again shortly.",
          });
        }

        const [insertResult] = await db.insert(supportSubmissions).values({
          name: input.name || null,
          email: input.email,
          topic: input.topic,
          subject: input.subject,
          message: input.message,
          priority: "normal",
          slaTargetAt: getSupportSlaTargetAt("normal"),
          attachmentKey: input.attachment?.key ?? null,
          attachmentFilename: input.attachment?.filename ?? null,
          attachmentMimeType: input.attachment?.mimeType ?? null,
          attachmentSize: input.attachment?.size ?? null,
        });
        const submissionId = Number((insertResult as { insertId?: number }).insertId ?? 0);
        if (!submissionId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "We could not save your message right now. Please try again shortly.",
          });
        }

        const attachment = input.attachment
          ? {
              filename: input.attachment.filename,
              url: (await storageGet(input.attachment.key)).url,
            }
          : undefined;
        const result = await sendSupportMessage({
          name: input.name,
          email: input.email,
          topic: input.topic,
          subject: input.subject,
          message: input.message,
          submissionId,
          attachment,
        });
        if (!result.sent) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "We could not send your message right now. Please try again shortly.",
          });
        }

        await db.update(supportSubmissions)
          .set({ notificationSentAt: new Date() })
          .where(eq(supportSubmissions.id, submissionId));

        return { ok: true, sent: true, submissionId };
      }),
    adminList: adminProcedure
      .input(z.object({
        status: z.enum(SUPPORT_SUBMISSION_STATUSES).optional(),
        topic: z.enum(SUPPORT_TOPICS).optional(),
        priority: z.enum(SUPPORT_PRIORITIES).optional(),
        assigneeScope: z.enum(SUPPORT_QUEUE_ASSIGNEE_SCOPES).optional(),
        assigneeUserId: z.union([z.literal("unassigned"), z.number().int().positive()]).optional(),
        slaWindow: z.enum(SUPPORT_QUEUE_SLA_WINDOWS).optional(),
        // Retained while existing inbox clients migrate to the canonical slaWindow field.
        slaDeadline: z.enum(["overdue", "next_24h"]).optional(),
        sort: z.enum(SUPPORT_QUEUE_SORTS).optional(),
      }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const now = new Date();
        const next4Hours = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const selectedSort = input?.sort ?? "newest";
        const selectedAssigneeScope = input?.assigneeScope
          ?? (input?.assigneeUserId === "unassigned" ? "unassigned" : typeof input?.assigneeUserId === "number" ? "specific" : "any");
        const selectedSlaWindow = input?.slaWindow
          ?? (input?.slaDeadline === "overdue" ? "overdue" : input?.slaDeadline === "next_24h" ? "next_24_hours" : undefined);
        if (selectedAssigneeScope === "specific" && typeof input?.assigneeUserId !== "number") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an administrator for a specific-assignee queue filter." });
        }
        const orderBy = selectedSort === "oldest"
          ? [asc(supportSubmissions.createdAt), asc(supportSubmissions.id)]
          : selectedSort === "priority"
            ? [desc(sql`CASE ${supportSubmissions.priority} WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END`), desc(supportSubmissions.createdAt)]
            : selectedSort === "assignee"
              ? [asc(sql`CASE WHEN ${supportSubmissions.assigneeUserId} IS NULL THEN 1 ELSE 0 END`), asc(users.name), desc(supportSubmissions.createdAt)]
            : selectedSort === "sla_soonest"
              ? [asc(sql`CASE WHEN ${supportSubmissions.slaTargetAt} IS NULL THEN 1 ELSE 0 END`), asc(supportSubmissions.slaTargetAt), desc(supportSubmissions.createdAt)]
              : selectedSort === "due_soonest"
                ? [asc(sql`CASE WHEN ${supportSubmissions.dueAt} IS NULL THEN 1 ELSE 0 END`), asc(supportSubmissions.dueAt), desc(supportSubmissions.createdAt)]
                : [desc(supportSubmissions.createdAt), desc(supportSubmissions.id)];

        const rows = await db.select({
          id: supportSubmissions.id,
          name: supportSubmissions.name,
          email: supportSubmissions.email,
          topic: supportSubmissions.topic,
          subject: supportSubmissions.subject,
          message: supportSubmissions.message,
          status: supportSubmissions.status,
          priority: supportSubmissions.priority,
          assigneeUserId: supportSubmissions.assigneeUserId,
          dueAt: supportSubmissions.dueAt,
          slaTargetAt: supportSubmissions.slaTargetAt,
          firstRespondedAt: supportSubmissions.firstRespondedAt,
          assigneeName: users.name,
          assigneeEmail: users.email,
          attachmentKey: supportSubmissions.attachmentKey,
          attachmentFilename: supportSubmissions.attachmentFilename,
          attachmentMimeType: supportSubmissions.attachmentMimeType,
          attachmentSize: supportSubmissions.attachmentSize,
          notificationSentAt: supportSubmissions.notificationSentAt,
          resolvedAt: supportSubmissions.resolvedAt,
          createdAt: supportSubmissions.createdAt,
          updatedAt: supportSubmissions.updatedAt,
        })
          .from(supportSubmissions)
          .leftJoin(users, eq(supportSubmissions.assigneeUserId, users.id))
          .where(and(
            input?.status ? eq(supportSubmissions.status, input.status) : sql`1 = 1`,
            input?.topic ? eq(supportSubmissions.topic, input.topic) : sql`1 = 1`,
            input?.priority ? eq(supportSubmissions.priority, input.priority) : sql`1 = 1`,
            selectedAssigneeScope === "unassigned"
              ? isNull(supportSubmissions.assigneeUserId)
              : selectedAssigneeScope === "specific" && typeof input?.assigneeUserId === "number"
                ? eq(supportSubmissions.assigneeUserId, input.assigneeUserId)
                : sql`1 = 1`,
            selectedSlaWindow === "overdue"
              ? and(
                isNotNull(supportSubmissions.slaTargetAt),
                lte(supportSubmissions.slaTargetAt, now),
                ne(supportSubmissions.status, "resolved"),
              )
              : selectedSlaWindow === "next_4_hours"
                ? and(
                  isNotNull(supportSubmissions.slaTargetAt),
                  gte(supportSubmissions.slaTargetAt, now),
                  lte(supportSubmissions.slaTargetAt, next4Hours),
                  ne(supportSubmissions.status, "resolved"),
                )
                : selectedSlaWindow === "next_24_hours"
                ? and(
                  isNotNull(supportSubmissions.slaTargetAt),
                  gte(supportSubmissions.slaTargetAt, now),
                  lte(supportSubmissions.slaTargetAt, next24Hours),
                  ne(supportSubmissions.status, "resolved"),
                )
                : sql`1 = 1`,
          ))
          .orderBy(...orderBy)
          .limit(250);

        return Promise.all(rows.map(async (row) => ({
          ...row,
          attachmentUrl: row.attachmentKey
            ? await storageGet(row.attachmentKey).then((attachment) => attachment.url).catch(() => null)
            : null,
        }))); 
      }),
    adminMetrics: adminProcedure
      .input(supportMetricsInputSchema.optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support reporting is unavailable." });

        return getSupportMetricsSnapshot(db, input);
      }),
    exportMetricsCsv: adminProcedure
      .input(supportMetricsInputSchema.optional())
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support reporting is unavailable." });

        const metrics = await getSupportMetricsSnapshot(db, input);
        const period = metrics.periodLabel;
        const rows = [
          { section: "metadata", metric: "generated_at", period, value: metrics.generatedAt.toISOString(), unit: "iso_8601", details: "Get Phame support SLA performance export" },
          { section: "support_sla", metric: "tickets_created", period, value: metrics.ticketsCreated, unit: "tickets", details: "Tickets created during the selected period" },
          { section: "support_sla", metric: "tickets_resolved", period, value: metrics.resolvedTickets, unit: "tickets", details: "Tickets with a recorded resolution during the selected period" },
          { section: "support_sla", metric: "tickets_open", period, value: metrics.openTickets, unit: "tickets", details: "Created-period tickets not currently resolved" },
          { section: "support_sla", metric: "first_response_samples", period, value: metrics.firstResponseCount, unit: "tickets", details: "Tickets with a recorded first response" },
          { section: "support_sla", metric: "average_first_response", period, value: metrics.avgFirstResponseMs ?? "unavailable", unit: "milliseconds", details: "Average elapsed time from creation to first response" },
          { section: "support_sla", metric: "average_resolution", period, value: metrics.avgResolutionMs ?? "unavailable", unit: "milliseconds", details: "Average elapsed time from creation to resolution" },
          { section: "support_sla", metric: "overdue_tickets", period, value: metrics.overdueTickets, unit: "tickets", details: "Open tickets with an SLA target before export generation" },
        ];
        const dateStamp = metrics.generatedAt.toISOString().slice(0, 10);
        return {
          filename: `getphame-support-sla-${period}-${dateStamp}.csv`,
          csv: serializeAdminOperationsCsv(rows),
          mimeType: "text/csv;charset=utf-8",
          generatedAt: metrics.generatedAt,
          rowCount: rows.length,
        };
      }),
    savedViews: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Saved support queue views are unavailable." });

      return db.select({
        id: supportSavedQueueViews.id,
        ownerUserId: supportSavedQueueViews.ownerUserId,
        ownerName: users.name,
        name: supportSavedQueueViews.name,
        visibility: supportSavedQueueViews.visibility,
        status: supportSavedQueueViews.status,
        topic: supportSavedQueueViews.topic,
        priority: supportSavedQueueViews.priority,
        assigneeScope: supportSavedQueueViews.assigneeScope,
        assigneeUserId: supportSavedQueueViews.assigneeUserId,
        slaWindow: supportSavedQueueViews.slaWindow,
        sort: supportSavedQueueViews.sort,
        createdAt: supportSavedQueueViews.createdAt,
        updatedAt: supportSavedQueueViews.updatedAt,
      })
        .from(supportSavedQueueViews)
        .leftJoin(users, eq(supportSavedQueueViews.ownerUserId, users.id))
        .where(or(
          eq(supportSavedQueueViews.ownerUserId, ctx.user.id),
          eq(supportSavedQueueViews.visibility, "team"),
        ))
        .orderBy(desc(supportSavedQueueViews.updatedAt), desc(supportSavedQueueViews.id))
        .limit(MAX_SUPPORT_SAVED_QUEUE_VIEWS * 5);
    }),
    saveView: adminProcedure
      .input(z.object({
        name: z.string().trim().min(1).max(MAX_SUPPORT_SAVED_QUEUE_VIEW_NAME_CHARS),
        status: z.enum(SUPPORT_SUBMISSION_STATUSES).nullable().optional(),
        topic: z.enum(SUPPORT_TOPICS).nullable().optional(),
        priority: z.enum(SUPPORT_PRIORITIES).nullable().optional(),
        assigneeScope: z.enum(SUPPORT_QUEUE_ASSIGNEE_SCOPES).default("any"),
        assigneeUserId: z.number().int().positive().nullable().optional(),
        slaWindow: z.enum(SUPPORT_QUEUE_SLA_WINDOWS).nullable().optional(),
        sort: z.enum(SUPPORT_QUEUE_SORTS).default("newest"),
        visibility: z.enum(SUPPORT_QUEUE_VIEW_VISIBILITIES).default("private"),
      }).superRefine((value, issueContext) => {
        if (value.assigneeScope === "specific" && value.assigneeUserId === null) {
          issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["assigneeUserId"], message: "Choose an administrator for a specific-assignee view." });
        }
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Saved support queue views are unavailable." });

        const name = input.name.replace(/\s+/g, " ").trim();
        const normalizedName = normalizeSupportQueueViewName(name);
        if (!normalizedName) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a name for this queue view." });

        const assigneeUserId = input.assigneeScope === "specific" ? input.assigneeUserId ?? null : null;
        if (assigneeUserId !== null) {
          const [assignee] = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, assigneeUserId), eq(users.role, "admin")))
            .limit(1);
          if (!assignee) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an active administrator for this queue view." });
        }

        const [existing] = await db.select({ id: supportSavedQueueViews.id })
          .from(supportSavedQueueViews)
          .where(and(
            eq(supportSavedQueueViews.ownerUserId, ctx.user.id),
            eq(supportSavedQueueViews.normalizedName, normalizedName),
          ))
          .limit(1);
        const viewFields = {
          name,
          normalizedName,
          status: input.status ?? null,
          topic: input.topic ?? null,
          priority: input.priority ?? null,
          assigneeScope: input.assigneeScope,
          assigneeUserId,
          slaWindow: input.slaWindow ?? null,
          sort: input.sort,
          visibility: input.visibility,
          updatedAt: new Date(),
        };
        if (existing) {
          await db.update(supportSavedQueueViews)
            .set(viewFields)
            .where(and(eq(supportSavedQueueViews.id, existing.id), eq(supportSavedQueueViews.ownerUserId, ctx.user.id)));
          return { id: existing.id, created: false as const };
        }

        const [ownedCount] = await db.select({ value: count(supportSavedQueueViews.id) })
          .from(supportSavedQueueViews)
          .where(eq(supportSavedQueueViews.ownerUserId, ctx.user.id));
        if (Number(ownedCount?.value ?? 0) >= MAX_SUPPORT_SAVED_QUEUE_VIEWS) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `You can save up to ${MAX_SUPPORT_SAVED_QUEUE_VIEWS} support queue views.` });
        }
        const inserted = await db.insert(supportSavedQueueViews).values({
          ownerUserId: ctx.user.id,
          ...viewFields,
        }).$returningId();
        const id = inserted[0]?.id;
        if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save this queue view." });
        return { id, created: true as const };
      }),
    deleteView: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Saved support queue views are unavailable." });

        await db.delete(supportSavedQueueViews)
          .where(and(eq(supportSavedQueueViews.id, input.id), eq(supportSavedQueueViews.ownerUserId, ctx.user.id)));
        return { ok: true as const };
      }),
    checkSlaBreach: adminProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support alerts are unavailable." });

      const now = new Date();
      const policy = await getSupportEscalationPolicySettings(db);
      const breachCutoff = new Date(now.getTime() - policy.breachThresholdMinutes * 60 * 1000);
      const breachedTickets = await db.select({
        id: supportSubmissions.id,
        assigneeUserId: supportSubmissions.assigneeUserId,
        slaTargetAt: supportSubmissions.slaTargetAt,
      })
        .from(supportSubmissions)
        .where(and(
          eq(supportSubmissions.priority, "urgent"),
          ne(supportSubmissions.status, "resolved"),
          isNotNull(supportSubmissions.slaTargetAt),
          lte(supportSubmissions.slaTargetAt, breachCutoff),
        ));
      const admins = policy.includeAllAdminsWhenUnassigned
        ? await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"))
        : [];
      let alertedTicketCount = 0;
      for (const ticket of breachedTickets) {
        const recipientUserIds = Array.from(new Set([
          ...policy.recipientUserIds,
          ...(policy.includeAssignee && ticket.assigneeUserId ? [ticket.assigneeUserId] : []),
          ...(!ticket.assigneeUserId && policy.includeAllAdminsWhenUnassigned ? admins.map((admin) => admin.id) : []),
        ]));
        await queueSupportTicketAlerts(db, {
          ticketId: ticket.id,
          recipientUserIds,
          actorUserId: ctx.user.id,
          type: "sla_breach",
          dedupSince: ticket.slaTargetAt ?? now,
        });
        alertedTicketCount += 1;
      }
      return { checkedTicketCount: breachedTickets.length, alertedTicketCount, breachThresholdMinutes: policy.breachThresholdMinutes };
    }),
    escalationPolicy: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support escalation policy is unavailable." });

      return getSupportEscalationPolicySettings(db);
    }),
    updateEscalationPolicy: adminProcedure
      .input(z.object({
        breachThresholdMinutes: z.number().int().min(0).max(MAX_SUPPORT_ESCALATION_THRESHOLD_MINUTES),
        includeAssignee: z.boolean(),
        includeAllAdminsWhenUnassigned: z.boolean(),
        recipientUserIds: z.array(z.number().int().positive()).max(25),
      }).superRefine((value, issueContext) => {
        if (!value.includeAssignee && !value.includeAllAdminsWhenUnassigned && value.recipientUserIds.length === 0) {
          issueContext.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientUserIds"], message: "Keep at least one escalation recipient route enabled." });
        }
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support escalation policy is unavailable." });

        const recipientUserIds = Array.from(new Set(input.recipientUserIds));
        if (recipientUserIds.length > 0) {
          const validAdmins = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.role, "admin"), inArray(users.id, recipientUserIds)));
          if (validAdmins.length !== recipientUserIds.length) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Choose only active administrators as escalation recipients." });
          }
        }

        const updatedAt = new Date();
        await db.insert(supportEscalationPolicies).values({
          policyKey: SUPPORT_ESCALATION_POLICY_KEY,
          breachThresholdMinutes: input.breachThresholdMinutes,
          includeAssignee: input.includeAssignee,
          includeAllAdminsWhenUnassigned: input.includeAllAdminsWhenUnassigned,
          updatedAt,
        }).onDuplicateKeyUpdate({ set: {
          breachThresholdMinutes: input.breachThresholdMinutes,
          includeAssignee: input.includeAssignee,
          includeAllAdminsWhenUnassigned: input.includeAllAdminsWhenUnassigned,
          updatedAt,
        } });

        const [policy] = await db.select({ id: supportEscalationPolicies.id })
          .from(supportEscalationPolicies)
          .where(eq(supportEscalationPolicies.policyKey, SUPPORT_ESCALATION_POLICY_KEY))
          .limit(1);
        if (!policy) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save the support escalation policy." });

        await db.delete(supportEscalationPolicyRecipients)
          .where(eq(supportEscalationPolicyRecipients.policyId, policy.id));
        if (recipientUserIds.length > 0) {
          await db.insert(supportEscalationPolicyRecipients).values(recipientUserIds.map((recipientUserId) => ({
            policyId: policy.id,
            recipientUserId,
          })));
        }
        return getSupportEscalationPolicySettings(db);
      }),
    /** Eligible support operators are sourced from the authoritative admin user directory. */
    adminAssignees: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
        .from(users)
        .where(eq(users.role, "admin"))
        .orderBy(users.name, users.email);
    }),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(SUPPORT_SUBMISSION_STATUSES),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        await db.update(supportSubmissions)
          .set({
            status: input.status,
            resolvedAt: input.status === "resolved" ? new Date() : null,
          })
          .where(eq(supportSubmissions.id, input.id));
        if (input.status !== "open") await recordSupportFirstResponse(db, input.id);
        return { ok: true as const };
      }),
    updatePriority: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        priority: z.enum(SUPPORT_PRIORITIES),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const [ticket] = await db.select({
          id: supportSubmissions.id,
          status: supportSubmissions.status,
          priority: supportSubmissions.priority,
          assigneeUserId: supportSubmissions.assigneeUserId,
        })
          .from(supportSubmissions)
          .where(eq(supportSubmissions.id, input.id))
          .limit(1);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Support ticket not found." });

        const escalated = isSupportEscalation(ticket.priority as SupportPriority, input.priority);
        await db.update(supportSubmissions)
          .set({
            priority: input.priority,
            // Re-arm the persisted target only when urgency increases. Lowering
            // priority must not quietly relax a previously committed target.
            ...(escalated ? { slaTargetAt: getSupportSlaTargetAt(input.priority) } : {}),
          })
          .where(eq(supportSubmissions.id, input.id));

        if (escalated && ticket.status !== "resolved") {
          const recipientUserIds = ticket.assigneeUserId
            ? [ticket.assigneeUserId]
            : (await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"))).map((admin) => admin.id);
          await queueSupportTicketAlerts(db, {
            ticketId: ticket.id,
            recipientUserIds,
            actorUserId: ctx.user.id,
            type: "escalation",
          });
        }
        return { ok: true as const };
      }),
    updateAssignee: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        assigneeUserId: z.number().int().positive().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const [ticket] = await db.select({ id: supportSubmissions.id, assigneeUserId: supportSubmissions.assigneeUserId })
          .from(supportSubmissions)
          .where(eq(supportSubmissions.id, input.id))
          .limit(1);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Support ticket not found." });

        if (input.assigneeUserId !== null) {
          const [assignee] = await db.select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, input.assigneeUserId), eq(users.role, "admin")))
            .limit(1);
          if (!assignee) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Choose an active administrator as the support ticket assignee.",
            });
          }
        }

        await db.update(supportSubmissions)
          .set({ assigneeUserId: input.assigneeUserId })
          .where(eq(supportSubmissions.id, input.id));

        if (input.assigneeUserId !== null && input.assigneeUserId !== ticket.assigneeUserId) {
          await queueSupportTicketAlerts(db, {
            ticketId: ticket.id,
            recipientUserIds: [input.assigneeUserId],
            actorUserId: ctx.user.id,
            type: "assignment",
          });
        }
        return { ok: true as const };
      }),
    updateDueAt: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        dueAt: z.string().datetime({ offset: true }).nullable(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const [ticket] = await db.select({ id: supportSubmissions.id })
          .from(supportSubmissions)
          .where(eq(supportSubmissions.id, input.id))
          .limit(1);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Support ticket not found." });

        const dueAt = input.dueAt ? new Date(input.dueAt) : null;
        if (dueAt && dueAt.getTime() > Date.now() + MAX_SUPPORT_DUE_DATE_FUTURE_DAYS * 24 * 60 * 60 * 1000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Set a due date within the next ${MAX_SUPPORT_DUE_DATE_FUTURE_DAYS} days.`,
          });
        }

        await db.update(supportSubmissions)
          .set({ dueAt })
          .where(eq(supportSubmissions.id, input.id));
        return { ok: true as const };
      }),
    internalNotes: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const notes = await db.select({
          id: supportInternalNotes.id,
          body: supportInternalNotes.body,
          bodyPlainText: supportInternalNotes.bodyPlainText,
          createdAt: supportInternalNotes.createdAt,
          authorUserId: supportInternalNotes.authorUserId,
          authorName: users.name,
          authorEmail: users.email,
        })
          .from(supportInternalNotes)
          .leftJoin(users, eq(supportInternalNotes.authorUserId, users.id))
          .where(eq(supportInternalNotes.ticketId, input.id))
          .orderBy(desc(supportInternalNotes.createdAt));

        const noteIds = notes.map((note) => note.id);
        const mentions = noteIds.length === 0
          ? []
          : await db.select({
            noteId: supportInternalNoteMentions.noteId,
            userId: supportInternalNoteMentions.mentionedUserId,
            name: users.name,
            email: users.email,
          })
            .from(supportInternalNoteMentions)
            .leftJoin(users, eq(supportInternalNoteMentions.mentionedUserId, users.id))
            .where(inArray(supportInternalNoteMentions.noteId, noteIds));

        return notes.map((note) => ({
          ...note,
          // New notes carry the authoritative plain-text derivative; legacy notes
          // are escaped and rendered as safe text by the same constrained renderer.
          bodyHtml: note.bodyPlainText !== null ? note.body : renderSupportInternalNoteHtml(note.body),
          displayText: note.bodyPlainText ?? getSupportInternalNotePlainText(note.body),
          mentions: mentions
            .filter((mention) => mention.noteId === note.id)
            .map(({ userId, name, email }) => ({ userId, name, email })),
        }));
      }),
    addInternalNote: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        body: z.string().trim().min(1).max(MAX_SUPPORT_INTERNAL_NOTE_CHARS),
        mentionUserIds: z.array(z.number().int().positive()).max(MAX_SUPPORT_INTERNAL_NOTE_MENTIONS).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support inbox is unavailable." });

        const [ticket] = await db.select({ id: supportSubmissions.id })
          .from(supportSubmissions)
          .where(eq(supportSubmissions.id, input.id))
          .limit(1);
        if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Support ticket not found." });

        const mentionUserIds = Array.from(new Set(input.mentionUserIds));
        if (mentionUserIds.length > 0) {
          const mentionableAdmins = await db.select({ id: users.id })
            .from(users)
            .where(and(inArray(users.id, mentionUserIds), eq(users.role, "admin")));
          if (mentionableAdmins.length !== mentionUserIds.length) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Mention only active administrators." });
          }
        }

        const bodyHtml = renderSupportInternalNoteHtml(input.body);
        const bodyPlainText = getSupportInternalNotePlainText(input.body);
        const inserted = await db.insert(supportInternalNotes).values({
          ticketId: ticket.id,
          authorUserId: ctx.user.id,
          body: bodyHtml,
          bodyPlainText,
        }).$returningId();
        const noteId = inserted[0]?.id;
        if (!noteId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not save internal note." });

        if (mentionUserIds.length > 0) {
          await db.insert(supportInternalNoteMentions).values(
            mentionUserIds.map((mentionedUserId) => ({ noteId, mentionedUserId })),
          );
          await queueSupportTicketAlerts(db, {
            ticketId: ticket.id,
            recipientUserIds: mentionUserIds.filter((mentionedUserId) => mentionedUserId !== ctx.user.id),
            actorUserId: ctx.user.id,
            type: "mention",
          });
        }
        await recordSupportFirstResponse(db, ticket.id);
        return { ok: true as const };
      }),
    myTicketAlerts: adminProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support alerts are unavailable." });

      return db.select({
        id: supportTicketAlerts.id,
        ticketId: supportTicketAlerts.ticketId,
        type: supportTicketAlerts.type,
        createdAt: supportTicketAlerts.createdAt,
        subject: supportSubmissions.subject,
        priority: supportSubmissions.priority,
        actorName: users.name,
      })
        .from(supportTicketAlerts)
        .leftJoin(supportSubmissions, eq(supportTicketAlerts.ticketId, supportSubmissions.id))
        .leftJoin(users, eq(supportTicketAlerts.actorUserId, users.id))
        .where(and(
          eq(supportTicketAlerts.recipientUserId, ctx.user.id),
          isNull(supportTicketAlerts.readAt),
        ))
        .orderBy(desc(supportTicketAlerts.createdAt))
        .limit(20);
    }),
    markTicketAlertsRead: adminProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(20) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Support alerts are unavailable." });

        await db.update(supportTicketAlerts)
          .set({ readAt: new Date() })
          .where(and(
            eq(supportTicketAlerts.recipientUserId, ctx.user.id),
            inArray(supportTicketAlerts.id, input.ids),
            isNull(supportTicketAlerts.readAt),
          ));
        return { ok: true as const };
      }),
  }),

  /** Landing page lead capture — stores email and sends the free guide PDF */
  leadCapture: router({
    submit: publicProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        const now = Date.now();
        const normalizedEmail = input.email;
        let stored = false;

        if (db) {
          try {
            // Upsert without coupling guide access to app signup or duplicate rows.
            await db
              .insert(leads)
              .values({ email: normalizedEmail, createdAt: now })
              .onDuplicateKeyUpdate({ set: { email: normalizedEmail } });
            stored = true;
          } catch (error) {
            // A persistence outage must not block access to the promised guide.
            console.error("[LeadCapture] Failed to store lead:", error);
          }
        }

        // Attempt to send the guide email
        const { sent } = await sendLeadGuideEmail(normalizedEmail);

        // Mark guideSentAt if email was sent successfully
        if (sent && db && stored) {
          await db
            .update(leads)
            .set({ guideSentAt: Date.now() })
            .where(eq(leads.email, normalizedEmail));
        }

        return {
          ok: true,
          sent,
          providerAccepted: sent,
          stored,
          downloadUrl: GUIDE_PDF_URL,
          message: sent
            ? "Your email provider accepted the guide for delivery."
            : "Email delivery is unavailable, but your guide is ready to download.",
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
