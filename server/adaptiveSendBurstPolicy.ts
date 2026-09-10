import { eq } from "drizzle-orm";
import { adaptiveSendBurstPolicies } from "../drizzle/schema";
import {
  DEFAULT_ADAPTIVE_SEND_BURST_CAPS,
  normalizeAdaptiveSendBurstCaps,
  type AdaptiveSendBurstCaps,
} from "../shared/adaptiveSendLimits";
import { getDb } from "./db";

export const ADAPTIVE_SEND_BURST_POLICY_KEY = "global";

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
  await db
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
  return normalized;
}

export const adaptiveSendBurstPolicySourceContract = {
  globalPolicyKey: ADAPTIVE_SEND_BURST_POLICY_KEY,
  usesSafeDefaults: true,
  actorsCanOnlyBeAdministrators: true,
} as const;
