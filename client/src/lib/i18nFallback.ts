export type ResourceRecord = Record<string, unknown>;

function isResourceRecord(value: unknown): value is ResourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Merge a maintained locale namespace over the generated safety net. Normal
 * maintained strings win, while a legacy scalar is deliberately replaced when
 * it collides with the current nested key schema. Without that exception, a
 * value such as `onboardingGuide.welcome: "Welcome"` prevents the active
 * `onboardingGuide.welcome.heroText` keys from ever being installed.
 */
export function mergeLocaleFallback(
  generated: ResourceRecord,
  maintained?: ResourceRecord
): ResourceRecord {
  const merged: ResourceRecord = { ...generated };
  if (!maintained) return merged;

  for (const [key, maintainedValue] of Object.entries(maintained)) {
    const generatedValue = merged[key];

    if (isResourceRecord(generatedValue) && isResourceRecord(maintainedValue)) {
      merged[key] = mergeLocaleFallback(generatedValue, maintainedValue);
      continue;
    }

    // The generated object reflects the current component contract. Prefer it
    // over an obsolete scalar so nested calls resolve instead of showing raw
    // identifiers; all ordinary maintained scalar values remain authoritative.
    if (
      isResourceRecord(generatedValue) &&
      !isResourceRecord(maintainedValue)
    ) {
      continue;
    }

    merged[key] = maintainedValue;
  }

  return merged;
}
