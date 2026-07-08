import { z } from "zod";
import { COOKIE_NAME, FREE_LIMIT, FREE_LIMIT_ERR_MSG } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getBusinessProfile,
  upsertBusinessProfile,
  createCustomerRequest,
  getCustomerRequests,
  getMonthlyRequestCount,
  getTotalRequestCount,
  getTodaySentCount,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  getRecentApiImports,
  getWebhookConfigs,
  createWebhookConfig,
  deleteWebhookConfig,
  getWebhookDeliveryLogs,
  getNotificationPrefs,
  updateNotificationPrefs,
} from "./db";

import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail, buildReviewRequestText } from "./emailTemplates";
import { checkSendRateLimit } from "./rateLimiter";
import { createCheckoutSession, createPortalSession, createThbCheckoutSession } from "./stripe";
import { sendLeadGuideEmail } from "./leadGuideEmail";
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
import { stripeSubscriptions, businessProfiles, smtpCredentials, customerRequests, reviewPlatforms, users, savedContacts, emailTemplates, followUpReminders, emailEvents, wooCredentials, wooCustomers, wooSyncLogs, accessCodeRedemptions, gmailTokens, churnSurveys, pageEvents, apiKeys, clientReviews, referrals, leads } from "../drizzle/schema";
import { getOrCreateReferralCode, getReferrerByCode, recordReferral } from "./referrals";
import { eq, like, or, inArray, desc, isNotNull, isNull, and } from "drizzle-orm";
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
} from "./reminders";
import {
  createAccessCode,
  listAccessCodes,
  revokeAccessCode,
  activateAccessCode,
  redeemAccessCode,
  generateCode,
} from "./accessCodes";
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
import crypto from "crypto";

// ── Unsubscribe token helpers ────────────────────────────────────────────────
const UNSUB_SECRET = process.env.JWT_SECRET ?? "phame-unsub-secret";

/** Generate a signed unsubscribe token: base64url(contactType:id:userId:sig) */
export function buildUnsubToken(contactType: "contact" | "woo", id: number, userId: number): string {
  const payload = `${contactType}:${id}:${userId}`;
  const sig = crypto.createHmac("sha256", UNSUB_SECRET).update(payload).digest("hex").slice(0, 16);
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
    const expected = crypto.createHmac("sha256", UNSUB_SECRET).update(payload).digest("hex").slice(0, 16);
    if (sig !== expected) return null;
    return { contactType: contactType as "contact" | "woo", id: parseInt(idStr, 10), userId: parseInt(userIdStr, 10) };
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

/**
 * Enforce the 10-request free-tier limit.
 * Throws a FORBIDDEN TRPCError if the user is on the free tier and has already sent FREE_LIMIT requests.
 */
async function enforceFreeLimit(userId: number, tier: string) {
  if (tier !== "free") return; // paid users have no limit
  const total = await getTotalRequestCount(userId);
  if (total >= FREE_LIMIT) {
    throw new TRPCError({ code: "FORBIDDEN", message: FREE_LIMIT_ERR_MSG });
  }
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
      const totalSent = await getTotalRequestCount(ctx.user.id);
      return { ...profile, totalSent };
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
    /** Create a Stripe Checkout Session for the selected plan */
    createCheckout: protectedProcedure
      .input(z.object({ origin: z.string(), plan: z.enum(["monthly", "annual", "lifetime"]).default("monthly") }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId: profile?.stripeCustomerId ?? null,
          origin: input.origin,
          plan: input.plan,
        });
        return { url };
      }),

    /** Create a Stripe Checkout Session in THB with PromptPay enabled (Thailand users) */
    createThbCheckout: protectedProcedure
      .input(z.object({ origin: z.string(), plan: z.enum(["monthly", "annual", "lifetime"]).default("monthly") }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        const url = await createThbCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId: profile?.stripeCustomerId ?? null,
          origin: input.origin,
          plan: input.plan,
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
      if (!db) return { active: false, status: null };
      const rows = await db
        .select()
        .from(stripeSubscriptions)
        .where(eq(stripeSubscriptions.userId, ctx.user.id))
        .limit(1);
      if (rows.length === 0) return { active: false, status: null };
      const sub = rows[0];
      return {
        active: sub.status === "active",
        status: sub.status,
        subscriptionId: sub.stripeSubscriptionId,
      };
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

        // Filter out opted-out customers
        const toSend = customers.filter((c) => !c.optedOut);
        if (toSend.length === 0) throw new Error("No eligible customers found (all may have unsubscribed).");

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

        return { sent: sentIds.length, errors, sentRequests };
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

    getDailyStatus: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getBusinessProfile(ctx.user.id);
      const dailyLimit = profile?.dailySendLimit ?? 50;
      const todayCount = await getTodaySentCount(ctx.user.id);
      const remaining = Math.max(0, dailyLimit - todayCount);
      return { todayCount, dailyLimit, remaining };
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
        // Hourly rate limit: check upfront for the whole batch
        checkSendRateLimit(ctx.user.id, input.contactIds.length);

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

        // Daily send limit: cap the batch to the user's configured daily limit
        const dailyLimit = profile.dailySendLimit ?? 50;
        const todaySent = await getTodaySentCount(ctx.user.id);
        const remaining = Math.max(0, dailyLimit - todaySent);
        const toSend = targets.slice(0, remaining);
        const skippedDueToLimit = targets.length - toSend.length;
        if (toSend.length === 0) {
          throw new Error(`Daily send limit reached (${dailyLimit}/day). Remaining sends reset at midnight UTC.`);
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

        return { sent, failed, skippedDueToLimit, errors, sentRequests };
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
        .select({ followUpEnabled: businessProfiles.followUpEnabled, followUpDelayDays: businessProfiles.followUpDelayDays })
        .from(businessProfiles)
        .where(eqR(businessProfiles.userId, ctx.user.id));
      return { followUpEnabled: profile?.followUpEnabled ?? 1, followUpDelayDays: profile?.followUpDelayDays ?? 3 };
    }),

    updateSettings: protectedProcedure
      .input(z.object({
        followUpEnabled: z.number().int().min(0).max(1),
        followUpDelayDays: z.number().int().min(1).max(14),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
        const { eq: eqR } = await import("drizzle-orm");
        await db
          .update(businessProfiles)
          .set({ followUpEnabled: input.followUpEnabled, followUpDelayDays: input.followUpDelayDays })
          .where(eqR(businessProfiles.userId, ctx.user.id));
        return { ok: true };
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
        // Hourly rate limit: max 200 sends per user per rolling hour
        checkSendRateLimit(ctx.user.id, 1);

        // Resolve review URL: use selected platform, else fall back to profile.reviewLink
        let reviewUrl = profile.reviewLink ?? "";
        let isYelpSingle = false;
        if (input.platformId) {
          // Find the specific platform by ID
          const platforms = await listReviewPlatforms(ctx.user.id);
          const chosen = platforms.find((p) => p.id === input.platformId);
          if (chosen) { reviewUrl = chosen.url; isYelpSingle = chosen.platform === "yelp"; }
        } else {
          // Use default platform if available
          const defaultPlatform = await getDefaultReviewPlatform(ctx.user.id);
          if (defaultPlatform) { reviewUrl = defaultPlatform.url; isYelpSingle = defaultPlatform.platform === "yelp"; }
        }

        // Resolve template: use specified templateId, else fall back to user's default template
        let subject: string;
        let htmlBody: string;

        const allTemplates = await listTemplates(ctx.user.id);
        const resolvedTemplate = input.templateId
          ? allTemplates.find((t) => t.id === input.templateId) ?? null
          : await getDefaultTemplate(ctx.user.id);

        if (resolvedTemplate) {
          // Build {{platformLinks}} for this user
          const wooUserPlatforms = await listReviewPlatforms(ctx.user.id);
          const wooPlatformLinksList = wooUserPlatforms.length > 0
            ? wooUserPlatforms.map((p) => {
                const label = p.label || (PLATFORM_LABELS as Record<string, string>)[p.platform] || p.platform;
                // Yelp: stored value is plain-text search instruction, not a URL — render as-is (no link)
                if (p.platform === "yelp") return `- ${label}: ${p.url}`;
                return `- ${label}: ${p.url}`;
              }).join("\n")
            : `- Leave a review: ${reviewUrl}`;
          const replacePlaceholders = (text: string) =>
            text
              .replace(/\{\{customer_name\}\}/g, input.customerName)
              .replace(/\{\{customerName\}\}/g, input.customerName)
              .replace(/\{\{business_name\}\}/g, profile.businessName)
              .replace(/\{\{businessName\}\}/g, profile.businessName)
              .replace(/\{\{review_link\}\}/g, reviewUrl)
              .replace(/\{\{reviewLink\}\}/g, reviewUrl)
              .replace(/\{\{platformLinks\}\}/g, wooPlatformLinksList);
          subject = replacePlaceholders(resolvedTemplate.subject);
          htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body).replace(/\n/g, "<br>")}</div>`;
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

        await sendMailViaSmtp({ userId: ctx.user.id, to: input.customerEmail, subject, html: trackedHtmlBody });

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

        return { success: true, requestId: newRequestId };
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
        const { and: andOp, eq: eqOp, gte, sql: sqlOp } = await import("drizzle-orm");
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const sendRows = await db
          .select({
            day: sqlOp<string>`DATE(${crTable.sentAt})`,
            count: sqlOp<number>`count(*)`,
          })
          .from(crTable)
          .where(andOp(eqOp(crTable.userId, ctx.user.id), gte(crTable.sentAt, since)))
          .groupBy(sqlOp`DATE(${crTable.sentAt})`);

        const openRows = await db
          .select({
            day: sqlOp<string>`DATE(${evTable.createdAt})`,
            count: sqlOp<number>`count(distinct ${evTable.requestId})`,
          })
          .from(evTable)
          .where(andOp(eqOp(evTable.userId, ctx.user.id), eqOp(evTable.type, "open"), gte(evTable.createdAt, since)))
          .groupBy(sqlOp`DATE(${evTable.createdAt})`);

        const clickRows = await db
          .select({
            day: sqlOp<string>`DATE(${evTable.createdAt})`,
            count: sqlOp<number>`count(distinct ${evTable.requestId})`,
          })
          .from(evTable)
          .where(andOp(eqOp(evTable.userId, ctx.user.id), eqOp(evTable.type, "click"), gte(evTable.createdAt, since)))
          .groupBy(sqlOp`DATE(${evTable.createdAt})`);

        const map = new Map<string, { sends: number; opens: number; clicks: number }>();
        const get = (d: string) => map.get(d) ?? { sends: 0, opens: 0, clicks: 0 };
        for (const r of sendRows) { const e = get(r.day); e.sends = Number(r.count); map.set(r.day, e); }
        for (const r of openRows) { const e = get(r.day); e.opens = Number(r.count); map.set(r.day, e); }
        for (const r of clickRows) { const e = get(r.day); e.clicks = Number(r.count); map.set(r.day, e); }

        const result: { date: string; sends: number; opens: number; clicks: number }[] = [];
        for (let i = input.days - 1; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().slice(0, 10);
          const entry = map.get(key) ?? { sends: 0, opens: 0, clicks: 0 };
          result.push({ date: key, ...entry });
        }
        return result;
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
    create: protectedProcedure
      .input(
        z.object({
          code: z.string().optional(),
          note: z.string().optional(),
          maxUses: z.number().int().positive().nullable().optional(),
          expiresAt: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const code = await createAccessCode({
          code: input.code,
          note: input.note,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ?? null,
        });
        return { code };
      }),

    /** Admin only: generate a random code preview without saving */
    generatePreview: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return { code: generateCode() };
    }),

    /** Admin only: list all codes */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return listAccessCodes();
    }),

    /** Admin only: revoke a code */
    revoke: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await revokeAccessCode(input.id);
        return { ok: true };
      }),

    /** Admin only: re-activate a revoked code */
    activate: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await activateAccessCode(input.id);
        return { ok: true };
      }),

    /** Any logged-in user: redeem a code for Pro access */
    redeem: protectedProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const result = await redeemAccessCode(ctx.user.id, input.code);
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        return { note: result.note };
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

      return { smtpConnected, hasPlatform, hasSentRequest, hasContacts, allDone, dismissed };
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
    /** Overall platform stats — user count, tier breakdown, recent signups, recent sends */
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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
      };
    }),

    /** SMTP provider failure stats — breakdown by host across all users */
    smtpStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

    /** Trigger SMTP health check on demand (admin only) */
    runHealthCheck: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await runSmtpHealthChecks();
      return { ok: true, ranAt: Date.now() };
    }),

    /** Search users by name or email — admin only */
    searchUsers: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

    /** Manually override a user's tier — admin only */
    setTier: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        tier: z.enum(["free", "pro", "annual", "lifetime"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db
          .update(businessProfiles)
          .set({ tier: input.tier })
          .where(eq(businessProfiles.userId, input.userId));
        console.log(`[Admin] User ${input.userId} tier set to ${input.tier} by admin ${ctx.user.id}`);
        return { ok: true };
      }),

    /** Upsell click stats — powered-by footer clicks to /upgrade (last 30d) */
    upsellStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

    /** Churn survey responses — admin only */
    churnSurveys: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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
    revenue: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Pricing constants (USD cents)
      const MONTHLY_PRICE_CENTS = 2900;  // $29/mo
      const ANNUAL_PRICE_CENTS  = 29900; // $299/yr
      const LIFETIME_PRICE_CENTS = 49700; // $497 one-time (updated Jul 2026)

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
      const mrrCents = (tierCounts.pro * MONTHLY_PRICE_CENTS) + (tierCounts.annual * Math.round(ANNUAL_PRICE_CENTS / 12));
      const arrCents = mrrCents * 12;

      // Lifetime revenue (all-time)
      const lifetimeRevenueCents = tierCounts.lifetime * LIFETIME_PRICE_CENTS;

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
    listDeferred: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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
    processOne: protectedProcedure
      .input(z.object({ referralId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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
    processAll: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
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

  /** Per-user API keys for the public REST API (contacts import, etc.) */
  apiKey: router({
    /** List all active (non-revoked) API keys for the current user */
    list: protectedProcedure.query(async ({ ctx }) => {
      return listApiKeys(ctx.user.id);
    }),
    /** Generate a new API key — returns the raw key ONCE */
    generate: protectedProcedure
      .input(z.object({ label: z.string().min(1).max(100).default("My API Key") }))
      .mutation(async ({ ctx, input }) => {
        // Limit to 5 active keys per user
        const existing = await listApiKeys(ctx.user.id);
        if (existing.length >= 5) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 5 active API keys allowed. Revoke one to create a new key." });
        }
        return generateApiKey(ctx.user.id, input.label);
      }),
    /** Revoke (soft-delete) an API key */
    revoke: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await revokeApiKey(ctx.user.id, input.id);
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
        return { id: (result as any).insertId };
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

  /** Landing page lead capture — stores email and sends the free guide PDF */
  leadCapture: router({
    submit: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { ok: true, sent: false };
        await db
          .insert(leads)
          .values({ email: input.email })
          .onDuplicateKeyUpdate({ set: { email: input.email } });
        const { sent } = await sendLeadGuideEmail(input.email);
        if (sent) {
          await db
            .update(leads)
            .set({ guideSentAt: Date.now() })
            .where(eq(leads.email, input.email));
        }
        return { ok: true, sent };
      }),
  }),
});
export type AppRouter = typeof appRouter;
