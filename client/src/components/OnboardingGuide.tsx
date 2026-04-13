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

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Mail, Star, Users, Send, CheckCircle2, Rocket, Globe, Upload, CreditCard, ShoppingCart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const GUIDE_SEEN_KEY = "rl_guide_seen";

// ── Step definitions ──────────────────────────────────────────────────────────

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

function StepWelcome() {
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: "oklch(0.30 0.08 260)" }}
      >
        <Rocket size={36} className="mx-auto mb-3" style={{ color: "oklch(0.80 0.18 80)" }} />
        <p className="text-white font-bold text-lg leading-snug" style={{ fontFamily: "'Poppins', sans-serif" }}>
          ReviewLink sends personalised review request emails from your own email account.
        </p>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.65)" }}>
          Customers receive a message that looks like it came directly from you — not a bulk mailer.
        </p>
      </div>

      <p className="text-sm font-semibold" style={{ color: "oklch(0.40 0.05 260)" }}>
        This guide walks you through 4 quick setup steps:
      </p>

      <div className="space-y-3">
        {[
          { icon: <Mail size={16} />, label: "Connect your email account (SMTP)" },
          { icon: <Star size={16} />, label: "Add your review platform link (Google, Yelp, etc.)" },
          { icon: <Users size={16} />, label: "Import or add your customer contacts" },
          { icon: <Send size={16} />, label: "Send your first review request" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: "white", border: "1px solid oklch(0.91 0.02 260)" }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {i + 1}
            </div>
            <span className="text-sm font-medium" style={{ color: "oklch(0.22 0.09 260)" }}>
              {item.label}
            </span>
            <div className="ml-auto" style={{ color: "oklch(0.55 0.05 260)" }}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-center" style={{ color: "oklch(0.60 0.03 260)" }}>
        Setup takes about 3 minutes. You can come back to this guide any time from the Home screen.
      </p>
    </div>
  );
}

function StepConnectEmail({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
          Why connect your email?
        </p>
        <p className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
          ReviewLink sends emails through your own account using SMTP — the same protocol your email app uses. This means review requests arrive in your customers' inboxes looking like a personal message from you, not a marketing blast.
        </p>
      </div>

      <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 260)" }}>
        Step-by-step: Settings → Email Connection
      </p>

      <div className="space-y-3">
        {[
          {
            step: "1",
            title: "Open Settings",
            desc: "Tap the Settings icon in the bottom navigation bar.",
          },
          {
            step: "2",
            title: "Find the Email Connection section",
            desc: "Scroll down to the \"Email Connection\" card. Tap \"Connect Email Account\".",
          },
          {
            step: "3",
            title: "Enter your email address and password",
            desc: "Type your full email address (e.g. jane@yourbusiness.com) and your email password or app password.",
          },
          {
            step: "4",
            title: "Set your Sender Name",
            desc: "This is the name customers will see in their inbox — e.g. \"Jane at Acme Plumbing\". Make it personal.",
          },
          {
            step: "5",
            title: "Test the connection",
            desc: "Tap \"Test Connection\" to verify your credentials work before saving. A green tick confirms success.",
          },
          {
            step: "6",
            title: "Save",
            desc: "Tap \"Connect\". ReviewLink will send a confirmation email to your address so you can see exactly what your customers will receive.",
          },
        ].map((item) => (
          <div key={item.step} className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {item.step}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{item.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.04 260)" }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.05 260)" }}>
          Provider notes
        </p>
        {[
          { label: "Gmail / Google Workspace", note: "You must use an App Password, not your regular Google password. Go to myaccount.google.com → Security → App Passwords." },
          { label: "Outlook / Microsoft 365", note: "Use an App Password if two-step verification is on. Go to account.microsoft.com → Security → Advanced security options." },
          { label: "Yahoo Mail", note: "Generate an App Password at account.yahoo.com → Security → Generate app password." },
          { label: "Zoho Mail", note: "Enable SMTP access first: mail.zoho.com → Settings → Mail Accounts → SMTP → Allow SMTP Access." },
          { label: "Business / cPanel email", note: "Use your full email address as the username. Your host, port, and password are in your hosting control panel." },
        ].map((p) => (
          <div
            key={p.label}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "white", border: "1px solid oklch(0.91 0.02 260)" }}
          >
            <p className="text-xs font-bold" style={{ color: "oklch(0.30 0.08 260)" }}>{p.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 260)" }}>{p.note}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onNavigate("/settings")}
        className="w-full font-bold"
        style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
      >
        <Mail size={15} className="mr-2" /> Go to Settings → Email Connection
      </Button>
    </div>
  );
}

function StepReviewPlatform({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
          What is a review platform?
        </p>
        <p className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
          This is the link your customers will click to leave you a review — on Google, Yelp, TripAdvisor, Facebook, or anywhere else. ReviewLink embeds this link as a button inside every review request email.
        </p>
      </div>

      <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 260)" }}>
        How to find your Google review link
      </p>
      <div className="space-y-3">
        {[
          { step: "1", title: "Open Google Maps", desc: "Search for your business by name on maps.google.com." },
          { step: "2", title: "Open your business listing", desc: "Click on your business name to open the full listing panel." },
          { step: "3", title: "Click \"Write a review\"", desc: "This opens the review dialog. Copy the URL from your browser's address bar — that is your review link." },
          { step: "4", title: "Alternative: Google Business Profile", desc: "Log in at business.google.com, go to your profile, and click \"Get more reviews\" to find a shareable link." },
        ].map((item) => (
          <div key={item.step} className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {item.step}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{item.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.04 260)" }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm font-bold" style={{ color: "oklch(0.30 0.05 260)" }}>
        Adding the link in ReviewLink
      </p>
      <div className="space-y-3">
        {[
          { step: "1", title: "Open Settings", desc: "Tap the Settings icon in the bottom navigation bar." },
          { step: "2", title: "Scroll to Review Platforms", desc: "Find the \"Review Platforms\" section and tap \"Add Platform\"." },
          { step: "3", title: "Choose your platform type", desc: "Select Google, Yelp, TripAdvisor, Facebook, or Other." },
          { step: "4", title: "Paste your review link", desc: "Paste the URL you copied from Google Maps (or your other platform)." },
          { step: "5", title: "Set as default", desc: "If this is your primary review destination, toggle \"Set as default\". The default platform is used in all review requests unless you choose a different one." },
        ].map((item) => (
          <div key={item.step} className="flex gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-black mt-0.5"
              style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
            >
              {item.step}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{item.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.04 260)" }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onNavigate("/settings")}
        className="w-full font-bold"
        style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
      >
        <Globe size={15} className="mr-2" /> Go to Settings → Review Platforms
      </Button>
    </div>
  );
}

function StepContacts({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
          Three ways to add contacts
        </p>
        <p className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
          Your Saved Contacts list is where you store repeat customers so you can send review requests to them in bulk or individually, without re-entering their details each time.
        </p>
      </div>

      {/* Method 1: CSV */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.22 0.09 260)" }}>
          <Upload size={14} style={{ color: "oklch(0.80 0.18 80)" }} />
          <p className="text-sm font-bold text-white">Option A — Import a CSV file</p>
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
              <p className="text-xs" style={{ color: "oklch(0.40 0.04 260)" }}>{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/import")}
            variant="outline"
            className="w-full mt-1 font-bold text-xs"
            style={{ borderColor: "oklch(0.80 0.05 260)" }}
          >
            <Upload size={12} className="mr-1" /> Go to Import CSV
          </Button>
        </div>
      </div>

      {/* Method 2: Stripe */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.45 0.12 280)" }}>
          <CreditCard size={14} className="text-white" />
          <p className="text-sm font-bold text-white">Option B — Sync from Stripe</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Go to Settings → Stripe and connect your Stripe account with your secret key." },
            { step: "2", desc: "Open Saved Contacts and tap the \"Stripe\" sync button in the header." },
            { step: "3", desc: "ReviewLink pulls all your Stripe customers and adds them as contacts automatically. Duplicates are skipped." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.03 280)", color: "oklch(0.30 0.08 280)" }}
              >
                {item.step}
              </span>
              <p className="text-xs" style={{ color: "oklch(0.40 0.04 260)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Method 3: WooCommerce */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.40 0.12 200)" }}>
          <ShoppingCart size={14} className="text-white" />
          <p className="text-sm font-bold text-white">Option C — Sync from WooCommerce</p>
        </div>
        <div className="px-4 py-3 space-y-2 bg-white">
          {[
            { step: "1", desc: "Go to Settings → WooCommerce and enter your store URL, consumer key, and consumer secret." },
            { step: "2", desc: "To generate API keys: in WordPress go to WooCommerce → Settings → Advanced → REST API → Add Key. Set permissions to Read." },
            { step: "3", desc: "Once connected, open Saved Contacts and tap the \"WooCommerce\" sync button. Choose how many days of orders to pull (30 / 60 / 90)." },
          ].map((item) => (
            <div key={item.step} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                style={{ background: "oklch(0.93 0.04 200)", color: "oklch(0.30 0.10 200)" }}
              >
                {item.step}
              </span>
              <p className="text-xs" style={{ color: "oklch(0.40 0.04 260)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Method 4: Manual */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "white", border: "1px solid oklch(0.91 0.02 260)" }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
          Option D — Add contacts manually
        </p>
        <p className="text-xs" style={{ color: "oklch(0.45 0.04 260)" }}>
          Open Saved Contacts and tap the "+ Add" button in the top-right corner. Enter the customer's name, email, and optional phone number or notes.
        </p>
      </div>

      <Button
        onClick={() => onNavigate("/contacts")}
        className="w-full font-bold"
        style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
      >
        <Users size={15} className="mr-2" /> Go to Saved Contacts
      </Button>
    </div>
  );
}

function StepSendRequest({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4"
        style={{ background: "oklch(0.96 0.02 260)", border: "1px solid oklch(0.88 0.03 260)" }}
      >
        <p className="text-sm font-bold mb-1" style={{ color: "oklch(0.22 0.09 260)" }}>
          Two ways to send
        </p>
        <p className="text-sm" style={{ color: "oklch(0.40 0.04 260)" }}>
          You can send a review request to a single customer on the spot, or bulk-send to multiple saved contacts at once.
        </p>
      </div>

      {/* Single send */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.22 0.09 260)" }}>
          <Send size={14} style={{ color: "oklch(0.80 0.18 80)" }} />
          <p className="text-sm font-bold text-white">Send to one customer</p>
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
              <p className="text-xs" style={{ color: "oklch(0.40 0.04 260)" }}>{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/send")}
            className="w-full mt-1 font-bold text-xs"
            style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
          >
            <Send size={12} className="mr-1" /> Go to Send Request
          </Button>
        </div>
      </div>

      {/* Bulk send */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(0.91 0.02 260)" }}>
        <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "oklch(0.55 0.12 160)" }}>
          <Users size={14} className="text-white" />
          <p className="text-sm font-bold text-white">Bulk send to saved contacts</p>
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
              <p className="text-xs" style={{ color: "oklch(0.40 0.04 260)" }}>{item.desc}</p>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onNavigate("/contacts")}
            variant="outline"
            className="w-full mt-1 font-bold text-xs"
            style={{ borderColor: "oklch(0.80 0.05 260)" }}
          >
            <Users size={12} className="mr-1" /> Go to Saved Contacts
          </Button>
        </div>
      </div>

      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.10 80)" }}>
          💡 Pro tip: Follow-up reminders
        </p>
        <p className="text-xs" style={{ color: "oklch(0.50 0.06 80)" }}>
          ReviewLink can automatically send a polite follow-up email 3 days after the original request if the customer hasn't responded. Set this up in the Reminders section of Settings.
        </p>
      </div>
    </div>
  );
}

function StepDone({ onNavigate, onClose }: { onNavigate: (path: string) => void; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <CheckCircle2 size={52} className="mx-auto mb-3" style={{ color: "oklch(0.55 0.18 145)" }} />
        <h2 className="text-xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Poppins', sans-serif" }}>
          You're all set!
        </h2>
        <p className="text-sm mt-2" style={{ color: "oklch(0.45 0.04 260)" }}>
          ReviewLink is ready to start collecting reviews for your business.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(0.55 0.05 260)" }}>
          Quick links
        </p>
        {[
          { label: "Send a review request now", path: "/send", icon: <Send size={14} /> },
          { label: "View saved contacts", path: "/contacts", icon: <Users size={14} /> },
          { label: "Check your dashboard", path: "/dashboard", icon: <Star size={14} /> },
          { label: "Manage settings", path: "/settings", icon: <Globe size={14} /> },
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => { onClose(); onNavigate(link.path); }}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:opacity-80"
            style={{ background: "white", border: "1px solid oklch(0.91 0.02 260)" }}
          >
            <div style={{ color: "oklch(0.55 0.08 260)" }}>{link.icon}</div>
            <span className="text-sm font-medium flex-1" style={{ color: "oklch(0.22 0.09 260)" }}>
              {link.label}
            </span>
            <ChevronRight size={14} style={{ color: "oklch(0.70 0.03 260)" }} />
          </button>
        ))}
      </div>

      <div
        className="rounded-xl px-4 py-3"
        style={{ background: "oklch(0.97 0.03 80)", border: "1px solid oklch(0.88 0.06 80)" }}
      >
        <p className="text-xs font-bold mb-1" style={{ color: "oklch(0.40 0.10 80)" }}>
          Need to revisit this guide?
        </p>
        <p className="text-xs" style={{ color: "oklch(0.50 0.06 80)" }}>
          Tap the "Setup Guide" button on the Home screen or in Settings any time to reopen these instructions.
        </p>
      </div>

      <Button
        onClick={onClose}
        className="w-full font-bold"
        style={{ background: "oklch(0.55 0.18 145)", color: "white" }}
      >
        <Rocket size={15} className="mr-2" /> Start Using ReviewLink
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();

  // Reset to first step whenever modal opens
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const STEPS: Step[] = [
    {
      id: 0,
      icon: <Rocket size={20} />,
      title: "Welcome to ReviewLink",
      subtitle: "Here's what we'll set up together",
      content: <StepWelcome />,
    },
    {
      id: 1,
      icon: <Mail size={20} />,
      title: "Connect Your Email",
      subtitle: "Send from your own email account",
      content: <StepConnectEmail onNavigate={handleNavigate} />,
    },
    {
      id: 2,
      icon: <Star size={20} />,
      title: "Add a Review Platform",
      subtitle: "Where should customers leave their review?",
      content: <StepReviewPlatform onNavigate={handleNavigate} />,
    },
    {
      id: 3,
      icon: <Users size={20} />,
      title: "Import Your Contacts",
      subtitle: "Build your customer list",
      content: <StepContacts onNavigate={handleNavigate} />,
    },
    {
      id: 4,
      icon: <Send size={20} />,
      title: "Send a Review Request",
      subtitle: "One customer or many — your choice",
      content: <StepSendRequest onNavigate={handleNavigate} />,
    },
    {
      id: 5,
      icon: <CheckCircle2 size={20} />,
      title: "You're All Set",
      subtitle: "Everything you need to get started",
      content: <StepDone onNavigate={handleNavigate} onClose={onClose} />,
    },
  ];

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "oklch(0.975 0.003 100)" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-12 pb-5 shrink-0"
        style={{ background: "oklch(0.22 0.09 260)" }}
      >
        {/* Top row: guide label + close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: "oklch(0.80 0.18 80)" }} />
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Poppins', sans-serif" }}
            >
              Setup Guide
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Close guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress dots */}
        <div className="flex items-center gap-1.5 mb-4">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className="transition-all rounded-full"
              style={{
                width: i === step ? "24px" : "8px",
                height: "8px",
                background: i === step
                  ? "oklch(0.80 0.18 80)"
                  : i < step
                    ? "oklch(0.55 0.10 80)"
                    : "oklch(0.40 0.05 260)",
              }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
          <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Step title */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "oklch(0.32 0.08 260)", color: "oklch(0.80 0.18 80)" }}
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
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              {current.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {current.content}
      </div>

      {/* ── Footer navigation ───────────────────────────────────────────────── */}
      {!isLast && (
        <div
          className="px-5 py-4 flex items-center gap-3 shrink-0"
          style={{ borderTop: "1px solid oklch(0.91 0.02 260)", background: "white" }}
        >
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            className="font-bold"
            style={{ opacity: isFirst ? 0 : 1, pointerEvents: isFirst ? "none" : "auto" }}
          >
            <ChevronLeft size={15} className="mr-1" /> Back
          </Button>
          <Button
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 font-bold"
            style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
          >
            {step === STEPS.length - 2 ? "Finish" : "Next"}
            <ChevronRight size={15} className="ml-1" />
          </Button>
        </div>
      )}
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
