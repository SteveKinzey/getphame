-- Add the provider already supported by the user-owned bulk SMTP catalog.
-- TiDB represents this project’s provider field as a MySQL-compatible ENUM.
ALTER TABLE bulk_sender_credentials
  MODIFY COLUMN provider ENUM('sendgrid','amazon_ses','mailgun','mailjet','mailersend','smtp2go','brevo','postmark','sparkpost','elastic_email','zoho_zeptomail','socketlabs','custom_smtp') NOT NULL;
