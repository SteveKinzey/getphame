// ReviewLink — Changelog / What's New
// Design: Navy header, white content area, gold accent for version badges

import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Rocket, Star, Shield, Zap, Users, BarChart2, Mail } from "lucide-react";

type Label = "new" | "improved" | "fix";

interface ChangeEntry {
  version: string;
  date: string;
  label: Label;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const CHANGELOG: { version: string; date: string; entries: ChangeEntry[] }[] = [
  {
    version: "1.3",
    date: "April 2026",
    entries: [
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <BarChart2 size={15} />,
        title: "Email Performance Dashboard",
        description:
          "Open rate and click rate now appear as an at-a-glance summary card on your Home screen, so you can see how your review requests are performing without digging into individual records.",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <Star size={15} />,
        title: "Top Template Badge",
        description:
          "The email template with the highest click rate now shows a gold 🏆 Top Template badge on the Templates list, so you always know which message is converting best.",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "improved",
        icon: <Mail size={15} />,
        title: "Reminder Email Tracking",
        description:
          "Open and click tracking now covers reminder follow-up emails, not just the initial send. All engagement data rolls up under the original request so your stats stay clean.",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <Rocket size={15} />,
        title: "Share ReviewLink Referral Card",
        description:
          "A new card on the Home screen lets you share ReviewLink with other local businesses in one tap — using the native share sheet on mobile or clipboard copy on desktop.",
      },
    ],
  },
  {
    version: "1.2",
    date: "March 2026",
    entries: [
      {
        version: "1.2",
        date: "March 2026",
        label: "new",
        icon: <Users size={15} />,
        title: "CSV Contact Import",
        description:
          "Import your entire customer list from a spreadsheet in four steps: upload, map columns, preview, and confirm. Supports up to 5,000 contacts per import with automatic duplicate detection.",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "new",
        icon: <Users size={15} />,
        title: "Bulk Send to Contacts",
        description:
          "Select multiple saved contacts and send personalised review requests to all of them at once. Filter by tag to target specific customer groups.",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "improved",
        icon: <Zap size={15} />,
        title: "WooCommerce Sync",
        description:
          "Connect your WooCommerce store and import recent customers directly into your contacts list. Choose a 30, 60, or 90-day sync window to control how far back to look.",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "improved",
        icon: <Mail size={15} />,
        title: "Reminder Follow-ups",
        description:
          "Set up automatic follow-up reminders for customers who haven't left a review yet. Configure the delay and message per template, and ReviewLink handles the rest.",
      },
    ],
  },
  {
    version: "1.1",
    date: "February 2026",
    entries: [
      {
        version: "1.1",
        date: "February 2026",
        label: "new",
        icon: <Star size={15} />,
        title: "Multi-Platform Review Links",
        description:
          "Add multiple review destinations — Google, Yelp, TripAdvisor, Facebook, or any custom URL — and set a default. Each outbound email uses the platform you choose.",
      },
      {
        version: "1.1",
        date: "February 2026",
        label: "new",
        icon: <BarChart2 size={15} />,
        title: "Open & Click Tracking",
        description:
          "Every review request email now includes an invisible tracking pixel and a click-tracked review link. See exactly who opened your email and who clicked through to leave a review.",
      },
      {
        version: "1.1",
        date: "February 2026",
        label: "improved",
        icon: <Mail size={15} />,
        title: "Email Templates",
        description:
          "Create, edit, and manage multiple email templates. Set a default template for quick sends, or choose a specific template per request.",
      },
    ],
  },
  {
    version: "1.0",
    date: "January 2026",
    entries: [
      {
        version: "1.0",
        date: "January 2026",
        label: "new",
        icon: <Rocket size={15} />,
        title: "ReviewLink Launch",
        description:
          "Send personalised review request emails from your own email account — not a bulk mailer. Customers receive a message that looks like it came directly from you.",
      },
      {
        version: "1.0",
        date: "January 2026",
        label: "new",
        icon: <Shield size={15} />,
        title: "CAN-SPAM Compliant",
        description:
          "Every email includes a compliant unsubscribe footer and your business address. ReviewLink handles the legal requirements so you don't have to.",
      },
    ],
  },
];

const LABEL_STYLES: Record<Label, { bg: string; color: string; text: string }> = {
  new: { bg: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)", text: "New" },
  improved: { bg: "oklch(0.88 0.10 80)", color: "oklch(0.35 0.12 80)", text: "Improved" },
  fix: { bg: "oklch(0.92 0.04 145)", color: "oklch(0.40 0.12 145)", text: "Fix" },
};

type FilterTab = "all" | Label;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "improved", label: "Improved" },
  { id: "fix", label: "Fix" },
];

export default function ChangelogPage() {
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Flatten all entries across releases for filtering
  const allEntries = CHANGELOG.flatMap((r) => r.entries);
  const filteredEntries = activeFilter === "all" ? allEntries : allEntries.filter((e) => e.label === activeFilter);

  // Group filtered entries back by version for display
  const filteredReleases = CHANGELOG.map((release) => ({
    ...release,
    entries: release.entries.filter(
      (e) => activeFilter === "all" || e.label === activeFilter
    ),
  })).filter((r) => r.entries.length > 0);

  const totalCount = filteredEntries.length;

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      {/* Navy header */}
      <div
        className="relative px-5 pt-14 pb-6 rr-bg-navy"
      >
        <button
          onClick={() => navigate("/")}
          aria-label="Back to Home"
          className="flex items-center gap-2 mb-4 transition-opacity active:opacity-70 rr-text-gold"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="text-xs font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Back
          </span>
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-1 active:opacity-70 transition-opacity"
          aria-label="Go to Home"
        >
          <Rocket size={16} className="rr-text-gold" aria-hidden="true" />
          <span
            className="text-xs font-bold tracking-widest uppercase rr-text-gold"
          >
            ReviewLink
          </span>
        </button>
        <h1
          className="text-2xl leading-tight text-white rr-fw-black"
        >
          What's New
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
          Every update, improvement, and fix — in one place.
        </p>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="Filter changelog by category">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(tab.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150 active:scale-95"
                style={{
                  background: isActive ? "oklch(0.80 0.18 80)" : "oklch(0.30 0.07 260)",
                  color: isActive ? "oklch(0.22 0.09 260)" : "oklch(0.70 0.04 260)",
                  fontFamily: "'Poppins', sans-serif",
                  border: "none",
                }}
              >
                {tab.label}
                {tab.id !== "all" && (
                  <span
                    className="ml-1.5 text-xs opacity-70 rr-fw-normal"
                  >
                    {allEntries.filter((e) => e.label === tab.id).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs rr-text-navy-muted">
          {totalCount} {totalCount === 1 ? "update" : "updates"}
          {activeFilter !== "all" ? ` matching "${LABEL_STYLES[activeFilter as Label]?.text}"` : " total"}
        </p>
      </div>

      {/* Release sections */}
      <div className="px-4 pt-2 flex flex-col gap-8">
        {filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm rr-text-navy-muted">No updates in this category yet.</p>
          </div>
        ) : (
          filteredReleases.map((release) => (
            <div key={release.version}>
              {/* Version header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1 rounded-full text-xs font-black rr-bg-navy rr-text-gold"
                >
                  v{release.version}
                </div>
                <span
                  className="text-xs font-semibold rr-text-navy-muted"
                >
                  {release.date}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "oklch(0.90 0.01 260)" }}
                />
              </div>

              {/* Entries */}
              <div className="flex flex-col gap-3">
                {release.entries.map((entry, i) => {
                  const style = LABEL_STYLES[entry.label];
                  return (
                    <div
                      key={i}
                      className="rounded-2xl p-4 flex gap-3 bg-white" style={{ boxShadow: "0 1px 4px oklch(0.22 0.09 260 / 0.08)" }}
                    >
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 rr-text-navy" style={{ background: "oklch(0.96 0.02 260)" }}
                        aria-hidden="true"
                      >
                        {entry.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-sm font-black leading-tight rr-text-navy"
                          >
                            {entry.title}
                          </span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {style.text}
                          </span>
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "oklch(0.50 0.03 260)" }}
                        >
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer note */}
      <div className="px-4 pt-6 pb-4 text-center">
        <p className="text-xs rr-text-navy-faint">
          Have a feature request?{" "}
          <a
            href="mailto:support@reviewlink.app"
            className="font-bold underline"
            style={{ color: "oklch(0.45 0.05 260)" }}
          >
            Let us know
          </a>
        </p>
      </div>
    </div>
  );
}
