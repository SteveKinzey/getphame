import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  getOnboardingGuideSeenKey,
  shouldAutoShowOnboardingGuide,
} from "../client/src/lib/onboardingGuideEligibility";

function createStorage(seenKeys: string[] = []) {
  return {
    getItem: vi.fn((key: string) => seenKeys.includes(key) ? "1" : null),
  };
}

describe("onboarding guide eligibility", () => {
  it("waits for the authenticated account and server onboarding status", () => {
    const storage = createStorage();

    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: false,
      userId: 42,
      onboardingStatus: { dismissed: false, allDone: false },
    }, storage)).toBe(false);
    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: undefined,
    }, storage)).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("suppresses dismissed and completed returning accounts before consulting browser state", () => {
    const storage = createStorage();

    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: { dismissed: true, allDone: false },
    }, storage)).toBe(false);
    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: { dismissed: false, allDone: true },
    }, storage)).toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("auto-shows for an incomplete account that has not seen its guide", () => {
    const storage = createStorage();

    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: { dismissed: false, allDone: false },
    }, storage)).toBe(true);
    expect(storage.getItem).toHaveBeenCalledWith("rl_guide_seen:42");
  });

  it("does not repeat the guide for the same incomplete account", () => {
    const key = getOnboardingGuideSeenKey(42);
    const storage = createStorage([key]);

    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: { dismissed: false, allDone: false },
    }, storage)).toBe(false);
  });

  it("does not let another account's browser flag suppress a genuine first login", () => {
    const storage = createStorage([getOnboardingGuideSeenKey(7)]);

    expect(shouldAutoShowOnboardingGuide({
      isAuthenticated: true,
      userId: 42,
      onboardingStatus: { dismissed: false, allDone: false },
    }, storage)).toBe(true);
  });

  it("wires server status into the app shell and prevents the wizard from flashing beneath an eligible guide", () => {
    const appPath = fileURLToPath(new URL("../client/src/App.tsx", import.meta.url));
    const app = readFileSync(appPath, "utf8");

    expect(app).toContain("useOnboardingGuide({");
    expect(app).toContain("onboardingStatus,");
    expect(app).toContain("!guideAutoShowEligible &&");
    expect(app).toContain("onClose={closeGuideForSession}");
  });
});
