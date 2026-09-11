export type SubscriptionRecordHealthIssueKind =
  | "paid_profile_without_active_subscription"
  | "active_subscription_on_free_profile"
  | "plan_tier_mismatch"
  | "subscription_without_business_profile"
  | "duplicate_subscription_records";

export interface BusinessProfileSubscriptionRecord {
  userId: number;
  tier: string;
}

export interface StripeSubscriptionRecord {
  userId: number;
  plan: string;
  status: string;
}

export interface SubscriptionRecordHealthIssue {
  kind: SubscriptionRecordHealthIssueKind;
  count: number;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "lifetime",
]);

const PAID_TIERS = new Set(["pro", "annual", "lifetime"]);

const TIER_BY_PLAN: Record<string, string> = {
  monthly: "pro",
  annual: "annual",
  lifetime: "lifetime",
};

function isActiveSubscription(subscription: StripeSubscriptionRecord) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
}

/**
 * Compares only local entitlement records. It intentionally does not call the
 * Stripe API or return business names, customer emails, subscription IDs, or
 * any other payment data to the dashboard.
 */
export function assessSubscriptionRecordHealth(
  profiles: BusinessProfileSubscriptionRecord[],
  subscriptions: StripeSubscriptionRecord[],
  checkedAt = Date.now()
) {
  const profilesByUserId = new Map(
    profiles.map(profile => [profile.userId, profile])
  );
  const subscriptionsByUserId = new Map<number, StripeSubscriptionRecord[]>();

  for (const subscription of subscriptions) {
    const existing = subscriptionsByUserId.get(subscription.userId) ?? [];
    existing.push(subscription);
    subscriptionsByUserId.set(subscription.userId, existing);
  }

  const issueCounts = new Map<SubscriptionRecordHealthIssueKind, number>();
  const record = (kind: SubscriptionRecordHealthIssueKind) => {
    issueCounts.set(kind, (issueCounts.get(kind) ?? 0) + 1);
  };

  for (const profile of profiles) {
    const ownedSubscriptions = subscriptionsByUserId.get(profile.userId) ?? [];
    const activeSubscriptions = ownedSubscriptions.filter(isActiveSubscription);

    if (PAID_TIERS.has(profile.tier) && activeSubscriptions.length === 0) {
      record("paid_profile_without_active_subscription");
      continue;
    }

    if (profile.tier === "free" && activeSubscriptions.length > 0) {
      record("active_subscription_on_free_profile");
      continue;
    }

    if (
      activeSubscriptions.length > 0 &&
      !activeSubscriptions.some(
        subscription => TIER_BY_PLAN[subscription.plan] === profile.tier
      )
    ) {
      record("plan_tier_mismatch");
    }
  }

  for (const [userId, ownedSubscriptions] of Array.from(
    subscriptionsByUserId.entries()
  )) {
    if (!profilesByUserId.has(userId)) {
      record("subscription_without_business_profile");
    }
    if (ownedSubscriptions.length > 1) {
      record("duplicate_subscription_records");
    }
  }

  const issues: SubscriptionRecordHealthIssue[] = Array.from(issueCounts)
    .map(([kind, count]) => ({ kind, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.kind.localeCompare(right.kind)
    );

  return {
    checkedAt,
    profileCount: profiles.length,
    subscriptionRecordCount: subscriptions.length,
    issueCount: issues.reduce((total, issue) => total + issue.count, 0),
    healthy: issues.length === 0,
    issues,
  };
}
