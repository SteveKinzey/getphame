import { describe, expect, it } from "vitest";
import { AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT, clearAllAuthHealthHistoryFilters, clearAuthHealthHistoryFilter, getActiveAuthHealthHistoryFilterChips, getRelativeAuthHealthHistoryDateInputs, shouldClearAuthHealthHistoryFiltersFromShortcut } from "../shared/authHealthHistoryRanges";

describe("auth health history relative ranges", () => {
  it("returns inclusive local-calendar dates for the last 7 and 30 days", () => {
    const now = new Date(2026, 6, 21, 15, 30, 0);
    expect(getRelativeAuthHealthHistoryDateInputs(7, now)).toEqual({ from: "2026-07-15", to: "2026-07-21" });
    expect(getRelativeAuthHealthHistoryDateInputs(30, now)).toEqual({ from: "2026-06-22", to: "2026-07-21" });
  });

  it("builds removable chips only for active history filters", () => {
    expect(getActiveAuthHealthHistoryFilterChips({ status: "fail", triggerSource: "manual", from: "2026-07-15", to: "2026-07-21" })).toEqual([
      { key: "status", label: "Status: Failures" },
      { key: "triggerSource", label: "Source: Administrator" },
      { key: "from", label: "From: 2026-07-15" },
      { key: "to", label: "To: 2026-07-21" },
    ]);
    expect(getActiveAuthHealthHistoryFilterChips({ status: "all", triggerSource: "all", from: "", to: "" })).toEqual([]);
  });

  it("removes one filter at a time and resets pagination", () => {
    const state = { status: "fail" as const, triggerSource: "manual" as const, from: "2026-07-15", to: "2026-07-21", page: 4 };
    expect(clearAuthHealthHistoryFilter(state, "status")).toEqual({ ...state, status: "all", page: 1 });
    expect(clearAuthHealthHistoryFilter(state, "triggerSource")).toEqual({ ...state, triggerSource: "all", page: 1 });
    expect(clearAuthHealthHistoryFilter(state, "from")).toEqual({ ...state, from: "", page: 1 });
    expect(clearAuthHealthHistoryFilter(state, "to")).toEqual({ ...state, to: "", page: 1 });
  });

  it("clears every active filter and returns to page one", () => {
    expect(clearAllAuthHealthHistoryFilters()).toEqual({ status: "all", triggerSource: "all", from: "", to: "", page: 1 });
  });

  it("matches Alt+Shift+C only outside editable targets and ignores repeats", () => {
    expect(AUTH_HEALTH_HISTORY_CLEAR_SHORTCUT).toBe("Alt+Shift+C");
    const base = { key: "c", altKey: true, shiftKey: true, ctrlKey: false, metaKey: false, repeat: false, target: null };
    expect(shouldClearAuthHealthHistoryFiltersFromShortcut(base)).toBe(true);
    expect(shouldClearAuthHealthHistoryFiltersFromShortcut({ ...base, repeat: true })).toBe(false);
    expect(shouldClearAuthHealthHistoryFiltersFromShortcut({ ...base, altKey: false })).toBe(false);
    expect(shouldClearAuthHealthHistoryFiltersFromShortcut({ ...base, target: { tagName: "INPUT" } })).toBe(false);
    expect(shouldClearAuthHealthHistoryFiltersFromShortcut({ ...base, target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
  });
});
