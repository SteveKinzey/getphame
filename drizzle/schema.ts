import { bigint, boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

// Keep the existing schema declarations readable while targeting the managed TiDB/MySQL database.
const integer = int;
const serial = (name: string) => int(name).autoincrement();
const pgTable = mysqlTable;
const pgEnum = <T extends [string, ...string[]]>(_typeName: string, values: T) =>
  (columnName: string) => mysqlEnum(columnName, values);

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const tierEnum = pgEnum("tier", ["free", "pro", "annual", "lifetime"]);
export const methodEnum = pgEnum("method", ["email", "sms", "both"]);
export const requestStatusEnum = pgEnum("request_status", ["sent", "pending", "followed_up"]);
export const contactSourceEnum = pgEnum("contact_source", ["manual", "woocommerce", "stripe", "koalendar"]);
export const reminderStatusEnum = pgEnum("reminder_status", ["pending", "sent", "cancelled"]);
export const platformEnum = pgEnum("platform", ["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]);
export const emailEventTypeEnum = pgEnum("email_event_type", ["open", "click"]);
export const churnReasonEnum = pgEnum("churn_reason", ["too_expensive", "not_using", "switching_tools", "missing_feature", "other"]);
export const healthStatusEnum = pgEnum("health_status", ["ok", "fail"]);
export const bulkProviderEnum = pgEnum("bulk_provider", ["sendgrid", "mailgun", "postmark"]);
export const mailgunRegionEnum = pgEnum("mailgun_region", ["us", "eu"]);
export const authDiagnosticEventTypeEnum = pgEnum("auth_diagnostic_event_type", [
  "request_received",
  "token_created",
  "provider_accepted",
  "provider_failed",
  "verification_succeeded",
  "verification_failed",
]);
export const authHealthTriggerEnum = pgEnum("auth_health_trigger", ["scheduled", "manual"]);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  // Auth additions
  passwordHash: text("password_hash"),
  defaultFromEmail: text("default_from_email"),
  defaultFromName: text("default_from_name"),
  avatarKey: text("avatar_key"),
  avatarMimeType: varchar("avatar_mime_type", { length: 64 }),
  avatarUpdatedAt: timestamp("avatar_updated_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Additional OAuth identities retained when duplicate user accounts are combined. */
export const userIdentityAliases = pgTable("user_identity_aliases", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("user_identity_alias_user_idx").on(table.userId),
]);

export type UserIdentityAlias = typeof userIdentityAliases.$inferSelect;
export type InsertUserIdentityAlias = typeof userIdentityAliases.$inferInsert;

/** Magic link tokens for passwordless email login */
export const magicLinks = pgTable("magic_links", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MagicLink = typeof magicLinks.$inferSelect;
export type InsertMagicLink = typeof magicLinks.$inferInsert;

/**
 * Privacy-bounded magic-link lifecycle diagnostics. Full recipients and raw
 * tokens are deliberately excluded; fingerprints are one-way HMAC values.
 */
export const authDiagnosticEvents = pgTable("auth_diagnostic_events", {
  id: serial("id").primaryKey(),
  requestId: varchar("request_id", { length: 64 }).notNull(),
  eventType: authDiagnosticEventTypeEnum("event_type").notNull(),
  outcome: healthStatusEnum("outcome").notNull(),
  emailFingerprint: varchar("email_fingerprint", { length: 64 }),
  emailMasked: varchar("email_masked", { length: 320 }),
  tokenFingerprint: varchar("token_fingerprint", { length: 64 }),
  providerMessageId: varchar("provider_message_id", { length: 128 }),
  detailCode: varchar("detail_code", { length: 64 }),
  detailMessage: varchar("detail_message", { length: 500 }),
  durationMs: integer("duration_ms"),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
}, (table) => [
  index("auth_diag_request_idx").on(table.requestId),
  index("auth_diag_email_idx").on(table.emailFingerprint),
  index("auth_diag_occurred_idx").on(table.occurredAt),
]);

export type AuthDiagnosticEvent = typeof authDiagnosticEvents.$inferSelect;
export type InsertAuthDiagnosticEvent = typeof authDiagnosticEvents.$inferInsert;

/** Results from deterministic, non-destructive production authentication checks. */
export const authHealthChecks = pgTable("auth_health_checks", {
  id: serial("id").primaryKey(),
  triggerSource: authHealthTriggerEnum("trigger_source").notNull(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  overallStatus: healthStatusEnum("overall_status").notNull(),
  configStatus: healthStatusEnum("config_status").notNull(),
  databaseStatus: healthStatusEnum("database_status").notNull(),
  userSchemaStatus: healthStatusEnum("user_schema_status").notNull(),
  magicLinkSchemaStatus: healthStatusEnum("magic_link_schema_status").notNull(),
  sessionStatus: healthStatusEnum("session_status").notNull(),
  emailProviderStatus: healthStatusEnum("email_provider_status").notNull(),
  providerName: varchar("provider_name", { length: 64 }),
  failureCode: varchar("failure_code", { length: 64 }),
  failureDetail: varchar("failure_detail", { length: 500 }),
  durationMs: integer("duration_ms").notNull(),
  checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
}, (table) => [
  index("auth_health_checked_idx").on(table.checkedAt),
  index("auth_health_task_uid_idx").on(table.scheduleCronTaskUid),
]);

export type AuthHealthCheck = typeof authHealthChecks.$inferSelect;
export type InsertAuthHealthCheck = typeof authHealthChecks.$inferInsert;

/** Privacy-safe fleet SMTP health aggregates captured by the managed scheduler. */
export const smtpHealthSnapshots = pgTable("smtp_health_snapshot", {
  id: serial("id").primaryKey(),
  triggerSource: authHealthTriggerEnum("trigger_source").notNull(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  totalAccounts: integer("total_accounts").notNull(),
  healthyAccounts: integer("healthy_accounts").notNull(),
  failedAccounts: integer("failed_accounts").notNull(),
  durationMs: integer("duration_ms").notNull(),
  checkedAt: bigint("checked_at", { mode: "number" }).notNull(),
}, (table) => [
  index("smtp_health_checked_idx").on(table.checkedAt),
  index("smtp_health_task_uid_idx").on(table.scheduleCronTaskUid),
]);

export type SmtpHealthSnapshot = typeof smtpHealthSnapshots.$inferSelect;
export type InsertSmtpHealthSnapshot = typeof smtpHealthSnapshots.$inferInsert;

/** Stores Gmail OAuth tokens for each business owner */
export const gmailTokens = pgTable("gmail_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms
  gmailEmail: varchar("gmailEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type GmailToken = typeof gmailTokens.$inferSelect;
export type InsertGmailToken = typeof gmailTokens.$inferInsert;

/** Business profile for each Phame user */
export const businessProfiles = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  reviewLink: text("reviewLink").notNull(),
  tier: tierEnum("tier").default("free").notNull(),
  planExpiresAt: bigint("planExpiresAt", { mode: "number" }), // Unix ms — null for lifetime, set for monthly/annual
  monthlyCount: integer("monthlyCount").default(0).notNull(),
  monthlyResetDate: varchar("monthlyResetDate", { length: 7 }).notNull(), // "YYYY-MM"
  // Stripe customer ID — stored for creating checkout sessions and portal links
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // Email sender display name — shown as "From: <name>" in outgoing review request emails
  fromName: varchar("fromName", { length: 255 }),
  // Reply-To address — if set, replies go here instead of the connected email address
  replyTo: varchar("replyTo", { length: 320 }),
  // Onboarding wizard dismissed flag — 1 = user has dismissed or completed the wizard
  onboardingDismissed: integer("onboardingDismissed").default(0).notNull(),
  // Monthly review goal — number of responded requests the user aims to reach each month
  reviewGoal: integer("reviewGoal").default(0).notNull(),
  // Last time Stripe customers were synced into saved_contacts (Unix ms)
  stripeLastSyncedAt: bigint("stripeLastSyncedAt", { mode: "number" }),
  // Max emails to send per day during bulk sends (default 50, max 500)
  dailySendLimit: integer("dailySendLimit").default(50).notNull(),
  // Follow-up reminder settings — 1 = enabled (default), 0 = disabled
  followUpEnabled: integer("followUpEnabled").default(1).notNull(),
  // Stage-specific follow-up switches — enabled by default for backward compatibility
  followUpFirstEnabled: integer("followUpFirstEnabled").default(1).notNull(),
  followUpSecondEnabled: integer("followUpSecondEnabled").default(1).notNull(),
  // Days after initial send before step-1 follow-up (default 3, range 1-14)
  followUpDelayDays: integer("followUpDelayDays").default(3).notNull(),
  // Days after step-1 before the step-2 follow-up (default 7, range 1-14)
  followUpSecondDelayDays: integer("followUpSecondDelayDays").default(7).notNull(),
  // Re-engagement email — 1 = enabled (default), 0 = disabled
  reEngagementEnabled: integer("reEngagementEnabled").default(1).notNull(),
  // Referral code — unique 8-char code used to generate share links (getphame.app?ref=CODE)
  referralCode: varchar("referralCode", { length: 32 }),
  // Inactive user re-engagement email — Unix ms when sent (null = not yet sent)
  inactiveEmailSentAt: bigint("inactiveEmailSentAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

/** Each review request sent by a business owner to their customer */
export const customerRequests = pgTable("customer_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 30 }),
  method: methodEnum("method").notNull(),
  status: requestStatusEnum("status").default("sent").notNull(),
  respondedAt: bigint("respondedAt", { mode: "number" }), // Unix ms when customer left a review (null = not yet)
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  followUpAt: timestamp("followUpAt"),
  platformId: integer("platformId"), // FK to review_platforms.id — which platform was linked in this request
  emailSubject: varchar("emailSubject", { length: 500 }), // Subject line of the sent email
  emailBody: text("emailBody"), // HTML body of the sent email (stored for client detail view)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CustomerRequest = typeof customerRequests.$inferSelect;
export type InsertCustomerRequest = typeof customerRequests.$inferInsert;

/**
 * Tracks active Stripe subscriptions.
 * We store only the Stripe IDs — all other data (amount, status, period)
 * is fetched from Stripe API on demand or updated via webhooks.
 */
export const stripeSubscriptions = pgTable("stripe_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(), // one active sub per user
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // active, canceled, past_due, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
export type InsertStripeSubscription = typeof stripeSubscriptions.$inferInsert;

/** WooCommerce store credentials per user */
export const wooCredentials = pgTable("woo_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  storeUrl: varchar("storeUrl", { length: 512 }).notNull(),
  consumerKey: text("consumerKey").notNull(),
  consumerSecret: text("consumerSecret").notNull(),
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }), // Unix ms
  lastSyncCount: integer("lastSyncCount").default(0), // number of orders staged in the last sync
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type WooCredentials = typeof wooCredentials.$inferSelect;
export type InsertWooCredentials = typeof wooCredentials.$inferInsert;

/** Customers imported from WooCommerce orders */
export const wooCustomers = pgTable("woo_customers", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // Phame user (business owner)
  wooOrderId: varchar("wooOrderId", { length: 64 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  productName: varchar("productName", { length: 512 }),
  orderDate: bigint("orderDate", { mode: "number" }).notNull(), // Unix ms
  reviewRequestSentAt: bigint("reviewRequestSentAt", { mode: "number" }), // null = not yet sent
  lastStatusChangedAt: bigint("lastStatusChangedAt", { mode: "number" }), // Unix ms of last manual status change
  // Opt-out / unsubscribe tracking
  optedOut: integer("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WooCustomer = typeof wooCustomers.$inferSelect;
export type InsertWooCustomer = typeof wooCustomers.$inferInsert;

/** WooCommerce sync history log — one row per sync run */
export const wooSyncLogs = pgTable("woo_sync_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  syncedAt: bigint("syncedAt", { mode: "number" }).notNull(), // Unix ms
  daysWindow: integer("daysWindow").notNull().default(30),
  added: integer("added").notNull().default(0),
  total: integer("total").notNull().default(0),
  storeUrl: varchar("storeUrl", { length: 512 }),
});
export type WooSyncLog = typeof wooSyncLogs.$inferSelect;
export type InsertWooSyncLog = typeof wooSyncLogs.$inferInsert;

/** Saved contacts for repeat review request sending */
export const savedContacts = pgTable("saved_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  lastSentAt: bigint("lastSentAt", { mode: "number" }), // Unix ms of last review request
  totalSent: integer("totalSent").default(0).notNull(),
  tags: text("tags"), // JSON array of tag strings e.g. ["plumbing","new"]
  // Source tracking — where this contact came from
  source: contactSourceEnum("source").default("manual").notNull(),
  externalId: varchar("externalId", { length: 128 }), // Stripe customer ID or WooCommerce order ID for dedup
  // Opt-out / unsubscribe tracking
  optedOut: integer("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SavedContact = typeof savedContacts.$inferSelect;
export type InsertSavedContact = typeof savedContacts.$inferInsert;

/** Custom email templates per user */
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(), // Supports {{customer_name}}, {{business_name}}, {{review_link}}
  isDefault: integer("isDefault").default(0).notNull(), // 1 = default template for this user
  usageCount: integer("usageCount").default(0).notNull(), // incremented each time this template is used to send a request
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/** Follow-up reminders — scheduled follow-ups with immutable timing snapshots for reporting */
export const followUpReminders = pgTable("follow_up_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  customerRequestId: integer("customerRequestId").notNull(), // FK to customer_requests
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // Unix ms when to send
  sentAt: bigint("sentAt", { mode: "number" }), // null = not yet sent
  status: reminderStatusEnum("status").default("pending").notNull(),
  /** 1 = first follow-up, 2 = second follow-up */
  sequenceStep: integer("sequenceStep").default(1).notNull(),
  // Immutable configuration snapshot. Null identifies legacy rows excluded from timing reports.
  firstDelayDaysSnapshot: integer("firstDelayDaysSnapshot"),
  secondDelayDaysSnapshot: integer("secondDelayDaysSnapshot"),
  firstStageEnabledSnapshot: integer("firstStageEnabledSnapshot"),
  secondStageEnabledSnapshot: integer("secondStageEnabledSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpReminder = typeof followUpReminders.$inferSelect;
export type InsertFollowUpReminder = typeof followUpReminders.$inferInsert;

/**
 * Beta / promo access codes — created by the owner, redeemed by users for free Pro access.
 * Supports single-use, multi-use, and unlimited-use codes with optional expiry.
 */
export const accessCodes = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(), // the code users enter
  note: varchar("note", { length: 255 }), // internal label e.g. "Beta cohort Jan 2026"
  maxUses: integer("maxUses"), // null = unlimited
  usedCount: integer("usedCount").default(0).notNull(),
  active: integer("active").default(1).notNull(), // 1 = active, 0 = revoked
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms, null = never expires
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = typeof accessCodes.$inferInsert;

/** Records each time a user redeems an access code */
export const accessCodeRedemptions = pgTable("access_code_redemptions", {
  id: serial("id").primaryKey(),
  codeId: integer("codeId").notNull(),
  userId: integer("userId").notNull().unique(), // one redemption per user
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type AccessCodeRedemption = typeof accessCodeRedemptions.$inferSelect;
export type InsertAccessCodeRedemption = typeof accessCodeRedemptions.$inferInsert;

/**
 * Review platform URLs per user — Google, Yelp, TripAdvisor, Bing, Facebook, Other.
 * Each user can have multiple platforms; one is marked as default.
 * The URL is pasted by the business owner (public review page link).
 */
export const reviewPlatforms = pgTable("review_platforms", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  platform: platformEnum("platform").notNull(),
  label: varchar("label", { length: 255 }), // custom label for "Other" or override
  url: text("url").notNull(), // public review page URL
  isDefault: integer("isDefault").default(0).notNull(), // 1 = default platform for this user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ReviewPlatform = typeof reviewPlatforms.$inferSelect;
export type InsertReviewPlatform = typeof reviewPlatforms.$inferInsert;

/** SMTP credentials for each user — used to send review request emails from their own email account */
export const smtpCredentials = pgTable("smtp_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(587),
  secure: integer("secure").notNull().default(0), // 0 = STARTTLS (port 587), 1 = SSL (port 465)
  user: varchar("user", { length: 320 }).notNull(), // email address / SMTP username
  encryptedPass: text("encryptedPass").notNull(), // AES-256 encrypted password
  fromName: varchar("fromName", { length: 255 }), // display name in From header
  replyTo: varchar("replyTo", { length: 320 }), // optional reply-to override
  verified: integer("verified").notNull().default(0), // 1 = test send succeeded
  lastHealthCheck: bigint("lastHealthCheck", { mode: "number" }), // Unix ms of last automated health check
  lastHealthStatus: healthStatusEnum("lastHealthStatus"), // null = never checked
  lastHealthError: varchar("lastHealthError", { length: 500 }), // error message from last failed check (null = ok)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SmtpCredential = typeof smtpCredentials.$inferSelect;
export type InsertSmtpCredential = typeof smtpCredentials.$inferInsert;

/**
 * Durable snapshots of administrator-initiated SMTP removals. Identity fields
 * are intentionally denormalized so the audit trail survives account deletion.
 */
export const smtpAdminAuditLogs = pgTable("smtp_admin_audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").notNull(),
  actorName: varchar("actor_name", { length: 255 }),
  actorEmail: varchar("actor_email", { length: 320 }),
  targetUserId: integer("target_user_id").notNull(),
  targetName: varchar("target_name", { length: 255 }),
  targetEmail: varchar("target_email", { length: 320 }),
  smtpUser: varchar("smtp_user", { length: 320 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  outcome: varchar("outcome", { length: 32 }).notNull(),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
}, (table) => [
  index("smtp_admin_audit_occurred_idx").on(table.occurredAt),
  index("smtp_admin_audit_actor_idx").on(table.actorUserId),
  index("smtp_admin_audit_target_idx").on(table.targetUserId),
]);

export type SmtpAdminAuditLog = typeof smtpAdminAuditLogs.$inferSelect;
export type InsertSmtpAdminAuditLog = typeof smtpAdminAuditLogs.$inferInsert;

/**
 * Tracks email open and click events for review request emails.
 * Each row represents one open (pixel load) or one click (redirect through tracking link).
 * requestId links back to customer_requests; templateId is nullable (null = no template used).
 */
export const emailEvents = pgTable("email_events", {
  id: serial("id").primaryKey(),
  requestId: integer("requestId").notNull(),   // FK to customer_requests.id
  userId: integer("userId").notNull(),          // denormalised for fast per-user queries
  templateId: integer("templateId"),            // FK to email_templates.id (nullable)
  type: emailEventTypeEnum("type").notNull(),
  url: varchar("url", { length: 2048 }),    // destination URL (click events only)
  userAgent: varchar("userAgent", { length: 512 }),
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

/**
 * Churn survey responses — one row per cancellation.
 * Stored before the user is redirected to the Stripe cancel flow.
 */
export const churnSurveys = pgTable("churn_surveys", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),                          // null = anonymous / not logged in
  email: varchar("email", { length: 320 }),        // captured from query param if available
  reason: churnReasonEnum("reason").notNull(),
  comment: text("comment"),                        // optional free-text
  offerValidUntil: bigint("offerValidUntil", { mode: "number" }),  // UTC ms — STAY40 offer expires 7 days after survey
  reEngagementSentAt: bigint("reEngagementSentAt", { mode: "number" }), // UTC ms — when 2nd re-engagement email was sent
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }),       // hex token for one-click unsubscribe from re-engagement emails
  reEngagementOptedOut: integer("reEngagementOptedOut").notNull().default(0), // 1 = user clicked unsubscribe
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChurnSurvey = typeof churnSurveys.$inferSelect;
export type InsertChurnSurvey = typeof churnSurveys.$inferInsert;

/**
 * Page-level analytics events — lightweight UTM / referral tracking.
 * Used to measure powered-by footer upsell click-throughs.
 */
export const pageEvents = pgTable("page_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),                          // null = not logged in
  page: varchar("page", { length: 255 }).notNull(), // e.g. "/upgrade"
  utmSource: varchar("utmSource", { length: 128 }),
  utmMedium: varchar("utmMedium", { length: 128 }),
  utmCampaign: varchar("utmCampaign", { length: 128 }),
  referrer: varchar("referrer", { length: 2048 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PageEvent = typeof pageEvents.$inferSelect;
export type InsertPageEvent = typeof pageEvents.$inferInsert;

/**
 * API keys — per-user keys for the public REST API (e.g. contacts import from website forms).
 * The raw key is only shown once at creation time; only the SHA-256 hash is stored.
 */
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(), // SHA-256 hex of the raw key
  label: varchar("label", { length: 100 }).notNull().default("My API Key"),
  lastUsedAt: bigint("lastUsedAt", { mode: "number" }), // Unix ms
  revokedAt: bigint("revokedAt", { mode: "number" }), // Unix ms — null = active
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * API import events — log of each contact pushed via the public REST API.
 * Used to show the "Recent Imports" feed in the API Keys settings card.
 */
export const apiImportEvents = pgTable("api_import_events", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  apiKeyId: integer("apiKeyId"), // null if key was deleted
  keyLabel: varchar("keyLabel", { length: 100 }).notNull().default("API Key"),
  contactId: integer("contactId"), // null if contact was deleted
  email: varchar("email", { length: 320 }).notNull(),
  created: boolean("created").notNull().default(true), // true = new contact, false = updated
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ApiImportEvent = typeof apiImportEvents.$inferSelect;
export type InsertApiImportEvent = typeof apiImportEvents.$inferInsert;

/** One private Koalendar webhook endpoint per Get Phame account. */
export const koalendarConnections = pgTable("koalendar_connections", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  webhookToken: varchar("webhookToken", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  lastEventAt: bigint("lastEventAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type KoalendarConnection = typeof koalendarConnections.$inferSelect;
export type InsertKoalendarConnection = typeof koalendarConnections.$inferInsert;

/**
 * Koalendar booking state. Only the invitee identity and fields required to
 * schedule, cancel, reschedule, deduplicate, and retry the eventual import are retained.
 */
export const koalendarBookings = pgTable("koalendar_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  connectionId: integer("connectionId").notNull(),
  externalBookingId: varchar("externalBookingId", { length: 512 }).notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  inviteeName: varchar("inviteeName", { length: 255 }).notNull(),
  inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(),
  startsAt: bigint("startsAt", { mode: "number" }).notNull(),
  endsAt: bigint("endsAt", { mode: "number" }).notNull(),
  canceledAt: bigint("canceledAt", { mode: "number" }),
  importedAt: bigint("importedAt", { mode: "number" }),
  contactId: integer("contactId"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: bigint("nextAttemptAt", { mode: "number" }).notNull(),
  lastError: text("lastError"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  uniqueIndex("koalendar_bookings_user_external_unique").on(table.userId, table.externalBookingId),
  index("koalendar_bookings_due_idx").on(table.status, table.nextAttemptAt),
]);
export type KoalendarBooking = typeof koalendarBookings.$inferSelect;
export type InsertKoalendarBooking = typeof koalendarBookings.$inferInsert;

/**
 * Outbound webhook configurations — per-user webhook URLs fired on contact events.
 */
export const webhookConfigs = pgTable("webhook_configs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 64 }), // HMAC-SHA256 signing secret (optional)
  events: varchar("events", { length: 500 }).notNull().default("contact.created"), // comma-separated event names
  active: boolean("active").notNull().default(true),
  label: varchar("label", { length: 100 }).notNull().default("Webhook"),
  lastFiredAt: bigint("lastFiredAt", { mode: "number" }),
  lastStatus: integer("lastStatus"), // HTTP status of last delivery
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

/**
 * WooCommerce pending imports — holds WooCommerce customers fetched but not yet imported.
 * Cleared when the user manually imports or when the auto-import scheduler runs.
 */
export const wooPendingImports = pgTable("woo_pending_imports", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  orderId: varchar("orderId", { length: 64 }),
  orderDate: bigint("orderDate", { mode: "number" }), // Unix ms of WooCommerce order date
  fetchedAt: bigint("fetchedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WooPendingImport = typeof wooPendingImports.$inferSelect;
export type InsertWooPendingImport = typeof wooPendingImports.$inferInsert;

/**
 * Webhook delivery logs — records each outbound webhook attempt.
 * Keeps the last N deliveries per webhook for debugging in Settings.
 */
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: serial("id").primaryKey(),
  webhookId: integer("webhookId").notNull(),
  userId: integer("userId").notNull(),
  event: varchar("event", { length: 64 }).notNull(),
  url: text("url").notNull(),
  statusCode: integer("statusCode"), // null if network error
  success: boolean("success").notNull().default(false),
  responseBody: text("responseBody"), // truncated to 500 chars
  errorMessage: text("errorMessage"), // set on network/timeout error
  durationMs: integer("durationMs"), // round-trip time in ms
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;
export type InsertWebhookDeliveryLog = typeof webhookDeliveryLogs.$inferInsert;

/**
 * User notification preferences — stores per-user toggles for in-app notifications.
 */
export const notificationPrefs = pgTable("notification_prefs", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  wooAutoImportNotify: boolean("wooAutoImportNotify").notNull().default(true),
  notifyOnEmailOpen: boolean("notifyOnEmailOpen").notNull().default(false),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type NotificationPref = typeof notificationPrefs.$inferSelect;
export type InsertNotificationPref = typeof notificationPrefs.$inferInsert;

/**
 * Client reviews — reviews manually logged by the business owner after a customer leaves one.
 * Stores the reviewer's name, star rating, review text, platform, and date.
 */
export const clientReviews = pgTable("client_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(), // FK to users.id (the business owner)
  reviewerName: varchar("reviewerName", { length: 255 }).notNull(),
  rating: integer("rating").notNull(), // 1–5 stars
  reviewText: text("reviewText"), // nullable — some reviews are rating-only
  platform: platformEnum("platform").notNull().default("google"),
  reviewedAt: bigint("reviewedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()), // Unix ms
  // Optional link back to the customer request that triggered this review
  requestId: integer("requestId"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ClientReview = typeof clientReviews.$inferSelect;
export type InsertClientReview = typeof clientReviews.$inferInsert;

/** Bulk sender API credentials — Pro-only feature for high-volume sending via SendGrid/Mailgun/Postmark */
export const bulkSenderCredentials = pgTable("bulk_sender_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  provider: bulkProviderEnum("provider").notNull(),
  apiKey: text("apiKey").notNull(), // AES-256-GCM encrypted
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  // Mailgun-specific: sending domain (e.g. mg.yourdomain.com)
  mailgunDomain: varchar("mailgunDomain", { length: 255 }),
  // Mailgun-specific: EU region flag
  mailgunRegion: mailgunRegionEnum("mailgunRegion").default("us"),
  connected: integer("connected").default(1).notNull(), // 1 = active
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type BulkSenderCredential = typeof bulkSenderCredentials.$inferSelect;
export type InsertBulkSenderCredential = typeof bulkSenderCredentials.$inferInsert;

/**
 * Referral / affiliate tracking.
 * Each user gets a unique referral code. When a new user signs up via a referral link
 * (?ref=CODE) and later converts to any paid plan (≥ 1 month), the referrer earns
 * one free month added to their planExpiresAt.
 */
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerUserId: integer("referrerUserId").notNull(),    // the user who shared the link
  referredUserId: integer("referredUserId").notNull().unique(), // the new user who signed up
  referralCode: varchar("referralCode", { length: 32 }).notNull(), // code used at signup
  convertedAt: bigint("convertedAt", { mode: "number" }),  // Unix ms — null until paid conversion
  rewardedAt: bigint("rewardedAt", { mode: "number" }),    // Unix ms — null until reward applied
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Magic link tokens — one-time passwordless sign-in tokens sent via email.
 * Each row represents a pending or consumed token.
 * Tokens expire after 15 minutes and can only be used once.
 */
export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: bigint("expiresAt", { mode: "number" }).notNull(),
  usedAt: bigint("usedAt", { mode: "number" }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = typeof magicLinkTokens.$inferInsert;

/**
 * Landing page lead captures — stores emails from the free guide form.
 * guideSentAt is null until the system email with the PDF link is successfully sent.
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  guideSentAt: timestamp("guideSentAt"),
});
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
