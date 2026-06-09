import { bigint, boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Stores Gmail OAuth tokens for each business owner */
export const gmailTokens = mysqlTable("gmail_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms
  gmailEmail: varchar("gmailEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GmailToken = typeof gmailTokens.$inferSelect;
export type InsertGmailToken = typeof gmailTokens.$inferInsert;

/** Business profile for each Phame user */
export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  reviewLink: text("reviewLink").notNull(),
  tier: mysqlEnum("tier", ["free", "pro", "annual", "lifetime"]).default("free").notNull(),
  planExpiresAt: bigint("planExpiresAt", { mode: "number" }), // Unix ms — null for lifetime, set for monthly/annual
  monthlyCount: int("monthlyCount").default(0).notNull(),
  monthlyResetDate: varchar("monthlyResetDate", { length: 7 }).notNull(), // "YYYY-MM"
  // Stripe customer ID — stored for creating checkout sessions and portal links
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // Email sender display name — shown as "From: <name>" in outgoing review request emails
  fromName: varchar("fromName", { length: 255 }),
  // Reply-To address — if set, replies go here instead of the connected email address
  replyTo: varchar("replyTo", { length: 320 }),
  // Onboarding wizard dismissed flag — 1 = user has dismissed or completed the wizard
  onboardingDismissed: int("onboardingDismissed").default(0).notNull(),
  // Monthly review goal — number of responded requests the user aims to reach each month
  reviewGoal: int("reviewGoal").default(0).notNull(),
  // Last time Stripe customers were synced into saved_contacts (Unix ms)
  stripeLastSyncedAt: bigint("stripeLastSyncedAt", { mode: "number" }),
  // Max emails to send per day during bulk sends (default 50, max 500)
  dailySendLimit: int("dailySendLimit").default(50).notNull(),
  // Follow-up reminder settings — 1 = enabled (default), 0 = disabled
  followUpEnabled: int("followUpEnabled").default(1).notNull(),
  // Days after initial send before step-1 follow-up (default 3, range 1-14)
  followUpDelayDays: int("followUpDelayDays").default(3).notNull(),
  // Re-engagement email — 1 = enabled (default), 0 = disabled
  reEngagementEnabled: int("reEngagementEnabled").default(1).notNull(),
  // Referral code — unique 8-char code used to generate share links (getphame.app?ref=CODE)
  referralCode: varchar("referralCode", { length: 32 }),
  // Inactive user re-engagement email — Unix ms when sent (null = not yet sent)
  inactiveEmailSentAt: bigint("inactiveEmailSentAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

/** Each review request sent by a business owner to their customer */
export const customerRequests = mysqlTable("customer_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  customerPhone: varchar("customerPhone", { length: 30 }),
  method: mysqlEnum("method", ["email", "sms", "both"]).notNull(),
  status: mysqlEnum("status", ["sent", "pending", "followed_up"]).default("sent").notNull(),
  respondedAt: bigint("respondedAt", { mode: "number" }), // Unix ms when customer left a review (null = not yet)
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  followUpAt: timestamp("followUpAt"),
  platformId: int("platformId"), // FK to review_platforms.id — which platform was linked in this request
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
export const stripeSubscriptions = mysqlTable("stripe_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // one active sub per user
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // active, canceled, past_due, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StripeSubscription = typeof stripeSubscriptions.$inferSelect;
export type InsertStripeSubscription = typeof stripeSubscriptions.$inferInsert;

/** WooCommerce store credentials per user */
export const wooCredentials = mysqlTable("woo_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  storeUrl: varchar("storeUrl", { length: 512 }).notNull(),
  consumerKey: text("consumerKey").notNull(),
  consumerSecret: text("consumerSecret").notNull(),
  lastSyncedAt: bigint("lastSyncedAt", { mode: "number" }), // Unix ms
  lastSyncCount: int("lastSyncCount").default(0), // number of orders staged in the last sync
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WooCredentials = typeof wooCredentials.$inferSelect;
export type InsertWooCredentials = typeof wooCredentials.$inferInsert;

/** Customers imported from WooCommerce orders */
export const wooCustomers = mysqlTable("woo_customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Phame user (business owner)
  wooOrderId: varchar("wooOrderId", { length: 64 }).notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  productName: varchar("productName", { length: 512 }),
  orderDate: bigint("orderDate", { mode: "number" }).notNull(), // Unix ms
  reviewRequestSentAt: bigint("reviewRequestSentAt", { mode: "number" }), // null = not yet sent
  lastStatusChangedAt: bigint("lastStatusChangedAt", { mode: "number" }), // Unix ms of last manual status change
  // Opt-out / unsubscribe tracking
  optedOut: int("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WooCustomer = typeof wooCustomers.$inferSelect;
export type InsertWooCustomer = typeof wooCustomers.$inferInsert;

/** WooCommerce sync history log — one row per sync run */
export const wooSyncLogs = mysqlTable("woo_sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  syncedAt: bigint("syncedAt", { mode: "number" }).notNull(), // Unix ms
  daysWindow: int("daysWindow").notNull().default(30),
  added: int("added").notNull().default(0),
  total: int("total").notNull().default(0),
  storeUrl: varchar("storeUrl", { length: 512 }),
});
export type WooSyncLog = typeof wooSyncLogs.$inferSelect;
export type InsertWooSyncLog = typeof wooSyncLogs.$inferInsert;

/** Saved contacts for repeat review request sending */
export const savedContacts = mysqlTable("saved_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  lastSentAt: bigint("lastSentAt", { mode: "number" }), // Unix ms of last review request
  totalSent: int("totalSent").default(0).notNull(),
  tags: text("tags"), // JSON array of tag strings e.g. ["plumbing","new"] — nullable in TiDB (no TEXT default allowed)
  // Source tracking — where this contact came from
  source: mysqlEnum("source", ["manual", "woocommerce", "stripe"]).default("manual").notNull(),
  externalId: varchar("externalId", { length: 128 }), // Stripe customer ID or WooCommerce order ID for dedup
  // Opt-out / unsubscribe tracking
  optedOut: int("optedOut").default(0).notNull(), // 1 = unsubscribed, suppress future sends
  optedOutAt: bigint("optedOutAt", { mode: "number" }), // Unix ms when opted out
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SavedContact = typeof savedContacts.$inferSelect;
export type InsertSavedContact = typeof savedContacts.$inferInsert;

/** Custom email templates per user */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(), // Supports {{customer_name}}, {{business_name}}, {{review_link}}
  isDefault: int("isDefault").default(0).notNull(), // 1 = default template for this user
  usageCount: int("usageCount").default(0).notNull(), // incremented each time this template is used to send a request
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/** Follow-up reminders — scheduled 3-day and 10-day follow-ups for sent review requests */
export const followUpReminders = mysqlTable("follow_up_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerRequestId: int("customerRequestId").notNull(), // FK to customer_requests
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // Unix ms when to send
  sentAt: bigint("sentAt", { mode: "number" }), // null = not yet sent
  status: mysqlEnum("status", ["pending", "sent", "cancelled"]).default("pending").notNull(),
  /** 1 = first follow-up (day 3), 2 = second follow-up (day 10) */
  sequenceStep: int("sequenceStep").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpReminder = typeof followUpReminders.$inferSelect;
export type InsertFollowUpReminder = typeof followUpReminders.$inferInsert;

/**
 * Beta / promo access codes — created by the owner, redeemed by users for free Pro access.
 * Supports single-use, multi-use, and unlimited-use codes with optional expiry.
 */
export const accessCodes = mysqlTable("access_codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(), // the code users enter
  note: varchar("note", { length: 255 }), // internal label e.g. "Beta cohort Jan 2026"
  maxUses: int("maxUses"), // null = unlimited
  usedCount: int("usedCount").default(0).notNull(),
  active: int("active").default(1).notNull(), // 1 = active, 0 = revoked
  expiresAt: bigint("expiresAt", { mode: "number" }), // Unix ms, null = never expires
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessCode = typeof accessCodes.$inferSelect;
export type InsertAccessCode = typeof accessCodes.$inferInsert;

/** Records each time a user redeems an access code */
export const accessCodeRedemptions = mysqlTable("access_code_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  codeId: int("codeId").notNull(),
  userId: int("userId").notNull().unique(), // one redemption per user
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
});

export type AccessCodeRedemption = typeof accessCodeRedemptions.$inferSelect;
export type InsertAccessCodeRedemption = typeof accessCodeRedemptions.$inferInsert;

/**
 * Review platform URLs per user — Google, Yelp, TripAdvisor, Bing, Facebook, Other.
 * Each user can have multiple platforms; one is marked as default.
 * The URL is pasted by the business owner (public review page link).
 */
export const reviewPlatforms = mysqlTable("review_platforms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]).notNull(),
  label: varchar("label", { length: 255 }), // custom label for "Other" or override
  url: text("url").notNull(), // public review page URL
  isDefault: int("isDefault").default(0).notNull(), // 1 = default platform for this user
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewPlatform = typeof reviewPlatforms.$inferSelect;
export type InsertReviewPlatform = typeof reviewPlatforms.$inferInsert;

/** SMTP credentials for each user — used to send review request emails from their own email account */
export const smtpCredentials = mysqlTable("smtp_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull().default(587),
  secure: int("secure").notNull().default(0), // 0 = STARTTLS (port 587), 1 = SSL (port 465)
  user: varchar("user", { length: 320 }).notNull(), // email address / SMTP username
  encryptedPass: text("encryptedPass").notNull(), // AES-256 encrypted password
  fromName: varchar("fromName", { length: 255 }), // display name in From header
  replyTo: varchar("replyTo", { length: 320 }), // optional reply-to override
  verified: int("verified").notNull().default(0), // 1 = test send succeeded
  lastHealthCheck: bigint("lastHealthCheck", { mode: "number" }), // Unix ms of last automated health check
  lastHealthStatus: mysqlEnum("lastHealthStatus", ["ok", "fail"]), // null = never checked
  lastHealthError: varchar("lastHealthError", { length: 500 }), // error message from last failed check (null = ok)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmtpCredential = typeof smtpCredentials.$inferSelect;
export type InsertSmtpCredential = typeof smtpCredentials.$inferInsert;

/**
 * Tracks email open and click events for review request emails.
 * Each row represents one open (pixel load) or one click (redirect through tracking link).
 * requestId links back to customer_requests; templateId is nullable (null = no template used).
 */
export const emailEvents = mysqlTable("email_events", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),   // FK to customer_requests.id
  userId: int("userId").notNull(),          // denormalised for fast per-user queries
  templateId: int("templateId"),            // FK to email_templates.id (nullable)
  type: mysqlEnum("type", ["open", "click"]).notNull(),
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
export const churnSurveys = mysqlTable("churn_surveys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),                          // null = anonymous / not logged in
  email: varchar("email", { length: 320 }),        // captured from query param if available
  reason: mysqlEnum("reason", [
    "too_expensive",
    "not_using",
    "switching_tools",
    "missing_feature",
    "other",
  ]).notNull(),
  comment: text("comment"),                        // optional free-text
  offerValidUntil: bigint("offerValidUntil", { mode: "number" }),  // UTC ms — STAY40 offer expires 7 days after survey
  reEngagementSentAt: bigint("reEngagementSentAt", { mode: "number" }), // UTC ms — when 2nd re-engagement email was sent
  unsubscribeToken: varchar("unsubscribeToken", { length: 64 }),       // hex token for one-click unsubscribe from re-engagement emails
  reEngagementOptedOut: int("reEngagementOptedOut").notNull().default(0), // 1 = user clicked unsubscribe
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChurnSurvey = typeof churnSurveys.$inferSelect;
export type InsertChurnSurvey = typeof churnSurveys.$inferInsert;

/**
 * Page-level analytics events — lightweight UTM / referral tracking.
 * Used to measure powered-by footer upsell click-throughs.
 */
export const pageEvents = mysqlTable("page_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),                          // null = not logged in
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
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
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
export const apiImportEvents = mysqlTable("api_import_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apiKeyId: int("apiKeyId"), // null if key was deleted
  keyLabel: varchar("keyLabel", { length: 100 }).notNull().default("API Key"),
  contactId: int("contactId"), // null if contact was deleted
  email: varchar("email", { length: 320 }).notNull(),
  created: boolean("created").notNull().default(true), // true = new contact, false = updated
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ApiImportEvent = typeof apiImportEvents.$inferSelect;
export type InsertApiImportEvent = typeof apiImportEvents.$inferInsert;

/**
 * Outbound webhook configurations — per-user webhook URLs fired on contact events.
 */
export const webhookConfigs = mysqlTable("webhook_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  url: text("url").notNull(),
  secret: varchar("secret", { length: 64 }), // HMAC-SHA256 signing secret (optional)
  events: varchar("events", { length: 500 }).notNull().default("contact.created"), // comma-separated event names
  active: boolean("active").notNull().default(true),
  label: varchar("label", { length: 100 }).notNull().default("Webhook"),
  lastFiredAt: bigint("lastFiredAt", { mode: "number" }),
  lastStatus: int("lastStatus"), // HTTP status of last delivery
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

/**
 * WooCommerce pending imports — holds WooCommerce customers fetched but not yet imported.
 * Cleared when the user manually imports or when the auto-import scheduler runs.
 */
export const wooPendingImports = mysqlTable("woo_pending_imports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
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
export const webhookDeliveryLogs = mysqlTable("webhook_delivery_logs", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull(),
  userId: int("userId").notNull(),
  event: varchar("event", { length: 64 }).notNull(),
  url: text("url").notNull(),
  statusCode: int("statusCode"), // null if network error
  success: boolean("success").notNull().default(false),
  responseBody: text("responseBody"), // truncated to 500 chars
  errorMessage: text("errorMessage"), // set on network/timeout error
  durationMs: int("durationMs"), // round-trip time in ms
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;
export type InsertWebhookDeliveryLog = typeof webhookDeliveryLogs.$inferInsert;

/**
 * User notification preferences — stores per-user toggles for in-app notifications.
 */
export const notificationPrefs = mysqlTable("notification_prefs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
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
export const clientReviews = mysqlTable("client_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK to users.id (the business owner)
  reviewerName: varchar("reviewerName", { length: 255 }).notNull(),
  rating: int("rating").notNull(), // 1–5 stars
  reviewText: text("reviewText"), // nullable — some reviews are rating-only
  platform: mysqlEnum("platform", ["google", "yelp", "tripadvisor", "bing", "facebook", "apple", "other"]).notNull().default("google"),
  reviewedAt: bigint("reviewedAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()), // Unix ms
  // Optional link back to the customer request that triggered this review
  requestId: int("requestId"),
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ClientReview = typeof clientReviews.$inferSelect;
export type InsertClientReview = typeof clientReviews.$inferInsert;

/** Bulk sender API credentials — Pro-only feature for high-volume sending via SendGrid/Mailgun/Postmark */
export const bulkSenderCredentials = mysqlTable("bulk_sender_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  provider: mysqlEnum("provider", ["sendgrid", "mailgun", "postmark"]).notNull(),
  apiKey: text("apiKey").notNull(), // AES-256-GCM encrypted
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  // Mailgun-specific: sending domain (e.g. mg.yourdomain.com)
  mailgunDomain: varchar("mailgunDomain", { length: 255 }),
  // Mailgun-specific: EU region flag
  mailgunRegion: mysqlEnum("mailgunRegion", ["us", "eu"]).default("us"),
  connected: int("connected").default(1).notNull(), // 1 = active
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
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerUserId: int("referrerUserId").notNull(),    // the user who shared the link
  referredUserId: int("referredUserId").notNull().unique(), // the new user who signed up
  referralCode: varchar("referralCode", { length: 32 }).notNull(), // code used at signup
  convertedAt: bigint("convertedAt", { mode: "number" }),  // Unix ms — null until paid conversion
  rewardedAt: bigint("rewardedAt", { mode: "number" }),    // Unix ms — null until reward applied
  createdAt: bigint("createdAt", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
