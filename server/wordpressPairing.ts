import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { sourceConnections, wordpressPairings } from "../drizzle/schema";
import { getDb } from "./db";
import { createDeveloperApiKey, revokeDeveloperApiKey } from "./developerApiKeys";
import { getDeveloperApiEnrollmentStatus } from "./developerApiEnrollment";
import { archiveSourceConnection, createSourceConnection } from "./sourceConnections";
import { decryptPassword, encryptPassword } from "./smtp";

const PUBLIC_BASE_URL = (process.env.APP_BASE_URL ?? "https://getphame.app").replace(/\/$/, "");
export const WORDPRESS_PAIRING_TTL_MS = 15 * 60 * 1000;

export type WordPressPairingState = "pending" | "approving" | "approved" | "claimed" | "expired";

export class WordPressPairingError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "EXPIRED" | "ALREADY_CLAIMED" | "TERMS_REQUIRED" | "NOT_READY" | "ALREADY_APPROVED",
    message: string,
  ) {
    super(message);
    this.name = "WordPressPairingError";
  }
}

function hashPairingSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function pairingSecretMatches(secretHash: string, candidateSecret: string): boolean {
  const expectedDigest = Buffer.from(secretHash, "hex");
  const candidateDigest = createHash("sha256").update(candidateSecret).digest();
  return expectedDigest.length === candidateDigest.length
    && timingSafeEqual(expectedDigest, candidateDigest);
}

function publicPairingId(): string {
  return `wpb_${randomBytes(18).toString("base64url")}`;
}

function pairingSecret(): string {
  return `wps_${randomBytes(32).toString("base64url")}`;
}

function normalizeSiteUrl(value: string): { url: string; host: string } {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("siteUrl must use http or https.");
  }
  if (!parsed.hostname) throw new Error("siteUrl must include a hostname.");
  return {
    url: parsed.toString().replace(/\/$/, ""),
    host: parsed.hostname.toLowerCase().slice(0, 255),
  };
}

function normalizeSiteLabel(value: string | undefined, host: string): string {
  const label = value?.trim().replace(/\s+/g, " ").slice(0, 100);
  return label || host;
}

function stateFor(pairing: { status: string; expiresAt: number }, now = Date.now()): WordPressPairingState {
  if (pairing.status === "pending" && pairing.expiresAt <= now) return "expired";
  return pairing.status as WordPressPairingState;
}

function publicStatus(pairing: typeof wordpressPairings.$inferSelect, now = Date.now()) {
  return {
    pairingId: pairing.publicId,
    status: stateFor(pairing, now),
    siteHost: pairing.siteHost,
    siteLabel: pairing.siteLabel,
    expiresAt: pairing.expiresAt,
    approvedAt: pairing.approvedAt,
    claimedAt: pairing.claimedAt,
  };
}

async function loadPairing(pairingId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [pairing] = await db.select().from(wordpressPairings)
    .where(eq(wordpressPairings.publicId, pairingId)).limit(1);
  return pairing ?? null;
}

/**
 * Creates a short-lived device-style authorization request. The WordPress site
 * retains the high-entropy secret; only the public pairing ID is placed in the
 * browser approval URL.
 */
export async function initiateWordPressPairing(params: { siteUrl: string; siteLabel?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const { url, host } = normalizeSiteUrl(params.siteUrl);
  const label = normalizeSiteLabel(params.siteLabel ?? undefined, host);
  const publicId = publicPairingId();
  const secret = pairingSecret();
  const now = Date.now();
  const expiresAt = now + WORDPRESS_PAIRING_TTL_MS;

  await db.insert(wordpressPairings).values({
    publicId,
    secretHash: hashPairingSecret(secret),
    siteUrl: url,
    siteHost: host,
    siteLabel: label,
    status: "pending",
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });

  return {
    pairingId: publicId,
    pairingSecret: secret,
    approvalUrl: `${PUBLIC_BASE_URL}/developer?wordpress_pairing=${encodeURIComponent(publicId)}`,
    expiresAt,
    pollAfterSeconds: 4,
  };
}

/** Returns only safe pairing metadata to an authenticated Get Phame user. */
export async function getWordPressPairingForApproval(pairingId: string) {
  const pairing = await loadPairing(pairingId);
  if (!pairing) return null;
  const now = Date.now();
  const status = stateFor(pairing, now);
  if (status === "expired" && pairing.status === "pending") {
    const db = await getDb();
    if (db) {
      await db.update(wordpressPairings).set({ status: "expired", updatedAt: now })
        .where(and(eq(wordpressPairings.id, pairing.id), eq(wordpressPairings.status, "pending")));
    }
  }
  return publicStatus({ ...pairing, status }, now);
}

/**
 * Binds the pending site to the approving user, creates a least-privilege API
 * key and a WooCommerce source, and retains the raw key only as encrypted,
 * short-lived material for the original site to claim once.
 */
export async function approveWordPressPairing(params: { userId: number; pairingId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const pairing = await loadPairing(params.pairingId);
  if (!pairing) throw new WordPressPairingError("NOT_FOUND", "This WordPress connection request was not found.");

  const now = Date.now();
  const status = stateFor(pairing, now);
  if (status === "expired") {
    await db.update(wordpressPairings).set({ status: "expired", updatedAt: now })
      .where(eq(wordpressPairings.id, pairing.id));
    throw new WordPressPairingError("EXPIRED", "This WordPress connection request has expired. Return to WordPress and start a new connection.");
  }
  if (pairing.userId && pairing.userId !== params.userId) {
    throw new WordPressPairingError("ALREADY_APPROVED", "This WordPress connection is already authorized for another Get Phame account.");
  }
  if (pairing.status === "approved" || pairing.status === "claimed") {
    return publicStatus(pairing, now);
  }
  if (pairing.status === "approving") {
    throw new WordPressPairingError("NOT_READY", "This connection is already being authorized. Return to WordPress in a moment.");
  }

  const enrollment = await getDeveloperApiEnrollmentStatus(params.userId);
  if (!enrollment.termsAccepted) {
    throw new WordPressPairingError("TERMS_REQUIRED", "Accept the Developer API Terms before connecting WordPress.");
  }

  const [claim] = await db.update(wordpressPairings).set({ status: "approving", updatedAt: now })
    .where(and(
      eq(wordpressPairings.id, pairing.id),
      eq(wordpressPairings.status, "pending"),
      gt(wordpressPairings.expiresAt, now),
    ));
  if (Number((claim as unknown as { affectedRows?: number }).affectedRows ?? 0) !== 1) {
    throw new WordPressPairingError("NOT_READY", "This connection request changed before it could be authorized. Refresh and try again.");
  }

  let apiKeyId: number | null = null;
  let sourceId: number | null = null;
  try {
    const apiKey = await createDeveloperApiKey({
      userId: params.userId,
      label: `WordPress · ${pairing.siteHost}`.slice(0, 100),
      scopes: ["contacts:write"],
    });
    apiKeyId = apiKey.id;

    const source = await createSourceConnection({
      userId: params.userId,
      apiKeyId: apiKey.id,
      provider: "woocommerce",
      label: `WooCommerce · ${pairing.siteHost}`.slice(0, 100),
      expectedIntervalMinutes: 1_440,
      monitoringEnabled: true,
      now,
    });
    if (!source) throw new Error("Could not create an authorized WooCommerce Source.");
    sourceId = source.id;

    await db.update(wordpressPairings).set({
      status: "approved",
      userId: params.userId,
      apiKeyId: apiKey.id,
      sourceConnectionId: source.id,
      encryptedApiKey: encryptPassword(apiKey.rawKey),
      approvedAt: now,
      updatedAt: now,
    }).where(eq(wordpressPairings.id, pairing.id));

    return publicStatus({
      ...pairing,
      status: "approved",
      userId: params.userId,
      apiKeyId: apiKey.id,
      sourceConnectionId: source.id,
      approvedAt: now,
      updatedAt: now,
    }, now);
  } catch (error) {
    if (sourceId) await archiveSourceConnection(params.userId, sourceId, now).catch(() => undefined);
    if (apiKeyId) await revokeDeveloperApiKey(params.userId, apiKeyId).catch(() => undefined);
    await db.update(wordpressPairings).set({ status: "pending", updatedAt: Date.now() })
      .where(eq(wordpressPairings.id, pairing.id)).catch(() => undefined);
    throw error;
  }
}

/**
 * Exchanges the WordPress-held secret for credentials exactly once. The raw API
 * key is deleted from the pairing row immediately after a successful claim.
 */
export async function claimWordPressPairing(params: { pairingId: string; pairingSecret: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const pairing = await loadPairing(params.pairingId);
  if (!pairing || !pairingSecretMatches(pairing.secretHash, params.pairingSecret)) {
    throw new WordPressPairingError("NOT_FOUND", "This WordPress connection request was not found.");
  }
  const now = Date.now();
  const status = stateFor(pairing, now);
  if (status === "expired") throw new WordPressPairingError("EXPIRED", "This WordPress connection request has expired. Start a new connection.");
  if (status === "claimed") throw new WordPressPairingError("ALREADY_CLAIMED", "This WordPress connection has already been completed.");
  if (status !== "approved" || !pairing.encryptedApiKey || !pairing.sourceConnectionId) {
    throw new WordPressPairingError("NOT_READY", "Waiting for Get Phame account approval.");
  }

  const rawApiKey = decryptPassword(pairing.encryptedApiKey);
  const [claimed] = await db.update(wordpressPairings).set({
    status: "claimed",
    encryptedApiKey: null,
    claimedAt: now,
    updatedAt: now,
  }).where(and(eq(wordpressPairings.id, pairing.id), eq(wordpressPairings.status, "approved")));
  if (Number((claimed as unknown as { affectedRows?: number }).affectedRows ?? 0) !== 1) {
    throw new WordPressPairingError("ALREADY_CLAIMED", "This WordPress connection has already been completed.");
  }

  const [source] = await db.select({ publicId: sourceConnections.publicId })
    .from(sourceConnections)
    .where(eq(sourceConnections.id, pairing.sourceConnectionId))
    .limit(1);
  if (!source) throw new Error("The authorized WooCommerce Source could not be found.");

  return {
    apiKey: rawApiKey,
    sourceId: source.publicId,
    siteHost: pairing.siteHost,
  };
}

export function getWordPressPairingStatusCode(error: unknown) {
  if (!(error instanceof WordPressPairingError)) return 500;
  if (error.code === "NOT_READY") return 202;
  if (error.code === "NOT_FOUND") return 404;
  if (error.code === "TERMS_REQUIRED") return 422;
  if (error.code === "ALREADY_CLAIMED" || error.code === "ALREADY_APPROVED") return 409;
  return 410;
}
