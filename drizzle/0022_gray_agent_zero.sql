ALTER TABLE `bulk_sender_credentials` MODIFY COLUMN `provider` enum('sendgrid','amazon_ses','mailgun','mailersend','smtp2go','brevo','postmark','sparkpost','elastic_email','zoho_zeptomail','socketlabs','custom_smtp') NOT NULL;--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` MODIFY COLUMN `provider` enum('sendgrid','amazon_ses','mailgun','mailersend','smtp2go','brevo','postmark','sparkpost','elastic_email','zoho_zeptomail','socketlabs','custom_smtp') NOT NULL;--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` ADD `smtpHost` varchar(255);--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` ADD `smtpPort` int;--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` ADD `smtpSecure` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` ADD `smtpUsername` varchar(320);--> statement-breakpoint
ALTER TABLE `bulk_sender_credentials` ADD `providerRegion` varchar(64);
