import { describe, expect, it } from "vitest";
import {
  appendAuthReturnPath,
  getSafeAuthReturnPath,
} from "../shared/authReturnPath";

describe("authentication return paths", () => {
  it("preserves a bounded same-origin application route", () => {
    expect(
      getSafeAuthReturnPath("/admin/email-preview?template=welcome")
    ).toBe("/admin/email-preview?template=welcome");
  });

  it("rejects external and malformed redirect destinations", () => {
    expect(getSafeAuthReturnPath("https://attacker.example/")).toBeNull();
    expect(getSafeAuthReturnPath("//attacker.example/")).toBeNull();
    expect(getSafeAuthReturnPath("javascript:alert(1)")).toBeNull();
  });

  it("adds an encoded return path without changing an existing query string", () => {
    expect(
      appendAuthReturnPath(
        "/api/auth/google/start?intent=signin",
        "/admin/email-preview"
      )
    ).toBe(
      "/api/auth/google/start?intent=signin&returnTo=%2Fadmin%2Femail-preview"
    );
  });
});
