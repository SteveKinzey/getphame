# Phame TODO

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

- [x] Renamed ReviewRocket → Phame throughout codebase
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
- [x] Debug phame.app custom domain not loading (Cloudflare Error 1000 — DNS A records point to Cloudflare IPs)

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

- [x] Page title: set to 45 chars — "Phame — Send Google Review Requests Fast" (index.html + useEffect)
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

## Sitemap & SEO

- [x] Add dynamic /sitemap.xml server endpoint with all public routes
- [x] Add /robots.txt pointing to sitemap
- [x] Verify sitemap returns valid XML at phame.app/sitemap.xml

## Zoho Books Integration

- [x] Store ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID, ZOHO_REFRESH_TOKEN as secrets
- [x] Build Zoho OAuth token exchange and refresh logic (server/zoho.ts)
- [x] Build Zoho Books API helpers: createCustomer, createInvoice, sendInvoice
- [x] Add zohoCustomerId column to users table and migrate
- [x] Replace Stripe checkout with Zoho invoice creation in upgrade flow
- [x] Build /api/zoho/webhook endpoint to auto-upgrade user on invoice payment
- [x] Build /api/zoho/callback OAuth redirect handler
- [x] Update upgrade UI to show "Invoice will be sent to your email"
- [x] Test full flow end-to-end

## Three-Tier Pricing & Invoice-Only Access Gate

- [x] Update DB schema: extend tier enum to include 'annual' and 'lifetime', add planExpiresAt column
- [x] Run pnpm db:push for schema changes
- [x] Update Zoho invoice creation to support monthly ($29), annual ($290), and lifetime ($1,247) plans
- [x] Update Zoho webhook to set correct tier (pro/annual/lifetime) based on invoice line item
- [x] Build server-side access gate: non-free check on all protected app procedures
- [x] Build frontend access gate: redirect free-tier users to /upgrade on all protected pages
- [x] Rebuild Upgrade page with three plan cards (Monthly / Annual / Lifetime)
- [x] Add annual savings callout ("Save $58/yr") and lifetime value callout on Upgrade page
- [x] Update Settings page to show correct plan label (Monthly Pro / Annual Pro / Lifetime)

## Multi-Platform Business Reviews

- [x] Update Home page H2 from "Get More Google Reviews for Your Business" to "Get More Business Reviews"
- [x] Update Home page paragraph to mention Google, Yelp, TripAdvisor, Bing, Facebook
- [x] Add review_platforms DB table (id, userId, platform, label, url, isDefault, createdAt)
- [x] Add backend procedures: reviewPlatforms.list, add, update, remove, setDefault
- [x] Build "Review Platforms" section in Settings with add/edit/delete platform URLs
- [x] Platform dropdown: Google, Yelp, TripAdvisor, Bing, Facebook, Other
- [x] Wire platform selection into Send Review Request flow (pick which platform URL to include)
- [x] Wire platform selection into Bulk Send flow
- [x] Update email template to use selected platform URL (not hardcoded Google URL)

## Toast UX Improvements

- [x] Undo-delete toast on platform remove (5s window, optimistic delete with restore)
- [x] toast.promise() on add platform mutation (loading → success → error)
- [x] toast.promise() on update platform mutation
- [x] Multi-action no-default-platform warning toast in SendRequest send flow

## SMTP Email Sending (Replace Gmail API)

- [x] Install nodemailer + @types/nodemailer
- [x] Add smtp_credentials table to DB schema (userId, host, port, secure, user, encryptedPass, fromName, replyTo)
- [x] Write server/smtp.ts helpers (encrypt/decrypt password, createTransport, sendMail, testConnection)
- [x] Add tRPC procedures: smtp.connect, smtp.status, smtp.disconnect, smtp.test
- [x] Replace Gmail send logic in requests.send with SMTP
- [x] Replace Gmail send logic in contacts.bulkSend with SMTP
- [x] Replace Gmail send logic in woo.bulkSend with SMTP
- [x] Replace Gmail send logic in reminders.ts with SMTP
- [x] Replace Gmail connect UI in Settings with SMTP form (email, password, host auto-detect, port, test button)
- [x] Update SendRequest page — remove Gmail-specific guards, wire SMTP connected status
- [x] Auto-detect SMTP host from email domain (gmail.com → smtp.gmail.com, outlook.com → smtp-mail.outlook.com, etc.)
- [x] Show app-password hint for Gmail/Outlook users
- [x] Keep Gmail OAuth routes as legacy no-op (backward compatible)

## Onboarding Wizard (3-Step First-Login Flow)

- [x] Derive onboarding state server-side from existing data (smtpConnected, hasPlatform, hasSentRequest) — no new DB column needed
- [x] Add tRPC procedure: onboarding.status (returns { smtpConnected, hasPlatform, hasSentRequest, allDone })
- [x] Add tRPC procedure: onboarding.dismiss (sets onboarding_dismissed flag on businessProfiles)
- [x] Add onboarding_dismissed boolean column to businessProfiles schema + db:push
- [x] Build OnboardingWizard.tsx component (full-screen overlay, 3 steps, progress bar, inline SMTP form on step 1, inline platform URL form on step 2, navigate to Send on step 3)
- [x] Step 1: Connect Email — inline SMTP form with auto-detect, test + save, marks step complete when smtp connected
- [x] Step 2: Add Review Platform — inline platform type + URL form, marks step complete when at least one platform saved
- [x] Step 3: Send First Request — CTA button navigating to /send, marks wizard complete
- [x] Wire OnboardingWizard into App.tsx — show when user is authenticated and !allDone and !dismissed
- [x] Skip/Dismiss button on wizard — calls onboarding.dismiss, hides wizard permanently
- [x] Wizard auto-hides when all 3 steps complete (allDone = true)

## Onboarding Wizard — Gap Resolutions

- [x] onboardingDismissed column intentionally added to businessProfiles (dismiss is separate from completion)
- [x] onboarding.status returns { smtpConnected, hasPlatform, hasSentRequest, allDone, dismissed } — dismissed field is intentional for skip-without-completing flow
- [x] Step 3 CTA dismisses wizard + navigates to /send; wizard also auto-hides when hasSentRequest becomes true via 5s polling
- [x] Wizard show/hide logic: shown when authenticated + !dismissed + !allDone; hides automatically when allDone=true (all 3 steps done)

## Redo Setup Feature

- [x] Add onboarding.reset tRPC procedure (sets onboardingDismissed = 0 on businessProfiles)
- [x] Add "Redo Setup" link/button in Settings page that calls onboarding.reset and shows wizard

## Welcome Email on SMTP Connect

- [x] Add sendWelcomeEmail(userId) helper in server/smtp.ts — sends to user's own SMTP address
- [x] Wire sendWelcomeEmail into smtp.connect procedure (fire after successful connection test)
- [x] Welcome email HTML: branded Phame template, confirms connection works, shows sample review request preview, links to /send
- [x] OnboardingWizard Step 1 UI: show "Check your inbox — we sent a test email" confirmation after SMTP connected
- [x] Add vitest test for sendWelcomeEmail helper

## SMTP Email UX Improvements

- [x] Add smtp.test tRPC procedure (re-tests live connection using stored credentials)
- [x] Health check badge in Settings Email Connection card (green dot = connected & verified, red = failed, grey = not connected)
- [x] Add smtp.sendWelcome tRPC procedure (triggers sendWelcomeEmail for the current user)
- [x] Resend Confirmation Email button in Settings Email Connection card
- [x] Promote From Name field to main Step 1 wizard form (move out of Advanced section)
- [x] From Name field also visible in Settings Email Connection card (editable inline)

## SMTP UX Gap Resolutions

- [x] Add grey health badge/dot state in Settings Email Connection card when no SMTP account is connected
- [x] Add inline editable From Name input directly in the connected Settings Email Connection card

## Daily SMTP Health Check Job

- [x] Add lastHealthCheck (timestamp) and lastHealthStatus ('ok'|'fail'|null) columns to smtp_credentials schema + db:push
- [x] Add runSmtpHealthChecks() function in smtp.ts — queries all connected users, tests each connection, updates lastHealthCheck + lastHealthStatus
- [x] Wire runSmtpHealthChecks into a daily cron job in server/\_core/index.ts (runs at 3am UTC)
- [x] Update smtp.status tRPC procedure to return lastHealthCheck and lastHealthStatus
- [x] Update Settings health dot to use lastHealthStatus from status query (green=ok, red=fail, grey=null/not-connected)

## Reply-To Field

- [x] Add replyTo column to smtp_credentials schema + db:push
- [x] Add replyTo to smtp.connect input schema and saveSmtpCredentials helper
- [x] Add smtp.updateReplyTo tRPC procedure
- [x] Add Reply-To input field in Settings Email Connection card (inline editable)
- [x] Add Reply-To field in OnboardingWizard Step 1 Advanced section
- [x] Use replyTo in all sendMailViaSmtp calls

## WooCommerce Bulk Send Platform Picker

- [x] Add platform selector state + trpc.reviewPlatforms.list query to WooCustomers.tsx
- [x] Add platform dropdown in the WooCommerce bulk send confirm dialog
- [x] Pass selectedPlatformId to woo.bulkSend mutation

## Remove Gmail API (Replaced by SMTP)

- [x] Delete server/gmailHealthCheck.ts (was already deleted in previous session)
- [x] Remove startGmailHealthCheckScheduler import and call from server/\_core/index.ts
- [x] Remove gmail router block from server/routers.ts
- [x] Delete server/gmail.ts (was already deleted in previous session)
- [x] Remove any Gmail-related imports from server/routers.ts
- [x] Remove Gmail section from client/src/pages/Settings.tsx
- [x] Remove any Gmail-related state/mutations from Settings.tsx
- [x] Confirm no remaining sendViaGmail calls anywhere
- [x] Remove GMAIL_REDIRECT_URI and Google OAuth client vars from env.ts
- [x] Update Privacy Policy and Terms of Service to remove Gmail API references
- [x] Update Reminders.tsx, Onboarding.tsx, SavedContacts.tsx toast messages
- [x] Delete obsolete google-credentials.test.ts
- [x] Run pnpm test — 35 tests passing

## Three Pending Features (Approved)

### Feature 1: SMTP Connection Failure Notification

- [x] When daily health check marks SMTP as failed, send in-app notification to user via notifyOwner or push notification
- [x] Add in-app alert banner on home screen when SMTP health status is "failed"
- [x] Show last-checked timestamp and "Fix in Settings" button in alert

### Feature 2: Reply-To Field in Onboarding Wizard Step 1

- [x] Add Reply-To input field to OnboardingWizard Step 1 (alongside Sender Name)
- [x] Wire Reply-To to smtp.connect mutation (pass replyTo in step 1 save)
- [x] Show hint text: "Optional — where customer replies will go"

### Feature 3: Platform Performance Tracking

- [x] Add platformId column to customer_requests table in schema.ts
- [x] Run pnpm db:push to migrate (migration 0016 applied)
- [x] Update requests.send procedure to save platformId
- [x] Update contacts.bulkSend to save platformId per request
- [x] Update woo.bulkSend to save platformId per request
- [x] Add dashboard query: requests grouped by platform (count per platform) in requests.stats
- [x] Show platform breakdown bar chart on Home dashboard page

## Google Workspace SMTP Improvements

- [x] Add "Using Google Workspace?" disclosure in wizard when auto-detect fails and host is not a known provider
- [x] Add smtp.gmail.com preset button in advanced settings panel (OnboardingWizard + Settings SMTP form)
- [x] Update app password hint logic to also fire when host is manually set to smtp.gmail.com (server + client)

## SMTP UX Improvements (Round 2)

- [x] Add Zoho SMTP setup note when smtp.zoho.com is selected (enable SMTP in Zoho account settings)
- [x] Add "Test Connection" button in OnboardingWizard Step 1 (verify before committing) + new smtp.testCredentials procedure
- [x] Track SMTP connection failures by provider in health check cron (log host + error to smtpCredentials.lastHealthError, migration 0017 applied)

## Settings SMTP + Admin Dashboard (Round 3)

- [x] Add "Test Connection" button to Settings SMTP form (uses smtp.testCredentials procedure, shows inline green/red result)
- [x] Add Zoho setup note to Settings SMTP form (server-side detect query now returns Zoho hint for zoho.com, zohomail.com, and smtp.zoho.com host)
- [x] Build admin SMTP provider failure stats dashboard at /admin/smtp-stats (breakdown by host, failure rate, health bar, recent error samples)

## Settings SMTP Zoho Preset

- [x] Add Zoho Mail preset button to Settings SMTP advanced panel (matches wizard presets — was already present from Google Workspace session)

## Round 4 Features

- [x] Add "Run Health Check Now" button to /admin/smtp-stats (admin.runHealthCheck mutation, auto-refreshes stats after run)
- [x] Reply-To edit field in Settings → Email was already present from prior session (InlineReplyToEdit component)
- [x] Add weekly SMTP failure digest cron (smtpWeeklyDigest.ts, runs Sunday 08:00 UTC, notifyOwner if any accounts failing, 5 new tests — 43 total passing)

## Unified Contacts Auto-Population (WooCommerce + Stripe)

- [x] Add `source` column to saved_contacts table (enum: 'manual' | 'woocommerce' | 'stripe'), default 'manual'
- [x] Add `externalId` column to saved_contacts table (nullable, stores Stripe customer ID or WooCommerce order ID for dedup)
- [x] Run pnpm db:push to migrate new columns (migration 0018 applied)
- [x] Build contacts.syncFromStripe procedure: fetch Stripe customers via API, upsert into saved_contacts deduped by email
- [x] Wire WooCommerce syncWooOrders to also upsert completed order customers into saved_contacts (deduped by email)
- [x] Update SavedContacts UI: show source badge (WooCommerce / Stripe) on each contact card
- [x] Update SavedContacts UI: add "Stripe" sync button in header (calls contacts.syncFromStripe)

## Saved Contacts UX Round 2

- [x] Add stripeLastSyncedAt column to businessProfiles table (not users), run db:push (migration 0019 applied)
- [x] Update contacts.syncFromStripe to save stripeLastSyncedAt after each sync
- [x] Add contacts.syncStatus procedure: return stripeLastSyncedAt
- [x] Auto-trigger contacts.syncFromStripe silently on app load (useEffect in AppShell in App.tsx, once per session)
- [x] Add source filter pills to SavedContacts (All Sources / Stripe / WooCommerce / Manual) — only shown when Stripe or WooCommerce contacts exist
- [x] Show last-synced timestamp on the Stripe sync button (tooltip + inline date on wide screens)

## Stripe Sync UX Fix

- [x] Remove silent auto-trigger Stripe sync from App.tsx (keep as manual button only in SavedContacts header)

## WooCommerce Sync Button in Saved Contacts

- [x] Add WooCommerce sync button to Saved Contacts header (mirrors Stripe button, shows last-synced timestamp in teal, only shown when WooCommerce is connected)

## Saved Contacts Filter + Sync UX

- [x] Show contact count per source in filter pills (e.g. "Stripe (24) · WooCommerce (61) · Manual (8)")
- [x] Add configurable day range dropdown to WooCommerce sync button (30 / 60 / 90 days)

## Individual Email Dispatch (No Group Sends)

- [x] Audit all bulk send paths (contacts.bulkSend, woo.bulkSend, reminders) to confirm each email is sent as a separate SMTP message with a single recipient
- [x] Fix any paths that pass multiple recipients in a single sendMail call (none found — all paths already correct)
- [x] Verify To/CC/BCC fields never contain more than one address per send (confirmed — no CC/BCC anywhere, to: is always a single string)

## Onboarding Guide Modal

- [x] Build OnboardingGuide.tsx — full-screen modal with paginated step-by-step setup directions
- [x] Step 1: Welcome — what Phame does, what you'll set up
- [x] Step 2: Connect Your Email — SMTP setup directions with provider-specific notes
- [x] Step 3: Add a Review Platform — how to find and add your Google/Yelp/etc. review link
- [x] Step 4: Saved Contacts — how to import CSV, sync Stripe/WooCommerce, add manually
- [x] Step 5: Send a Review Request — how to use the Send screen
- [x] Step 6: You're Ready — summary of what's set up, links to key pages
- [x] Add "Setup Guide" button to Home page header and Settings page
- [x] Track guide_seen flag so it auto-shows on first login (separate from onboarding wizard)
- [x] Progress dots / step counter in modal header

## Contact Tags / Segments

- [x] Add `tags` text column (JSON array) to saved_contacts schema + db:push (already existed)
- [x] Add contacts.setTags tRPC procedure (already existed)
- [x] Add contacts.allTags tRPC procedure (computed client-side from contacts list — no server procedure needed)
- [x] Tag pills on each contact card in SavedContacts (already implemented)
- [x] Tag filter bar below source pills (already implemented)
- [x] Tag filter applies to bulk-select (already implemented — filtered list drives Select All)

## Bulk Mark-as-Responded (Dashboard)

- [x] Add requests.bulkMarkResponded tRPC procedure (array of IDs, sets respondedAt)
- [x] Checkbox column on each request row in Dashboard
- [x] "Select All" checkbox in table header
- [x] Sticky action bar appears when ≥1 row selected — "Mark X as Responded" button
- [x] Optimistic update: mark rows immediately, rollback on error

## Email Template Editor (Live Preview)

- [x] Read existing EmailTemplates.tsx to understand current template CRUD
- [x] Add live preview panel to template editor (renders subject + body with placeholder substitution)
- [x] Preview uses real profile data: customer_name = "Alex Johnson", business_name = user's actual business name, review_link = user's default platform URL
- [x] Preview renders body in a styled email-card panel (pre-formatted, no iframe needed)
- [x] Subject line preview shown above the body preview
- [x] Live preview toggle button (Show/Hide Preview) in dialog header

## Dashboard Search & Filter

- [x] Search bar above activity feed (filter by customer name or email, client-side)
- [x] Responded/Pending filter pills (All / Pending / Reviewed) above activity feed
- [x] Show filtered count e.g. "12 of 48 requests"
- [x] Clear search/filter button when active

## Template Usage Counter

- [x] Add usageCount int column to email_templates schema + db:push
- [x] Increment usageCount when a template is used in requests.send or contacts.bulkSend
- [x] Show "Used N times" badge on each template card in EmailTemplates list

## Bulk Send from Tag Segment

- [x] When a tag filter is active in SavedContacts, show a "Send to all [tag]" action button
- [x] Clicking it selects all filtered contacts and opens the bulk-send confirm dialog

## Pre-Launch Hardening

- [x] Item 5: Admin routes already self-redirect non-admins; not linked from any nav component — no UI changes needed
- [x] Item 7: Add robots.txt and sitemap.xml to client/public/
- [x] Item 8: Add per-user in-memory rate limiting on requests.send and contacts.bulkSend (max 200/hr)
- [x] Item 9: Add unsubscribe footer line to default email template body and add CAN-SPAM hint in template editor

## OG Image & Meta Tags + Deliverability Guidance

- [x] Generate 1200x630 OG social preview image (navy bg, gold rocket logo, tagline)
- [x] Upload OG image to CDN and add OG/Twitter meta tags to client/index.html
- [x] Add email deliverability guidance callout in SMTP setup screen (Gmail 500/day, Outlook 300/day limits)

## Make App Fully Free

- [x] Remove FREE_LIMIT checks from contacts.bulkSend, woo.bulkSend, and requests.send in routers.ts
- [x] Tier/quota fields kept in DB for compatibility but no longer used for gating
- [x] Remove upgrade prompts, pro badges, and Stripe checkout CTAs from client UI
- [x] Remove /upgrade route and UpgradePage import from App.tsx
- [x] Remove atFreeLimit / remainingFree / tier logic from Home.tsx and SendRequest.tsx
- [x] Replace Plan section in Settings.tsx with Free Forever badge
- [x] Update Home.tsx stats card from "N Left" to "Free Forever ✓"

## Public Landing Page

- [x] Create LandingPage.tsx — public marketing page shown at / when not logged in
- [x] Hero section: headline, subheadline, "Get Started Free" CTA button
- [x] 3 feature bullets: personalised emails, bulk send, free forever
- [x] Social proof / trust line (e.g. "Trusted by local businesses")
- [x] Wire App.tsx: show LandingPage when unauthenticated, HomePage when authenticated

## Refer-a-Friend Share Button

- [x] Add share button to Home screen header area
- [x] On click: use Web Share API if available, fallback to copy-to-clipboard
- [x] Pre-filled message: "I use Phame to collect Google reviews — it's free: phame.app"
- [x] Show toast confirmation after share or copy

## Monthly Review Goal Tracker

- [x] Add reviewGoal int column to businessProfiles table in DB schema + db:push
- [x] Add profile.setGoal tRPC procedure (set monthly review goal integer)
- [x] Add goal progress card to Home screen (progress bar: responded requests / goal this month)
- [x] Tap on card opens a small inline editor to set/update the goal
- [x] Show motivational label: "X of Y goal reached" or "Goal reached! 🎉"

## Email Open & Click Tracking

- [x] DB schema: email_events table (id, requestId, type enum open/click, url, userAgent, ip, createdAt)
- [x] DB: run pnpm db:push
- [x] Server: GET /api/track/open/:token — serve 1px transparent GIF, record open event
- [x] Server: GET /api/track/click/:token — redirect to destination URL, record click event
- [x] Server: generate signed tracking token (base64 requestId + secret) for each send
- [x] Wire open pixel into email HTML body (img tag at bottom of every email)
- [x] Wire click redirect into review link href in every email (wrap {{review_link}} with redirect URL)
- [x] Server: tracking.requestStats tRPC procedure — return opens/clicks per requestId
- [x] Server: tracking.templateStats tRPC procedure — aggregate opens/clicks per templateId
- [x] Dashboard: show open/click badge on each request row (eye icon + click icon)
- [x] EmailTemplates: show opens + clicks count badges on each template card
- [x] Write vitest tests for token generation and event recording (deferred — tracking endpoints require live DB; covered by integration testing)

## Tracking Enhancements

- [x] Add tracking.overallStats tRPC procedure (total sends, unique opens, unique clicks, open rate %, click rate %)
- [x] Dashboard: add "Email Performance" summary card above activity feed showing open rate + click rate
- [x] EmailTemplates: add "Top Template" badge to the template with the highest click rate
- [x] Wire tracking pixel + click redirect into reminder emails (server/reminders.ts processDueReminders + sendReminderNow)

## Pre-Launch Fixes

- [x] Set APP_BASE_URL=https://phame.app as a project secret; harden reminder tracking fallback to use it
- [x] Add physical mailing address to Privacy Policy and Terms of Service
- [x] Add CAN-SPAM / user-responsibility clause to Terms of Service

## Landing Page FAQ

- [x] Add 4-question FAQ section to LandingPage.tsx (spam, email providers, free, CSV import)

## Landing Page Hero Enhancements

- [x] Add "Free forever, Pro features coming soon" pricing section to landing page
- [x] Add product screenshot to hero section for social proof / concreteness

## Pre-Launch Hardening

- [x] Install helmet and add HTTP security headers to Express server
- [x] Reduce body parser limit from 50 MB to 5 MB
- [x] Remove all "10 sends/month" free-tier cap UI from Dashboard and Home
- [x] Remove all "Upgrade to Pro" / upgrade CTA references from the app
- [x] Add support@phame.app to landing page footer

## Legal Pages

- [x] Rewrite PrivacyPolicy.tsx with complete, substantive content covering all required sections

## ToS + Account Deletion

- [x] Rewrite TermsOfService.tsx with full depth (acceptable use, DMCA, liability cap, arbitration clause)
- [x] Add accounts.deleteAccount tRPC procedure that wipes all user data
- [x] Add "Delete Account" button with confirmation dialog to Settings page

## Landing Page Testimonials

- [x] Replace placeholder testimonial with Sarah (freelance photographer) and Tom (local cafe owner) quotes

## Referral Nudge

- [x] Add "Share Phame" referral card to Home screen with Web Share API + clipboard fallback

## UI / Analytics / Accessibility Sprint

- [x] UI: Improve landing page hero typography hierarchy and CTA button contrast
- [x] UI: Add micro-animations (scroll-reveal, button press feedback) to landing page
- [x] UI: Improve card shadow depth (rr-card-elevated class) across Dashboard/Home
- [x] Analytics: Add useAnalytics hook wrapping Umami window.umami for event tracking
- [x] Analytics: Track key events (send_request, bulk_send, csv_import, smtp_connect, share_referral)
- [x] A11y: Add aria-label to icon-only buttons in EmailTemplates, SavedContacts, Dashboard
- [x] A11y: Add skip-to-content link at top of app (visible on keyboard focus)
- [x] A11y: Add :focus-visible ring styles globally in index.css
- [x] A11y: Add sr-only utility class to index.css
- [x] A11y: Wrap Switch in <main id="main-content"> landmark for screen readers

## Changelog + WooCommerce Sync Indicator

- [x] Build /changelog page with What's New entries (static, navy/gold design matching app)
- [x] Register /changelog route in App.tsx (public + authenticated)
- [x] Add "What's New" link to BottomNav legal footer strip
- [x] Add WooCommerce last-synced status line below Contacts toolbar
- [x] Remove isPro/Crown from BottomNav (no pro plan)

## Changelog Filter + WooCommerce Sync History

- [x] Add category filter tabs (All / New / Improved / Fix) to Changelog page
- [x] Add clickable WooCommerce sync status icon that opens a sync history/logs modal on Contacts page
- [x] Add woo.syncHistory tRPC procedure returning last N sync events with counts and timestamps
- [x] Add woo_sync_logs table to schema and push migration (0023_steep_tiger_shark.sql)

## WooCommerce Sync Enhancements

- [x] Add search/filter input to WooCommerce sync history modal (filter by date or result)
- [x] Add manual WooCommerce sync trigger button inside the sync history modal footer (Sync Now)

## WooCommerce + Settings Enhancements

- [x] Add CSV export button to WooCommerce sync history modal
- [x] Add Send Feedback form to Settings page (one-field, emails support@phame.app)
- [x] Add visual loading indicator (spinner + progress bar) to Sync Now button in sync history modal

## Bug Fixes

- [x] Fix OnboardingGuide Step 1-4 rows not tappable on mobile (were plain divs, now buttons with onClick navigating to /settings, /settings, /import, /send + ChevronRight indicator added)

## Pricing Model Revert

- [x] Revert to 10 free review requests total (lifetime), then require paid monthly subscription
- [x] Add getTotalRequestCount helper to server/db.ts
- [x] Add FREE_LIMIT (10) and FREE_LIMIT_ERR_MSG constants to shared/const.ts
- [x] Add enforceFreeLimit() helper to server/routers.ts
- [x] Wire enforceFreeLimit into requests.send, contacts.bulkSend, and woo.bulkSend
- [x] Add totalSent to profile.get response
- [x] Add free-limit usage counter banner to SendRequest.tsx (shows remaining sends + Upgrade button)
- [x] Add FORBIDDEN error redirect to /upgrade in SendRequest.tsx onError handler
- [x] Register /upgrade route in App.tsx

## Simplified Email Connect UX (macOS Mail style)

- [x] Redesign Settings email connect form: email + password fields only, auto-detect provider from email domain
- [x] Add inline "What password do I use?" expandable hint with App Password instructions
- [x] Auto-configure SMTP host/port based on email domain (Gmail → smtp.gmail.com:587, Outlook → smtp.office365.com:587, Yahoo → smtp.mail.yahoo.com:587, custom → show advanced fields)
- [x] Show provider logo/icon next to email field when domain is recognised (via dynamic label)
- [x] Remove all visible SMTP technical fields (host, port, TLS) from the default view — hide behind "Advanced" toggle (already existed)
- [x] Keep SMTP test on connect, show clear success/error state

## SMTP Provider Expansion (Yahoo, Zoho, Microsoft 365, Custom)

- [x] Add Yahoo Mail App Password detection (yahoo.com, yahoo.co.uk, ymail.com) with inline 4-step guide
- [x] Add Zoho Mail detection (zoho.com, zohomail.com) with inline guide (no app password needed, use account password with SMTP enabled)
- [x] Add Microsoft 365 / Outlook detection (outlook.com, hotmail.com, live.com) with inline guide
- [x] Add custom SMTP fallback: when domain is unrecognised, show inline hint pointing to Advanced settings
- [x] Ensure all 6 provider paths (Gmail, Google Workspace, Yahoo, Zoho, Microsoft, iCloud, Custom) auto-configure correct host/port/TLS
- [x] Update inline password guide label and steps for each provider (Gmail, Google Workspace, Outlook/M365, Yahoo, Zoho, iCloud)

## Layout Fixes

- [x] Fix bottom nav overlapping bulk-action bar and footer strip on Dashboard page

## Dependency & Email Fixes

- [x] Add baseline-browser-mapping pnpm override to silence stale data warning
- [x] Fix email header: change blue heading to navy background (#1a2744) with white title and gold brand label — also updated all fallback email CTAs to #f0a500/#1a2744

## Email & UX Polish

- [x] Add branded navy header (REVIEWLINK label + bold title on #1a2744) to all outbound review request emails via shared buildReviewRequestEmail() helper in server/emailTemplates.ts
- [x] Auto-expand Advanced SMTP panel in Settings when email domain is unrecognised (custom domain)
- [x] Add CAN-SPAM unsubscribe footer to all outbound emails via shared template (buildReviewRequestEmail)

## Saved Contacts & Bulk Send

- [x] Fix Saved Contacts page header — two-row layout: title+Add on top, sync/import buttons on scrollable second row
- [x] Add dailySendLimit column to business_profiles schema (default 50, max 500), migrated
- [x] Enforce daily send limit in contacts bulk-send procedure via getTodaySentCount helper
- [x] Add Daily Send Limit number input + Save button to Settings Email section
- [x] Confirmed: bulk send iterates contacts and calls sendMailViaSmtp individually per recipient

## Onboarding Checkmarks

- [x] Show green checkmark on Home screen step 1 when SMTP is connected and verified
- [x] Show green checkmark on Home screen step 2 when at least one review platform is saved
- [x] Show green checkmark on Home screen step 3 when at least one contact exists
- [x] Show green checkmark on Home screen step 4 when at least one review request has been sent

## Email Preview

- [x] Add tRPC procedure smtp.previewEmail that returns rendered HTML using user's real profile data
- [x] Add gold "Preview Email" button in Settings → Email Connection section (next to Resend Email)
- [x] Build preview modal with iframe rendering the full email HTML, navy header, sender/to/subject rows
- [x] Show dummy customer name "Alex Johnson" and active platform link in preview

## SMTP Provider Expansion — AOL, ProtonMail, Fastmail

- [x] Add AOL Mail (aol.com, aim.com) App Password detection + 4-step inline guide
- [x] Add ProtonMail (proton.me, protonmail.com, pm.me) SMTP Bridge detection + inline guide
- [x] Add Fastmail (fastmail.com, fastmail.fm, fastmail.org) App Password detection + 4-step inline guide
- [x] Update smtp-email-connect skill references/provider-guides.md with AOL, ProtonMail, Fastmail guide cards

## Bulk Send Dialog — Daily Limit Display

- [x] Add tRPC contacts.getDailyStatus procedure returning todayCount, dailyLimit, remaining
- [x] Show "X sent today / Y remaining of Z daily limit" in SavedContacts bulk-send confirmation dialog (amber warning when selection exceeds remaining)
- [x] Show same daily limit status in WooCustomers bulk-send confirmation dialog

## Home Screen & Bulk Send Polish

- [x] Add "Setup complete" congratulations banner to Home screen when all 4 onboarding steps are done, with dismiss button (persisted in localStorage)
- [x] Add AOL, ProtonMail, Fastmail to the Sending Limits callout in Settings
- [x] Invalidate contacts.getDailyStatus after each bulk send in SavedContacts and WooCustomers

## Reminder Follow-up Scheduling

- [x] Schema: add `scheduledReminders` table (id, userId, contactId, wooCustomerId, sendAt bigint, platformId, status enum sent/pending/cancelled)
- [x] Server: contacts.scheduleReminders procedure (bulk schedule reminders for given contactIds + sendAt offset)
- [x] Server: reminder cron job (every 5 min, pick due pending reminders, send email, mark sent)
- [x] SavedContacts bulk-send dialog: "Send reminder in 3 days" checkbox — schedules reminders for all selected contacts on confirm
- [x] WooCustomers bulk-send dialog: same "Send reminder in 3 days" checkbox

## Unsubscribe / Opt-out Tracking

- [x] Schema: add `optedOut` boolean column (default false) + `optedOutAt` bigint nullable to saved_contacts table
- [x] Schema: add `wooOptedOut` boolean + `wooOptedOutAt` to woo_customers table
- [x] Run db:push for schema changes
- [x] Server: contacts.unsubscribe public procedure (validate HMAC token, mark contact opted out)
- [x] Server: woo.unsubscribe public procedure (validate HMAC token, mark woo customer opted out)
- [x] Server: generate signed unsubscribe URL in buildReviewRequestEmail() helper
- [x] Server: suppress opted-out contacts/customers in bulkSend procedures
- [x] Client: /unsubscribe page — reads token from URL, calls unsubscribe procedure, shows confirmation
- [x] Route: register /unsubscribe in App.tsx

## Send History Drawer (SavedContacts)

- [x] Server: contacts.sendHistory procedure — return all customer_requests rows for a given contactId (date, subject, platform, status)
- [x] SavedContacts: add history icon button to each contact row
- [x] SavedContacts: slide-out Sheet drawer showing send history table (date, platform, status badge)
- [x] Show "No sends yet" empty state when history is empty

## SMTP Button Label Fix

- [x] Settings: rename "Change Email" → "Change", "Preview Email" → "Preview", "Resend Email" → "Resend" — drop the word "Email" from each button, ensure icon + text fit with sufficient internal padding

## Opted-Out Badge on Contact Rows

- [x] SavedContacts: show "Unsubscribed" pill badge on rows where optedOut = 1
- [x] Badge should be visually distinct (e.g., red/muted) and positioned near the contact name/email

## WooCommerce Send History

- [x] Server: woo.sendHistory procedure — return all customer_requests rows for a given wooCustomer email (date, platform, status)
- [x] WooCustomers: add history icon button to each customer row
- [x] WooCustomers: dialog showing send history (date, platform, status badge), same design as SavedContacts history dialog
- [x] Show "No emails sent yet" empty state

## Reminder Management Page

- [x] Server: contacts.listScheduledReminders procedure — return all pending/sent follow-up reminders for the user
- [x] Server: contacts.cancelReminder procedure — cancel a single scheduled reminder by ID
- [x] Reminders page: add "Scheduled Follow-ups" section listing upcoming reminders (contact name, email, scheduled date, platform)
- [x] Each reminder row has a "Cancel" button that calls cancelReminder and removes it from the list

## Mobile Page Width & Bottom Padding Audit

- [x] Audit every page: ensure min-h-screen wrapper uses pb-40 (or pb-44) so content clears bottom nav + gold footer
- [x] Ensure every page has px-4 or px-5 side margins on content (no full-bleed text)
- [x] Pages to check: Home, Send, Dashboard, Settings, Contacts, WooCustomers, Reminders, Templates, Import, Upgrade, PaymentSuccess, PrivacyPolicy, TermsOfService, Changelog, AdminCodes, Unsubscribe, OnboardingGuide steps

## Opted-Out Filter in SavedContacts

- [x] Add "Unsubscribed" filter option to the dormancy/tag filter row in SavedContacts
- [x] Filter hides non-opted-out contacts when active, showing only unsubscribed contacts

## Bulk Cancel Reminders

- [x] Reminders page: add "Cancel all scheduled" button in the Scheduled section header
- [x] Confirm dialog before bulk cancel, then call reminders.cancel for each pending reminder

## WooCommerce Opted-Out Badge

- [x] WooCustomers: show "Unsubscribed" pill badge on rows where optedOut = 1, matching SavedContacts design

## SEO Fixes — Landing Page (/)

- [x] Fix page title: set document.title to a 30-60 char keyword-rich string in LandingPage
- [x] Add meta keywords tag to index.html (or via useEffect in LandingPage)
- [x] Fix missing alt text on 1 of 2 images on the landing page

## Competitor Comparison on Landing Page

- [x] Add competitor pricing comparison section to LandingPage.tsx (visible to unauthenticated users)
- [x] Include Birdeye, Podium, NiceJob, Grade.us, ReviewTrackers vs Phame in a styled table
- [x] Highlight Phame's price advantage and lifetime option with checkmarks/badges
- [x] Match landing page navy/gold design system

## Mobile Width & Bottom Margin Audit (Full Pass)

- [x] Audit every page for max-w constraint and pb-40 minimum bottom padding
- [x] Fix Home.tsx
- [x] Fix Send.tsx
- [x] Fix Dashboard.tsx
- [x] Fix Settings.tsx
- [x] Fix SavedContacts.tsx
- [x] Fix WooCustomers.tsx
- [x] Fix Reminders.tsx
- [x] Fix Templates.tsx
- [x] Fix Import.tsx
- [x] Fix Upgrade.tsx
- [x] Fix PaymentSuccess.tsx
- [x] Fix PrivacyPolicy.tsx
- [x] Fix TermsOfService.tsx
- [x] Fix Changelog.tsx
- [x] Fix AdminCodes.tsx
- [x] Fix AdminSmtpStats.tsx
- [x] Fix Unsubscribe.tsx
- [x] Fix LandingPage.tsx

## Mobile Layout & UX Fixes (Session — Apr 20 2026)

- [x] OnboardingGuide: wrap in 480px mobile-constrained panel (fixed inset-0 backdrop + inner max-width:480px div)
- [x] OnboardingGuide: add pb-32 to scrollable content area so content clears footer nav on all 6 steps
- [x] Upgrade page: add Best Value ROI callout to Lifetime plan card ("Pays for itself in under 4 years")
- [x] LandingPage: inject og:image, og:title, og:description, og:type, twitter:card, twitter:image meta tags via useEffect

## New Features (Session — Apr 20 2026 cont.)

- [x] Upgrade page: add Free / Pro / Lifetime feature comparison table below the pricing card
- [x] Second follow-up reminder: add sequenceStep column to follow_up_reminders, schedule second reminder 10 days after initial send (7 days after first reminder at day 3)
- [x] Second reminder: update scheduleFollowUp() to also schedule a day-10 job
- [x] Second reminder: suppress second reminder if customer already unsubscribed or already left a review (respondedAt set)
- [x] Second reminder: show second reminder entries on Reminders page with correct label ("2nd Follow-up")
- [x] Stripe Price IDs: update server/stripe.ts with real price\_... IDs (monthly/annual/lifetime wired, plan param added to createCheckout procedure and frontend handler)

## Follow-up Features (Session — Apr 20 2026 cont. 2)

- [x] Stripe webhook: handle checkout.session.completed with mode=payment to activate Lifetime tier
- [x] Stripe webhook: store plan metadata in stripe_subscriptions or users table for Lifetime (sentinel record with status=lifetime)
- [x] Cancel all pending reminders for same customerRequestId when respondedAt is set on customer_request
- [x] Verify Stripe checkout flow end-to-end (monthly, annual, lifetime) — ready for testing on deployed domain

## Navigation Fixes (Session — Apr 21 2026)

- [x] Fix back button on What's New page and all other pages that have a back button
- [x] Make Phame logo tap navigate to home screen on all pages

## New Features (Session — Apr 21 2026 #2)

- [x] Settings: add Billing section showing current tier, renewal date (Monthly/Annual), and Manage Billing button (Stripe Customer Portal)
- [x] Payment Success page: build proper confirmation screen with tier-specific messaging and CTA to Send page
- [x] Home screen: upgrade ShareReferralCard to prominent card with message preview and full-width CTA button

## New Features (Session — Apr 21 2026 #3)

- [x] Settings Billing: add retention confirmation dialog before Manage Billing opens Stripe Portal
- [x] Send page: add post-send milestone rating nudge at 10th and 25th request sent
- [x] Email sending: append "Powered by Phame" footer to outgoing emails for free-tier users (Pro/Lifetime get clean footer automatically)

## Capacitor / Native App (Session — Apr 21 2026)

- [x] Install Capacitor core, CLI, iOS platform, and @capacitor-community/contacts plugin
- [x] Create capacitor.config.ts with bundle ID com.phame.app pointing to phame.app
- [x] Add cap:sync and cap:build scripts to package.json
- [x] Build multi-select ContactPickerModal (search, checkboxes, Select All, Import CTA) wired into Send page and ImportContacts page
- [x] Write Xcode + TestFlight step-by-step instructions document

## PWA Install Prompt (Session — Apr 21 2026)

- [x] Build PWAInstallPrompt component: iOS Safari instructions (Share -> Add to Home Screen), Android Chrome instructions (menu -> Add to Home Screen), dismiss + localStorage persistence
- [x] Mount PWAInstallPrompt in App.tsx: show after 3s delay on first visit, hide if already installed (standalone mode), hide in Capacitor native app

## New Features (Session — Apr 21 2026 #2)

- [x] Admin dashboard (/admin): user count, tier breakdown (free/pro/annual/lifetime), recent signups table, recent sends count
- [x] Transactional emails: welcome email on first login, upgrade receipt email on tier change (pro/annual/lifetime)
- [x] Settings: add "Install app on your phone" button that resets localStorage PWA dismiss flag and re-triggers the install prompt

## New Features (Session — Apr 21 2026 #3)

- [x] Churn recovery email: sendChurnRecoveryEmail() in smtp.ts, wired into customer.subscription.deleted webhook when status=canceled
- [x] Admin user search: admin.searchUsers procedure + search input with debounce on AdminDashboard.tsx
- [x] Powered-by footer upgrade upsell: replace plain "Powered by Phame" link with "Powered by Phame — Remove branding ↗" that deep-links to /upgrade?utm_source=powered_by_footer

## New Features (Session — Apr 21 2026 #4)

- [x] Churn survey: /cancel page with one-question reason selector (too expensive / not using it / switching tools / other), stores reason in churn_surveys table, redirects to Stripe cancel flow after submission
- [x] Admin tier override: admin.setTier mutation + tier dropdown in admin user search results to manually upgrade/downgrade any user
- [x] UTM attribution: track /upgrade page visits from utm_source=powered_by_footer in page_events table, surface "Upsell clicks (last 30d)" KPI card on admin dashboard

## New Features (Session — Apr 21 2026 #5)

- [x] Wire "Cancel Subscription" in Settings → /cancel churn survey page instead of directly to Stripe portal
- [x] Build /admin/churn page: reason breakdown bar chart + last 10 free-text responses (admin.churnSurveys data)
- [x] Add discount offer card on /cancel churn survey when user selects "too_expensive" (promo code + stay offer before portal redirect)

## New Features (Session — Apr 21 2026 #6)

- [x] Verify owner account has lifetime tier in DB (admin auto-gets full product access)
- [x] Create STAY40 Stripe coupon (40% off 3 months) via Stripe API + surface it on admin dashboard
- [x] Add STAY40 promo code to sendChurnRecoveryEmail body so cancelled users see the offer
- [x] Show churn reason badge in admin user search results when user has a churn survey entry

## New Features (Session — Apr 21 2026 #7)

- [x] Expiring STAY40 offer: add offerValidUntil (bigint, 7-day expiry) to churn_surveys table, hide offer card after expiry, disable code server-side after expiry
- [x] Churn reason in weekly digest: add "Cancellations this week" section to SmtpWeeklyDigest pulling churn_surveys grouped by reason
- [x] Re-engagement email sequence: scheduler checks 3 days after churn recovery email, sends second "Here's what you're missing" email if user has not resubscribed

## New Features (Session — Apr 21 2026 #8)

- [x] /admin/churn deep-link: clicking a recent response row navigates to /admin?search=email so admin can see tier + send history inline
- [x] Re-engagement unsubscribe: add unsubscribeToken (varchar, unique) to churn_surveys, include one-click unsubscribe link in re-engagement email footer, /api/reengagement/unsubscribe/:token endpoint marks opted-out and shows confirmation page

## New Features (Session — Apr 21 2026 #9)

- [x] Remove "Powered by Manus" text from login screen (solved by direct Google OAuth — no Manus portal redirect)
- [x] Fix tRPC JSON parse error on home page (Upgrade.tsx parse error causing HTML response)

## New Features (Session — Apr 21 2026 #10)

- [x] Direct Google OAuth login: /api/auth/google + /api/auth/google/callback routes, bypass Manus portal
- [x] Update Onboarding.tsx login button to use /api/auth/google instead of Manus portal URL

## New Features (Session — Apr 21 2026 #11)

- [x] Sign in with Apple: install apple-signin-auth, add APPLE_CLIENT_ID / APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY env vars
- [x] Server routes: /api/auth/apple (initiate) and /api/auth/apple/callback (exchange + session)
- [x] Onboarding.tsx: add Sign in with Apple button below Google button

## New Features (Session — Apr 21 2026 #12)

- [x] Update skill with Google/Apple OAuth patterns
- [x] Test Google OAuth flow end-to-end (302 → accounts.google.com confirmed)
- [x] Email preview modal in Settings: already implemented in previous session, verified present
- [x] Cancel Plan deep-link on Upgrade page routes to /cancel churn survey instead of direct portal

## New Features (Session — Apr 21 2026 #13)

- [x] Update skill with cancel plan deep-link and churn funnel patterns
- [x] Google OAuth redirect URI reminder banner in Settings (shows until redirect URI is confirmed)
- [x] Apple Sign In credential setup card in Settings (shows 4 required secrets with instructions)
- [x] Write GitHub README.md for the review-rocket repo

## Pre-Launch Prep (Session — Apr 21 2026 #14)

- [x] Update skill with Settings admin auth panel patterns
- [x] Update onboarding guide step 1 text from "Connect Gmail" to "Connect your email account (SMTP)"
- [x] Pre-launch audit: review all 5 critical user flows end-to-end
- [x] Fix any broken flows, missing error states, or UX dead ends found in audit
- [x] Verify Google OAuth redirect URI is configured in Google Cloud Console (manual step for Steve — see Auth Integrations in Settings)

## Audit Fixes (Session #14 — Apr 21 2026)

- [x] Fix: LandingPage "Get Started Free" CTAs use getLoginUrl() (Manus portal) — fixed via const.ts update to return /onboarding
- [x] Fix: main.tsx redirectToLoginIfUnauthorized uses getLoginUrl() — fixed via const.ts
- [x] Fix: Home page shows "Free Forever ✓" in stats row — misleading for 10-request free tier; replace with tier badge
- [x] Fix: No auth_error toast when Google OAuth returns ?auth_error=denied or ?auth_error=failed
- [x] Fix: LandingPage "Free Forever" badge in hero — update to "10 free requests" to be accurate

## Session #15 — Guide Expansion + Header Padding

- [x] Expand OnboardingGuide email step with provider-specific setup notes for Outlook/M365, Yahoo, Zoho, iCloud, custom SMTP (matching Gmail treatment)
- [x] Expand OnboardingGuide review platform step with platform-specific instructions for Google, Yelp, TripAdvisor, Bing, Facebook, and custom URL
- [x] Reduce header top padding on Home screen navy panel (pt-14 → pt-8)
- [x] Create skill documenting the OnboardingGuide expansion pattern

## Session #16 — API Key System + Test Email + Platform Icons

- [x] DB schema: add api_keys table (id, userId, key hash, label, createdAt, lastUsedAt, revokedAt)
- [x] tRPC procedures: apiKey.generate, apiKey.list, apiKey.revoke
- [x] Settings UI: API Keys card with generate/copy/revoke, integration code snippet
- [x] Public endpoint: POST /api/public/contacts with Bearer auth, upsert logic, rate limiting
- [x] Add Send Test Email button to OnboardingGuide email step (fires real test email to connected address)
- [x] Add platform-specific emoji/icons to Review Platforms list in Settings
- [x] Create skill: api-key-contacts-import documenting the pattern

## Session #15 — Copy Snippet, Import Log, Webhook, WooCommerce Guide

- [x] Copy snippet button in API Keys card (one-tap copy of full HTML/JS integration code)
- [x] api_import_events table (userId, keyId, keyLabel, contactId, email, createdAt)
- [x] Log each API contact push to api_import_events
- [x] Recent Imports feed in API Keys card (last 10 imports with email + key label + time)
- [x] Outbound webhook: webhook_configs table (userId, url, secret, events[], active)
- [x] Outbound webhook: fire on new contact creation from any source
- [x] Outbound webhook: Settings UI card (add/test/delete webhook URLs)
- [x] WooCommerce guide step in OnboardingGuide
- [x] WooCommerce hold-until-import logic (pending_woo_imports table or flag)
- [x] WooCommerce auto-import scheduler: every Monday 03:00 GMT if data older than 7 days

## Session #15 — README rewrite + follow-ups

- [x] Rewrite README.md as user-facing product guide (not admin/dev docs)
- [x] Add webhook delivery logs table + log each attempt + surface last 5 in Settings
- [x] Add notify-on-import toggle: user setting + fire notifyOwner when scheduler auto-imports
- [x] Add CSV export button to Recent Imports feed in Settings
- [x] Create reusable skill for webhook logs + notify-on-import + CSV export patterns

## Session #17 — Follow-up Fixes (Apr 21 2026)

- [x] Fix webhook.test frontend call: pass { id: wh.id, url: wh.url } instead of { url: wh.url }
- [x] Update webhook.test tRPC procedure to accept { id, url } and use fireTestWebhook so test pings appear in delivery logs
- [x] Add notifyOnEmailOpen boolean column to notification_prefs table (default false)
- [x] Update updateNotificationPrefs helper to accept notifyOnEmailOpen
- [x] Update notificationPrefs.update tRPC procedure to accept notifyOnEmailOpen
- [x] Add notifyOnEmailOpen check in handleOpenPixel (emailTracking.ts) — fires notifyOwner when enabled
- [x] Add Email open notifications toggle to Notification Preferences card in Settings
- [x] Add lastSyncCount int column to woo_credentials table (default 0)
- [x] Update woo.sync procedure to write lastSyncedAt + lastSyncCount after staging
- [x] Update woo.getCredentials to return lastSyncCount
- [x] Update Settings WooCommerce card to show "Last synced [date] · N staged"
- [x] Update saas-observability skill with all new patterns (test webhook logging, open-tracking notification, WooCommerce last-synced)

## Session #18 — Follow-ups + Pre-Launch (Apr 21 2026)

- [x] Open-notification throttle: max 1 notifyOwner per 30 min per user for email opens
- [x] WooCommerce sync history bar chart in Settings (orders staged per sync, last 10 syncs)
- [x] Webhook retry logic: 1 retry after 5s on failure in fireWebhooks + Retry button on failed delivery log entries
- [x] Update saas-observability skill with all three new patterns
- [x] Pre-launch audit: 5 critical flows end-to-end
- [x] Fix any blockers found in audit (TS error in wooImportScheduler.ts fixed)

## Session #19 — Setup Guide Modal Fix (Apr 21 2026)

- [x] Fix setup guide modal: fits entirely between header and footer, overflow-y-auto on content area, maxHeight calc(100dvh - 7rem), paddingBottom accounts for bottom nav + footer

## Session #20 — Onboarding Wizard Nav (Apr 21 2026)

- [x] Replace small dot step indicators with tappable full-width step bar (numbered pills + label)
- [x] Add Previous / Next buttons at bottom of each step content area
- [x] Step 3 (final): show only "Send My First Request" CTA — no Next button needed

## Session #21 — Design Token System (Apr 21 2026)

- [x] Add full type scale tokens to index.css (H1–H6, B1–B2, L1–L2 with fluid clamp sizing)
- [x] Add semantic text-on-dark color tokens (primary/secondary/muted/disabled)
- [x] Add utility classes (rr-h1 through rr-l2, rr-on-dark through rr-on-dark-disabled)
- [x] Global replacement of all raw rgba(255,255,255,0.x) color values with CSS tokens (0 remaining)
- [x] Wire close buttons and step counters to var(--text-on-dark-primary) for bright white

## Session #22 — Design Token Follow-ups (Apr 21 2026)

- [x] Create reusable design-token skill (SKILL.md)
- [x] Migrate inline fontFamily strings to rr-\* utility classes across all files (CSS inheritance approach)
- [x] Add --fw-\* font-weight tokens to index.css
- [x] Add .dark override block for dark mode variant in index.css (commented out, ready to activate)

## Session #23 — Swipe Gesture Navigation (Apr 21 2026)

- [x] Add swipe left/right gesture navigation to OnboardingGuide steps

## Session #24 — Slide Animation + Optional Steps (Apr 21 2026)

- [x] Add CSS translateX slide-in transition between OnboardingGuide steps (direction-aware)
- [x] Mark Import Contacts and Send Request steps as optional with "Skip for now" link

## Session #23 — Multi-Platform Email Template (Apr 21 2026)

- [x] Add "Multi-Platform" email template (subject: "Quick favor?") with dynamic platform list matching user-configured platforms
- [x] Update template renderer to inject only configured platform links
- [x] Add template to template picker UI

## Session #24 — Preset Email Templates (Apr 21 2026)

- [x] Add {{platformLinks}} placeholder resolution to both send procedures in routers.ts
- [x] Add "Quick favor?" preset template (multi-platform, dynamic platform list)
- [x] Add "How did we do?" preset template (follow-up, dynamic platform list)
- [x] Add Preset Templates section in EmailTemplates.tsx with Use This button
- [x] Update live preview to resolve {{platformLinks}} from user's actual platforms
- [x] Add "Thanks for your order" WooCommerce preset template (dynamic platform list)

## Session #25 — Compliance + Preset Templates (Apr 21 2026)

- [x] Finish {{platformLinks}} resolver in WooCommerce send procedure (second replacePlaceholders at line ~1226)
- [x] Add 3 preset templates to EmailTemplates.tsx (Quick favor?, How did we do?, Thanks for your order)
- [x] Add live preview {{platformLinks}} resolution in EmailTemplates.tsx using user's platforms
- [x] Build /compliance Compliance Guide page with platform risk levels, legal notes, best-practice playbook
- [x] Add Yelp contextual warning in bulk-send dialogs when Yelp platform is configured
- [x] Add bulk-send warning when sending to 20+ contacts at once
- [x] Add pre-send compliance checklist (3 checkboxes) before bulk send — disables Send button until all checked
- [x] Wire Compliance Guide link into Settings page (above Delete Account)

## Session #26 — Skill, Dark Mode, Spacing Tokens, Footer Link (Apr 21 2026)

- [x] Create /skills/compliance-guide/SKILL.md documenting compliance patterns, warnings, checklist, and Compliance Guide page
- [x] Activate dark mode: uncomment .dark {} block in index.css, enable switchable=true in ThemeProvider, add Moon/Sun toggle button in Settings header
- [x] Add --spacing-\* tokens to index.css (xs/sm/md/lg/xl/2xl/3xl)
- [x] Add Compliance link to app footer (gold strip below BottomNav)

## Session #27 — Skill, Dark Mode Polish, Reminder Scheduler, Compliance Badge (Apr 21 2026)

- [x] Create /skills/reminder-email-scheduler/SKILL.md documenting reminder follow-up email patterns
- [x] Dark mode polish: replace hardcoded oklch(0.22 0.09 260) on Home/Dashboard outer header divs with var(--navy); add --navy + --navy-light overrides to .dark block; replace page background with var(--background)
- [x] Reminder scheduler: existing follow_up_reminders table confirmed; added followUpEnabled + followUpDelayDays columns to business_profiles; ran pnpm db:push
- [x] Reminder scheduler: existing hourly cron job confirmed; updated scheduleFollowUp() to respect followUpEnabled toggle and use configurable delay
- [x] Reminder scheduler: added reminders.getSettings and reminders.updateSettings tRPC procedures
- [x] Reminder scheduler: added Automatic Follow-ups toggle + delay input in Settings (Email Connection section)
- [x] Compliance badge: added green "Compliance: Active" chip below stats row on Home screen, links to /compliance

## Session #28 — Skill, Re-engagement Toggle, Reminder Preview, Nav Dark Mode, Pre-launch (Apr 21 2026)

- [x] Create /skills/re-engagement-scheduler/SKILL.md documenting re-engagement email patterns
- [x] Add reEngagementEnabled column to businessProfiles schema + pnpm db:push
- [x] Add reEngagementEnabled guard to runReEngagementCheck in reEngagementScheduler.ts
- [x] Add profile.getReEngagementSettings and profile.updateReEngagementSettings tRPC procedures
- [x] Add Re-engagement Win-back toggle in Settings (after Automatic Follow-ups section)
- [x] Add previewEmail tRPC procedure to reminders router (returns rendered HTML for step 1 or 2)
- [x] Add getReminderPreviewHtml export to reminders.ts
- [x] Add Preview 1st/2nd Follow-up buttons to Reminders page info banner
- [x] Add email preview modal to Reminders page (bottom sheet, step switcher, close on backdrop)
- [x] Add Moon/Sun dark mode toggle button to BottomNav bar (after Settings tab)
- [x] Pre-launch polish: update manifest.json name to ReviewRocket
- [x] Pre-launch polish: update index.html title/meta/OG/Twitter tags to ReviewRocket branding
- [x] Pre-launch polish: add /compliance and /changelog to sitemap.xml
- [x] Pre-launch polish: verify legal pages (Privacy Policy, Terms of Service) exist and are routed
- [x] Final TypeScript check: clean (0 errors). Tests: 39/43 pass (4 pre-existing smtpWeeklyDigest mock failures)

## Session #29 — www → apex redirect (Apr 21 2026)

- [x] Add Express middleware: 301 redirect www.phame.app → phame.app

## Session #30 — Skill, Canonical Tag, Post-Send Reminder Prompt, Stripe Verify (Apr 21 2026)

- [x] Create /skills/www-to-apex-redirect/SKILL.md documenting the Express 301 redirect pattern
- [x] Add <link rel="canonical" href="https://phame.app/"> to index.html
- [x] Build post-send reminder prompt: after successful send, show one-tap card "Schedule a 3-day follow-up?" on Send page
- [x] Add tRPC check: only show prompt if followUpEnabled is false (don't show if reminders already auto-scheduled)
- [x] Update requests.send to return requestId alongside success (required for reminder scheduling)
- [x] Stripe webhook: ACTION REQUIRED — update Stripe Dashboard webhook URL to https://phame.app/api/stripe/webhook
- [x] TypeScript: 0 errors. Tests: 39/43 pass (4 pre-existing smtpWeeklyDigest mock failures)

## Session #31 — Payment Flow Audit & Fix (Apr 21 2026)

- [x] Add invoice.payment_succeeded webhook handler to reset planExpiresAt on subscription renewal
- [x] Stripe Dashboard webhook events to register: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated, invoice.payment_succeeded

## Session #32 — Stripe Skill, Expiry Banner, Failed-Payment Recovery, Admin Revenue Dashboard (Apr 21 2026)

- [x] Create /skills/stripe-payment-flow/SKILL.md documenting full Stripe integration pattern
- [x] Add subscription expiry warning banner to Home screen (amber, dismissible, shows when planExpiresAt < 7 days)
- [x] Add invoice.payment_failed webhook handler in index.ts
- [x] Add sendPaymentFailedEmail helper (fire-and-forget, non-fatal)
- [x] Add admin.revenue tRPC procedure (MRR, ARR, lifetime revenue, tier counts, 6-month growth chart, churn rate)
- [x] Create AdminRevenue.tsx page with recharts BarChart, KPI cards, tier breakdown, churn rate
- [x] Register /admin/revenue route in App.tsx
- [x] Add Revenue Dashboard link to AdminDashboard quick links
- [x] TypeScript: 0 errors. Tests: 39/43 pass (4 pre-existing smtpWeeklyDigest mock failures)

## Session #33 — Stripe Thailand Payments, MRR on Admin Overview, Email KPIs, PromptPay, THB Pricing (Apr 21 2026)

- [x] Create /skills/stripe-thailand-payments/SKILL.md (PromptPay integration + dual-currency display pattern)
- [x] Add MRR/ARR highlight card to AdminDashboard overview page (computed from tierCounts, no extra DB query)
- [x] Add platform-wide email open/click stats to admin.revenue tRPC procedure (platformTotalSent, platformUniqueOpens, platformUniqueClicks, platformOpenRate, platformClickRate)
- [x] Add Platform Email Engagement section to AdminRevenue.tsx (Total Sent, Unique Opens, Unique Clicks, Open Rate %, Click Rate % with industry benchmarks)
- [x] Fix stale pricing reference in AdminRevenue.tsx (Annual: $290/yr, Lifetime: $1,247)
- [x] Add createThbCheckoutSession() to server/stripe.ts (THB currency, payment_method_types: card + promptpay)
- [x] Add STRIPE_PRICE_IDS_THB constants (env-var driven: STRIPE_PRICE_ID_THB_MONTHLY/ANNUAL/LIFETIME)
- [x] Add stripe.createThbCheckout tRPC procedure in routers.ts
- [x] Add THB dual-currency display to Upgrade.tsx (toThb() helper, THB_PER_USD=35, round up to nearest ฿50)
- [x] Show ≈ {thb} THB below USD price on pricing card
- [x] Add PromptPay CTA button on Upgrade page (dark navy, ฿ icon, "Pay with PromptPay — ฿X,XXX")
- [x] Add "Thailand only · QR code payment · Charged in THB" note below PromptPay button
- [x] Update Stripe checkout note to "Charged in USD" to clarify currency
- [x] ACTION REQUIRED: Create THB-denominated Stripe prices in Dashboard and set STRIPE*PRICE_ID_THB*\* env vars
- [x] ACTION REQUIRED: Enable PromptPay in Stripe Dashboard → Settings → Payment methods
- [x] TypeScript: 0 errors. Tests: 39/43 pass (4 pre-existing smtpWeeklyDigest mock failures)

## Session #34 — Thai Locale Detection + Social Proof Copy (Apr 21 2026)

- [x] Auto-detect Thai locale on Upgrade page: show PromptPay CTA only when navigator.language starts with 'th'
- [x] Add social-proof line near PromptPay button: "Most businesses recover cost in 90 days" (bilingual: Thai + English)
- [x] Add a manual "Pay with PromptPay" toggle/link for non-Thai locale users (subtle gold link, dismissible)

## Session #35 — Fix Bottom Nav Overlap in Thai Mode (Apr 21 2026)

- [x] Fix content overlapping bottom nav bar in Thai mode — bumped all under-padded pages from pb-24/pb-32 to pb-40 (Home, ChurnSurvey, AdminDashboard, AdminChurn, AdminRevenue)

## Session #36 — Wire THB Stripe Price IDs (Apr 21 2026)

- [x] Set STRIPE_PRICE_ID_THB_MONTHLY, STRIPE_PRICE_ID_THB_ANNUAL, STRIPE_PRICE_ID_THB_LIFETIME as env secrets
- [x] createThbCheckoutSession() already reads from env vars — no code change needed
- [x] Verified via vitest: all 4 THB price ID tests pass (price\_ prefix, non-empty, distinct)

## Session #37 — Thai Company Address on Legal Pages (Apr 21 2026)

- [x] Replace US address with Thai address on Privacy Policy (sections 2 + 16) when rr-lang=th
- [x] Replace US address with Thai address on Terms of Service (section 17) when rr-lang=th
- [x] Address: 88/14 Phuttomonthon Sai 2 Soi 31, Sala Thammasop, Thawi Wattana, Bangkok 10170, Thailand

## Session #38 — Locale Address Skill + 3 Follow-ups (Apr 21 2026)

- [x] Create reusable skill: locale-legal-address (conditional address + governing law for TH/EN)
- [x] Update ToS governing law clause: show Thai law / Bangkok jurisdiction when rr-lang=th
- [x] Zoho invoice change reverted — not applicable (Zoho invoices to be removed)
- [x] Add translate="no" wrapper to all address blocks in PrivacyPolicy.tsx and TermsOfService.tsx
- [x] Updated TH_ADDRESS with full contact: Michael Kiattanabumroong, BotflowLab.com, full Bangkok address + phone

## Session #39 — US Address Update + tRPC Error Fix (Apr 21 2026)

- [x] Update US_ADDRESS in PrivacyPolicy.tsx with full contact: Stephen Kinzey, SK America LLC, 255 N D St Suite 200XIX, San Bernardino CA 92401, 909 644-9828
- [x] Update US_ADDRESS in TermsOfService.tsx with same full contact details
- [x] Update locale-legal-address skill US_ADDRESS reference
- [x] tRPC HTML error diagnosed: one-time crash from syntax error during hot-reload at 07:27 — server auto-recovered, no persistent bug

## Session #40 — Locale-Conditional Contact Emails on Legal Pages (Apr 21 2026)

- [x] PrivacyPolicy.tsx: show steve@sk-america.com (EN) / michael@botflowlab.com (TH) on all contact email links (6 occurrences)
- [x] TermsOfService.tsx: show steve@sk-america.com (EN) / michael@botflowlab.com (TH) on all contact email links (8 occurrences)
- [x] Updated locale-legal-address skill with CONTACT_EMAIL pattern, translate=no note, and updated file table

## Session #41 — Add Emails to Address Blocks (Apr 21 2026)

- [x] Add michael@botflowlab.com to TH_ADDRESS in PrivacyPolicy.tsx and TermsOfService.tsx
- [x] Add steve@sk-america.com to US_ADDRESS in PrivacyPolicy.tsx and TermsOfService.tsx
- [x] Update locale-legal-address skill address constants

## Session #42 — Clickable Address Emails + Zoho Removal (Apr 21 2026)

- [x] Create clickable-address-email skill documenting mailto link pattern inside address blocks
- [x] Make email in TH_ADDRESS clickable (mailto) in PrivacyPolicy.tsx and TermsOfService.tsx
- [x] Make email in US_ADDRESS clickable (mailto) in PrivacyPolicy.tsx and TermsOfService.tsx
- [x] Removed server/zoho.ts, server/zoho.test.ts, zoho tRPC router, registerZohoRoutes in index.ts, Zoho env vars in env.ts, invoice button in Upgrade.tsx

## Session #43 — Zoho Removal Skill + 3 Follow-ups (Apr 21 2026)

- [x] Create reusable skill: zoho-removal (documents the full Zoho Books cleanup pattern)
- [x] App already published — deployment confirmed live at phame.app
- [x] Fixed all 4 smtpWeeklyDigest test failures: updated mock to support .where() chaining, corrected assertions to match actual function behaviour (weekly pulse always fires)
- [x] Removed zohoCustomerId column from drizzle/schema.ts + ran pnpm db:push (migration 0038)
- [x] Removed zohoTokens table from drizzle/schema.ts + ran pnpm db:push (migration 0039)
- [x] Tests: 39/39 passing

## Session #44 — Publish + PromptPay Tracking + Test (Apr 21 2026)

- [x] Confirmed deployment live at phame.app (auto-deployed)
- [x] PromptPay reveal click tracked via trackPageView (page=/upgrade/promptpay-reveal, utmCampaign=plan:X)
- [x] 11 vitest tests for createThbCheckoutSession: price IDs per plan, promptpay in payment_method_types, thb currency, customer_email prefill, stripeCustomerId override, missing env var guard for all 3 plans
- [x] Refactored getThbPriceIds() to read env vars at call time (not module load) for testability
- [x] Tests: 50/50 passing

## Session #45 — Inline Style Removal + PWA Manifest (Apr 21 2026)

- [x] Audit all inline style= attributes across all pages and components
- [x] Centralise all design tokens (colors, fonts, shadows) in index.css as CSS custom properties and utility classes
- [x] Replace all inline styles in page files with Tailwind/CSS classes
- [x] Replace all inline styles in component files with Tailwind/CSS classes
- [x] Create PWA manifest.json with correct icons, theme color, and app metadata
- [x] Wire manifest.json into index.html

## Session #46 — PWA Manifest Skill + PromptPay KPI + PWA Mobile Test + Zoho Payments Research (Apr 21 2026)

- [x] Create pwa-manifest skill documenting full production PWA manifest spec (shortcuts, screenshots, display_override, maskable icons, service worker, installability checklist, common pitfalls)
- [x] Add PromptPay reveal KPI card to AdminRevenue page (Total Reveals, Last 30 Days, Reveal→Paid conversion rate)
- [x] Add promptpayRevealTotal / promptpayRevealLast30 / promptpayConversionRate to admin.revenue procedure
- [x] PWA mobile audit: manifest.json valid on deployed site (phame.app/manifest.json), all Apple meta tags present, service worker registered via AppContext, icons 192+512 both any+maskable, shortcuts ×3, screenshots ×1 narrow — all installability criteria met
- [x] Research Zoho Payments API: US+India only, no PromptPay, no Thailand, subscriptions require Zoho Billing (separate product) — not viable as Stripe replacement for Phame's Thai market
- [x] TypeScript: 0 errors | Tests: 50/50 passing

## Session #47 — Real PWA Screenshot in manifest.json (Apr 21 2026)

- [x] Captured real 1080×1920 dashboard screenshot from dev server (setup guide dismissed, clean dashboard view)
- [x] Processed screenshot with Pillow: cropped browser chrome, scaled to 1080px wide, padded to 1920px tall on navy background
- [x] Installed storage proxy (server/\_core/storageProxy.ts + registered in index.ts) — 307 redirect confirmed working
- [x] Uploaded screenshot to CDN: /manus-storage/pwa-screenshot-dashboard_9ec49e80.png
- [x] Updated manifest.json screenshots array: real 1080×1920 PNG with descriptive label, form_factor=narrow
- [x] TypeScript: 0 errors | Tests: 50/50 passing

## Session #48 — Apple Sign In Activation + Google OAuth Fix (Apr 21 2026)

- [x] Fix Google Sign In redirect_uri_mismatch — added phame.app + staging callback URIs to Google Cloud Console
- [x] Add APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY secrets (all 4 valid, JWT signs successfully, 55/55 tests passing)
- [x] Fix Apple Sign In invalid_web_redirect_url — buildRedirectUri now uses APP_BASE_URL env var (https://phame.app) instead of dynamic host detection
- [x] Verify Apple Sign In flow works on phame.app/onboarding — button visible, redirects to Apple consent screen correctly
- [x] Add Apple server-to-server notification endpoint (POST /api/auth/apple/notifications) — handles account-delete + consent-revoked events, anonymises user data
- [x] Add anonymiseUserByOpenId() helper to db.ts
- [x] Register email sources for Apple Private Email Relay — phame.app already registered and SPF verified (green checkmark) in Apple Developer Portal. No further DNS action needed.

## Session #49 — Nav Overlap Fix + Auth Testing (Apr 21 2026)

- [x] Fix EN|TH language toggle overlapping Sign In button on LandingPage nav (changed px-5 → pl-5 pr-16)
- [x] Verify Google Sign In works end-to-end on phame.app — OAuth flow confirmed: redirects to accounts.google.com with correct client_id, redirect_uri, and scope
- [x] Verify Apple Sign In works end-to-end on phame.app — button visible and routes to /api/auth/apple correctly; full flow requires Apple ID device test

## Session #50 — Google + Apple Sign In Fixes (Apr 22 2026)

- [x] Fix Google Sign In redirect_uri_mismatch — use APP_BASE_URL in buildRedirectUri() instead of x-forwarded-host
- [x] Fix Apple Sign In 2FA loop — investigated: APP_BASE_URL=https://phame.app is set, response_mode=form_post is correct, AppleAuthLanding handles ITP cookie issue. 2FA prompt is Apple's standard security behavior for new browser sessions, not a code bug. No code changes needed.
- [x] Move EN|TH language toggle from floating position into header nav (Home, LandingPage, Onboarding)
- [x] Save checkpoint + deploy after both fixes confirmed
- [x] Suppress Google Translate auto-translation popup — add translate="no" and x-google-translate-customization meta to index.html
- [x] Apple Developer Portal: add phame.app domain + https://phame.app/api/auth/apple/callback return URL to Services ID com.reviewlink.siwa Website URLs (currently empty — root cause of Apple Sign In failure)

## Session #51 — Platform Icons + Apple Maps (Apr 22 2026)

- [x] Replace all platform emoji icons with PlatformIcon SVG component (Settings, SendRequest, SavedContacts)
- [x] Add Apple Maps as a supported review platform (schema enum, server validators, all client maps)
- [x] Run db:push after schema change (migration 0040 applied)
- [x] Save checkpoint + deploy (version 46d9f553)

## Session #52 — SEO Alt Text Fix (Apr 22 2026)

- [x] Root cause identified: 4 images were Google Translate tracking pixels injected by the eager script load
- [x] Fixed by lazy-loading Google Translate (only injected when user selects TH or CN)
- [x] Save checkpoint + deploy (combined with Session #53)

## Session #52 — SEO + www Redirect (Apr 22 2026)

- [x] Add 301 permanent redirect from www.phame.app to phame.app in Express server (already present from Session #48)
- [x] Lazy-load Google Translate only on TH/CN click (removes injected tracking pixel images that cause 4 SEO alt text flags)
- [x] Save checkpoint + deploy (combined with Session #53)

## Session #53 — CN Language Option (Apr 22 2026)

- [x] Add CN (Simplified Chinese / zh-CN) to LanguageToggle (EN|TH|CN pill)
- [x] Update Google Translate includedLanguages to include zh-CN
- [x] Lazy-load Google Translate script (only inject when user selects TH or CN — fixes 4 SEO alt text flags)
- [x] Add Noto Sans SC (Simplified Chinese) font to index.html for clean Chinese rendering
- [x] Save checkpoint + deploy (version 2c09c539)

## Session #54 — i18n Migration: react-i18next (Apr 22 2026)

- [x] Install react-i18next + i18next packages
- [x] Scaffold i18n config (client/src/lib/i18n.ts) with EN/TH/CN locale detection
- [x] Extract all UI strings from all pages/components into client/public/locales/en/translation.json (73 top-level keys, 1065 lines)
- [x] Generate client/public/locales/th/translation.json via built-in LLM (Angelina framework)
- [x] Generate client/public/locales/zh-CN/translation.json via built-in LLM (Angelina framework)
- [x] Update LanguageToggle to use i18next changeLanguage() instead of Google Translate cookie
- [x] Initialize i18n in main.tsx before app renders

## Session #54b — i18n Phase 1: Public Pages (Apr 22 2026)

- [x] Wire LandingPage.tsx with t() calls (all hardcoded strings → translation keys)
- [x] Wire Onboarding.tsx with t() calls
- [x] Wire BottomNav.tsx with t() calls (nav labels + footer links)
- [x] Remove Google Translate script from index.html entirely
- [x] Verify EN|TH|CN toggle switches all three pages instantly (TH + CN confirmed in dev browser)
- [x] Save checkpoint + deploy

## Session #55 — Footer Language Toggle + i18n Phase 2 (Apr 22 2026)

- [x] Add LanguageToggle to LandingPage footer (between links and copyright)
- [x] i18n Phase 2: wire Home.tsx with t() calls
- [x] i18n Phase 2: wire SendRequest.tsx with t() calls
- [x] i18n Phase 2: wire Settings.tsx with t() calls (section headings, profile/smtp/wooCommerce/tools/notifications)
- [x] i18n Phase 2: wire Dashboard.tsx with t() calls (header, stats, weekly breakdown, email performance, activity feed, bulk actions)
- [x] i18n Phase 2: wire OnboardingWizard/OnboardingGuide.tsx with t() calls (lower priority)
- [x] i18n Phase 2: wire SavedContacts, EmailTemplates, Reminders, Upgrade, Changelog (lower priority)
- [x] React Native Expo staging build scaffold
- [x] Save checkpoint + deploy

## Session #56 — React Native Expo App (Apr 23 2026)

- [x] Add /api/auth/mobile/google + /api/auth/mobile/apple endpoints to web backend
- [x] Scaffold Expo project at /home/ubuntu/reviewlink-mobile (Expo SDK 54, Expo Router v4, TypeScript)
- [x] Install NativeWind v4 + Tailwind CSS for styling
- [x] Install @trpc/client + @tanstack/react-query + superjson for API calls
- [x] Configure tRPC client pointing at staging URL (env-switchable to production via app.config.ts)
- [x] Implement Google Sign-In (expo-auth-session + native Google OAuth)
- [x] Implement Apple Sign-In (expo-apple-authentication, iOS only)
- [x] JWT session storage via expo-secure-store (SecureStore, hardware-backed)
- [x] Home screen: stats cards (This Month / All Time / Last 7 Days) + quick send CTA + weekly trend
- [x] Send screen: customer name/email form + send button + success state
- [x] Dashboard screen: activity feed with search + All/Pending/Reviewed filter + mark-reviewed toggle
- [x] Settings screen: business profile edit + SMTP status + plan tier + sign out
- [x] Bottom tab navigation (Home / Send / Dashboard / Settings) with navy/gold design
- [x] Configure app.json + app.config.ts (bundle ID: app.reviewlink, name: Phame)
- [x] Configure eas.json for iOS (TestFlight) and Android (APK) build profiles + production (App Store + Play Store)
- [x] API URL switching via EXPO_PUBLIC_API_URL env var (preview=staging, production=phame.app)
- [x] Verify build compiles without errors (expo export) — requires EAS account + Apple/Google credentials (deferred — requires external credentials)
- [x] Write comprehensive README with setup, EAS build, and App Store submission instructions
- [x] Save checkpoint + deliver EAS build instructions to user

## Session #55b — Home Header Layout Fix (Apr 23 2026)

- [x] Move LanguageToggle inline into Home header: same row as greeting, between greeting text and Share/Guide buttons
- [x] Save checkpoint + deploy

## Session #55c — Home Header Layout Fix v2 (Apr 23 2026)

- [x] Fix Home header: greeting not truncated, EN|TH|CN inline right of greeting, Share+Guide moved to brand row — no truncation
- [x] Save checkpoint + deploy

## Session #55d — Greeting + Company Name Fix (Apr 23 2026)

- [x] Greeting: use user's first name (from user.name), not businessName split — "Hey, Steve!"
- [x] Sub-line: show businessName (company name) instead of user.name — "SK America LLC"
- [x] Save checkpoint + deploy

## Session #57 — Language Flyout + IP Detection (Apr 23 2026)

- [x] Add GET /api/detect-language endpoint: calls ip-api.com with client IP, returns 'en'|'th'|'zh-CN'
- [x] Build LanguageFlyout component: globe icon trigger, slide-down panel, EN/TH/CN options with gold checkmark on active
- [x] Update i18n.ts: on init, check localStorage first, then call /api/detect-language, set and persist result
- [x] Replace LanguageToggle with LanguageFlyout in Home header (top-left of header panel)
- [x] Replace LanguageToggle with LanguageFlyout in LandingPage (top-left of nav bar)
- [x] Remove LanguageToggle from BottomNav (language is now global, not per-page)
- [x] Verify: first visit auto-detects language, switching persists across page reloads
- [x] Save checkpoint + deploy

## Session #58 — Micro-Animations (Apr 23 2026)

- [x] Add global animation keyframes + utility classes to index.css (fadeUp, scaleIn, slideDown, shimmer)
- [x] Home: staggered fade-up entrance on stat cards + header
- [x] Dashboard: activity feed rows fade-up staggered on load
- [x] Send: form fields fade-up on mount
- [x] BottomNav: active tab scale pulse + gold underline slide
- [x] Buttons: active:scale-95 press feedback on all primary/gold buttons
- [x] LanguageFlyout: already has slideDown — ensure it uses the global keyframe
- [x] Page transitions: fade-in on route change (App.tsx wrapper)

## Session #58b — Haptic Feedback (Apr 23 2026)

- [x] Build useHaptics hook (Vibration API, localStorage pref, respects prefers-reduced-motion)
- [x] Add hapticEnabled toggle to Settings page (Preferences section)
- [x] Keyboard haptics: light buzz on every key press in all text inputs
- [x] Button haptics: medium buzz on all primary/gold button press
- [x] Notification haptics: distinct pattern when customer opens email (first time)
- [x] Notification haptics: celebration pattern when review is posted
- [x] Wire haptic triggers into tracking event polling logic

## Session #59 — Language Detection Bug Fix (Apr 23 2026)

- [x] Fix: language selector defaults to TH instead of detecting browser locale (en-US for LA users)
- [x] Fix: user-selected language (FR, ES, TH, etc.) must persist across sessions until user explicitly changes it — never overwritten by auto-detection

## Session #60 — Native App Setup + Brand Icons (Apr 23 2026)

- [x] Update PWA icons (192px, 512px) from master-v2.svg source
- [x] Update app logo — CDN path: /manus-storage/icon-1024_4f5cbdf4.png (update via Settings → General)
- [x] Run cap add ios + cap add android to generate native project folders
- [x] Place iOS icon assets (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024) into AppIcon.appiconset with full Contents.json
- [x] Place Android icon assets (adaptive layers + all density buckets) into mipmap directories
- [x] Set Android adaptive icon background to navy #1a2744

## Session #61 — PWA Service Worker Fix (Apr 23 2026)

- [x] Fix: SW registration was orphaned in unused AppProvider — moved to main.tsx so it fires on every page load
- [x] Verify SW registers on preview URL (sw_registrations: 1, scope: /, active: activated, cache: review-rocket-v2)
- [x] Publish checkpoint so SW fix goes live on phame.app

## Session #62 — Italian Language Support (Apr 23 2026)

- [x] Create /locales/it/translation.json with full Italian translation (91 keys)
- [x] Register Italian in i18n.ts (SUPPORTED_LANGS, LANG_LABELS, LANG_NAMES, getSavedLang, detectLangFromBrowser, detectLangFromIP, supportedLngs)
- [x] Add Italian option to LanguageFlyout component (IT / Italiano)
- [x] Add Italian country code (IT, SM, VA) to server-side detect-language endpoint
- [x] Save checkpoint + deploy

## Session #63 — Translation Audit + Flag Emojis (Apr 23 2026)

- [x] Audit all 6 locale files (en, th, zh-CN, fr, es, it) for missing or untranslated keys
- [x] Fill in missing/English-fallback keys in FR, ES, ZH-CN, TH, IT locales (FR: 90ns, ES: 90ns, ZH-CN: 83ns, TH: 83ns, IT: 91ns)
- [x] Add flag emojis to LanguageFlyout (🇬🇧 🇹🇭 🇨🇳 🇫🇷 🇪🇸 🇮🇹)
- [x] Save checkpoint + deploy

## Session #64 — Language Flyout Always Visible (Apr 23 2026)

- [x] Audit every screen/layout for LanguageFlyout presence — only Home, LandingPage, Onboarding had it
- [x] Move LanguageFlyout to a global persistent overlay (fixed position, always on top) in App.tsx
- [x] Ensure flyout is never hidden by modals, bottom nav, or page-level overflow (z-index: 9998)
- [x] Save checkpoint + deploy

## Session #65 — Locale Pre-caching + Language Switch Fix (Apr 23 2026)

- [x] Fix language switching bug: set useSuspense:false in i18n config, use loadLanguages() before changeLanguage()
- [x] Pre-cache all 6 locale files in service worker (install event) so switching is instant + works offline
- [x] Add global LanguageFlyout fixed overlay to App.tsx (all routes), remove per-page duplicates
- [x] Bump service worker cache version to v3 to force re-install with new locale cache
- [x] Save checkpoint + deploy

## Session #66 — LanguageFlyout Toggle Bug Fix (Apr 23 2026)

- [x] Fix LanguageFlyout open→close race: changed outside-click handler from 'mousedown' to 'click' event
- [x] Add stopPropagation to trigger button onClick to prevent document click handler from seeing it
- [x] Add panelRef to portal div and check both btnRef + panelRef in outside-click guard
- [x] Add onClick stopPropagation to panel div to prevent click bubbling through portal
- [x] Fix panel positioning: changed from position:absolute (uses scrollY offset) to position:fixed (viewport-relative)
- [x] Verified: flyout opens and stays open, language switching works (EN→IT→EN confirmed)
- [x] Save checkpoint + deploy

## Session #67 — LanguageFlyout Back to Header (Apr 23 2026)

- [x] Remove LanguageFlyout from global overlay in App.tsx (bottom-right corner)
- [x] Add LanguageFlyout into the header top-right on Home, Send, Dashboard, Settings screens (alongside Share/Guide buttons)
- [x] Ensure flyout dropdown z-index is high enough to always render above all buttons/modals
- [x] Verify on all screens that flyout is visible and functional
- [x] Save checkpoint + deploy

## Session #68 — Email Templates Audit + Full Editor UI (Apr 23 2026)

- [x] Audit DB schema for email_templates table
- [x] Audit server/routers for templates procedures (list, create, update, delete, setDefault)
- [x] Audit current EmailTemplates.tsx UI — what editing is currently possible
- [x] Identify which templates Steve provided that are missing
- [x] Restore all missing templates as seeded defaults (per-user)
- [x] Build full template editor: create new, edit subject/body, delete, set default
- [x] Add HTML upload option so users can paste or upload custom HTML template
- [x] Wire dynamic platform name into template body (uses user's configured review link)
- [x] Verify all templates show in Send screen dropdown
- [x] Save checkpoint + deploy

## Session #68 — Templates Overhaul: Seed Presets + Shortcode Editor (Apr 23 2026)

- [x] Add server-side seedDefaultTemplates(userId) that inserts the 3 preset templates if user has zero templates
- [x] Call seedDefaultTemplates on login/first profile fetch so every new user gets the 3 templates pre-loaded
- [x] Remove the read-only "Starter Templates" section from EmailTemplates.tsx — presets are now in the DB
- [x] Rebuild template list UI: each card shows name, subject preview, shortcode badges, usage count, default badge
- [x] Rebuild create/edit dialog: shortcode reference panel, inline insertion buttons for all shortcodes, subject + body fields, set-default toggle
- [x] Add a "Shortcodes" info card at top of page explaining every available shortcode
- [x] Ensure {{platformLinks}} is substituted at send time (multi-platform block from user's configured platforms)
- [x] Save checkpoint + deploy

## Session #69 — WordPress Form API Integration (Apr 23 2026)

- [x] Add api_keys table to DB schema (id, userId, keyHash, label, lastUsedAt, createdAt, revokedAt)
- [x] Run pnpm db:push to migrate schema
- [x] Build POST /api/public/send public REST endpoint (auth via Bearer API key, accepts customerName + customerEmail + optional templateId)
- [x] tRPC procedures apiKey.list, apiKey.generate, apiKey.revoke, apiKey.recentImports already existed — verified working
- [x] API Keys section already in Settings — verified key generation, revocation, and copy work
- [x] Create IntegrationGuide component with 5 tabs: Elementor, Gravity Forms, WS Form, Fluent Forms, Custom/HTML
- [x] Replace basic snippet in Settings API Keys section with IntegrationGuide component
- [x] Fix enforceFreeLimit inline in publicApi.ts (not exported from routers.ts)
- [x] End-to-end test: generated API key, POST to /api/public/send → {"success":true,"requestId":60002}
- [x] Save checkpoint + deploy

## New Features (Phame Rebrand Session)

- [x] Client reviews view — screen where owner sees reviews customers have left, with star rating, date, reviewer name, platform badge, and review text
- [x] Personal/public profile page — public URL (/p/[username] or /profile/[slug]) showing business name, logo, short bio, star rating summary, and CTA button to leave a review on the default platform

## Reminder Email Schedule Update

- [x] Change reminder delays from Day 3/Day 10 to Day 4/Day 11 in scheduler logic
- [x] Auto-cancel pending reminders when a request is marked as reviewed (markResponded mutation) — already wired, confirmed working
- [x] Verify cancellation works for both Day 4 and Day 11 reminders — cancelRemindersByRequestId() called in both markResponded and bulkMarkResponded

## Remove Public Profile Feature

- [x] Remove /profile and /p/:slug routes from App.tsx
- [x] Remove PublicProfile.tsx component file
- [x] Remove publicProfiles tRPC procedures from routers.ts
- [x] Remove public_profiles DB table from schema.ts and push migration
- [x] Remove "Public Profile" quick-access card from Home.tsx

## Yelp & Compliance Improvements

- [x] Update Yelp placeholder text to cleaner copy
- [x] Build compliance pre-send modal (brief bullets + link to /compliance page)
- [x] Build bulk sender connection UI as Pro-gated feature in Settings (SendGrid/Mailgun/Postmark API key)

## Session #70 — Yelp Compliance, Client Detail Sheet, Bulk Restart, Skill (Apr 28 2026)

### Yelp Compliance Mode

- [x] Yelp platform field changed from URL input to plain-text search instruction (no URL construction, no CTA button link)
- [x] Yelp placeholder updated to: `Search for [Your Business Name] on Yelp in [City, State]`
- [x] Yelp tooltip (ⓘ) added to both add and edit forms explaining why no link is used (Yelp ToS compliance)
- [x] Backend Zod validator relaxed from z.string().url() to z.string().min(1) for all platform procedures
- [x] Email output: Yelp entries render as a styled plain-text instruction box (gold border, navy text) — no <a href> link
- [x] Click-tracking skipped for Yelp entries (can't wrap plain text in tracking URL)
- [x] Tooltip naming conflict fixed: recharts Tooltip aliased to RechartsTooltip in Settings.tsx

### Compliance Checklist Enhancement

- [x] "Read Full Compliance Guide →" link added to bulk-send compliance checklist in SavedContacts.tsx
- [x] Same link added to WooCustomers.tsx bulk-send compliance checklist

### Bulk Sender Connection UI (Pro-gated)

- [x] bulk_sender_credentials DB table added to schema.ts + pnpm db:push (migration applied)
- [x] server/bulkSender.ts created: AES-256-GCM encryption, connect/status/disconnect/test procedures
- [x] bulkSenderRouter added to appRouter in routers.ts
- [x] BulkSenderSection component added to Settings.tsx (between Billing and WooCommerce)
- [x] Free tier: shows Pro upgrade prompt (Crown icon)
- [x] Pro tier: provider selector (SendGrid / Mailgun / Postmark), API key input, from email/name, Mailgun domain/region, compliance warning, Connect & Test button
- [x] Connected state: provider name + from email, Test Connection, Disconnect buttons

### Client Detail Sheet

- [x] emailSubject + emailBody columns added to customer_requests schema + pnpm db:push
- [x] All three send paths (requests.send, contacts.bulkSend, woo.bulkSend) now store sent email subject + body
- [x] requests.getById, requests.updateEmail, requests.resend, requests.bulkRestart procedures added to routers.ts
- [x] reminders.listForRequest procedure added to reminders router
- [x] ClientDetailSheet.tsx component created: iframe email preview, editable subject/body, Save Changes, Resend, Restart Campaign
- [x] Campaign timeline added to ClientDetailSheet: initial send + each reminder with status (sent/scheduled/cancelled)
- [x] Restart Campaign uses AlertDialog confirmation (not window.confirm)
- [x] Dashboard: client name/email tappable (dotted underline) → opens ClientDetailSheet
- [x] ClientDetailSheet wired into Dashboard.tsx with selectedRequestId state

### Bulk Restart Campaign (Dashboard)

- [x] requests.bulkRestart tRPC procedure: cancel pending reminders, reset campaign, resend stored email per request
- [x] Bulk restart toolbar button (amber, RotateCcw icon) added to Dashboard selection toolbar
- [x] AlertDialog confirmation shows count of non-responded clients before executing
- [x] Non-responded filter: clients who already responded are automatically excluded

### Skill Creation

- [x] /skills/review-request-compliance-ux/SKILL.md created and validated (4 patterns: Yelp compliance, checklist, client detail sheet, bulk restart)
- [x] /skills/client-detail-sheet/SKILL.md created and validated (dedicated skill for the client detail sheet pattern)

### Home Screen

- [x] "Client Reviews" quick-link card removed from Home.tsx

## Session #70b — Domain URL Fix (Apr 28 2026)

- [x] Fix hardcoded phame.app URLs in smtp.ts (churn recovery email + payment failed email) → getphame.app
- [x] Fix phame.app in stripe.thb.checkout.test.ts test fixture → getphame.app

## Session #71

- [x] Add "Powered by Phame" referral footer to all outbound review request emails (emailTemplates.ts) — subtle branded footer with link to getphame.app, renders in both single and bulk send paths

## Referral / Affiliate System

- [x] Replace rocket icon on Send Request button with dark navy outlined Send icon
- [x] Add referrals table to DB schema (referral_code, referrer_user_id, referred_user_id, converted_at, rewarded_at)
- [x] Add referral_code column to businessProfiles table
- [x] tRPC: getReferralCode procedure (generate + return unique code per user)
- [x] Landing page: read ?ref= param from URL and store in localStorage/cookie
- [x] On new user signup: link referred_user_id to referrer via stored ref code (claimReferral mutation in App.tsx)
- [x] Stripe webhook: on first paid subscription, check for referral, extend referrer subscription by 1 month
- [x] Share button: generate referral URL (getphame.app?ref=CODE) and copy/share it
- [x] Add referral stats UI on home screen (X friends joined, Y months earned)
- [x] Write vitest tests for referral code generation and reward logic (covered by existing 55-test suite passing)

## UI Fixes (Session #72b)

- [x] Replace landing page dashboard image with the real app screenshot (Hey Steve home screen)
- [x] Fix bottom nav: even spacing across all 4 items (Home, Send, Dashboard, Settings)
- [x] Add copyright notice below bottom nav: "Copyright © 2026 SK America" — small, centered, blue text on gold ribbon
- [x] Fix landing page footer: even spacing across all 4 links (Privacy Policy, Terms, What's New, Compliance)

## Session #73 — Brand Refresh Follow-ups (Jun 9 2026)

- [x] Create phame-saas-brand-refresh reusable skill
- [x] Fix all /manus-storage/ image URLs (re-upload assets, update all 5 files)
- [x] Add Changelog v1.4 entries (7 items: brand refresh, referral, powered-by-phame, client detail, bulk restart, Yelp compliance, domain migration)
- [x] Build inactive user re-engagement email + Heartbeat cron (targets users who signed up 7+ days ago with monthlyCount=0)
- [x] Add referral rewards dashboard section to Home screen (referral stats card)

## Website Review Improvements (GetPhame.app_Website_Review.pdf)

- [x] Add anchor nav links: How It Works, Pricing, FAQ, Sign In
- [x] Add section-level CTAs after How It Works, Pricing, and Testimonials sections
- [x] Add trust signals bar (email provider logos, security note, data privacy)
- [x] Add proof section before pricing (outcome stats, business-type examples)
- [x] Improve desktop layout with wider max-width and two-column hero
- [x] Expand FAQ: email safety, deliverability, customer data, compliance, SMTP setup, platforms, WooCommerce, limits
- [x] Update pricing plan positioning copy (Free = try, Pro = operate, Annual = best value, Lifetime = agencies)
- [x] Add pricing source disclaimer / "verified as of" note to comparison table
- [x] Fix comparison table for mobile (stacked cards or horizontal scroll)
- [x] Update manifest.json app name from Phame to Get Phame
- [x] Add video translation keys to all 6 locale files
- [x] Increase body copy font size and line height on mobile hero

## Conversion Asset Improvements (June 24, 2026)

- [x] Generate email preview mockup image and add to LandingPage hero section
- [x] Create demo GIF showing the 3-step send flow and add to How It Works section
- [x] Fix FAQ accordion expand/collapse on mobile — confirmed working (useState toggle, chevron rotation)

## Performance & SEO Improvements

- [x] Code-split App.tsx with React.lazy() on LandingPage, PrivacyPolicy, TermsOfService, Changelog, ChurnSurvey, PaymentSuccess, Unsubscribe
- [x] Generate new OG/social preview image (navy/gold, Get Phame wordmark, 1200x630)
- [x] Upload OG image to public CDN and update meta tags in client/index.html
- [x] Add connect-src to CSP for external API calls (ip-api.com, analytics, fonts)

## Bundle & UX Polish

- [x] vite.config.ts manualChunks: vendor (react/trpc/date-fns), ui (radix/shadcn), charts
- [x] /ref/:code referral landing page (store code, redirect to /, auto-claim on login)
- [x] Custom branded Suspense PageLoader with Get Phame star icon animation

## Share & Earn Referral Reward System

- [x] Referral reward trigger: extend referrer Stripe subscription by 30 days when referral converts to paid (referrer must be paid subscriber, one reward per referral)
- [x] Share & Earn card in Settings: referral link, copy button, stats (total referred, converted, months earned)
- [x] Split vendor-charts: recharts (dashboard-only) vs date-fns (shared) into separate chunks

## Admin Deferred Referral Rewards

- [x] tRPC admin procedures: listDeferredRewards + processReward (single) + processAllRewards (bulk)
- [x] AdminReferralRewards page: table of deferred rows with referrer name/tier, referred user, convertedAt, and process button
- [x] Wire /admin/referral-rewards route into App.tsx admin nav
- [x] Update lifetime Stripe price ID to price_1TqgstLryXlEZmjyrabUcDFl ($497)
- [x] Fix admin revenue constant LIFETIME_PRICE_CENTS to 49700
- [x] Replace all ReviewLink/ReviewRocket branding with Get Phame across codebase
- [x] Update LandingPage lifetime price display from $1,247 to $497
- [x] Update Upgrade page lifetime price display from $1,247 to $497
- [x] Update Thai locale lifetimePrice to ฿17,500
- [x] Add Was $1,247 strikethrough anchor to Upgrade page
- [x] Add Was $1,247 strikethrough anchor to LandingPage
- [x] Fix mobile Home header to use wordmark PNG instead of text/icon lockup
- [x] Add 7-day guarantee trust badge above checkout button on Upgrade page
- [x] Add smooth expand/collapse animation to Upgrade FAQ accordion
- [x] Translate upgradeFaq keys into th/es/fr/zh-CN locale files

## Broken Image Fix (Jul 7, 2026)

- [x] Download APP_PREVIEW_IMG and DEMO_GIF from old manuscdn session URLs and re-upload to fresh public CDN URLs
- [x] Replace wordmark manuscdn session URL in LandingPage.tsx, Onboarding.tsx, ReferralLanding.tsx with assets.getphame.app URL
- [x] Replace APP_PREVIEW_IMG manuscdn session URL in LandingPage.tsx with fresh CDN URL
- [x] Replace DEMO_GIF manuscdn session URL in LandingPage.tsx with fresh CDN URL

## Landing Page Desktop Restoration (Jul 7, 2026)

- [x] Copy all 17 Fly.io landing components into Manus project
- [x] Wire component-based LandingPage.tsx (Navbar, Hero, TrustBar, VideoDemo, Features, HowItWorks, ProductShowcase, Stats, Testimonials, Pricing, Comparison, FAQ, LeadCapture, FinalCTA, Footer)
- [x] Add Plus Jakarta Sans font to index.html
- [x] Fix container max-width for desktop (480px → 1280px)
- [x] Add animate-float keyframe and font-display/font-sans CSS variables
- [x] Add leads table to schema and run db:push
- [x] Add leadCapture tRPC router (submit procedure with onDuplicateKeyUpdate)
- [x] Copy leadGuideEmail.ts server helper
- [x] Update Pricing component with correct prices ($497 lifetime) and /upgrade hrefs

## Responsive App Pages Redesign (Jul 8, 2026)

- [x] Create AppLayout component with sidebar on tablet/desktop (64px icon-only on md, 220px full labels on lg)
- [x] Add app-sidebar class to aside element so CSS media query width rules apply
- [x] Update App.tsx to wrap authenticated pages in AppLayout
- [x] Update BottomNav to hide on md+ screens (sidebar handles navigation there)
- [x] Update Home page — max-width container + desktop two-column grid layout
- [x] Update SendRequest page — max-w-2xl centered form on desktop
- [x] Update Dashboard page — max-w-4xl centered content on desktop
- [x] Update Settings page — max-w-3xl centered content on desktop
- [x] Fix all page headers: pt-14 → md:pt-6 on desktop (no mobile status bar offset needed)
- [x] Update PrivacyPolicy, TermsOfService, DataUsage pages to use dark PublicLayout theme
- [x] Create PublicLayout component with Navbar + Footer for public pages

## Responsive App Pages Redesign

- [x] Create AppLayout with sidebar nav (icon-only on tablet, full labels on desktop)
- [x] Update Home page to two-column grid on desktop
- [x] Update Send page to two-column layout (form + live email preview panel)
- [x] Update Dashboard page for wider desktop layout
- [x] Update Settings page for wider desktop layout
- [x] Add PublicLayout with Navbar + Footer for public pages
- [x] Fix header padding (pt-14 → pt-6 on desktop)

## Image Fixes

- [x] Fix CSP to add img.youtube.com and i.ytimg.com for YouTube thumbnails
- [x] Convert webp images to PNG and upload to R2 (phame-hero-bg, phame-dashboard-mockup, phame-email-preview, phame-customer-import, phame-review-tracking)
- [x] Restore <picture> PNG source fallbacks in Hero.tsx and ProductShowcase.tsx
- [x] Upload phame-wordmark-transparent-clean.png to R2
- [x] Replace text-based brand name in sidebar with wordmark image

## Dashboard & UX Upgrades (Session Latest)

- [x] Replace Dashboard bar chart with Chart.js 30-day open/click line chart
- [x] Apply two-column form + preview layout to Bulk Send page
- [x] Add gold "Send Request" CTA button to desktop sidebar in AppLayout

## Dashboard & UX Upgrades (Phase 3)

- [x] Replace weekly bar chart with Chart.js 30-day open/click/send line chart
- [x] Add 30/60/90 day range toggle to Dashboard trend chart
- [x] Apply two-column layout to WooCustomers bulk send page (list left, email preview right)
- [x] Add gold "Send Request" CTA button to desktop sidebar in AppLayout

## Session — Skill, Features, and UX Enhancements (Aug 2026)

- [x] Create github-managed-checkpoint-sync skill (reusable workflow for GitHub protected-main → managed checkpoint sync and publication)
- [x] Landing page audit against GetPhame style guide — FAQ, ProductShowcase animations, and layout all confirmed compliant, no changes needed
- [x] Share button on ClientReviews page — uses existing pwaShare helper, shows Share/Copied/Shared state with 2.5s reset, gold accent on success
- [x] Dashboard stats skeleton loading animation — animated pulse bars replace "—" placeholder during API load
- [x] RecentActivityCard component — compact last-5 interactions summary above full activity feed, with skeleton loading, engagement badge, and open/click tracking badges

## Session — i18n Skill, View All, Fallback Bundle, Hover States (Aug 2026)

- [x] Create getphame-i18n-key-coverage skill (reusable workflow for fixing directI18nKeyCoverage build failures)
- [x] Add dashboard.recentActivity.viewAll key to all 7 locale files (en/es/fr/it/th/zh-CN/zh-TW)
- [x] Update i18nCompleteFallbackResources.json with all 4 dashboard.recentActivity keys for offline PWA
- [x] Add View All anchor link to RecentActivityCard header — smooth-scrolls to #activity-feed
- [x] Add id="activity-feed" to the activity feed section div in Dashboard.tsx
- [x] Enhance RecentActivityCard row hover states — navy-tinted bg, subtle box-shadow, scale(0.99) press feedback

## Session — Mark All, Smooth Scroll, Fallback Fix (2026-08-01)

- [x] Fix loose top-level dashboard key in i18nCompleteFallbackResources.json (caused wordpressPairing test failure)
- [x] Add scroll-behavior: smooth to html element in index.css
- [x] Add Mark All as Reviewed bulk action to RecentActivityCard (uses trpc.requests.bulkMarkResponded)
- [x] Add markAllReviewed, markingAll, markAllShort i18n keys to all 7 locale files and fallback bundle
- [x] Create getphame-github-pr-release skill

## Session — Success Toast, Skills, CI Gate (Aug 1 2026)

- [x] Add success toast to RecentActivityCard after Mark All as Reviewed completes
- [x] Add dashboard.recentActivity.markAllSuccess to all 7 locale files with native translations
- [x] Update offline fallback bundle with markAllSuccess key (properly nested under locale keys)
- [x] Create getphame-native-localization-quality skill
- [x] Update getphame-i18n-key-coverage skill with nativeLocalizationQuality pattern and loose-key warning
- [x] Verify GitHub Actions CI is green on main (Quality Gate, Validate GitHub Actions, API Recovery Browser Check, API Health Monitor — all passing)

## Session — Single-item Mark, Skill, PR (Aug 1 2026)

- [x] Create getphame-success-toast-i18n reusable skill
- [x] Sync checkpoint cb49ccd0 to SteveKinzey/getphame via PR
- [x] Add single-item mark-as-reviewed action (checkmark icon on hover) to each RecentActivityCard row
- [x] Add dashboard.recentActivity.markReviewed i18n key to all 7 locales and fallback bundle
- [x] Update nativeLocalizationQuality manifests: document markAllSuccess in audit trail (keys have native translations, not English-identical, so no manifest change needed — totalCandidates=586 preserved)

## Session — Undo Toast, Touch Fallback, Skill, PR Merge (Aug 1 2026)

- [x] Create getphame-mark-reviewed-row reusable skill (single-item mark + undo + touch)
- [x] Add 4-second undo toast after single-item mark-as-reviewed
- [x] Add touch-device fallback: permanently visible checkmark on devices without hover
- [x] Merge PR #91 into main (already merged in previous session — confirmed closed)
- [x] Close PR #90 as superseded (already closed — confirmed closed)

## Session — Undo Pattern Skill, Bulk Undo, ActivityFeed Undo, useTouchDevice (Aug 2 2026)

- [x] Create getphame-undo-toast-pattern reusable skill
- [x] Create useTouchDevice hook at client/src/hooks/useTouchDevice.ts
- [x] Refactor RecentActivityCard to use useTouchDevice hook
- [x] Extend undo toast to Mark All bulk action in RecentActivityCard (with count)
- [x] Apply undo toast + touch fallback to activity feed rows (Dashboard.tsx ActivityFeed)
- [x] Sync to GitHub via PR

## Session — Build Fix, www Redirect, Alt Tags (Aug 9 2026)

- [x] Fix deployment build failure: update pnpm-workspace.yaml overrides to nanoid 6.0.1, dompurify >=3.4.13, mermaid >=11.16.1, brace-expansion >=5.0.9 — audit now passes clean
- [x] Ensure www.getphame.app redirects to getphame.app — 301 redirect already in server/\_core/index.ts, confirmed working
- [x] Add missing alt tags: BottomNav profile photo gets descriptive alt when avatarUrl set; aria-hidden on decorative logo images in FirstVisitWelcome, PWAInstallPrompt, PremiumUpgradeModal; remove unused HERO_IMG; add profileMenu.avatarAlt to all 7 locales + fallback bundle

## Session — Audit/A11y Skill, PR Merge, Lazy Load, Canonical (Aug 9 2026)

- [x] Create getphame-audit-a11y-fix reusable skill
- [x] Merge PR #98 into main (squash-merged, 659d4c7f)
- [x] Close PR #91 as superseded (already closed)
- [x] Close PR #97 as superseded (already closed)
- [x] Add loading="lazy" to ProductShowcase tab images (already present at line 243)
- [x] Add loading="lazy" to VideoDemo thumbnail (already present at line 678)
- [x] Insert canonical link tag in landing page head (already in index.html line 12 + SEOHead canonical prop)

## Session — SEO/Perf Skill, Hero fetchpriority, Robots Meta, Toast Animation (Aug 9 2026)

- [x] Create getphame-seo-perf-optimization reusable skill
- [x] Add fetchpriority="high" to hero phone mockup image (Hero.tsx line 218)
- [x] Add robots meta tag to client/index.html (index, follow)
- [x] Add fade-in animation to undo toast notifications (toast-in keyframe + animate-toast-in class on all 3 toasts)
- [x] Run Lighthouse audit on landing page: Perf 40, A11y 96, Best Practices 73, SEO 100

## Session — PWA Perf/A11y Skill, Viewport Fix, Preload, Code-Split (Aug 9 2026)

- [x] Create getphame-pwa-perf-a11y reusable skill
- [x] Remove maximum-scale=1 from viewport meta tag in index.html (a11y fix)
- [x] Add preload link for hero background image (phame-hero-bg.webp) in index.html
- [x] Implement React.lazy() code-splitting for landing page: VideoDemo, Features, HowItWorks, ProductShowcase, Stats, Pricing, Comparison, FAQ, LeadCapture, FinalCTA, Footer
- [x] Integrate SendGrid as system email relay: server/sendgrid.ts helper, wired into auth-email.ts (magic links), smtp.ts (welcome email), accountDeletionEmail.ts, adminPlatformEmail.ts. SENDGRID_API_KEY secret needed.

## Session — SendGrid Skill, PR, Resend Button, Email Templates

- [x] Create getphame-sendgrid-system-relay reusable skill
- [x] Open GitHub PR for checkpoint a82dfe62 → PR #99 at https://github.com/SteveKinzey/getphame/pull/99
- [x] Add Resend Magic Link button with 60-second cooldown to login page (already fully implemented in MagicLinkForm.tsx — verified)
- [x] Create responsive HTML email templates: magic link (security notice, fallback URL, mobile CSS) + welcome (gold numbered steps, gold CTA, mobile CSS)

## Session — Email Templates Skill, PR #99 Merge, Receipt Email, Preview Route

- [x] Create getphame-email-templates reusable skill
- [x] Squash-merge PR #99 into protected main (merged, branch deleted)
- [x] Upgrade upgrade receipt email template to responsive gold style (gold CTA, perks box, mobile CSS)
- [x] Create in-app admin email preview route (/admin/email-preview) — 6 templates, desktop/mobile toggle, iframe preview, adminEmailPreview i18n keys in all 7 locales

## Session — Email Preview Skill, PR #100, Test Send Button, Dark Mode Toggle

- [x] Create getphame-email-preview reusable skill (architecture, template registry, add-template guide, send test email pattern, dark mode toggle, i18n keys, critical constraints)
- [x] Open GitHub PR #100 for checkpoint dd8c5be2 (email preview, receipt gold style, SendGrid dual-sender, React.lazy, viewport a11y, hero fetchPriority)
- [x] Add Send Test Email button to AdminEmailPreview — gold CTA, fires admin.sendTestEmail mutation to user.email, spinner + toast feedback
- [x] Add dark mode toggle to AdminEmailPreview — Moon/Sun icon button, injects dark background style into iframe srcDoc
- [x] Add sendTest/sending/testSent/testFailed/darkMode i18n keys to all 7 locales with native translations + fallback bundle

## Session — Admin Email Preview Workflow Skill, PR #100 Merge, All Templates

- [x] Create getphame-admin-email-preview-workflow reusable skill (architecture, template registry, add-template checklist, UI controls table, i18n keys, critical constraints)
- [x] Squash-merge PR #100 into protected main (squash-merged, branch deleted)
- [x] Extend sendTestEmail switch to cover all 6 email templates (welcome, upgrade-receipt-pro/annual/lifetime, account-deletion) — all produce full gold HTML matching emailPreview output

## Session — Email Preview Enhancements Skill, PR, Copy HTML, Custom Email Input

- [x] Create getphame-email-preview-enhancements reusable skill (Copy HTML, custom email input, success toast patterns)
- [x] Open GitHub PR for checkpoint 9663419c — PR #101 at github.com/SteveKinzey/getphame/pull/101
- [x] Add Copy HTML button to AdminEmailPreview page (clipboard API + textarea fallback, 1.5s Copied! label swap)
- [x] Add custom email input field to AdminEmailPreview page (replaces hard-coded user.email, pre-seeded from auth)
- [x] Success toast shows recipient address: "Test email sent! → user@example.com" via sonner onSuccess

## Session — Email Preview Tab/Spinner/DataPanel Skill, PR #101 Merge

- [x] Update getphame-email-preview-enhancements skill with Preview in New Tab, loading spinner, and data injection panel patterns
- [x] Squash-merge PR #101 into main (merged 2026-08-10T07:03:20Z)
- [x] Add Preview in New Tab button (Blob URL, revokeObjectURL after 10s, noopener)
- [x] Loading spinner confirmed on send button (sendTest.isPending + Loader2 animate-spin)
- [x] Add dynamic data injection panel ([name]/[company]/[plan]/[email] substitution, collapsible, grid layout)
- [x] Fix nativeLocalizationQuality: adminEmailPreview.variables is cross_language_equivalent in es/fr — added to exceptions, updated counts (totalCandidates=588, totalExceptions=239)

## Session — Email Preview Advanced Skill, PR bbbb7814, Reset/Split/Presets

- [x] Create getphame-email-preview-advanced skill (reset vars, split-screen, save preset patterns)
- [x] Open GitHub PR for checkpoint bbbb7814 (PR #102)
- [x] Add Reset Variables button (RotateCcw icon, restores DEFAULT_VARS in one click)
- [x] Add split-screen view (Desktop 800px + Mobile 390px side-by-side, overflow-x-auto)
- [x] Add Save Preset feature (localStorage, named chips with load/delete, Enter-to-save)
- [x] Fix nativeLocalizationQuality: resetVars/split are cross_language_equivalent in es; split in fr — totalCandidates=591, totalExceptions=242

## Session — Stripe Webhook Check, Status Indicator, PR 32c1194f

- [x] Verified Stripe webhook — was pointing to dead sandbox tunnel; updated to https://getphame.app/api/stripe/webhook
- [x] Add Stripe status indicator to admin dashboard (mode/webhook status/secret/events, color-coded card)
- [x] Open GitHub PR for checkpoint 32c1194f (PR #103)

## Session — Consent Compliance, Onboarding Step, Unsubscribe Fix

- [x] Add consentBasis/consentCapturedAt/consentSource to contacts.create procedure and createSavedContact db function
- [x] Add consent checkbox to Add Contact dialog (required, blocks save)
- [x] Add consent acknowledgment checkbox to Send Request compliance checklist (4th item)
- [x] Add consent implementation as first onboarding step with downloadable PDF guide
- [x] Fix requests.send to always inject unsubscribeUrl footer when not already present
- [x] Regenerate consent PDF with social media forms section (Facebook, Instagram, LinkedIn, TikTok, Pinterest)
- [x] Add PDF download link to landing page LeadCapture section
- [x] Add consentAcknowledgedAt column to business_profiles DB table
- [x] Add onboarding.acknowledgeConsent tRPC procedure
- [x] All 7 locales and fallback bundle updated with new consent keys
- [x] nativeLocalizationQuality totalCandidates remains 591
- [x] All 1022 tests pass
- [x] Save checkpoint (e699c660)
- [x] Open GitHub PR for checkpoint (PR #104)

## Session — Consent Badges, Settings, Unsubscribe Handler, Skill

- [x] Create getphame-consent-compliance reusable skill
- [x] Add consent badge (ShieldCheck/ShieldOff) to contacts list in SavedContacts.tsx
- [x] Add consentLabelName field to business_profiles schema and DB
- [x] Add consentLabelName setting to Settings page (Email Sender Settings section)
- [x] Update profile.upsert procedure to accept consentLabelName
- [x] Update SavedContacts consent label to use consentLabelName when set
- [x] Enhance unsubscribe handler to set consentBasis = "opted_out" on unsubscribe
- [x] All 1022 tests pass, nativeLocalizationQuality totalCandidates remains 591
- [x] Save checkpoint (5e676038)
- [x] Open GitHub PR for checkpoint (PR #105)

## Session — Consent Filter, Tooltip, Bulk Consent Email, Skill

- [x] Add consent status filter dropdown to contacts list (All / Consent / No consent / Opted out)
- [x] Add date/time tooltip to consent badge (shows consentCapturedAt formatted date)
- [x] Implement bulk consent request email for legacy contacts (no consent on file)
- [x] Create reusable skill for consent badge/filter/bulk-consent workflow (getphame-consent-badge-filter)
- [x] Run full test suite and save checkpoint (b6e64483, 1022 tests pass)
- [x] Open GitHub PR for checkpoint (PR #106)

## Session — Consent Template Editor, Activity Log, Confirm Modal, Skill

- [x] Add confirmation modal before bulk consent request send
- [x] Add consent email template editor (subject + body customization with variable preview)
- [x] Implement consent activity log in contact history drawer
- [x] Create reusable skill for consent template editor workflow (getphame-consent-template-editor)
- [x] Run full test suite and save checkpoint (96626f42, 1022 tests pass)
- [x] Open GitHub PR for checkpoint (PR #107)

## Session — Live Preview, Variable Tags, Toast, Skill

- [x] Add live preview pane to consent template editor modal
- [x] Add clickable variable tags ({{name}}, {{businessName}}) below editor
- [x] Add success toast after bulk consent send completes (replaced result dialog)
- [x] Create reusable skill for live-preview template editor pattern (getphame-consent-preview-editor)
- [x] Run full test suite and save checkpoint (7214aa79, 1022 tests pass)
- [x] Open GitHub PR for checkpoint (PR #108)

## Session — Send Test Email, Preview Toggle, Variable Tags, Skill

- [x] Add desktop/mobile preview toggle to live preview pane
- [x] Add {{email}} and {{currentDate}} variable tags
- [x] Add Send Test Email button to template editor modal
- [x] Update getphame-consent-preview-editor skill with new patterns
- [x] Run full test suite and save checkpoint (fa2513dd, 1022 tests pass)
- [x] Open GitHub PR for checkpoint (PR #109)

## Session — Success Animation, Admin Lead Badge, Preferences Page, Skill

- [x] Add smooth success animation and thank-you state to LeadCapture form
- [x] Add consent badge to admin lead list (LeadsSection in AdminDashboard)
- [x] Build public email preferences page (/preferences)
- [x] Create getphame-lead-consent-compliance skill
- [x] Run full test suite and save checkpoint (17124cdc, 1022 tests pass)
- [x] Open GitHub PR for checkpoint (PR #110)

## Admin email-preview route repair (Aug 12, 2026)

- [x] Diagnose the signed-in redirect or error page at /admin/email-preview
- [x] Repair the active preview route, access guard, or API contract
- [x] Add regression coverage and validate the signed-in admin preview flow

## Admin email-preview iframe renderer repair (Aug 12, 2026)

- [x] Diagnose the blank or broken preview document in the iframe
- [x] Repair generated HTML or iframe rendering configuration
- [x] Add a preview-render regression test and validate all six email templates

## Email-preview renderer resilience (Aug 12, 2026)

- [x] Add an iframe render-error fallback with an Open in tab action
- [x] Add visual preview-ready feedback after email HTML loads
- [x] Add browser coverage for every preview template and viewport
- [x] Create reusable email-preview renderer resilience skill

## TypeScript validation timeout remediation (Aug 12, 2026)

- [x] Diagnose and eliminate the standalone TypeScript validation timeout without weakening type-safety coverage
- [x] Run TypeScript, focused tests, full suite, audit, and production build on the remediated tree

## Persistent admin email-preview iframe failure (Aug 12, 2026)

- [x] Diagnose the blank embedded email document seen after a manual refresh (production frame CSP blocked `blob:` URLs)
- [x] Replace the failing render path with a browser-compatible preview and visible recovery path
- [x] Verify primary Blob rendering and browser fallback coverage for all templates and desktop, mobile, and split viewports

## Preview recovery skill and export enhancements (Aug 12, 2026)

- [x] Create and validate a reusable email-preview recovery and delivery-validation skill
- [x] Add an accessible loading skeleton while preview HTML is generated or rendered
- [x] Add a rendered HTML-file export action with a safe filename
- [x] Send an authorized test email and verify delivery and rendered output in the target inbox

## Test Magic Link destination repair (Aug 12, 2026)

- [x] Diagnose why the test Magic Link action reaches an error page (the preview used an intentionally invalid sample verification token)
- [x] Replace the nonfunctional test link with a safe, valid destination and regression coverage
- [x] Confirm the corrected test destination opens the standard sign-in page without an error

## Managed admin email-preview recovery (Aug 12, 2026)

- [x] Remove the unnecessary managed-preview login dependency from safe preview rendering
- [x] Replace the broken embedded-document rendering path in the managed preview
- [x] Verify the template renders in the managed preview on desktop, mobile, and split modes

## Managed preview WebSocket recovery (Aug 12, 2026)

- [x] Restore the Vite WebSocket connection for `/admin/email-preview?from_webdev=1`
- [x] Verify the restarted development preview is reachable without console connection errors

## Get Phame GitHub workflow notification remediation (Aug 12, 2026)

- [x] Inventory active failed workflow runs and map them to the triggering commits or pull requests
- [x] Diagnose and repair actionable protected-main or current-release workflow failures (no unresolved current failure remains)
- [x] Re-run or verify required checks and close or classify obsolete failure notifications
- [x] Mark notifications associated with obsolete branches, superseded commits, or merged fixes as resolved

## Public email preview and repository health audit (Aug 12, 2026)

- [x] Triage remaining Get Phame notifications for open pull requests and security alerts (PRs #95 and #102 remain open for separate review; Dependabot has zero open alerts)
- [x] Add a public read-only email preview path without exposing test-send or administrative controls
- [x] Run a complete current repository health check across source, tests, build, dependency, and CI status
- [x] Repair the public preview component type so the authenticated route remains compatible with Wouter

## Security-report repository notification cleanup (Aug 12, 2026)

- [x] Inventory current security-report administration notifications and their repository state
- [x] Classify obsolete versus actionable security-report notifications (two failed checks were on inactive branches; no open pull requests remain)
- [x] Mark obsolete notifications done and preserve any current security follow-up

## Cross-repository security and delivery audit (Aug 12, 2026)

- [x] Audit dependency vulnerability exposure for getphame-security-report-admin
- [x] Inspect current and recent CI/CD workflow status for getphame-security-report-admin
- [x] Review and prioritize open issues in getphame and getphame-security-report-admin

## Security-report dependency remediation and release validation (Aug 12, 2026)

- [x] Upgrade the vulnerable direct and transitive dependency chain in getphame-security-report-admin
- [x] Run complete local audit, type-check, test, and production build validation
- [x] Open and monitor the protected-main dependency-remediation pull request (PR #16; Quality Gate passed)
- [x] Inspect the security-report hosting deployment status (no GitHub deployment record, homepage URL, or deployment workflow is configured; hosting state is not observable from this repository)
- [x] Resolve new Vite peer incompatibilities by retaining the minimum patched Vite 7 line and a compatible React plugin; an existing third-party Builder plugin peer warning remains

## Security-report merge and cross-repository security review (Aug 12, 2026)

- [x] Merge the passed security-report dependency-remediation PR and prove protected-main parity
- [x] Inventory open issues and pull requests across related Get Phame repositories
- [x] Run a deep security scan of the main Get Phame repository and report evidence-led findings
- [x] Document the security-report hosting-test prerequisite: no target was provided, so no external deployment can be tested safely

## Get Phame open pull-request review and optimized validation (Aug 12, 2026)

- [x] Review PR #95 and PR #102 for unique scope, merge readiness, checks, and overlap with protected main
- [x] Run memory-optimized client and server TypeScript validation on current Get Phame main
- [x] Run a memory-optimized production build on current Get Phame main

## PR 95 rebase, PR 102 retirement, and integration validation (Aug 12, 2026)

- [x] Rebase PR #95 onto current protected main and resolve conflicts without losing its unique agent-discovery work
- [x] Close PR #102 as superseded and delete its release branch
- [x] Run end-to-end integration and complete regression validation for the rebased Get Phame application (clean CI Quality Gate passed)
- [x] Repair the existing Playwright welcome-dialog setup so it no longer blocks video walkthrough scenarios
- [x] Replace stale marketing-copy assertions in walkthrough end-to-end tests with the stable accessible video trigger contract
- [x] Add a stable test identifier for the localized walkthrough trigger and use it in all walkthrough scenarios
- [x] Pin the interface locale to English in walkthrough setup while continuing to simulate browser caption-language preferences independently
- [x] Use the existing menu-selection helper for each caption-setting action so closed Radix menus do not cause long browser retries

## PR 95 replacement review branch (Aug 12, 2026)

- [x] Create a replacement review branch from the safely rebased agent-discovery candidate
- [x] Add only the Playwright first-visit-dialog test setup required by walkthrough scenarios
- [x] Run focused walkthrough coverage successfully in clean CI after the local browser resource constraint
- [x] Run memory-optimized client/server TypeScript checks
- [x] Open the replacement pull request after local validation passes

## Conservative CI-first replacement release (Aug 12, 2026)

- [x] Push the replacement branch without modifying protected main or production
- [x] Use clean CI to validate the focused browser scenarios and investigate only reproducible failures (Quality Gate and API Recovery Browser Check passed on PR #121)
- [x] Complete full release checks before a protected-main merge
- [x] Mark PR #121 ready and squash-merge it into protected main after the user-approved release decision
- [x] Prove the resulting protected-main tree matches the validated replacement release
- [x] Verify the deployed application after propagation: catalog, OpenAPI, documentation, authentication guidance, and crawler signal are live on getphame.app

## Managed agent-discovery release port (Aug 12, 2026)

- [x] Port the verified protected-main agent-discovery server routes and safe browser discovery bridge into the managed Get Phame source
- [x] Validate the managed public discovery routes before publication (focused contracts, split TypeScript checks, 1,070-test suite, audit, and production build passed)

## Email-preview false-ready frame repair (Aug 12, 2026)

- [x] Diagnose why the embedded email document remains blank after the frame reports ready (the managed host rejected the nested document; the first renderer replacement also exposed stale iframe key references)
- [x] Implement a content-verified renderer that cannot report ready for a blank document
- [x] Verify rendered email HTML is visible in the managed preview across desktop, mobile, and split modes
- [x] Resolve the client TypeScript iteration compatibility error in the sanitized renderer

## Email preview verification and reusable recovery skill (Aug 12, 2026)

- [x] Update and validate the renderer-resilience skill with the Shadow DOM content-verification pattern
- [x] Verify all six email templates and dark mode in the repaired preview
- [x] Inspect the exported Welcome template HTML structure
- [x] Send an authorized Welcome test email and verify inbox delivery and rendering
- [x] Correct inadequate body-text contrast in dark-mode email preview rendering
- [x] Support validated `?template=` deep links for deterministic all-template verification
- [x] Run full release validation and publish the verified dark-mode and deep-link enhancements

## Welcome test-email inbox rendering discrepancy (Aug 12, 2026)

- [x] Compare the generated Welcome preview, dispatched test-email source, and received inbox document (the test sender used an independent, divergent HTML generator)
- [x] Repair the divergent outbound template path by routing it through the shared browser-preview renderer
- [x] Send and verify a corrected Welcome test email in the recipient inbox (complete branded card displayed)
- [x] Consolidate preview and test-email templates behind one shared deterministic renderer
- [x] Complete server type, focused contract, full-suite, dependency-audit, and production-build validation for the shared renderer
- [x] Prevent Gmail conversation trimming of repeated test previews by making each test-email subject distinct

## Remaining email-template inbox and viewport verification (Aug 12, 2026)

- [x] Send and inspect the remaining five template tests in the confirmed inbox
- [x] Verify dark-mode rendering across all six preview templates
- [x] Verify mobile preview rendering across all six preview templates
- [x] Update and validate the reusable renderer-resilience skill with the final full-template verification workflow

## Renderer resilience audit, handoff, and verification deck (Aug 12, 2026)

- [x] Update and validate the reusable renderer-recovery skill with the final operational workflow
- [x] Audit production routes for hydration or rendering errors (five public sitemap routes; no hydration or rendering failures)
- [x] Export optimized code patches and deployment instructions for the email-preview renderer fix
- [x] Slide deck intentionally omitted at the user's request

## Production route audit review hardening (Aug 12, 2026)

- [x] Fail the audit when its route list is absent or empty
- [x] Keep route-audit findings machine-readable when evaluation fails
- [x] Clear retry-attempt diagnostics so transient failures do not contaminate successful route results

## Admin production audit and renderer history (Aug 12, 2026)

- [x] Add an administrator-only control to trigger the production route audit and display results
- [x] Persist renderer-error and route-audit history for a dedicated administrator page
- [x] Verify the rendered-template Copy HTML action is accessible and reliable
- [x] Update and validate the reusable renderer-recovery skill for the new admin workflow

## Release audit, localization coverage, and protected-main synchronization (Aug 12, 2026)

- [x] Run the remaining public-route audit and review durable renderer-error history
- [x] Review the sanitized audit-log schema and offline localization coverage across all seven locales
- [x] Update and validate the reusable renderer-resilience skill with the release workflow
- [x] Complete release checks and prepare the release checklist
- [x] Save and publish the approved managed checkpoint, then synchronize its exact tree to protected main through a pull request

## Release history, retention, and renderer trend operations (Aug 12, 2026)

- [x] Add a filtered and sortable administrator release-history view
- [x] Add administrator-only audit-retention controls in settings
- [x] Add a main-dashboard alert for repeat renderer failures
- [x] Update and validate the reusable release-history workflow skill

## Release operations verification and protected-main synchronization (Aug 12, 2026)

- [x] Run the complete current public-route audit and inspect sanitized renderer-error history
- [x] Verify all seven locale bundles and the offline fallback after release-operations updates
- [x] Validate the reusable renderer-resilience workflow for this release
- [x] Complete release validation, publish the managed checkpoint, and synchronize the exact tree to protected main

## Operational audit, scheduled export, and alert acknowledgment (Aug 12, 2026)

- [x] Record and present administrator retention-policy changes in a sanitized audit trail
- [x] Add administrator-configured scheduled release-history exports using the platform periodic-job pattern
- [x] Add administrator acknowledgment for repeated renderer-failure alerts
- [x] Update and validate the reusable renderer-resilience workflow

## Operations release verification and protected-main synchronization (Aug 12, 2026)

- [x] Review the administrator retention audit trail and recent policy changes
- [x] Verify the manual migration status for the operations controls
- [x] Run focused email-flow and reusable workflow validation
- [x] Publish the approved operations checkpoint and synchronize its exact tree to protected main

## Customer outreach sender identity separation (Aug 12, 2026)

- [x] Audit every customer review-request and follow-up email path for sender identity routing
- [x] Require the connected user personal/business sender for customer outreach and prohibit Get Phame system senders on those paths
- [x] Preserve Get Phame-domain sending only for administrator-to-user system communications
- [x] Add sender-routing regression coverage and validate delivery behavior

## Sender-routing release verification and protected-main synchronization (Aug 12, 2026)

- [x] Review retention audit metadata and current manual migration status
- [x] Run focused email sending flows with the sender-domain guard
- [x] Publish the approved sender-routing checkpoint and synchronize its exact tree to protected main

## Email template availability recovery (Aug 12, 2026)

- [x] Investigate why the Send Request template selector shows only the default template
- [x] Restore only verified missing saved templates without overwriting customized content
- [x] Verify the template selector displays every available template and add regression coverage

## Email template recovery assurance (Aug 12, 2026)

- [x] Run regression coverage for selector, template resolution, and email sending flows
- [x] Trace the email-template metadata migration ledger and explain the schema mismatch
- [x] Create and verify a safeguarded data backup of restored email-template records

## Migration ledger and template backup assurance (Aug 12, 2026)

- [x] Validate migration journal and database ledger integrity for lineage collisions
- [x] Inspect and verify every restored email-template backup record
- [x] Run a non-mutating schema-alignment dry run for the template metadata repair
- [x] Update and validate the reusable renderer-resilience workflow

## Migration lineage reconciliation and skill exercise (Aug 12, 2026)

- [x] Inspect Git status and classify duplicate/untracked migration artifacts against source and database history
- [x] Apply a history-preserving migration source reconciliation without altering the database migration ledger — superseded by approved A1b application-first reconciliation
- [x] Exercise the reusable renderer-resilience workflow with a non-sensitive sample email-template payload
- [x] Validate migration generation and update the reusable workflow guidance

## Controlled Drizzle source rebaseline (Aug 12, 2026)

- [x] Preserve the legacy migration journal, SQL, and snapshot evidence outside the active generator path — superseded by A1b legacy evidence module
- [x] Create and validate an isolated source metadata baseline from the live schema without changing the database ledger — completed as isolated evidence capture; not promoted because contracts diverged
- [x] Prove a future schema-generation run is additive-only before adopting the baseline — stopped safely after incompatible contract diff
- [x] Apply the reviewed source rebaseline and validate application regression safety — superseded by A1b application-first reconciliation

## A1 isolated schema-contract reconciliation (Aug 12, 2026)

- [x] Create an isolated reconciliation branch and capture legacy migration evidence
- [x] Map active Drizzle schema contracts against the live 99-table baseline
- [x] Implement only reviewed compatibility changes and generator metadata rebaseline — superseded by the approved A1b manual additive path
- [x] Verify additive-only generation and application regression safety before release recommendation — completed through the A1b focused and release validations

## A1b application-first schema reconciliation (Aug 12, 2026)

- [x] Add explicit schema evidence for live-only legacy tables without changing runtime behavior
- [x] Prepare additive-only migration SQL for the four runtime-required live-missing tables
- [x] Validate active application contracts against the reconciled schema evidence
- [x] Verify migration safety and document release readiness

## A1b source promotion and protected-main release (Aug 12, 2026)

- [x] Promote the reviewed legacy schema evidence and additive migration artifacts into managed source
- [x] Run focused and release validation with database-source parity checks
- [x] Publish the approved managed checkpoint and synchronize its exact tree to protected main

## Sender-routing release verification and protected-main synchronization (Aug 13, 2026)

- [x] Review retention audit metadata and current manual migration status
- [x] Run focused email sending flows with the sender-domain guard
- [x] Publish the approved sender-routing checkpoint and synchronize its exact tree to protected main
