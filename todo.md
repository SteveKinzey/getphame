# ReviewLink TODO

## Core App
- [x] Mobile PWA scaffold (Vite + React + TailwindCSS)
- [x] PWA manifest, service worker, iOS/Android meta tags
- [x] Navy/gold design system (Syne + Nunito fonts)
- [x] Bottom navigation (Home, Send, Dashboard, Settings)
- [x] Onboarding screen (login with Manus OAuth)
- [x] Home dashboard screen (stats, setup nudge, quick send CTA)
- [x] Send Request screen (customer form, Gmail send)
- [x] Dashboard/Analytics screen (activity feed, monthly progress)
- [x] Settings screen (business profile, Gmail connect, plan)
- [x] Upgrade to Pro screen (pricing, feature comparison)

## Backend & Database
- [x] Full-stack upgrade (Express + tRPC + MySQL)
- [x] Database schema (users, gmail_tokens, business_profiles, customer_requests)
- [x] Business profile CRUD (get, upsert)
- [x] Customer requests (send, list, stats)
- [x] Freemium gate (10 requests/month on free plan)

## Gmail OAuth Integration
- [x] Gmail OAuth backend (token exchange, storage, refresh, send via Gmail API)
- [x] Gmail OAuth frontend (connect button, status badge, disconnect)
- [x] Gmail callback route (/api/gmail/callback)
- [x] Review request emails sent from user's own Gmail account

## Testing
- [x] Vitest tests for Gmail procedures (authUrl, status, disconnect)
- [x] Vitest tests for profile and requests procedures
- [x] Vitest test for auth.logout

## Pending / Future
- [x] Stripe integration for Pro subscriptions ($29/mo)
- [x] Saved contacts list (re-send to repeat customers)
- [x] Custom email template editor
- [x] Follow-up reminder system (server-side, 3-day reminders)

## Stripe Integration
- [x] Stripe feature scaffold (webdev_add_feature)
- [x] Stripe backend: checkout session creation, webhook handler, subscription status
- [x] Database: stripe_subscriptions table with customerId, subscriptionId, status
- [x] Upgrade page: real Stripe checkout button replacing "coming soon" toast
- [x] Settings page: show active subscription status and manage billing link
- [x] Auto-upgrade user to Pro tier on successful Stripe payment
- [x] Auto-downgrade user to Free tier on subscription cancellation

## Legal Pages
- [x] Privacy Policy page at /privacy-policy
- [x] Terms of Service page at /terms-of-service

## WooCommerce Integration
- [x] DB schema: woo_credentials and woo_customers tables
- [x] Server: WooCommerce REST API sync (completed orders, configurable day range)
- [x] Server: bulkSend procedure (sends review requests to selected customers)
- [x] Server: duplicate prevention (already-contacted customers excluded from list)
- [x] WooCustomers page: sync button, 30/60/90 day selector, customer list, bulk send
- [x] Settings: WooCommerce credentials form (store URL, consumer key, consumer secret)
- [x] Settings: "View Customers" shortcut button when store is connected
- [x] Route registered: /woo-customers

## Branding
- [x] Renamed ReviewRocket → ReviewLink throughout codebase
- [x] localStorage key updated (review-rocket-data → review-link-data)
- [x] package.json name updated

## UI Enhancements
- [x] Pro badge component (ProBadge.tsx) — sm/md/lg sizes
- [x] Pro badge shown in Home header, Settings header, BottomNav Settings tab
- [x] Payment success page (/payment-success) with Pro perks list and CTAs

## UX Improvements
- [x] Last Synced timestamp shown in WooCommerce Settings section
- [x] Sync Orders button next to Last Synced timestamp in WooCommerce Settings section
- [x] "View new customers" action link inside sync success toast in Settings
- [x] Auto-refresh customer list in background after successful sync (Settings + WooCustomers page)
- [x] Search bar on WooCustomers page for real-time filtering by name or email
- [x] Pending/All toggle + Sent/Pending status badge on WooCustomers page
- [x] Manual Sent/Pending toggle on each WooCommerce customer row
- [x] Confirmation dialog before manual status toggle on WooCommerce customer row
- [x] Bulk Sent/Pending edit for selected customers in WooCustomers page
- [x] Last manual status change timestamp stored and displayed per customer

## New Features (Session 2)
- [x] Wire Send Request form to use user's default email template (subject + body pre-filled)
- [x] Add "Send reminder now" override button on pending reminders
- [x] Add analytics card to Dashboard showing request volume stats
- [x] Debug reviewlink.app custom domain not loading (Cloudflare Error 1000 — DNS A records point to Cloudflare IPs)

## CSV Client Import
- [x] Server: contacts.importCSV procedure (parse rows, deduplicate by email, bulk-save to saved_contacts)
- [x] CSV Import page at /import (drag-drop zone, column mapper, preview table, confirm button)
- [x] Template CSV download (first_name, last_name, email, phone, notes)
- [x] Navigation: Import button/link on Contacts page
- [x] Route registered: /import in App.tsx
- [x] Bulk-send from imported contacts works via existing Contacts flow

## Bulk Send from Contacts
- [x] Server: contacts.bulkSend procedure (send to array of contact IDs, per-contact error handling, return success/fail counts)
- [x] SavedContacts: checkbox per contact row + select-all toggle
- [x] SavedContacts: sticky "Send to X selected" bar appears when any contacts are checked
- [x] Bulk send result toast shows "X sent, Y failed" summary
- [ ] Post-import Done screen: "Send to all X new contacts now?" CTA (deferred — import routes back to /contacts where bulk-send is available)
