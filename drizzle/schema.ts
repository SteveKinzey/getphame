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
  tier: mysqlEnum("tier", ["free", "pro"]).default("free").notNull(),
  monthlyCount: int("monthlyCount").default(0).notNull(),
  monthlyResetDate: varchar("monthlyResetDate", { length: 7 }).notNull(), // "YYYY-MM"
  // Stripe customer ID — stored for creating checkout sessions and portal links
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  // Email sender display name — shown as "From: <name>" in outgoing review request emails
  fromName: varchar("fromName", { length: 255 }),
  // Reply-To address — if set, replies go here instead of the connected Gmail address
  replyTo: varchar("replyTo", { length: 320 }),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WooCustomer = typeof wooCustomers.$inferSelect;
export type InsertWooCustomer = typeof wooCustomers.$inferInsert;

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/** Follow-up reminders — scheduled 3-day follow-ups for sent review requests */
export const followUpReminders = mysqlTable("follow_up_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerRequestId: int("customerRequestId").notNull(), // FK to customer_requests
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  scheduledAt: bigint("scheduledAt", { mode: "number" }).notNull(), // Unix ms when to send
  sentAt: bigint("sentAt", { mode: "number" }), // null = not yet sent
  status: mysqlEnum("status", ["pending", "sent", "cancelled"]).default("pending").notNull(),
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
