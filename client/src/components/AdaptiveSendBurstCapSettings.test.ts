import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./AdaptiveSendBurstCapSettings.tsx", import.meta.url),
  "utf8"
);

describe("AdaptiveSendBurstCapSettings remaining-capacity tooltip", () => {
  it("keeps each progress bar keyboard reachable with an exact remaining-capacity tooltip", () => {
    expect(source).toContain("TooltipTrigger asChild");
    expect(source).toContain('TooltipContent side="top"');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("tabIndex={0}");
    expect(source).toContain(
      "data-testid={`adaptive-send-burst-cap-progress-${key}`}"
    );
    expect(source).toContain("aria-valuetext");
    expect(source).toContain("ADAPTIVE_SEND_MAXIMUM_BURST_CAP - configuredCap");
  });

  it("does not report an exact remaining capacity for an invalid draft cap", () => {
    expect(source).toContain("hasValidConfiguredCap");
    expect(source).toContain(
      "hasValidConfiguredCap ? configuredCap : undefined"
    );
    expect(source).toContain("remainingBurstInvalid");
  });
});
