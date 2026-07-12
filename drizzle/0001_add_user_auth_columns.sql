ALTER TABLE `users`
  ADD COLUMN `password_hash` text NULL,
  ADD COLUMN `default_from_email` text NULL,
  ADD COLUMN `default_from_name` text NULL;
