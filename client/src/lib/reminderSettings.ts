export const MIN_FOLLOW_UP_DELAY_DAYS = 1;
export const MAX_FOLLOW_UP_DELAY_DAYS = 14;
export const DEFAULT_FOLLOW_UP_DELAY_DAYS = 3;
export const DEFAULT_SECOND_FOLLOW_UP_DELAY_DAYS = 7;
export const FOLLOW_UP_DELAY_PRESETS = [3, 5, 7] as const;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function isValidFollowUpDelayDays(value: string | number): boolean {
  if (value === "") return false;
  const parsed = Number(value);
  return (
    Number.isInteger(parsed) &&
    parsed >= MIN_FOLLOW_UP_DELAY_DAYS &&
    parsed <= MAX_FOLLOW_UP_DELAY_DAYS
  );
}

export function normalizeFollowUpDelayDays(
  value: string | number,
  fallback = DEFAULT_FOLLOW_UP_DELAY_DAYS,
): number {
  if (!isValidFollowUpDelayDays(value)) {
    return Math.min(
      MAX_FOLLOW_UP_DELAY_DAYS,
      Math.max(MIN_FOLLOW_UP_DELAY_DAYS, Math.trunc(fallback)),
    );
  }

  return Number(value);
}

export function getProjectedFollowUpDates(
  originalSentAt: number,
  firstDelayDays: number,
  secondDelayDays: number,
): { first: Date; second: Date } {
  return {
    first: new Date(originalSentAt + firstDelayDays * DAY_IN_MS),
    second: new Date(originalSentAt + (firstDelayDays + secondDelayDays) * DAY_IN_MS),
  };
}
