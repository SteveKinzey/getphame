# ReviewLink

**ReviewLink** is a mobile-first SaaS PWA that helps local businesses automate review requests. Owners connect their own email account (SMTP), import or sync customers, and send personalized review-request emails that look like they came directly from the business — not a bulk mailer. The app tracks opens and clicks, sends automated follow-up reminders, and includes a full churn-recovery and re-engagement email sequence.

Live: [reviewlink.app](https://reviewlink.app) · Staging: [revrocket-j5ynazte.manus.space](https://revrocket-j5ynazte.manus.space)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui, Radix UI, Wouter, Framer Motion |
| Backend | Express 4, tRPC 11, Superjson |
| Database | MySQL / TiDB (Drizzle ORM) |
| Auth | Direct Google OAuth 2.0, Sign in with Apple |
| Payments | Stripe (monthly/annual/lifetime) |
| Email | User-supplied SMTP relay (Nodemailer), AES-256-GCM encrypted credentials |
| Storage | AWS S3 |
| Mobile | Capacitor (iOS + Android PWA wrapper) |
| Testing | Vitest |

---

## Features

### Core

ReviewLink sends personalized review-request emails from the user's own SMTP account. Each email is built from a customizable template, includes the business name and review platform link, and is tracked for opens and clicks via a pixel and redirect proxy. Contacts can be imported via CSV, synced from WooCommerce, or added manually. The app enforces a configurable daily send limit and a per-contact cooldown to prevent over-mailing.

### Follow-up Reminders

A scheduler runs every 10 minutes and sends up to two follow-up emails per request: one at 3 days and one at 10 days after the initial send, if the contact has not yet clicked the review link. Contacts who click unsubscribe are permanently opted out.

### Multi-platform Review Links

Users can configure multiple review platform URLs (Google, Yelp, TripAdvisor, Facebook, Bing, and custom) and set a default. The review link in outbound emails always uses the active default.

### Subscription & Billing

Three tiers: Free (10 requests/month), Pro ($29/month or $290/year), Lifetime ($1,247 one-time). Stripe handles card processing. Access codes allow manual tier upgrades (useful for beta users, partnerships, or support). The owner account is permanently admin and bypasses all tier gates.

### Churn Recovery

When a paying user cancels, they are routed through a one-question churn survey (`/cancel`) before reaching the Stripe portal. If they select "too expensive", an inline discount offer appears (promo code `STAY40` — 40% off for 3 months, valid for 7 days). A churn-recovery email is sent immediately after cancellation. A re-engagement email fires 3 days later if the user has not resubscribed. Both emails include a one-click unsubscribe link.

### Admin Dashboard

The `/admin` route (role-gated) shows platform-wide stats: total users, tier breakdown, recent signups, recent send volume, and upsell click counts from the powered-by footer. A user search with a 300ms debounce lets the owner look up any user by name or email, see their tier and churn reason, and instantly override their tier via a dropdown. `/admin/churn` shows a bar chart of reason breakdowns and the last 10 free-text cancellation comments, each clickable to deep-link to the user search.

### Transactional Emails

The app sends four owner-to-user transactional emails via the owner's SMTP: welcome (first login), upgrade receipt (tier change), churn recovery (cancellation), and re-engagement (3 days post-churn). A weekly digest email summarises SMTP health failures and cancellations by reason.

### PWA & Mobile

The app is a fully installable PWA with a custom install prompt. Capacitor wraps it for native iOS and Android distribution. The Settings page includes an "Install App on Your Phone" button that re-triggers the install prompt.

---

## Project Structure

```
client/
  src/
    pages/          ← All page components
    components/     ← Shared UI (DashboardLayout, OnboardingGuide, etc.)
    hooks/          ← Custom hooks (useAnalytics, useDebounce)
    contexts/       ← AppContext (profile, requests, stats)
    lib/trpc.ts     ← tRPC client binding
    App.tsx         ← Routes
drizzle/
  schema.ts         ← All DB tables
server/
  routers.ts        ← All tRPC procedures
  db.ts             ← Drizzle query helpers
  smtp.ts           ← All transactional email functions
  emailTemplates.ts ← HTML email builder (review request + powered-by footer)
  googleAuth.ts     ← Direct Google OAuth routes
  appleAuth.ts      ← Sign in with Apple routes
  stripe.ts         ← Stripe checkout + webhook handler
  smtpWeeklyDigest.ts ← Weekly owner digest scheduler
  reEngagementScheduler.ts ← 3-day post-churn re-engagement scheduler
  _core/
    index.ts        ← Express app entry, route registration, schedulers
    trpc.ts         ← publicProcedure, protectedProcedure, paidProcedure, adminProcedure
    oauth.ts        ← Manus OAuth callback (legacy fallback)
    env.ts          ← Typed environment variables
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Auth identity (openId, name, email, role, loginMethod) |
| `business_profiles` | Per-user settings (businessName, tier, reviewLink, dailySendLimit) |
| `smtp_credentials` | AES-256-GCM encrypted SMTP config per user |
| `contacts` | Customer list (name, email, phone, tags, optedOut, lastSentAt) |
| `review_requests` | Sent requests (contactId, status, openedAt, clickedAt, reminderSentAt) |
| `platform_links` | Multi-platform review URLs per user |
| `stripe_subscriptions` | Active Stripe subscription IDs per user |
| `access_codes` | Manual upgrade codes (code, tier, note, usedBy) |
| `churn_surveys` | Cancellation reason, comment, offerValidUntil, reEngagementSentAt, unsubscribeToken |
| `page_events` | UTM attribution events (page, utmSource, utmMedium, utmCampaign, referrer) |

---

## Environment Variables

The following secrets must be configured (via Settings → Secrets in the Manus Management UI or a `.env` file locally):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL / TiDB connection string |
| `JWT_SECRET` | Session cookie signing key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) |
| `APPLE_CLIENT_ID` | Apple Services ID (e.g., `app.reviewlink.signin`) |
| `APPLE_TEAM_ID` | Apple Developer Team ID (10-char) |
| `APPLE_KEY_ID` | Apple Sign In key ID |
| `APPLE_PRIVATE_KEY` | Contents of the `.p8` private key file |
| `APP_BASE_URL` | Public base URL (e.g. `https://reviewlink.app`) |
| `OWNER_OPEN_ID` | Manus open ID of the app owner (auto-admin) |

---

## Google OAuth Setup

Before Google Sign In will work on the live domain, add these two **Authorized redirect URIs** to your OAuth 2.0 client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

```
https://reviewlink.app/api/auth/google/callback
https://revrocket-j5ynazte.manus.space/api/auth/google/callback
```

---

## Apple Sign In Setup

1. In [Apple Developer Console](https://developer.apple.com) → Identifiers → your App ID → enable **Sign in with Apple**.
2. Create a **Services ID** (this becomes `APPLE_CLIENT_ID`) and add the return URLs above.
3. Create a **Sign in with Apple Key** to get `APPLE_KEY_ID` and download the `.p8` file (`APPLE_PRIVATE_KEY`).
4. Add all four secrets via Settings → Secrets.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Push DB schema
pnpm db:push

# Start dev server (Express + Vite)
pnpm dev

# Run tests
pnpm test

# Type check
npx tsc --noEmit
```

---

## Deployment

Click **Publish** in the Manus Management UI after saving a checkpoint. The app is hosted at `reviewlink.app` with automatic SSL. No manual deploy steps required.

---

## License

Private — all rights reserved. Not open source.
