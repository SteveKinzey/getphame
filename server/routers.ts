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
import {
  buildGmailAuthUrl,
  deleteGmailTokens,
  getValidAccessToken,
  sendViaGmail,
} from "./gmail";
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
import { stripeSubscriptions, businessProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  listSavedContacts,
  createSavedContact,
  updateSavedContact,
  deleteSavedContact,
  markContactSent,
  importContacts,
  setContactTags,
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

const FREE_LIMIT = 10;

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

  gmail: router({
    authUrl: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .query(({ ctx, input }) => {
        const url = buildGmailAuthUrl(input.origin, ctx.user.id);
        return { url };
      }),

    status: protectedProcedure.query(async ({ ctx }) => {
      const tokenData = await getValidAccessToken(ctx.user.id);
      return {
        connected: tokenData !== null,
        gmailEmail: tokenData?.gmailEmail ?? null,
      };
    }),

    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteGmailTokens(ctx.user.id);
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
          userEmail,
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
      .input(z.object({ customerIds: z.array(z.number().int()).min(1) }))
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

        const remaining = profile.tier === "free" ? FREE_LIMIT - profile.monthlyCount : Infinity;
        if (profile.tier === "free" && remaining <= 0) {
          throw new Error(`Free plan limit reached (${FREE_LIMIT}/month). Upgrade to Pro for unlimited requests.`);
        }
        const toSend = profile.tier === "free" ? customers.slice(0, remaining) : customers;

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
                <a href="${profile.reviewLink}"
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
            await sendViaGmail(ctx.user.id, customer.customerEmail, subject, htmlBody, profile.fromName, profile.replyTo);
            sentIds.push(customer.id);
            await createCustomerRequest({
              userId: ctx.user.id,
              customerName: customer.customerName,
              customerEmail: customer.customerEmail,
              method: "email",
              status: "sent",
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

        const remaining = profile.tier === "free" ? Math.max(0, FREE_LIMIT - profile.monthlyCount) : Infinity;
        if (remaining === 0) {
          throw new Error(`Free plan limit reached (${FREE_LIMIT}/month). Upgrade to Pro for unlimited requests.`);
        }

        // Fetch all contacts for this user and filter to requested IDs
        const allContacts = await listSavedContacts(ctx.user.id);
        const contactMap = new Map(allContacts.map((c) => [c.id, c]));
        const targets = input.contactIds
          .map((id) => contactMap.get(id))
          .filter(Boolean) as typeof allContacts;

        // Cap to remaining quota for free tier
        const toSend = profile.tier === "free" ? targets.slice(0, remaining) : targets;
        const skippedDueToLimit = targets.length - toSend.length;

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
            .replace(/\{\{review_link\}\}/g, profile.reviewLink ?? "")
            .replace(/\{\{reviewLink\}\}/g, profile.reviewLink ?? "");

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
              htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2>Hi ${contact.name}!</h2><p>Thank you for choosing <strong>${profile.businessName}</strong>. We hope you had a great experience!</p><p>Could you take 30 seconds to leave us a quick review?</p><div style="text-align: center; margin: 32px 0;"><a href="${profile.reviewLink}" style="background: #FFB800; color: #0F1F4B; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">Leave a Review</a></div></div>`;
            }
            await sendViaGmail(ctx.user.id, contact.email, subject, htmlBody, profile.fromName, profile.replyTo);
            await createCustomerRequest({
              userId: ctx.user.id,
              customerName: contact.name,
              customerEmail: contact.email,
              method: "email",
              status: "sent",
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

        // Update monthly count
        await upsertBusinessProfile({ ...profile, monthlyCount: profile.monthlyCount + sent });

        return { sent, failed, skippedDueToLimit, errors };
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

        if (profile.tier === "free" && profile.monthlyCount >= FREE_LIMIT) {
          throw new Error(`Free plan limit reached (${FREE_LIMIT}/month). Upgrade to Pro for unlimited requests.`);
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
              .replace(/\{\{review_link\}\}/g, profile.reviewLink ?? "")
              .replace(/\{\{reviewLink\}\}/g, profile.reviewLink ?? "");
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
              <a href="${profile.reviewLink}"
                 style="background: #FFB800; color: #0F1F4B; padding: 14px 32px; border-radius: 8px;
                        text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Leave a Review
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Thank you so much!</p>
            <p style="color: #666; font-size: 14px;">The ${profile.businessName} team</p>
          </div>
        `;
        }

        await sendViaGmail(ctx.user.id, input.customerEmail, subject, htmlBody, profile.fromName, profile.replyTo);

        await createCustomerRequest({
          userId: ctx.user.id,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          method: input.method,
          status: "sent",
        });

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
        const { customerRequests } = await import("../drizzle/schema");
        const { and, eq: eqOp } = await import("drizzle-orm");
        await db
          .update(customerRequests)
          .set({ respondedAt: input.responded ? Date.now() : null })
          .where(and(eqOp(customerRequests.userId, ctx.user.id), eqOp(customerRequests.id, input.id)));
        return { ok: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const [all, monthly] = await Promise.all([
        getCustomerRequests(ctx.user.id, 1000),
        getMonthlyRequestCount(ctx.user.id, yearMonth),
      ]);
      return {
        total: all.length,
        thisMonth: monthly,
        recent: all.slice(0, 5),
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
});

export type AppRouter = typeof appRouter;

