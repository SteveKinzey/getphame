# Paused Automation and Provider Restoration Validation

The root dashboard desktop view displays the tenant mail-health status directly beneath the summary cards. When a saved mail channel is usable, the normal healthy state is shown; the paused-automation warning is conditioned on the tenant-scoped queue response and does not appear for an empty queue.

The Settings desktop view renders the recovered provider configuration surface and the paused-automation recovery section inside the authenticated account page. The broad provider selector is driven by the restored catalog, while legacy platform-style SendGrid records remain blocked unless a user reconnects their own verified SendGrid SMTP account.

The provider catalog migration was reconciled with the TiDB `bulk_sender_credentials.provider` enum. Live schema inspection confirmed support for all thirteen catalog values, including `sendgrid` and `mailjet`.

The mobile root dashboard retains the mail-health status immediately below the compact summary cards, with both the help and recovery affordances reachable at the narrow breakpoint. The full mobile Settings view preserves the provider configuration and paused-automation sections in the account flow without horizontal overflow.
