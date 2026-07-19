/**
 * Stripe integration for Phame Pro subscriptions.
 *
 * Flow:
 * 1. User clicks "Upgrade to Pro" → frontend calls stripe.createCheckout
 * 2. Server creates a Stripe Checkout Session and returns the URL
 * 3. User completes payment on Stripe's hosted page
 * 4. Stripe sends checkout.session.completed webhook → we upgrade the user to Pro
 * 5. On cancellation, customer.subscription.deleted webhook → downgrade to Free
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-01-27.acacia",
    });
  }
  return _stripe;
}

// Lazily initialize Stripe on first use so the app can start without the key
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

/** Stripe Price IDs for each plan */
export const STRIPE_PRICE_IDS = {
  monthly:  "price_1TOTkwLryXlEZmjywwPjXYRn",
  annual:   "price_1TOTnALryXlEZmjy8JdDiu3P",
  lifetime: "price_1TqgstLryXlEZmjyrabUcDFl", // $497 one-time (updated Jul 2026)
} as const;

export type StripePlan = keyof typeof STRIPE_PRICE_IDS;

const CANONICAL_STRIPE_RETURN_ORIGIN = "https://getphame.app";
const CANONICAL_STRIPE_RETURN_HOSTS = new Set(["getphame.app", "www.getphame.app"]);
const GETPHAME_CHECKOUT_ICON_URL =
  "https://assets.getphame.app/getphame-logo-mark.webp";
const GETPHAME_CHECKOUT_BRANDING = {
  display_name: "Get Phame",
  icon: {
    type: "url" as const,
    url: GETPHAME_CHECKOUT_ICON_URL,
  },
  background_color: "#061A43",
  button_color: "#D4A017",
  font_family: "inter" as const,
  border_style: "rounded" as const,
};

/**
 * Checkout and Billing Portal redirect URLs must remain on the branded public
 * domain. Browser-supplied origins can be stale preview or legacy hosts, so
 * they are deliberately treated as hints rather than trusted redirect values.
 */
export function getStripeReturnOrigin(origin?: string): string {
  const candidates = [process.env.APP_BASE_URL, origin].filter(
    (candidate): candidate is string => Boolean(candidate?.trim()),
  );

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && CANONICAL_STRIPE_RETURN_HOSTS.has(url.hostname.toLowerCase())) {
        return CANONICAL_STRIPE_RETURN_ORIGIN;
      }
    } catch {
      // Ignore malformed configuration or browser origins and use the canonical fallback.
    }
  }

  return CANONICAL_STRIPE_RETURN_ORIGIN;
}

export const MONEY_BACK_GUARANTEE_DAYS = 7;
const MONEY_BACK_GUARANTEE_MS = MONEY_BACK_GUARANTEE_DAYS * 24 * 60 * 60 * 1000;

export type MoneyBackGuaranteeReason =
  | "eligible"
  | "already_refunded"
  | "expired"
  | "lifetime"
  | "no_subscription"
  | "unsupported_payment";

export type MoneyBackGuaranteeStatus = {
  eligible: boolean;
  reason: MoneyBackGuaranteeReason;
  purchasedAt: number | null;
  deadlineAt: number | null;
  amount: number | null;
  currency: string | null;
  alreadyRefunded: boolean;
};

type SubscriptionPaymentDetails = {
  subscriptionId: string;
  subscriptionStatus: string;
  chargeId: string;
  paymentIntentId: string | null;
  purchasedAt: number;
  amount: number;
  amountRefunded: number;
  currency: string;
};

function stripeResourceId(resource: unknown): string | null {
  if (typeof resource === "string") return resource;
  if (resource && typeof resource === "object" && "id" in resource && typeof resource.id === "string") {
    return resource.id;
  }
  return null;
}

async function getOwnedSubscriptionPayment(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
): Promise<SubscriptionPaymentDetails | null> {
  if (stripeSubscriptionId.startsWith("lifetime_")) return null;

  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["latest_invoice.payment_intent.latest_charge"],
  });
  const subscriptionCustomerId = stripeResourceId(subscription.customer);
  if (!subscriptionCustomerId || subscriptionCustomerId !== stripeCustomerId) {
    throw new Error("The Stripe subscription does not belong to this account.");
  }

  const rawSubscription = subscription as unknown as {
    id: string;
    status: string;
    created: number;
    latest_invoice?: string | {
      payment_intent?: string | {
        id: string;
        latest_charge?: string | Stripe.Charge | null;
      } | null;
    } | null;
  };
  let invoice = rawSubscription.latest_invoice;
  if (typeof invoice === "string") {
    invoice = await stripe.invoices.retrieve(invoice, {
      expand: ["payment_intent.latest_charge"],
    }) as unknown as typeof invoice;
  }

  const paymentIntent = typeof invoice === "object" && invoice ? invoice.payment_intent : null;
  const paymentIntentId = stripeResourceId(paymentIntent);
  let chargeId =
    typeof paymentIntent === "object" && paymentIntent
      ? stripeResourceId(paymentIntent.latest_charge)
      : null;

  if (!chargeId && paymentIntentId) {
    const charges = await stripe.charges.list({ payment_intent: paymentIntentId, limit: 10 });
    chargeId = charges.data.find((charge) => charge.paid && !charge.failure_code)?.id ?? null;
  }
  if (!chargeId) return null;

  const charge = await stripe.charges.retrieve(chargeId);
  const chargeCustomerId = stripeResourceId(charge.customer);
  if (!chargeCustomerId || chargeCustomerId !== stripeCustomerId) {
    throw new Error("The Stripe payment does not belong to this account.");
  }

  return {
    subscriptionId: rawSubscription.id,
    subscriptionStatus: rawSubscription.status,
    chargeId: charge.id,
    paymentIntentId,
    purchasedAt: rawSubscription.created * 1000,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
    currency: charge.currency,
  };
}

export async function getMoneyBackGuaranteeStatus({
  stripeCustomerId,
  stripeSubscriptionId,
  now = Date.now(),
}: {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  now?: number;
}): Promise<MoneyBackGuaranteeStatus> {
  if (!stripeCustomerId || !stripeSubscriptionId) {
    return {
      eligible: false,
      reason: "no_subscription",
      purchasedAt: null,
      deadlineAt: null,
      amount: null,
      currency: null,
      alreadyRefunded: false,
    };
  }
  if (stripeSubscriptionId.startsWith("lifetime_")) {
    return {
      eligible: false,
      reason: "lifetime",
      purchasedAt: null,
      deadlineAt: null,
      amount: null,
      currency: null,
      alreadyRefunded: false,
    };
  }

  const payment = await getOwnedSubscriptionPayment(stripeCustomerId, stripeSubscriptionId);
  if (!payment) {
    return {
      eligible: false,
      reason: "unsupported_payment",
      purchasedAt: null,
      deadlineAt: null,
      amount: null,
      currency: null,
      alreadyRefunded: false,
    };
  }

  const deadlineAt = payment.purchasedAt + MONEY_BACK_GUARANTEE_MS;
  const alreadyRefunded = payment.amountRefunded >= payment.amount;
  const eligible = !alreadyRefunded && now <= deadlineAt;
  return {
    eligible,
    reason: alreadyRefunded ? "already_refunded" : eligible ? "eligible" : "expired",
    purchasedAt: payment.purchasedAt,
    deadlineAt,
    amount: payment.amount,
    currency: payment.currency,
    alreadyRefunded,
  };
}

export async function claimMoneyBackGuarantee({
  userId,
  stripeCustomerId,
  stripeSubscriptionId,
  now = Date.now(),
}: {
  userId: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  now?: number;
}) {
  if (stripeSubscriptionId.startsWith("lifetime_")) {
    throw new Error("Lifetime purchases are not subscriptions and cannot use subscription cancellation.");
  }

  const payment = await getOwnedSubscriptionPayment(stripeCustomerId, stripeSubscriptionId);
  if (!payment) throw new Error("No refundable Stripe payment was found for this subscription.");
  const deadlineAt = payment.purchasedAt + MONEY_BACK_GUARANTEE_MS;
  if (payment.amountRefunded >= payment.amount) {
    const needsCancellation = payment.subscriptionStatus !== "canceled";
    if (needsCancellation) await stripe.subscriptions.cancel(stripeSubscriptionId);
    return {
      refunded: true,
      alreadyRefunded: true,
      canceled: needsCancellation,
      amount: payment.amount,
      currency: payment.currency,
      deadlineAt,
    };
  }
  if (now > deadlineAt) {
    throw new Error("The seven-day money-back guarantee has expired.");
  }

  const refund = await stripe.refunds.create(
    {
      charge: payment.chargeId,
      reason: "requested_by_customer",
      metadata: {
        user_id: String(userId),
        subscription_id: stripeSubscriptionId,
        guarantee: "seven_day_money_back",
      },
    },
    { idempotencyKey: `getphame-guarantee-${stripeSubscriptionId}-${payment.chargeId}` },
  );

  // Money moves first. The subscription is canceled only after Stripe accepts the refund.
  await stripe.subscriptions.cancel(stripeSubscriptionId);
  console.info("[StripeGuarantee] Full refund claimed", {
    userId,
    subscriptionId: stripeSubscriptionId,
    refundId: refund.id,
  });
  return {
    refunded: true,
    alreadyRefunded: false,
    canceled: true,
    amount: payment.amount,
    currency: payment.currency,
    deadlineAt,
  };
}

export async function cancelSubscriptionRenewal(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
) {
  if (stripeSubscriptionId.startsWith("lifetime_")) {
    throw new Error("Lifetime access does not renew and cannot be canceled as a subscription.");
  }
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  if (stripeResourceId(subscription.customer) !== stripeCustomerId) {
    throw new Error("The Stripe subscription does not belong to this account.");
  }
  const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
  const raw = updated as unknown as {
    current_period_end?: number;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEnd = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end ?? null;
  return {
    canceledAtPeriodEnd: true,
    currentPeriodEnd: periodEnd ? periodEnd * 1000 : null,
  };
}

/** Create a Stripe Checkout Session for the selected plan */
export async function createCheckoutSession({
  userId,
  userEmail,
  userName,
  stripeCustomerId,
  origin,
  plan = "monthly",
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
  plan?: StripePlan;
}): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[plan];
  const isLifetime = plan === "lifetime";
  const returnOrigin = getStripeReturnOrigin(origin);

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    // Lifetime is a one-time payment; monthly/annual are subscriptions
    mode: isLifetime ? "payment" : "subscription",
    allow_promotion_codes: true,
    branding_settings: GETPHAME_CHECKOUT_BRANDING,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      plan,
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${returnOrigin}/payment-success?stripe=1&plan=${plan}`,
    cancel_url: `${returnOrigin}/upgrade`,
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : userEmail
        ? { customer_email: userEmail }
        : {}),
  };

  const session = await stripe.checkout.sessions.create(params);
  return session.url!;
}

/**
 * THB Price IDs for PromptPay checkout (Thailand users).
 * These must be created in the Stripe Dashboard with currency=THB.
 * Set STRIPE_PRICE_IDS_THB_MONTHLY, _ANNUAL, _LIFETIME env vars to activate.
 */
// Read at call time (not module load) so tests can override env vars per-test
export function getThbPriceIds() {
  return {
    monthly:  process.env.STRIPE_PRICE_ID_THB_MONTHLY ?? "",
    annual:   process.env.STRIPE_PRICE_ID_THB_ANNUAL ?? "",
    lifetime: process.env.STRIPE_PRICE_ID_THB_LIFETIME ?? "",
  };
}

/**
 * Create a Stripe Checkout Session in THB with PromptPay enabled.
 * Requires THB-denominated Price IDs set via env vars.
 * PromptPay must be enabled in Stripe Dashboard → Settings → Payment methods.
 */
export async function createThbCheckoutSession({
  userId,
  userEmail,
  userName,
  stripeCustomerId,
  origin,
  plan = "monthly",
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
  plan?: StripePlan;
}): Promise<string> {
  const priceId = getThbPriceIds()[plan];
  if (!priceId) {
    throw new Error(`THB price ID not configured for plan: ${plan}. Set STRIPE_PRICE_ID_THB_${plan.toUpperCase()} env var.`);
  }
  const isLifetime = plan === "lifetime";
  const returnOrigin = getStripeReturnOrigin(origin);

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: isLifetime ? "payment" : "subscription",
    currency: "thb",
    payment_method_types: ["card", "promptpay"],
    allow_promotion_codes: true,
    branding_settings: GETPHAME_CHECKOUT_BRANDING,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      plan,
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnOrigin}/payment-success?stripe=1&plan=${plan}`,
    cancel_url: `${returnOrigin}/upgrade`,
    ...(stripeCustomerId
      ? { customer: stripeCustomerId }
      : userEmail
        ? { customer_email: userEmail }
        : {}),
  };

  const session = await stripe.checkout.sessions.create(params);
  return session.url!;
}

/** Create a Stripe Customer Portal session for managing billing */
export async function createPortalSession(
  stripeCustomerId: string,
  origin: string
): Promise<string> {
  const returnOrigin = getStripeReturnOrigin(origin);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${returnOrigin}/settings`,
  });
  return session.url;
}

/** Fetch current billing state directly from Stripe for account-status UI. */
export async function getSubscriptionSnapshot(subscriptionId: string) {
  if (subscriptionId.startsWith("lifetime_")) {
    return { status: "lifetime", currentPeriodEnd: null, cancelAtPeriodEnd: false };
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const raw = subscription as unknown as {
    status: string;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    items?: { data?: Array<{ current_period_end?: number }> };
  };
  const periodEnd = raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end ?? null;
  return {
    status: raw.status,
    currentPeriodEnd: periodEnd ? periodEnd * 1000 : null,
    cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
  };
}
