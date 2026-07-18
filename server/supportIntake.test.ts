import { describe, expect, it } from "vitest";
import {
  getSupportAttachmentExtension,
  getSupportSlaTargetAt,
  isSupportEscalation,
  isValidSupportScreenshot,
  MAX_SUPPORT_ATTACHMENT_BYTES,
  sanitizeSupportAttachmentFilename,
  SUPPORT_SLA_DURATION_MS,
  SUPPORT_TICKET_ALERT_TYPES,
  SUPPORT_PRIORITIES,
} from "./supportIntake";

describe("support screenshot intake", () => {
  it("recognizes only the supported image signatures", () => {
    expect(isValidSupportScreenshot(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(true);
    expect(isValidSupportScreenshot(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(isValidSupportScreenshot(Buffer.from("RIFFxxxxWEBPVP8 ", "ascii"), "image/webp")).toBe(true);
    expect(isValidSupportScreenshot(Buffer.from("not an image", "utf8"), "image/png")).toBe(false);
    expect(isValidSupportScreenshot(Buffer.from([0xff, 0xd8]), "image/jpeg")).toBe(false);
  });

  it("keeps attachment filenames path-safe and derives only approved extensions", () => {
    expect(sanitizeSupportAttachmentFilename("../../customer screenshot?.png")).toBe(".. .. customer screenshot_.png");
    expect(sanitizeSupportAttachmentFilename("   ")).toBe("screenshot");
    expect(getSupportAttachmentExtension("image/jpeg")).toBe("jpg");
    expect(getSupportAttachmentExtension("image/png")).toBe("png");
    expect(getSupportAttachmentExtension("image/webp")).toBe("webp");
    expect(MAX_SUPPORT_ATTACHMENT_BYTES).toBe(8 * 1024 * 1024);
  });

  it("uses a finite and ordered internal priority scale for support triage", () => {
    expect(SUPPORT_PRIORITIES).toEqual(["low", "normal", "high", "urgent"]);
  });

  it("derives deterministic SLA targets from the canonical priority durations", () => {
    const startedAt = new Date("2026-07-18T12:00:00.000Z");

    expect(SUPPORT_SLA_DURATION_MS).toEqual({
      low: 72 * 60 * 60 * 1000,
      normal: 24 * 60 * 60 * 1000,
      high: 8 * 60 * 60 * 1000,
      urgent: 2 * 60 * 60 * 1000,
    });
    expect(getSupportSlaTargetAt("urgent", startedAt).toISOString()).toBe("2026-07-18T14:00:00.000Z");
    expect(getSupportSlaTargetAt("low", startedAt).toISOString()).toBe("2026-07-21T12:00:00.000Z");
  });

  it("alerts only when ticket urgency increases and uses a finite event vocabulary", () => {
    expect(isSupportEscalation("normal", "high")).toBe(true);
    expect(isSupportEscalation("high", "urgent")).toBe(true);
    expect(isSupportEscalation("urgent", "high")).toBe(false);
    expect(isSupportEscalation("normal", "normal")).toBe(false);
    expect(SUPPORT_TICKET_ALERT_TYPES).toEqual(["assignment", "escalation"]);
  });
});
