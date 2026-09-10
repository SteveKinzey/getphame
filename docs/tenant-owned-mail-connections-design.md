# Tenant-Owned Mail Connections — Design Draft

## Decision

Get Phame acts as a **delivery relay, not a shared sender**. Customer review outreach must resolve to a mail connection created and verified by the authenticated user. Platform SendGrid remains an environment-managed administrative delivery service for operational messages such as authentication, account, billing, and support notifications. It must never appear as a preconfigured customer-outreach channel or be selected by the customer-outreach resolver.

The current application already separates personal SMTP credentials from Pro bulk-provider credentials. The required change is to make connection ownership, activation, validation, and sender selection explicit rather than allowing an implicit bulk-first route.

## User experience

The Settings page should present one **Email delivery** area with two clearly separate connection paths. Both paths begin in a disconnected state; no provider, credential, or sender address is prefilled from platform configuration.

| Path              | Intended use                                                     | Inputs                                                                                                   | Connection result                                       |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Business email    | Everyday, lower-volume individual outreach                       | Email address, app password or SMTP password, optional advanced host/port/TLS, sender name, reply-to     | Authenticated SMTP connection owned by the current user |
| Bulk mail service | Higher-volume delivery through a user-owned Pro provider account | Provider preset or custom relay, provider SMTP username and secret, verified sender address, sender name | Authenticated external relay owned by the current user  |

The user first chooses a path, then chooses a provider. The bulk-provider list excludes **SendGrid** because the platform’s SendGrid integration is administrative-only. The choices retain user-owned providers such as Amazon SES, Mailgun, Mailjet, MailerSend, SMTP2GO, Brevo, Postmark, SparkPost, Elastic Email, Zoho ZeptoMail, SocketLabs, and Custom SMTP.

Each form has four visible states: **Not connected**, **Checking connection**, **Connected**, and **Needs attention**. “Connected” means the provider accepted a non-delivery SMTP authentication check. It does not claim that a different From address is provider-verified; bulk-provider users must confirm their sender address or domain in their own provider account.

The connection form must preserve keyboard navigation, visible focus, a password reveal control, disabled submit while a check is in progress, and a retry action after a safe error message. Credential inputs use `autocomplete="new-password"`, are cleared immediately after a successful request, and are never populated from stored data.

## Database model

The existing `smtp_credentials` and `bulk_sender_credentials` records remain the credential stores during the initial migration. This avoids unnecessarily moving encrypted tenant secrets while the behavior change is introduced.

| Record                      | Required additions                                                                                               | Purpose                                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `smtp_credentials`          | `provider_id`, `verification_status`, `last_verified_at`, `last_error_code`, `last_error_at`                     | Distinguishes a provider type from raw host data and gives a safe, tenant-visible validation state without exposing a secret or raw provider response.                                                                                                     |
| `bulk_sender_credentials`   | `verification_status`, `last_verified_at`, `last_error_code`, `last_error_at`, `sender_verification_attested_at` | Separates connection authentication from the user’s confirmation that the configured From address/domain is verified in their own bulk provider. `apiKey` remains encrypted legacy storage until a later, carefully migrated rename to `encrypted_secret`. |
| `outbound_mail_preferences` | `user_id` unique, `selected_channel` (`personal` or `bulk`), `updated_at`                                        | Makes the customer-outreach route an explicit per-user choice. It prevents a bulk connection from silently taking precedence over personal SMTP.                                                                                                           |
| `mail_connection_events`    | `user_id`, `channel`, `event_type`, `outcome`, `reason_code`, `occurred_at`                                      | Optional privacy-bounded audit history for connect, validation, disconnect, and selection events. It contains no credential, raw provider response, recipient, or message content.                                                                         |

All connection lookups, updates, tests, and disconnects must be scoped to `ctx.user.id`. Encrypted secrets stay in their current AES-256-GCM fields, are decrypted only at the point of a connection test or delivery attempt, and are never returned through a procedure, log, UI payload, or audit record.

## Server validation contract

The server owns all validation. The browser can preflight form completeness but cannot establish a connection or authorize a delivery channel.

| Boundary             | Required behavior                                                                                                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider eligibility | Reject `sendgrid` from every user-owned bulk connection procedure. Existing legacy rows are surfaced only as a migration-needed state and cannot be used for customer outreach.                                                                                                               |
| Sender routing       | Resolve only the current user’s selected, successfully verified connection. Fail closed with a setup prompt if the preference is missing, disconnected, or needs attention. Platform system email bypasses this resolver through a separate administrator-only function.                      |
| Custom hosts         | Canonicalize hostnames; reject schemes, paths, localhost, private, link-local, loopback, multicast, and reserved IP addresses; resolve DNS before connecting; restrict ports to the supported submission ports (465, 587, or 2525). Apply the same protection to personal SMTP and bulk SMTP. |
| Transport checks     | Use a TLS-verified SMTP `verify()` call with bounded connection, greeting, and socket timeouts. A test does not send mail. Use strict certificate validation and never allow a user request to downgrade TLS validation.                                                                      |
| Credential updates   | Verify before persisting. A failed candidate connection cannot overwrite a working saved connection. Successful updates atomically save the encrypted replacement, validation state, and timestamp.                                                                                           |
| Error reporting      | Return a stable, actionable reason code and user-safe message. Do not return raw SMTP, TLS, DNS, or authentication provider messages.                                                                                                                                                         |
| Abuse controls       | Preserve consent, suppression, quiet hours, adaptive per-provider send limits, idempotency, and stop-after-completion controls after a connection is selected.                                                                                                                                |

## Validation reason codes

| Code                              | User-facing recovery                                                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SMTP_AUTH_FAILED`                | Check the provider username and app password or SMTP password, then try again.                                                                                                               |
| `GOOGLE_APP_PASSWORD_REQUIRED`    | Use a newly created Google App Password rather than the regular account password.                                                                                                            |
| `GOOGLE_APP_PASSWORD_UNAVAILABLE` | Confirm that 2-Step Verification is enabled. If the option is still unavailable, use the account’s approved OAuth option or ask the Workspace administrator about the organisation’s policy. |
| `SMTP_AUTH_DISABLED`              | Ask the provider or business email administrator to enable authenticated SMTP for this mailbox.                                                                                              |
| `SMTP_HOST_UNRESOLVABLE`          | Recheck the provider host or selected region.                                                                                                                                                |
| `SMTP_CONNECTION_REFUSED`         | Recheck the host, supported port, and TLS mode.                                                                                                                                              |
| `SMTP_TLS_FAILED`                 | Use the provider’s TLS-enabled endpoint and current certificate chain.                                                                                                                       |
| `SENDER_NOT_VERIFIED`             | Verify the From address or domain inside the user’s own bulk-mail provider, then retry delivery.                                                                                             |
| `CONNECTION_RATE_LIMITED`         | Wait briefly, then retry. Repeated connection attempts are throttled per user and destination.                                                                                               |

## Gmail App Password guidance

The Gmail guide should say that an App Password is used only because SMTP does not present a Google OAuth sign-in inside Get Phame. It must not describe the App Password as the user’s normal Google password.

> **Gmail App Password — 4 steps.** Open `myaccount.google.com` and select **Security**. Turn on **2-Step Verification**. Open `myaccount.google.com/apppasswords`, name the password **Get Phame**, and select **Create**. Paste the 16-character code into Get Phame without spaces.

The collapsed help text should add that the code is shown once, must be recreated after a Google Account password change, and should be revoked in Google Account settings when the connection is removed or no longer needed. If Google says the password is incorrect, the user should generate a fresh App Password and ensure they did not enter their normal Google password.

## Google Workspace App Password guidance

Google Workspace uses the same account-security pages and SMTP endpoint when the organisation permits App Passwords. The Workspace path differs only because the user cannot override organisation policy.

> **Google Workspace App Password — 4 steps.** Sign in to the Workspace mailbox at `myaccount.google.com`, select **Security**, and enable **2-Step Verification** if it is available for the account. Open `myaccount.google.com/apppasswords`, name the password **Get Phame**, select **Create**, then paste the 16-character code into Get Phame without spaces.

If **App Passwords** is unavailable, the guide must not tell the user or administrator to re-enable “Less secure app access.” Google removed that administrative setting and limits password-based programmatic sign-ins. Instead, the UI explains that the account may be restricted by an organisation policy, security-key-only 2-Step Verification, or Advanced Protection; the user should ask their Workspace administrator for the approved SMTP or OAuth-based connection method. [1] [2]

## Acceptance criteria

The implementation is ready when no ordinary user can view, connect, inherit, select, or send customer outreach through platform SendGrid; an unconnected user cannot send customer outreach; and a connected user can deliberately select only their own verified business SMTP or bulk-provider connection. Automated tests must reproduce each positive and negative route, including tenant isolation, legacy SendGrid denial, safe custom-host rejection, credential non-return, and Gmail or Workspace-specific recovery copy.

## References

[1]: https://support.google.com/mail/answer/185833 "Google Account Help: Sign in with app passwords"
[2]: https://knowledge.workspace.google.com/admin/apps/control-access-to-less-secure-apps "Google Workspace Admin Help: Control access to less secure apps"

## Responsive review record

On August 13, 2026, the Settings route was reviewed at 375×812 and 1280×720. The mail-connection cards remained within the responsive single-column content flow, provider controls retained their touch-sized fields, and the bulk relay setup did not display a default SendGrid selection. This visual review did not attempt a live credential connection or send an email.

After the final state-message update, the Settings route was rechecked at the same 375×812 and 1280×720 breakpoints. The connected personal SMTP card, bulk-provider card, legacy-platform warning placement, and form recovery paths remained within their responsive containers. The review did not use real provider credentials, so active, not-selected, needs-attention, and legacy-blocked **logic** is covered by automated regressions rather than live account state changes.

The final rendered-state component was then rechecked at both breakpoints. It preserved the Settings layout and showed no overflow or viewport-specific error in the authenticated development view. Its five rendered-state assertions verify the visible active, not-selected, needs-attention, legacy-blocked, and localized recovery paths independently of the live account’s current connection state.

The Settings-specific status wrappers were also rechecked at 375×812 and 1280×720 after integration into both personal SMTP and bulk-provider cards. The cards remained contained in the Settings layout at both breakpoints, and the integration is covered by rendered regression tests for active, not-selected, needs-attention, and legacy-blocked status inputs.

## Platform relay boundary

The platform SendGrid relay is **server-managed operational infrastructure**, not a customer-outreach provider. The call-site review found it is retained for platform transaction and support workflows such as authentication, account-related notifications, lead-guide delivery, support handling, and the administrator email-preview send. These operational messages may be delivered to a non-administrator recipient when that is the purpose of the workflow; they are not a SendGrid capability exposed to that recipient.

By contrast, customer review requests, quiet-hours queued requests, scheduled follow-ups, and user-triggered reminder sends now enter `sendTenantOwnedReviewEmail()`. That wrapper always marks delivery as review outreach, which requires the explicitly selected personal SMTP or user-owned bulk-provider channel. Legacy SendGrid rows are neither selectable nor resolvable for that channel. The administrator-only `sendTestEmail` procedure remains the sole manually triggered platform-email preview path.
