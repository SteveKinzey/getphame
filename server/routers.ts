import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
        });
        return getBusinessProfile(ctx.user.id);
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

        const subject = `${profile.businessName} would love your feedback!`;
        const htmlBody = `
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

        await sendViaGmail(ctx.user.id, input.customerEmail, subject, htmlBody);

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
});

export type AppRouter = typeof appRouter;
