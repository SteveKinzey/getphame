import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { users, webauthnCeremonies, webauthnCredentials } from "../../drizzle/schema";
import { getDb } from "../db";
import { issuePasskeySession, hashSecurityValue } from "./passkeySessions";
import { resolveWebauthnEnvironment } from "./webauthnEnvironment";

const CEREMONY_TTL_MS = 5 * 60 * 1000;
function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Security service unavailable" });
  return db;
}
function parseTransports(value: string | null): AuthenticatorTransport[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is AuthenticatorTransport => typeof item === "string") : undefined;
  } catch { return undefined; }
}
async function createCeremony(userId: number, purpose: "registration" | "authentication", challenge: string, req: Request) {
  const db = requireDb(await getDb());
  const environment = resolveWebauthnEnvironment(req);
  const now = Date.now();
  const id = randomBytes(32).toString("hex");
  await db.insert(webauthnCeremonies).values({
    id, userId, purpose, challengeHash: hashSecurityValue(challenge), rpId: environment.rpID,
    expectedOrigin: environment.origin, expiresAt: now + CEREMONY_TTL_MS, consumedAt: null, createdAt: now,
  });
  return { id, environment };
}
async function consumeCeremony(id: string, purpose: "registration" | "authentication", userId?: number) {
  const db = requireDb(await getDb());
  const now = Date.now();
  const conditions = [eq(webauthnCeremonies.id, id), eq(webauthnCeremonies.purpose, purpose), isNull(webauthnCeremonies.consumedAt), gt(webauthnCeremonies.expiresAt, now)];
  if (userId !== undefined) conditions.push(eq(webauthnCeremonies.userId, userId));
  const [ceremony] = await db.select().from(webauthnCeremonies).where(and(...conditions)).limit(1);
  if (!ceremony) throw new TRPCError({ code: "BAD_REQUEST", message: "Passkey request expired or already used" });
  const result = await db.update(webauthnCeremonies).set({ consumedAt: now }).where(and(...conditions));
  const affectedRows = Number((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
  if (affectedRows !== 1) throw new TRPCError({ code: "CONFLICT", message: "Passkey request was already used" });
  return ceremony;
}

export async function beginPasskeyRegistration(userId: number, req: Request) {
  const db = requireDb(await getDb());
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Add an email address before creating a passkey" });
  const credentials = await db.select().from(webauthnCredentials).where(and(eq(webauthnCredentials.userId, userId), eq(webauthnCredentials.status, "active")));
  const environment = resolveWebauthnEnvironment(req);
  const options = await generateRegistrationOptions({
    rpName: environment.rpName, rpID: environment.rpID, userID: new TextEncoder().encode(String(user.id)),
    userName: user.email, userDisplayName: user.name?.trim() || user.email, attestationType: "none",
    excludeCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: parseTransports(credential.transportsJson) })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" }, supportedAlgorithmIDs: [-7, -257],
  });
  const ceremony = await createCeremony(userId, "registration", options.challenge, req);
  return { ceremonyId: ceremony.id, options };
}

export async function finishPasskeyRegistration(userId: number, ceremonyId: string, response: RegistrationResponseJSON, displayName: string) {
  const db = requireDb(await getDb());
  const ceremony = await consumeCeremony(ceremonyId, "registration", userId);
  const verification = await verifyRegistrationResponse({
    response, expectedChallenge: (challenge) => hashSecurityValue(challenge) === ceremony.challengeHash,
    expectedOrigin: ceremony.expectedOrigin, expectedRPID: ceremony.rpId, requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) throw new TRPCError({ code: "UNAUTHORIZED", message: "Passkey registration could not be verified" });
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const credentialIdHash = hashSecurityValue(credential.id);
  const [existing] = await db.select({ id: webauthnCredentials.id }).from(webauthnCredentials).where(eq(webauthnCredentials.credentialIdHash, credentialIdHash)).limit(1);
  if (existing) throw new TRPCError({ code: "CONFLICT", message: "This passkey is already registered" });
  await db.insert(webauthnCredentials).values({
    userId, credentialId: credential.id, credentialIdHash,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter,
    transportsJson: credential.transports ? JSON.stringify(credential.transports) : null,
    deviceType: credentialDeviceType, backedUp: credentialBackedUp, aaguid: null,
    displayName: displayName.trim().slice(0, 80) || "Passkey", status: "active", createdAt: Date.now(),
    lastUsedAt: null, revokedAt: null, revokedByUserId: null,
  });
  return { verified: true as const };
}

export async function beginPasskeyAuthentication(email: string, req: Request) {
  const db = requireDb(await getDb());
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`).limit(1);
  const credentials = user ? await db.select().from(webauthnCredentials).where(and(eq(webauthnCredentials.userId, user.id), eq(webauthnCredentials.status, "active"))) : [];
  // Unknown and unenrolled accounts deliberately share one neutral response.
  // The client may offer verification but must not reveal account existence.
  if (!user || credentials.length === 0) return { state: "enrollment_required" as const };
  const environment = resolveWebauthnEnvironment(req);
  const options = await generateAuthenticationOptions({
    rpID: environment.rpID,
    allowCredentials: credentials.map((credential) => ({ id: credential.credentialId, transports: parseTransports(credential.transportsJson) })),
    userVerification: "required",
  });
  const ceremony = await createCeremony(user.id, "authentication", options.challenge, req);
  return { state: "authentication_ready" as const, ceremonyId: ceremony.id, options };
}

export async function finishPasskeyAuthentication(ceremonyId: string, response: AuthenticationResponseJSON, req: Request, res: Response) {
  const db = requireDb(await getDb());
  const ceremony = await consumeCeremony(ceremonyId, "authentication");
  const [credential] = await db.select().from(webauthnCredentials).where(and(
    eq(webauthnCredentials.userId, ceremony.userId), eq(webauthnCredentials.credentialIdHash, hashSecurityValue(response.id)), eq(webauthnCredentials.status, "active"),
  )).limit(1);
  if (!credential) throw new TRPCError({ code: "UNAUTHORIZED", message: "Passkey is not active" });
  const verification = await verifyAuthenticationResponse({
    response, expectedChallenge: (challenge) => hashSecurityValue(challenge) === ceremony.challengeHash,
    expectedOrigin: ceremony.expectedOrigin, expectedRPID: ceremony.rpId,
    credential: { id: credential.credentialId, publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64url")), counter: credential.counter, transports: parseTransports(credential.transportsJson) },
    requireUserVerification: true,
  });
  if (!verification.verified) throw new TRPCError({ code: "UNAUTHORIZED", message: "Passkey sign-in could not be verified" });
  await db.update(webauthnCredentials).set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: Date.now() }).where(eq(webauthnCredentials.id, credential.id));
  await issuePasskeySession(ceremony.userId, req, res);
  return { verified: true as const };
}

export async function listPasskeys(userId: number) {
  const db = requireDb(await getDb());
  return db.select({ id: webauthnCredentials.id, displayName: webauthnCredentials.displayName, deviceType: webauthnCredentials.deviceType, backedUp: webauthnCredentials.backedUp, createdAt: webauthnCredentials.createdAt, lastUsedAt: webauthnCredentials.lastUsedAt })
    .from(webauthnCredentials).where(and(eq(webauthnCredentials.userId, userId), eq(webauthnCredentials.status, "active"))).orderBy(desc(webauthnCredentials.createdAt));
}
export async function renamePasskey(userId: number, credentialId: number, displayName: string) {
  const db = requireDb(await getDb());
  await db.update(webauthnCredentials).set({ displayName: displayName.trim().slice(0, 80) }).where(and(eq(webauthnCredentials.id, credentialId), eq(webauthnCredentials.userId, userId), eq(webauthnCredentials.status, "active")));
  return { success: true as const };
}
export async function revokePasskey(userId: number, credentialId: number) {
  const db = requireDb(await getDb());
  await db.update(webauthnCredentials).set({ status: "revoked", revokedAt: Date.now(), revokedByUserId: userId }).where(and(eq(webauthnCredentials.id, credentialId), eq(webauthnCredentials.userId, userId), eq(webauthnCredentials.status, "active")));
  return { success: true as const };
}
