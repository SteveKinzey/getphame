import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("returning-user public sign-in entry", () => {
  it("routes both desktop and mobile landing navigation to the standalone email-login page", () => {
    const navbar = fs.readFileSync(path.join(root, "client/src/components/landing/Navbar.tsx"), "utf8");
    expect(navbar.match(/href="\/login"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(navbar).toContain("Sign In");
  });

  it("offers returning users a separate login route from the new-account onboarding form", () => {
    const onboarding = fs.readFileSync(path.join(root, "client/src/pages/Onboarding.tsx"), "utf8");
    expect(onboarding).toContain('href="/login"');
    expect(onboarding).toContain("Already have an account?");
  });

  it("sends the active browser origin from both email-link forms", () => {
    const login = fs.readFileSync(path.join(root, "client/src/pages/Login.tsx"), "utf8");
    const onboarding = fs.readFileSync(path.join(root, "client/src/pages/Onboarding.tsx"), "utf8");
    expect(login).toContain("origin: window.location.origin");
    expect(onboarding).toContain("origin: window.location.origin");
  });
});
