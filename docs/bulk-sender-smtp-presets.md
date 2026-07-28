# Bulk Sender SMTP preset research

Verified on 2026-07-28 against each provider's official documentation. This document records configuration facts only; it contains no credentials.

| Provider | SMTP host and region rule | Recommended port/security | Username rule | Secret rule | Official source |
|---|---|---|---|---|---|
| SendGrid | `smtp.sendgrid.net` | `587` + STARTTLS | Literal `apikey` | API key with Mail permission | [Twilio SendGrid SMTP API](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/integrating-with-the-smtp-api) |
| Amazon SES | `email-smtp.<aws-region>.amazonaws.com`; endpoint and credentials must use the same AWS region | `587` + STARTTLS | Region-specific SES SMTP username | IAM-derived SES SMTP password, not an AWS secret access key | [Amazon SES SMTP connection](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html) |
| Mailgun | US: `smtp.mailgun.org`; EU: `smtp.eu.mailgun.org` | `587` + STARTTLS | Domain-specific full SMTP login | Domain-specific SMTP password | [Mailgun SMTP sending](https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/send-smtp) |
| Mailjet | `in-v3.mailjet.com` | `587` + STARTTLS | Mailjet API Key | Mailjet Secret Key, not the account password | [Mailjet SMTP relay configuration](https://dev.mailjet.com/smtp-relay/configuration/) |
| MailerSend | `smtp.mailersend.net` | `587` + STARTTLS | Generated SMTP username | Generated SMTP password | [MailerSend SMTP relay](https://www.mailersend.com/help/smtp-relay) |
| SMTP2GO | Default: `mail.smtp2go.com`; US: `mail-us.smtp2go.com`; EU/UK: `mail-eu.smtp2go.com`; EU-only: `mail-eu2.smtp2go.com`; AU: `mail-au.smtp2go.com` | `2525` + STARTTLS | SMTP User username | SMTP User password | [SMTP2GO settings](https://support.smtp2go.com/hc/en-gb/articles/223087627-SMTP-Settings) |
| Brevo | `smtp-relay.brevo.com` | `587` + STARTTLS | SMTP login email | SMTP key, not API key | [Brevo transactional SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP) |
| Postmark | `smtp.postmarkapp.com` | `587` + STARTTLS | Server API Token | Same Server API Token | [Postmark SMTP](https://postmarkapp.com/developer/user-guide/send-email-with-smtp) |
| SparkPost | US: `smtp.sparkpostmail.com`; EU: `smtp.eu.sparkpostmail.com` | `587` + STARTTLS | Literal `SMTP_Injection` | API key with Send via SMTP permission | [SparkPost SMTP API](https://developers.sparkpost.com/api/smtp/) |
| Elastic Email | `smtp.elasticemail.com` | `2525` + STARTTLS | Account email or configured SMTP login | Generated SMTP password | [Elastic Email SMTP settings](https://help.elasticemail.com/en/articles/4803409-smtp-settings) |
| Zoho ZeptoMail | `smtp.zeptomail.com` | `587` + STARTTLS | `emailapikey` or the configured From address, per account instructions | Generated ZeptoMail SMTP password | [ZeptoMail SMTP](https://www.zoho.com/zeptomail/help/smtp-home.html) |
| SocketLabs | `smtp.socketlabs.com` | `587` + STARTTLS | SocketLabs SMTP username | SocketLabs SMTP password | [SocketLabs SMTP connections](https://help.socketlabs.com/docs/smtp-connections) |
| Custom SMTP | User-supplied host with no guessed default | User-selected; prefer `587` + STARTTLS when supported | User-supplied | User-supplied | [RFC 6409 Message Submission](https://datatracker.ietf.org/doc/html/rfc6409) |

## Product rules

Preset selection may fill host, port, security, and fixed username values, but users must always be able to review the resulting configuration before testing. Custom SMTP must never guess a hostname or credentials. Provider secrets remain encrypted at rest and are never returned to the client after connection. Connection testing authenticates without sending a message. Region-dependent providers must update their host when the region changes. Existing SendGrid, Mailgun, and Postmark records remain backward compatible during migration.
