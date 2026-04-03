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

/** The Pro plan price — $29/month recurring */
export const PRO_PRICE = {
  amount: 2900, // cents
  currency: "usd",
  interval: "month" as const,
  name: "ReviewLink Pro",
  description: "Unlimited review requests, priority sending, advanced analytics",
};

/** Create a Stripe Checkout Session for the Pro subscription */
export async function createCheckoutSession({
  userId,
  userEmail,
  userName,
  stripeCustomerId,
  origin,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
}): Promise<string> {
  const params = {
    mode: "subscription" as const,
    allow_promotion_codes: true,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
    },
    line_items: [
      {
        price: "price_1TI4UjLsFTLV3eoVDtB7m34H",
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
