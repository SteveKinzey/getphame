CREATE TABLE `api_idempotency_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`apiKeyId` int NOT NULL,
	`idempotencyHash` varchar(64) NOT NULL,
	`payloadHash` varchar(64) NOT NULL,
	`contactId` int,
	`created` boolean NOT NULL DEFAULT true,
	`responseJson` text NOT NULL,
	`expiresAt` bigint NOT NULL,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `api_idempotency_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_idempotency_key_hash_unique` UNIQUE(`apiKeyId`,`idempotencyHash`)
);
--> statement-breakpoint
CREATE TABLE `api_rate_limit_windows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiKeyId` int NOT NULL,
	`windowStartedAt` bigint NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`expiresAt` bigint NOT NULL,
	CONSTRAINT `api_rate_limit_windows_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_rate_limit_key_window_unique` UNIQUE(`apiKeyId`,`windowStartedAt`)
);
--> statement-breakpoint
ALTER TABLE `saved_contacts` MODIFY COLUMN `source` enum('manual','woocommerce','stripe','koalendar','api') NOT NULL DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `emailMasked` varchar(320);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `emailFingerprint` varchar(64);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `sourceApp` varchar(64);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `externalId` varchar(128);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `consentBasis` varchar(32);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `outcome` varchar(32) DEFAULT 'created' NOT NULL;--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `errorCode` varchar(64);--> statement-breakpoint
ALTER TABLE `api_import_events` ADD `idempotencyHash` varchar(64);--> statement-breakpoint
UPDATE `api_import_events`
SET
	`emailMasked` = CASE
		WHEN LOCATE('@', `email`) > 1 THEN CONCAT(LEFT(`email`, 1), '***@', SUBSTRING_INDEX(`email`, '@', -1))
		ELSE '***'
	END,
	`outcome` = CASE WHEN `created` = true THEN 'created' ELSE 'updated' END;--> statement-breakpoint
UPDATE `api_import_events`
SET `email` = COALESCE(`emailMasked`, '***');--> statement-breakpoint
ALTER TABLE `api_keys` ADD `keyHint` varchar(24) DEFAULT 'rl_••••' NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `scopes` text;--> statement-breakpoint
UPDATE `api_keys` SET `scopes` = '["contacts:write","review_requests:send"]' WHERE `scopes` IS NULL;--> statement-breakpoint
ALTER TABLE `api_keys` MODIFY COLUMN `scopes` text NOT NULL;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `expiresAt` bigint;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `rotatedFromId` int;--> statement-breakpoint
ALTER TABLE `api_keys` ADD `usageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `sourceApp` varchar(64);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `importedViaApiKeyId` int;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentBasis` varchar(32);--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentCapturedAt` bigint;--> statement-breakpoint
ALTER TABLE `saved_contacts` ADD `consentSource` varchar(255);--> statement-breakpoint
CREATE INDEX `api_idempotency_expiry_idx` ON `api_idempotency_records` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_rate_limit_expiry_idx` ON `api_rate_limit_windows` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `api_import_events_user_created_idx` ON `api_import_events` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `api_import_events_key_created_idx` ON `api_import_events` (`apiKeyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `api_keys_user_created_idx` ON `api_keys` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `api_keys_expiry_idx` ON `api_keys` (`expiresAt`);
