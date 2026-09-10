import { TRPCError } from "@trpc/server";
import { and, eq, ne, or, sql } from "drizzle-orm";
import {
  accessCodeRedemptions,
  apiImportEvents,
  apiKeys,
  bulkSenderCredentials,
  businessProfiles,
  churnSurveys,
  clientReviews,
  customerRequests,
  emailEvents,
  emailTemplates,
  followUpReminders,
  gmailTokens,
  leads,
  magicLinks,
  magicLinkTokens,
  koalendarBookings,
  koalendarConnections,
  notificationPrefs,
  pageEvents,
  referrals,
  reviewPlatforms,
  savedContacts,
  smtpCredentials,
  stripeSubscriptions,
  userIdentityAliases,
  users,
  webhookConfigs,
  webhookDeliveryLogs,
  wooCredentials,
  wooCustomers,
  wooPendingImports,
  wooSyncLogs,
} from "../drizzle/schema";
import { getDb } from "./db";

const tierRank = { free: 0, pro: 1, annual: 2, lifetime: 3 } as const;
const normalizedTier = (tier: string): keyof typeof tierRank =>
  tier in tierRank ? (tier as keyof typeof tierRank) : "free";

type MergeProfileInput = {
  businessName: string;
  reviewLink: string;
  tier: string;
  planExpiresAt: number | null;
  monthlyCount: number;
  onboardingDismissed: number;
  reviewGoal: number;
  stripeCustomerId: string | null;
  fromName: string | null;
  replyTo: string | null;
};

type MergeUserInput = {
  role: string;
  name: string | null;
  email: string | null;
  defaultFromEmail: string | null;
  defaultFromName: string | null;
};

type SmtpConnectionForMerge = {
  verified: number;
};

export type SmtpMergeDecision = "source" | "target" | "conflict" | "none";

export function chooseSmtpMergeWinner(
  source: SmtpConnectionForMerge | undefined,
  target: SmtpConnectionForMerge | undefined
): SmtpMergeDecision {
  if (!source && !target) return "none";
  if (source && !target) return "source";
  if (!source && target) return "target";
  if (source!.verified === 1 && target!.verified !== 1) return "source";
  if (source!.verified !== 1 && target!.verified === 1) return "target";
  return "conflict";
}

export function buildMergedProfileValues(
  source: MergeProfileInput,
  target: MergeProfileInput
) {
  const sourceTier = normalizedTier(source.tier);
  const targetTier = normalizedTier(target.tier);
  const strongerTier =
    tierRank[sourceTier] > tierRank[targetTier] ? sourceTier : targetTier;

  return {
    businessName: target.businessName || source.businessName,
    reviewLink: target.reviewLink || source.reviewLink,
    tier: strongerTier,
    planExpiresAt:
      strongerTier === "lifetime"
        ? null
        : Math.max(source.planExpiresAt ?? 0, target.planExpiresAt ?? 0) ||
          null,
    monthlyCount: target.monthlyCount + source.monthlyCount,
    onboardingDismissed: Math.max(
      target.onboardingDismissed,
      source.onboardingDismissed
    ),
    reviewGoal: Math.max(target.reviewGoal, source.reviewGoal),
    stripeCustomerId: target.stripeCustomerId ?? source.stripeCustomerId,
    fromName: target.fromName ?? source.fromName,
    replyTo: target.replyTo ?? source.replyTo,
  };
}

export function buildMergedUserValues(
  source: MergeUserInput,
  target: MergeUserInput
) {
  return {
    role:
      source.role === "admin" || target.role === "admin"
        ? ("admin" as const)
        : ("user" as const),
    name: target.name ?? source.name,
    email: target.email ?? source.email,
    defaultFromEmail: target.defaultFromEmail ?? source.defaultFromEmail,
    defaultFromName: target.defaultFromName ?? source.defaultFromName,
  };
}

async function deleteOwnedData(tx: any, userId: number, email: string | null) {
  await tx
    .delete(userIdentityAliases)
    .where(eq(userIdentityAliases.userId, userId));
  await tx
    .delete(webhookDeliveryLogs)
    .where(eq(webhookDeliveryLogs.userId, userId));
  await tx.delete(apiImportEvents).where(eq(apiImportEvents.userId, userId));
  await tx.delete(emailEvents).where(eq(emailEvents.userId, userId));
  await tx
    .delete(koalendarBookings)
    .where(eq(koalendarBookings.userId, userId));
  await tx
    .delete(koalendarConnections)
    .where(eq(koalendarConnections.userId, userId));
  await tx
    .delete(followUpReminders)
    .where(eq(followUpReminders.userId, userId));
  await tx.delete(clientReviews).where(eq(clientReviews.userId, userId));
  await tx.delete(customerRequests).where(eq(customerRequests.userId, userId));
  await tx.delete(savedContacts).where(eq(savedContacts.userId, userId));
  await tx.delete(emailTemplates).where(eq(emailTemplates.userId, userId));
  await tx.delete(reviewPlatforms).where(eq(reviewPlatforms.userId, userId));
  await tx
    .delete(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));
  await tx.delete(wooSyncLogs).where(eq(wooSyncLogs.userId, userId));
  await tx.delete(wooCustomers).where(eq(wooCustomers.userId, userId));
  await tx.delete(webhookConfigs).where(eq(webhookConfigs.userId, userId));
  await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
  await tx.delete(pageEvents).where(eq(pageEvents.userId, userId));
  await tx.delete(churnSurveys).where(eq(churnSurveys.userId, userId));
  await tx
    .delete(referrals)
    .where(
      or(
        eq(referrals.referrerUserId, userId),
        eq(referrals.referredUserId, userId)
      )
    );
  await tx
    .delete(accessCodeRedemptions)
    .where(eq(accessCodeRedemptions.userId, userId));
  await tx
    .delete(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId));
  await tx
    .delete(bulkSenderCredentials)
    .where(eq(bulkSenderCredentials.userId, userId));
  await tx
    .delete(stripeSubscriptions)
    .where(eq(stripeSubscriptions.userId, userId));
  await tx.delete(smtpCredentials).where(eq(smtpCredentials.userId, userId));
  await tx.delete(wooCredentials).where(eq(wooCredentials.userId, userId));
  await tx.delete(gmailTokens).where(eq(gmailTokens.userId, userId));
  await tx.delete(businessProfiles).where(eq(businessProfiles.userId, userId));
  if (email) {
    const normalized = email.trim().toLowerCase();
    await tx
      .delete(magicLinkTokens)
      .where(eq(magicLinkTokens.email, normalized));
    await tx.delete(magicLinks).where(eq(magicLinks.email, normalized));
    await tx.delete(leads).where(eq(leads.email, normalized));
  }
}

export async function deleteAccountAsAdmin(
  actorId: number,
  targetUserId: number
) {
  if (actorId === targetUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You cannot delete your own administrator account.",
    });
  }
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  return db.transaction(async tx => {
    const [target] = await tx
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target)
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

    if (target.role === "admin") {
      const [row] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "admin"));
      if (Number(row?.count ?? 0) <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The final administrator account cannot be deleted.",
        });
      }
    }

    await deleteOwnedData(tx, target.id, target.email);
    await tx.delete(users).where(eq(users.id, target.id));
    return { id: target.id, name: target.name, email: target.email };
  });
}

async function assertNoSingletonConflict(
  tx: any,
  table: any,
  sourceId: number,
  targetId: number,
  label: string
) {
  const rows = await tx
    .select({ userId: table.userId })
    .from(table)
    .where(or(eq(table.userId, sourceId), eq(table.userId, targetId)));
  const owners = new Set(rows.map((row: { userId: number }) => row.userId));
  if (owners.has(sourceId) && owners.has(targetId)) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `Both accounts have ${label}. Disconnect or remove one before combining them.`,
    });
  }
}

async function resolveSmtpConflict(
  tx: any,
  sourceId: number,
  targetId: number
) {
  const rows = await tx
    .select({
      id: smtpCredentials.id,
      userId: smtpCredentials.userId,
      verified: smtpCredentials.verified,
    })
    .from(smtpCredentials)
    .where(
      or(
        eq(smtpCredentials.userId, sourceId),
        eq(smtpCredentials.userId, targetId)
      )
    );
  const source = rows.find(
    (row: { userId: number }) => row.userId === sourceId
  );
  const target = rows.find(
    (row: { userId: number }) => row.userId === targetId
  );
  const winner = chooseSmtpMergeWinner(source, target);

  if (winner === "conflict") {
    const bothVerified = source?.verified === 1 && target?.verified === 1;
    throw new TRPCError({
      code: "CONFLICT",
      message: bothVerified
        ? "Both accounts have verified SMTP connections. Disconnect one before combining them."
        : "Both accounts have unverified SMTP connections. Disconnect one or verify the connection you want to keep before combining them.",
    });
  }

  if (source && target) {
    const losingId = winner === "source" ? target.id : source.id;
    await tx.delete(smtpCredentials).where(eq(smtpCredentials.id, losingId));
  }
}

export async function combineAccountsAsAdmin(
  actorId: number,
  sourceUserId: number,
  targetUserId: number
) {
  if (sourceUserId === targetUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose two different accounts.",
    });
  }
  if (actorId === sourceUserId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Your signed-in administrator account must be the account that remains.",
    });
  }
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "DB unavailable",
    });

  return db.transaction(async tx => {
    const accounts = await tx
      .select()
      .from(users)
      .where(or(eq(users.id, sourceUserId), eq(users.id, targetUserId)));
    const source = accounts.find(account => account.id === sourceUserId);
    const target = accounts.find(account => account.id === targetUserId);
    if (!source || !target)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "One or both accounts no longer exist.",
      });

    await assertNoSingletonConflict(
      tx,
      gmailTokens,
      sourceUserId,
      targetUserId,
      "Gmail connections"
    );
    await resolveSmtpConflict(tx, sourceUserId, targetUserId);
    await assertNoSingletonConflict(
      tx,
      wooCredentials,
      sourceUserId,
      targetUserId,
      "WooCommerce connections"
    );
    await assertNoSingletonConflict(
      tx,
      koalendarConnections,
      sourceUserId,
      targetUserId,
      "Koalendar connections"
    );
    await assertNoSingletonConflict(
      tx,
      bulkSenderCredentials,
      sourceUserId,
      targetUserId,
      "bulk-sender connections"
    );
    await assertNoSingletonConflict(
      tx,
      stripeSubscriptions,
      sourceUserId,
      targetUserId,
      "active Stripe subscriptions"
    );

    const profiles = await tx
      .select()
      .from(businessProfiles)
      .where(
        or(
          eq(businessProfiles.userId, sourceUserId),
          eq(businessProfiles.userId, targetUserId)
        )
      );
    const sourceProfile = profiles.find(
      profile => profile.userId === sourceUserId
    );
    const targetProfile = profiles.find(
      profile => profile.userId === targetUserId
    );
    if (
      sourceProfile?.stripeCustomerId &&
      targetProfile?.stripeCustomerId &&
      sourceProfile.stripeCustomerId !== targetProfile.stripeCustomerId
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Both accounts are linked to different Stripe customers. Resolve billing ownership before combining them.",
      });
    }

    if (sourceProfile && targetProfile) {
      await tx
        .update(businessProfiles)
        .set({
          ...buildMergedProfileValues(sourceProfile, targetProfile),
          updatedAt: new Date(),
        })
        .where(eq(businessProfiles.userId, targetUserId));
      await tx
        .delete(businessProfiles)
        .where(eq(businessProfiles.userId, sourceUserId));
    } else if (sourceProfile) {
      await tx
        .update(businessProfiles)
        .set({ userId: targetUserId, updatedAt: new Date() })
        .where(eq(businessProfiles.userId, sourceUserId));
    }

    // Transfer all many-per-user records. Their primary keys remain unchanged, so
    // request/template/webhook relationships remain intact.
    await tx
      .update(customerRequests)
      .set({ userId: targetUserId })
      .where(eq(customerRequests.userId, sourceUserId));
    await tx
      .update(savedContacts)
      .set({ userId: targetUserId })
      .where(eq(savedContacts.userId, sourceUserId));
    await tx
      .update(emailTemplates)
      .set({ userId: targetUserId })
      .where(eq(emailTemplates.userId, sourceUserId));
    await tx
      .update(reviewPlatforms)
      .set({ userId: targetUserId })
      .where(eq(reviewPlatforms.userId, sourceUserId));
    await tx
      .update(followUpReminders)
      .set({ userId: targetUserId })
      .where(eq(followUpReminders.userId, sourceUserId));
    await tx
      .update(emailEvents)
      .set({ userId: targetUserId })
      .where(eq(emailEvents.userId, sourceUserId));
    await tx
      .update(wooCustomers)
      .set({ userId: targetUserId })
      .where(eq(wooCustomers.userId, sourceUserId));
    await tx
      .update(wooSyncLogs)
      .set({ userId: targetUserId })
      .where(eq(wooSyncLogs.userId, sourceUserId));
    await tx
      .update(wooPendingImports)
      .set({ userId: targetUserId })
      .where(eq(wooPendingImports.userId, sourceUserId));
    await tx
      .update(apiKeys)
      .set({ userId: targetUserId })
      .where(eq(apiKeys.userId, sourceUserId));
    await tx
      .update(apiImportEvents)
      .set({ userId: targetUserId })
      .where(eq(apiImportEvents.userId, sourceUserId));
    await tx
      .update(webhookConfigs)
      .set({ userId: targetUserId })
      .where(eq(webhookConfigs.userId, sourceUserId));
    await tx
      .update(webhookDeliveryLogs)
      .set({ userId: targetUserId })
      .where(eq(webhookDeliveryLogs.userId, sourceUserId));
    await tx
      .update(clientReviews)
      .set({ userId: targetUserId })
      .where(eq(clientReviews.userId, sourceUserId));
    await tx
      .update(churnSurveys)
      .set({ userId: targetUserId })
      .where(eq(churnSurveys.userId, sourceUserId));
    await tx
      .update(pageEvents)
      .set({ userId: targetUserId })
      .where(eq(pageEvents.userId, sourceUserId));
    await tx
      .update(koalendarBookings)
      .set({ userId: targetUserId })
      .where(eq(koalendarBookings.userId, sourceUserId));

    // Move singleton records after conflict checks. Non-sensitive preference and
    // redemption duplicates keep the survivor's record.
    await tx
      .update(gmailTokens)
      .set({ userId: targetUserId })
      .where(eq(gmailTokens.userId, sourceUserId));
    await tx
      .update(smtpCredentials)
      .set({ userId: targetUserId })
      .where(eq(smtpCredentials.userId, sourceUserId));
    await tx
      .update(wooCredentials)
      .set({ userId: targetUserId })
      .where(eq(wooCredentials.userId, sourceUserId));
    await tx
      .update(koalendarConnections)
      .set({ userId: targetUserId })
      .where(eq(koalendarConnections.userId, sourceUserId));
    await tx
      .update(bulkSenderCredentials)
      .set({ userId: targetUserId })
      .where(eq(bulkSenderCredentials.userId, sourceUserId));
    await tx
      .update(stripeSubscriptions)
      .set({ userId: targetUserId })
      .where(eq(stripeSubscriptions.userId, sourceUserId));

    const targetPrefs = await tx
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, targetUserId))
      .limit(1);
    if (targetPrefs.length)
      await tx
        .delete(notificationPrefs)
        .where(eq(notificationPrefs.userId, sourceUserId));
    else
      await tx
        .update(notificationPrefs)
        .set({ userId: targetUserId })
        .where(eq(notificationPrefs.userId, sourceUserId));

    const targetRedemption = await tx
      .select()
      .from(accessCodeRedemptions)
      .where(eq(accessCodeRedemptions.userId, targetUserId))
      .limit(1);
    if (targetRedemption.length)
      await tx
        .delete(accessCodeRedemptions)
        .where(eq(accessCodeRedemptions.userId, sourceUserId));
    else
      await tx
        .update(accessCodeRedemptions)
        .set({ userId: targetUserId })
        .where(eq(accessCodeRedemptions.userId, sourceUserId));

    // Prevent a source↔target referral from becoming a self-referral, then retain
    // all other referral history under the surviving account.
    await tx
      .delete(referrals)
      .where(
        and(
          or(
            eq(referrals.referrerUserId, sourceUserId),
            eq(referrals.referrerUserId, targetUserId)
          ),
          or(
            eq(referrals.referredUserId, sourceUserId),
            eq(referrals.referredUserId, targetUserId)
          )
        )
      );
    const targetReferral = await tx
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, targetUserId))
      .limit(1);
    if (targetReferral.length)
      await tx
        .delete(referrals)
        .where(eq(referrals.referredUserId, sourceUserId));
    else
      await tx
        .update(referrals)
        .set({ referredUserId: targetUserId })
        .where(eq(referrals.referredUserId, sourceUserId));
    await tx
      .update(referrals)
      .set({ referrerUserId: targetUserId })
      .where(eq(referrals.referrerUserId, sourceUserId));

    await tx
      .update(users)
      .set({
        ...buildMergedUserValues(source, target),
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    await tx
      .update(userIdentityAliases)
      .set({ userId: targetUserId })
      .where(eq(userIdentityAliases.userId, sourceUserId));
    await tx
      .insert(userIdentityAliases)
      .values({
        userId: targetUserId,
        openId: source.openId,
        loginMethod: source.loginMethod,
      })
      .onDuplicateKeyUpdate({
        set: { userId: targetUserId, loginMethod: source.loginMethod },
      });

    await tx.delete(users).where(eq(users.id, sourceUserId));
    return {
      source: { id: source.id, name: source.name, email: source.email },
      target: {
        id: target.id,
        name: target.name ?? source.name,
        email: target.email ?? source.email,
      },
    };
  });
}
