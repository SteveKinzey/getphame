import { describe, expect, it } from "vitest";
import { getChangedToneLineSegments, getToneTextDiff } from "./toneDraftDiff";

const join = (segments: Array<{ text: string }>) => segments.map((segment) => segment.text).join("");

describe("getToneTextDiff", () => {
  it("keeps unchanged drafts readable without artificial highlights", () => {
    const diff = getToneTextDiff("Thank you, Alex!", "Thank you, Alex!");

    expect(diff.hasChanges).toBe(false);
    expect(diff.before).toEqual([{ kind: "unchanged", text: "Thank you, Alex!" }]);
    expect(diff.after).toEqual([{ kind: "unchanged", text: "Thank you, Alex!" }]);
  });

  it("preserves each complete draft while exposing additions and removals independently", () => {
    const before = "Hello loyal customer, thank you.";
    const after = "Hello valued customer, thank you!";
    const diff = getToneTextDiff(before, after);

    expect(diff.hasChanges).toBe(true);
    expect(join(diff.before)).toBe(before);
    expect(join(diff.after)).toBe(after);
    expect(diff.before.some((segment) => segment.kind === "removed")).toBe(true);
    expect(diff.after.some((segment) => segment.kind === "added")).toBe(true);
  });

  it("uses a bounded whole-field comparison for unusually long drafts", () => {
    const before = "Original wording ".repeat(500);
    const after = "Adjusted wording ".repeat(500);
    const diff = getToneTextDiff(before, after);

    expect(diff.before).toEqual([{ kind: "removed", text: before }]);
    expect(diff.after).toEqual([{ kind: "added", text: after }]);
  });

  it("projects only full lines containing highlighted changes for a focused comparison", () => {
    const diff = getToneTextDiff(
      "Keep this line.\nPlease leave feedback soon.\nKeep this closing.",
      "Keep this line.\nPlease share feedback when convenient.\nKeep this closing.",
    );

    const before = getChangedToneLineSegments(diff.before, "removed");
    const after = getChangedToneLineSegments(diff.after, "added");

    expect(join(before)).toContain("Please leave feedback soon.");
    expect(join(before)).not.toContain("Keep this line.");
    expect(join(after)).toContain("Please share feedback when convenient.");
    expect(join(after)).not.toContain("Keep this closing.");
  });
});
