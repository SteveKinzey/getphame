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

## Sitemap & SEO
- [x] Add dynamic /sitemap.xml server endpoint with all public routes
- [x] Add /robots.txt pointing to sitemap
- [x] Verify sitemap returns valid XML at reviewlink.app/sitemap.xml

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
- [x] Welcome email HTML: branded ReviewLink template, confirms connection works, shows sample review request preview, links to /send
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
- [x] Wire runSmtpHealthChecks into a daily cron job in server/_core/index.ts (runs at 3am UTC)
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
- [x] Remove startGmailHealthCheckScheduler import and call from server/_core/index.ts
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
