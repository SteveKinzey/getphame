import { count, eq } from "drizzle-orm";
import {
  accessCodeRedemptions,
  activityTrendExportPresets,
  apiAbuseLimitWindows,
  apiIdempotencyRecords,
  apiImportEvents,
  apiKeys,
  authSessions,
  authHealthHistoryPresets,
  bulkSenderCredentials,
  businessProfiles,
  churnSurveys,
  clientReviews,
  complimentaryAccessGrants,
  contactConsentEvidence,
  customerRequests,
  developerApiEnrollments,
  emailEvents,
  emailTemplates,
  emailTemplateRevisions,
  followUpReminders,
  gmailTokens,
  koalendarBookings,
  koalendarConnections,
  manualSearchEvents,
  notificationPrefs,
  outboundMailPreferences,
  outboundSendLimitWindows,
  pageEvents,
  profilePreferenceExportHistory,
  quietHoursQueuedSends,
  recoveryDrillAssignments,
  recoveryDrillParticipants,
  reviewPlatforms,
  savedContacts,
  securityPermissionOverrides,
  securityRoleGrants,
  smtpCredentials,
  smtpTestEmailAttempts,
  sourceAutomationEvents,
  sourceConnections,
  sourceHealthHistory,
  stripeSubscriptions,
  userIdentityAliases,
  users,
  webauthnCeremonies,
  webauthnCredentials,
  webhookConfigs,
  webhookDeliveryLogs,
  wooCredentials,
  wooCustomers,
  wooPendingImports,
  wooSyncLogs,
  wordpressPairings,
} from "../drizzle/schema";
import { getDb } from "./db";

export type AccountDeletionImpactCategory = {
  key: string;
  count: number;
};

const toCount = (rows: Array<{ total: number | string }>) =>
  Number(rows[0]?.total ?? 0);

/** Returns aggregate-only counts for the same tenant-scoped tables removed by deleteAccountOwnedData. */
export async function getAccountDeletionImpact(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [
    contacts,
    requests,
    emailActivity,
    reminders,
    templates,
    platforms,
    smtp,
    bulkMail,
    commerceCustomers,
    commerceConnections,
    commerceSync,
    calendarBookings,
    calendarConnections,
    subscriptions,
    accessRedemptions,
    gmail,
    mailPreferences,
    smtpDiagnostics,
    exportHistory,
    authSessionsCount,
    passkeys,
    ceremonies,
    searchHistory,
    aliases,
    activityPresets,
    authHealthPresets,
    notifications,
    consentEvidence,
    queue,
    templateRevisions,
    pendingCommerceImports,
    developerKeys,
    developerEnrollment,
    sourceConnectionData,
    sourceEvents,
    sourceHealth,
    wordpress,
    webhooks,
    webhookDeliveries,
    importEvents,
    idempotencyRecords,
    abuseWindows,
    sendLimitWindows,
    reviews,
    churn,
    pageActivity,
    securityRoles,
    securityOverrides,
    recoveryParticipants,
    recoveryAssignments,
    profile,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(savedContacts)
      .where(eq(savedContacts.userId, userId)),
    db
      .select({ total: count() })
      .from(customerRequests)
      .where(eq(customerRequests.userId, userId)),
    db
      .select({ total: count() })
      .from(emailEvents)
      .where(eq(emailEvents.userId, userId)),
    db
      .select({ total: count() })
      .from(followUpReminders)
      .where(eq(followUpReminders.userId, userId)),
    db
      .select({ total: count() })
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId)),
    db
      .select({ total: count() })
      .from(reviewPlatforms)
      .where(eq(reviewPlatforms.userId, userId)),
    db
      .select({ total: count() })
      .from(smtpCredentials)
      .where(eq(smtpCredentials.userId, userId)),
    db
      .select({ total: count() })
      .from(bulkSenderCredentials)
      .where(eq(bulkSenderCredentials.userId, userId)),
    db
      .select({ total: count() })
      .from(wooCustomers)
      .where(eq(wooCustomers.userId, userId)),
    db
      .select({ total: count() })
      .from(wooCredentials)
      .where(eq(wooCredentials.userId, userId)),
    db
      .select({ total: count() })
      .from(wooSyncLogs)
      .where(eq(wooSyncLogs.userId, userId)),
    db
      .select({ total: count() })
      .from(koalendarBookings)
      .where(eq(koalendarBookings.userId, userId)),
    db
      .select({ total: count() })
      .from(koalendarConnections)
      .where(eq(koalendarConnections.userId, userId)),
    db
      .select({ total: count() })
      .from(stripeSubscriptions)
      .where(eq(stripeSubscriptions.userId, userId)),
    db
      .select({ total: count() })
      .from(accessCodeRedemptions)
      .where(eq(accessCodeRedemptions.userId, userId)),
    db
      .select({ total: count() })
      .from(gmailTokens)
      .where(eq(gmailTokens.userId, userId)),
    db
      .select({ total: count() })
      .from(outboundMailPreferences)
      .where(eq(outboundMailPreferences.userId, userId)),
    db
      .select({ total: count() })
      .from(smtpTestEmailAttempts)
      .where(eq(smtpTestEmailAttempts.userId, userId)),
    db
      .select({ total: count() })
      .from(profilePreferenceExportHistory)
      .where(eq(profilePreferenceExportHistory.userId, userId)),
    db
      .select({ total: count() })
      .from(authSessions)
      .where(eq(authSessions.userId, userId)),
    db
      .select({ total: count() })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId)),
    db
      .select({ total: count() })
      .from(webauthnCeremonies)
      .where(eq(webauthnCeremonies.userId, userId)),
    db
      .select({ total: count() })
      .from(manualSearchEvents)
      .where(eq(manualSearchEvents.userId, userId)),
    db
      .select({ total: count() })
      .from(userIdentityAliases)
      .where(eq(userIdentityAliases.userId, userId)),
    db
      .select({ total: count() })
      .from(activityTrendExportPresets)
      .where(eq(activityTrendExportPresets.ownerUserId, userId)),
    db
      .select({ total: count() })
      .from(authHealthHistoryPresets)
      .where(eq(authHealthHistoryPresets.ownerUserId, userId)),
    db
      .select({ total: count() })
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, userId)),
    db
      .select({ total: count() })
      .from(contactConsentEvidence)
      .where(eq(contactConsentEvidence.userId, userId)),
    db
      .select({ total: count() })
      .from(quietHoursQueuedSends)
      .where(eq(quietHoursQueuedSends.userId, userId)),
    db
      .select({ total: count() })
      .from(emailTemplateRevisions)
      .where(eq(emailTemplateRevisions.userId, userId)),
    db
      .select({ total: count() })
      .from(wooPendingImports)
      .where(eq(wooPendingImports.userId, userId)),
    db
      .select({ total: count() })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId)),
    db
      .select({ total: count() })
      .from(developerApiEnrollments)
      .where(eq(developerApiEnrollments.userId, userId)),
    db
      .select({ total: count() })
      .from(sourceConnections)
      .where(eq(sourceConnections.userId, userId)),
    db
      .select({ total: count() })
      .from(sourceAutomationEvents)
      .where(eq(sourceAutomationEvents.userId, userId)),
    db
      .select({ total: count() })
      .from(sourceHealthHistory)
      .where(eq(sourceHealthHistory.userId, userId)),
    db
      .select({ total: count() })
      .from(wordpressPairings)
      .where(eq(wordpressPairings.userId, userId)),
    db
      .select({ total: count() })
      .from(webhookConfigs)
      .where(eq(webhookConfigs.userId, userId)),
    db
      .select({ total: count() })
      .from(webhookDeliveryLogs)
      .where(eq(webhookDeliveryLogs.userId, userId)),
    db
      .select({ total: count() })
      .from(apiImportEvents)
      .where(eq(apiImportEvents.userId, userId)),
    db
      .select({ total: count() })
      .from(apiIdempotencyRecords)
      .where(eq(apiIdempotencyRecords.userId, userId)),
    db
      .select({ total: count() })
      .from(apiAbuseLimitWindows)
      .where(eq(apiAbuseLimitWindows.userId, userId)),
    db
      .select({ total: count() })
      .from(outboundSendLimitWindows)
      .where(eq(outboundSendLimitWindows.userId, userId)),
    db
      .select({ total: count() })
      .from(clientReviews)
      .where(eq(clientReviews.userId, userId)),
    db
      .select({ total: count() })
      .from(churnSurveys)
      .where(eq(churnSurveys.userId, userId)),
    db
      .select({ total: count() })
      .from(pageEvents)
      .where(eq(pageEvents.userId, userId)),
    db
      .select({ total: count() })
      .from(securityRoleGrants)
      .where(eq(securityRoleGrants.userId, userId)),
    db
      .select({ total: count() })
      .from(securityPermissionOverrides)
      .where(eq(securityPermissionOverrides.userId, userId)),
    db
      .select({ total: count() })
      .from(recoveryDrillParticipants)
      .where(eq(recoveryDrillParticipants.userId, userId)),
    db
      .select({ total: count() })
      .from(recoveryDrillAssignments)
      .where(eq(recoveryDrillAssignments.userId, userId)),
    db
      .select({ total: count() })
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, userId)),
  ]);

  const categories: AccountDeletionImpactCategory[] = [
    { key: "account", count: 1 + toCount(aliases) },
    {
      key: "profile",
      count:
        toCount(profile) +
        toCount(activityPresets) +
        toCount(authHealthPresets) +
        toCount(notifications),
    },
    { key: "contacts", count: toCount(contacts) + toCount(consentEvidence) },
    {
      key: "requests",
      count: toCount(requests) + toCount(queue) + toCount(sourceEvents),
    },
    { key: "emailActivity", count: toCount(emailActivity) },
    { key: "reminders", count: toCount(reminders) },
    {
      key: "templates",
      count: toCount(templates) + toCount(templateRevisions),
    },
    { key: "platforms", count: toCount(platforms) },
    {
      key: "mailConnections",
      count: toCount(smtp) + toCount(bulkMail) + toCount(mailPreferences),
    },
    { key: "mailDiagnostics", count: toCount(smtpDiagnostics) },
    {
      key: "commerce",
      count:
        toCount(commerceCustomers) +
        toCount(commerceConnections) +
        toCount(commerceSync) +
        toCount(pendingCommerceImports),
    },
    {
      key: "calendar",
      count: toCount(calendarBookings) + toCount(calendarConnections),
    },
    {
      key: "access",
      count: toCount(subscriptions) + toCount(accessRedemptions),
    },
    { key: "gmail", count: toCount(gmail) },
    { key: "exportHistory", count: toCount(exportHistory) },
    {
      key: "sessions",
      count:
        toCount(authSessionsCount) + toCount(passkeys) + toCount(ceremonies),
    },
    { key: "searchHistory", count: toCount(searchHistory) },
    {
      key: "developerConnections",
      count:
        toCount(developerKeys) +
        toCount(developerEnrollment) +
        toCount(sourceConnectionData) +
        toCount(sourceHealth) +
        toCount(wordpress) +
        toCount(webhooks) +
        toCount(webhookDeliveries) +
        toCount(importEvents) +
        toCount(idempotencyRecords) +
        toCount(abuseWindows) +
        toCount(sendLimitWindows),
    },
    {
      key: "accountActivity",
      count: toCount(reviews) + toCount(churn) + toCount(pageActivity),
    },
    {
      key: "securitySettings",
      count:
        toCount(securityRoles) +
        toCount(securityOverrides) +
        toCount(recoveryParticipants) +
        toCount(recoveryAssignments),
    },
  ].filter(category => category.count > 0);

  return {
    categories,
    totalRecords: categories.reduce(
      (total, category) => total + category.count,
      0
    ),
    calculatedAt: Date.now(),
  };
}

/** Deletes the tenant-scoped tables surfaced by getAccountDeletionImpact before the user row is deleted. */
export async function deleteAccountOwnedData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(recoveryDrillAssignments)
    .where(eq(recoveryDrillAssignments.userId, userId));
  await db
    .delete(recoveryDrillParticipants)
    .where(eq(recoveryDrillParticipants.userId, userId));
  await db
    .delete(securityPermissionOverrides)
    .where(eq(securityPermissionOverrides.userId, userId));
  await db
    .delete(securityRoleGrants)
    .where(eq(securityRoleGrants.userId, userId));
  await db
    .delete(webhookDeliveryLogs)
    .where(eq(webhookDeliveryLogs.userId, userId));
  await db.delete(webhookConfigs).where(eq(webhookConfigs.userId, userId));
  await db
    .delete(wordpressPairings)
    .where(eq(wordpressPairings.userId, userId));
  await db
    .delete(sourceHealthHistory)
    .where(eq(sourceHealthHistory.userId, userId));
  await db
    .delete(sourceAutomationEvents)
    .where(eq(sourceAutomationEvents.userId, userId));
  await db
    .delete(sourceConnections)
    .where(eq(sourceConnections.userId, userId));
  await db
    .delete(apiIdempotencyRecords)
    .where(eq(apiIdempotencyRecords.userId, userId));
  await db.delete(apiImportEvents).where(eq(apiImportEvents.userId, userId));
  await db
    .delete(apiAbuseLimitWindows)
    .where(eq(apiAbuseLimitWindows.userId, userId));
  await db
    .delete(outboundSendLimitWindows)
    .where(eq(outboundSendLimitWindows.userId, userId));
  await db
    .delete(developerApiEnrollments)
    .where(eq(developerApiEnrollments.userId, userId));
  await db.delete(apiKeys).where(eq(apiKeys.userId, userId));
  await db
    .delete(quietHoursQueuedSends)
    .where(eq(quietHoursQueuedSends.userId, userId));
  await db
    .delete(contactConsentEvidence)
    .where(eq(contactConsentEvidence.userId, userId));
  await db
    .delete(emailTemplateRevisions)
    .where(eq(emailTemplateRevisions.userId, userId));
  await db.delete(emailEvents).where(eq(emailEvents.userId, userId));
  await db
    .delete(koalendarBookings)
    .where(eq(koalendarBookings.userId, userId));
  await db
    .delete(koalendarConnections)
    .where(eq(koalendarConnections.userId, userId));
  await db
    .delete(followUpReminders)
    .where(eq(followUpReminders.userId, userId));
  await db.delete(customerRequests).where(eq(customerRequests.userId, userId));
  await db.delete(savedContacts).where(eq(savedContacts.userId, userId));
  await db.delete(emailTemplates).where(eq(emailTemplates.userId, userId));
  await db.delete(reviewPlatforms).where(eq(reviewPlatforms.userId, userId));
  await db
    .delete(smtpTestEmailAttempts)
    .where(eq(smtpTestEmailAttempts.userId, userId));
  await db.delete(smtpCredentials).where(eq(smtpCredentials.userId, userId));
  await db
    .delete(bulkSenderCredentials)
    .where(eq(bulkSenderCredentials.userId, userId));
  await db
    .delete(outboundMailPreferences)
    .where(eq(outboundMailPreferences.userId, userId));
  await db.delete(wooSyncLogs).where(eq(wooSyncLogs.userId, userId));
  await db
    .delete(wooPendingImports)
    .where(eq(wooPendingImports.userId, userId));
  await db.delete(wooCustomers).where(eq(wooCustomers.userId, userId));
  await db.delete(wooCredentials).where(eq(wooCredentials.userId, userId));
  await db
    .delete(accessCodeRedemptions)
    .where(eq(accessCodeRedemptions.userId, userId));
  await db
    .delete(stripeSubscriptions)
    .where(eq(stripeSubscriptions.userId, userId));
  await db
    .delete(complimentaryAccessGrants)
    .where(eq(complimentaryAccessGrants.userId, userId));
  await db.delete(gmailTokens).where(eq(gmailTokens.userId, userId));
  await db.delete(clientReviews).where(eq(clientReviews.userId, userId));
  await db.delete(churnSurveys).where(eq(churnSurveys.userId, userId));
  await db.delete(pageEvents).where(eq(pageEvents.userId, userId));
  await db
    .delete(manualSearchEvents)
    .where(eq(manualSearchEvents.userId, userId));
  await db
    .delete(notificationPrefs)
    .where(eq(notificationPrefs.userId, userId));
  await db
    .delete(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, userId));
  await db
    .delete(authHealthHistoryPresets)
    .where(eq(authHealthHistoryPresets.ownerUserId, userId));
  await db
    .delete(webauthnCeremonies)
    .where(eq(webauthnCeremonies.userId, userId));
  await db
    .delete(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId));
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
  await db
    .delete(profilePreferenceExportHistory)
    .where(eq(profilePreferenceExportHistory.userId, userId));
  await db
    .delete(userIdentityAliases)
    .where(eq(userIdentityAliases.userId, userId));
  await db.delete(businessProfiles).where(eq(businessProfiles.userId, userId));
}
