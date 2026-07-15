import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAuthErrorMessage } from "../client/src/lib/authFeedback";

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
    expect(login).toContain("GOOGLE_REDIRECT_FEEDBACK_MS = 180");
    expect(login).toContain("window.setTimeout(() => {");
    expect(login).toContain("isGoogleSubmitting ? <Spinner /> : <GoogleIcon />");
    expect(login).toContain("Connecting to Google…");
    expect(login).toContain('window.location.assign("/api/auth/google")');
  });

  it("persists initiation long enough to show success or error feedback after the OAuth redirect", () => {
    const login = read("client/src/pages/Login.tsx");
    const app = read("client/src/App.tsx");
    const feedback = read("client/src/lib/authFeedback.ts");
    const googleAuth = read("server/googleAuth.ts");

    expect(login).toContain("rememberGoogleSignInPending()");
    expect(login).toContain('toast.loading("Opening Google sign-in…"');
    expect(app).toContain("hasGoogleSignInPending()");
    expect(app).toContain("Google sign-in successful. Welcome to Get Phame.");
    expect(app).toContain("toast.error(getAuthErrorMessage(authError)");
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
