import { describe, expect, it, vi } from "vitest";

describe("EmailRelayStatusCard UI component", () => {
  it("exports a valid component function", async () => {
    const { EmailRelayStatusCard } = await import("./EmailRelayStatusCard");
    expect(typeof EmailRelayStatusCard).toBe("function");
  });
});
