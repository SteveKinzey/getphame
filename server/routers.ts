import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
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
} from "./db";

import { sendMailViaSmtp } from "./smtp";
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
import { stripeSubscriptions, businessProfiles, smtpCredentials, customerRequests, reviewPlatforms } from "../drizzle/schema";
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

// App is free — no send limits enforced

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
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getBusinessProfile(ctx.user.id);
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
    /** Create a Stripe Checkout Session for Pro subscription */
    createCheckout: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getBusinessProfile(ctx.user.id);
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? null,
          userName: ctx.user.name ?? null,
          stripeCustomerId: profile?.stripeCustomerId ?? null,
          origin: input.origin,
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
        return syncWooOrders(ctx.user.id, input.days);
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

        if (customers.length === 0) throw new Error("No eligible customers found.");

        const toSend = customers;

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

        for (const customer of toSend) {
          const htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #0F1F4B;">Hi ${customer.customerName}!</h2>
              <p>Thank you for your recent purchase${customer.productName ? ` of <strong>${customer.productName}</strong>` : ""}. We hope you love it!</p>
              <p>Could you take 30 seconds to leave us a quick review? It means the world to us and helps other customers find us.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${wooReviewUrl}"
                   style="background: #FFB800; color: #0F1F4B; padding: 14px 32px; border-radius: 8px;
                          text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                  Leave a Review
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Thank you so much!</p>
              <p style="color: #666; font-size: 14px;">The ${profile.businessName} team</p>
            </div>
          `;
          try {
            await sendMailViaSmtp({ userId: ctx.user.id, to: customer.customerEmail, subject, html: htmlBody });
            sentIds.push(customer.id);
            await createCustomerRequest({
              userId: ctx.user.id,
              customerName: customer.customerName,
              customerEmail: customer.customerEmail,
              method: "email",
              status: "sent",
              platformId: input.platformId ?? null,
            });
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

        return { sent: sentIds.length, errors };
      }),
  }),

  contacts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return listSavedContacts(ctx.user.id);
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

        // Fetch all contacts for this user and filter to requested IDs
        const allContacts = await listSavedContacts(ctx.user.id);
        const contactMap = new Map(allContacts.map((c) => [c.id, c]));
        const targets = input.contactIds
          .map((id) => contactMap.get(id))
          .filter(Boolean) as typeof allContacts;

        const toSend = targets;
        const skippedDueToLimit = 0;

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

        for (const contact of toSend) {
          try {
            let subject: string;
            let htmlBody: string;
            if (resolvedTemplate) {
              subject = replacePlaceholders(resolvedTemplate.subject, contact.name);
              htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${replacePlaceholders(resolvedTemplate.body, contact.name).replace(/\n/g, "<br>")}</div>`;
            } else {
              subject = `${profile.businessName} would love your feedback!`;
              htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2>Hi ${contact.name}!</h2><p>Thank you for choosing <strong>${profile.businessName}</strong>. We hope you had a great experience!</p><p>Could you take 30 seconds to leave us a quick review?</p><div style="text-align: center; margin: 32px 0;"><a href="${reviewUrl}" style="background: #FFB800; color: #0F1F4B; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Leave a Review</a></div><hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" /><p style="color: #aaa; font-size: 11px; text-align: center;">You received this email because you are a customer of ${profile.businessName}. To stop receiving these emails, reply with &quot;unsubscribe&quot;.</p></div>`;
            }
            await sendMailViaSmtp({ userId: ctx.user.id, to: contact.email, subject, html: htmlBody });
            await createCustomerRequest({
              userId: ctx.user.id,
              customerName: contact.name,
              customerEmail: contact.email,
              method: "email",
              status: "sent",
              platformId: input.platformId ?? null,
            });
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

        return { sent, failed, skippedDueToLimit, errors };
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
          htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F1F4B;">Hi ${input.customerName}!</h2>
            <p>Thank you for choosing <strong>${profile.businessName}</strong>. We hope you had a great experience!</p>
            <p>Could you take 30 seconds to leave us a quick review? It means the world to us and helps other customers find us.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${reviewUrl}"
                 style="background: #FFB800; color: #0F1F4B; padding: 14px 32px; border-radius: 8px;
                        text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Leave a Review
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Thank you so much!</p>
            <p style="color: #666; font-size: 14px;">The ${profile.businessName} team</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #aaa; font-size: 11px; text-align: center;">You received this email because you are a customer of ${profile.businessName}. To stop receiving these emails, reply with "unsubscribe".</p>
          </div>
        `;
        }

        await sendMailViaSmtp({ userId: ctx.user.id, to: input.customerEmail, subject, html: htmlBody });

        await createCustomerRequest({
          userId: ctx.user.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          method: input.method,
          status: "sent",
          platformId: input.platformId ?? null,
        });

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
      return {
        total: all.length,
        thisMonth: monthly,
        recent: all.slice(0, 5),
        platformBreakdown,
      };
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

      const { smtpCredentials, reviewPlatforms, customerRequests } = await import("../drizzle/schema");
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

      const profile = await getBusinessProfile(ctx.user.id);

      const smtpConnected = !!smtpRow?.verified;
      const hasPlatform = !!platformRow;
      const hasSentRequest = (requestRow?.cnt ?? 0) > 0;
      const dismissed = profile?.onboardingDismissed === 1;
      const allDone = smtpConnected && hasPlatform && hasSentRequest;

      return { smtpConnected, hasPlatform, hasSentRequest, allDone, dismissed };
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
