import { describe, expect, it } from "vitest";
import {
  aggregateDisposableDomainFeeds,
  getPacificScheduleDecision,
  normalizeDisposableDomain,
} from "./disposableDomains";

describe("disposable-domain intelligence", () => {
  it("normalizes valid list entries and rejects unsafe or malformed values", () => {
    expect(normalizeDisposableDomain("  @Example.TEST.  ")).toBe("example.test");
    expect(normalizeDisposableDomain("example.test # source comment")).toBe("example.test");
    expect(normalizeDisposableDomain("not-an-email-address")).toBeNull();
    expect(normalizeDisposableDomain("person@example.test")).toBeNull();
    expect(normalizeDisposableDomain("example..test")).toBeNull();
  });

  it("deduplicates source feeds while preserving provenance and confidence", () => {
    const records = aggregateDisposableDomainFeeds([
      {
        source: "disposable_email_domains",
        body: "alpha.test\nshared.test\ninvalid value\n",
      },
      {
        source: "disposable_normal_mode",
        body: "beta.test\nshared.test\n",
      },
    ]);

    expect(records).toEqual([
      {
        domain: "alpha.test",
        confidenceScore: 80,
        sourceEvidenceJson: JSON.stringify({ version: 1, sources: ["disposable_email_domains"] }),
      },
      {
        domain: "beta.test",
        confidenceScore: 90,
        sourceEvidenceJson: JSON.stringify({ version: 1, sources: ["disposable_normal_mode"] }),
      },
      {
        domain: "shared.test",
        confidenceScore: 100,
        sourceEvidenceJson: JSON.stringify({ version: 1, sources: ["disposable_email_domains", "disposable_normal_mode"] }),
      },
    ]);
  });

  it("runs at 2:00 AM Pacific and uses exactly one 3:00 AM spring-DST makeup execution", () => {
    const summerTwoAm = getPacificScheduleDecision(Date.parse("2026-07-01T09:00:00.000Z"));
    const summerThreeAm = getPacificScheduleDecision(Date.parse("2026-07-01T10:00:00.000Z"));
    const springForwardThreeAm = getPacificScheduleDecision(Date.parse("2026-03-08T10:00:00.000Z"));

    expect(summerTwoAm).toMatchObject({ localHour: 2, shouldRun: true, isSpringForwardMakeup: false });
    expect(summerThreeAm).toMatchObject({ localHour: 3, shouldRun: false, isSpringForwardMakeup: false });
    expect(springForwardThreeAm).toMatchObject({ localHour: 3, shouldRun: true, isSpringForwardMakeup: true });
  });
});
