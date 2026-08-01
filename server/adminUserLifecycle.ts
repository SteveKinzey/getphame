export const MAX_ADMIN_GRANT_MONTHS = 1_200;
export const MAX_ADMIN_GRANT_YEARS = 100;
export const MAX_ADMIN_SUSPENSION_DAYS = 3_650;

export type FlexibleAccessGrant =
  | { kind: "lifetime" }
  | { kind: "months"; quantity: number }
  | { kind: "years"; quantity: number };

export function assertPositiveWholeNumber(value: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${label} must be a whole number between 1 and ${maximum}.`);
  }
}

/** Preserves unused paid time by extending from the later of now or current expiry. */
export function resolveFlexibleAccessExpiry(
  currentExpiry: number | null | undefined,
  grant: Exclude<FlexibleAccessGrant, { kind: "lifetime" }>,
  now = Date.now(),
) {
  const maximum = grant.kind === "months" ? MAX_ADMIN_GRANT_MONTHS : MAX_ADMIN_GRANT_YEARS;
  assertPositiveWholeNumber(grant.quantity, maximum, grant.kind === "months" ? "Months" : "Years");
  const base = new Date(Math.max(now, currentExpiry ?? 0));
  if (grant.kind === "months") base.setUTCMonth(base.getUTCMonth() + grant.quantity);
  else base.setUTCFullYear(base.getUTCFullYear() + grant.quantity);
  return base.getTime();
}

export function resolveSuspensionUntil(days: number, now = Date.now()) {
  assertPositiveWholeNumber(days, MAX_ADMIN_SUSPENSION_DAYS, "Suspension days");
  return now + days * 24 * 60 * 60 * 1000;
}

export function isActiveSuspension(suspendedUntil: number | null | undefined, now = Date.now()) {
  return typeof suspendedUntil === "number" && suspendedUntil > now;
}
