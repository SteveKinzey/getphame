import { describe, expect, it } from "vitest";
import {
  getSupportAttachmentExtension,
  isValidSupportScreenshot,
  MAX_SUPPORT_ATTACHMENT_BYTES,
  sanitizeSupportAttachmentFilename,
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
});
