CREATE TYPE "public"."bulk_provider" AS ENUM('sendgrid', 'mailgun', 'postmark');--> statement-breakpoint
CREATE TYPE "public"."churn_reason" AS ENUM('too_expensive', 'not_using', 'switching_tools', 'missing_feature', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('manual', 'woocommerce', 'stripe');--> statement-breakpoint
CREATE TYPE "public"."email_event_type" AS ENUM('open', 'click');--> statement-breakpoint
CREATE TYPE "public"."health_status" AS ENUM('ok', 'fail');--> statement-breakpoint
CREATE TYPE "public"."mailgun_region" AS ENUM('us', 'eu');--> statement-breakpoint
CREATE TYPE "public"."method" AS ENUM('email', 'sms', 'both');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('google', 'yelp', 'tripadvisor', 'bing', 'facebook', 'apple', 'other');--> statement-breakpoint
CREATE TYPE "public"."reminder_status" AS ENUM('pending', 'sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('sent', 'pending', 'followed_up');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'pro', 'annual', 'lifetime');--> statement-breakpoint
CREATE TABLE "access_code_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"codeId" integer NOT NULL,
	"userId" integer NOT NULL,
	"redeemedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "access_code_redemptions_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "access_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"note" varchar(255),
	"maxUses" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"expiresAt" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "access_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "api_import_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"apiKeyId" integer,
	"keyLabel" varchar(100) DEFAULT 'API Key' NOT NULL,
	"contactId" integer,
	"email" varchar(320) NOT NULL,
	"created" boolean DEFAULT true NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"keyHash" varchar(64) NOT NULL,
	"label" varchar(100) DEFAULT 'My API Key' NOT NULL,
	"lastUsedAt" bigint,
	"revokedAt" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "bulk_sender_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"provider" "bulk_provider" NOT NULL,
	"apiKey" text NOT NULL,
	"fromEmail" varchar(320) NOT NULL,
	"fromName" varchar(255),
	"mailgunDomain" varchar(255),
	"mailgunRegion" "mailgun_region" DEFAULT 'us',
	"connected" integer DEFAULT 1 NOT NULL,
	"createdAt" bigint NOT NULL,
	"updatedAt" bigint NOT NULL,
	CONSTRAINT "bulk_sender_credentials_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"businessName" varchar(255) NOT NULL,
	"reviewLink" text NOT NULL,
	"tier" "tier" DEFAULT 'free' NOT NULL,
	"planExpiresAt" bigint,
	"monthlyCount" integer DEFAULT 0 NOT NULL,
	"monthlyResetDate" varchar(7) NOT NULL,
	"stripeCustomerId" varchar(64),
	"fromName" varchar(255),
	"replyTo" varchar(320),
	"onboardingDismissed" integer DEFAULT 0 NOT NULL,
	"reviewGoal" integer DEFAULT 0 NOT NULL,
	"stripeLastSyncedAt" bigint,
	"dailySendLimit" integer DEFAULT 50 NOT NULL,
	"followUpEnabled" integer DEFAULT 1 NOT NULL,
	"followUpDelayDays" integer DEFAULT 3 NOT NULL,
	"reEngagementEnabled" integer DEFAULT 1 NOT NULL,
	"referralCode" varchar(32),
	"inactiveEmailSentAt" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "churn_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"email" varchar(320),
	"reason" "churn_reason" NOT NULL,
	"comment" text,
	"offerValidUntil" bigint,
	"reEngagementSentAt" bigint,
	"unsubscribeToken" varchar(64),
	"reEngagementOptedOut" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"reviewerName" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"reviewText" text,
	"platform" "platform" DEFAULT 'google' NOT NULL,
	"reviewedAt" bigint NOT NULL,
	"requestId" integer,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerEmail" varchar(320),
	"customerPhone" varchar(30),
	"method" "method" NOT NULL,
	"status" "request_status" DEFAULT 'sent' NOT NULL,
	"respondedAt" bigint,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"followUpAt" timestamp,
	"platformId" integer,
	"emailSubject" varchar(500),
	"emailBody" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" integer NOT NULL,
	"userId" integer NOT NULL,
	"templateId" integer,
	"type" "email_event_type" NOT NULL,
	"url" varchar(2048),
	"userAgent" varchar(512),
	"ip" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(512) NOT NULL,
	"body" text NOT NULL,
	"isDefault" integer DEFAULT 0 NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"customerRequestId" integer NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerEmail" varchar(320) NOT NULL,
	"scheduledAt" bigint NOT NULL,
	"sentAt" bigint,
	"status" "reminder_status" DEFAULT 'pending' NOT NULL,
	"sequenceStep" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gmail_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"expiresAt" bigint,
	"gmailEmail" varchar(320),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gmail_tokens_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"guideSentAt" timestamp,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "magic_link_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"token" varchar(64) NOT NULL,
	"expiresAt" bigint NOT NULL,
	"usedAt" bigint,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "magic_link_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification_prefs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"wooAutoImportNotify" boolean DEFAULT true NOT NULL,
	"notifyOnEmailOpen" boolean DEFAULT false NOT NULL,
	"updatedAt" bigint NOT NULL,
	CONSTRAINT "notification_prefs_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "page_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"page" varchar(255) NOT NULL,
	"utmSource" varchar(128),
	"utmMedium" varchar(128),
	"utmCampaign" varchar(128),
	"referrer" varchar(2048),
	"userAgent" varchar(512),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrerUserId" integer NOT NULL,
	"referredUserId" integer NOT NULL,
	"referralCode" varchar(32) NOT NULL,
	"convertedAt" bigint,
	"rewardedAt" bigint,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "referrals_referredUserId_unique" UNIQUE("referredUserId")
);
--> statement-breakpoint
CREATE TABLE "review_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"platform" "platform" NOT NULL,
	"label" varchar(255),
	"url" text NOT NULL,
	"isDefault" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(30),
	"notes" text,
	"lastSentAt" bigint,
	"totalSent" integer DEFAULT 0 NOT NULL,
	"tags" text,
	"source" "contact_source" DEFAULT 'manual' NOT NULL,
	"externalId" varchar(128),
	"optedOut" integer DEFAULT 0 NOT NULL,
	"optedOutAt" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 587 NOT NULL,
	"secure" integer DEFAULT 0 NOT NULL,
	"user" varchar(320) NOT NULL,
	"encryptedPass" text NOT NULL,
	"fromName" varchar(255),
	"replyTo" varchar(320),
	"verified" integer DEFAULT 0 NOT NULL,
	"lastHealthCheck" bigint,
	"lastHealthStatus" "health_status",
	"lastHealthError" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "smtp_credentials_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "stripe_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"stripeSubscriptionId" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_subscriptions_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"password_hash" text,
	"default_from_email" text,
	"default_from_name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "webhook_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(64),
	"events" varchar(500) DEFAULT 'contact.created' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"label" varchar(100) DEFAULT 'Webhook' NOT NULL,
	"lastFiredAt" bigint,
	"lastStatus" integer,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_delivery_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" integer NOT NULL,
	"userId" integer NOT NULL,
	"event" varchar(64) NOT NULL,
	"url" text NOT NULL,
	"statusCode" integer,
	"success" boolean DEFAULT false NOT NULL,
	"responseBody" text,
	"errorMessage" text,
	"durationMs" integer,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woo_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"storeUrl" varchar(512) NOT NULL,
	"consumerKey" text NOT NULL,
	"consumerSecret" text NOT NULL,
	"lastSyncedAt" bigint,
	"lastSyncCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "woo_credentials_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "woo_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"wooOrderId" varchar(64) NOT NULL,
	"customerName" varchar(255) NOT NULL,
	"customerEmail" varchar(320) NOT NULL,
	"productName" varchar(512),
	"orderDate" bigint NOT NULL,
	"reviewRequestSentAt" bigint,
	"lastStatusChangedAt" bigint,
	"optedOut" integer DEFAULT 0 NOT NULL,
	"optedOutAt" bigint,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woo_pending_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255),
	"phone" varchar(30),
	"orderId" varchar(64),
	"orderDate" bigint,
	"fetchedAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woo_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"syncedAt" bigint NOT NULL,
	"daysWindow" integer DEFAULT 30 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"storeUrl" varchar(512)
);
