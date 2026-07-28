/**
 * Public REST API — unauthenticated by session cookie, authenticated by API key.
 * Exposes a single endpoint for now:
 *   POST /api/public/contacts  — import a contact from a website form
 *
 * Authentication: Bearer token in Authorization header.
 *   Authorization: Bearer rl_<hex>
 *
 * Rate limiting: 60 requests per minute per API key (in-memory, resets on server restart).
 */

import { randomUUID } from "node:crypto";
import { Router, Request, Response } from "express";
import { z } from "zod";
import { getBusinessProfile, createCustomerRequest, upsertBusinessProfile, getDb } from "./db";
import { getDefaultReviewPlatform, listReviewPlatforms, PLATFORM_LABELS } from "./reviewPlatforms";
import { getDefaultTemplate, listTemplates } from "./templates";
import { FREE_LIMIT_ERR_MSG } from "@shared/const";
import { evaluateFreeQuotaAccess, formatFreeQuotaBlockedMessage } from "./quotaEnforcement";
import { upsertApiContact } from "./contacts";
import { fireWebhooks } from "./webhookHelpers";
import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail } from "./emailTemplates";
import { encodeTrackingToken, wrapClickUrl, buildOpenPixel } from "./emailTracking";
import { emailTemplates as emailTemplatesTable } from "../drizzle/schema";
import { eq, sql as sqlOp } from "drizzle-orm";
import { AdaptiveSendLimitError, getAdaptiveSendStatus } from "./adaptiveSendLimits";
import {
  authenticateDeveloperApiKeyWithStatus,
  developerApiKeyHasScope,
  recordDeveloperApiKeySuccessfulUse,
  type DeveloperApiPrincipal,
  type DeveloperApiScope,
} from "./developerApiKeys";
import { checkDeveloperApiAbuse, type DeveloperApiAbuseAction } from "./developerApiAbuse";
import {
  checkDeveloperApiRateLimit,
  getDeveloperApiIdempotency,
  hashDeveloperApiRequest,
  logDeveloperApiImport,
  saveDeveloperApiIdempotency,
  type DeveloperApiErrorCode,
} from "./developerApiImports";
import { resolveSourceConnectionForPrincipal } from "./sourceConnections";

const consentSchema = z.object({
  confirmed: z.literal(true),
  basis: z.enum(["customer_relationship", "explicit_opt_in", "other"]),
  capturedAt: z.string().datetime({ offset: true }).optional(),
  source: z.string().trim().min(1).max(255),
});

const contactImportSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(2_000).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  externalId: z.string().trim().min(1).max(191).optional(),
  sourceApp: z.string().trim().min(1).max(64).regex(/^[a-z0-9][a-z0-9._-]*$/i).optional(),
  consent: consentSchema.optional(),
}).passthrough();

function normalizeAffirmativeBoolean(value: unknown) {
  if (value === true || value === 1) return true;
  if (typeof value === "string" && ["true", "1", "yes", "on"].includes(value.trim().toLowerCase())) return true;
  return value;
}

/**
 * Webhook builders often map only flat key/value pairs. The API keeps the
 * nested `consent` object as its canonical contract while accepting equivalent
 * flat aliases that still pass through the same strict schema validation.
 */
export function normalizeContactImportPayload(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const record = input as Record<string, unknown>;
  if (record.consent && typeof record.consent === "object" && !Array.isArray(record.consent)) return record;

  const hasFlatConsent = ["consentConfirmed", "consentBasis", "consentCapturedAt", "consentSource"]
    .some((key) => record[key] !== undefined);
  if (!hasFlatConsent) return record;

  return {
    ...record,
    consent: {
      confirmed: normalizeAffirmativeBoolean(record.consentConfirmed),
      basis: record.consentBasis,
      capturedAt: record.consentCapturedAt,
      source: record.consentSource,
    },
  };
}

type ApiFailure = { error: { code: DeveloperApiErrorCode; message: string }; requestId: string };

function sendApiError(res: Response, status: number, code: DeveloperApiErrorCode, message: string, requestId: string) {
  return res.status(status).json({ error: { code, message }, requestId } satisfies ApiFailure);
}

function extractApiKey(req: Request): string {
  const authHeader = req.headers.authorization ?? "";
  if (authHeader.startsWith("Bearer ")) return authHeader.slice(7).trim();
  const headerKey = req.headers["x-get-phame-key"];
  return typeof headerKey === "string" ? headerKey.trim() : "";
}

async function authenticateApiRequest(req: Request, requiredScope: DeveloperApiScope) {
  const rawKey = extractApiKey(req);
  if (!rawKey || (!rawKey.startsWith("gp_live_") && !rawKey.startsWith("rl_"))) {
    return { kind: "invalid" as const };
  }
  const authentication = await authenticateDeveloperApiKeyWithStatus(rawKey);
  if (authentication.kind !== "ok") return authentication;
  if (!developerApiKeyHasScope(authentication.principal, requiredScope)) {
    return { kind: "forbidden" as const, principal: authentication.principal };
  }
  return { kind: "ok" as const, principal: authentication.principal };
}

async function applyApiRateLimit(
  principal: DeveloperApiPrincipal,
  res: Response,
  requestId: string,
  sourceConnectionId?: number | null,
) {
  const rate = await checkDeveloperApiRateLimit(principal);
  res.setHeader("X-RateLimit-Limit", "60");
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    await logDeveloperApiImport({
      principal,
      sourceConnectionId,
      status: "rate_limited",
      requestId,
      errorCode: "RATE_LIMITED",
    }).catch(() => undefined);
    sendApiError(res, 429, "RATE_LIMITED", "Rate limit exceeded. Try again shortly.", requestId);
    return false;
  }
  return true;
}

function getApiClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function applyApiAbuseProtection(params: {
  req: Request;
  res: Response;
  requestId: string;
  principal: DeveloperApiPrincipal;
  action: DeveloperApiAbuseAction;
  recipientEmail?: string | null;
  sourceApp?: string | null;
  consentBasis?: string | null;
  sourceConnectionId?: number | null;
}) {
  const decision = await checkDeveloperApiAbuse({
    principal: params.principal,
    action: params.action,
    clientIp: getApiClientIp(params.req),
    recipientEmail: params.recipientEmail,
  });
  if (decision.allowed) return true;

  params.res.setHeader("Retry-After", String(decision.retryAfterSeconds));
  await logDeveloperApiImport({
    principal: params.principal,
    sourceConnectionId: params.sourceConnectionId,
    eventType: params.action,
    status: "abuse_blocked",
    requestId: params.requestId,
    sourceApp: params.sourceApp ?? null,
    consentBasis: params.consentBasis ?? null,
    email: params.recipientEmail ?? null,
    errorCode: "ABUSE_PROTECTION",
  }).catch(() => undefined);
  sendApiError(
    params.res,
    429,
    "ABUSE_PROTECTION",
    decision.suspended
      ? "This API key was temporarily suspended by abuse protection. Review your traffic before retrying."
      : "This request was blocked by abuse protection. Pause and retry after the indicated interval.",
    params.requestId,
  );
  return false;
}

export function registerPublicApiRoutes(app: Router) {
  /**
   * POST /api/public/contacts
   *
   * Body (JSON):
   * {
   *   name:    string  (required — full name or first + last)
   *   email:   string  (required — must be a valid email)
   *   phone?:  string  (optional)
   *   notes?:  string  (optional — e.g. product purchased, order ID)
   *   tags?:   string[] (optional — e.g. ["new-customer", "plumbing"])
   * }
   *
   * Response 200: { success: true, contactId: number, created: boolean }
   * Response 400: { error: string }
   * Response 401: { error: "Invalid or missing API key" }
   * Response 429: { error: "Rate limit exceeded. Max 60 requests per minute." }
   */
  const handleContactImport = (requireConsent: boolean) => async (req: Request, res: Response) => {
    const requestId = randomUUID();
    const auth = await authenticateApiRequest(req, "contacts:write");
    if (auth.kind === "invalid") {
      return sendApiError(res, 401, "INVALID_API_KEY", "Invalid, expired, or revoked API key.", requestId);
    }
    if (auth.kind === "expired") {
      return sendApiError(res, 401, "INVALID_API_KEY", "This API key has expired. Rotate it in Developer Integrations.", requestId);
    }
    if (auth.kind === "inactive") {
      return sendApiError(res, 401, "API_KEY_INACTIVE", "This API key expired after 12 months without successful use. Create a replacement in Developer Integrations.", requestId);
    }
    if (auth.kind === "suspended") {
      res.setHeader("Retry-After", String(auth.retryAfterSeconds ?? 86_400));
      return sendApiError(res, 429, "API_KEY_SUSPENDED", "This API key is temporarily suspended by abuse protection.", requestId);
    }
    if (auth.kind === "forbidden") {
      await logDeveloperApiImport({
        principal: auth.principal,
        status: "rejected",
        requestId,
        errorCode: "INSUFFICIENT_SCOPE",
      }).catch(() => undefined);
      return sendApiError(res, 403, "INSUFFICIENT_SCOPE", "This API key cannot import contacts.", requestId);
    }
    if (auth.kind !== "ok") {
      return sendApiError(res, 401, "INVALID_API_KEY", "Invalid, expired, or revoked API key.", requestId);
    }
    const principal = auth.principal;
    const sourcePublicId = req.header("X-Get-Phame-Source")?.trim().slice(0, 48) ?? "";
    const sourceConnection = sourcePublicId
      ? await resolveSourceConnectionForPrincipal({
          publicId: sourcePublicId,
          userId: principal.userId,
          apiKeyId: principal.apiKeyId,
        })
      : null;
    if (sourcePublicId && !sourceConnection) {
      await logDeveloperApiImport({
        principal,
        status: "rejected",
        requestId,
        errorCode: "SOURCE_CONNECTION_FORBIDDEN",
      }).catch(() => undefined);
      return sendApiError(res, 403, "SOURCE_CONNECTION_FORBIDDEN", "This source identifier is not authorized for the supplied API key.", requestId);
    }
    const sourceConnectionId = sourceConnection?.id ?? null;
    if (!(await applyApiRateLimit(principal, res, requestId, sourceConnectionId))) return;

    const parsed = contactImportSchema.safeParse(normalizeContactImportPayload(req.body ?? {}));
    if (!parsed.success) {
      await logDeveloperApiImport({
        principal,
        sourceConnectionId,
        status: "rejected",
        requestId,
        sourceApp: typeof req.body?.sourceApp === "string" ? req.body.sourceApp : null,
        email: typeof req.body?.email === "string" ? req.body.email : null,
        errorCode: "INVALID_REQUEST",
      }).catch(() => undefined);
      return sendApiError(res, 400, "INVALID_REQUEST", "The contact payload is invalid.", requestId);
    }

    const data = parsed.data;
    if (requireConsent && !data.consent?.confirmed) {
      await logDeveloperApiImport({
        principal,
        sourceConnectionId,
        status: "rejected",
        requestId,
        sourceApp: data.sourceApp ?? null,
        email: data.email,
        errorCode: "CONSENT_REQUIRED",
      }).catch(() => undefined);
      return sendApiError(res, 422, "CONSENT_REQUIRED", "Affirmative consent attestation is required.", requestId);
    }

    const capturedAt = data.consent?.capturedAt ? Date.parse(data.consent.capturedAt) : Date.now();
    if (!Number.isFinite(capturedAt) || capturedAt > Date.now() + 5 * 60_000) {
      await logDeveloperApiImport({
        principal,
        sourceConnectionId,
        status: "rejected",
        requestId,
        sourceApp: data.sourceApp ?? null,
        email: data.email,
        errorCode: "INVALID_REQUEST",
      }).catch(() => undefined);
      return sendApiError(res, 400, "INVALID_REQUEST", "consent.capturedAt must be a valid timestamp that is not in the future.", requestId);
    }

    const normalized = {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      notes: data.notes,
      tags: data.tags,
      externalId: data.externalId,
      sourceApp: data.sourceApp ?? "generic-webhook",
      consent: data.consent ?? {
        confirmed: true as const,
        basis: "customer_relationship" as const,
        source: "Legacy /api/public/contacts compatibility endpoint",
      },
      consentCapturedAt: capturedAt,
    };
    if (!(await applyApiAbuseProtection({
      req,
      res,
      requestId,
      principal,
      action: "contact_import",
      recipientEmail: normalized.email,
      sourceApp: normalized.sourceApp,
      consentBasis: normalized.consent.basis,
      sourceConnectionId,
    }))) return;
    const requestHash = hashDeveloperApiRequest(JSON.stringify({ sourcePublicId: sourceConnection?.publicId ?? null, normalized }));
    const idempotencyKey = req.header("Idempotency-Key")?.trim().slice(0, 191) ?? "";
    let idempotencyHash: string | null = null;
    if (idempotencyKey) {
      const existing = await getDeveloperApiIdempotency({ principal, idempotencyKey, requestHash });
      if (existing.kind === "conflict") {
        await logDeveloperApiImport({
          principal,
          sourceConnectionId,
          status: "rejected",
          requestId,
          sourceApp: normalized.sourceApp,
          consentBasis: normalized.consent.basis,
          email: normalized.email,
          errorCode: "IDEMPOTENCY_CONFLICT",
        }).catch(() => undefined);
        return sendApiError(res, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key was already used with a different payload.", requestId);
      }
      if (existing.kind === "replay") {
        await logDeveloperApiImport({
          principal,
          sourceConnectionId,
          status: "deduplicated",
          requestId,
          sourceApp: normalized.sourceApp,
          consentBasis: normalized.consent.basis,
          email: normalized.email,
          created: false,
        }).catch(() => undefined);
        await recordDeveloperApiKeySuccessfulUse(principal);
        return res.status(existing.statusCode).json({ ...existing.response, idempotentReplay: true, requestId });
      }
      idempotencyHash = existing.keyHash;
    }

    try {
      const result = await upsertApiContact(principal.userId, {
        name: normalized.name,
        email: normalized.email,
        phone: normalized.phone,
        notes: normalized.notes,
        tags: normalized.tags,
        source: "api",
        externalId: normalized.externalId,
        sourceApp: normalized.sourceApp,
        importedViaApiKeyId: principal.apiKeyId,
        consentBasis: normalized.consent.basis,
        consentCapturedAt: normalized.consentCapturedAt,
        consentSource: normalized.consent.source,
      });
      const response = {
        success: true,
        contactId: result.id,
        created: result.created,
        deduplicated: !result.created,
        idempotentReplay: false,
        requestId,
      };
      if (idempotencyHash) {
        await saveDeveloperApiIdempotency({
          principal,
          keyHash: idempotencyHash,
          requestHash,
          statusCode: 200,
          response,
        });
      }
      await logDeveloperApiImport({
        principal,
        sourceConnectionId,
        status: result.created ? "success" : "deduplicated",
        requestId,
        sourceApp: normalized.sourceApp,
        consentBasis: normalized.consent.basis,
        contactId: result.id,
        email: normalized.email,
        created: result.created,
      }).catch(() => undefined);
      if (result.created) {
        fireWebhooks(principal.userId, "contact.created", {
          contactId: result.id,
          email: normalized.email,
          name: normalized.name,
          source: "api",
        }).catch(() => undefined);
      }
      await recordDeveloperApiKeySuccessfulUse(principal);
      return res.json(response);
    } catch {
      await logDeveloperApiImport({
        principal,
        sourceConnectionId,
        status: "error",
        requestId,
        sourceApp: normalized.sourceApp,
        consentBasis: normalized.consent.basis,
        email: normalized.email,
        errorCode: "INTERNAL_ERROR",
      }).catch(() => undefined);
      return sendApiError(res, 500, "INTERNAL_ERROR", "The import could not be completed. Please retry.", requestId);
    }
  };

  app.post("/api/v1/contacts", handleContactImport(true));
  app.post("/api/public/contacts", handleContactImport(false));

  /**
   * POST /api/public/send
   *
   * Immediately sends a review-request email to a single customer.
   * Used by WordPress form builders (Elementor, Gravity Forms, WS Form, Fluent Forms)
   * via their HTTP/webhook action after a form submission.
   *
   * Body (JSON):
   * {
   *   customerName:  string  (required)
   *   customerEmail: string  (required)
   *   templateId?:   number  (optional — defaults to user's default template)
   * }
   *
   * Response 200: { success: true, requestId: number }
   * Response 400: { error: string }
   * Response 401: { error: string }
   * Response 429: { error: string }
   */
  app.post("/api/public/send", async (req: Request, res: Response) => {
    const requestId = randomUUID();
    const auth = await authenticateApiRequest(req, "review_requests:send");
    if (auth.kind === "invalid") {
      return sendApiError(res, 401, "INVALID_API_KEY", "Invalid, expired, or revoked API key.", requestId);
    }
    if (auth.kind === "expired") {
      return sendApiError(res, 401, "INVALID_API_KEY", "This API key has expired. Rotate it in Developer Integrations.", requestId);
    }
    if (auth.kind === "inactive") {
      return sendApiError(res, 401, "API_KEY_INACTIVE", "This API key expired after 12 months without successful use. Create a replacement in Developer Integrations.", requestId);
    }
    if (auth.kind === "suspended") {
      res.setHeader("Retry-After", String(auth.retryAfterSeconds ?? 86_400));
      return sendApiError(res, 429, "API_KEY_SUSPENDED", "This API key is temporarily suspended by abuse protection.", requestId);
    }
    if (auth.kind === "forbidden") {
      return sendApiError(res, 403, "INSUFFICIENT_SCOPE", "This API key cannot send review requests.", requestId);
    }
    if (auth.kind !== "ok") {
      return sendApiError(res, 401, "INVALID_API_KEY", "Invalid, expired, or revoked API key.", requestId);
    }
    const userId = auth.principal.userId;
    if (!(await applyApiRateLimit(auth.principal, res, requestId))) return;
    // 4. Validate body
    const { customerName, customerEmail, templateId } = req.body ?? {};
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return res.status(400).json({ error: "customerName is required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail || typeof customerEmail !== "string" || !emailRegex.test(customerEmail.trim())) {
      return res.status(400).json({ error: "customerEmail must be a valid email address." });
    }
    if (!(await applyApiAbuseProtection({
      req,
      res,
      requestId,
      principal: auth.principal,
      action: "review_request_send",
      recipientEmail: customerEmail.trim().toLowerCase(),
      sourceApp: "public-send",
    }))) return;
    // 5. Send
    try {
      const profile = await getBusinessProfile(userId);
      if (!profile) {
        return res.status(400).json({ error: "Business profile not configured. Please complete setup in Get Phame." });
      }
      // Check that either a personal sender or a paid verified Bulk Sender relay is active.
      const db = await getDb();
      if (!db) return res.status(503).json({ error: "Database unavailable" });
      const initialSendStatus = await getAdaptiveSendStatus(userId);
      if (!initialSendStatus.configured) {
        return res.status(400).json({ error: "SMTP not configured. Connect your email account in Get Phame Settings." });
      }
      // Free-tier limit
      if (profile.tier === 'free') {
        const decision = await evaluateFreeQuotaAccess(userId, profile.tier);
        if (!decision.allowed) {
          return res.status(429).json({
            error: formatFreeQuotaBlockedMessage(decision.quota, FREE_LIMIT_ERR_MSG),
          });
        }
      }
      // Monthly reset
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      if (profile.monthlyResetDate !== yearMonth) {
        await upsertBusinessProfile({ ...profile, monthlyCount: 0, monthlyResetDate: yearMonth });
        profile.monthlyCount = 0;
      }
      // Resolve review URL
      const defaultPlatform = await getDefaultReviewPlatform(userId);
      const reviewUrl = defaultPlatform?.url ?? profile.reviewLink ?? "";
      // Resolve template
      const allTemplates = await listTemplates(userId);
      const resolvedTemplate = templateId
        ? allTemplates.find((t) => t.id === Number(templateId)) ?? null
        : await getDefaultTemplate(userId);
      // Build platformLinks block
      const allPlatforms = await listReviewPlatforms(userId);
      const platformLinksList = allPlatforms.length > 0
        ? allPlatforms.map((p) => {
            const label = p.label || (PLATFORM_LABELS as Record<string, string>)[p.platform] || p.platform;
            return `- ${label}: ${p.url}`;
          }).join("\n")
        : `- Leave a review: ${reviewUrl}`;
      const name = customerName.trim();
      const email = customerEmail.trim().toLowerCase();
      const replacePlaceholders = (text: string) =>
        text
          .replace(/\{\{customer_name\}\}/g, name)
          .replace(/\{\{customerName\}\}/g, name)
          .replace(/\{\{business_name\}\}/g, profile.businessName)
          .replace(/\{\{businessName\}\}/g, profile.businessName)
          .replace(/\{\{review_link\}\}/g, reviewUrl)
          .replace(/\{\{reviewLink\}\}/g, reviewUrl)
          .replace(/\{\{platformLinks\}\}/g, platformLinksList);
      let subject: string;
      let htmlBody: string;
      if (resolvedTemplate) {
        subject = replacePlaceholders(resolvedTemplate.subject);
        htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body).replace(/\n/g, "<br>")}</div>`;
      } else {
        subject = `${profile.businessName} would love your feedback!`;
        htmlBody = buildReviewRequestEmail({ customerName: name, businessName: profile.businessName, reviewUrl, showPoweredBy: profile.tier === "free" });
      }
      // Create request row
      const newRequestId = await createCustomerRequest({ userId, customerName: name, customerEmail: email, method: "email", status: "sent", platformId: null });
      // Inject tracking
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const trackingToken = encodeTrackingToken(newRequestId, userId, resolvedTemplate?.id ?? null);
      const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
      const openPixel = buildOpenPixel(trackingToken, baseUrl);
      const trackedHtmlBody = htmlBody
        .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewUrl)
        .replace(/<\/div>\s*$/, `${openPixel}</div>`);
      const sendLimitStatus = await sendMailViaSmtp({ userId, to: email, subject, html: trackedHtmlBody });
      // Increment template usage
      if (resolvedTemplate) {
        await db.update(emailTemplatesTable).set({ usageCount: sqlOp`${emailTemplatesTable.usageCount} + 1` }).where(eq(emailTemplatesTable.id, resolvedTemplate.id));
      }
      // Increment monthly count
      await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + 1 });
      await logDeveloperApiImport({
        principal: auth.principal,
        eventType: "review_request_send",
        status: "success",
        requestId,
        sourceApp: "public-send",
        contactId: newRequestId,
        email,
        created: true,
      }).catch(() => undefined);
      await recordDeveloperApiKeySuccessfulUse(auth.principal);
      return res.json({
        success: true,
        requestId: newRequestId,
        sendLimit: sendLimitStatus ? {
          warningLevel: sendLimitStatus.warningLevel,
          remaining: sendLimitStatus.remaining,
          hourlyRemaining: sendLimitStatus.hourlyRemaining,
          dailyRemaining: sendLimitStatus.dailyRemaining,
        } : null,
      });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Internal error";
      if (err instanceof AdaptiveSendLimitError) {
        res.setHeader("Retry-After", String(err.retryAfterSeconds));
        return res.status(429).json({
          error: msg,
          code: err.code,
          retryAfterSeconds: err.retryAfterSeconds,
          sendLimit: err.status,
        });
      }
      const isUserError = msg.includes("limit") || msg.includes("SMTP") || msg.includes("profile") || msg.includes("subscription");
      return res.status(isUserError ? 400 : 500).json({ error: msg });
    }
  });
}
