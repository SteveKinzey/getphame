import { and, count, desc, eq } from "drizzle-orm";
import { authHealthHistoryPresets } from "../drizzle/schema";
import { getDb } from "./db";

export const MAX_AUTH_HEALTH_HISTORY_PRESETS = 20;
export const MAX_AUTH_HEALTH_HISTORY_PRESET_NAME_CHARS = 80;

type PresetFilters = {
  status?: "ok" | "fail" | null;
  triggerSource?: "scheduled" | "manual" | null;
  fromMs?: number | null;
  toMs?: number | null;
};

export type SaveAuthHealthHistoryPresetInput = PresetFilters & {
  id?: number;
  name: string;
};

export function normalizeAuthHealthHistoryPresetName(name: string) {
  return name.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

export function buildDuplicateAuthHealthHistoryPresetName(sourceName: string, existingNames: string[]) {
  const normalizedNames = new Set(existingNames.map(normalizeAuthHealthHistoryPresetName));
  for (let copyNumber = 1; copyNumber <= MAX_AUTH_HEALTH_HISTORY_PRESETS + 1; copyNumber += 1) {
    const suffix = copyNumber === 1 ? " copy" : ` copy ${copyNumber}`;
    const maxBaseLength = MAX_AUTH_HEALTH_HISTORY_PRESET_NAME_CHARS - suffix.length;
    const baseName = sourceName.replace(/\s+/g, " ").trim().slice(0, maxBaseLength).trimEnd() || "Preset";
    const candidate = `${baseName}${suffix}`;
    if (!normalizedNames.has(normalizeAuthHealthHistoryPresetName(candidate))) return candidate;
  }
  return `Preset copy ${Date.now()}`.slice(0, MAX_AUTH_HEALTH_HISTORY_PRESET_NAME_CHARS);
}

function toPresetFields(input: SaveAuthHealthHistoryPresetInput) {
  const name = input.name.replace(/\s+/g, " ").trim();
  return {
    name,
    normalizedName: normalizeAuthHealthHistoryPresetName(name),
    status: input.status ?? null,
    triggerSource: input.triggerSource ?? null,
    fromMs: input.fromMs ?? null,
    toMs: input.toMs ?? null,
    updatedAt: new Date(),
  };
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function listAuthHealthHistoryPresets(ownerUserId: number, database?: Database) {
  const db = database ?? await getDb();
  if (!db) return [];
  return db.select()
    .from(authHealthHistoryPresets)
    .where(eq(authHealthHistoryPresets.ownerUserId, ownerUserId))
    .orderBy(desc(authHealthHistoryPresets.updatedAt), desc(authHealthHistoryPresets.id))
    .limit(MAX_AUTH_HEALTH_HISTORY_PRESETS);
}

export async function saveAuthHealthHistoryPreset(
  ownerUserId: number,
  input: SaveAuthHealthHistoryPresetInput,
  database?: Database,
) {
  const db = database ?? await getDb();
  if (!db) return { outcome: "unavailable" as const };
  const fields = toPresetFields(input);

  const [sameName] = await db.select({ id: authHealthHistoryPresets.id })
    .from(authHealthHistoryPresets)
    .where(and(
      eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
      eq(authHealthHistoryPresets.normalizedName, fields.normalizedName),
    ))
    .limit(1);

  if (input.id) {
    const [owned] = await db.select({ id: authHealthHistoryPresets.id })
      .from(authHealthHistoryPresets)
      .where(and(
        eq(authHealthHistoryPresets.id, input.id),
        eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
      ))
      .limit(1);
    if (!owned) return { outcome: "not_found" as const };
    if (sameName && sameName.id !== input.id) return { outcome: "name_conflict" as const };
    await db.update(authHealthHistoryPresets)
      .set(fields)
      .where(and(
        eq(authHealthHistoryPresets.id, input.id),
        eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
      ));
    return { outcome: "saved" as const, id: input.id, created: false as const };
  }

  if (sameName) {
    await db.update(authHealthHistoryPresets)
      .set(fields)
      .where(and(
        eq(authHealthHistoryPresets.id, sameName.id),
        eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
      ));
    return { outcome: "saved" as const, id: sameName.id, created: false as const };
  }

  const [ownedCount] = await db.select({ value: count(authHealthHistoryPresets.id) })
    .from(authHealthHistoryPresets)
    .where(eq(authHealthHistoryPresets.ownerUserId, ownerUserId));
  if (Number(ownedCount?.value ?? 0) >= MAX_AUTH_HEALTH_HISTORY_PRESETS) {
    return { outcome: "limit_reached" as const };
  }

  const [inserted] = await db.insert(authHealthHistoryPresets)
    .values({ ownerUserId, ...fields })
    .$returningId();
  if (!inserted?.id) return { outcome: "unavailable" as const };
  return { outcome: "saved" as const, id: inserted.id, created: true as const };
}

export async function deleteAuthHealthHistoryPreset(ownerUserId: number, id: number, database?: Database) {
  const db = database ?? await getDb();
  if (!db) return false;
  await db.delete(authHealthHistoryPresets)
    .where(and(
      eq(authHealthHistoryPresets.id, id),
      eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
    ));
  return true;
}

export async function duplicateAuthHealthHistoryPreset(ownerUserId: number, id: number, database?: Database) {
  const db = database ?? await getDb();
  if (!db) return { outcome: "unavailable" as const };

  const [source] = await db.select()
    .from(authHealthHistoryPresets)
    .where(and(
      eq(authHealthHistoryPresets.id, id),
      eq(authHealthHistoryPresets.ownerUserId, ownerUserId),
    ))
    .limit(1);
  if (!source) return { outcome: "not_found" as const };

  const existing = await db.select({ name: authHealthHistoryPresets.name })
    .from(authHealthHistoryPresets)
    .where(eq(authHealthHistoryPresets.ownerUserId, ownerUserId))
    .limit(MAX_AUTH_HEALTH_HISTORY_PRESETS);
  if (existing.length >= MAX_AUTH_HEALTH_HISTORY_PRESETS) return { outcome: "limit_reached" as const };

  const name = buildDuplicateAuthHealthHistoryPresetName(source.name, existing.map((preset) => preset.name));
  const normalizedName = normalizeAuthHealthHistoryPresetName(name);
  const [inserted] = await db.insert(authHealthHistoryPresets).values({
    ownerUserId,
    name,
    normalizedName,
    status: source.status,
    triggerSource: source.triggerSource,
    fromMs: source.fromMs,
    toMs: source.toMs,
  }).$returningId();
  if (!inserted?.id) return { outcome: "unavailable" as const };

  return {
    outcome: "duplicated" as const,
    preset: {
      id: inserted.id,
      name,
      normalizedName,
      status: source.status,
      triggerSource: source.triggerSource,
      fromMs: source.fromMs,
      toMs: source.toMs,
    },
  };
}
