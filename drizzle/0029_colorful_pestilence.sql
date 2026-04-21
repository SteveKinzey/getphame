ALTER TABLE `churn_surveys` ADD `unsubscribeToken` varchar(64);--> statement-breakpoint
ALTER TABLE `churn_surveys` ADD `reEngagementOptedOut` int DEFAULT 0 NOT NULL;