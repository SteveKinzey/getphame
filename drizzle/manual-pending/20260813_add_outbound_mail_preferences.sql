-- Drizzle snapshot generation is currently blocked by an existing 0048/0049
-- parent-snapshot collision. This additive migration is intentionally manual,
-- reviewed, and safe to apply once. It does not modify existing credentials.

CREATE TABLE IF NOT EXISTS `outbound_mail_preferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `selected_channel` enum('personal','bulk') NOT NULL,
  `updated_at` bigint NOT NULL,
  CONSTRAINT `outbound_mail_preferences_id` PRIMARY KEY(`id`),
  CONSTRAINT `outbound_mail_preferences_user_id_unique` UNIQUE(`user_id`)
);

-- Preserve only already-verified, user-owned connections. Personal SMTP wins
-- where both records exist; legacy SendGrid rows are intentionally excluded.
INSERT INTO `outbound_mail_preferences` (`user_id`, `selected_channel`, `updated_at`)
SELECT `userId`, 'personal', UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000
FROM `smtp_credentials`
WHERE `verified` = 1
ON DUPLICATE KEY UPDATE `selected_channel` = VALUES(`selected_channel`), `updated_at` = VALUES(`updated_at`);

INSERT INTO `outbound_mail_preferences` (`user_id`, `selected_channel`, `updated_at`)
SELECT b.`userId`, 'bulk', UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000
FROM `bulk_sender_credentials` b
LEFT JOIN `outbound_mail_preferences` p ON p.`user_id` = b.`userId`
WHERE b.`connected` = 1
  AND b.`provider` <> 'sendgrid'
  AND p.`user_id` IS NULL
ON DUPLICATE KEY UPDATE `selected_channel` = VALUES(`selected_channel`), `updated_at` = VALUES(`updated_at`);
