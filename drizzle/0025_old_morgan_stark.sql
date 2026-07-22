CREATE TABLE `developer_api_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`termsVersion` varchar(32),
	`acceptableUseVersion` varchar(32),
	`termsAcceptedAt` bigint,
	`acceptanceFingerprint` varchar(64),
	`businessName` varchar(160),
	`websiteUrl` varchar(512),
	`useCase` text,
	`expectedMonthlySendVolume` int,
	`consentProcess` text,
	`sendScopeStatus` varchar(32) NOT NULL DEFAULT 'not_requested',
	`sendScopeRequestedAt` bigint,
	`sendScopeReviewedAt` bigint,
	`sendScopeReviewedByUserId` int,
	`sendScopeReviewNote` varchar(500),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `developer_api_enrollments_id` PRIMARY KEY(`id`),
	CONSTRAINT `developer_api_enrollments_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `developer_api_enrollment_status_idx` ON `developer_api_enrollments` (`sendScopeStatus`,`sendScopeRequestedAt`);