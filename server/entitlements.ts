export type PaidTier = string | null | undefined;

export type PaidEntitlementInput = {
  role: "user" | "admin" | string;
  tier: PaidTier;
  planExpiresAt?: number | null;
};

/**
 * Single source of truth for paid feature access.
 * Administrators always bypass the paywall; lifetime plans never expire.
 */
export function hasPaidOrAdminAccess(
  input: PaidEntitlementInput,
  now = Date.now(),
): boolean {
  if (input.role === "admin") return true;
  if (input.tier === "lifetime") return true;
  if (input.tier !== "pro" && input.tier !== "annual") return false;

  return input.planExpiresAt == null || input.planExpiresAt >= now;
}
