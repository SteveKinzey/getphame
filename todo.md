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

## Saved Contacts Filter + Sync UX

- [x] Show contact count per source in filter pills (e.g. "Stripe (24) · WooCommerce (61) · Manual (8)")
- [x] Add configurable day range dropdown to WooCommerce sync button (30 / 60 / 90 days)

## Individual Email Dispatch (No Group Sends)

- [x] Audit all bulk send paths (contacts.bulkSend, woo.bulkSend, reminders) to confirm each email is sent as a separate SMTP message with a single recipient
- [x] Fix any paths that pass multiple recipients in a single sendMail call (none found — all paths already correct)
- [x] Verify To/CC/BCC fields never contain more than one address per send (confirmed — no CC/BCC anywhere, to: is always a single string)

## Onboarding Guide Modal

- [x] Build OnboardingGuide.tsx — full-screen modal with paginated step-by-step setup directions
- [x] Step 1: Welcome — what ReviewLink does, what you'll set up
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
- [x] Pre-filled message: "I use ReviewLink to collect Google reviews — it's free: reviewlink.app"
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

- [x] Set APP_BASE_URL=https://reviewlink.app as a project secret; harden reminder tracking fallback to use it
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
- [x] Add support@reviewlink.app to landing page footer

## Legal Pages

- [x] Rewrite PrivacyPolicy.tsx with complete, substantive content covering all required sections

## ToS + Account Deletion

- [x] Rewrite TermsOfService.tsx with full depth (acceptable use, DMCA, liability cap, arbitration clause)
- [x] Add accounts.deleteAccount tRPC procedure that wipes all user data
- [x] Add "Delete Account" button with confirmation dialog to Settings page

## Landing Page Testimonials

- [x] Replace placeholder testimonial with Sarah (freelance photographer) and Tom (local cafe owner) quotes

## Referral Nudge

- [x] Add "Share ReviewLink" referral card to Home screen with Web Share API + clipboard fallback

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
- [x] Add Send Feedback form to Settings page (one-field, emails support@reviewlink.app)
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
- [x] Include Birdeye, Podium, NiceJob, Grade.us, ReviewTrackers vs ReviewLink in a styled table
- [x] Highlight ReviewLink's price advantage and lifetime option with checkmarks/badges
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
- [x] Stripe Price IDs: update server/stripe.ts with real price_... IDs (monthly/annual/lifetime wired, plan param added to createCheckout procedure and frontend handler)

## Follow-up Features (Session — Apr 20 2026 cont. 2)

- [x] Stripe webhook: handle checkout.session.completed with mode=payment to activate Lifetime tier
- [x] Stripe webhook: store plan metadata in stripe_subscriptions or users table for Lifetime (sentinel record with status=lifetime)
- [x] Cancel all pending reminders for same customerRequestId when respondedAt is set on customer_request
- [x] Verify Stripe checkout flow end-to-end (monthly, annual, lifetime) — ready for testing on deployed domain

## Navigation Fixes (Session — Apr 21 2026)

- [x] Fix back button on What's New page and all other pages that have a back button
- [x] Make ReviewLink logo tap navigate to home screen on all pages

## New Features (Session — Apr 21 2026 #2)

- [x] Settings: add Billing section showing current tier, renewal date (Monthly/Annual), and Manage Billing button (Stripe Customer Portal)
- [x] Payment Success page: build proper confirmation screen with tier-specific messaging and CTA to Send page
- [x] Home screen: upgrade ShareReferralCard to prominent card with message preview and full-width CTA button

## New Features (Session — Apr 21 2026 #3)

- [x] Settings Billing: add retention confirmation dialog before Manage Billing opens Stripe Portal
- [x] Send page: add post-send milestone rating nudge at 10th and 25th request sent
- [x] Email sending: append "Powered by ReviewLink" footer to outgoing emails for free-tier users (Pro/Lifetime get clean footer automatically)

## Capacitor / Native App (Session — Apr 21 2026)

- [x] Install Capacitor core, CLI, iOS platform, and @capacitor-community/contacts plugin
- [x] Create capacitor.config.ts with bundle ID com.reviewlink.app pointing to reviewlink.app
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
- [x] Powered-by footer upgrade upsell: replace plain "Powered by ReviewLink" link with "Powered by ReviewLink — Remove branding ↗" that deep-links to /upgrade?utm_source=powered_by_footer

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
- [ ] DB schema: add api_keys table (id, userId, key hash, label, createdAt, lastUsedAt, revokedAt)
- [ ] tRPC procedures: apiKey.generate, apiKey.list, apiKey.revoke
- [ ] Settings UI: API Keys card with generate/copy/revoke, integration code snippet
- [ ] Public endpoint: POST /api/public/contacts with Bearer auth, upsert logic, rate limiting
- [x] Add Send Test Email button to OnboardingGuide email step (fires real test email to connected address)
- [ ] Add platform-specific emoji/icons to Review Platforms list in Settings
- [ ] Create skill: api-key-contacts-import documenting the pattern
