import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("guided passkey enrollment composition", () => {
  it("opens an accessible verification module and preserves unsupported-browser fallback", () => {
    const signIn = source("client/src/components/security/PasskeySignIn.tsx");
    const modal = source("client/src/components/security/AddPasskeyModal.tsx");
    expect(signIn).toContain('ceremony.state === "enrollment_required"');
    expect(signIn).toContain("isPasskeyEnrollmentRequiredError");
    expect(signIn).toContain("passkeys.signIn.unsupported");
    expect(signIn).toContain("submitButtonRef.current?.focus()");
    expect(modal).toContain('data-testid="add-passkey-modal"');
    expect(modal).toContain("DialogDescription");
    expect(modal).toContain("PASSKEY_ENROLLMENT_INTENT");
  });

  it("binds magic-link verification and resumes on the fixed authenticated Settings surface", () => {
    const emailAuth = source("server/auth-email.ts");
    const form = source("client/src/components/auth/MagicLinkForm.tsx");
    const card = source("client/src/components/security/PasskeySecurityCard.tsx");
    expect(form).toContain('intent?: "enroll_passkey"');
    expect(emailAuth).toContain("signPasskeyEnrollmentIntent");
    expect(emailAuth).toContain('"/settings?passkey_enroll=1"');
    expect(card).toContain('params.get("passkey_enroll") !== "1"');
    expect(card).toContain("startRegistration");
    expect(card).toContain("beginRegistration.mutateAsync");
    expect(card).toContain("email: enrollmentEmail");
    expect(card).toContain("passkeys.enrollment.resumeDescriptionWithoutEmail");
  });

  it("preserves lifecycle controls and isolates provider recovery from generic auth errors", () => {
    const card = source("client/src/components/security/PasskeySecurityCard.tsx");
    const login = source("client/src/pages/Login.tsx");
    const bootstrap = source("client/src/main.tsx");
    expect(card).toContain("trpc.passkeys.rename.useMutation");
    expect(card).toContain("trpc.passkeys.revoke.useMutation");
    expect(login).toContain("isPasskeyEnrollmentReturnError");
    expect(bootstrap).toContain("isPasskeyEnrollmentRequiredError");
  });

  it("allows only fixed local destinations through the Apple first-party landing", () => {
    const landing = source("client/src/pages/AppleAuthLanding.tsx");
    expect(landing).toContain("safeAppleReturnPath");
    expect(landing).toContain('"/settings?passkey_enroll=1"');
    expect(landing).not.toContain("window.location.replace(returnTo ||");
  });
});
