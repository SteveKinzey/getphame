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
  lifetime: "price_1TqgstLryXlEZmjyrabUcDFl", // $349 one-time
} as const;

export type StripePlan = keyof typeof STRIPE_PRICE_IDS;

const PROMOTION_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;
const PROMOTION_CODE_CREATE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,63}$/;
export const STRIPE_PROMOTION_MAX_REDEMPTIONS = 100_000;
export const STRIPE_PROMOTION_MAX_EXPIRY_MS = 5 * 365 * 24 * 60 * 60 * 1000;

export type StripePromotionStatus = "active" | "inactive" | "expired" | "redeemed";

export type StripePromotionSnapshot = {
  id: string;
  code: string;
  status: StripePromotionStatus;
  discountLabel: string;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: number | null;
  applicablePlans: StripePlan[];
  firstTimeTransaction: boolean;
  customerId: string | null;
  createdAt: number;
};

type PromotionCoupon = {
  id: string;
  percent_off?: number | null;
  amount_off?: number | null;
  currency?: string | null;
  applies_to?: { products?: string[] } | null;
};

type PromotionCodeDetails = {
  id: string;
  code?: string | null;
  active: boolean;
  coupon?: PromotionCoupon | string | null;
  promotion?: { coupon?: PromotionCoupon | string | null } | null;
  times_redeemed: number;
  max_redemptions?: number | null;
  expires_at?: number | null;
  restrictions?: {
    first_time_transaction?: boolean;
    minimum_amount?: number | null;
    minimum_amount_currency?: string | null;
  } | null;
  customer?: string | { id: string } | null;
  created: number;
};

/** Normalize only safe, portable campaign code values before any Stripe lookup. */
export function normalizePromotionCode(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return PROMOTION_CODE_PATTERN.test(normalized) ? normalized : null;
}

async function getPromotionCoupon(promotionCode: PromotionCodeDetails): Promise<PromotionCoupon> {
  const couponReference = promotionCode.promotion?.coupon ?? promotionCode.coupon;
  if (!couponReference) throw new Error("Stripe promotion code does not reference a coupon.");
  if (typeof couponReference !== "string") return couponReference;
  return stripe.coupons.retrieve(couponReference) as Promise<PromotionCoupon>;
}

function promotionDiscountLabel(coupon: PromotionCoupon): string {
  if (coupon.percent_off != null) return `${coupon.percent_off}% off`;
  if (coupon.amount_off != null) {
    const currency = coupon.currency?.toUpperCase() ?? "";
    return `${(coupon.amount_off / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency} off`.trim();
  }
  return "Discount";
}

function promotionStatus(promotionCode: PromotionCodeDetails): StripePromotionStatus {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!promotionCode.active) return "inactive";
  if (promotionCode.expires_at && promotionCode.expires_at <= nowSeconds) return "expired";
  if (promotionCode.max_redemptions != null && promotionCode.times_redeemed >= promotionCode.max_redemptions) {
    return "redeemed";
  }
  return "active";
}

async function getPlanProductIds(): Promise<Record<StripePlan, string | null>> {
  const plans = Object.keys(STRIPE_PRICE_IDS) as StripePlan[];
  const prices = await Promise.all(plans.map((plan) => stripe.prices.retrieve(STRIPE_PRICE_IDS[plan])));
  return Object.fromEntries(
    prices.map((price, index) => [plans[index], stripeResourceId(price.product)]),
  ) as Record<StripePlan, string | null>;
}

function getApplicablePlans(coupon: PromotionCoupon, planProductIds: Record<StripePlan, string | null>): StripePlan[] {
  const allowedProductIds = coupon.applies_to?.products ?? [];
  const plans = Object.keys(STRIPE_PRICE_IDS) as StripePlan[];
  if (allowedProductIds.length === 0) return plans;
  return plans.filter((plan) => {
    const productId = planProductIds[plan];
    return productId !== null && allowedProductIds.includes(productId);
  });
}

/** Return a concise live snapshot for the admin-only promotion monitor. */
export async function listStripePromotionCodes(): Promise<{
  promotions: StripePromotionSnapshot[];
  hasMore: boolean;
  refreshedAt: number;
}> {
  const [result, planProductIds] = await Promise.all([
    stripe.promotionCodes.list({ limit: 100 }),
    getPlanProductIds(),
  ]);

  const promotions = await Promise.all(
    result.data.map(async (rawPromotionCode) => {
      const promotionCode = rawPromotionCode as unknown as PromotionCodeDetails;
      const coupon = await getPromotionCoupon(promotionCode);
      return {
        id: promotionCode.id,
        code: promotionCode.code ?? promotionCode.id,
        status: promotionStatus(promotionCode),
        discountLabel: promotionDiscountLabel(coupon),
        timesRedeemed: promotionCode.times_redeemed,
        maxRedemptions: promotionCode.max_redemptions ?? null,
        expiresAt: promotionCode.expires_at ? promotionCode.expires_at * 1000 : null,
        applicablePlans: getApplicablePlans(coupon, planProductIds),
        firstTimeTransaction: Boolean(promotionCode.restrictions?.first_time_transaction),
        customerId: stripeResourceId(promotionCode.customer),
        createdAt: promotionCode.created * 1000,
      } satisfies StripePromotionSnapshot;
    }),
  );

  return { promotions, hasMore: result.has_more, refreshedAt: Date.now() };
}

export type CreateStripePromotionCodeInput = {
  code: string;
  percentOff: number;
  applicablePlans: StripePlan[];
  firstTimeTransaction?: boolean;
  expiresAt?: number | null;
  maxRedemptions?: number | null;
  createdByUserId: number;
};

/**
 * Create a one-invoice/transaction Stripe promotion code for selected Get Phame
 * products. Stripe remains the sole source of truth; no coupon mirror is stored.
 */
export async function createStripePromotionCode(
  input: CreateStripePromotionCodeInput,
): Promise<StripePromotionSnapshot> {
  const code = input.code.trim().toUpperCase();
  if (!PROMOTION_CODE_CREATE_PATTERN.test(code)) {
    throw new Error("Promotion codes must contain 3–64 letters, numbers, or dashes and begin with a letter or number.");
  }
  if (!Number.isFinite(input.percentOff) || input.percentOff <= 0 || input.percentOff > 100) {
    throw new Error("Percentage off must be greater than 0 and no more than 100.");
  }

  const applicablePlans = Array.from(new Set(input.applicablePlans));
  const validPlans = new Set<StripePlan>(Object.keys(STRIPE_PRICE_IDS) as StripePlan[]);
  if (applicablePlans.length === 0 || applicablePlans.some((plan) => !validPlans.has(plan))) {
    throw new Error("Select at least one valid Get Phame plan.");
  }
  if (input.maxRedemptions != null && (
    !Number.isInteger(input.maxRedemptions)
    || input.maxRedemptions < 1
    || input.maxRedemptions > STRIPE_PROMOTION_MAX_REDEMPTIONS
  )) {
    throw new Error(`Maximum redemptions must be between 1 and ${STRIPE_PROMOTION_MAX_REDEMPTIONS}.`);
  }

  const now = Date.now();
  if (input.expiresAt != null && (
    !Number.isFinite(input.expiresAt)
    || input.expiresAt < now + 5 * 60 * 1000
    || input.expiresAt > now + STRIPE_PROMOTION_MAX_EXPIRY_MS
  )) {
    throw new Error("Expiration must be at least 5 minutes and no more than 5 years in the future.");
  }

  const duplicateCheck = await stripe.promotionCodes.list({ code, limit: 100 });
  if (duplicateCheck.data.some((item) => item.code.toUpperCase() === code)) {
    throw new Error("A Stripe promotion code with this code already exists.");
  }

  const planProductIds = await getPlanProductIds();
  const productIds = applicablePlans.map((plan) => planProductIds[plan]);
  if (productIds.some((productId) => !productId)) {
    throw new Error("A selected Stripe plan is not linked to a valid product.");
  }

  let coupon: PromotionCoupon | null = null;
  try {
    coupon = await stripe.coupons.create({
      percent_off: input.percentOff,
      duration: "once",
      applies_to: { products: productIds as string[] },
      name: `Get Phame ${code}`,
      metadata: {
        source: "get_phame_admin",
        created_by_user_id: String(input.createdByUserId),
        applicable_plans: applicablePlans.join(","),
        discount_duration: "once",
      },
    }) as PromotionCoupon;

    // This project intentionally pins Stripe's 2025-01-27 Acacia API, whose
    // promotion-code request uses the legacy top-level coupon parameter.
    const createParams = {
      coupon: coupon.id,
      code,
      active: true,
      ...(input.expiresAt != null ? { expires_at: Math.floor(input.expiresAt / 1000) } : {}),
      ...(input.maxRedemptions != null ? { max_redemptions: input.maxRedemptions } : {}),
      ...(input.firstTimeTransaction ? { restrictions: { first_time_transaction: true } } : {}),
      metadata: {
        source: "get_phame_admin",
        created_by_user_id: String(input.createdByUserId),
        applicable_plans: applicablePlans.join(","),
      },
    } as unknown as Stripe.PromotionCodeCreateParams;
    const created = await stripe.promotionCodes.create(createParams) as unknown as PromotionCodeDetails;

    return {
      id: created.id,
      code: created.code ?? code,
      status: promotionStatus(created),
      discountLabel: promotionDiscountLabel(coupon),
      timesRedeemed: created.times_redeemed,
      maxRedemptions: created.max_redemptions ?? null,
      expiresAt: created.expires_at ? created.expires_at * 1000 : null,
      applicablePlans,
      firstTimeTransaction: Boolean(created.restrictions?.first_time_transaction),
      customerId: stripeResourceId(created.customer),
      createdAt: created.created * 1000,
    };
  } catch (error) {
    if (coupon) {
      await stripe.coupons.del(coupon.id).catch(() => {
        console.warn(`[Stripe] Could not clean up unused coupon ${coupon?.id}.`);
      });
    }
    throw error;
  }
}

/**
 * Resolve a campaign URL's code to Stripe's immutable promotion-code ID.
 * The browser never controls the discount amount, coupon, price, or eligibility.
 */
export async function resolvePromotionCodeForCheckout({
  code,
  priceId,
  stripeCustomerId,
}: {
  code: string;
  priceId: string;
  stripeCustomerId: string | null;
}): Promise<{ id: string; code: string }> {
  const normalizedCode = normalizePromotionCode(code);
  if (!normalizedCode) {
    throw new Error("Promotion code format is invalid.");
  }

  const result = await stripe.promotionCodes.list({
    code: normalizedCode,
    active: true,
    limit: 10,
  });
  const promotionCode = result.data
    .map((item) => item as unknown as PromotionCodeDetails)
    .find((item) => item.code?.toUpperCase() === normalizedCode && promotionStatus(item) === "active");

  if (!promotionCode) {
    throw new Error("This promotion code is invalid, expired, or fully redeemed.");
  }

  const restrictedCustomerId = stripeResourceId(promotionCode.customer);
  if (restrictedCustomerId && restrictedCustomerId !== stripeCustomerId) {
    throw new Error("This promotion code is not available for this account.");
  }

  const [coupon, price] = await Promise.all([
    getPromotionCoupon(promotionCode),
    stripe.prices.retrieve(priceId),
  ]);
  const allowedProductIds = coupon.applies_to?.products ?? [];
  const productId = stripeResourceId(price.product);
  if (allowedProductIds.length > 0 && (!productId || !allowedProductIds.includes(productId))) {
    throw new Error("This promotion code does not apply to the selected plan.");
  }

  return { id: promotionCode.id, code: normalizedCode };
}

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
  promotionCode = null,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
  plan?: StripePlan;
  promotionCode?: string | null;
}): Promise<string> {
  const priceId = STRIPE_PRICE_IDS[plan];
  const isLifetime = plan === "lifetime";
  const returnOrigin = getStripeReturnOrigin(origin);
  const campaignPromotion = promotionCode
    ? await resolvePromotionCodeForCheckout({ code: promotionCode, priceId, stripeCustomerId })
    : null;
  const cancelUrl = `${returnOrigin}/upgrade${campaignPromotion ? `?promo=${encodeURIComponent(campaignPromotion.code)}` : ""}`;

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    // Lifetime is a one-time payment; monthly/annual are subscriptions
    mode: isLifetime ? "payment" : "subscription",
    ...(campaignPromotion
      ? { discounts: [{ promotion_code: campaignPromotion.id }] }
      : { allow_promotion_codes: true }),
    branding_settings: GETPHAME_CHECKOUT_BRANDING,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      plan,
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
      ...(campaignPromotion ? { promotion_code: campaignPromotion.code } : {}),
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${returnOrigin}/payment-success?stripe=1&plan=${plan}`,
    cancel_url: cancelUrl,
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
  promotionCode = null,
}: {
  userId: number;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string | null;
  origin: string;
  plan?: StripePlan;
  promotionCode?: string | null;
}): Promise<string> {
  const priceId = getThbPriceIds()[plan];
  if (!priceId) {
    throw new Error(`THB price ID not configured for plan: ${plan}. Set STRIPE_PRICE_ID_THB_${plan.toUpperCase()} env var.`);
  }
  const isLifetime = plan === "lifetime";
  const returnOrigin = getStripeReturnOrigin(origin);
  const campaignPromotion = promotionCode
    ? await resolvePromotionCodeForCheckout({ code: promotionCode, priceId, stripeCustomerId })
    : null;
  const cancelUrl = `${returnOrigin}/upgrade${campaignPromotion ? `?promo=${encodeURIComponent(campaignPromotion.code)}` : ""}`;

  const params: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: isLifetime ? "payment" : "subscription",
    currency: "thb",
    payment_method_types: ["card", "promptpay"],
    ...(campaignPromotion
      ? { discounts: [{ promotion_code: campaignPromotion.id }] }
      : { allow_promotion_codes: true }),
    branding_settings: GETPHAME_CHECKOUT_BRANDING,
    client_reference_id: String(userId),
    metadata: {
      user_id: String(userId),
      plan,
      customer_email: userEmail ?? "",
      customer_name: userName ?? "",
      ...(campaignPromotion ? { promotion_code: campaignPromotion.code } : {}),
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnOrigin}/payment-success?stripe=1&plan=${plan}`,
    cancel_url: cancelUrl,
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
