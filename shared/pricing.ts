export const PAID_PLANS = ["monthly", "annual", "lifetime"] as const;

export type PaidPlan = (typeof PAID_PLANS)[number];

/** Confirmed Stripe catalog amounts in each currency's major unit. */
export const USD_PRICES = {
  monthly: 29,
  annual: 290,
  lifetime: 349,
} as const satisfies Record<PaidPlan, number>;

export const THB_PRICES = {
  monthly: 970,
  annual: 9_990,
  lifetime: 11_700,
} as const satisfies Record<PaidPlan, number>;

/** Confirmed Stripe catalog amounts in cents/satang for server calculations. */
export const USD_PRICE_CENTS = {
  monthly: 2_900,
  annual: 29_000,
  lifetime: 34_900,
} as const satisfies Record<PaidPlan, number>;

export const THB_PRICE_SATANG = {
  monthly: 97_000,
  annual: 999_000,
  lifetime: 1_170_000,
} as const satisfies Record<PaidPlan, number>;

export const USD_DISPLAY = {
  monthly: "$29",
  annual: "$290",
  lifetime: "$349",
} as const satisfies Record<PaidPlan, string>;

export const THB_DISPLAY = {
  monthly: "฿970",
  annual: "฿9,990",
  lifetime: "฿11,700",
} as const satisfies Record<PaidPlan, string>;

export const USD_ANNUAL_MONTHLY_EQUIVALENT = USD_PRICES.annual / 12;
export const USD_ANNUAL_SAVINGS = USD_PRICES.monthly * 12 - USD_PRICES.annual;
export const USD_ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - USD_PRICES.annual / (USD_PRICES.monthly * 12)) * 100
);
export const USD_LIFETIME_SAVINGS_BY_YEAR_TWO =
  USD_PRICES.monthly * 24 - USD_PRICES.lifetime;
export const USD_LIFETIME_PAYBACK_MONTHS = Math.ceil(
  USD_PRICES.lifetime / USD_PRICES.monthly
);

export const THB_ANNUAL_MONTHLY_EQUIVALENT = THB_PRICES.annual / 12;
export const THB_ANNUAL_SAVINGS = THB_PRICES.monthly * 12 - THB_PRICES.annual;
export const THB_ANNUAL_SAVINGS_PERCENT = Math.round(
  (1 - THB_PRICES.annual / (THB_PRICES.monthly * 12)) * 100
);
