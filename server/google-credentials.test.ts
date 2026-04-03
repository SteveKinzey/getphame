import { describe, it, expect } from "vitest";

describe("Google OAuth credentials", () => {
  it("GOOGLE_CLIENT_ID is set and has correct format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeTruthy();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_SECRET is set and has correct format", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeTruthy();
    expect(clientSecret).toMatch(/^GOCSPX-/);
  });

  it("GOOGLE_CLIENT_ID matches the new sk-america.com project", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toContain("158721340620");
  });
});
