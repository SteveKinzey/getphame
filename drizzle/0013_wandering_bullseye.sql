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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smtp_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `smtp_credentials_userId_unique` UNIQUE(`userId`)
);
