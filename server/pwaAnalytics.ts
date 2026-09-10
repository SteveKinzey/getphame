export const PWA_EVENT_NAMES = [
  "install_guide_viewed",
  "install_guide_dismissed",
  "install_prompt_opened",
  "install_accepted",
  "install_declined",
  "app_installed",
  "install_banner_viewed",
  "install_banner_clicked",
  "install_banner_dismissed",
  "install_banner_remind_later",
  "share_completed",
  "share_cancelled",
  "share_copied",
] as const;

export type PwaEventName = (typeof PWA_EVENT_NAMES)[number];

export const PWA_EVENT_SOURCE = "pwa_install_prompt";
const PWA_EVENT_PREFIX = "/pwa/";

export function toPwaEventPage(event: PwaEventName): string {
  return `${PWA_EVENT_PREFIX}${event.replaceAll("_", "-")}`;
}

export function fromPwaEventPage(page: string): PwaEventName | null {
  if (!page.startsWith(PWA_EVENT_PREFIX)) return null;
  const event = page.slice(PWA_EVENT_PREFIX.length).replaceAll("-", "_");
  return PWA_EVENT_NAMES.includes(event as PwaEventName)
    ? (event as PwaEventName)
    : null;
}

export interface PwaAnalyticsRow {
  page: string;
  utmMedium: string | null;
  createdAt: Date;
}

type EventCounts = Record<PwaEventName, number>;

function emptyCounts(): EventCounts {
  return Object.fromEntries(
    PWA_EVENT_NAMES.map(event => [event, 0])
  ) as EventCounts;
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0
    ? Math.round((numerator / denominator) * 1000) / 10
    : 0;
}

export function summarizePwaEvents(rows: PwaAnalyticsRow[], now = Date.now()) {
  const allTime = emptyCounts();
  const last30Days = emptyCounts();
  const byPlatform: Record<string, EventCounts> = {};
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const event = fromPwaEventPage(row.page);
    if (!event) continue;

    allTime[event] += 1;
    if (row.createdAt.getTime() >= thirtyDaysAgo) last30Days[event] += 1;

    const platform = row.utmMedium || "unknown";
    byPlatform[platform] ??= emptyCounts();
    byPlatform[platform][event] += 1;
  }

  const totalShares = allTime.share_completed + allTime.share_copied;
  const shareAttempts = totalShares + allTime.share_cancelled;
  return {
    allTime,
    last30Days,
    byPlatform,
    rates: {
      promptEngagement: percent(
        allTime.install_prompt_opened,
        allTime.install_guide_viewed
      ),
      installCompletion: percent(
        allTime.app_installed,
        allTime.install_guide_viewed
      ),
      installAcceptance: percent(
        allTime.install_accepted,
        allTime.install_prompt_opened
      ),
      shareConversion: percent(totalShares, allTime.install_guide_viewed),
      shareCompletion: percent(totalShares, shareAttempts),
    },
  };
}
