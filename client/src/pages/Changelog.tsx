// Phame — Changelog / What's New
// Design: Navy header, white content area, gold accent for version badges
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Star, Shield, Zap, Users, BarChart2, Mail, TrendingUp, Globe, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type Label = "new" | "improved" | "fix";
interface ChangeEntry {
  version: string;
  date: string;
  label: Label;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
}

const CHANGELOG: { version: string; date: string; entries: ChangeEntry[] }[] = [
  {
    version: "1.4",
    date: "June 2026",
    entries: [
      {
        version: "1.4",
        date: "June 2026",
        label: "new",
        icon: <Star size={15} />,
        titleKey: "changelog.v14.brandRefresh.title",
        descriptionKey: "changelog.v14.brandRefresh.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "new",
        icon: <TrendingUp size={15} />,
        titleKey: "changelog.v14.referralSystem.title",
        descriptionKey: "changelog.v14.referralSystem.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "new",
        icon: <Mail size={15} />,
        titleKey: "changelog.v14.poweredByPhame.title",
        descriptionKey: "changelog.v14.poweredByPhame.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "new",
        icon: <Users size={15} />,
        titleKey: "changelog.v14.clientDetailSheet.title",
        descriptionKey: "changelog.v14.clientDetailSheet.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "new",
        icon: <RotateCcw size={15} />,
        titleKey: "changelog.v14.bulkRestart.title",
        descriptionKey: "changelog.v14.bulkRestart.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "improved",
        icon: <Shield size={15} />,
        titleKey: "changelog.v14.yelpCompliance.title",
        descriptionKey: "changelog.v14.yelpCompliance.description",
      },
      {
        version: "1.4",
        date: "June 2026",
        label: "improved",
        icon: <Globe size={15} />,
        titleKey: "changelog.v14.domainMigration.title",
        descriptionKey: "changelog.v14.domainMigration.description",
      },
    ],
  },
  {
    version: "1.3",
    date: "April 2026",
    entries: [
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <BarChart2 size={15} />,
        titleKey: "changelog.v13.emailDashboard.title",
        descriptionKey: "changelog.v13.emailDashboard.description",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <Star size={15} />,
        titleKey: "changelog.v13.topTemplateBadge.title",
        descriptionKey: "changelog.v13.topTemplateBadge.description",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "improved",
        icon: <Mail size={15} />,
        titleKey: "changelog.v13.reminderTracking.title",
        descriptionKey: "changelog.v13.reminderTracking.description",
      },
      {
        version: "1.3",
        date: "April 2026",
        label: "new",
        icon: <Star size={15} />,
        titleKey: "changelog.v13.referralCard.title",
        descriptionKey: "changelog.v13.referralCard.description",
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
        titleKey: "changelog.v12.csvImport.title",
        descriptionKey: "changelog.v12.csvImport.description",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "new",
        icon: <Users size={15} />,
        titleKey: "changelog.v12.bulkSend.title",
        descriptionKey: "changelog.v12.bulkSend.description",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "new",
        icon: <Zap size={15} />,
        titleKey: "changelog.v12.wooSync.title",
        descriptionKey: "changelog.v12.wooSync.description",
      },
      {
        version: "1.2",
        date: "March 2026",
        label: "new",
        icon: <BarChart2 size={15} />,
        titleKey: "changelog.v12.emailTracking.title",
        descriptionKey: "changelog.v12.emailTracking.description",
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
        icon: <Zap size={15} />,
        titleKey: "changelog.v11.reminders.title",
        descriptionKey: "changelog.v11.reminders.description",
      },
      {
        version: "1.1",
        date: "February 2026",
        label: "new",
        icon: <Star size={15} />,
        titleKey: "changelog.v11.multiPlatform.title",
        descriptionKey: "changelog.v11.multiPlatform.description",
      },
      {
        version: "1.1",
        date: "February 2026",
        label: "improved",
        icon: <Shield size={15} />,
        titleKey: "changelog.v11.compliance.title",
        descriptionKey: "changelog.v11.compliance.description",
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
        icon: <Star size={15} />,
        titleKey: "changelog.v10.launch.title",
        descriptionKey: "changelog.v10.launch.description",
      },
    ],
  },
];

const LABEL_STYLES: Record<Label, { bg: string; color: string; textKey: string }> = {
  new: { bg: "oklch(0.92 0.06 260)", color: "oklch(0.35 0.12 260)", textKey: "changelog.labelNew" },
  improved: { bg: "oklch(0.92 0.06 80)", color: "oklch(0.45 0.12 80)", textKey: "changelog.labelImproved" },
  fix: { bg: "oklch(0.92 0.04 145)", color: "oklch(0.40 0.12 145)", textKey: "changelog.labelFix" },
};

type FilterTab = "all" | Label;

export default function ChangelogPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
    { id: "all", labelKey: "changelog.filterAll" },
    { id: "new", labelKey: "changelog.filterNew" },
    { id: "improved", labelKey: "changelog.filterImproved" },
    { id: "fix", labelKey: "changelog.filterFix" },
  ];

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
          aria-label={t("changelog.backAriaLabel", "Back to Home")}
          className="flex items-center gap-2 mb-4 transition-opacity active:opacity-70 rr-text-gold"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span className="text-xs font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {t("header.back")}
          </span>
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-1 active:opacity-70 transition-opacity"
          aria-label={t("changelog.homeAriaLabel", "Go to Home")}
        >
          <Star size={16} className="rr-text-gold" aria-hidden="true" />
          <span
            className="text-xs font-bold tracking-widest uppercase rr-text-gold"
          >
            Phame
          </span>
        </button>
        <h1
          className="text-2xl leading-tight text-white rr-fw-black"
        >
          {t("changelog.title", "What's New")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-on-dark-secondary)" }}>
          {t("changelog.subtitle", "Every update, improvement, and fix — in one place.")}
        </p>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label={t("changelog.filterAriaLabel", "Filter changelog by category")}>
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
                {t(tab.labelKey)}
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
          {totalCount} {totalCount === 1 ? t("changelog.update", "update") : t("changelog.updates", "updates")}
          {activeFilter !== "all" ? ` ${t("changelog.matching", "matching")} "${t(LABEL_STYLES[activeFilter as Label]?.textKey)}"` : ` ${t("changelog.total", "total")}`}
        </p>
      </div>

      {/* Release sections */}
      <div className="px-4 pt-2 flex flex-col gap-8">
        {filteredReleases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm rr-text-navy-muted">{t("changelog.noUpdates", "No updates in this category yet.")}</p>
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
                            {t(entry.titleKey, entry.titleKey.split(".").pop() ?? "")}
                          </span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {t(style.textKey)}
                          </span>
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "oklch(0.50 0.03 260)" }}
                        >
                          {t(entry.descriptionKey, entry.descriptionKey.split(".").pop() ?? "")}
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
          {t("changelog.featureRequest", "Have a feature request?")}{" "}
          <a
            href="mailto:support@phame.app"
            className="font-bold underline"
            style={{ color: "oklch(0.45 0.05 260)" }}
          >
            {t("changelog.letUsKnow", "Let us know")}
          </a>
        </p>
      </div>
    </div>
  );
}
