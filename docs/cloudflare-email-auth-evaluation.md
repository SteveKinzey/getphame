# Cloudflare Email and Access Evaluation

## Cloudflare Email Service

Source: https://developers.cloudflare.com/email-service/

Cloudflare Email Service can send outbound transactional email through Workers bindings, a REST API, or authenticated SMTP. Email Sending is currently marked beta.

Source: https://developers.cloudflare.com/email-service/api/send-emails/smtp/

Authenticated SMTP endpoint:

- Host: `smtp.mx.cloudflare.net`
- Port: `465`
- Security: implicit TLS
- Username: literal `api_token`
- Password: Cloudflare API token with `Email Sending: Edit`
- Sender domain must be onboarded for Email Sending in the same Cloudflare account.

Source: https://developers.cloudflare.com/email-service/get-started/send-emails/

Onboarding a sender domain adds bounce MX, SPF, DKIM, and DMARC records. The existing GetPhame Nodemailer integration could use Cloudflare SMTP without moving the app to Workers.

Source: https://developers.cloudflare.com/email-service/platform/pricing/

Cloudflare Email Service permits free sends only to verified destination addresses. Sending to arbitrary recipients requires Workers Paid. Workers Paid includes 3,000 outbound emails per month, then costs $0.35 per 1,000.

Source: https://developers.cloudflare.com/email-service/examples/email-sending/magic-link/

Cloudflare documents a native magic-link email pattern, but the example is a Worker implementation and does not itself create GetPhame application users or issue GetPhame session cookies.

## Cloudflare Zero Trust Access

Source: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/

Cloudflare Access offers email one-time PIN authentication as an alternative to an external identity provider. This is a distinct product and architecture from Cloudflare Email Service. Access authenticates users at Cloudflare's edge before a request reaches the protected origin. Further analysis is required to map the Access identity assertion into GetPhame's user creation, onboarding routing, and application session model and to prevent bypass through the direct `manus.space` domains.

## Public GetPhame Login Decision

GetPhame must permit public signup by any valid customer email address. Cloudflare Zero Trust Access OTP is therefore not the primary authentication layer: it is an edge-access policy system, sends a PIN from Cloudflare, and does not perform GetPhame's native user provisioning, onboarding, or session issuance.

GetPhame should retain its existing in-application magic-link flow and use a dedicated transactional mail transport for `GetPhame <no-reply@getphame.com>`.

## Resend Free-Tier Candidate

Official Resend documentation reviewed on 2026-07-11 confirms:

- Free transactional quota: 100 emails per day and 3,000 emails per month.
- The free plan includes one verified sending domain.
- A verified domain is required, and Resend provides SPF and DKIM records while surfacing DMARC configuration in the domain dashboard.
- Existing Nodemailer code can use Resend SMTP without an architectural rewrite.
- SMTP host: `smtp.resend.com`.
- Recommended implicit TLS port: `465`.
- SMTP username: `resend`.
- SMTP password: a scoped Resend API key, not a personal mailbox password.
- Visible sender can remain `GetPhame <no-reply@getphame.com>` after domain verification.

Sources:

- https://resend.com/pricing
- https://resend.com/docs/knowledge-base/account-quotas-and-limits
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/send-with-smtp

## Resend Domain Onboarding — 2026-07-12

Resend accepted the configured API key and created `getphame.com` as domain ID `d3fc9886-6107-4658-96a8-ca935a55d534`. Its initial state is `not_started`. The required Cloudflare DNS records are:

| Purpose      | Type | Name                | Value                                                                                                                                                                                                                        | Priority |
| ------------ | ---- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| DKIM         | TXT  | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7RWXTMdtxUnC8nklsSproBQDg9ZkxdnNWtR4wdTEDchuWtBuz8UyzopQG3wrgPTlmX06jqh3weObV6yvWInqDSWwNhZ+cS07ne5Dy/y2rS4R1vngK/ahIbRvwW4h4xa6Jabs0FJwDcUP11ZaIvnryrRIg9JMyihMh8+vXWLfNnQIDAQAB` | —        |
| SPF feedback | MX   | `send`              | `feedback-smtp.us-east-1.amazonses.com`                                                                                                                                                                                      | `10`     |
| SPF policy   | TXT  | `send`              | `v=spf1 include:amazonses.com ~all`                                                                                                                                                                                          | —        |

The connected Cloudflare integration does not expose DNS-record write operations. The Cloudflare dashboard was opened at `https://dash.cloudflare.com/?to=/:account/getphame.com/dns/records`, but the browser session requires the account owner to sign in before the records can be created.
