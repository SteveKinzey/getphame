import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPasskeyEnrollmentEmail,
  isPasskeyEnrollmentRequiredError,
  isPasskeyEnrollmentRequiredResult,
  isPasskeyEnrollmentReturnError,
  readPasskeyEnrollmentEmail,
  rememberPasskeyEnrollmentEmail,
} from "./passkeyEnrollment";

describe("passkey enrollment client decisions", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => values.get(key) ?? null,
          setItem: (key: string, value: string) => values.set(key, value),
          removeItem: (key: string) => values.delete(key),
        },
      },
    });
  });

  it("recognizes only the typed neutral server transition", () => {
    expect(
      isPasskeyEnrollmentRequiredResult({ state: "enrollment_required" })
    ).toBe(true);
    expect(
      isPasskeyEnrollmentRequiredResult({ state: "authentication_ready" })
    ).toBe(false);
    expect(isPasskeyEnrollmentRequiredResult(null)).toBe(false);
  });

  it("supports only the exact legacy transition during mixed-version deployment", () => {
    expect(
      isPasskeyEnrollmentRequiredError({
        message: "Passkey sign-in is unavailable for this account",
        data: { code: "UNAUTHORIZED" },
      })
    ).toBe(true);
    expect(
      isPasskeyEnrollmentRequiredError({
        message: "Passkey sign-in is unavailable for this account",
        data: { code: "FORBIDDEN" },
      })
    ).toBe(false);
    expect(
      isPasskeyEnrollmentRequiredError({
        message: "Other failure",
        data: { code: "UNAUTHORIZED" },
      })
    ).toBe(false);
  });

  it("accepts only bounded provider recovery codes", () => {
    expect(isPasskeyEnrollmentReturnError("provider_email_mismatch")).toBe(
      true
    );
    expect(
      isPasskeyEnrollmentReturnError("provider_verification_cancelled")
    ).toBe(true);
    expect(isPasskeyEnrollmentReturnError("oauth_failed")).toBe(false);
    expect(isPasskeyEnrollmentReturnError(null)).toBe(false);
  });

  it("normalizes, preserves, and clears the attempted email in session scope", () => {
    rememberPasskeyEnrollmentEmail("  MEMBER@Example.Test ");
    expect(readPasskeyEnrollmentEmail()).toBe("member@example.test");
    clearPasskeyEnrollmentEmail();
    expect(readPasskeyEnrollmentEmail()).toBe("");
  });
});
