# Project TODO

- [x] Trace every outbound mail route and identify where platform SendGrid can be selected or used for customer outreach.
- [x] Draft and implement a tenant-scoped mail connection schema that stores encrypted credentials and provider validation metadata without persisting secrets in plaintext.
- [x] Add executable regression coverage proving tenant-owned routing for review requests, queued delivery, scheduled reminders, and send-now reminders.
- [x] Keep platform SendGrid server-managed for operational email only, block it from user-owned outreach, and retain an administrator-only boundary for manually triggered platform email previews.
- [x] Complete the Settings mail-state experience with an actionable needs-attention state and cover all connection states with UI regression tests.
- [x] Review and incorporate Gmail and Google Workspace App Password setup, policy restrictions, and connection-error guidance.
- [x] Add integrated Settings mail-card regression coverage for rendered mail-connection states; routing and authorization coverage are complete.
- [x] Run full tests, TypeScript checks, production build, and mobile/desktop verification.
- [ ] Save a validated release checkpoint and synchronize the exact release tree with GitHub main.
- [x] Fix the CI-only email-tracking-secret setup in reminder delivery regression tests, revalidate, and update the release pull request.
- [x] Audit every `sendSystemEmail` call site and document the distinction between server-managed operational mail and administrator-triggered platform previews.
- [x] Verify queued delivery and send-now reminder paths fail closed when a tenant-owned channel is absent or not selected.
- [x] Add real rendered UI regression coverage for active, not-selected, needs-attention, and legacy-blocked states in Settings.
- [x] Add procedure-level authorization coverage proving non-admin users cannot trigger manually initiated platform email previews.
