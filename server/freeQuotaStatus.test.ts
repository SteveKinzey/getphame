import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FreeQuotaStatus } from "../client/src/components/FreeQuotaStatus";
import type { FreeQuotaSummary } from "@shared/quota";

const t = (key: string, options?: { defaultValue?: string; date?: string }) =>
  (options?.defaultValue ?? key).replace("{{date}}", options?.date ?? "");

function render(quota: FreeQuotaSummary) {
  return renderToStaticMarkup(
    React.createElement(FreeQuotaStatus, {
      quota,
      t,
      formatDate: () => "July 20, 2026",
    })
  );
}

describe("rendered Free-plan quota states", () => {
  it("renders the initial allowance state", () => {
    const html = render({
      phase: "initial",
      limit: 10,
      used: 9,
      remaining: 1,
      totalSent: 9,
      blocked: false,
      nextAvailableAt: null,
    });
    expect(html).toContain('data-phase="initial"');
    expect(html).toContain('data-blocked="false"');
    expect(html).toContain("10 initial requests, then 5 every rolling 30 days");
  });

  it("renders the rolling allowance state", () => {
    const html = render({
      phase: "rolling",
      limit: 5,
      used: 1,
      remaining: 4,
      totalSent: 11,
      blocked: false,
      nextAvailableAt: null,
    });
    expect(html).toContain('data-phase="rolling"');
    expect(html).toContain("5 requests every rolling 30 days");
  });

  it("renders the blocked state and next available date", () => {
    const html = render({
      phase: "rolling",
      limit: 5,
      used: 5,
      remaining: 0,
      totalSent: 15,
      blocked: true,
      nextAvailableAt: Date.UTC(2026, 6, 20),
    });
    expect(html).toContain('data-blocked="true"');
    expect(html).toContain("Next request available July 20, 2026");
  });
});
