import { eq } from "drizzle-orm";
import {
  DEVELOPER_API_ACCEPTABLE_USE_VERSION,
  DEVELOPER_API_TERMS_VERSION,
  classifyDeveloperSendScopeRequest,
  isCurrentDeveloperApiTermsAcceptance,
  normalizeDeveloperSendScopeStatus,
  type DeveloperSendScopeStatus,
} from "../shared/developerApiEnrollment";
import { developerApiEnrollments } from "../drizzle/schema";
import { getDb } from "./db";
import type { DeveloperApiScope } from "./developerApiKeys";

async function findDeveloperApiEnrollment(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select()
    .from(developerApiEnrollments)
    .where(eq(developerApiEnrollments.userId, userId))
    .limit(1);
  return row ?? null;
}

function toDeveloperEnrollmentStatus(row: Awaited<ReturnType<typeof findDeveloperApiEnrollment>>) {
  const termsAccepted = row ? isCurrentDeveloperApiTermsAcceptance(row) : false;
  const sendScopeStatus = normalizeDeveloperSendScopeStatus(row?.sendScopeStatus);
  return {
    termsVersion: DEVELOPER_API_TERMS_VERSION,
    acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
    termsAccepted,
    termsAcceptedAt: row?.termsAcceptedAt ?? null,
    sendScopeStatus,
    sendScopeApproved: sendScopeStatus === "approved",
    businessUse: row?.businessName ? {
      businessName: row.businessName,
      websiteUrl: row.websiteUrl ?? "",
      useCase: row.useCase ?? "",
      expectedMonthlySendVolume: row.expectedMonthlySendVolume ?? 0,
      consentProcess: row.consentProcess ?? "",
    } : null,
    sendScopeRequestedAt: row?.sendScopeRequestedAt ?? null,
    sendScopeReviewedAt: row?.sendScopeReviewedAt ?? null,
    sendScopeReviewNote: row?.sendScopeReviewNote ?? null,
  };
}

export async function getDeveloperApiEnrollmentStatus(userId: number) {
  return toDeveloperEnrollmentStatus(await findDeveloperApiEnrollment(userId));
}

export async function acceptDeveloperApiTerms(params: {
  userId: number;
  acceptanceFingerprint: string;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = params.now ?? Date.now();
  await db
    .insert(developerApiEnrollments)
    .values({
      userId: params.userId,
      termsVersion: DEVELOPER_API_TERMS_VERSION,
      acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
      termsAcceptedAt: now,
      acceptanceFingerprint: params.acceptanceFingerprint,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        termsVersion: DEVELOPER_API_TERMS_VERSION,
        acceptableUseVersion: DEVELOPER_API_ACCEPTABLE_USE_VERSION,
        termsAcceptedAt: now,
        acceptanceFingerprint: params.acceptanceFingerprint,
        updatedAt: now,
      },
    });
  return getDeveloperApiEnrollmentStatus(params.userId);
}

export async function requestDeveloperSendScope(params: {
  userId: number;
  businessName: string;
  websiteUrl?: string | null;
  useCase: string;
  expectedMonthlySendVolume: number;
  consentProcess: string;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await findDeveloperApiEnrollment(params.userId);
  if (!existing || !isCurrentDeveloperApiTermsAcceptance(existing)) {
    throw new Error("Accept the current API Terms and Acceptable Use Policy before requesting sending access.");
  }

  const now = params.now ?? Date.now();
  const riskClass = classifyDeveloperSendScopeRequest(params.expectedMonthlySendVolume);
  const sendScopeStatus: DeveloperSendScopeStatus = riskClass === "standard" ? "approved" : "pending_review";
  const reviewNote = riskClass === "standard"
    ? "self_service_standard_volume"
    : "high_volume_manual_review_required";
  await db
    .insert(developerApiEnrollments)
    .values({
      userId: params.userId,
      termsVersion: existing.termsVersion,
      acceptableUseVersion: existing.acceptableUseVersion,
      termsAcceptedAt: existing.termsAcceptedAt,
      acceptanceFingerprint: existing.acceptanceFingerprint,
      businessName: params.businessName.trim(),
      websiteUrl: params.websiteUrl?.trim() || null,
      useCase: params.useCase.trim(),
      expectedMonthlySendVolume: params.expectedMonthlySendVolume,
      consentProcess: params.consentProcess.trim(),
      sendScopeStatus,
      sendScopeRequestedAt: now,
      sendScopeReviewedAt: sendScopeStatus === "approved" ? now : null,
      sendScopeReviewedByUserId: null,
      sendScopeReviewNote: reviewNote,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        businessName: params.businessName.trim(),
        websiteUrl: params.websiteUrl?.trim() || null,
        useCase: params.useCase.trim(),
        expectedMonthlySendVolume: params.expectedMonthlySendVolume,
        consentProcess: params.consentProcess.trim(),
        sendScopeStatus,
        sendScopeRequestedAt: now,
        sendScopeReviewedAt: sendScopeStatus === "approved" ? now : null,
        sendScopeReviewedByUserId: null,
        sendScopeReviewNote: reviewNote,
        updatedAt: now,
      },
    });
  return getDeveloperApiEnrollmentStatus(params.userId);
}

export async function reviewDeveloperSendScope(params: {
  userId: number;
  reviewerUserId: number;
  status: "approved" | "denied";
  note?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await findDeveloperApiEnrollment(params.userId);
  if (!existing?.sendScopeRequestedAt) throw new Error("Developer send-scope request not found.");
  const now = params.now ?? Date.now();
  await db
    .update(developerApiEnrollments)
    .set({
      sendScopeStatus: params.status,
      sendScopeReviewedAt: now,
      sendScopeReviewedByUserId: params.reviewerUserId,
      sendScopeReviewNote: params.note?.trim().slice(0, 500) || params.status,
      updatedAt: now,
    })
    .where(eq(developerApiEnrollments.userId, params.userId));
  return getDeveloperApiEnrollmentStatus(params.userId);
}

export async function assertDeveloperApiKeyScopesAllowed(userId: number, scopes: readonly DeveloperApiScope[]) {
  const status = await getDeveloperApiEnrollmentStatus(userId);
  if (!status.termsAccepted) {
    throw new Error("Accept the current API Terms and Acceptable Use Policy before creating or rotating an API key.");
  }
  if (scopes.includes("review_requests:send") && !status.sendScopeApproved) {
    throw new Error("Complete business-use enrollment before adding review_requests:send permission.");
  }
  return status;
}

export async function removeUnapprovedDeveloperSendScope(userId: number, scopes: readonly DeveloperApiScope[]) {
  if (!scopes.includes("review_requests:send")) return [...scopes];
  const status = await getDeveloperApiEnrollmentStatus(userId);
  return status.sendScopeApproved
    ? [...scopes]
    : scopes.filter((scope) => scope !== "review_requests:send");
}
