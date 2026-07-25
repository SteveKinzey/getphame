import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgePercent,
  Bell,
  BookOpen,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  Compass,
  CreditCard,
  ExternalLink,
  FileText,
  Gauge,
  Gift,
  Inbox,
  KeyRound,
  LockKeyhole,
  Mail,
  Plug,
  Rocket,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TrendingDown,
  Users,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getManualDocument } from "@/content/manuals/registry";
import type {
  ManualAccess,
  ManualIconName,
  ManualRole,
  ManualSection,
  ManualTopic,
} from "@/content/manuals/types";

const ICONS: Record<ManualIconName, LucideIcon> = {
  activity: Activity,
  badgePercent: BadgePercent,
  bell: Bell,
  building: Building2,
  chart: ChartNoAxesCombined,
  compass: Compass,
  creditCard: CreditCard,
  dollar: CreditCard,
  fileText: FileText,
  gauge: Gauge,
  gift: Gift,
  inbox: Inbox,
  key: KeyRound,
  mail: Mail,
  plug: Plug,
  rocket: Rocket,
  rotate: RotateCcw,
  send: Send,
  shield: ShieldCheck,
  trendDown: TrendingDown,
  users: Users,
};

function AccessBadge({ access }: { access: ManualAccess }) {
  const { t } = useTranslation();

  if (access === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1bb] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#664d00]">
        <LockKeyhole size={12} aria-hidden="true" />
        {t("manual.badges.paid", { defaultValue: "Paid subscription only" })}
      </span>
    );
  }

  if (access === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#e7edf8] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#14213d]">
        <ShieldCheck size={12} aria-hidden="true" />
        {t("manual.badges.admin", { defaultValue: "Administrator only" })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7ef] px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-[#155e3f]">
      <CheckCircle2 size={12} aria-hidden="true" />
      {t("manual.badges.all", { defaultValue: "Free & paid" })}
    </span>
  );
}

function topicMatches(topic: ManualTopic, query: string) {
  const searchable = [topic.title, topic.body, ...topic.steps, ...(topic.notes ?? [])]
    .join(" ")
    .toLocaleLowerCase();
  return searchable.includes(query);
}

function filterSections(sections: ManualSection[], rawQuery: string) {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return sections;

  return sections.flatMap(section => {
    if (`${section.title} ${section.summary}`.toLocaleLowerCase().includes(query)) {
      return [section];
    }

    const topics = section.topics.filter(topic => topicMatches(topic, query));
    return topics.length ? [{ ...section, topics }] : [];
  });
}

function TopicCard({ topic }: { topic: ManualTopic }) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  return (
    <article
      id={`manual-topic-${topic.id}`}
      className="scroll-mt-24 border-t border-[#e8e3d7] py-6 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-lg font-black leading-snug rr-text-navy" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <a className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b949] focus-visible:ring-offset-2" href={`#manual-topic-${topic.id}`}>
            {topic.title}
          </a>
        </h3>
        <AccessBadge access={topic.access} />
      </div>

      <p className="mt-3 max-w-4xl text-sm leading-6 rr-text-navy-mid">{topic.body}</p>

      <ol className="mt-4 space-y-3" aria-label={t("manual.stepsLabel", { defaultValue: `Steps for ${topic.title}` })}>
        {topic.steps.map((step, index) => (
          <li key={`${topic.id}-${index}`} className="flex gap-3 text-sm leading-6 rr-text-navy-mid">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full rr-bg-navy text-xs font-black text-white">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {topic.notes?.length ? (
        <div className="mt-4 border-l-4 border-[#e9b949] bg-[#fff9e8] px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-[#664d00]">
            {t("manual.noteLabel", { defaultValue: "Important note" })}
          </p>
          {topic.notes.map((note, index) => (
            <p key={`${topic.id}-note-${index}`} className="mt-1 text-sm leading-6 text-[#4d3b00]">{note}</p>
          ))}
        </div>
      ) : null}

      {topic.route ? (
        <Button
          type="button"
          variant="outline"
          className="mt-5 min-h-11 border-[#14213d] bg-white font-bold rr-text-navy"
          onClick={() => navigate(topic.route!)}
        >
          {t("manual.openFeature", { defaultValue: "Open this feature" })}
          <ExternalLink size={15} aria-hidden="true" />
        </Button>
      ) : null}
    </article>
  );
}

export default function ManualPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const role: ManualRole = user?.role === "admin" ? "admin" : "user";
  const manual = useMemo(
    () => getManualDocument(i18n.resolvedLanguage ?? i18n.language, role),
    [i18n.language, i18n.resolvedLanguage, role],
  );
  const filteredSections = useMemo(() => filterSections(manual.sections, query), [manual.sections, query]);
  const resultCount = filteredSections.reduce((total, section) => total + section.topics.length, 0);
  const paidTopicCount = manual.sections.reduce(
    (total, section) => total + section.topics.filter(topic => topic.access === "paid").length,
    0,
  );
  const adminSectionCount = manual.sections.filter(section => section.access === "admin").length;

  useEffect(() => {
    if (!window.location.hash) return;
    window.requestAnimationFrame(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ block: "start" });
    });
  }, [manual]);

  return (
    <div className="min-h-screen pb-40 rr-bg-cream-warm">
      <header className="rr-bg-navy px-4 pb-8 pt-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] rr-text-gold">
            <BookOpen size={17} aria-hidden="true" />
            {manual.eyebrow}
          </div>
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {manual.title}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-white/80 sm:text-base">{manual.introduction}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:min-w-[290px]">
              <div className="border-t-2 border-[#e9b949] bg-white/5 px-4 py-3">
                <p className="text-2xl font-black rr-text-gold">{manual.sections.length}</p>
                <p className="text-xs font-bold text-white/70">{t("manual.sectionCount", { defaultValue: "Manual sections" })}</p>
              </div>
              <div className="border-t-2 border-[#e9b949] bg-white/5 px-4 py-3">
                <p className="text-2xl font-black rr-text-gold">{role === "admin" ? adminSectionCount : paidTopicCount}</p>
                <p className="text-xs font-bold text-white/70">
                  {role === "admin"
                    ? t("manual.adminSectionCount", { defaultValue: "Admin-only sections" })
                    : t("manual.paidTopicCount", { defaultValue: "Paid-only topics" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rr-text-navy-muted" size={19} aria-hidden="true" />
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t("manual.searchPlaceholder", { defaultValue: "Search this manual" })}
            aria-label={t("manual.searchLabel", { defaultValue: "Search this manual" })}
            className="min-h-12 border-[#d9d3c6] bg-white pl-11 text-base shadow-sm"
          />
        </div>
        <p className="mt-2 text-xs rr-text-navy-muted" aria-live="polite">
          {query.trim()
            ? t("manual.searchResults", { count: resultCount, defaultValue: "{{count}} matching topics" })
            : t("manual.lastUpdated", {
                date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { dateStyle: "long" }).format(new Date(`${manual.lastUpdated}T00:00:00Z`)),
                defaultValue: "Last updated {{date}}",
              })}
        </p>

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label={t("manual.sectionNavigation", { defaultValue: "Manual sections" })}>
          {manual.sections.map(section => (
            <a
              key={section.id}
              href={`#manual-section-${section.id}`}
              className="min-h-11 shrink-0 rounded-full border border-[#d9d3c6] bg-white px-4 py-2.5 text-sm font-bold rr-text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b949]"
            >
              {section.title}
            </a>
          ))}
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-6 border-t-4 border-[#e9b949] bg-white p-5 shadow-sm" aria-label={t("manual.sectionNavigation", { defaultValue: "Manual sections" })}>
              <p className="text-xs font-black uppercase tracking-[0.14em] rr-text-navy-muted">
                {t("manual.inThisManual", { defaultValue: "In this manual" })}
              </p>
              <div className="mt-4 space-y-1">
                {manual.sections.map(section => {
                  const Icon = ICONS[section.icon];
                  return (
                    <a
                      key={section.id}
                      href={`#manual-section-${section.id}`}
                      className="flex min-h-10 items-center gap-3 rounded-lg px-2 py-2 text-sm font-bold rr-text-navy transition-colors hover:bg-[#fff8e1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b949]"
                    >
                      <Icon size={17} className="shrink-0 text-[#9a6b00]" aria-hidden="true" />
                      <span>{section.title}</span>
                    </a>
                  );
                })}
              </div>
            </nav>
          </aside>

          <main className="space-y-6" aria-label={manual.title}>
            {filteredSections.length ? (
              filteredSections.map(section => {
                const Icon = ICONS[section.icon];
                return (
                  <section
                    key={section.id}
                    id={`manual-section-${section.id}`}
                    className="scroll-mt-6 border-t-4 border-[#14213d] bg-white px-5 py-6 shadow-sm sm:px-7 sm:py-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1bb] text-[#725200]">
                        <Icon size={22} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black leading-tight rr-text-navy sm:text-2xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
                            <a href={`#manual-section-${section.id}`} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9b949] focus-visible:ring-offset-2">
                              {section.title}
                            </a>
                          </h2>
                          {section.access === "admin" ? <AccessBadge access="admin" /> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 rr-text-navy-muted">{section.summary}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      {section.topics.map(topic => <TopicCard key={topic.id} topic={topic} />)}
                    </div>
                  </section>
                );
              })
            ) : (
              <section className="border-t-4 border-[#e9b949] bg-white px-6 py-14 text-center shadow-sm">
                <Search className="mx-auto rr-text-navy-muted" size={32} aria-hidden="true" />
                <h2 className="mt-4 text-xl font-black rr-text-navy">{t("manual.noResultsTitle", { defaultValue: "No matching topics" })}</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 rr-text-navy-muted">
                  {t("manual.noResultsBody", { defaultValue: "Try a shorter search or browse the section links above." })}
                </p>
                <Button type="button" className="mt-5 rr-bg-navy font-bold text-white" onClick={() => setQuery("")}>
                  {t("manual.clearSearch", { defaultValue: "Clear search" })}
                </Button>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
