import { desc, eq } from "drizzle-orm";
import {
  adaptiveSendBurstPolicies,
  adaptiveSendBurstPolicyChanges,
  users,
} from "../drizzle/schema";
import {
  DEFAULT_ADAPTIVE_SEND_BURST_CAPS,
  normalizeAdaptiveSendBurstCaps,
  type AdaptiveSendBurstCaps,
} from "../shared/adaptiveSendLimits";
import { getDb } from "./db";

export const ADAPTIVE_SEND_BURST_POLICY_KEY = "global";
const ADAPTIVE_SEND_BURST_CAP_AUDIT_PAGE_SIZE = 25;
const ADAPTIVE_SEND_BURST_CAP_AUDIT_MAX_PAGE_SIZE = 100;

function fromRow(
  row:
    | {
        freeBurstCap: number;
        proBurstCap: number;
        annualBurstCap: number;
        lifetimeBurstCap: number;
      }
    | null
    | undefined
): AdaptiveSendBurstCaps {
  if (!row) return { ...DEFAULT_ADAPTIVE_SEND_BURST_CAPS };
  return normalizeAdaptiveSendBurstCaps({
    free: row.freeBurstCap,
    pro: row.proBurstCap,
    annual: row.annualBurstCap,
    lifetime: row.lifetimeBurstCap,
  });
}

/** Load the global cap policy. A missing row intentionally uses safe defaults. */
export async function getAdaptiveSendBurstCaps(): Promise<AdaptiveSendBurstCaps> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [row] = await db
    .select()
    .from(adaptiveSendBurstPolicies)
    .where(
      eq(adaptiveSendBurstPolicies.policyKey, ADAPTIVE_SEND_BURST_POLICY_KEY)
    )
    .limit(1);
  return fromRow(row);
}

/**
 * Persist administrator-approved caps. Zod validation in the router prevents
 * caller input outside platform bounds; normalizing again keeps the database
 * boundary defensive against future callers.
 */
export async function saveAdaptiveSendBurstCaps(
  caps: AdaptiveSendBurstCaps,
  updatedByUserId: number,
  now = Date.now()
): Promise<AdaptiveSendBurstCaps> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const normalized = normalizeAdaptiveSendBurstCaps(caps);
  await db.transaction(async tx => {
    const [existing] = await tx
      .select()
      .from(adaptiveSendBurstPolicies)
      .where(
        eq(adaptiveSendBurstPolicies.policyKey, ADAPTIVE_SEND_BURST_POLICY_KEY)
      )
      .limit(1);
    const previous = fromRow(existing);
    const changed =
      previous.free !== normalized.free ||
      previous.pro !== normalized.pro ||
      previous.annual !== normalized.annual ||
      previous.lifetime !== normalized.lifetime;

    await tx
      .insert(adaptiveSendBurstPolicies)
      .values({
        policyKey: ADAPTIVE_SEND_BURST_POLICY_KEY,
        freeBurstCap: normalized.free,
        proBurstCap: normalized.pro,
        annualBurstCap: normalized.annual,
        lifetimeBurstCap: normalized.lifetime,
        updatedByUserId,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          freeBurstCap: normalized.free,
          proBurstCap: normalized.pro,
          annualBurstCap: normalized.annual,
          lifetimeBurstCap: normalized.lifetime,
          updatedByUserId,
          updatedAt: now,
        },
      });

    if (!changed) return;
    await tx.insert(adaptiveSendBurstPolicyChanges).values({
      policyKey: ADAPTIVE_SEND_BURST_POLICY_KEY,
      changedByUserId: updatedByUserId,
      previousFreeBurstCap: previous.free,
      previousProBurstCap: previous.pro,
      previousAnnualBurstCap: previous.annual,
      previousLifetimeBurstCap: previous.lifetime,
      freeBurstCap: normalized.free,
      proBurstCap: normalized.pro,
      annualBurstCap: normalized.annual,
      lifetimeBurstCap: normalized.lifetime,
      changedAt: now,
    });
  });
  return normalized;
}

/** Return a bounded, privacy-minimized cap change history for administrators. */
export async function listAdaptiveSendBurstCapAudit(input?: {
  page?: number;
  pageSize?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");

  const page = Math.max(1, Math.floor(input?.page ?? 1));
  const pageSize = Math.min(
    ADAPTIVE_SEND_BURST_CAP_AUDIT_MAX_PAGE_SIZE,
    Math.max(
      1,
      Math.floor(input?.pageSize ?? ADAPTIVE_SEND_BURST_CAP_AUDIT_PAGE_SIZE)
    )
  );
  const rows = await db
    .select({
      id: adaptiveSendBurstPolicyChanges.id,
      previousFreeBurstCap: adaptiveSendBurstPolicyChanges.previousFreeBurstCap,
      previousProBurstCap: adaptiveSendBurstPolicyChanges.previousProBurstCap,
      previousAnnualBurstCap:
        adaptiveSendBurstPolicyChanges.previousAnnualBurstCap,
      previousLifetimeBurstCap:
        adaptiveSendBurstPolicyChanges.previousLifetimeBurstCap,
      freeBurstCap: adaptiveSendBurstPolicyChanges.freeBurstCap,
      proBurstCap: adaptiveSendBurstPolicyChanges.proBurstCap,
      annualBurstCap: adaptiveSendBurstPolicyChanges.annualBurstCap,
      lifetimeBurstCap: adaptiveSendBurstPolicyChanges.lifetimeBurstCap,
      changedAt: adaptiveSendBurstPolicyChanges.changedAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(adaptiveSendBurstPolicyChanges)
    .leftJoin(
      users,
      eq(users.id, adaptiveSendBurstPolicyChanges.changedByUserId)
    )
    .where(
      eq(
        adaptiveSendBurstPolicyChanges.policyKey,
        ADAPTIVE_SEND_BURST_POLICY_KEY
      )
    )
    .orderBy(desc(adaptiveSendBurstPolicyChanges.changedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return rows.map(row => ({
    id: row.id,
    previous: {
      free: row.previousFreeBurstCap,
      pro: row.previousProBurstCap,
      annual: row.previousAnnualBurstCap,
      lifetime: row.previousLifetimeBurstCap,
    },
    next: {
      free: row.freeBurstCap,
      pro: row.proBurstCap,
      annual: row.annualBurstCap,
      lifetime: row.lifetimeBurstCap,
    },
    actor: row.actorName?.trim() || row.actorEmail?.trim() || "Administrator",
    changedAt: row.changedAt,
  }));
}

export const adaptiveSendBurstPolicySourceContract = {
  globalPolicyKey: ADAPTIVE_SEND_BURST_POLICY_KEY,
  usesSafeDefaults: true,
  actorsCanOnlyBeAdministrators: true,
  changeHistoryIsImmutable: true,
} as const;
