CREATE TABLE `contact_consent_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(48) NOT NULL,
	`userId` int NOT NULL,
	`contactId` int,
	`sourceConnectionId` int,
	`sourceSubmissionId` varchar(191) NOT NULL,
	`purpose` varchar(32) NOT NULL,
	`channel` varchar(16) NOT NULL,
	`basis` varchar(32) NOT NULL,
	`confirmed` boolean NOT NULL,
	`capturedAt` bigint NOT NULL,
	`source` varchar(255) NOT NULL,
	`consentText` text NOT NULL,
	`consentTextHash` varchar(64) NOT NULL,
	`consentVersion` varchar(64) NOT NULL,
	`privacyPolicyUrl` text NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `contact_consent_evidence_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_consent_evidence_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `contact_consent_evidence_source_unique` UNIQUE(`userId`,`sourceSubmissionId`,`purpose`)
);
--> statement-breakpoint
CREATE TABLE `email_template_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(48) NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`familyPublicId` varchar(48) NOT NULL,
	`version` int NOT NULL,
	`locale` varchar(16) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`englishSubject` varchar(512) NOT NULL,
	`englishBody` text NOT NULL,
	`englishRevisionId` int,
	`provenance` varchar(24) NOT NULL,
	`modelId` varchar(100),
	`inputHash` varchar(64),
	`status` varchar(24) NOT NULL DEFAULT 'draft',
	`approvedAt` bigint,
	`approvedByUserId` int,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `email_template_revisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_template_revisions_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `email_template_revisions_family_version_unique` UNIQUE(`userId`,`familyPublicId`,`locale`,`version`)
);
--> statement-breakpoint
CREATE TABLE `source_automation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(48) NOT NULL,
	`userId` int NOT NULL,
	`sourceConnectionId` int NOT NULL,
	`apiKeyId` int NOT NULL,
	`sourceEventId` varchar(191) NOT NULL,
	`requestHash` varchar(64) NOT NULL,
	`eventType` varchar(32) NOT NULL DEFAULT 'review_request',
	`contactId` int,
	`templateId` int,
	`platformId` int,
	`preferredLocale` varchar(16) NOT NULL DEFAULT 'en',
	`customerRequestId` int,
	`status` varchar(24) NOT NULL,
	`errorCode` varchar(64),
	`scheduledAt` bigint,
	`attemptCount` int NOT NULL DEFAULT 0,
	`lastAttemptAt` bigint,
	`claimExpiresAt` bigint,
	`createdAt` bigint NOT NULL,
	`completedAt` bigint,
	CONSTRAINT `source_automation_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_automation_events_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `source_automation_events_source_event_unique` UNIQUE(`userId`,`sourceConnectionId`,`sourceEventId`)
);
--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `businessDescription` text;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `businessCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `countryCode` varchar(2);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `regionCode` varchar(16);--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `preferredOutreachLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_profiles` ADD `onboardingTemplateStatus` varchar(24) DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_requests` ADD `sourceConnectionId` int;--> statement-breakpoint
ALTER TABLE `customer_requests` ADD `sourceEventId` varchar(191);--> statement-breakpoint
ALTER TABLE `customer_requests` ADD `preferredLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_requests` ADD `templateRevisionId` int;--> statement-breakpoint
ALTER TABLE `customer_requests` ADD `englishTemplateRevisionId` int;--> statement-breakpoint
ALTER TABLE `email_templates` ADD `familyPublicId` varchar(48);--> statement-breakpoint
ALTER TABLE `email_templates` ADD `locale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `email_templates` ADD `activeRevisionId` int;--> statement-breakpoint
ALTER TABLE `email_templates` ADD `provenance` varchar(24) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `email_templates` ADD `approvedAt` bigint;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `preferredLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `templateRevisionId` int;--> statement-breakpoint
ALTER TABLE `follow_up_reminders` ADD `englishTemplateRevisionId` int;--> statement-breakpoint
ALTER TABLE `review_platforms` ADD `countryCode` varchar(2);--> statement-breakpoint
ALTER TABLE `review_platforms` ADD `regionCode` varchar(16);--> statement-breakpoint
ALTER TABLE `review_platforms` ADD `businessCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `review_platforms` ADD `recommendationSource` varchar(255);--> statement-breakpoint
ALTER TABLE `review_platforms` ADD `recommendationRank` int;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentPurpose` varchar(32);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentChannel` varchar(16);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentTextHash` varchar(64);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentVersion` varchar(64);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `privacyPolicyUrl` text;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `sourceFormId` varchar(191);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `sourceSubmissionId` varchar(191);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `preferredLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `automationEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `automationMode` varchar(24) DEFAULT 'import_only' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `dryRun` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `sendDelayMinutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `templateId` int;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `platformId` int;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `preferredLocale` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `pausedAt` bigint;--> statement-breakpoint
ALTER TABLE `source_connections` ADD `pauseReason` varchar(255);--> statement-breakpoint
ALTER TABLE `source_connections` ADD `lastAutomationAt` bigint;--> statement-breakpoint
CREATE INDEX `contact_consent_evidence_contact_idx` ON `contact_consent_evidence` (`userId`,`contactId`);--> statement-breakpoint
CREATE INDEX `email_template_revisions_template_status_idx` ON `email_template_revisions` (`templateId`,`status`);--> statement-breakpoint
CREATE INDEX `source_automation_events_status_idx` ON `source_automation_events` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `source_automation_events_due_idx` ON `source_automation_events` (`status`,`scheduledAt`);