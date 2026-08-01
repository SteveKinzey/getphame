# Get Phame Role-Aware Manual Inventory

This inventory is derived from the current application routes, navigation, pricing comparison, settings gates, and administrator hub. It is the content and access-control contract for the in-app manuals.

## Manual visibility contract

- The application exposes one authenticated route: `/manual`.
- A non-administrator sees only the **User Manual** title, navigation, and content.
- An administrator sees only the **Admin Manual** title, navigation, and content.
- The Admin Manual contains all shared user guidance plus administrator-only sections. It does not render a second User Manual entry or view.
- The Manual navigation item appears immediately after Settings. Its label is role appropriate.

## User Manual: shared and free-plan guidance

1. Getting started: magic-link sign-in, onboarding checklist, business profile, language, install/share guidance, and first request.
2. Home and navigation: Home, Send Request, Dashboard, Developer Integrations, Settings, Manual, account menu, theme, and offline/network status.
3. Account profile, privacy, and security: display name, avatar, sign-in email, passkeys, recovery methods, verified Get Phame safeguards, data-minimization responsibilities, privacy choices and requests, safe vulnerability reporting, logout, and account deletion.
4. Business and review setup: business identity, review destination/platform links, default platform, and Yelp compliance behavior.
5. Email connection: supported SMTP providers, app-password guidance, sender identity, connection testing, and troubleshooting.
6. Sending review requests: individual outreach, consent, compliant copy, customer details, preview, send status, and free-quota messaging.
7. Contacts and import: saved contacts, CSV import, duplicate handling, and contact management.
8. Follow-up reminders: reminder settings, scheduled reminders, cancellation, and the rule that future reminders stop when the requested customer action completes.
9. Templates and message settings: email template controls and preview behavior, with paid-only labels where the app requires a subscription.
10. Dashboard, tracking, and reviews: request activity, contacts/history retention, review activity, and the difference between basic and advanced analytics.
11. Developer Integrations and Sources: API keys, webhook/source setup, Zapier and Make recipes, source attribution, import analytics, and health status.
12. Referrals, support, billing, compliance, privacy, data use, security policy, changelog, and cancellation.

## Explicit paid-subscription labels

The following implemented capabilities must display a visible **Paid subscription only** badge or equivalent statement wherever they appear in the manual:

- Unlimited review requests. Free accounts receive 10 initial requests and then 5 requests per rolling 30 days.
- WooCommerce synchronization.
- Email open and click tracking.
- Advanced analytics.
- Unlimited multi-platform review links; Free supports one.
- Higher daily sending limit: 500/day for paid plans versus 50/day for Free.
- Priority support.
- Future updates while a recurring plan is active; lifetime includes future updates forever.
- Custom email templates where the current upgrade experience presents them as a paid benefit.
- Bulk Sender / transactional email service connection.
- Paid referral reward eligibility; free users may share a referral link but do not receive the free-month reward until eligible.

The current Upgrade comparison also lists saved contacts, CSV import, and follow-up reminders as available on Free. The manual must not label those items as paid-only. Recurring subscribers keep access through the end of the paid period; after cancellation the account returns to Free while contacts and history remain.

## Administrator-only manual guidance

The Admin Manual adds these sections after the complete shared user guidance:

1. Administration hub and operations analytics CSV export.
2. User management, search, account state, tier/life access, account merging, connection cleanup, and safe destructive operations.
3. Authentication health: 24-hour checks, magic-link diagnostics, saved views, audit history, uptime, sanitized CSV preview/export, alerts, and recovery workflows.
4. SMTP health: failing connections, re-tests, aggregate health, and owner-safe diagnostics.
5. Reminder operations and performance.
6. Support inbox: triage, priority, assignment, SLA reporting, custom date ranges, CSV export, escalation, abuse safeguards, and resolution.
7. System access codes: creation, review, and revocation.
8. Revenue controls: Stripe promotions and temporary access grants.
9. Revenue analytics: MRR, ARR, conversion, and growth.
10. Churn analytics and retention signals.
11. Referral operations and deferred reward processing.
12. Koalendar recovery: failed import inspection and retry.
13. PWA install/share conversion, caption-language selections, onboarding funnel analytics, comparison periods, AI insights, and aggregate CSV exports.
14. Operations alerts and system-health trends.
15. Security and data-protection operations: accurate customer-facing claims, least-privilege data handling, incident containment and recovery, privacy and deletion requests, and release-verification controls.

## Source files used as authority

- `client/src/App.tsx`
- `client/src/components/AppLayout.tsx`
- `client/src/components/BottomNav.tsx`
- `client/src/pages/Settings.tsx`
- `client/src/pages/Upgrade.tsx`
- `client/src/pages/AdminDashboard.tsx`
- `shared/plans.ts`
- `server/_core/trpc.ts`
- `server/entitlements.ts`
