-- A1b application-first reconciliation proposal.
-- Reviewed additive-only SQL: no DROP, DELETE, UPDATE, ALTER, or ledger changes.
-- Apply only through the managed database migration operation after final review.

CREATE TABLE IF NOT EXISTS `contact_consent_evidence` (
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
CREATE INDEX `contact_consent_evidence_contact_idx` ON `contact_consent_evidence` (`userId`,`contactId`);

CREATE TABLE IF NOT EXISTS `email_template_revisions` (
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
CREATE INDEX `email_template_revisions_template_status_idx` ON `email_template_revisions` (`templateId`,`status`);

CREATE TABLE IF NOT EXISTS `source_automation_events` (
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
CREATE INDEX `source_automation_events_status_idx` ON `source_automation_events` (`userId`,`status`);
CREATE INDEX `source_automation_events_due_idx` ON `source_automation_events` (`status`,`scheduledAt`);

CREATE TABLE IF NOT EXISTS `source_automation_schedulers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `scheduleKey` varchar(32) NOT NULL DEFAULT 'global',
  `scheduleCronTaskUid` varchar(65),
  `cronExpression` varchar(64) NOT NULL DEFAULT '0 */5 * * * *',
  `lastRunAt` bigint,
  `lastRunStatus` varchar(20),
  `lastRunErrorCode` varchar(64),
  `createdAt` bigint NOT NULL,
  `updatedAt` bigint NOT NULL,
  CONSTRAINT `source_automation_schedulers_id` PRIMARY KEY(`id`),
  CONSTRAINT `source_automation_schedulers_scheduleKey_unique` UNIQUE(`scheduleKey`),
  CONSTRAINT `source_automation_schedulers_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
