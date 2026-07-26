# Get Phame — Consolidated Next Steps

Last updated: Jul 25, 2026

---

## Admin & Access Control

- [ ] **Add partner as admin** — once partner's email is confirmed, run `promoteToAdmin` + `grantLifetime` via the AdminDashboard Promote User form (no code change needed)
- [ ] **Add "List Admins" view in AdminDashboard** — small table showing all current admin accounts (email, name, tier) for visibility into who has elevated access
- [ ] **Admin "Promote User" UI already built** — `/admin` → Promote User section → enter email → "Admin + Lifetime" or "Lifetime Only"
- [x] **Coupon Code Generation form built** — `/admin` → Generate Coupon Code section; supports days/months/lifetime duration, custom code, internal note, max uses, expiry; live random code preview with refresh + clipboard copy
- [x] **Revoke Access button added to Privileged Users table** — Ban icon button per non-admin row; confirm dialog before downgrade; invalidates list on success
- [x] **`revokeAccess` tRPC procedure added** — `adminManagement.revokeAccess({ email })` resets tier to free + clears planExpiresAt
- [x] **`accessCodes.createCoupon` procedure added** — full duration semantics: days/months/lifetime, grantAmount, maxUses, expiresAt
- [x] **`accessCodes.generatePreview` procedure added** — returns a random code without persisting (used by coupon form live preview)
- [x] **`admin-subscription-management` reusable skill created** — covers coupon generation, revoke access, grant subscription, DB schema, and security rules

---

## What's New / Changelog Modal

- [ ] **Update changelog entries in `WhatsNewModal.tsx`** — replace generic placeholder entries with actual release notes for each version; modal auto-shows once per deployed version after login
- [ ] **Translate What's New modal content** — move changelog entry titles/descriptions into locale JSON files for full i18n across EN, TH, ES, FR, IT, ZH-CN
- [ ] **Add version field to each changelog entry** — filter entries by version so future releases only show new items, not the full history

---

## i18n / Localization

- [ ] **Translate Activity Trend chart label** — `"Activity Trend"` heading and `"No activity in the last X days"` empty state in Dashboard are wired with `t()` but keys may need to be added to non-English locale JSON files
- [ ] **Translate bulk-action toast messages in Dashboard** — "X sent, Y failed" result toasts are wired with `t()` but verify all 6 locale files have the `dashboard.toasts.*` keys
- [ ] **Translate plural strings in ShareReferralCard** — "friend joined" / "friends joined", "free month earned" / "free months earned" — use `i18next` `_plural` suffix keys for proper pluralization in all 6 locales

---

## PWA / Version Management

- [ ] **Publish latest checkpoint to production** — the new service worker (v4) with `skipWaiting` + `clients.claim` will auto-update all users' browsers on next visit; language toggle will appear on iPhone/Android after publish
- [ ] **Instruct users to reinstall PWA** — for users who installed the old version, delete the old icon and re-add via Safari (iPhone) or Chrome (Android) after publishing
- [ ] **pwa-force-reload skill created** — reusable at `/home/ubuntu/skills/pwa-force-reload/SKILL.md` for future Manus webdev projects

---

## Landing Page / Navbar

- [ ] **Tighten CTA button text at 1024–1100px** — consider `"Start Free"` at `lg` and full `"Get Started Free"` at `xl` using responsive Tailwind text classes
- [x] **Sticky mobile CTA bar added to landing page** — fixed bottom gold button for mobile visitors (lg:hidden)

---

## Onboarding

- [ ] **Add "Your data" explainer screen to OnboardingWizard** — one-screen section before the email connection step that clearly outlines what data scopes are accessed and what is NOT accessed, to reduce friction and build trust
- [ ] **Link PWAInstallPrompt to OnboardingGuide install step** — already done; verify it works correctly on production after publish

---

## Dashboard

- [ ] **Add "What's New" changelog popup after update** — user sees "New version available" toast → taps update → sees "Here's what changed" list; store last-seen version in localStorage (WhatsNewModal already built, just needs real content)

---

## Settings

- [ ] **Add "Share with a friend" button to PWAInstallPrompt** — `navigator.share()` native share sheet to forward `getphame.app` URL; doubles as a lightweight referral touchpoint (already added to InstallGuideCard in Settings and OnboardingGuide step 7)

---

## Security & Compliance

- [ ] **Run `pnpm audit --prod`** — check for production dependency vulnerabilities
- [ ] **Enable Dependabot** — automated dependency updates for CVE coverage between monthly reviews
- [ ] **Set up `security@getphame.app` forwarding alias** — matches the SECURITY.md promise
- [ ] **Add Security link in footer** — next to Privacy Policy and Terms of Service

---

## Revenue / Monetization

- [ ] **Add annual savings callout on Upgrade page** — "Save $58/yr" badge on Annual plan card (may already exist — verify)
- [ ] **Add a "sticky upgrade nudge"** — for free-tier users who hit the 5/month limit, show a persistent gold banner at the top of the app (not just a toast) to drive upgrade conversions
- [ ] **Add coupon redemption UI on Upgrade page** — input field for users to enter a coupon code; calls `accessCodes.redeem`; shows success toast with tier + duration granted

---

## Content / Copy

- [ ] **Update `WhatsNewModal.tsx` changelog entries** — add real release notes for the Jul 11 session: language toggle, PWA force-reload, admin panel, install guide, What's New modal itself
- [ ] **Review landing page copy** — apply recommendations from `GetPhame.app_Website_Review.pdf` (in project files) if not already fully implemented

---

## Remaining from Jul 25 Session

- [ ] **Add coupon redemption field on Upgrade page** — users need a way to enter coupon codes; wire to `trpc.accessCodes.redeem` (already implemented in `redeemAccessCode` helper)
- [ ] **Update WhatsNewModal with Jul 25 release notes** — sticky CTA bar, admin subscription management (coupon generation + revoke access), Grant Subscription section, Privileged Users table
- [ ] **Translate new admin UI strings** — coupon form labels, revoke confirm dialog, and grant subscription section are English-only; add i18n keys to all 6 locale files
- [ ] **Add coupon code to AdminCodes page** — the `/admin/codes` full management page should show `grantDurationType` and `grantAmount` columns in the codes table
