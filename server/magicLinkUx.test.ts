import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getMagicLinkRecoveryKind } from "../client/src/lib/authFeedback";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("magic-link request and confirmation UX", () => {
  it("shows an accessible busy state and success confirmation on every active entry surface", () => {
    const form = read("client/src/components/auth/MagicLinkForm.tsx");
    const login = read("client/src/pages/Login.tsx");
    const onboarding = read("client/src/pages/Onboarding.tsx");

    expect(form).toContain('type RequestState = "idle" | "sending" | "sent" | "resending"');
    expect(form).toContain('data-testid="magic-link-form"');
    expect(form).toContain("disabled={isSending}");
    expect(form).toContain("aria-busy={isSending}");
    expect(form).toContain("<Loader2");
    expect(form).toContain('role="status" aria-live="polite"');
    expect(form).toContain('data-testid="magic-link-confirmation"');
    expect(form).toContain("setSentTo(result.email)");
    expect(form).toContain('fetch("/api/auth/magic-link"');
    expect(login).toContain('<MagicLinkForm idPrefix="login" autoFocus />');
    expect(onboarding).toContain("<MagicLinkForm");
    expect(onboarding).toContain('idPrefix="onboarding"');
  });

  it("enforces the 60-second resend cooldown and prevents duplicate requests", () => {
    const form = read("client/src/components/auth/MagicLinkForm.tsx");

    expect(form).toContain("MAGIC_LINK_RESEND_COOLDOWN_SECONDS = 60");
    expect(form).toContain("setResendSeconds(MAGIC_LINK_RESEND_COOLDOWN_SECONDS)");
    expect(form).toContain("setResendSeconds((current) => Math.max(0, current - 1))");
    expect(form).toContain('data-testid="magic-link-resend"');
    expect(form).toContain("disabled={!canResend}");
    expect(form).toContain("aria-busy={isResending}");
    expect(form).toContain("aria-describedby={timerId}");
    expect(form).toContain('role="timer"');
    expect(form).toContain("if (isSending || isResending) return");
    expect(form).toContain("if (!sentTo || !canResend) return");
    expect(form).toContain("requestMagicLink(sentTo)");
    expect(form).toContain('t("login.resendSuccess"');
    expect(form).toContain('role="alert"');
  });
});

describe("invalid and expired magic-link recovery", () => {
  it("classifies every canonical server redirect code without treating unrelated OAuth errors as magic-link failures", () => {
    expect(getMagicLinkRecoveryKind("link_expired")).toBe("expired");
    expect(getMagicLinkRecoveryKind("magic_link_expired")).toBe("expired");
    expect(getMagicLinkRecoveryKind("invalid_link")).toBe("invalid");
    expect(getMagicLinkRecoveryKind("invalid_magic_link")).toBe("invalid");
    expect(getMagicLinkRecoveryKind("verification_failed")).toBe("failed");
    expect(getMagicLinkRecoveryKind("google_failed")).toBeNull();
    expect(getMagicLinkRecoveryKind("unknown_code")).toBeNull();
  });

  it("renders a dedicated accessible recovery page and suppresses duplicate error toasts", () => {
    const login = read("client/src/pages/Login.tsx");

    expect(login).toContain("getMagicLinkRecoveryKind(authError)");
    expect(login).toContain("if (recoveryKind)");
    expect(login).toContain("setMagicLinkRecovery(recoveryKind)");
    expect(login).toContain('data-testid="magic-link-recovery"');
    expect(login).toContain('role="alert"');
    expect(login).toContain('aria-labelledby="magic-link-recovery-title"');
    expect(login).toContain('t("login.expiredMagicLinkTitle"');
    expect(login).toContain('t("login.invalidMagicLinkTitle"');
    expect(login).toContain('t("login.verificationProblemTitle"');
    expect(login).toContain('t("login.requestNewLink"');
    expect(login).toContain("setMagicLinkRecovery(null)");
    expect(login).toContain('href="mailto:support@getphame.app"');

    const recoveryBranchStart = login.indexOf("if (recoveryKind)");
    const recoveryBranchEnd = login.indexOf("} else {", recoveryBranchStart);
    const recoveryBranch = login.slice(recoveryBranchStart, recoveryBranchEnd);
    expect(recoveryBranch).not.toContain("toast.error");
  });

  it("keeps the client recovery classifier aligned with canonical verification redirects", () => {
    const server = read("server/auth-email.ts");

    expect(server).toContain('auth_error=invalid_link');
    expect(server).toContain('auth_error=link_expired');
    expect(server).toContain('auth_error=verification_failed');
  });
});

describe("localized magic-link UX contract", () => {
  const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"];
  const requiredLoginKeys = [
    "sendingMagicLinkStatus",
    "resendCountdown",
    "resendReady",
    "resendingLink",
    "resendLink",
    "resendSuccess",
    "expiredMagicLinkTitle",
    "expiredMagicLinkDescription",
    "invalidMagicLinkTitle",
    "invalidMagicLinkDescription",
    "verificationProblemTitle",
    "verificationProblemDescription",
    "magicLinkRecoveryHelp",
    "requestNewLink",
    "contactSupport",
  ];

  it("provides every visible request, resend, and recovery string in all supported locales", () => {
    for (const locale of locales) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/translation.json`));

      for (const key of requiredLoginKeys) {
        const value = catalog.login?.[key];
        expect(value, `${locale}:login.${key}`).toEqual(expect.any(String));
        expect(value.trim(), `${locale}:login.${key}`).not.toBe("");
      }

      expect(catalog.login.resendCountdown, `${locale}:login.resendCountdown`).toContain("{{seconds}}");
    }
  });

  it("does not retain unused login-only labels outside the shared form contract", () => {
    for (const locale of locales) {
      const catalog = JSON.parse(read(`client/public/locales/${locale}/translation.json`));

      expect(catalog.login?.continueWithEmail, `${locale}:login.continueWithEmail`).toBeUndefined();
      expect(catalog.login?.cancel, `${locale}:login.cancel`).toBeUndefined();
    }
  });

  it("bumps the runtime locale cache after catalog changes", () => {
    const i18n = read("client/src/lib/i18n.ts");
    expect(i18n).toContain("{{ns}}.json?v=phame47");
  });
});
