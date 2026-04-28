/**
 * Bulk Sender — Pro-only feature.
 * Allows users to connect a transactional email API (SendGrid, Mailgun, Postmark)
 * for high-volume sending without hitting SMTP daily limits.
 *
 * API keys are AES-256-GCM encrypted at rest using the same key material as SMTP.
 */

import { encryptPassword, decryptPassword } from "./smtp";
import { getDb } from "./db";
import { bulkSenderCredentials } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router } from "./_core/trpc";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BulkSenderProvider = "sendgrid" | "mailgun" | "postmark";

// ── DB helpers ────────────────────────────────────────────────────────────────

export async function getBulkSenderCreds(userId: number) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bulkSenderCredentials)
    .where(eq(bulkSenderCredentials.userId, userId))
    .limit(1);
  return row ?? null;
}

// ── Test connection ───────────────────────────────────────────────────────────

export async function testBulkSenderConnection(
  provider: BulkSenderProvider,
  apiKey: string,
  fromEmail: string,
  fromName: string | null,
  mailgunDomain?: string | null,
  mailgunRegion?: "us" | "eu" | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "sendgrid") {
      const res = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: (body as { errors?: { message: string }[] })?.errors?.[0]?.message ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    }

    if (provider === "mailgun") {
      const domain = mailgunDomain ?? "sandbox.mailgun.org";
      const baseUrl = mailgunRegion === "eu"
        ? `https://api.eu.mailgun.net/v3/${domain}/messages`
        : `https://api.mailgun.net/v3/${domain}/messages`;
      // Validate key by hitting the domains endpoint
      const domainsUrl = mailgunRegion === "eu"
        ? "https://api.eu.mailgun.net/v3/domains"
        : "https://api.mailgun.net/v3/domains";
      const creds = Buffer.from(`api:${apiKey}`).toString("base64");
      const res = await fetch(domainsUrl, {
        headers: { Authorization: `Basic ${creds}` },
      });
      void baseUrl; // suppress unused warning
      if (!res.ok) return { ok: false, error: `HTTP ${res.status} — check API key and domain` };
      return { ok: true };
    }

    if (provider === "postmark") {
      const res = await fetch("https://api.postmarkapp.com/server", {
        headers: {
          "X-Postmark-Server-Token": apiKey,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: (body as { Message?: string })?.Message ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    }

    return { ok: false, error: "Unknown provider" };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Connection failed" };
  }
}

// ── tRPC router ───────────────────────────────────────────────────────────────

function requirePro(tier: string) {
  if (tier === "free") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bulk sender is a Pro feature. Upgrade to connect an external email service.",
    });
  }
}

export const bulkSenderRouter = router({
  /** Get current bulk sender status (provider + from email, no API key) */
  status: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getBulkSenderCreds(ctx.user.id);
    if (!creds) return { connected: false };
    return {
      connected: true,
      provider: creds.provider,
      fromEmail: creds.fromEmail,
      fromName: creds.fromName,
      mailgunDomain: creds.mailgunDomain,
      mailgunRegion: creds.mailgunRegion,
    };
  }),

  /** Connect or update bulk sender credentials (Pro only) */
  connect: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["sendgrid", "mailgun", "postmark"]),
        apiKey: z.string().min(1),
        fromEmail: z.string().email(),
        fromName: z.string().max(255).optional(),
        mailgunDomain: z.string().optional(),
        mailgunRegion: z.enum(["us", "eu"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch tier from business profile
      const db = getDb();
      const { businessProfiles } = await import("../drizzle/schema");
      const [profile] = await db
        .select({ tier: businessProfiles.tier })
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, ctx.user.id))
        .limit(1);
      requirePro(profile?.tier ?? "free");

      // Test connection before saving
      const test = await testBulkSenderConnection(
        input.provider,
        input.apiKey,
        input.fromEmail,
        input.fromName ?? null,
        input.mailgunDomain,
        input.mailgunRegion
      );
      if (!test.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: test.error ?? "Connection test failed" });
      }

      const encryptedKey = encryptPassword(input.apiKey);
      const existing = await getBulkSenderCreds(ctx.user.id);
      const now = Date.now();

      if (existing) {
        await db
          .update(bulkSenderCredentials)
          .set({
            provider: input.provider,
            apiKey: encryptedKey,
            fromEmail: input.fromEmail,
            fromName: input.fromName ?? null,
            mailgunDomain: input.mailgunDomain ?? null,
            mailgunRegion: input.mailgunRegion ?? "us",
            connected: 1,
            updatedAt: now,
          })
          .where(eq(bulkSenderCredentials.userId, ctx.user.id));
      } else {
        await db.insert(bulkSenderCredentials).values({
          userId: ctx.user.id,
          provider: input.provider,
          apiKey: encryptedKey,
          fromEmail: input.fromEmail,
          fromName: input.fromName ?? null,
          mailgunDomain: input.mailgunDomain ?? null,
          mailgunRegion: input.mailgunRegion ?? "us",
          connected: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      return { ok: true };
    }),

  /** Disconnect bulk sender */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .delete(bulkSenderCredentials)
      .where(eq(bulkSenderCredentials.userId, ctx.user.id));
    return { ok: true };
  }),

  /** Test existing connection */
  test: protectedProcedure.mutation(async ({ ctx }) => {
    const creds = await getBulkSenderCreds(ctx.user.id);
    if (!creds) throw new TRPCError({ code: "NOT_FOUND", message: "No bulk sender configured" });
    const apiKey = decryptPassword(creds.apiKey);
    const result = await testBulkSenderConnection(
      creds.provider,
      apiKey,
      creds.fromEmail,
      creds.fromName ?? null,
      creds.mailgunDomain,
      creds.mailgunRegion
    );
    return result;
  }),
});
