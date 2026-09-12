import type Stripe from "stripe";
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  businessProfiles,
  stripeLifecycleEmails,
  stripeLifecycleSchedulers,
  stripeSubscriptions,
  stripeWebhookEvents,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { stripe, type StripePlan } from "./stripe";
import {
  isLifecycleLocale,
  type LifecycleLocale,
} from "@shared/lifecycleLocale";
import type { SubscriptionLifecycleEmailKind } from "./subscriptionLifecycleEmail";

export const STRIPE_LIFECYCLE_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.trial_will_end",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type StripeLifecycleEventType =
  (typeof STRIPE_LIFECYCLE_EVENT_TYPES)[number];
const allowedEventTypes = new Set<string>(STRIPE_LIFECYCLE_EVENT_TYPES);
const EVENT_CLAIM_MS = 5 * 60_000;
const SCHEDULER_KEY = "global";
export const STRIPE_LIFECYCLE_CRON = "0 */5 * * * *";

const terminalStatuses = new Set([
  "paused",
  "canceled",
  "unpaid",
  "incomplete_expired",
]);

export type CanonicalSubscription = {
  id: string;
  customerId: string | null;
  userId: number;
  plan: Exclude<StripePlan, "lifetime">;
  locale: LifecycleLocale;
  status: string;
  trialEndsAt: number | null;
  currentPeriodEndsAt: number | null;
  cancelAtPeriodEnd: boolean;
  hasCollectedPayment: boolean;
};

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    return Number(
      (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
    );
  }
  return Number(
    (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
}

function resourceId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function finiteStripeDate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value * 1000
    : null;
}

function parseMetadata(metadata: Stripe.Metadata | null | undefined): {
  userId: number;
  plan: StripePlan;
  locale: LifecycleLocale;
} {
  const userId = Number.parseInt(metadata?.getphame_user_id ?? "", 10);
  const plan = metadata?.getphame_plan;
  const locale = metadata?.getphame_locale;
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("STRIPE_METADATA_USER_INVALID");
  }
  if (plan !== "monthly" && plan !== "annual" && plan !== "lifetime") {
    throw new Error("STRIPE_METADATA_PLAN_INVALID");
  }
  if (!isLifecycleLocale(locale)) {
    throw new Error("STRIPE_METADATA_LOCALE_INVALID");
  }
  return { userId, plan, locale };
}

export function subscriptionIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>;
  if (event.type.startsWith("customer.subscription."))
    return resourceId(object);
  if (event.type === "checkout.session.completed") {
    return resourceId(object.subscription);
  }
  if (event.type.startsWith("invoice.")) {
    return (
      resourceId(object.subscription) ??
      resourceId(
        (
          object.parent as {
            subscription_details?: { subscription?: unknown };
          } | null
        )?.subscription_details?.subscription
      )
    );
  }
  return null;
}

export function lifecycleObjectId(event: Stripe.Event): string {
  return resourceId(event.data.object) ?? "unknown";
}

export function deriveEntitlement(subscription: CanonicalSubscription): {
  tier: "free" | "pro" | "annual";
  planExpiresAt: number | null;
  terminal: boolean;
} {
  if (terminalStatuses.has(subscription.status)) {
    return { tier: "free", planExpiresAt: null, terminal: true };
  }
  const tier = subscription.plan === "annual" ? "annual" : "pro";
  if (subscription.status === "trialing") {
    if (!subscription.trialEndsAt) throw new Error("TRIAL_END_MISSING");
    return { tier, planExpiresAt: subscription.trialEndsAt, terminal: false };
  }
  if (["active", "past_due", "incomplete"].includes(subscription.status)) {
    if (!subscription.currentPeriodEndsAt) {
      throw new Error("CURRENT_PERIOD_END_MISSING");
    }
    return {
      tier,
      planExpiresAt: subscription.currentPeriodEndsAt,
      terminal: false,
    };
  }
  return { tier: "free", planExpiresAt: null, terminal: false };
}

export function shouldScheduleTrialEnding(
  subscription: CanonicalSubscription,
  now = Date.now()
): boolean {
  return (
    subscription.status === "trialing" &&
    subscription.trialEndsAt !== null &&
    subscription.trialEndsAt > now &&
    !subscription.hasCollectedPayment
  );
}

export function shouldSchedulePaymentAction(
  subscription: CanonicalSubscription
): boolean {
  return ["past_due", "incomplete"].includes(subscription.status);
}

async function retrieveCanonicalSubscription(
  subscriptionId: string
): Promise<CanonicalSubscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });
  const raw = subscription as unknown as {
    id: string;
    customer?: unknown;
    status: string;
    metadata?: Stripe.Metadata;
    trial_end?: number | null;
    current_period_end?: number;
    cancel_at_period_end?: boolean;
    items?: { data?: Array<{ current_period_end?: number }> };
    latest_invoice?:
      | string
      | {
          paid?: boolean;
          status?: string | null;
          amount_paid?: number;
        }
      | null;
  };
  const metadata = parseMetadata(raw.metadata);
  if (metadata.plan === "lifetime") {
    throw new Error("RECURRING_PLAN_INVALID");
  }
  const recurringPlan: "monthly" | "annual" = metadata.plan;
  const currentPeriodEnd =
    raw.current_period_end ?? raw.items?.data?.[0]?.current_period_end;
  const latestInvoice =
    raw.latest_invoice && typeof raw.latest_invoice === "object"
      ? raw.latest_invoice
      : null;
  return {
    id: raw.id,
    customerId: resourceId(raw.customer),
    userId: metadata.userId,
    plan: recurringPlan,
    locale: metadata.locale,
    status: raw.status,
    trialEndsAt: finiteStripeDate(raw.trial_end),
    currentPeriodEndsAt: finiteStripeDate(currentPeriodEnd),
    cancelAtPeriodEnd: Boolean(raw.cancel_at_period_end),
    hasCollectedPayment: Boolean(
      latestInvoice &&
        (latestInvoice.paid || latestInvoice.status === "paid") &&
        (latestInvoice.amount_paid ?? 0) > 0
    ),
  };
}

async function claimStripeEvent(event: Stripe.Event, now: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const find = async () => {
    const [row] = await db
      .select()
      .from(stripeWebhookEvents)
      .where(eq(stripeWebhookEvents.stripeEventId, event.id))
      .limit(1);
    return row ?? null;
  };
  const existing = await find();
  if (existing) {
    if (existing.status === "processed") return { claimed: false as const };
    if (
      existing.status === "processing" &&
      existing.claimExpiresAt !== null &&
      existing.claimExpiresAt > now
    ) {
      return { claimed: false as const };
    }
    const result = await db
      .update(stripeWebhookEvents)
      .set({
        status: "processing",
        claimExpiresAt: now + EVENT_CLAIM_MS,
        errorCode: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(stripeWebhookEvents.id, existing.id),
          eq(stripeWebhookEvents.status, existing.status),
          existing.claimExpiresAt === null
            ? isNull(stripeWebhookEvents.claimExpiresAt)
            : eq(stripeWebhookEvents.claimExpiresAt, existing.claimExpiresAt)
        )
      );
    return { claimed: getAffectedRows(result) === 1 } as const;
  }
  try {
    await db.insert(stripeWebhookEvents).values({
      stripeEventId: event.id,
      eventType: event.type.slice(0, 80),
      objectId: lifecycleObjectId(event).slice(0, 191),
      status: "processing",
      claimExpiresAt: now + EVENT_CLAIM_MS,
      receivedAt: now,
      updatedAt: now,
    });
    return { claimed: true as const };
  } catch {
    const raced = await find();
    if (raced) return { claimed: false as const };
    throw new Error("EVENT_CLAIM_FAILED");
  }
}

async function markStripeEventFailed(eventId: string, errorCode: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(stripeWebhookEvents)
    .set({
      status: "failed",
      claimExpiresAt: null,
      errorCode: errorCode.slice(0, 64),
      updatedAt: Date.now(),
    })
    .where(
      and(
        eq(stripeWebhookEvents.stripeEventId, eventId),
        eq(stripeWebhookEvents.status, "processing")
      )
    );
}

function stableProcessingError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const allowed = [
    "STRIPE_METADATA_USER_INVALID",
    "STRIPE_METADATA_PLAN_INVALID",
    "STRIPE_METADATA_LOCALE_INVALID",
    "RECURRING_PLAN_INVALID",
    "TRIAL_END_MISSING",
    "CURRENT_PERIOD_END_MISSING",
    "SUBSCRIPTION_REFERENCE_MISSING",
    "CHECKOUT_METADATA_MISMATCH",
    "LIFETIME_PAYMENT_REFERENCE_MISSING",
  ];
  return allowed.includes(message) ? message : "LIFECYCLE_PROCESSING_FAILED";
}

async function cancelPendingOutbox(tx: any, subscriptionId: string) {
  await tx
    .update(stripeLifecycleEmails)
    .set({ state: "cancelled", updatedAt: Date.now() })
    .where(
      and(
        eq(stripeLifecycleEmails.stripeSubscriptionId, subscriptionId),
        eq(stripeLifecycleEmails.state, "pending")
      )
    );
}

async function enqueueLifecycleEmail(
  tx: any,
  input: {
    userId: number;
    stripeSubscriptionId: string;
    stripeInvoiceId?: string | null;
    sequenceKey: string;
    kind: SubscriptionLifecycleEmailKind;
    locale: LifecycleLocale;
    scheduledAt: number;
  }
) {
  const now = Date.now();
  await tx
    .insert(stripeLifecycleEmails)
    .values({
      ...input,
      stripeInvoiceId: input.stripeInvoiceId ?? null,
      state: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: now } });
}

async function reconcileCanonicalSubscription(
  tx: any,
  subscription: CanonicalSubscription
) {
  const entitlement = deriveEntitlement(subscription);
  const [profile] = await tx
    .select({ tier: businessProfiles.tier })
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, subscription.userId))
    .limit(1);
  if (!profile) throw new Error("PROFILE_NOT_FOUND");

  const isLifetime = profile.tier === "lifetime";
  await tx
    .insert(stripeSubscriptions)
    .values({
      userId: subscription.userId,
      stripeSubscriptionId: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    })
    .onDuplicateKeyUpdate({
      set: {
        userId: subscription.userId,
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEndsAt: subscription.currentPeriodEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    });

  await tx
    .update(businessProfiles)
    .set({
      ...(subscription.customerId
        ? { stripeCustomerId: subscription.customerId }
        : {}),
      lifecycleLocale: subscription.locale,
      ...(isLifetime
        ? {}
        : {
            tier: entitlement.tier,
            planExpiresAt: entitlement.planExpiresAt,
          }),
      updatedAt: new Date(),
    })
    .where(eq(businessProfiles.userId, subscription.userId));
  return { entitlement, isLifetime };
}

async function processLifetimeCheckout(tx: any, event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = parseMetadata(session.metadata);
  if (metadata.plan !== "lifetime" || session.mode !== "payment") return false;
  const paymentIntentId = resourceId(session.payment_intent);
  if (!paymentIntentId) throw new Error("LIFETIME_PAYMENT_REFERENCE_MISSING");
  const customerId = resourceId(session.customer);
  await tx
    .update(businessProfiles)
    .set({
      tier: "lifetime",
      planExpiresAt: null,
      lifecycleLocale: metadata.locale,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(businessProfiles.userId, metadata.userId));
  await tx
    .insert(stripeSubscriptions)
    .values({
      userId: metadata.userId,
      stripeSubscriptionId: `lifetime_${paymentIntentId}`,
      plan: "lifetime",
      status: "lifetime",
      trialEndsAt: null,
      currentPeriodEndsAt: null,
      cancelAtPeriodEnd: false,
    })
    .onDuplicateKeyUpdate({
      set: {
        stripeSubscriptionId: `lifetime_${paymentIntentId}`,
        plan: "lifetime",
        status: "lifetime",
        trialEndsAt: null,
        currentPeriodEndsAt: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
    });
  return true;
}

export async function processStripeLifecycleEvent(event: Stripe.Event) {
  if (!allowedEventTypes.has(event.type)) return { status: "ignored" as const };
  const now = Date.now();
  const claim = await claimStripeEvent(event, now);
  if (!claim.claimed) return { status: "replayed" as const };

  try {
    let subscription: CanonicalSubscription | null = null;
    const subscriptionId = subscriptionIdFromEvent(event);
    if (subscriptionId) {
      subscription = await retrieveCanonicalSubscription(subscriptionId);
    } else if (event.type !== "checkout.session.completed") {
      throw new Error("SUBSCRIPTION_REFERENCE_MISSING");
    }

    if (event.type === "checkout.session.completed" && subscription) {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionMetadata = parseMetadata(session.metadata);
      if (
        sessionMetadata.userId !== subscription.userId ||
        sessionMetadata.plan !== subscription.plan ||
        sessionMetadata.locale !== subscription.locale
      ) {
        throw new Error("CHECKOUT_METADATA_MISMATCH");
      }
    }

    const db = await getDb();
    if (!db) throw new Error("DATABASE_UNAVAILABLE");
    await db.transaction(async tx => {
      if (event.type === "checkout.session.completed" && !subscription) {
        const session = event.data.object as Stripe.Checkout.Session;
        const lifetimeProcessed = await processLifetimeCheckout(tx, event);
        if (!lifetimeProcessed && session.mode === "subscription") {
          throw new Error("SUBSCRIPTION_REFERENCE_MISSING");
        }
      }

      if (subscription) {
        const { entitlement, isLifetime } =
          await reconcileCanonicalSubscription(tx, subscription);
        const activeOrPaid =
          subscription.status === "active" ||
          event.type === "invoice.paid" ||
          event.type === "customer.subscription.resumed";
        if (activeOrPaid) await cancelPendingOutbox(tx, subscription.id);

        if (
          event.type === "customer.subscription.trial_will_end" &&
          !isLifetime &&
          shouldScheduleTrialEnding(subscription, now)
        ) {
          await enqueueLifecycleEmail(tx, {
            userId: subscription.userId,
            stripeSubscriptionId: subscription.id,
            sequenceKey: `trial_will_end:${subscription.trialEndsAt}`,
            kind: "trial-ending",
            locale: subscription.locale,
            scheduledAt: now,
          });
        }

        if (
          event.type === "invoice.payment_failed" &&
          !isLifetime &&
          shouldSchedulePaymentAction(subscription)
        ) {
          const invoiceId = lifecycleObjectId(event);
          if (invoiceId !== "unknown") {
            await enqueueLifecycleEmail(tx, {
              userId: subscription.userId,
              stripeSubscriptionId: subscription.id,
              stripeInvoiceId: invoiceId,
              sequenceKey: `payment_failed:${invoiceId}`,
              kind: "payment-action",
              locale: subscription.locale,
              scheduledAt: now,
            });
          }
        }

        const terminalEvent =
          entitlement.terminal &&
          (event.type === "customer.subscription.deleted" ||
            event.type === "customer.subscription.paused" ||
            event.type === "customer.subscription.updated");
        if (terminalEvent && !isLifetime) {
          await cancelPendingOutbox(tx, subscription.id);
          await enqueueLifecycleEmail(tx, {
            userId: subscription.userId,
            stripeSubscriptionId: subscription.id,
            sequenceKey: `terminal:${subscription.id}`,
            kind: "subscription-ended",
            locale: subscription.locale,
            scheduledAt: now,
          });
        }
      }

      await tx
        .update(stripeWebhookEvents)
        .set({
          status: "processed",
          claimExpiresAt: null,
          errorCode: null,
          processedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(stripeWebhookEvents.stripeEventId, event.id),
            eq(stripeWebhookEvents.status, "processing")
          )
        );
    });
    return { status: "processed" as const };
  } catch (error) {
    await markStripeEventFailed(event.id, stableProcessingError(error)).catch(
      () => undefined
    );
    throw error;
  }
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string" || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: "invalid-webhook" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    console.warn("[StripeLifecycle] Webhook signature rejected.");
    return res.status(400).json({ error: "invalid-webhook" });
  }

  if (event.id.startsWith("evt_test_")) return res.json({ verified: true });
  try {
    await processStripeLifecycleEvent(event);
    return res.json({ received: true });
  } catch (error) {
    console.error("[StripeLifecycle] Durable processing failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return res.status(500).json({ error: "webhook-processing-failed" });
  }
}

export async function claimDueLifecycleEmail(now = Date.now()) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [candidate] = await db
    .select()
    .from(stripeLifecycleEmails)
    .where(
      and(
        eq(stripeLifecycleEmails.state, "pending"),
        lte(stripeLifecycleEmails.scheduledAt, now)
      )
    )
    .orderBy(
      asc(stripeLifecycleEmails.scheduledAt),
      asc(stripeLifecycleEmails.id)
    )
    .limit(1);
  if (!candidate) return null;
  const result = await db
    .update(stripeLifecycleEmails)
    .set({ state: "attempted", attemptedAt: now, updatedAt: now })
    .where(
      and(
        eq(stripeLifecycleEmails.id, candidate.id),
        eq(stripeLifecycleEmails.state, "pending")
      )
    );
  return getAffectedRows(result) === 1
    ? { ...candidate, state: "attempted" as const, attemptedAt: now }
    : null;
}

export async function getLifecycleEmailContext(outboxId: number) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [row] = await db
    .select({
      outbox: stripeLifecycleEmails,
      email: users.email,
      accountName: users.name,
      businessName: businessProfiles.businessName,
    })
    .from(stripeLifecycleEmails)
    .innerJoin(users, eq(users.id, stripeLifecycleEmails.userId))
    .leftJoin(
      businessProfiles,
      eq(businessProfiles.userId, stripeLifecycleEmails.userId)
    )
    .where(eq(stripeLifecycleEmails.id, outboxId))
    .limit(1);
  return row ?? null;
}

export async function finishLifecycleEmail(input: {
  outboxId: number;
  state: "sent" | "failed";
  provider?: string | null;
  providerMessageId?: string | null;
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const now = input.now ?? Date.now();
  await db
    .update(stripeLifecycleEmails)
    .set({
      state: input.state,
      provider: input.provider?.slice(0, 32) ?? null,
      providerMessageId: input.providerMessageId?.slice(0, 191) ?? null,
      errorCode: input.errorCode?.slice(0, 64) ?? null,
      sentAt: input.state === "sent" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(stripeLifecycleEmails.id, input.outboxId),
        eq(stripeLifecycleEmails.state, "attempted")
      )
    );
}

export async function getStripeLifecycleScheduler() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(stripeLifecycleSchedulers)
    .where(eq(stripeLifecycleSchedulers.scheduleKey, SCHEDULER_KEY))
    .limit(1);
  return row ?? null;
}

export async function getStripeLifecycleSchedulerByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(stripeLifecycleSchedulers)
    .where(eq(stripeLifecycleSchedulers.scheduleCronTaskUid, taskUid))
    .limit(1);
  return row ?? null;
}

export async function saveStripeLifecycleSchedulerTaskUid(
  taskUid: string,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  await db
    .insert(stripeLifecycleSchedulers)
    .values({
      scheduleKey: SCHEDULER_KEY,
      scheduleCronTaskUid: taskUid,
      cronExpression: STRIPE_LIFECYCLE_CRON,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        scheduleCronTaskUid: taskUid,
        cronExpression: STRIPE_LIFECYCLE_CRON,
        updatedAt: now,
      },
    });
}

export async function claimStripeLifecycleSchedulerRun(
  taskUid: string,
  dedupWindowMs: number,
  now = Date.now()
) {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(stripeLifecycleSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: "running",
      lastRunErrorCode: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(stripeLifecycleSchedulers.scheduleCronTaskUid, taskUid),
        or(
          isNull(stripeLifecycleSchedulers.lastRunAt),
          lte(stripeLifecycleSchedulers.lastRunAt, now - dedupWindowMs)
        )
      )
    );
  return getAffectedRows(result) === 1;
}

export async function recordStripeLifecycleSchedulerRun(input: {
  taskUid: string;
  status: "ok" | "failed";
  errorCode?: string | null;
  now?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const now = input.now ?? Date.now();
  await db
    .update(stripeLifecycleSchedulers)
    .set({
      lastRunAt: now,
      lastRunStatus: input.status,
      lastRunErrorCode: input.errorCode?.slice(0, 64) ?? null,
      updatedAt: now,
    })
    .where(eq(stripeLifecycleSchedulers.scheduleCronTaskUid, input.taskUid));
}
