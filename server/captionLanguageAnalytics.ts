export const CAPTION_LANGUAGE_ANALYTICS_LANGUAGES = [
  "en",
  "es",
  "fr",
  "it",
  "de",
  "pt",
] as const;

export type CaptionLanguageAnalyticsCode =
  (typeof CAPTION_LANGUAGE_ANALYTICS_LANGUAGES)[number];

export const CAPTION_LANGUAGE_ANALYTICS_SOURCE = "walkthrough_captions";
const CAPTION_LANGUAGE_EVENT_PREFIX = "/captions/language/";

export function toCaptionLanguageEventPage(
  language: CaptionLanguageAnalyticsCode
): string {
  return `${CAPTION_LANGUAGE_EVENT_PREFIX}${language}`;
}

export function fromCaptionLanguageEventPage(
  page: string
): CaptionLanguageAnalyticsCode | null {
  if (!page.startsWith(CAPTION_LANGUAGE_EVENT_PREFIX)) return null;
  const language = page.slice(CAPTION_LANGUAGE_EVENT_PREFIX.length);
  return CAPTION_LANGUAGE_ANALYTICS_LANGUAGES.includes(
    language as CaptionLanguageAnalyticsCode
  )
    ? (language as CaptionLanguageAnalyticsCode)
    : null;
}

export interface CaptionLanguageAnalyticsRow {
  page: string;
  createdAt: Date;
}

type CaptionLanguageCounts = Record<CaptionLanguageAnalyticsCode, number>;

function emptyCounts(): CaptionLanguageCounts {
  return Object.fromEntries(
    CAPTION_LANGUAGE_ANALYTICS_LANGUAGES.map(language => [language, 0])
  ) as CaptionLanguageCounts;
}

function mostSelected(counts: CaptionLanguageCounts) {
  let language: CaptionLanguageAnalyticsCode | null = null;
  let count = 0;

  for (const candidate of CAPTION_LANGUAGE_ANALYTICS_LANGUAGES) {
    if (counts[candidate] > count) {
      language = candidate;
      count = counts[candidate];
    }
  }

  return { language, count };
}

export function summarizeCaptionLanguageEvents(
  rows: CaptionLanguageAnalyticsRow[],
  now = Date.now()
) {
  const allTime = emptyCounts();
  const last30Days = emptyCounts();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const language = fromCaptionLanguageEventPage(row.page);
    if (!language) continue;
    allTime[language] += 1;
    if (row.createdAt.getTime() >= thirtyDaysAgo) last30Days[language] += 1;
  }

  return {
    allTime,
    last30Days,
    topAllTime: mostSelected(allTime),
    topLast30Days: mostSelected(last30Days),
  };
}
