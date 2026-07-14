export type EffectivePlan = "free" | "monthly" | "annual" | "life";

export const PLAN_LABELS: Record<EffectivePlan, string> = {
  free: "Free",
  monthly: "Monthly",
  annual: "Annual",
  life: "Life",
};

export function getEffectivePlan(
  tier: string | null | undefined,
  role?: string | null,
): EffectivePlan {
  if (role === "admin" || tier === "lifetime") return "life";
  if (tier === "annual") return "annual";
  if (tier === "pro") return "monthly";
  return "free";
}

export function getEffectiveTier(
  tier: string | null | undefined,
  role?: string | null,
): "free" | "pro" | "annual" | "lifetime" {
  const plan = getEffectivePlan(tier, role);
  if (plan === "life") return "lifetime";
  if (plan === "annual") return "annual";
  if (plan === "monthly") return "pro";
  return "free";
}

export function canManageSubscription(plan: EffectivePlan): boolean {
  return plan === "monthly" || plan === "annual";
}
