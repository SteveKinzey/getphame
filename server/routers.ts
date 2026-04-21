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
} from "./db";

import { sendMailViaSmtp } from "./smtp";
import { buildReviewRequestEmail, buildReviewRequestText } from "./emailTemplates";
import { checkSendRateLimit } from "./rateLimiter";
import { createCheckoutSession, createPortalSession } from "./stripe";
import { createOrGetZohoCustomer, createZohoInvoice, sendZohoInvoice } from "./zoho";
import {
  getWooCredentials,
  upsertWooCredentials,
  syncWooOrders,
  getPendingWooCustomers,
  getAllWooCustomers,
  markWooCustomersSent,
  setWooCustomerStatus,
  bulkSetWooCustomerStatus,
} from "./woocommerce";
import { getDb } from "./db";
import { stripeSubscriptions, businessProfiles, smtpCredentials, customerRequests, reviewPlatforms, users, savedContacts, emailTemplates, followUpReminders, emailEvents, wooCredentials, wooCustomers, wooSyncLogs, accessCodeRedemptions, gmailTokens } from "../drizzle/schema";
import { eq } from "drizzle-orm";
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
} from "./templates";
import {
  listReminders,
  cancelReminder,
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
import crypto from "crypto";

// ── Unsubscribe token helpers ────────────────────────────────────────────────
const UNSUB_SECRET = process.env.JWT_SECRET ?? "reviewlink-unsub-secret";

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
  const base = process.env.APP_BASE_URL ?? "https://reviewlink.app";
  return `${base}/unsubscribe?token=${token}`;
}
import { getGmailAuthUrl, getGmailRedirectUri, getGmailStatus, disconnectGmail } from "./gmail";

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
      });
      return { html, businessName: profile?.businessName || "Your Business", reviewUrl };
    }),
  }),

  gmail: router({
    /** Return Gmail OAuth connection status */
    status: protectedProcedure.query(async ({ ctx }) => {
      return getGmailStatus(ctx.user.id);
    }),

    /** Generate the Google OAuth consent URL for Gmail send scope */
    getAuthUrl: protectedProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(({ ctx, input }) => {
        const redirectUri = getGmailRedirectUri(input.origin);
        // state = base64(origin) so the callback can reconstruct the redirect URI
        const state = Buffer.from(input.origin).toString("base64");
        const url = getGmailAuthUrl(redirectUri, state);
        return { url };
      }),

    /** Disconnect Gmail OAuth tokens */
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await disconnectGmail(ctx.user.id);
      return { success: true };
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
  }),

  zoho: router({
    /** Create a Zoho Books invoice for the selected plan and email it to the user */
    createInvoice: protectedProcedure
      .input(z.object({ plan: z.enum(["monthly", "annual", "lifetime"]) }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "BAD_REQUEST", message: "Please complete your business profile first." });

        const userEmail = ctx.user.email ?? "";
        const userName = ctx.user.name ?? profile.businessName;

        // Create or retrieve Zoho customer
        const zohoCustomerId = await createOrGetZohoCustomer({
          email: userEmail,
          name: userName,
        });

        // Save zohoCustomerId on the profile
        const db = await getDb();
        await db!.update(businessProfiles)
          .set({ zohoCustomerId })
          .where(eq(businessProfiles.userId, ctx.user.id));

        // Create and send the plan-specific invoice
        const invoice = await createZohoInvoice({
          zohoCustomerId,
          userName,
          userId: ctx.user.id,
          plan: input.plan,
        });

        await sendZohoInvoice(invoice.invoiceId, input.plan);

        const planLabels = { monthly: "Monthly Pro", annual: "Annual Pro", lifetime: "Lifetime License" };
        return {
          invoiceId: invoice.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          plan: input.plan,
          message: `Invoice ${invoice.invoiceNumber} for ${planLabels[input.plan]} has been sent to ${userEmail}. Click the Pay Now link in the email to activate your account.`,
        };
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
        const result = await syncWooOrders(ctx.user.id, input.days);
        // Write a sync log entry
        const db = await getDb();
        if (db) {
          const creds = await getWooCredentials(ctx.user.id);
          await db.insert(wooSyncLogs).values({
            userId: ctx.user.id,
            syncedAt: Date.now(),
            daysWindow: input.days,
            added: result.added,
            total: result.total,
            storeUrl: creds?.storeUrl ?? null,
          });
        }
        return result;
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
        if (input.platformId) {
          const platforms = await listReviewPlatforms(ctx.user.id);
          const chosen = platforms.find((p) => p.id === input.platformId);
          if (chosen) reviewUrl = chosen.url;
        } else {
          const defaultPlatform = await getDefaultReviewPlatform(ctx.user.id);
          if (defaultPlatform) reviewUrl = defaultPlatform.url;
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

        const replacePlaceholders = (text: string, customerName: string) =>
          text
            .replace(/\{\{customer_name\}\}/g, customerName)
            .replace(/\{\{customerName\}\}/g, customerName)
            .replace(/\{\{business_name\}\}/g, profile.businessName)
            .replace(/\{\{businessName\}\}/g, profile.businessName)
            .replace(/\{\{review_link\}\}/g, reviewUrl)
            .replace(/\{\{reviewLink\}\}/g, reviewUrl);

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
                unsubscribeUrl: buildUnsubUrl("contact", contact.id, ctx.user.id),
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
            });

            // Inject open pixel + click-tracking wrapper
            const bulkToken = encodeTrackingToken(bulkRequestId, ctx.user.id, resolvedTemplate?.id ?? null);
            const bulkBase = "https://reviewlink.app";
            const trackedBulkUrl = wrapClickUrl(reviewUrl, bulkToken, bulkBase);
            const bulkPixel = buildOpenPixel(bulkToken, bulkBase);
            const trackedBulkHtml = htmlBody
              .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedBulkUrl)
              .replace(/<\/div>\s*$/, `${bulkPixel}</div>`);

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
          // Only include customers linked to this ReviewLink user via metadata
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
        if (input.platformId) {
          const platform = await getDefaultReviewPlatform(ctx.user.id);
          // Find the specific platform by ID
          const platforms = await listReviewPlatforms(ctx.user.id);
          const chosen = platforms.find((p) => p.id === input.platformId);
          if (chosen) reviewUrl = chosen.url;
        } else {
          // Use default platform if available
          const defaultPlatform = await getDefaultReviewPlatform(ctx.user.id);
          if (defaultPlatform) reviewUrl = defaultPlatform.url;
        }

        // Resolve template: use specified templateId, else fall back to user's default template
        let subject: string;
        let htmlBody: string;

        const allTemplates = await listTemplates(ctx.user.id);
        const resolvedTemplate = input.templateId
          ? allTemplates.find((t) => t.id === input.templateId) ?? null
          : await getDefaultTemplate(ctx.user.id);

        if (resolvedTemplate) {
          const replacePlaceholders = (text: string) =>
            text
              .replace(/\{\{customer_name\}\}/g, input.customerName)
              .replace(/\{\{customerName\}\}/g, input.customerName)
              .replace(/\{\{business_name\}\}/g, profile.businessName)
              .replace(/\{\{businessName\}\}/g, profile.businessName)
              .replace(/\{\{review_link\}\}/g, reviewUrl)
              .replace(/\{\{reviewLink\}\}/g, reviewUrl);
          subject = replacePlaceholders(resolvedTemplate.subject);
          htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body).replace(/\n/g, "<br>")}</div>`;
        } else {
          subject = `${profile.businessName} would love your feedback!`;
          htmlBody = buildReviewRequestEmail({
            customerName: input.customerName,
            businessName: profile.businessName,
            reviewUrl,
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
        });

        // Inject open pixel + click-tracking wrapper into the email HTML
        const trackingToken = encodeTrackingToken(newRequestId, ctx.user.id, resolvedTemplate?.id ?? null);
        const baseUrl = (ctx.req.headers.origin as string | undefined) ?? "https://reviewlink.app";
        const trackedReviewUrl = wrapClickUrl(reviewUrl, trackingToken, baseUrl);
        const openPixel = buildOpenPixel(trackingToken, baseUrl);
        // Replace bare review URL with tracked URL and append pixel before </div>
        const trackedHtmlBody = htmlBody
          .replace(new RegExp(reviewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), trackedReviewUrl)
          .replace(/<\/div>\s*$/, `${openPixel}</div>`);

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

        return { success: true };
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
        return { updated: input.ids.length };
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
          platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "other"]),
          url: z.string().url("Please enter a valid URL"),
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
          url: z.string().url("Please enter a valid URL"),
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
          platform: z.enum(["google", "yelp", "tripadvisor", "bing", "facebook", "other"]),
          url: z.string().url(),
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
      // Finally delete the user row itself
      await db.delete(users).where(eq(users.id, uid));
      // Clear the session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { ok: true };
    }),
  }),

  /** Admin-only analytics and diagnostics */
  admin: router({
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
  }),
});
export type AppRouter = typeof appRouter;
