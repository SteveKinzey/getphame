// WhatsNewModal — shown once per app version after a SW-triggered update.
// Stores the last-seen version in localStorage under "phame-whats-new-seen".
// Usage: <WhatsNewModal version={currentVersion} />
// Trigger: call show() from useAppVersionCheck when RELOAD_REQUIRED fires.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Zap, Globe, Bell, Shield, Smartphone, Crown, Languages, Ticket, Ban } from "lucide-react";

const LS_KEY = "phame-whats-new-seen";

export interface ChangelogEntry {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// ── Changelog — update this array with each new release ──────────────────────
// Keep entries in reverse-chronological order (newest first).
const CHANGELOG: ChangelogEntry[] = [
  {
    icon: <Ticket size={16} className="rr-text-gold" />,
    title: "Coupon code generation",
    description: "Admins can now create time-limited or lifetime discount codes directly from the Admin Dashboard — with custom prefixes, max-use limits, and expiry dates.",
  },
  {
    icon: <Ban size={16} className="rr-text-gold" />,
    title: "Revoke user access",
    description: "A new Revoke Access button in the Privileged Users table lets admins instantly downgrade any paid user back to the free tier with a single confirmation tap.",
  },
  {
    icon: <Smartphone size={16} className="rr-text-gold" />,
    title: "Install guide in onboarding",
    description: "New users now see step-by-step iPhone and Android install instructions as the final onboarding step — plus a Share button to send the link to a friend.",
  },
  {
    icon: <Bell size={16} className="rr-text-gold" />,
    title: "Auto-update notifications",
    description: "The app detects new versions automatically and shows a 'New version available' prompt. Admins get a Force Update button in Settings.",
  },
  {
    icon: <Languages size={16} className="rr-text-gold" />,
    title: "Full multilingual support",
    description: "All in-app text is now available in English, Thai, Chinese, French, Spanish, and Italian — including onboarding, dashboard, and share flows.",
  },
  {
    icon: <Crown size={16} className="rr-text-gold" />,
    title: "Admin panel upgrades",
    description: "Admins can now promote users, grant flexible subscriptions (days, months, or lifetime), and manage access codes — all without a code change.",
  },
  {
    icon: <Zap size={16} className="rr-text-gold" />,
    title: "Activity Trend chart",
    description: "Track your 30/60/90-day send, open, and click trends directly in the Dashboard.",
  },
  {
    icon: <Star size={16} className="rr-text-gold" />,
    title: "Referral rewards",
    description: "Earn 1 free month for every paying customer you refer. Share your link from the Home screen.",
  },
  {
    icon: <Shield size={16} className="rr-text-gold" />,
    title: "SMTP email sending",
    description: "Send review requests from your own email account — Gmail, Outlook, Yahoo, Zoho, and more.",
  },
];

interface WhatsNewModalProps {
  /** The current deployed version string (e.g. "fca15a39"). */
  version: string;
  /** If true, force-show the modal regardless of localStorage (used for testing). */
  forceShow?: boolean;
}

export function WhatsNewModal({ version, forceShow = false }: WhatsNewModalProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!version) return;
    const seen = localStorage.getItem(LS_KEY);
    if (forceShow || seen !== version) {
      // Small delay so the page settles before the modal appears
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [version, forceShow]);

  const handleClose = () => {
    localStorage.setItem(LS_KEY, version);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border-0"
        style={{ background: "var(--navy)" }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles size={20} className="rr-text-gold" />
            <DialogTitle className="text-lg font-black text-white m-0">
              {t("whatsNew.title", { defaultValue: "What's New" })}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs" style={{ color: "var(--text-on-dark-secondary)" }}>
            {t("whatsNew.subtitle", { defaultValue: "Here's what changed in the latest update." })}
          </DialogDescription>
        </div>

        {/* Changelog list */}
        <div className="px-5 pb-2 flex flex-col gap-3 max-h-72 overflow-y-auto">
          {CHANGELOG.map((entry, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: "oklch(0.30 0.09 260)" }}
              >
                {entry.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{entry.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-on-dark-secondary)" }}>
                  {entry.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4">
          <Button
            onClick={handleClose}
            className="w-full font-bold rounded-xl h-11"
            style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
          >
            {t("whatsNew.cta", { defaultValue: "Got it — let's go!" })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Returns the current deployed version from /__manus__/version.json */
export async function fetchCurrentVersion(): Promise<string> {
  try {
    const res = await fetch("/__manus__/version.json?_t=" + Date.now(), { cache: "no-store" });
    const data = await res.json();
    return data.version ?? "";
  } catch {
    return "";
  }
}
