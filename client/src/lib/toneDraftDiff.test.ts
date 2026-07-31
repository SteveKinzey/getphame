import { describe, expect, it } from "vitest";
import { getToneTextDiff } from "./toneDraftDiff";

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
});
