/**
 * Bulk Sender — Pro-only external relay connection.
 *
 * New connections use verified SMTP presets and authenticate with `verify()`
 * without sending a message. Existing SendGrid, Mailgun, and Postmark API-mode
 * records remain testable for backward compatibility. Secrets are AES-256-GCM
 * encrypted at rest and are never returned to the client.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { bulkSenderCredentials, businessProfiles } from "../drizzle/schema";
import {
  BULK_SENDER_PROVIDER_IDS,
  getBulkSenderPreset,
  resolveBulkSenderHost,
  resolveBulkSenderUsername,
  type BulkSenderProvider,
  type BulkSenderSecurity,
} from "../shared/bulkSenderPresets";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { decryptPassword, encryptPassword } from "./smtp";
import {
  clearOutboundDeliveryChannel,
  resolveOutboundDeliveryChannel,
  selectOutboundDeliveryChannel,
} from "./outboundDeliveryChannel";

type SmtpConnectionConfig = {
  host: string;
  port: number;
  security: BulkSenderSecurity;
  username: string;
  secret: string;
};

export async function getBulkSenderCreds(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(bulkSenderCredentials)
    .where(eq(bulkSenderCredentials.userId, userId))
    .limit(1);
  return row ?? null;
}

function requirePro(tier: string) {
  if (tier === "free") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bulk Sender is a Pro feature. Upgrade to connect an external email service.",
    });
  }
}

function isPrivateOrReservedIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  const mappedIpv4 = normalized.startsWith("::ffff:") ? normalized.slice(7) : normalized;
  if (isIP(mappedIpv4) !== 4) return false;
  const octets = mappedIpv4.split(".").map(Number);
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

export async function resolveSafeCustomSmtpHost(host: string): Promise<string> {
  const normalized = host.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized.includes("://") || /[\s/\\?#]/.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid SMTP hostname or public IP address." });
  }
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Private or local SMTP hosts are not allowed." });
  }

  let addresses: Awaited<ReturnType<typeof lookup>>[] | { address: string; family: number }[];
  try {
    addresses = await lookup(normalized, { all: true, verbatim: true });
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The custom SMTP host could not be resolved." });
  }

  if (!addresses.length || addresses.some((entry) => isPrivateOrReservedIp(entry.address))) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Private or reserved SMTP destinations are not allowed." });
  }
  return addresses[0].address;
}

function describeConnectionError(error: unknown): string {
  const detail = error as NodeJS.ErrnoException & { responseCode?: number };
  if (detail.code === "EAUTH" || detail.responseCode === 535) {
    return "Authentication failed. Check the provider-specific username and secret.";
  }
  if (detail.code === "ETIMEDOUT" || detail.code === "ESOCKET") {
    return "The SMTP service did not respond in time. Confirm the host, port, and security mode.";
  }
  if (detail.code === "ECONNREFUSED") {
    return "The SMTP service refused the connection. Confirm the host, port, and security mode.";
  }
  if (detail.code === "ENOTFOUND" || detail.code === "EAI_AGAIN") {
    return "The SMTP host could not be resolved. Confirm the provider or region.";
  }
  if (error instanceof Error && /certificate|tls|ssl/i.test(error.message)) {
    return "The SMTP service could not establish a trusted secure connection.";
  }
  return "Connection failed. Confirm the provider settings and try again.";
}

export async function verifyBulkSenderSmtpConnection(
  provider: BulkSenderProvider,
  config: SmtpConnectionConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const connectionHost = provider === "custom_smtp"
      ? await resolveSafeCustomSmtpHost(config.host)
      : config.host;
    const implicitTls = config.security === "tls";
    const transporter = nodemailer.createTransport({
      host: connectionHost,
      port: config.port,
      secure: implicitTls,
      requireTLS: !implicitTls,
      auth: { user: config.username, pass: config.secret },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: {
        rejectUnauthorized: true,
        servername: isIP(config.host) ? undefined : config.host,
      },
    });
    await transporter.verify();
    transporter.close();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describeConnectionError(error) };
  }
}

async function testLegacyApiConnection(
  provider: "sendgrid" | "mailgun" | "postmark",
  apiKey: string,
  mailgunDomain?: string | null,
  mailgunRegion?: "us" | "eu" | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "sendgrid") {
      const response = await fetch("https://api.sendgrid.com/v3/user/profile", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok
        ? { ok: true }
        : { ok: false, error: "SendGrid rejected the API key." };
    }

    if (provider === "mailgun") {
      const domainsUrl = mailgunRegion === "eu"
        ? "https://api.eu.mailgun.net/v3/domains"
        : "https://api.mailgun.net/v3/domains";
      const credentials = Buffer.from(`api:${apiKey}`).toString("base64");
      const response = await fetch(domainsUrl, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      void mailgunDomain;
      return response.ok
        ? { ok: true }
        : { ok: false, error: "Mailgun rejected the API key or region." };
    }

    const response = await fetch("https://api.postmarkapp.com/server", {
      headers: {
        "X-Postmark-Server-Token": apiKey,
        Accept: "application/json",
      },
    });
    return response.ok
      ? { ok: true }
      : { ok: false, error: "Postmark rejected the Server API Token." };
  } catch {
    return { ok: false, error: "The provider could not be reached. Try again shortly." };
  }
}

const connectInput = z.object({
  provider: z.enum(BULK_SENDER_PROVIDER_IDS),
  secret: z.string().min(1).max(4096).optional(),
  // Backward-compatible alias for clients built against the original three-provider UI.
  apiKey: z.string().min(1).max(4096).optional(),
  smtpUsername: z.string().trim().max(320).optional(),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.number().int().min(1).max(65_535).optional(),
  smtpSecurity: z.enum(["starttls", "tls"]).optional(),
  providerRegion: z.string().trim().max(64).optional(),
  fromEmail: z.string().email().max(320),
  fromName: z.string().trim().max(255).optional(),
  mailgunDomain: z.string().trim().max(255).optional(),
  mailgunRegion: z.enum(["us", "eu"]).optional(),
}).superRefine((value, ctx) => {
  const suppliedSecret = value.secret ?? value.apiKey ?? "";
  if (!suppliedSecret.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["secret"], message: "Enter the provider secret." });
  }
  if (value.provider === "mailjet" && !value.smtpUsername?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["smtpUsername"], message: "Enter the Mailjet API key." });
  }
});

function buildSmtpConfig(
  input: z.infer<typeof connectInput>,
  secret: string,
): SmtpConnectionConfig & { region: string | null } {
  const preset = getBulkSenderPreset(input.provider);
  const region = input.providerRegion ?? preset.defaultRegion ?? null;
  if (preset.regions?.length && !preset.regions.some((option) => option.id === region)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid provider region." });
  }

  const host = input.provider === "custom_smtp"
    ? input.smtpHost?.trim() ?? ""
    : resolveBulkSenderHost(input.provider, region);
  const port = input.provider === "custom_smtp"
    ? input.smtpPort ?? preset.defaultPort
    : preset.defaultPort;
  const security = input.provider === "custom_smtp"
    ? input.smtpSecurity ?? preset.defaultSecurity
    : preset.defaultSecurity;
  const username = resolveBulkSenderUsername(input.provider, input.smtpUsername ?? "", secret);

  if (!host) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the SMTP host." });
  if (!username) throw new TRPCError({ code: "BAD_REQUEST", message: `Enter the ${preset.usernameLabel}.` });

  return { host, port, security, username, secret, region };
}

export const bulkSenderRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const [credentials, activeChannel] = await Promise.all([
      getBulkSenderCreds(ctx.user.id),
      resolveOutboundDeliveryChannel(ctx.user.id),
    ]);
    if (!credentials) return {
      connected: false as const,
      legacyPlatformConnection: false as const,
      selectedForOutreach: false as const,
    };
    if (credentials.provider === "sendgrid") {
      return {
        connected: false as const,
        legacyPlatformConnection: true as const,
        selectedForOutreach: false as const,
      };
    }
    return {
      connected: credentials.connected === 1,
      legacyPlatformConnection: false as const,
      selectedForOutreach: activeChannel?.type === "bulk",
      provider: credentials.provider,
      fromEmail: credentials.fromEmail,
      fromName: credentials.fromName,
      providerRegion: credentials.providerRegion,
      smtpHost: credentials.smtpHost,
      smtpPort: credentials.smtpPort,
      smtpSecurity: credentials.smtpSecure === 1 ? "tls" as const : "starttls" as const,
      connectionMode: credentials.smtpHost ? "smtp" as const : "legacy_api" as const,
      mailgunDomain: credentials.mailgunDomain,
      mailgunRegion: credentials.mailgunRegion,
    };
  }),

  connect: protectedProcedure
    .input(connectInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [profile] = await db
        .select({ tier: businessProfiles.tier })
        .from(businessProfiles)
        .where(eq(businessProfiles.userId, ctx.user.id))
        .limit(1);
      requirePro(profile?.tier ?? "free");

      const secret = input.secret ?? input.apiKey ?? "";
      const legacyMailgunApiMode = input.provider === "mailgun" && Boolean(input.apiKey) && !input.secret && !input.smtpUsername;
      const smtpConfig = legacyMailgunApiMode ? null : buildSmtpConfig(input, secret);
      const test = legacyMailgunApiMode
        ? await testLegacyApiConnection("mailgun", secret, input.mailgunDomain, input.mailgunRegion)
        : await verifyBulkSenderSmtpConnection(input.provider, smtpConfig!);
      if (!test.ok) {
        throw new TRPCError({ code: "BAD_REQUEST", message: test.error ?? "Connection test failed" });
      }

      const now = Date.now();
      const values = {
        provider: input.provider,
        apiKey: encryptPassword(secret),
        fromEmail: input.fromEmail,
        fromName: input.fromName ?? null,
        mailgunDomain: legacyMailgunApiMode ? input.mailgunDomain ?? null : null,
        mailgunRegion: legacyMailgunApiMode ? input.mailgunRegion ?? "us" as const : "us" as const,
        smtpHost: smtpConfig?.host ?? null,
        smtpPort: smtpConfig?.port ?? null,
        smtpSecure: smtpConfig?.security === "tls" ? 1 : 0,
        smtpUsername: smtpConfig?.username ?? null,
        providerRegion: smtpConfig?.region ?? null,
        connected: 1,
        updatedAt: now,
      };

      const existing = await getBulkSenderCreds(ctx.user.id);
      if (existing) {
        await db
          .update(bulkSenderCredentials)
          .set(values)
          .where(eq(bulkSenderCredentials.userId, ctx.user.id));
      } else {
        await db.insert(bulkSenderCredentials).values({
          userId: ctx.user.id,
          ...values,
          createdAt: now,
        });
      }

      await selectOutboundDeliveryChannel(ctx.user.id, "bulk");

      return { ok: true };
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await db
      .delete(bulkSenderCredentials)
      .where(eq(bulkSenderCredentials.userId, ctx.user.id));
    await clearOutboundDeliveryChannel(ctx.user.id, "bulk");
    return { ok: true };
  }),

  test: protectedProcedure.mutation(async ({ ctx }) => {
    const credentials = await getBulkSenderCreds(ctx.user.id);
    if (!credentials) throw new TRPCError({ code: "NOT_FOUND", message: "No Bulk Sender connection is configured." });
    const secret = decryptPassword(credentials.apiKey);

    if (credentials.smtpHost && credentials.smtpPort && credentials.smtpUsername) {
      return verifyBulkSenderSmtpConnection(credentials.provider as BulkSenderProvider, {
        host: credentials.smtpHost,
        port: credentials.smtpPort,
        security: credentials.smtpSecure === 1 ? "tls" : "starttls",
        username: credentials.smtpUsername,
        secret,
      });
    }

    if (credentials.provider === "mailgun" || credentials.provider === "postmark") {
      return testLegacyApiConnection(
        credentials.provider,
        secret,
        credentials.mailgunDomain,
        credentials.mailgunRegion as "us" | "eu" | null,
      );
    }

    return { ok: false, error: "This connection is missing SMTP metadata. Update it to reconnect safely." };
  }),
});
