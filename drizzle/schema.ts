import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

/** Business profile for each ReviewLink user */
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
  // Zoho Books customer ID — stored for creating invoices
  zohoCustomerId: varchar("zohoCustomerId", { length: 64 }),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WooCredentials = typeof wooCredentials.$inferSelect;
export type InsertWooCredentials = typeof wooCredentials.$inferInsert;

/** Customers imported from WooCommerce orders */
export const wooCustomers = mysqlTable("woo_customers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // ReviewLink user (business owner)
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
 * Stores Zoho Books OAuth tokens (one row — the owner's connection).
 * Access token is refreshed automatically before each API call.
 */
export const zohoTokens = mysqlTable("zoho_tokens", {
  id: int("id").autoincrement().primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: bigint("expiresAt", { mode: "bigint" }).notNull(), // Unix ms
  updatedAt: bigint("updatedAt", { mode: "bigint" }).notNull(), // Unix ms
});

export type ZohoToken = typeof zohoTokens.$inferSelect;
export type InsertZohoToken = typeof zohoTokens.$inferInsert;

/**
 * Review platform URLs per user — Google, Yelp, TripAdvisor, Bing, Facebook, Other.
 * Each user can have multiple platforms; one is marked as default.
 * The URL is pasted by the business owner (public review page link).
 */
export const reviewPlatforms = mysqlTable("review_platforms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["google", "yelp", "tripadvisor", "bing", "facebook", "other"]).notNull(),
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
