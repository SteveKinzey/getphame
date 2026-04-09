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
- [x] Post-import Done screen: routes to /contacts where bulk-send is immediately available (Select All + Send to X)

## Gmail API Fix + Dormancy Filter
- [x] Settings page: show Gmail API not-enabled warning with direct link to enable it when Gmail is connected but sends fail
- [x] Settings page: Gmail API warning card shown in connected state with direct Enable link to Google Cloud Console
- [x] SavedContacts: "Last contacted" dormancy filter (All / Not in 30d / Not in 60d / Not in 90d)
- [x] SavedContacts: filter persists during session, works with existing search and bulk-select

## Font Update
- [x] Switch heading font from Syne to Poppins (Google Fonts import + CSS variable + all TSX files)

## SEO Fixes — Home Page (/)
- [x] Page title: set to 45 chars — "ReviewLink — Send Google Review Requests Fast" (index.html + useEffect)
- [x] Add H2 heading with keywords to the home page content
- [x] Add keyword-rich visible text to home page (review requests, Google reviews, etc.)
- [x] Set meta description in index.html (already present, verified)

## Contact Tags / Groups
- [x] Schema: add `tags` JSON column to saved_contacts table, run db:push
- [x] Server: contacts.setTags procedure (update tags array for a contact)
- [x] Server: contacts.list returns tags field
- [x] UI: tag chips on each contact card (add/remove inline)
- [x] UI: tag filter pill row (filter contacts list by tag)
- [x] UI: bulk-send respects tag filter (select all filtered by tag)

## Review Request Status Tracking
- [x] Schema: add `respondedAt` bigint nullable to customer_requests table, run db:push
- [x] Server: requests.markResponded mutation (set respondedAt = now)
- [x] UI: "Left a review" toggle button on each request in the Dashboard activity log
- [x] UI: show "Reviewed" (gold) vs "Sent" (green) badge on each request row

## Delete Contacts
- [x] Verify delete button exists and works on SavedContacts page (Trash2 icon + confirm dialog)
- [x] Ensure delete confirmation dialog is present before deletion (AlertDialog with contact name)

## Gmail API Daily Health Check
- [x] Server: gmailHealthCheck() function — tests Gmail API access using stored OAuth tokens
- [x] Server: wire health check into daily cron scheduler (runs every 24h, initial check 30s after startup)
- [x] Server: send owner notification via notifyOwner() if API is disabled or tokens are invalid
- [x] Server: avoid duplicate alerts — only notify once per 23h window while broken, resets on recovery

## Beta Access Code System
- [x] Schema: access_codes table (code, maxUses, usedCount, expiresAt, createdBy, note)
- [x] Schema: access_code_redemptions table (codeId, userId, redeemedAt)
- [x] DB: run db:push to migrate new tables
- [x] Server: accessCodes.create procedure (admin only — generate code with options)
- [x] Server: accessCodes.redeem procedure (validate code, upgrade user to Pro, record redemption)
- [x] Server: accessCodes.list procedure (admin only — list all codes with usage stats)
- [x] Server: accessCodes.revoke procedure (admin only — deactivate a code)
- [x] UI: redeem code input on Upgrade page (below Stripe button)
- [x] UI: admin /admin/codes page to create, list, and revoke codes
- [x] UI: route /admin/codes registered in App.tsx (owner-only)

## Footer Legal Links
- [x] Add Privacy Policy and Terms of Service links to the app footer (Settings page, below Sign Out)

## Footer Redesign
- [x] Move legal links out of Settings page, into a global gold footer strip below the bottom nav bar
- [x] Gold background (oklch(0.80 0.18 80)), dark navy link text, Poppins font
- [x] Adjust page bottom padding to account for nav bar + footer height (existing pb-24 covers both)

## Back Button Fix
- [x] Fix back button on Privacy Policy page (window.history.back() with / fallback)
- [x] Fix back button on Terms of Service page (window.history.back() with / fallback)

## From Name / Reply-To Setting
- [x] Add fromName and replyTo columns to users/profiles table in DB schema
- [x] Add From Name and Reply-To input fields to Settings page
- [x] Save fromName and replyTo via tRPC procedure
- [x] Wire fromName and replyTo into Gmail send logic (review requests + follow-ups)
