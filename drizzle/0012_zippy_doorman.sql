CREATE TABLE `review_platforms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('google','yelp','tripadvisor','bing','facebook','other') NOT NULL,
	`label` varchar(255),
	`url` text NOT NULL,
	`isDefault` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_platforms_id` PRIMARY KEY(`id`)
);
