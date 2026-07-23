# Mailjet SMTP Preset Research

**Verified:** 2026-07-22
**Scope:** Get Phame Bulk Sender connection preset. This document contains configuration facts only and no credentials.

Mailjet’s current SMTP relay hostname is `in-v3.mailjet.com`. Its official configuration page lists ports `25`, `80`, `587`, `588`, and `2525` with optional TLS, plus port `465` with SSL. For Get Phame, the safe default is **port 587 with STARTTLS required**; port 465 remains available through Custom SMTP when a user has a provider-specific reason to use implicit TLS.[1]

Mailjet authenticates SMTP with the account’s **API Key as the username** and **Secret Key as the password**. The Secret Key is displayed only once when created, so the UI must label it accurately, never imply that the normal Mailjet account password is valid, and direct users to create or reset the key in Mailjet when necessary.[2] [3]

Before sending, the From address or domain must be added to the relevant API key and validated. Mailjet recommends configuring SPF and DKIM for the sending domain. A single-sender address can be validated through an activation email; a domain can be validated through DNS.[4] [5]

| Preset field | Verified Get Phame value | Rationale |
|---|---|---|
| Provider ID | `mailjet` | Stable internal identifier |
| Label | `Mailjet` | Current product name used in Mailjet documentation |
| SMTP host | `in-v3.mailjet.com` | Current official relay hostname[1] |
| Port | `587` | Standard submission port supported by Mailjet[1] |
| Security | `starttls` | Get Phame requires transport encryption rather than using Mailjet’s optional-unencrypted mode |
| Username mode | `user` | Each account/API key has its own public API Key; there is no fixed literal username[2] |
| Username label | `Mailjet API key` | Prevents users from entering their Mailjet account email |
| Secret label | `Mailjet Secret key` | Prevents users from entering their normal account password |
| Region selector | None | The reviewed official SMTP documentation publishes one relay hostname and no US/EU SMTP endpoint choice[1] [2] |
| Sender prerequisite | Validated sender address or domain | Required by Mailjet before sending[4] |

Mailjet’s current free plan includes SMTP Relay and allows up to 6,000 emails per month, capped at 200 per day. Get Phame must continue enforcing its own lower account/provider reputation limits and must not represent the Mailjet plan allowance as guaranteed sending capacity.[6]

Mailjet recommends two-factor authentication for account access and regular API Secret Key rotation. Get Phame should continue encrypting the Secret Key at rest, never return it after connection, avoid logging it, and allow the existing reconnect flow to replace a rotated key.[7]

## Product decision

Mailjet is suitable for a first-class Get Phame Bulk Sender preset. The preset should autofill only the host, port, and security mode; the user must enter the API Key and Secret Key, confirm the From address, and complete Mailjet’s sender/domain verification. The existing server-side `verify()` connection test remains appropriate because it authenticates without sending a message. No region control or Mailjet account-password field should be introduced.

## References

[1]: https://dev.mailjet.com/smtp-relay/configuration/ "Mailjet SMTP Relay — Configuration"
[2]: https://dev.mailjet.com/smtp-relay/overview/ "Mailjet SMTP Relay — Overview"
[3]: https://documentation.mailjet.com/hc/en-us/articles/360043229473-How-can-I-configure-my-SMTP-parameters "How can I configure my SMTP parameters?"
[4]: https://dev.mailjet.com/email/guides/senders-and-domains/ "Mailjet — Senders and domains"
[5]: https://dev.mailjet.com/email/guides/verify-your-domain/ "Mailjet — Verify your domain"
[6]: https://www.mailjet.com/pricing/ "Mailjet pricing and free-plan limits"
[7]: https://documentation.mailjet.com/hc/en-us/articles/17997435937563-Securing-Your-Mailjet-Account-A-Step-by-Step-Guide "Securing Your Mailjet Account"
