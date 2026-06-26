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
  lifetime: "price_1TOTniLryXlEZmjyMnmX9Qe7",
} as const;

export type StripePlan = keyof typeof STRIPE_PRICE_IDS;

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

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    // Lifetime is a one-time payment; monthly/annual are subscriptions
    mode: isLifetime ? "payment" : "subscription",
    allow_promotion_codes: true,
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
    success_url: `${origin}/payment-success`,
    cancel_url: `${origin}/upgrade`,
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

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: isLifetime ? "payment" : "subscription",
    currency: "thb",
    payment_method_types: ["card", "promptpay"],
    allow_promotion_codes: true,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      plan,
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/payment-success`,
    cancel_url: `${origin}/upgrade`,
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
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin}/settings`,
  });
  return session.url;
}
