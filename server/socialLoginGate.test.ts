import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isGoogleSignInHost,
  isStagingSocialLoginHost,
} from "../client/src/lib/socialLoginAvailability";

describe("social login host policy", () => {
  it.each([
    "getphame.app",
    "www.getphame.app",
    "localhost",
    "127.0.0.1",
    "3000-example.us1.manus.computer",
  ])("enables Google sign-in on approved hostname %s", hostname => {
    expect(isGoogleSignInHost(hostname)).toBe(true);
  });

  it.each(["getphame.manus.space", "revrocket-j5ynazte.manus.space"])(
    "keeps Google sign-in hidden on unapproved published hostname %s",
    hostname => {
      expect(isGoogleSignInHost(hostname)).toBe(false);
    }
  );

  it.each([
    "getphame.app",
    "www.getphame.app",
    "getphame.manus.space",
    "revrocket-j5ynazte.manus.space",
  ])("keeps Apple sign-in hidden on published hostname %s", hostname => {
    expect(isStagingSocialLoginHost(hostname)).toBe(false);
  });

  it.each(["localhost", "127.0.0.1", "3000-example.us1.manus.computer"])(
    "keeps Apple sign-in available on local and preview hostname %s",
    hostname => {
      expect(isStagingSocialLoginHost(hostname)).toBe(true);
    }
  );

  it("applies the shared gate to both public authentication screens", () => {
    const loginPath = fileURLToPath(
      new URL("../client/src/pages/Login.tsx", import.meta.url)
    );
    const onboardingPath = fileURLToPath(
      new URL("../client/src/pages/Onboarding.tsx", import.meta.url)
    );
    const magicLinkFormPath = fileURLToPath(
      new URL(
        "../client/src/components/auth/MagicLinkForm.tsx",
        import.meta.url
      )
    );
    const loginSource = readFileSync(loginPath, "utf8");
    const onboardingSource = readFileSync(onboardingPath, "utf8");
    const magicLinkSource = readFileSync(magicLinkFormPath, "utf8");

    expect(loginSource).toContain(
      "isGoogleSignInHost(window.location.hostname)"
    );
    expect(onboardingSource).toContain(
      "isGoogleSignInHost(window.location.hostname)"
    );
    expect(loginSource).toContain(
      "isStagingSocialLoginHost(window.location.hostname)"
    );
    expect(onboardingSource).toContain(
      "isStagingSocialLoginHost(window.location.hostname)"
    );
    expect(loginSource).toContain('data-testid="social-login"');
    expect(onboardingSource).toContain('data-testid="social-login"');
    expect(loginSource).toContain("Continue with Google");
    expect(onboardingSource).toContain("Continue with Google");
    expect(magicLinkSource).toContain("Send Magic Link");
    expect(onboardingSource).toContain('t("login.sendMagicLink"');
    expect(onboardingSource).toContain("<MagicLinkForm");
  });
});
