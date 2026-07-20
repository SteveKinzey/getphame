CREATE TABLE `access_code_redemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeId` int NOT NULL,
	`userId` int NOT NULL,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_code_redemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_code_redemptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `access_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`note` varchar(255),
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`active` int NOT NULL DEFAULT 1,
	`expiresAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `api_import_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int,
	`keyLabel` varchar(100) NOT NULL DEFAULT 'API Key',
	`contactId` int,
	`email` varchar(320) NOT NULL,
	`created` boolean NOT NULL DEFAULT true,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `api_import_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`label` varchar(100) NOT NULL DEFAULT 'My API Key',
	`lastUsedAt` bigint,
	`revokedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `bulk_sender_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('sendgrid','mailgun','postmark') NOT NULL,
	`apiKey` text NOT NULL,
	`fromEmail` varchar(320) NOT NULL,
	`fromName` varchar(255),
	`mailgunDomain` varchar(255),
	`mailgunRegion` enum('us','eu') DEFAULT 'us',
	`connected` int NOT NULL DEFAULT 1,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `bulk_sender_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `bulk_sender_credentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(255) NOT NULL,
	`reviewLink` text NOT NULL,
	`tier` enum('free','pro','annual','lifetime') NOT NULL DEFAULT 'free',
	`planExpiresAt` bigint,
	`monthlyCount` int NOT NULL DEFAULT 0,
	`monthlyResetDate` varchar(7) NOT NULL,
	`stripeCustomerId` varchar(64),
	`fromName` varchar(255),
	`replyTo` varchar(320),
	`onboardingDismissed` int NOT NULL DEFAULT 0,
	`reviewGoal` int NOT NULL DEFAULT 0,
	`stripeLastSyncedAt` bigint,
	`dailySendLimit` int NOT NULL DEFAULT 50,
	`followUpEnabled` int NOT NULL DEFAULT 1,
	`followUpDelayDays` int NOT NULL DEFAULT 3,
	`reEngagementEnabled` int NOT NULL DEFAULT 1,
	`referralCode` varchar(32),
	`inactiveEmailSentAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `business_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `churn_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`reason` enum('too_expensive','not_using','switching_tools','missing_feature','other') NOT NULL,
	`comment` text,
	`offerValidUntil` bigint,
	`reEngagementSentAt` bigint,
	`unsubscribeToken` varchar(64),
	`reEngagementOptedOut` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `churn_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewerName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text,
	`platform` enum('google','yelp','tripadvisor','bing','facebook','apple','other') NOT NULL DEFAULT 'google',
	`reviewedAt` bigint NOT NULL,
	`requestId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `client_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320),
	`customerPhone` varchar(30),
	`method` enum('email','sms','both') NOT NULL,
	`status` enum('sent','pending','followed_up') NOT NULL DEFAULT 'sent',
	`respondedAt` bigint,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`followUpAt` timestamp,
	`platformId` int,
	`emailSubject` varchar(500),
	`emailBody` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`templateId` int,
	`type` enum('open','click') NOT NULL,
	`url` varchar(2048),
	`userAgent` varchar(512),
	`ip` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_up_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`customerRequestId` int NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`scheduledAt` bigint NOT NULL,
	`sentAt` bigint,
	`status` enum('pending','sent','cancelled') NOT NULL DEFAULT 'pending',
	`sequenceStep` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follow_up_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gmail_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text,
	`expiresAt` bigint,
	`gmailEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gmail_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `gmail_tokens_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`guideSentAt` timestamp,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `leads_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` bigint NOT NULL,
	`usedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `magic_link_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_link_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `magic_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wooAutoImportNotify` boolean NOT NULL DEFAULT true,
	`notifyOnEmailOpen` boolean NOT NULL DEFAULT false,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `notification_prefs_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_prefs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `page_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`page` varchar(255) NOT NULL,
	`utmSource` varchar(128),
	`utmMedium` varchar(128),
	`utmCampaign` varchar(128),
	`referrer` varchar(2048),
	`userAgent` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`referralCode` varchar(32) NOT NULL,
	`convertedAt` bigint,
	`rewardedAt` bigint,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referredUserId_unique` UNIQUE(`referredUserId`)
);
--> statement-breakpoint
CREATE TABLE `review_platforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('google','yelp','tripadvisor','bing','facebook','apple','other') NOT NULL,
	`label` varchar(255),
	`url` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_platforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30),
	`notes` text,
	`lastSentAt` bigint,
	`totalSent` int NOT NULL DEFAULT 0,
	`tags` text,
	`source` enum('manual','woocommerce','stripe') NOT NULL DEFAULT 'manual',
	`externalId` varchar(128),
	`optedOut` int NOT NULL DEFAULT 0,
	`optedOutAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smtp_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL DEFAULT 587,
	`secure` int NOT NULL DEFAULT 0,
	`user` varchar(320) NOT NULL,
	`encryptedPass` text NOT NULL,
	`fromName` varchar(255),
	`replyTo` varchar(320),
	`verified` int NOT NULL DEFAULT 0,
	`lastHealthCheck` bigint,
	`lastHealthStatus` enum('ok','fail'),
	`lastHealthError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smtp_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `smtp_credentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `stripe_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeSubscriptionId` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stripe_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`password_hash` text,
	`default_from_email` text,
	`default_from_name` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`url` text NOT NULL,
	`secret` varchar(64),
	`events` varchar(500) NOT NULL DEFAULT 'contact.created',
	`active` boolean NOT NULL DEFAULT true,
	`label` varchar(100) NOT NULL DEFAULT 'Webhook',
	`lastFiredAt` bigint,
	`lastStatus` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_delivery_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookId` int NOT NULL,
	`userId` int NOT NULL,
	`event` varchar(64) NOT NULL,
	`url` text NOT NULL,
	`statusCode` int,
	`success` boolean NOT NULL DEFAULT false,
	`responseBody` text,
	`errorMessage` text,
	`durationMs` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `webhook_delivery_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `woo_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storeUrl` varchar(512) NOT NULL,
	`consumerKey` text NOT NULL,
	`consumerSecret` text NOT NULL,
	`lastSyncedAt` bigint,
	`lastSyncCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `woo_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `woo_credentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `woo_customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`wooOrderId` varchar(64) NOT NULL,
	`customerName` varchar(255) NOT NULL,
	`customerEmail` varchar(320) NOT NULL,
	`productName` varchar(512),
	`orderDate` bigint NOT NULL,
	`reviewRequestSentAt` bigint,
	`lastStatusChangedAt` bigint,
	`optedOut` int NOT NULL DEFAULT 0,
	`optedOutAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `woo_customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `woo_pending_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`phone` varchar(30),
	`orderId` varchar(64),
	`orderDate` bigint,
	`fetchedAt` bigint NOT NULL,
	CONSTRAINT `woo_pending_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `woo_sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`syncedAt` bigint NOT NULL,
	`daysWindow` int NOT NULL DEFAULT 30,
	`added` int NOT NULL DEFAULT 0,
	`total` int NOT NULL DEFAULT 0,
	`storeUrl` varchar(512),
	CONSTRAINT `woo_sync_logs_id` PRIMARY KEY(`id`)
);
