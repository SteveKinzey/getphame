import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import {
  getAuthErrorMessage,
  getLocalizedAuthErrorMessage,
} from "../client/src/lib/authFeedback";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Google sign-in interaction feedback", () => {
  it("disables the Google control, exposes busy state, and replaces its icon with a spinner", () => {
    const login = read("client/src/pages/Login.tsx");

    expect(login).toContain("disabled={isGoogleSubmitting}");
    expect(login).toContain("aria-busy={isGoogleSubmitting}");
    expect(login).toContain("if (isGoogleSubmitting) return");
    expect(login).toContain('import { flushSync } from "react-dom"');
    expect(login).toContain("flushSync(() => {");
    expect(login).toContain("setIsGoogleSubmitting(true)");
    expect(login).toContain("GOOGLE_REDIRECT_FEEDBACK_MS = 420");
    expect(login).toContain("GOOGLE_REDIRECT_STATUS_MS = 140");
    expect(login).toContain("window.setTimeout(() => {");
    expect(login).toContain("isGoogleSubmitting ? <Spinner /> : <GoogleIcon />");
    expect(login).toContain('t("authFeedback.preparingGoogle"');
    expect(login).toContain('t("authFeedback.redirectingGoogle"');
    expect(login).toContain('role="status" aria-live="polite"');
    expect(login).toContain('t("authFeedback.connectingGoogle"');
    expect(login).toContain('t("login.continueWithGoogle"');
    expect(login).toContain('window.location.assign("/api/auth/google")');
  });

  it("persists initiation long enough to show success or error feedback after the OAuth redirect", () => {
    const login = read("client/src/pages/Login.tsx");
    const app = read("client/src/App.tsx");
    const feedback = read("client/src/lib/authFeedback.ts");
    const googleAuth = read("server/googleAuth.ts");

    expect(login).toContain("rememberGoogleSignInPending()");
    expect(login).toContain('toast.loading(t("authFeedback.openingGoogle"');
    expect(app).toContain("hasGoogleSignInPending()");
    expect(app).toContain('t("authFeedback.googleSuccess"');
    expect(app).toContain("toast.error(getLocalizedAuthErrorMessage(authError, t)");
    expect(feedback).toContain("google_missing_code");
    expect(feedback).toContain("google_state_mismatch");
    expect(feedback).toContain("google_no_id");
    expect(googleAuth).toContain('app.get("/api/auth/google/status"');
    expect(googleAuth).toContain('res.json({ enabled: Boolean(ENV.googleClientId && ENV.googleClientSecret) })');
    expect(googleAuth).toContain('"/?auth_error=google_missing_code"');
    expect(googleAuth).toContain('"/?auth_error=google_no_id"');
    expect(googleAuth).toContain('"/?auth_error=google_failed"');
  });

  it("maps known callback failures to actionable user-facing messages", () => {
    expect(getAuthErrorMessage("google_denied")).toBe("Google sign-in was cancelled.");
    expect(getAuthErrorMessage("google_failed")).toBe("Google sign-in failed. Please try again.");
    expect(getAuthErrorMessage("google_state_mismatch")).toContain("security check failed");
    expect(getAuthErrorMessage("unknown_code")).toContain("contact support");
  });

  it("maps known Google callback failures through stable localization keys while retaining safe fallbacks", () => {
    const translate = vi.fn((key: string, options: { defaultValue: string }) => `${key}|${options.defaultValue}`);

    expect(getLocalizedAuthErrorMessage("google_denied", translate)).toContain(
      "authFeedback.errors.googleDenied|Google sign-in was cancelled.",
    );
    expect(getLocalizedAuthErrorMessage("google_state_mismatch", translate)).toContain(
      "authFeedback.errors.googleStateMismatch|Google sign-in security check failed.",
    );
    expect(getLocalizedAuthErrorMessage("unknown_code", translate)).toBe(
      "Sign-in failed. Please try again or contact support.",
    );
    expect(translate).toHaveBeenCalledTimes(2);
  });

  it("keeps the Google feedback and account-menu catalog contract in every supported locale", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
    const requiredPaths = [
      "authFeedback.openingGoogle",
      "authFeedback.connectingGoogle",
      "authFeedback.preparingGoogle",
      "authFeedback.redirectingGoogle",
      "authFeedback.continueWithGoogle",
      "authFeedback.googleOpenFailed",
      "authFeedback.googleSuccess",
      "authFeedback.errors.googleDenied",
      "authFeedback.errors.googleFailed",
      "authFeedback.errors.googleMissingCode",
      "authFeedback.errors.googleStateMismatch",
      "authFeedback.errors.googleNoId",
      "profileMenu.account",
      "profileMenu.accountDetails",
      "profileMenu.dashboard",
      "profileMenu.darkMode",
      "profileMenu.lightMode",
      "profileMenu.open",
      "profileMenu.signedInAs",
    ];

    for (const locale of locales) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/translation.json`));

      for (const keyPath of requiredPaths) {
        const value = keyPath.split(".").reduce<unknown>((current, key) => {
          if (!current || typeof current !== "object") return undefined;
          return (current as Record<string, unknown>)[key];
        }, catalog);

        expect(value, `${locale}:${keyPath}`).toEqual(expect.any(String));
        expect((value as string).trim(), `${locale}:${keyPath}`).not.toBe("");
      }
    }
  });

  it("keeps every visible login state localized in every supported locale", () => {
    const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
    const requiredPaths = [
      "login.title",
      "login.subtitle",
      "login.continueWithGoogle",
      "login.continueWithApple",
      "login.or",
      "login.emailLabel",
      "login.emailPlaceholder",
      "login.emailRequired",
      "login.invalidEmail",
      "login.sendingMagicLink",
      "login.sendMagicLink",
      "login.noPassword",
      "login.checkInbox",
      "login.sentTo",
      "login.expiresNotice",
      "login.useDifferentEmail",
      "login.magicLinkFailed",
      "login.networkError",
      "login.rateLimited",
      "login.serviceUnavailable",
      "login.termsPrefix",
      "login.terms",
      "login.consentAnd",
      "login.privacy",
      "login.signInCancelled",
      "login.appleSignInFailed",
      "login.invalidMagicLink",
      "login.magicLinkExpired",
      "login.verificationFailed",
      "login.signInFailed",
    ];

    for (const locale of locales) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/translation.json`));

      for (const keyPath of requiredPaths) {
        const value = keyPath.split(".").reduce<unknown>((current, key) => {
          if (!current || typeof current !== "object") return undefined;
          return (current as Record<string, unknown>)[key];
        }, catalog);

        expect(value, `${locale}:${keyPath}`).toEqual(expect.any(String));
        expect((value as string).trim(), `${locale}:${keyPath}`).not.toBe("");
      }
    }
  });
});

describe("authenticated account menus", () => {
  it("provides a keyboard-accessible desktop account menu with identity, account details, and logout", () => {
    const layout = read("client/src/components/AppLayout.tsx");

    expect(layout).toContain('data-testid="sidebar-account-menu-trigger"');
    expect(layout).toContain('aria-label={t("profileMenu.open"');
    expect(layout).toContain("<DropdownMenuTrigger asChild>");
    expect(layout).toContain("<DropdownMenuLabel");
    expect(layout).toContain("profileMenu.signedInAs");
    expect(layout).toContain('data-testid="sidebar-account-details"');
    expect(layout).toContain('navigate("/settings")');
    expect(layout).toContain('data-testid="sidebar-logout"');
    expect(layout).toContain("void logout().then(() => navigate(\"/\"))");
    expect(layout).toContain("focus-visible:ring-2");
  });

  it("provides a touch-sized mobile account menu with identity, account details, and logout", () => {
    const bottomNav = read("client/src/components/BottomNav.tsx");

    expect(bottomNav).toContain('data-testid="mobile-account-menu-trigger"');
    expect(bottomNav).toContain("profileMenu.account");
    expect(bottomNav).toContain("profileMenu.signedInAs");
    expect(bottomNav).toContain('data-testid="mobile-account-details"');
    expect(bottomNav).toContain("navigate('/settings')");
    expect(bottomNav).toContain("min-h-12");
    expect(bottomNav).toContain('data-testid="mobile-logout"');
    expect(bottomNav).toContain("void logout().then(() => navigate('/'))");
  });
});

describe("public three-step workflow interactions", () => {
  it("adds pointer and keyboard feedback without hiding information behind interaction", () => {
    const purpose = read("client/src/components/landing/AppPurpose.tsx");

    expect(purpose).toContain("tabIndex={0}");
    expect(purpose).toContain("motion-safe:hover:-translate-y-1");
    expect(purpose).toContain("motion-safe:focus-visible:-translate-y-1");
    expect(purpose).toContain("motion-safe:group-hover:scale-110");
    expect(purpose).toContain("motion-safe:group-focus-visible:scale-110");
    expect(purpose).toContain("motion-safe:group-hover:rotate-[-6deg]");
  });

  it("provides explicit reduced-motion fallbacks for card and icon transitions", () => {
    const purpose = read("client/src/components/landing/AppPurpose.tsx");

    expect(purpose).toContain("motion-reduce:transform-none");
    expect(purpose).toContain("motion-reduce:transition-none");
    expect(purpose).toContain("motion-reduce:hidden");
  });
});
