import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { isStagingSocialLoginHost } from "../client/src/lib/socialLoginAvailability";

describe("social login staging gate", () => {
  it.each([
    "getphame.app",
    "www.getphame.app",
    "getphame.manus.space",
    "revrocket-j5ynazte.manus.space",
  ])("hides social login on live hostname %s", (hostname) => {
    expect(isStagingSocialLoginHost(hostname)).toBe(false);
  });

  it.each([
    "localhost",
    "127.0.0.1",
    "3000-example.us1.manus.computer",
  ])("enables social login on preview hostname %s", (hostname) => {
    expect(isStagingSocialLoginHost(hostname)).toBe(true);
  });

  it("applies the shared gate to both public authentication screens", () => {
    const loginPath = fileURLToPath(new URL("../client/src/pages/Login.tsx", import.meta.url));
    const onboardingPath = fileURLToPath(new URL("../client/src/pages/Onboarding.tsx", import.meta.url));
    const loginSource = readFileSync(loginPath, "utf8");
    const onboardingSource = readFileSync(onboardingPath, "utf8");

    expect(loginSource).toContain("isStagingSocialLoginHost(window.location.hostname)");
    expect(onboardingSource).toContain("isStagingSocialLoginHost(window.location.hostname)");
    expect(loginSource).toContain("data-testid=\"staging-social-login\"");
    expect(onboardingSource).toContain("data-testid=\"staging-social-login\"");
    expect(loginSource).toContain("Send Magic Link");
    expect(onboardingSource).toContain("Continue with Email");
  });
});
