import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const locales = ["en", "es", "fr", "it", "th", "zh-CN", "zh-TW"] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function collectFiles(root: string): string[] {
  const absoluteRoot = path.join(projectRoot, root);
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(relativePath);
    return /\.(?:json|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

const scannedFiles = [
  ...collectFiles("client/src/components/landing"),
  ...collectFiles("client/public/locales"),
  "client/src/lib/autoTextManifest.json",
  "client/src/lib/autoTextTranslations.json",
  "client/src/lib/i18nFallbackResources.json",
  "client/src/lib/i18nCompleteFallbackResources.json",
];

const prohibitedPatterns = [
  /Sarah M\./i,
  /Tom R\./i,
  /David K\./i,
  /Lisa P\./i,
  /Lisa K\./i,
  /James T\./i,
  /The Corner Café/i,
  /QuickFix Plumbing/i,
  /Luxe Hair Studio/i,
  /12\s*(?:→|to)\s*47/i,
  /8[–-]10 new reviews/i,
  /paid for itself/i,
  /open rate (?:is|of) 68%/i,
  /45[–-]60%/i,
  /3× your Google reviews/i,
  /10× more reviews/i,
  /Get Your First 10 Reviews Free/i,
  /Join hundreds of businesses/i,
  /game-changer for our small business/i,
];

describe("landing social-proof compliance", () => {
  it("contains no fabricated identities, testimonials, ratings, or unsupported outcome claims", () => {
    const violations = scannedFiles.flatMap((file) => {
      const source = readProjectFile(file);
      return prohibitedPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern}`);
    });

    expect(violations).toEqual([]);
  });

  it("keeps every maintained locale on factual product proof with no legacy testimonial keys", () => {
    for (const locale of locales) {
      const translation = JSON.parse(
        readProjectFile(`client/public/locales/${locale}/translation.json`),
      );
      const landing = JSON.parse(
        readProjectFile(`client/public/locales/${locale}/landing.json`),
      );

      for (const catalog of [translation, landing]) {
        const proof = catalog.landing.testimonials;
        expect(proof.email.title).toBeTruthy();
        expect(proof.control.title).toBeTruthy();
        expect(proof.activity.title).toBeTruthy();
        expect(proof.sarah).toBeUndefined();
        expect(proof.tom).toBeUndefined();
        expect(proof.david).toBeUndefined();
        expect(proof.realResults).toBeUndefined();
        expect(catalog.landing.socialProofBar.reviews).toBeUndefined();
        expect(catalog.landing.socialProofBar.trustedBy).toBeUndefined();
      }

      expect(translation.testimonials).toBeUndefined();
      expect(translation.proof).toBeUndefined();
      expect(translation.features?.customerQuote).toBeUndefined();
      expect(translation.socialProof.trustedByBusinesses).toBe(
        translation.landing.socialProofBar.heading,
      );
    }
  });
});
