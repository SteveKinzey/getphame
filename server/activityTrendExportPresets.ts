import { and, asc, count, eq, max } from "drizzle-orm";
import { activityTrendExportPresets } from "../drizzle/schema";
import { getDb } from "./db";

export const MAX_ACTIVITY_TREND_EXPORT_PRESETS = 20;
export const MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS = 80;
export const ACTIVITY_TREND_PRESET_RANGES = [
  "30",
  "60",
  "90",
  "custom",
] as const;
export const ACTIVITY_TREND_PRESET_SERIES = [
  "sends",
  "opens",
  "clicks",
] as const;

export type ActivityTrendPresetRange =
  (typeof ACTIVITY_TREND_PRESET_RANGES)[number];
export type ActivityTrendPresetSeries =
  (typeof ACTIVITY_TREND_PRESET_SERIES)[number];

export type SaveActivityTrendExportPresetInput = {
  id?: number;
  name: string;
  rangeKey: ActivityTrendPresetRange;
  customStartDate?: string | null;
  customEndDate?: string | null;
  series: ActivityTrendPresetSeries[];
};

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function normalizeActivityTrendPresetName(name: string) {
  return name.replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

export function normalizeActivityTrendPresetSeries(
  series: ActivityTrendPresetSeries[]
) {
  const selected = new Set(series);
  const canonical = ACTIVITY_TREND_PRESET_SERIES.filter(key =>
    selected.has(key)
  );
  if (
    !canonical.length ||
    canonical.length !== selected.size ||
    selected.size !== series.length
  ) {
    throw new Error("Select one or more unique Activity Trend series.");
  }
  return canonical;
}

export function validateActivityTrendPresetRange(
  input: Pick<
    SaveActivityTrendExportPresetInput,
    "rangeKey" | "customStartDate" | "customEndDate"
  >
) {
  if (input.rangeKey !== "custom")
    return { customStartDate: null, customEndDate: null };
  const start = input.customStartDate?.trim() ?? "";
  const end = input.customEndDate?.trim() ?? "";
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  if (
    !pattern.test(start) ||
    !pattern.test(end) ||
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs)
  ) {
    throw new Error("Custom presets require valid start and end dates.");
  }
  if (startMs > endMs)
    throw new Error(
      "The custom preset end date must not be before its start date."
    );
  if (Math.floor((endMs - startMs) / 86_400_000) + 1 > 366) {
    throw new Error("Custom presets are limited to 366 days.");
  }
  if (end > new Date().toISOString().slice(0, 10)) {
    throw new Error("The custom preset end date cannot be in the future.");
  }
  return { customStartDate: start, customEndDate: end };
}

export function buildDuplicateActivityTrendPresetName(
  sourceName: string,
  existingNames: string[]
) {
  const existing = new Set(existingNames.map(normalizeActivityTrendPresetName));
  for (
    let index = 1;
    index <= MAX_ACTIVITY_TREND_EXPORT_PRESETS + 1;
    index += 1
  ) {
    const suffix = index === 1 ? " copy" : ` copy ${index}`;
    const base =
      sourceName
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS - suffix.length)
        .trimEnd() || "Preset";
    const candidate = `${base}${suffix}`;
    if (!existing.has(normalizeActivityTrendPresetName(candidate)))
      return candidate;
  }
  return `Preset copy ${Date.now()}`.slice(
    0,
    MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS
  );
}

export function validateCompleteActivityTrendPresetOrder(
  orderedIds: number[],
  ownedIds: number[]
) {
  if (new Set(orderedIds).size !== orderedIds.length)
    throw new Error("duplicate_ids");
  const owned = new Set(ownedIds);
  if (
    orderedIds.length !== ownedIds.length ||
    orderedIds.some(id => !owned.has(id))
  ) {
    throw new Error("membership_mismatch");
  }
  return orderedIds;
}

function toFields(input: SaveActivityTrendExportPresetInput) {
  const name = input.name.replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_ACTIVITY_TREND_EXPORT_PRESET_NAME_CHARS) {
    throw new Error("invalid_name");
  }
  const series = normalizeActivityTrendPresetSeries(input.series);
  return {
    name,
    normalizedName: normalizeActivityTrendPresetName(name),
    rangeKey: input.rangeKey,
    ...validateActivityTrendPresetRange(input),
    includeSends: series.includes("sends"),
    includeOpens: series.includes("opens"),
    includeClicks: series.includes("clicks"),
    updatedAt: new Date(),
  };
}

export async function listActivityTrendExportPresets(
  ownerUserId: number,
  database?: Database
) {
  const db = database ?? (await getDb());
  if (!db) return [];
  return db
    .select()
    .from(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, ownerUserId))
    .orderBy(
      asc(activityTrendExportPresets.sortOrder),
      asc(activityTrendExportPresets.id)
    )
    .limit(MAX_ACTIVITY_TREND_EXPORT_PRESETS);
}

export async function saveActivityTrendExportPreset(
  ownerUserId: number,
  input: SaveActivityTrendExportPresetInput,
  database?: Database
) {
  const db = database ?? (await getDb());
  if (!db) return { outcome: "unavailable" as const };
  let fields: ReturnType<typeof toFields>;
  try {
    fields = toFields(input);
  } catch {
    return { outcome: "invalid_config" as const };
  }

  const [sameName] = await db
    .select({ id: activityTrendExportPresets.id })
    .from(activityTrendExportPresets)
    .where(
      and(
        eq(activityTrendExportPresets.ownerUserId, ownerUserId),
        eq(activityTrendExportPresets.normalizedName, fields.normalizedName)
      )
    )
    .limit(1);

  if (input.id) {
    const [owned] = await db
      .select({ id: activityTrendExportPresets.id })
      .from(activityTrendExportPresets)
      .where(
        and(
          eq(activityTrendExportPresets.id, input.id),
          eq(activityTrendExportPresets.ownerUserId, ownerUserId)
        )
      )
      .limit(1);
    if (!owned) return { outcome: "not_found" as const };
    if (sameName && sameName.id !== input.id)
      return { outcome: "name_conflict" as const };
    await db
      .update(activityTrendExportPresets)
      .set(fields)
      .where(
        and(
          eq(activityTrendExportPresets.id, input.id),
          eq(activityTrendExportPresets.ownerUserId, ownerUserId)
        )
      );
    return { outcome: "saved" as const, id: input.id, created: false as const };
  }

  if (sameName) {
    await db
      .update(activityTrendExportPresets)
      .set(fields)
      .where(
        and(
          eq(activityTrendExportPresets.id, sameName.id),
          eq(activityTrendExportPresets.ownerUserId, ownerUserId)
        )
      );
    return {
      outcome: "saved" as const,
      id: sameName.id,
      created: false as const,
    };
  }

  const [ownedCount] = await db
    .select({ value: count(activityTrendExportPresets.id) })
    .from(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, ownerUserId));
  if (Number(ownedCount?.value ?? 0) >= MAX_ACTIVITY_TREND_EXPORT_PRESETS) {
    return { outcome: "limit_reached" as const };
  }
  const [highest] = await db
    .select({ value: max(activityTrendExportPresets.sortOrder) })
    .from(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, ownerUserId));
  const [inserted] = await db
    .insert(activityTrendExportPresets)
    .values({
      ownerUserId,
      ...fields,
      sortOrder: Number(highest?.value ?? -1) + 1,
    })
    .$returningId();
  if (!inserted?.id) return { outcome: "unavailable" as const };
  return { outcome: "saved" as const, id: inserted.id, created: true as const };
}

export async function deleteActivityTrendExportPreset(
  ownerUserId: number,
  id: number,
  database?: Database
) {
  const db = database ?? (await getDb());
  if (!db) return { outcome: "unavailable" as const };
  const [owned] = await db
    .select({ id: activityTrendExportPresets.id })
    .from(activityTrendExportPresets)
    .where(
      and(
        eq(activityTrendExportPresets.id, id),
        eq(activityTrendExportPresets.ownerUserId, ownerUserId)
      )
    )
    .limit(1);
  if (!owned) return { outcome: "not_found" as const };
  await db
    .delete(activityTrendExportPresets)
    .where(
      and(
        eq(activityTrendExportPresets.id, id),
        eq(activityTrendExportPresets.ownerUserId, ownerUserId)
      )
    );
  return { outcome: "deleted" as const };
}

export async function duplicateActivityTrendExportPreset(
  ownerUserId: number,
  id: number,
  database?: Database
) {
  const db = database ?? (await getDb());
  if (!db) return { outcome: "unavailable" as const };
  const [source] = await db
    .select()
    .from(activityTrendExportPresets)
    .where(
      and(
        eq(activityTrendExportPresets.id, id),
        eq(activityTrendExportPresets.ownerUserId, ownerUserId)
      )
    )
    .limit(1);
  if (!source) return { outcome: "not_found" as const };
  const existing = await db
    .select({
      name: activityTrendExportPresets.name,
      sortOrder: activityTrendExportPresets.sortOrder,
    })
    .from(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, ownerUserId))
    .limit(MAX_ACTIVITY_TREND_EXPORT_PRESETS);
  if (existing.length >= MAX_ACTIVITY_TREND_EXPORT_PRESETS)
    return { outcome: "limit_reached" as const };
  const name = buildDuplicateActivityTrendPresetName(
    source.name,
    existing.map(item => item.name)
  );
  const [inserted] = await db
    .insert(activityTrendExportPresets)
    .values({
      ownerUserId,
      name,
      normalizedName: normalizeActivityTrendPresetName(name),
      rangeKey: source.rangeKey,
      customStartDate: source.customStartDate,
      customEndDate: source.customEndDate,
      includeSends: source.includeSends,
      includeOpens: source.includeOpens,
      includeClicks: source.includeClicks,
      sortOrder:
        Math.max(-1, ...existing.map(item => Number(item.sortOrder ?? 0))) + 1,
    })
    .$returningId();
  if (!inserted?.id) return { outcome: "unavailable" as const };
  return { outcome: "duplicated" as const, id: inserted.id };
}

export async function reorderActivityTrendExportPresets(
  ownerUserId: number,
  orderedIds: number[],
  database?: Database
) {
  const db = database ?? (await getDb());
  if (!db) return { outcome: "unavailable" as const };
  if (
    !orderedIds.length ||
    orderedIds.length > MAX_ACTIVITY_TREND_EXPORT_PRESETS
  ) {
    return { outcome: "invalid_order" as const };
  }
  const owned = await db
    .select({ id: activityTrendExportPresets.id })
    .from(activityTrendExportPresets)
    .where(eq(activityTrendExportPresets.ownerUserId, ownerUserId))
    .limit(MAX_ACTIVITY_TREND_EXPORT_PRESETS + 1);
  try {
    validateCompleteActivityTrendPresetOrder(
      orderedIds,
      owned.map(item => item.id)
    );
  } catch (error) {
    return {
      outcome:
        error instanceof Error && error.message === "duplicate_ids"
          ? ("invalid_order" as const)
          : ("membership_mismatch" as const),
    };
  }
  await db.transaction(async tx => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx
        .update(activityTrendExportPresets)
        .set({ sortOrder: index })
        .where(
          and(
            eq(activityTrendExportPresets.id, orderedIds[index]),
            eq(activityTrendExportPresets.ownerUserId, ownerUserId)
          )
        );
    }
  });
  return { outcome: "reordered" as const };
}
