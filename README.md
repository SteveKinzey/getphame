# Phame — Get More Reviews on Autopilot

**Phame** helps local businesses collect more Google, Yelp, and TripAdvisor reviews by sending personalised review-request emails directly from your own email account. Customers receive a message that looks like it came from you — not a bulk mailer — which means higher open rates and more genuine reviews.

🌐 **Live app:** [phame.app](https://phame.app)

---

## What Phame Does

Phame connects to your existing email account (Gmail, Outlook, Yahoo, or any business email) and sends personalised review-request emails to your customers. You control the message, the timing, and which review platform you want to direct customers to. The app tracks who opened the email and who clicked the review link, and automatically sends up to two follow-up reminders to customers who haven't responded yet.

---

## Getting Started

### Step 1 — Create your account

Go to [phame.app](https://phame.app) and tap **Get Started Free**. Sign in with your Google or Apple account. No credit card required.

### Step 2 — Connect your email

Go to **Settings → Email Connection** and enter your SMTP credentials. Phame sends emails from your own address, so customers see your name in the "From" field.

| Provider | What you need |
|---|---|
| Gmail | Enable 2-Step Verification, then generate an [App Password](https://myaccount.google.com/apppasswords) |
| Outlook / Microsoft 365 | Generate an App Password in your Microsoft account security settings |
| Yahoo | Enable 2-Step Verification, then generate an App Password |
| Zoho Mail | Enable SMTP access in Zoho Mail settings (Settings → Mail Accounts → SMTP) |
| iCloud | Generate an App-Specific Password at [appleid.apple.com](https://appleid.apple.com) |
| Business / cPanel | Use the SMTP host, port, and password from your hosting control panel |

After saving, tap **Send Test Email** to confirm the connection is working.

### Step 3 — Add your review platform link

Go to **Settings → Review Platforms** and add the URL where you want customers to leave a review. You can add multiple platforms (Google, Yelp, TripAdvisor, Facebook, Bing) and set a default. The default link is used in all outbound emails.

**How to find your review link:**

- **Google** — Search your business on Google Maps, click "Write a review", and copy the URL from your browser.
- **Yelp** — Go to your Yelp business page and copy the URL.
- **TripAdvisor** — Go to your TripAdvisor listing and copy the URL.
- **Facebook** — Go to your Facebook Page → Reviews tab and copy the URL.

### Step 4 — Import your customers

You have four ways to add contacts:

**Manual entry** — Tap **Send** and enter a name and email address to send a one-off request immediately.

**CSV import** — Go to **Saved Contacts → Import CSV**. Your file needs at minimum a `first_name` and `email` column. Optional columns: `last_name`, `phone`, `notes`.

**WooCommerce sync** — Go to **Settings → WooCommerce**, enter your store URL and API keys (see the setup guide in the app), then tap **Sync Orders**. Synced orders are held as pending imports — review and confirm them before they appear in your contacts list. Any pending imports older than 7 days are automatically imported every Monday at 03:00 GMT.

**API / website form** — Go to **Settings → API Keys**, generate a key, and use the provided HTML/JS snippet to add a contact capture form to any webpage. Contacts submitted through the form appear in your Saved Contacts list automatically.

### Step 5 — Send review requests

Go to **Send** and enter a customer's name and email, or go to **Saved Contacts**, select one or more customers, and tap **Send Review Request**. Phame sends the email from your connected account and starts tracking opens and clicks.

---

## Automatic Follow-ups

Phame sends up to two follow-up emails per customer automatically:

- **Day 3** — a gentle reminder if the customer hasn't clicked the review link yet
- **Day 10** — a final nudge if still no click

Customers who click **Unsubscribe** in any email are permanently opted out and will never receive another message.

---

## Dashboard & Tracking

The **Dashboard** shows your recent send activity, open rates, click rates, and which customers have left a review (clicked the link). Use this to identify customers who opened but didn't click — they're your warmest leads for a personal follow-up.

---

## Plans & Pricing

| Plan | Price | Requests |
|---|---|---|
| Free | $0 | 10 review requests (total) |
| Pro Monthly | $29 / month | Unlimited |
| Pro Annual | $290 / year | Unlimited (save $58) |
| Lifetime | $1,247 once | Unlimited, forever |

Upgrade at any time from **Settings → Upgrade Plan**. Stripe handles all payments securely.

---

## Integrations

### WooCommerce

Connect your WooCommerce store to automatically pull in customers from completed orders. Go to **Settings → WooCommerce** and follow the in-app setup guide. Only orders with status **Completed** are synced.

### API — Import contacts from any form

Generate an API key in **Settings → API Keys** and use the provided snippet to capture contacts from any website form, landing page, or checkout flow. The endpoint accepts `first_name`, `last_name`, `email`, `phone`, and `notes`.

```
POST https://phame.app/api/public/contacts
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "555-1234",
  "notes": "Purchased product X"
}
```

### Outbound Webhooks

Go to **Settings → Webhooks** to configure a URL that Phame will call whenever a new contact is created. Use this to push new contacts into a CRM, trigger a Zapier workflow, or post a Slack notification. You can filter by event type (`contact.created`, `contact.updated`, or both) and test the webhook from the Settings page.

---

## Privacy & Unsubscribes

Every review-request email includes a one-click unsubscribe link. Customers who unsubscribe are immediately and permanently opted out — they will not receive any further emails from Phame, including reminders. You can see opted-out contacts in **Saved Contacts** (they are marked and cannot be selected for sending).

Phame does not share your customer data with third parties. Your SMTP credentials are encrypted at rest using AES-256-GCM.

---

## Installing the App on Your Phone

Phame is a Progressive Web App (PWA) — you can install it on your home screen for a native app experience.

- **iPhone / iPad** — Open [phame.app](https://phame.app) in Safari, tap the Share button, and select **Add to Home Screen**.
- **Android** — Open [phame.app](https://phame.app) in Chrome, tap the three-dot menu, and select **Add to Home Screen** (or **Install App** if prompted automatically).
- **From the app** — Go to **Settings** and tap **Install App on Your Phone** to re-trigger the install prompt.

---

## Frequently Asked Questions

**Will my customers know I'm using Phame?**
No. Emails are sent from your own email address using your own SMTP credentials. The only branding is a small "Powered by Phame" footer link, which can be removed on the Pro plan.

**What happens if a customer already left a review?**
Phame tracks whether a customer clicked the review link. If they clicked, no further reminders are sent. If they left a review without clicking the link (e.g. found you directly on Google), you can manually mark them as reviewed in Saved Contacts.

**Can I customise the email template?**
Yes. Go to **Settings → Email Templates** to edit the subject line, body text, and call-to-action button. You can use `{{first_name}}`, `{{business_name}}`, and `{{review_link}}` as merge tags.

**How do I cancel?**
Go to **Settings → Upgrade Plan → Manage Subscription**. You can cancel at any time. Your account reverts to the Free plan at the end of your billing period — your data and contacts are preserved.

**I'm getting a "connection refused" error when connecting my email.**
Double-check that you're using an App Password (not your regular login password) and that the SMTP host and port match your provider's settings. Gmail uses `smtp.gmail.com` on port 587. See the in-app setup guide for provider-specific instructions.

---

## Support

If you need help, open the in-app **Setup Guide** (tap the book icon on the Home screen) for step-by-step instructions. For further assistance, contact us at [support@phame.app](mailto:support@phame.app).
