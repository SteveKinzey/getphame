export type ToneDiffKind = "unchanged" | "removed" | "added";

export interface ToneDiffSegment {
  kind: ToneDiffKind;
  text: string;
}

export interface ToneTextDiff {
  before: ToneDiffSegment[];
  after: ToneDiffSegment[];
  hasChanges: boolean;
}

const MAX_DIFF_MATRIX_CELLS = 160_000;

function tokenize(value: string): string[] {
  return value.match(/\s+|[^\s]+/g) ?? [];
}

function appendSegment(segments: ToneDiffSegment[], kind: ToneDiffKind, text: string) {
  if (!text) return;
  const previous = segments.at(-1);
  if (previous?.kind === kind) {
    previous.text += text;
    return;
  }
  segments.push({ kind, text });
}

function buildReplacementDiff(before: string, after: string): ToneTextDiff {
  return {
    before: before ? [{ kind: "removed", text: before }] : [],
    after: after ? [{ kind: "added", text: after }] : [],
    hasChanges: true,
  };
}

/**
 * Produces bounded, word-aware text differences for the approval-only AI tone preview.
 * The fallback keeps the modal responsive for unusually long drafts by showing whole-field changes.
 */
export function getToneTextDiff(before: string, after: string): ToneTextDiff {
  if (before === after) {
    const unchanged = before ? [{ kind: "unchanged" as const, text: before }] : [];
    return { before: unchanged, after: unchanged, hasChanges: false };
  }

  const beforeTokens = tokenize(before);
  const afterTokens = tokenize(after);
  const rows = beforeTokens.length + 1;
  const columns = afterTokens.length + 1;

  if (rows * columns > MAX_DIFF_MATRIX_CELLS) {
    return buildReplacementDiff(before, after);
  }

  const matrix = new Uint16Array(rows * columns);
  const at = (row: number, column: number) => matrix[row * columns + column] ?? 0;

  for (let beforeIndex = beforeTokens.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterTokens.length - 1; afterIndex >= 0; afterIndex -= 1) {
      const value = beforeTokens[beforeIndex] === afterTokens[afterIndex]
        ? at(beforeIndex + 1, afterIndex + 1) + 1
        : Math.max(at(beforeIndex + 1, afterIndex), at(beforeIndex, afterIndex + 1));
      matrix[beforeIndex * columns + afterIndex] = value;
    }
  }

  const beforeSegments: ToneDiffSegment[] = [];
  const afterSegments: ToneDiffSegment[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeTokens.length && afterIndex < afterTokens.length) {
    if (beforeTokens[beforeIndex] === afterTokens[afterIndex]) {
      appendSegment(beforeSegments, "unchanged", beforeTokens[beforeIndex]);
      appendSegment(afterSegments, "unchanged", afterTokens[afterIndex]);
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    if (at(beforeIndex + 1, afterIndex) >= at(beforeIndex, afterIndex + 1)) {
      appendSegment(beforeSegments, "removed", beforeTokens[beforeIndex]);
      beforeIndex += 1;
      continue;
    }

    appendSegment(afterSegments, "added", afterTokens[afterIndex]);
    afterIndex += 1;
  }

  while (beforeIndex < beforeTokens.length) {
    appendSegment(beforeSegments, "removed", beforeTokens[beforeIndex]);
    beforeIndex += 1;
  }

  while (afterIndex < afterTokens.length) {
    appendSegment(afterSegments, "added", afterTokens[afterIndex]);
    afterIndex += 1;
  }

  return { before: beforeSegments, after: afterSegments, hasChanges: true };
}

/**
 * Returns only full lines that contain a highlighted change for one side of a comparison.
 * It keeps unchanged words on a changed line so the edit remains understandable in isolation.
 */
export function getChangedToneLineSegments(
  segments: ToneDiffSegment[],
  changedKind: Extract<ToneDiffKind, "removed" | "added">,
): ToneDiffSegment[] {
  const lines: ToneDiffSegment[][] = [[]];

  for (const segment of segments) {
    for (const part of segment.text.split(/(\n)/)) {
      if (!part) continue;
      if (part === "\n") {
        lines.push([]);
        continue;
      }
      appendSegment(lines[lines.length - 1], segment.kind, part);
    }
  }

  const changedLines = lines.filter((line) => line.some((segment) => segment.kind === changedKind));
  const result: ToneDiffSegment[] = [];
  changedLines.forEach((line, index) => {
    line.forEach((segment) => appendSegment(result, segment.kind, segment.text));
    if (index < changedLines.length - 1) appendSegment(result, "unchanged", "\n");
  });
  return result;
}
