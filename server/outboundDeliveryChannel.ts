import { and, eq, ne } from "drizzle-orm";
import {
  bulkSenderCredentials,
  businessProfiles,
  outboundMailPreferences,
  smtpCredentials,
} from "../drizzle/schema";
import { BULK_SENDER_PRESETS, type BulkSenderProvider } from "../shared/bulkSenderPresets";
import type { AdaptiveSendChannelDescriptor } from "../shared/adaptiveSendLimits";
import { getDb } from "./db";

export type ResolvedOutboundDeliveryChannel = AdaptiveSendChannelDescriptor & {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  encryptedSecret: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
};

export type UserOwnedMailChannel = "personal" | "bulk";

export async function selectOutboundDeliveryChannel(
  userId: number,
  selectedChannel: UserOwnedMailChannel,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = Date.now();
  const [existing] = await db
    .select({ id: outboundMailPreferences.id })
    .from(outboundMailPreferences)
    .where(eq(outboundMailPreferences.userId, userId))
    .limit(1);
  if (existing) {
    await db
      .update(outboundMailPreferences)
      .set({ selectedChannel, updatedAt: now })
      .where(eq(outboundMailPreferences.userId, userId));
    return;
  }
  await db.insert(outboundMailPreferences).values({
    userId,
    selectedChannel,
    updatedAt: now,
  });
}

export async function clearOutboundDeliveryChannel(
  userId: number,
  selectedChannel: UserOwnedMailChannel,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(outboundMailPreferences)
    .where(and(
      eq(outboundMailPreferences.userId, userId),
      eq(outboundMailPreferences.selectedChannel, selectedChannel),
    ));
}

function asTimestamp(value: Date | number | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return Date.now();
}

export function classifyPersonalSmtpProvider(host: string, email: string): { id: string; label: string } {
  const normalizedHost = host.trim().toLowerCase();
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (normalizedHost.includes("gmail") || normalizedHost.includes("google") || domain === "gmail.com" || domain === "googlemail.com") {
    const personal = domain === "gmail.com" || domain === "googlemail.com";
    return { id: personal ? "gmail" : "google_workspace", label: personal ? "Gmail" : "Google Workspace" };
  }
  if (normalizedHost.includes("outlook") || normalizedHost.includes("office365") || normalizedHost.includes("microsoft") || ["outlook.com", "hotmail.com", "live.com"].includes(domain)) {
    return { id: "microsoft", label: "Outlook / Microsoft 365" };
  }
  if (normalizedHost.includes("yahoo") || domain.startsWith("yahoo.")) return { id: "yahoo", label: "Yahoo Mail" };
  if (normalizedHost.includes("icloud") || normalizedHost.includes("mail.me.com") || ["icloud.com", "me.com"].includes(domain)) return { id: "icloud", label: "iCloud Mail" };
  if (normalizedHost.includes("zoho") || domain.includes("zoho")) return { id: "zoho", label: "Zoho Mail" };
  if (normalizedHost.includes("aol") || domain === "aol.com") return { id: "aol", label: "AOL Mail" };
  if (normalizedHost.includes("proton") || domain.startsWith("proton")) return { id: "proton", label: "Proton Mail" };
  if (normalizedHost.includes("fastmail") || domain === "fastmail.com") return { id: "fastmail", label: "Fastmail" };
  return { id: "custom_smtp", label: "Connected SMTP" };
}

export async function resolveOutboundDeliveryChannel(userId: number): Promise<ResolvedOutboundDeliveryChannel | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [[profile], [preference], [bulk], [personal]] = await Promise.all([
    db.select({ tier: businessProfiles.tier }).from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1),
    db.select({ selectedChannel: outboundMailPreferences.selectedChannel }).from(outboundMailPreferences).where(eq(outboundMailPreferences.userId, userId)).limit(1),
    db.select().from(bulkSenderCredentials).where(and(
      eq(bulkSenderCredentials.userId, userId),
      eq(bulkSenderCredentials.connected, 1),
      ne(bulkSenderCredentials.provider, "sendgrid"),
    )).limit(1),
    db.select().from(smtpCredentials).where(eq(smtpCredentials.userId, userId)).limit(1),
  ]);

  const tier = profile?.tier ?? "free";
  if (preference?.selectedChannel === "bulk" &&
    tier !== "free"
    && bulk
    && bulk.smtpHost
    && bulk.smtpPort
    && bulk.smtpUsername
  ) {
    const provider = bulk.provider as BulkSenderProvider;
    return {
      key: `bulk:${bulk.id}:${provider}`,
      type: "bulk",
      providerId: provider,
      providerLabel: BULK_SENDER_PRESETS[provider]?.label ?? provider,
      connectedAt: asTimestamp(bulk.createdAt),
      tier,
      host: bulk.smtpHost,
      port: bulk.smtpPort,
      secure: bulk.smtpSecure === 1,
      username: bulk.smtpUsername,
      encryptedSecret: bulk.apiKey,
      fromEmail: bulk.fromEmail,
      fromName: bulk.fromName ?? bulk.fromEmail,
      replyTo: bulk.fromEmail,
    };
  }

  if (preference?.selectedChannel !== "personal" || !personal) return null;
  const provider = classifyPersonalSmtpProvider(personal.host, personal.user);
  return {
    key: `personal:${personal.id}:${provider.id}`,
    type: "personal",
    providerId: provider.id,
    providerLabel: provider.label,
    connectedAt: asTimestamp(personal.createdAt),
    tier,
    host: personal.host,
    port: personal.port,
    secure: personal.secure === 1,
    username: personal.user,
    encryptedSecret: personal.encryptedPass,
    fromEmail: personal.user,
    fromName: personal.fromName ?? personal.user,
    replyTo: personal.replyTo ?? personal.user,
  };
}
