# Mailjet SMTP preset research

**Verified:** 2026-07-28  
**Scope:** Get Phame Bulk Sender connection preset. This document contains configuration facts only and no credentials.

Mailjet’s official SMTP relay hostname is `in-v3.mailjet.com`. Mailjet supports port `587` with TLS; Get Phame uses **port 587 with STARTTLS required** so connection testing and delivery do not fall back to an unencrypted transport.[1]

Mailjet authenticates with the account’s **API Key as the SMTP username** and **Secret Key as the SMTP password**. The normal Mailjet account password is not an SMTP credential.[1][2]

Before sending, the From address or its domain must be added to the relevant API key and validated in Mailjet. Mailjet also recommends SPF and DKIM for the sending domain.[3]

| Preset field | Get Phame value | Reason |
|---|---|---|
| Provider ID | `mailjet` | Stable internal identifier |
| SMTP host | `in-v3.mailjet.com` | Official Mailjet relay hostname[1] |
| Port | `587` | Supported message-submission port[1] |
| Security | `starttls` | Get Phame requires transport encryption |
| Username | User-entered Mailjet API Key | Mailjet’s documented username[1][2] |
| Secret | User-entered Mailjet Secret Key | Mailjet’s documented password[1][2] |
| Region selector | None | The reviewed SMTP documentation publishes one relay hostname |
| Sender prerequisite | Validated sender address or domain | Required before sending[3] |

The preset fills only the host, port, and security mode. The user supplies the API Key, Secret Key, and From address. The existing server-side SMTP `verify()` flow authenticates without sending a message, encrypts the Secret Key at rest, and never returns it through connection status.

## References

[1]: https://dev.mailjet.com/smtp-relay/configuration/ "Mailjet SMTP Relay — Configuration"
[2]: https://dev.mailjet.com/email/guides/ "Mailjet Email API — Authentication"
[3]: https://dev.mailjet.com/email/guides/senders-and-domains/ "Mailjet — Senders and domains"
