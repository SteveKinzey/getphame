/**
 * Stripe integration for ReviewLink Pro subscriptions.
 *
 * Flow:
 * 1. User clicks "Upgrade to Pro" → frontend calls stripe.createCheckout
 * 2. Server creates a Stripe Checkout Session and returns the URL
 * 3. User completes payment on Stripe's hosted page
 * 4. Stripe sends checkout.session.completed webhook → we upgrade the user to Pro
 * 5. On cancellation, customer.subscription.deleted webhook → downgrade to Free
 */

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
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
