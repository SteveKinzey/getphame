CREATE TABLE `user_identity_aliases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openId` varchar(64) NOT NULL,
	`loginMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_identity_aliases_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_identity_aliases_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `user_identity_alias_user_idx` ON `user_identity_aliases` (`userId`);