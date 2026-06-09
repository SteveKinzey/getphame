/**
 * OnboardingGuide — full-screen step-by-step setup directions modal.
 *
 * 6 pages:
 *   1. Welcome
 *   2. Connect Your Email
 *   3. Add a Review Platform
 *   4. Import Your Contacts
 *   5. Send a Review Request
 *   6. You're All Set
 *
 * Auto-shows on first login (localStorage flag "rl_guide_seen").
 * Re-openable via the "Setup Guide" button on Home and Settings.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Mail, Star, Users, Send, CheckCircle2, Globe, Upload, CreditCard, ShoppingCart, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const GUIDE_SEEN_KEY = "rl_guide_seen";

// ── Step definitions ──────────────────────────────────────────────────────────

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

const STEP_ROUTES = ["/settings", "/settings", "/import", "/send"];

interface StepsDone {
  smtp: boolean;
  platform: boolean;
  contacts: boolean;
  sent: boolean;
}

function StepWelcome({ onNavigate, stepsDone }: { onNavigate: (path: string) => void; stepsDone?: StepsDone }) {
  const { t } = useTranslation();
  const done = [
    stepsDone?.smtp ?? false,
    stepsDone?.platform ?? false,
    stepsDone?.contacts ?? false,
    stepsDone?.sent ?? false,
  ];
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-5 text-center rr-bg-navy-mid"
      >
        <img src="/manus-storage/phame-app-icon-new_6efe8008.png" alt="Phame" className="w-20 h-20 rounded-2xl object-contain mx-auto mb-3" />
        <p className="text-white font-bold text-lg leading-snug" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {t("onboardingGuide.welcome.heroText")}
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--text-on-dark-secondary)" }}>
          {t("onboardingGuide.welcome.heroSubtext")}
        </p>
      </div>

      <p className="text-sm font-semibold" style={{ color: "oklch(0.40 0.05 260)" }}>
        {t("onboardingGuide.welcome.setupStepsIntro")}
      </p>

      <div className="space-y-3">
        {[
          { icon: <Mail size={16} />, label: t("onboardingGuide.welcome.step1Label") },
          { icon: <Star size={16} />, label: t("onboardingGuide.welcome.step2Label") },
          { icon: <Users size={16} />, label: t("onboardingGuide.welcome.step3Label") },
          { icon: <Send size={16} />, label: t("onboardingGuide.welcome.step4Label") },
        ].map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(STEP_ROUTES[i])}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-transform active:scale-95"
            style={{
              background: done[i] ? "oklch(0.96 0.04 145)" : "white",
              border: `1px solid ${done[i] ? "oklch(0.80 0.12 145)" : "oklch(0.91 0.02 260)"}`,
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
              style={{
                background: done[i] ? "oklch(0.55 0.18 145)" : "oklch(0.22 0.09 260)",
                color: "white",
              }}
            >
              {done[i] ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: done[i] ? "oklch(0.35 0.12 145)" : "oklch(0.22 0.09 260)" }}
            >
              {item.label}
              {done[i] && <span className="ml-1.5 text-xs font-bold" style={{ color: "oklch(0.50 0.15 145)" }}>{t("onboardingGuide.welcome.doneLabel")}</span>}
            </span>
            <div className="ml-auto flex items-center gap-1" style={{ color: done[i] ? "oklch(0.55 0.18 145)" : "oklch(0.55 0.05 260)" }}>
              {done[i] ? <CheckCircle2 size={14} /> : item.icon}
              {!done[i] && <ChevronRight size={14} />}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-center rr-text-navy-muted">
        {t("onboardingGuide.welcome.setupTime")}
      </p>
    </div>
  );
}

// ── Email provider data ───────────────────────────────────────────────────────

const EMAIL_PROVIDERS = [
  {
    label: "Gmail / Google Workspace",
    color: "oklch(0.55 0.20 25)",
    bg: "oklch(0.97 0.02 25)",
    border: "oklch(0.88 0.06 25)",
    steps: [
      { step: "1", desc: "Go to myaccount.google.com and sign in." },
      { step: "2", desc: "Click Security in the left sidebar." },
      { step: "3", desc: "Under \"How you sign in to Google\", click 2-Step Verification and make sure it is turned ON. App Passwords require 2FA to be active." },
      { step: "4", desc: "Return to Security and scroll down to find App Passwords (search for it if you don't see it)." },
      { step: "5", desc: "Click App Passwords, then choose \"Mail\" as the app and \"Other\" as the device. Give it a name like \"Phame\"." },
      { step: "6", desc: "Google shows you a 16-character password. Copy it — you will only see it once." },
      { step: "7", desc: "In Phame Settings → Email Connection, enter your Gmail address and paste the App Password (not your regular Google password)." },
    ],
    note: "Google Workspace (business Gmail) follows the same steps. If your admin has disabled App Passwords, ask them to enable \"Less secure app access\" or use an OAuth-based SMTP relay.",
  },
  {
    label: "Outlook / Microsoft 365",
    color: "oklch(0.45 0.18 240)",
    bg: "oklch(0.97 0.02 240)",
    border: "oklch(0.88 0.05 240)",
    steps: [
      { step: "1", desc: "Sign in at account.microsoft.com." },
      { step: "2", desc: "Click Security → Advanced security options." },
      { step: "3", desc: "Under App passwords, click Create a new app password." },
      { step: "4", desc: "Copy the generated password." },
      { step: "5", desc: "In Phame, enter your full Outlook/Hotmail/Microsoft 365 email address and paste the App Password." },
      { step: "6", desc: "SMTP host: smtp.office365.com · Port: 587 · Security: STARTTLS (Phame auto-detects this from your email domain)." },
    ],
    note: "Microsoft 365 business accounts: if your IT admin has disabled SMTP AUTH, they must enable it per-mailbox in the Microsoft 365 admin centre under Users → Active users → Mail → Manage email apps → Authenticated SMTP.",
  },
  {
    label: "Yahoo Mail",
    color: "oklch(0.45 0.22 300)",
    bg: "oklch(0.97 0.02 300)",
    border: "oklch(0.88 0.05 300)",
    steps: [
      { step: "1", desc: "Sign in at account.yahoo.com." },
      { step: "2", desc: "Click Security in the left menu." },
      { step: "3", desc: "Scroll to \"Generate app password\" and click it." },
      { step: "4", desc: "Select \"Other app\" from the dropdown, type \"Phame\", and click Generate." },
      { step: "5", desc: "Copy the 16-character password shown." },
      { step: "6", desc: "In Phame, enter your Yahoo email address and paste the App Password. SMTP host: smtp.mail.yahoo.com · Port: 587." },
    ],
    note: "Yahoo no longer supports regular passwords for third-party apps. You must use an App Password — your regular Yahoo password will not work.",
  },
  {
    label: "Zoho Mail",
    color: "oklch(0.50 0.18 160)",
    bg: "oklch(0.97 0.02 160)",
    border: "oklch(0.88 0.05 160)",
    steps: [
      { step: "1", desc: "Log in at mail.zoho.com." },
      { step: "2", desc: "Click the gear icon (Settings) in the top-right corner." },
      { step: "3", desc: "Go to Mail Accounts → select your account → SMTP." },
      { step: "4", desc: "Make sure \"Allow SMTP Access\" is toggled ON. Save." },
      { step: "5", desc: "In Phame, enter your Zoho email address and your regular Zoho password (no App Password needed if 2FA is off)." },
      { step: "6", desc: "If 2FA is enabled on your Zoho account, go to Zoho Accounts → Security → App Passwords and generate one first." },
      { step: "7", desc: "SMTP host: smtp.zoho.com · Port: 587 (or 465 for SSL)." },
    ],
    note: "Zoho Workplace (business) accounts: SMTP access may be disabled by your organisation admin. Ask them to enable it under Zoho Mail Admin Console → Mail Settings → SMTP.",
  },
  {
    label: "Apple iCloud Mail",
    color: "oklch(0.40 0.05 260)",
    bg: "oklch(0.97 0.01 260)",
    border: "oklch(0.88 0.03 260)",
    steps: [
      { step: "1", desc: "Sign in at appleid.apple.com." },
      { step: "2", desc: "Click Sign-In and Security → App-Specific Passwords." },
      { step: "3", desc: "Click the + icon to generate a new password. Label it \"Phame\"." },
      { step: "4", desc: "Copy the generated password (format: xxxx-xxxx-xxxx-xxxx)." },
      { step: "5", desc: "In Phame, enter your iCloud email address (yourname@icloud.com or @me.com or @mac.com) and paste the App-Specific Password." },
      { step: "6", desc: "SMTP host: smtp.mail.me.com · Port: 587." },
    ],
    note: "Apple requires 2FA on your Apple ID before App-Specific Passwords are available. If you don't see the option, enable 2FA first under Apple ID → Password & Security.",
  },
  {
    label: "Business / cPanel / Hosting Email",
    color: "oklch(0.45 0.10 80)",
    bg: "oklch(0.97 0.02 80)",
    border: "oklch(0.88 0.05 80)",
    steps: [
      { step: "1", desc: "Log in to your hosting control panel (cPanel, Plesk, DirectAdmin, etc.)." },
      { step: "2", desc: "Go to Email → Email Accounts and find the account you want to use." },
      { step: "3", desc: "Click Connect Devices or Set Up Mail Client to see the SMTP host, port, and security settings." },
      { step: "4", desc: "Common settings: host = mail.yourdomain.com · Port: 587 (STARTTLS) or 465 (SSL)." },
      { step: "5", desc: "In Phame, enter your full business email address as the username and your email account password." },
    ],
    note: "If you're not sure of your SMTP settings, contact your hosting provider's support. They can provide the exact host, port, and security type for your account.",
  },
];

// ── Review platform data ──────────────────────────────────────────────────────

const REVIEW_PLATFORMS = [
  {
    label: "Google Business Profile",
    emoji: "🔵",
    color: "oklch(0.45 0.18 240)",
    bg: "oklch(0.97 0.02 240)",
    border: "oklch(0.88 0.05 240)",
    steps: [
      { step: "1", desc: "Go to maps.google.com and search for your business name." },
      { step: "2", desc: "Click on your business listing to open the full panel on the left." },
      { step: "3", desc: "Click \"Write a review\". A review dialog opens." },
      { step: "4", desc: "Copy the full URL from your browser's address bar — this is your direct review link." },
      { step: "5", desc: "Alternative: log in at business.google.com → your profile → click \"Ask for reviews\" or \"Get more reviews\" to find a shareable short link." },
    ],
    note: "The short link from Google Business Profile (maps.app.goo.gl/...) is cleaner and more reliable than the full Maps URL. Use that if available.",
  },
  {
    label: "Yelp",
    emoji: "🔴",
    color: "oklch(0.50 0.22 25)",
    bg: "oklch(0.97 0.02 25)",
    border: "oklch(0.88 0.06 25)",
    steps: [
      { step: "1", desc: "Go to yelp.com and search for your business." },
      { step: "2", desc: "Open your business listing page." },
      { step: "3", desc: "Click \"Write a Review\" — a login/review dialog appears." },
      { step: "4", desc: "Copy the URL from your browser's address bar." },
      { step: "5", desc: "Alternatively, log in to biz.yelp.com → your business → Business Information → copy the \"Yelp Page URL\" shown there." },
    ],
    note: "Yelp actively discourages soliciting reviews and may filter reviews that come from direct requests. Consider using Yelp links for passive placement (email signature, receipts) rather than active bulk sends.",
  },
  {
    label: "TripAdvisor",
    emoji: "🟢",
    color: "oklch(0.45 0.18 155)",
    bg: "oklch(0.97 0.02 155)",
    border: "oklch(0.88 0.05 155)",
    steps: [
      { step: "1", desc: "Go to tripadvisor.com and search for your business." },
      { step: "2", desc: "Open your listing page." },
      { step: "3", desc: "Click \"Write a Review\" at the top of the listing." },
      { step: "4", desc: "Copy the URL from your browser's address bar." },
      { step: "5", desc: "For a cleaner link: log in at tripadvisor.com/owners → your property → Review Express → copy the direct review URL provided there." },
    ],
    note: "TripAdvisor's Review Express tool (available to registered owners) generates a clean, trackable review link specifically designed for email campaigns.",
  },
  {
    label: "Facebook",
    emoji: "🔵",
    color: "oklch(0.40 0.18 255)",
    bg: "oklch(0.97 0.02 255)",
    border: "oklch(0.88 0.05 255)",
    steps: [
      { step: "1", desc: "Go to your Facebook Business Page." },
      { step: "2", desc: "Click the \"Reviews\" or \"Recommendations\" tab on your page." },
      { step: "3", desc: "Copy the URL from your browser's address bar — it will look like facebook.com/YourBusiness/reviews." },
      { step: "4", desc: "You can also use your page URL directly: facebook.com/YourBusinessName — customers can find the Reviews tab from there." },
    ],
    note: "Facebook renamed \"Reviews\" to \"Recommendations\" in some regions. Both link to the same place. Make sure Reviews/Recommendations are enabled on your page: Page Settings → Templates and Tabs → Reviews → On.",
  },
  {
    label: "Bing Places",
    emoji: "🟡",
    color: "oklch(0.50 0.15 200)",
    bg: "oklch(0.97 0.02 200)",
    border: "oklch(0.88 0.05 200)",
    steps: [
      { step: "1", desc: "Go to bing.com/maps and search for your business." },
      { step: "2", desc: "Click on your business listing." },
      { step: "3", desc: "Click \"Write a review\" on the listing panel." },
      { step: "4", desc: "Copy the URL from your browser's address bar." },
      { step: "5", desc: "To claim and manage your listing: bingplaces.com → sign in with a Microsoft account → verify your business." },
    ],
    note: "Bing reviews pull from Tripadvisor and other sources in some regions. Verify your listing at bingplaces.com to ensure reviews are attributed correctly to your business.",
  },
  {
    label: "Custom / Other Platform",
    emoji: "🔗",
    color: "oklch(0.45 0.05 260)",
    bg: "oklch(0.97 0.01 260)",
    border: "oklch(0.88 0.03 260)",
    steps: [
      { step: "1", desc: "Navigate to your review platform (Trustpilot, G2, Capterra, Houzz, Angi, HomeAdvisor, Healthgrades, etc.)." },
      { step: "2", desc: "Find your business or product listing." },
      { step: "3", desc: "Look for a \"Write a Review\" or \"Leave Feedback\" button and click it." },
      { step: "4", desc: "Copy the URL from your browser's address bar." },
      { step: "5", desc: "In Phame, select \"Other\" as the platform type and paste the URL." },
    ],
    note: "Any URL that takes a customer directly to a review form works. Test it in a private/incognito browser window first to confirm it opens the review form without requiring a login.",
  },
];

function SendTestEmailButton() {
  const { t } = useTranslation();
  const { data: smtpStatus } = trpc.smtp.status.useQuery();
  const sendWelcome = trpc.smtp.sendWelcome.useMutation({
    onSuccess: () => toast.success(t("onboardingGuide.connectEmail.testEmailSent")),
    onError: (err) => toast.error(err.message),
  });
  if (!smtpStatus?.connected) return null;
  return (
    <button
      disabled={sendWelcome.isPending}
      onClick={() => sendWelcome.mutate()}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
      style={{
        background: "oklch(0.96 0.06 145)",
        border: "1.5px solid oklch(0.80 0.12 145)",
        color: "oklch(0.28 0.10 145)",
      }}
    >
      {sendWelcome.isPending
        ? <Loader2 size={15} className="animate-spin" />
        : <Send size={15} />}
      {t("onboardingGuide.connectEmail.testEmailButton")}
    </button>
  );
}

function StepConnectEmail({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1 rr-text-navy">
          {t("onboardingGuide.connectEmail.whyTitle")}
        </p>
        <p className="text-sm rr-text-navy-mid">
          {t("onboardingGuide.connectEmail.whyDesc")}
        </p>
      </div>

      <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 260)" }}>
        {t("onboardingGuide.connectEmail.generalStepsTitle")}
      </p>

      <div className="space-y-3">
        {[
          { step: "1", title: "Open Settings", desc: "Tap the Settings icon in the bottom navigation bar." },
          { step: "2", title: "Find Email Connection", desc: "Scroll down to the \"Email Connection\" card and tap \"Connect Email Account\"." },
          { step: "3", title: "Enter your email and password", desc: "Type your full email address and your email password or app password (see provider notes below)." },
          { step: "4", title: "Set your Sender Name", desc: "This is what customers see in their inbox — e.g. \"Jane at Acme Plumbing\". Make it personal." },
          { step: "5", title: "Test the connection", desc: "Tap \"Test Connection\" to verify your credentials. A green tick confirms success." },
          { step: "6", title: "Save", desc: "Tap \"Connect\". Phame sends a confirmation email to your address so you can see exactly what customers receive." },
        ].map((item) => (
          <div key={item.step} className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5 rr-bg-navy rr-text-gold"
            >
              {item.step}
            </div>
            <div>
              <p className="text-sm font-bold rr-text-navy">{item.title}</p>
              <p className="text-xs mt-0.5 rr-text-navy-mid">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Provider-specific accordion */}
      <p className="text-xs font-bold uppercase tracking-wide pt-1 rr-text-navy-muted">
        {t("onboardingGuide.connectEmail.providerSectionTitle")}
      </p>

      <div className="space-y-2">
        {EMAIL_PROVIDERS.map((provider) => {
          const isOpen = expanded === provider.label;
          return (
            <div
              key={provider.label}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${provider.border}` }}
            >
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                style={{ background: provider.bg }}
                onClick={() => setExpanded(isOpen ? null : provider.label)}
              >
                <p className="text-xs font-bold" style={{ color: provider.color }}>{provider.label}</p>
                <ChevronRight
                  size={14}
                  style={{
                    color: provider.color,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {isOpen && (
                <div className="px-3 py-3 bg-white space-y-2">
                  {provider.steps.map((s) => (
                    <div key={s.step} className="flex gap-2.5 items-start">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                        style={{ background: provider.bg, color: provider.color }}
                      >
                        {s.step}
                      </span>
                      <p className="text-xs rr-text-navy-mid">{s.desc}</p>
                    </div>
                  ))}
                  {provider.note && (
                    <div
                      className="rounded-lg px-3 py-2 mt-1"
                      style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
                    >
                      <p className="text-xs" style={{ color: "oklch(0.45 0.08 80)" }}>
                        <span className="font-bold">{t("onboardingGuide.connectEmail.noteLabel")}</span>{provider.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <SendTestEmailButton />
      <Button
        onClick={() => onNavigate("/settings")}
        className="w-full font-bold rr-bg-navy rr-text-gold"
      >
        <Mail size={15} className="mr-2" /> {t("onboardingGuide.connectEmail.goToSettingsButton")}
      </Button>
    </div>
  );
}

function StepReviewPlatform({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>("Google Business Profile");

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1 rr-text-navy">
          {t("onboardingGuide.reviewPlatform.whatIsTitle")}
        </p>
        <p className="text-sm rr-text-navy-mid">
          {t("onboardingGuide.reviewPlatform.whatIsDesc")}
        </p>
      </div>

      {/* Platform-specific accordion */}
      <p className="text-xs font-bold uppercase tracking-wide rr-text-navy-muted">
        {t("onboardingGuide.reviewPlatform.findLinkTitle")}
      </p>

      <div className="space-y-2">
        {REVIEW_PLATFORMS.map((platform) => {
          const isOpen = expanded === platform.label;
          return (
            <div
              key={platform.label}
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${platform.border}` }}
            >
              <button
                className="w-full flex items-center justify-between px-3 py-2.5 text-left gap-2"
                style={{ background: platform.bg }}
                onClick={() => setExpanded(isOpen ? null : platform.label)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{platform.emoji}</span>
                  <p className="text-xs font-bold" style={{ color: platform.color }}>{platform.label}</p>
                </div>
                <ChevronRight
                  size={14}
                  style={{
                    color: platform.color,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </button>
              {isOpen && (
                <div className="px-3 py-3 bg-white space-y-2">
                  {platform.steps.map((s) => (
                    <div key={s.step} className="flex gap-2.5 items-start">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                        style={{ background: platform.bg, color: platform.color }}
                      >
                        {s.step}
                      </span>
                      <p className="text-xs rr-text-navy-mid">{s.desc}</p>
                    </div>
                  ))}
                  {platform.note && (
                    <div
                      className="rounded-lg px-3 py-2 mt-1"
                      style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
                    >
                      <p className="text-xs" style={{ color: "oklch(0.45 0.08 80)" }}>
                        <span className="font-bold">{t("onboardingGuide.reviewPlatform.noteLabel")}</span>{platform.note}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-sm font-bold pt-1" style={{ color: "oklch(0.30 0.05 260)" }}>
        {t("onboardingGuide.reviewPlatform.addingLinkTitle")}
      </p>
      <div className="space-y-3">
        {[
          { step: "1", title: "Open Settings", desc: "Tap the Settings icon in the bottom navigation bar." },
          { step: "2", title: "Scroll to Review Platforms", desc: "Find the \"Review Platforms\" section and tap \"Add Platform\"." },
          { step: "3", title: "Choose your platform type", desc: "Select Google, Yelp, TripAdvisor, Facebook, Bing, or Other." },
          { step: "4", title: "Paste your review link", desc: "Paste the URL you copied from your platform." },
          { step: "5", title: "Set as default", desc: "Toggle \"Set as default\" if this is your primary review destination. The default platform is used in all review requests." },
        ].map((item) => (
          <div key={item.step} className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5 rr-bg-navy rr-text-gold"
            >
              {item.step}
            </div>
            <div>
              <p className="text-sm font-bold rr-text-navy">{item.title}</p>
              <p className="text-xs mt-0.5 rr-text-navy-mid">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onNavigate("/settings")}
        className="w-full font-bold rr-bg-navy rr-text-gold"
      >
        <Globe size={15} className="mr-2" /> {t("onboardingGuide.reviewPlatform.goToSettingsButton")}
      </Button>
    </div>
  );
}

function StepContacts({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1 rr-text-navy">
          {t("onboardingGuide.contacts.threeWaysTitle")}
        </p>
        <p className="text-sm rr-text-navy-mid">
          {t("onboardingGuide.contacts.threeWaysDesc")}
        </p>
      </div>

      {/* Method 1: CSV */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2 rr-bg-navy">
          <Upload size={14} className="rr-text-gold" />
          <p className="text-sm font-bold text-white">{t("onboardingGuide.contacts.optionATitle")}</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Go to Saved Contacts (bottom nav → Contacts icon, or Home → Saved Contacts)." },
            { step: "2", desc: "Tap \"Import CSV\" in the top-right corner." },
            { step: "3", desc: "Download the template CSV to see the required column format (first_name, last_name, email, phone, notes)." },
            { step: "4", desc: "Fill in your customer data and save the file." },
            { step: "5", desc: "Upload the file, map the columns, preview the import, then confirm." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.03 260)", color: "oklch(0.30 0.08 260)" }}
              >
                {item.step}
              </span>
              <p className="text-xs rr-text-navy-mid">{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/import")}
            variant="outline"
            className="w-full mt-1 font-bold text-xs"
            style={{ borderColor: "oklch(0.80 0.05 260)" }}
          >
            <Upload size={12} className="mr-1" /> {t("onboardingGuide.contacts.goToImportButton")}
          </Button>
        </div>
      </div>

      {/* Method 2: Stripe */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.45 0.12 280)" }}>
          <CreditCard size={14} className="text-white" />
          <p className="text-sm font-bold text-white">{t("onboardingGuide.contacts.optionBTitle")}</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Go to Settings → Stripe and connect your Stripe account with your secret key." },
            { step: "2", desc: "Open Saved Contacts and tap the \"Stripe\" sync button in the header." },
            { step: "3", desc: "Phame pulls all your Stripe customers and adds them as contacts automatically. Duplicates are skipped." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.03 280)", color: "oklch(0.30 0.08 280)" }}
              >
                {item.step}
              </span>
              <p className="text-xs rr-text-navy-mid">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Method 3: WooCommerce */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.40 0.12 200)" }}>
          <ShoppingCart size={14} className="text-white" />
          <p className="text-sm font-bold text-white">{t("onboardingGuide.contacts.optionCTitle")}</p>
        </div>
        <div className="px-4 py-3 space-y-3 bg-white">
          {/* Step 1: Generate API keys */}
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}>1</span>
            <div>
              <p className="text-xs font-semibold mb-0.5 rr-text-navy">Generate WooCommerce API keys</p>
              <p className="text-xs rr-text-navy-mid">In your WordPress admin, go to <strong>WooCommerce → Settings → Advanced → REST API</strong> and click <strong>Add Key</strong>. Give it a description (e.g. "Phame"), set the User to your admin account, and set Permissions to <strong>Read</strong>. Click <strong>Generate API Key</strong>.</p>
              <p className="text-xs mt-1 px-2 py-1 rounded" style={{ background: "oklch(0.97 0.02 200)", color: "oklch(0.35 0.08 200)" }}>⚠️ Copy the Consumer Key and Consumer Secret immediately — they are only shown once.</p>
            </div>
          </div>
          {/* Step 2: Connect in Settings */}
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}>2</span>
            <div>
              <p className="text-xs font-semibold mb-0.5 rr-text-navy">Connect your store in Settings</p>
              <p className="text-xs rr-text-navy-mid">Open <strong>Settings → WooCommerce</strong> and enter your <strong>Store URL</strong> (e.g. <code className="text-xs px-1 py-0.5 rounded" style={{ background: "oklch(0.95 0.01 260)" }}>https://yourstore.com</code>), the <strong>Consumer Key</strong>, and the <strong>Consumer Secret</strong>. Tap <strong>Save &amp; Connect</strong>.</p>
            </div>
          </div>
          {/* Step 3: Sync orders */}
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}>3</span>
            <div>
              <p className="text-xs font-semibold mb-0.5 rr-text-navy">Sync orders</p>
              <p className="text-xs rr-text-navy-mid">In <strong>Settings → WooCommerce</strong>, tap <strong>Sync Orders</strong> and choose how many days of completed orders to pull (30 / 60 / 90 days). Orders are held as <em>pending imports</em> — they won't appear in your contacts list until you review and confirm them.</p>
            </div>
          </div>
          {/* Step 4: Review and import */}
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}>4</span>
            <div>
              <p className="text-xs font-semibold mb-0.5 rr-text-navy">Review and import (or let it auto-import)</p>
              <p className="text-xs rr-text-navy-mid">After syncing, a <strong>Pending Imports</strong> banner appears in Settings. Tap <strong>Import Now</strong> to immediately move customers into your contacts list, or tap <strong>Dismiss</strong> to discard them. If you take no action, any pending orders older than <strong>7 days</strong> are automatically imported every <strong>Monday at 03:00 GMT</strong>.</p>
            </div>
          </div>
          {/* Step 5: Send review requests */}
          <div className="flex gap-2.5 items-start">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5" style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}>5</span>
            <div>
              <p className="text-xs font-semibold mb-0.5 rr-text-navy">Send review requests</p>
              <p className="text-xs rr-text-navy-mid">Once imported, customers appear in the <strong>WooCommerce</strong> tab on the Saved Contacts page. Select the ones you want to reach and tap <strong>Send Review Request</strong>. Each customer can only be sent one request (the button is disabled after sending).</p>
            </div>
          </div>
          {/* Troubleshooting note */}
          <div className="rounded-lg px-3 py-2" style={{ background: "oklch(0.97 0.02 100)", border: "1px solid oklch(0.90 0.04 100)" }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: "oklch(0.35 0.08 100)" }}>Troubleshooting tips</p>
            <ul className="text-xs space-y-0.5 list-disc list-inside rr-text-navy-mid">
              <li>Store URL must include <code className="text-xs">https://</code> and no trailing slash</li>
              <li>If you get a 401 error, regenerate your API keys — they may have expired</li>
              <li>If your store uses a subdirectory (e.g. <code className="text-xs">/shop</code>), include it in the URL</li>
              <li>Ensure the REST API is not blocked by a security plugin (e.g. Wordfence, iThemes Security)</li>
              <li>Only orders with status <strong>Completed</strong> are synced</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Method 4: Manual */}
      <div
        className="rounded-xl px-4 py-3 bg-white" style={{ border: "1px solid oklch(0.91 0.02 260)" }}
      >
        <p className="text-sm font-bold mb-1 rr-text-navy">
          {t("onboardingGuide.contacts.optionDTitle")}
        </p>
        <p className="text-xs rr-text-navy-mid">
          {t("onboardingGuide.contacts.optionDDesc")}
        </p>
      </div>

      <Button
        onClick={() => onNavigate("/contacts")}
        className="w-full font-bold rr-bg-navy rr-text-gold"
      >
        <Users size={15} className="mr-2" /> {t("onboardingGuide.contacts.goToContactsButton")}
      </Button>
    </div>
  );
}

function StepSendRequest({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1 rr-text-navy">
          {t("onboardingGuide.sendRequest.twoWaysTitle")}
        </p>
        <p className="text-sm rr-text-navy-mid">
          {t("onboardingGuide.sendRequest.twoWaysDesc")}
        </p>
      </div>

      {/* Single send */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2 rr-bg-navy">
          <Send size={14} className="rr-text-gold" />
          <p className="text-sm font-bold text-white">{t("onboardingGuide.sendRequest.singleSendTitle")}</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Tap \"Send\" in the bottom navigation bar." },
            { step: "2", desc: "Enter the customer's name and email address." },
            { step: "3", desc: "Choose a review platform (or leave it on the default)." },
            { step: "4", desc: "Optionally select a custom email template." },
            { step: "5", desc: "Preview the email subject and body, then tap \"Send Review Request\"." },
            { step: "6", desc: "The email is sent immediately from your connected email account." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.03 260)", color: "oklch(0.30 0.08 260)" }}
              >
                {item.step}
              </span>
              <p className="text-xs rr-text-navy-mid">{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/send")}
            className="w-full mt-1 font-bold text-xs rr-bg-navy rr-text-gold"
          >
            <Send size={12} className="mr-1" /> {t("onboardingGuide.sendRequest.goToSendButton")}
          </Button>
        </div>
      </div>

      {/* Bulk send */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.55 0.12 160)" }}>
          <Users size={14} className="text-white" />
          <p className="text-sm font-bold text-white">{t("onboardingGuide.sendRequest.bulkSendTitle")}</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Open Saved Contacts." },
            { step: "2", desc: "Use the checkboxes to select the contacts you want to reach, or tap \"Select All\" to select everyone currently visible." },
            { step: "3", desc: "Use the source filter pills (Stripe / WooCommerce / Manual) or tag filters to narrow down the list first." },
            { step: "4", desc: "A sticky bar appears at the bottom showing how many contacts are selected." },
            { step: "5", desc: "Tap \"Send to X\" to open the confirmation dialog. Choose a review platform if you have more than one." },
            { step: "6", desc: "Tap \"Send X Requests\". Each customer receives a separate, personalised email." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.05 160)", color: "oklch(0.30 0.10 160)" }}
              >
                {item.step}
              </span>
              <p className="text-xs rr-text-navy-mid">{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/contacts")}
            variant="outline"
            className="w-full mt-1 font-bold text-xs"
            style={{ borderColor: "oklch(0.80 0.05 260)" }}
          >
            <Users size={12} className="mr-1" /> {t("onboardingGuide.sendRequest.goToContactsButton")}
          </Button>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
      >
        <p className="text-xs font-bold mb-1 rr-text-gold-dim">
          {t("onboardingGuide.sendRequest.proTipTitle")}
        </p>
        <p className="text-xs" style={{ color: "oklch(0.50 0.06 80)" }}>
          {t("onboardingGuide.sendRequest.proTipDesc")}
        </p>
      </div>
    </div>
  );
}

function StepDone({ onNavigate, onClose }: { onNavigate: (path: string) => void; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <CheckCircle2 size={52} className="mx-auto mb-3 rr-text-green" />
        <h2 className="text-xl font-black rr-text-navy">
          {t("onboardingGuide.allSet.title")}
        </h2>
        <p className="text-sm mt-2 rr-text-navy-mid">
          {t("onboardingGuide.allSet.subtitle")}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide rr-text-navy-muted">
          {t("onboardingGuide.allSet.quickLinksTitle")}
        </p>
        {[
          { label: t("onboardingGuide.allSet.link1"), path: "/send", icon: <Send size={14} /> },
          { label: t("onboardingGuide.allSet.link2"), path: "/contacts", icon: <Users size={14} /> },
          { label: t("onboardingGuide.allSet.link3"), path: "/dashboard", icon: <Star size={14} /> },
          { label: t("onboardingGuide.allSet.link4"), path: "/settings", icon: <Globe size={14} /> },
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => { onClose(); onNavigate(link.path); }}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:opacity-80 bg-white" style={{ border: "1px solid oklch(0.91 0.02 260)" }}
          >
            <div style={{ color: "oklch(0.55 0.08 260)" }}>{link.icon}</div>
            <span className="text-sm font-medium flex-1 rr-text-navy">
              {link.label}
            </span>
            <ChevronRight size={14} className="rr-text-navy-faint" />
          </button>
        ))}
      </div>

      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
      >
        <p className="text-xs font-bold mb-1 rr-text-gold-dim">
          {t("onboardingGuide.allSet.revisitTitle")}
        </p>
        <p className="text-xs" style={{ color: "oklch(0.50 0.06 80)" }}>
          {t("onboardingGuide.allSet.revisitDesc")}
        </p>
      </div>

      <Button
        onClick={onClose}
        className="w-full font-bold rr-bg-green text-white"
      >
        <Star size={15} className="mr-2" /> {t("onboardingGuide.allSet.startButton")}
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
  stepsDone?: StepsDone;
}

export default function OnboardingGuide({ open, onClose, stepsDone }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [, navigate] = useLocation();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Helper: navigate with direction tracking for slide animation
  const goToStep = useCallback((next: number, current: number) => {
    setSlideDir(next > current ? 'left' : 'right');
    setAnimKey(k => k + 1);
    setStep(next);
  }, []);

  // Reset to first step whenever modal opens
  useEffect(() => {
    if (open) { setStep(0); setSlideDir(null); }
  }, [open]);

  // Swipe handlers — horizontal swipe > 50px advances/retreats steps
  // Vertical swipe is ignored so normal scrolling still works
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent, totalSteps: number, currentStep: number) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only act on predominantly horizontal swipes of at least 50px
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) {
      // swipe left → next step
      const next = Math.min(currentStep + 1, totalSteps - 1);
      if (next !== currentStep) goToStep(next, currentStep);
    } else {
      // swipe right → previous step
      const next = Math.max(currentStep - 1, 0);
      if (next !== currentStep) goToStep(next, currentStep);
    }
  }, [goToStep]);

  const { t } = useTranslation();
  if (!open) return null;
  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };
  const STEPS: Step[] = [
    {
      id: 0,
      icon: <Star size={20} />,
      title: t("onboardingGuide.steps.welcome.title"),
      subtitle: t("onboardingGuide.steps.welcome.subtitle"),
      content: <StepWelcome onNavigate={handleNavigate} stepsDone={stepsDone} />,
    },
    {
      id: 1,
      icon: <Mail size={20} />,
      title: t("onboardingGuide.steps.connectEmail.title"),
      subtitle: t("onboardingGuide.steps.connectEmail.subtitle"),
      content: <StepConnectEmail onNavigate={handleNavigate} />,
    },
    {
      id: 2,
      icon: <Star size={20} />,
      title: t("onboardingGuide.steps.reviewPlatform.title"),
      subtitle: t("onboardingGuide.steps.reviewPlatform.subtitle"),
      content: <StepReviewPlatform onNavigate={handleNavigate} />,
    },
    {
      id: 3,
      icon: <Users size={20} />,
      title: t("onboardingGuide.steps.importContacts.title"),
      subtitle: t("onboardingGuide.steps.importContacts.subtitle"),
      content: <StepContacts onNavigate={handleNavigate} />,
    },
    {
      id: 4,
      icon: <Send size={20} />,
      title: t("onboardingGuide.steps.sendRequest.title"),
      subtitle: t("onboardingGuide.steps.sendRequest.subtitle"),
      content: <StepSendRequest onNavigate={handleNavigate} />,
    },
    {
      id: 5,
      icon: <CheckCircle2 size={20} />,
      title: t("onboardingGuide.steps.allSet.title"),
      subtitle: t("onboardingGuide.steps.allSet.subtitle"),
      content: <StepDone onNavigate={handleNavigate} onClose={onClose} />,
    },
  ];

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    /* Full-screen backdrop */
    <div className="fixed inset-0 z-50 flex justify-center rr-bg-navy">
    {/* Mobile-constrained panel */}
    <div
      className="relative flex flex-col w-full rr-bg-cream-warm" style={{ height: "100%", maxWidth: "480" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-8 pb-4 shrink-0 rr-bg-navy"
      >
        {/* Top row: guide label + close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="rr-text-gold" />
            <span
              className="text-xs font-bold tracking-widest uppercase rr-text-gold"
            >
              {t("onboardingGuide.header.title")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-on-dark-primary)" }}
            aria-label={t("onboardingGuide.header.closeAriaLabel")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress dots — 44px touch targets, 14px visible dots */}
        <div className="flex items-center gap-4 mb-6">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              aria-label={t("onboardingGuide.header.goToStepAriaLabel", { number: i + 1 })}
              className="transition-all rounded-full"
              style={{
                /* visible dot size */
                width: i === step ? "32px" : "14px",
                height: "14px",
                minWidth: i === step ? "32px" : "14px",
                /* expand tap area to 44px without affecting layout */
                padding: "15px 0",
                margin: "-15px 0",
                background: i === step
                  ? "oklch(0.80 0.18 80)"
                  : i < step
                    ? "oklch(0.65 0.12 80)"
                    : "oklch(0.40 0.05 260)",
              }}
            />
          ))}
          <span className="ml-auto text-xs font-semibold" style={{ color: "var(--text-on-dark-primary)" }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Step title */}
        <div className="flex items-center gap-3 mt-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 rr-text-gold" style={{ background: "oklch(0.32 0.08 260)" }}
          >
            {current.icon}
          </div>
          <div>
            <h2
              className="text-lg font-black text-white leading-tight"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {current.title}
            </h2>
            <p className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
              {current.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content with slide animation ─────────────────────────── */}
      <div
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={(e) => handleTouchEnd(e, STEPS.length, step)}
      >
        <div
          key={animKey}
          className="h-full overflow-y-auto px-5 py-5 pb-32"
          style={{
            animation: slideDir
              ? `slideIn${slideDir === 'left' ? 'FromRight' : 'FromLeft'} 0.28s cubic-bezier(0.4,0,0.2,1) both`
              : undefined,
          }}
        >
          {current.content}
          {/* Optional step skip link */}
          {(step === 3 || step === 4) && (
            <div className="text-center mt-6 pb-2">
              <button
                onClick={() => goToStep(Math.min(step + 1, STEPS.length - 1), step)}
                className="text-sm font-medium underline underline-offset-2 rr-text-navy-muted"
              >
                {t("onboardingGuide.navigation.skipForNow")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────────── */}
      {!isLast && (
        <div
          className="px-5 py-4 flex items-center gap-3 shrink-0 bg-white" style={{ borderTop: "1px solid oklch(0.91 0.02 260)" }}
        >
          <Button
            variant="outline"
            onClick={() => goToStep(step - 1, step)}
            disabled={isFirst}
            className="font-bold"
            style={{ opacity: isFirst ? 0 : 1, pointerEvents: isFirst ? "none" : "auto" }}
          >
            <ChevronLeft size={15} className="mr-1" /> {t("onboardingGuide.navigation.back")}
          </Button>
          <Button
            onClick={() => goToStep(step + 1, step)}
            className="flex-1 font-bold rr-bg-navy rr-text-gold"
          >
            {step === STEPS.length - 2 ? t("onboardingGuide.navigation.finish") : t("onboardingGuide.navigation.next")}
            <ChevronRight size={15} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
    </div>
  );
}

// ── Auto-show hook ────────────────────────────────────────────────────────────

/**
 * Returns [open, setOpen] with auto-show logic.
 * Shows the guide once per browser (localStorage flag).
 * Pass `isAuthenticated` so it only fires after login.
 */
export function useOnboardingGuide(isAuthenticated: boolean) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const seen = localStorage.getItem(GUIDE_SEEN_KEY);
    if (!seen) {
      // Small delay so the app renders first
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [isAuthenticated]);

  const handleClose = () => {
    localStorage.setItem(GUIDE_SEEN_KEY, "1");
    setOpen(false);
  };

  return { open, setOpen, handleClose };
}
